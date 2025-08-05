// Enhanced multi-tenant socket.io handler with memory leak prevention
const Order = require('../models/Order');
const Table = require('../models/Table');
const CustomerSession = require('../models/CustomerSession');
const ServiceRequest = require('../models/ServiceRequest');
const TableTimeline = require('../models/TableTimeline');
const logger = require('../utils/logger');

// Connection tracking to prevent memory leaks
const activeConnections = new Map();
const connectionTimers = new Map();

// Cleanup helper
function cleanupConnection(socketId) {
  // Clear any timers
  if (connectionTimers.has(socketId)) {
    const timers = connectionTimers.get(socketId);
    timers.forEach(timer => clearInterval(timer));
    connectionTimers.delete(socketId);
  }
  
  // Remove from active connections
  activeConnections.delete(socketId);
}

// Rate limiting for socket events
const rateLimiters = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_EVENTS = 100;

function checkRateLimit(socketId, eventName) {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();
  
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  const limiter = rateLimiters.get(key);
  
  if (now > limiter.resetTime) {
    limiter.count = 1;
    limiter.resetTime = now + RATE_LIMIT_WINDOW;
    return true;
  }
  
  if (limiter.count >= RATE_LIMIT_MAX_EVENTS) {
    return false;
  }
  
  limiter.count++;
  return true;
}

// Clean up rate limiters periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, limiter] of rateLimiters.entries()) {
    if (now > limiter.resetTime + RATE_LIMIT_WINDOW) {
      rateLimiters.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

module.exports = (io) => {
  logger.info('Enhanced multi-tenant socket handler initialized');

  io.use(async (socket, next) => {
    // Validate tenant context before allowing connection
    const tenantId = socket.tenantId;
    
    if (!tenantId) {
      return next(new Error('No tenant context'));
    }
    
    // Add to active connections
    activeConnections.set(socket.id, {
      tenantId,
      connectedAt: new Date(),
      lastActivity: new Date()
    });
    
    next();
  });

  io.on('connection', (socket) => {
    const tenantId = socket.tenantId;
    
    if (!tenantId) {
      logger.warn('Socket connected without tenant context');
      socket.disconnect();
      return;
    }

    logger.debug(`Socket connected for tenant: ${tenantId}`);
    
    // Join tenant-specific room
    socket.join(`tenant:${tenantId}`);
    
    // Join role-based rooms when authenticated
    socket.on('auth:identify', (data) => {
      if (data.role === 'waiter') {
        socket.join(`tenant:${tenantId}:waiters`);
      } else if (data.role === 'manager' || data.role === 'admin') {
        socket.join(`tenant:${tenantId}:managers`);
      } else if (data.tableNumber) {
        // Customer joining from a specific table
        socket.join(`table:${tenantId}:${data.tableNumber}`);
      }
    });
    
    // Set up connection timeout (disconnect idle connections after 30 minutes)
    const connectionTimeout = setTimeout(() => {
      if (activeConnections.has(socket.id)) {
        const connection = activeConnections.get(socket.id);
        const idleTime = Date.now() - connection.lastActivity.getTime();
        
        if (idleTime > 30 * 60 * 1000) { // 30 minutes
          logger.info(`Disconnecting idle socket: ${socket.id}`);
          socket.disconnect();
        }
      }
    }, 30 * 60 * 1000);
    
    connectionTimers.set(socket.id, [connectionTimeout]);

    // Wrapper for socket events with error handling and rate limiting
    const handleSocketEvent = (eventName, handler) => {
      socket.on(eventName, async (data, callback) => {
        try {
          // Check rate limit
          if (!checkRateLimit(socket.id, eventName)) {
            const error = { error: 'Rate limit exceeded', code: 'RATE_LIMIT' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }
          
          // Update last activity
          if (activeConnections.has(socket.id)) {
            activeConnections.get(socket.id).lastActivity = new Date();
          }
          
          // Execute handler
          await handler(data, callback);
        } catch (error) {
          logger.error(`Socket event error [${eventName}]:`, error);
          const errorResponse = { 
            error: 'Internal server error', 
            code: 'INTERNAL_ERROR' 
          };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });
    };

    // Handle table status updates with validation
    handleSocketEvent('table:update-status', async (data) => {
      if (!data.tableNumber || !data.status) {
        return socket.emit('error', { 
          message: 'Invalid table update data',
          code: 'VALIDATION_ERROR' 
        });
      }

      const table = await Table.findOne({ 
        tenantId, 
        number: String(data.tableNumber) 
      });

      if (!table) {
        return socket.emit('error', { 
          message: 'Table not found',
          code: 'NOT_FOUND' 
        });
      }

      // Validate status value
      const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
      if (!validStatuses.includes(data.status)) {
        return socket.emit('error', { 
          message: 'Invalid status value',
          code: 'VALIDATION_ERROR' 
        });
      }

      table.status = data.status;
      if (data.occupants !== undefined && typeof data.occupants === 'number') {
        table.currentGuests = Math.max(0, data.occupants);
      }
      await table.save();

      // Emit to all clients of this tenant
      io.to(`tenant:${tenantId}`).emit('table:status-updated', {
        tableNumber: table.number,
        status: table.status,
        occupants: table.currentGuests,
        updatedAt: new Date()
      });
    });

    // Handle new order notifications with data sanitization
    handleSocketEvent('order:new', async (data) => {
      // Sanitize data before broadcasting
      const sanitizedData = {
        orderNumber: String(data.orderNumber || ''),
        tableNumber: String(data.tableNumber || ''),
        items: Array.isArray(data.items) ? data.items.slice(0, 100) : [], // Limit items
        total: typeof data.total === 'number' ? data.total : 0,
        timestamp: new Date()
      };

      io.to(`tenant:${tenantId}`).emit('order:new-notification', sanitizedData);
    });

    // Handle order status updates with validation
    handleSocketEvent('order:update-status', async (data) => {
      if (!data.orderId || !data.status) {
        return socket.emit('error', { 
          message: 'Missing required fields',
          code: 'VALIDATION_ERROR' 
        });
      }

      const order = await Order.findOne({ 
        tenantId,
        _id: data.orderId 
      });

      if (!order) {
        return socket.emit('error', { 
          message: 'Order not found',
          code: 'NOT_FOUND' 
        });
      }

      // Validate status transition
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        return socket.emit('error', { 
          message: 'Invalid status',
          code: 'VALIDATION_ERROR' 
        });
      }

      order.status = data.status;
      await order.save();

      io.to(`tenant:${tenantId}`).emit('order:status-updated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        tableNumber: order.tableNumber,
        updatedAt: new Date()
      });
    });

    // Handle customer session updates with validation
    handleSocketEvent('session:update', async (data) => {
      if (!data.sessionId) {
        return socket.emit('error', { 
          message: 'Session ID required',
          code: 'VALIDATION_ERROR' 
        });
      }

      const session = await CustomerSession.findOne({
        tenantId,
        _id: data.sessionId,
        isActive: true
      });

      if (!session) {
        return socket.emit('error', { 
          message: 'Session not found',
          code: 'NOT_FOUND' 
        });
      }

      // Validate and sanitize input
      if (data.customerName && typeof data.customerName === 'string') {
        session.customerName = data.customerName.substring(0, 100);
      }
      if (data.customerPhone && typeof data.customerPhone === 'string') {
        session.customerPhone = data.customerPhone.substring(0, 20);
      }
      
      await session.save();

      io.to(`tenant:${tenantId}`).emit('session:updated', {
        sessionId: session._id,
        tableNumber: session.tableNumber,
        customerName: session.customerName,
        updatedAt: new Date()
      });
    });

    // Handle real-time analytics with caching
    const analyticsCache = new Map();
    const ANALYTICS_CACHE_TTL = 5000; // 5 seconds

    handleSocketEvent('analytics:request', async (data, callback) => {
      const cacheKey = `${tenantId}:analytics`;
      const cached = analyticsCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL) {
        if (callback) callback(null, cached.data);
        else socket.emit('analytics:update', cached.data);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayOrders, activeTables] = await Promise.all([
        Order.countDocuments({
          tenantId,
          createdAt: { $gte: today }
        }),
        Table.countDocuments({
          tenantId,
          status: 'occupied'
        })
      ]);

      const analyticsData = {
        todayOrders,
        activeTables,
        timestamp: new Date()
      };

      // Cache the result
      analyticsCache.set(cacheKey, {
        data: analyticsData,
        timestamp: Date.now()
      });

      if (callback) callback(null, analyticsData);
      else socket.emit('analytics:update', analyticsData);
    });

    // Clean up analytics cache periodically
    const analyticsCacheTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of analyticsCache.entries()) {
        if (now - value.timestamp > ANALYTICS_CACHE_TTL * 2) {
          analyticsCache.delete(key);
        }
      }
    }, 10000);

    if (connectionTimers.has(socket.id)) {
      connectionTimers.get(socket.id).push(analyticsCacheTimer);
    }

    // Handle service request events
    handleSocketEvent('service:request', async (data) => {
      if (!data.tableNumber || !data.requestType) {
        return socket.emit('error', { 
          message: 'Invalid service request data',
          code: 'VALIDATION_ERROR' 
        });
      }

      // Emit to all waiters
      io.to(`tenant:${tenantId}:waiters`).emit('service:requested', {
        tableNumber: data.tableNumber,
        requestType: data.requestType,
        priority: data.priority || 'normal',
        message: data.message,
        timestamp: new Date()
      });
    });

    // Handle service request acknowledgement
    handleSocketEvent('service:acknowledge', async (data) => {
      if (!data.requestId || !data.waiterId) {
        return socket.emit('error', { 
          message: 'Invalid acknowledgement data',
          code: 'VALIDATION_ERROR' 
        });
      }

      // Find the request
      const request = await ServiceRequest.findOne({
        _id: data.requestId,
        tenantId,
        status: 'pending'
      });

      if (!request) {
        return socket.emit('error', { 
          message: 'Request not found',
          code: 'NOT_FOUND' 
        });
      }

      // Notify the table
      io.to(`table:${tenantId}:${request.tableNumber}`).emit('service:acknowledged', {
        requestId: request._id,
        waiterName: data.waiterName
      });
    });

    // Handle waiter location updates for smart assignment
    handleSocketEvent('waiter:location', async (data) => {
      if (!data.waiterId || !data.location) {
        return;
      }

      // Store waiter location for smart assignment
      // This can be used for location-based assignment
      socket.data.location = data.location;
      socket.data.waiterId = data.waiterId;
    });

    // Handle disconnect with cleanup
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected for tenant: ${tenantId}`);
      cleanupConnection(socket.id);
      
      // Clean up any tenant-specific resources
      analyticsCache.delete(`${tenantId}:analytics`);
    });

    // Send initial connection success
    socket.emit('connected', { 
      tenantId,
      message: 'Connected to restaurant system',
      serverTime: new Date()
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    for (const [socketId, connection] of activeConnections.entries()) {
      const idleTime = now - connection.lastActivity.getTime();
      if (idleTime > 60 * 60 * 1000) { // 1 hour
        logger.info(`Cleaning up stale connection: ${socketId}`);
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect();
        }
        cleanupConnection(socketId);
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

// Export cleanup function for graceful shutdown
module.exports.cleanup = () => {
  logger.info('Cleaning up socket connections...');
  for (const socketId of activeConnections.keys()) {
    cleanupConnection(socketId);
  }
  rateLimiters.clear();
};