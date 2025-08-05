const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const TableTimeline = require('../models/TableTimeline');
const Table = require('../models/Table');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');
const { publicTenantContext } = require('../middleware/publicTenantContext');

// Apply tenant context for public routes
router.use('/customer', publicTenantContext);

// Customer endpoints (no auth required)
router.post('/customer/request', async (req, res) => {
  try {
    const {
      tableNumber,
      requestType,
      priority = 'normal',
      message,
      customerSessionId
    } = req.body;

    if (!tableNumber || !requestType) {
      return res.status(400).json({ 
        error: 'Table number and request type are required' 
      });
    }

    // Find the table
    const table = await Table.findOne({
      tenantId: req.tenant.tenantId,
      number: tableNumber,
      isActive: true
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Create service request
    const serviceRequest = new ServiceRequest({
      tenantId: req.tenant.tenantId,
      tableNumber,
      tableId: table._id,
      customerSessionId,
      requestType,
      priority,
      message,
      location: table.location,
      requestedBy: {
        type: 'customer',
        name: `Table ${tableNumber}`
      },
      metadata: {
        deviceType: req.headers['x-device-type'] || 'web',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    await serviceRequest.save();

    // Log to timeline
    await TableTimeline.logEvent({
      tenantId: req.tenant.tenantId,
      tableNumber,
      tableId: table._id,
      sessionId: customerSessionId,
      eventType: 'service_requested',
      description: `Service requested: ${requestType}`,
      actor: {
        type: 'customer',
        name: `Table ${tableNumber}`
      },
      metadata: {
        serviceRequestId: serviceRequest._id,
        requestType
      }
    });

    // Emit socket event for real-time notifications
    const io = req.app.get('io');
    if (io) {
      // Notify all waiters
      io.to(`tenant:${req.tenant.tenantId}:waiters`).emit('service:requested', {
        request: serviceRequest,
        table: {
          number: table.number,
          location: table.location
        }
      });

      // Update service dashboard
      io.to(`tenant:${req.tenant.tenantId}:managers`).emit('service:update', {
        type: 'new_request',
        data: serviceRequest
      });
    }

    res.json({
      success: true,
      requestId: serviceRequest._id,
      message: 'Service request submitted successfully'
    });
  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get request status (customer)
router.get('/customer/status/:requestId', publicTenantContext, async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({
      _id: req.params.requestId,
      tenantId: req.tenant.tenantId
    }).populate('assignedWaiter', 'name');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      status: request.status,
      assignedWaiter: request.assignedWaiter?.name,
      responseTime: request.responseTime,
      timestamps: request.timestamps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply authentication for staff routes
router.use(authenticate);
router.use(enterpriseTenantIsolation);

// Get active service requests (waiter/manager)
router.get('/active', async (req, res) => {
  try {
    const { tableNumber, priority, assignedToMe } = req.query;
    const filters = {};

    if (tableNumber) filters.tableNumber = tableNumber;
    if (priority) filters.priority = priority;
    if (assignedToMe === 'true') filters.assignedWaiter = req.user._id;

    const requests = await ServiceRequest.getActiveRequests(
      req.tenant.tenantId,
      filters
    );

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge service request (waiter)
router.post('/:requestId/acknowledge', async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({
      _id: req.params.requestId,
      tenantId: req.tenant.tenantId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or already acknowledged' });
    }

    await request.acknowledge(req.user._id);

    // Log to timeline
    await TableTimeline.logEvent({
      tenantId: req.tenant.tenantId,
      tableNumber: request.tableNumber,
      tableId: request.tableId,
      sessionId: request.customerSessionId,
      eventType: 'service_acknowledged',
      description: `Service acknowledged by ${req.user.name}`,
      actor: {
        type: 'waiter',
        id: req.user._id,
        name: req.user.name
      },
      metadata: {
        serviceRequestId: request._id,
        responseTime: request.responseTime.acknowledgement
      }
    });

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Notify customer
      io.to(`table:${req.tenant.tenantId}:${request.tableNumber}`).emit('service:acknowledged', {
        requestId: request._id,
        waiterName: req.user.name
      });

      // Update other waiters
      io.to(`tenant:${req.tenant.tenantId}:waiters`).emit('service:update', {
        type: 'acknowledged',
        data: request
      });
    }

    res.json({
      success: true,
      message: 'Request acknowledged',
      request
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start service (waiter)
router.post('/:requestId/start', async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({
      _id: req.params.requestId,
      tenantId: req.tenant.tenantId,
      assignedWaiter: req.user._id,
      status: 'acknowledged'
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not assigned to you' });
    }

    await request.start();

    // Log to timeline
    await TableTimeline.logEvent({
      tenantId: req.tenant.tenantId,
      tableNumber: request.tableNumber,
      tableId: request.tableId,
      sessionId: request.customerSessionId,
      eventType: 'waiter_arrived',
      description: `${req.user.name} started attending to request`,
      actor: {
        type: 'waiter',
        id: req.user._id,
        name: req.user.name
      },
      metadata: {
        serviceRequestId: request._id
      }
    });

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`table:${req.tenant.tenantId}:${request.tableNumber}`).emit('service:started', {
        requestId: request._id
      });
    }

    res.json({
      success: true,
      message: 'Service started',
      request
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete service request (waiter)
router.post('/:requestId/complete', async (req, res) => {
  try {
    const { notes } = req.body;

    const request = await ServiceRequest.findOne({
      _id: req.params.requestId,
      tenantId: req.tenant.tenantId,
      assignedWaiter: req.user._id,
      status: { $in: ['acknowledged', 'in_progress'] }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not assigned to you' });
    }

    await request.complete();

    // Log to timeline
    await TableTimeline.logEvent({
      tenantId: req.tenant.tenantId,
      tableNumber: request.tableNumber,
      tableId: request.tableId,
      sessionId: request.customerSessionId,
      eventType: 'service_completed',
      description: `Service completed by ${req.user.name}`,
      actor: {
        type: 'waiter',
        id: req.user._id,
        name: req.user.name
      },
      metadata: {
        serviceRequestId: request._id,
        responseTime: request.responseTime.completion,
        notes
      }
    });

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Notify customer
      io.to(`table:${req.tenant.tenantId}:${request.tableNumber}`).emit('service:completed', {
        requestId: request._id
      });

      // Update dashboards
      io.to(`tenant:${req.tenant.tenantId}:waiters`).emit('service:update', {
        type: 'completed',
        data: request
      });
      io.to(`tenant:${req.tenant.tenantId}:managers`).emit('service:update', {
        type: 'completed',
        data: request
      });
    }

    res.json({
      success: true,
      message: 'Service completed',
      request
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get service metrics (manager)
router.get('/metrics', async (req, res) => {
  try {
    const { period = 'day' } = req.query;

    const [avgResponseTime, pendingCount] = await Promise.all([
      ServiceRequest.getAverageResponseTime(req.tenant.tenantId, period),
      ServiceRequest.getPendingRequestsCount(req.tenant.tenantId)
    ]);

    // Get waiter performance
    const waiters = await User.find({
      tenantId: req.tenant.tenantId,
      role: 'waiter',
      isActive: true
    });

    const waiterMetrics = await Promise.all(
      waiters.map(async (waiter) => {
        const performance = await TableTimeline.getWaiterPerformance(
          req.tenant.tenantId,
          waiter._id,
          period
        );
        return {
          waiterId: waiter._id,
          name: waiter.name,
          ...performance
        };
      })
    );

    res.json({
      responseTime: avgResponseTime,
      pendingRequests: pendingCount,
      waiterPerformance: waiterMetrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table timeline (manager)
router.get('/timeline/:tableNumber', async (req, res) => {
  try {
    const { startDate, endDate, eventTypes, limit } = req.query;
    const options = {};

    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (eventTypes) options.eventTypes = eventTypes.split(',');
    if (limit) options.limit = parseInt(limit);

    const timeline = await TableTimeline.getTableHistory(
      req.tenant.tenantId,
      req.params.tableNumber,
      options
    );

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate service (customer)
router.post('/customer/rate/:requestId', publicTenantContext, async (req, res) => {
  try {
    const { score, feedback } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Valid score (1-5) is required' });
    }

    const request = await ServiceRequest.findOne({
      _id: req.params.requestId,
      tenantId: req.tenant.tenantId,
      status: 'completed'
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not completed' });
    }

    request.rating = { score, feedback };
    await request.save();

    res.json({
      success: true,
      message: 'Thank you for your feedback'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;