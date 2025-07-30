// src/routes/mobile/waiter.js - Complete Waiter Routes
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const Table = require('../../models/Table');
const Order = require('../../models/Order');
const TableSession = require('../../models/TableSession');
const CustomerSession = require('../../models/CustomerSession');
const User = require('../../models/User');

// Apply authentication to all routes
router.use(authenticate);
router.use(authorize('waiter', 'admin'));

// Get waiter's active table sessions and orders
router.get('/tables', async (req, res) => {
  try {
    // Get all active table sessions for this waiter
    const tableSessions = await TableSession.find({
      waiter: req.user._id,
      isActive: true
    }).sort('-loginTime');
    
    // Extract table numbers
    const tableNumbers = tableSessions.map(session => session.tableNumber);
    
    // Get table details for these table numbers
    const tables = await Table.find({ 
      number: { $in: tableNumbers } 
    }).populate('currentOrder');
    
    // Get all active orders for these tables
    const activeOrders = await Order.find({
      tableNumber: { $in: tableNumbers },
      status: { $nin: ['paid', 'cancelled'] }
    }).populate('items.menuItem').sort('-createdAt');
    
    // Group orders by table
    const ordersByTable = {};
    activeOrders.forEach(order => {
      if (!ordersByTable[order.tableNumber]) {
        ordersByTable[order.tableNumber] = [];
      }
      ordersByTable[order.tableNumber].push(order);
    });
    
    // Combine table info with session and order data
    const tablesWithDetails = tableNumbers.map(tableNumber => {
      const table = tables.find(t => t.number === tableNumber) || {
        number: tableNumber,
        status: 'available',
        capacity: 4,
        zone: 'main'
      };
      
      const session = tableSessions.find(s => s.tableNumber === tableNumber);
      
      return {
        ...table.toObject ? table.toObject() : table,
        sessionInfo: {
          loginTime: session.loginTime,
          lastActivity: session.lastActivity
        },
        activeOrders: ordersByTable[tableNumber] || [],
        currentGuests: ordersByTable[tableNumber]?.length > 0 ? 
          Math.max(...ordersByTable[tableNumber].map(o => o.occupancy || 1)) : 0
      };
    });
    
    res.json({ 
      tables: tablesWithDetails,
      totalOrders: activeOrders.length
    });
  } catch (error) {
    console.error('Error getting waiter tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete Order History - Shows ALL orders from ALL tables the waiter has EVER logged into

router.get('/orders/history', async (req, res) => {
  try {
    const waiterId = req.user._id;
    const { startDate, endDate } = req.query;
    
    console.log('Getting complete order history for waiter:', waiterId);
    
    // Step 1: Get ALL table sessions (active AND inactive) for this waiter
    const tableSessionFilter = { waiter: waiterId };
    
    // Add date filter to table sessions if needed
    if (startDate || endDate) {
      tableSessionFilter.loginTime = {};
      if (startDate) tableSessionFilter.loginTime.$gte = new Date(startDate);
      if (endDate) tableSessionFilter.loginTime.$lte = new Date(endDate);
    }
    
    const allTableSessions = await TableSession.find(tableSessionFilter);
    
    // Extract all unique table numbers this waiter has EVER served
    const allTableNumbers = [...new Set(allTableSessions.map(s => s.tableNumber))];
    
    console.log(`Waiter has served ${allTableNumbers.length} tables:`, allTableNumbers);
    
    // Step 2: Get ALL CustomerSessions (active AND inactive) for these tables
    const customerSessionFilter = {
      tableNumber: { $in: allTableNumbers }
    };
    
    // Optional: Add date filter for customer sessions
    if (startDate || endDate) {
      customerSessionFilter.createdAt = {};
      if (startDate) customerSessionFilter.createdAt.$gte = new Date(startDate);
      if (endDate) customerSessionFilter.createdAt.$lte = new Date(endDate);
    }
    
    const allCustomerSessions = await CustomerSession.find(customerSessionFilter)
      .populate({
        path: 'orders',
        populate: {
          path: 'items.menuItem',
          model: 'MenuItem'
        }
      });
    
    console.log(`Found ${allCustomerSessions.length} customer sessions for these tables`);
    
    // Step 3: Extract ALL orders from these customer sessions
    let ordersFromSessions = [];
    allCustomerSessions.forEach(session => {
      if (session.orders && session.orders.length > 0) {
        // Add table number and customer info to each order for reference
        session.orders.forEach(order => {
          if (order && typeof order === 'object') {
            order._customerInfo = {
              customerName: session.customerName,
              customerPhone: session.customerPhone,
              sessionDate: session.createdAt,
              occupancy: session.occupancy
            };
          }
        });
        ordersFromSessions = ordersFromSessions.concat(session.orders);
      }
    });
    
    // Step 4: Also get orders directly from these tables (in case some orders exist without CustomerSessions)
    const directOrderFilter = {
      tableNumber: { $in: allTableNumbers }
    };
    
    if (startDate || endDate) {
      directOrderFilter.createdAt = {};
      if (startDate) directOrderFilter.createdAt.$gte = new Date(startDate);
      if (endDate) directOrderFilter.createdAt.$lte = new Date(endDate);
    }
    
    const ordersFromTables = await Order.find(directOrderFilter)
      .populate('items.menuItem')
      .populate('waiter', 'name');
    
    // Step 5: Also get orders directly assigned to waiter (belt and suspenders approach)
    const directWaiterFilter = {
      $or: [
        { waiter: waiterId },
        { waiterId: waiterId },
        { assignedTo: waiterId },
        { 'waiterInfo.id': waiterId.toString() }
      ]
    };
    
    if (startDate || endDate) {
      directWaiterFilter.createdAt = {};
      if (startDate) directWaiterFilter.createdAt.$gte = new Date(startDate);
      if (endDate) directWaiterFilter.createdAt.$lte = new Date(endDate);
    }
    
    const directWaiterOrders = await Order.find(directWaiterFilter)
      .populate('items.menuItem')
      .populate('waiter', 'name');
    
    // Step 6: Combine and deduplicate all orders
    const orderMap = new Map();
    
    // Add orders from customer sessions
    ordersFromSessions.forEach(order => {
      if (order && order._id) {
        orderMap.set(order._id.toString(), order);
      }
    });
    
    // Add orders from tables
    ordersFromTables.forEach(order => {
      if (!orderMap.has(order._id.toString())) {
        orderMap.set(order._id.toString(), order);
      }
    });
    
    // Add direct waiter orders
    directWaiterOrders.forEach(order => {
      if (!orderMap.has(order._id.toString())) {
        orderMap.set(order._id.toString(), order);
      }
    });
    
    // Convert map to array and sort by date
    const allOrders = Array.from(orderMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log('Order history summary:');
    console.log(`- Tables served: ${allTableNumbers.length}`);
    console.log(`- Customer sessions: ${allCustomerSessions.length}`);
    console.log(`- Orders from sessions: ${ordersFromSessions.length}`);
    console.log(`- Orders from tables: ${ordersFromTables.length}`);
    console.log(`- Direct waiter orders: ${directWaiterOrders.length}`);
    console.log(`- Total unique orders: ${allOrders.length}`);
    
    // Step 7: Add additional metadata
    const response = {
      orders: allOrders,
      summary: {
        totalOrders: allOrders.length,
        tablesServed: allTableNumbers.length,
        customerSessions: allCustomerSessions.length,
        dateRange: {
          from: startDate || 'all time',
          to: endDate || 'present'
        }
      },
      // Group by table for easier viewing
      ordersByTable: {}
    };
    
    // Group orders by table number
    allOrders.forEach(order => {
      const table = order.tableNumber || 'Unknown';
      if (!response.ordersByTable[table]) {
        response.ordersByTable[table] = [];
      }
      response.ordersByTable[table].push(order);
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('Error getting order history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scan and login to table (mobile app)
router.post('/login-table', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    
    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    
    // Verify table exists
    const table = await Table.findOne({ number: String(tableNumber) });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Create or update table session
    let tableSession = await TableSession.findOne({
      waiter: req.user._id,
      tableNumber: String(tableNumber),
      isActive: true
    });

    if (!tableSession) {
      tableSession = new TableSession({
        waiter: req.user._id,
        tableNumber: String(tableNumber),
        loginTime: new Date(),
        isActive: true,
        deviceInfo: {
          type: 'mobile',
          browser: req.headers['user-agent'],
          ip: req.ip
        }
      });
    } else {
      tableSession.lastActivity = new Date();
    }

    await tableSession.save();
    
    // Update table status if needed
    if (table.status === 'available') {
      table.status = 'occupied';
      table.waiter = req.user._id;
      await table.save();
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('waiter-table-login', {
        waiterId: req.user._id,
        waiterName: req.user.name,
        tableNumber: tableNumber,
        timestamp: new Date()
      });
    }
    
    res.json({ 
      success: true, 
      table,
      message: `Logged into table ${tableNumber}` 
    });
  } catch (error) {
    console.error('Login to table error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout from table
router.post('/logout-table', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    
    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    
    // Deactivate table session
    const result = await TableSession.updateMany(
      { 
        waiter: req.user._id, 
        tableNumber: String(tableNumber),
        isActive: true 
      },
      { 
        isActive: false, 
        logoutTime: new Date(),
        lastActivity: new Date()
      }
    );
    
    // Update table status if no active orders
    const activeOrders = await Order.find({
      tableNumber: String(tableNumber),
      status: { $nin: ['paid', 'cancelled'] }
    });
    
    if (activeOrders.length === 0) {
      await Table.findOneAndUpdate(
        { number: String(tableNumber) },
        { status: 'available' }
      );
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('waiter-table-logout', {
        waiterId: req.user._id,
        waiterName: req.user.name,
        tableNumber: tableNumber,
        timestamp: new Date()
      });
    }
    
    res.json({ 
      success: true,
      message: `Logged out from table ${tableNumber}`,
      sessionsUpdated: result.modifiedCount
    });
  } catch (error) {
    console.error('Logout from table error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle service requests
router.post('/service-request', async (req, res) => {
  try {
    const { tableNumber, type, message, urgent } = req.body;
    
    if (!tableNumber || !type) {
      return res.status(400).json({ error: 'Table number and request type are required' });
    }
    
    const requestData = {
      tableNumber: tableNumber.toString(),
      type,
      message: message || `${type} requested`,
      urgent: urgent || ['call-waiter', 'bill'].includes(type),
      timestamp: new Date(),
      status: 'pending',
      requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Find all waiters assigned to this table
    const tableSessions = await TableSession.find({
      tableNumber: tableNumber.toString(),
      isActive: true
    }).populate('waiter');
    
    if (tableSessions.length === 0) {
      return res.status(404).json({ 
        error: 'No waiter assigned to this table',
        message: 'Please ask staff to login to this table first'
      });
    }
    
    // Get socket instance
    const io = req.app.get('io');
    
    if (io) {
      // Send to each assigned waiter
      for (const session of tableSessions) {
        if (session.waiter) {
          const waiterId = session.waiter._id.toString();
          const waiterRoom = `waiter-${waiterId}`;
          
          // Emit to waiter's room on main namespace
          io.to(waiterRoom).emit('customer-request', requestData);
          
          // Also emit specific event based on type
          if (type === 'call-waiter') {
            io.to(waiterRoom).emit('call-waiter', {
              ...requestData,
              urgent: true
            });
          } else {
            io.to(waiterRoom).emit('table-service-request', requestData);
          }
          
          // Send to waiter namespace as well
          io.of('/waiter').to(waiterRoom).emit('table-service-request', requestData);
          
          console.log(`Service request sent to waiter ${session.waiter.name} for table ${tableNumber}`);
        }
      }
      
      // Also broadcast to all connected clients for monitoring
      io.emit('service-activity', {
        tableNumber,
        type,
        timestamp: new Date()
      });
    }
    
    // Send push notification if available
    if (global.sendNotificationToWaiter) {
      for (const session of tableSessions) {
        if (session.waiter) {
          await global.sendNotificationToWaiter(session.waiter._id, {
            title: urgent ? '🚨 Urgent Request' : '🔔 Service Request',
            body: `Table ${tableNumber}: ${message || type}`,
            data: requestData
          });
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Service request sent successfully',
      waitersNotified: tableSessions.length,
      request: requestData
    });
    
  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({ error: 'Failed to send service request' });
  }
});

// Get waiter stats - THIS IS THE MISSING ENDPOINT
router.get('/stats', async (req, res) => {
  try {
    const waiterId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's orders
    const todayOrders = await Order.find({
      $or: [
        { waiter: waiterId },
        { waiterId: waiterId },
        { 'waiterInfo.id': waiterId.toString() }
      ],
      createdAt: { $gte: today }
    });

    // Get active customer sessions
    const activeSessions = await CustomerSession.find({
      waiter: waiterId,
      isActive: true
    });

    // Get all-time stats
    const allTimeOrders = await Order.find({
      $or: [
        { waiter: waiterId },
        { waiterId: waiterId },
        { 'waiterInfo.id': waiterId.toString() }
      ]
    });

    // Get active table sessions
    const activeTableSessions = await TableSession.find({
      waiter: waiterId,
      isActive: true
    });

    // Calculate stats
    const stats = {
      today: {
        ordersServed: todayOrders.filter(o => ['served', 'paid'].includes(o.status)).length,
        activeOrders: todayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
        totalRevenue: todayOrders
          .filter(o => o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + (o.total || 0), 0),
        totalTips: todayOrders.reduce((sum, o) => sum + (o.tip || 0), 0),
        customersServed: activeSessions.reduce((sum, s) => sum + (s.occupancy || 1), 0)
      },
      current: {
        activeTables: activeTableSessions.length,
        activeCustomerSessions: activeSessions.length,
        pendingOrders: todayOrders.filter(o => o.status === 'pending').length,
        preparingOrders: todayOrders.filter(o => o.status === 'preparing').length,
        readyOrders: todayOrders.filter(o => o.status === 'ready').length
      },
      allTime: {
        totalOrders: allTimeOrders.length,
        totalRevenue: allTimeOrders
          .filter(o => o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + (o.total || 0), 0),
        totalTips: allTimeOrders.reduce((sum, o) => sum + (o.tip || 0), 0),
        averageOrderValue: allTimeOrders.length > 0 
          ? allTimeOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allTimeOrders.length 
          : 0
      },
      performance: {
        averageServiceTime: calculateAverageServiceTime(todayOrders),
        customerSatisfaction: calculateSatisfactionScore(allTimeOrders),
        tablesPerHour: calculateTablesPerHour(activeTableSessions, todayOrders)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching waiter stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get pending service requests for waiter
router.get('/service-requests', async (req, res) => {
  try {
    // Get all active table sessions for this waiter
    const sessions = await TableSession.find({
      waiter: req.user._id,
      isActive: true
    });
    
    const tableNumbers = sessions.map(s => s.tableNumber);
    
    // In a production system, you might store service requests in a database
    // For now, return empty array as requests are handled via real-time sockets
    res.json({ 
      requests: [],
      tables: tableNumbers,
      message: 'Service requests are handled in real-time via socket connections'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge service request
router.post('/service-request/:requestId/acknowledge', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Emit acknowledgment via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('request-acknowledged', {
        requestId,
        waiterId: req.user._id,
        waiterName: req.user.name,
        timestamp: new Date()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Request acknowledged'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get waiter profile
router.get('/profile', async (req, res) => {
  try {
    const waiter = await User.findById(req.user._id)
      .select('-password');
    
    res.json(waiter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update waiter profile - ONLY phone and emergency contact
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { phone, emergencyContact } = req.body;
    
    // Only allow updating phone and emergency contact
    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
    
    const waiter = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!waiter) {
      return res.status(404).json({ error: 'Waiter not found' });
    }
    
    res.json(waiter);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get waiter preferences
router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json(user.preferences || {
      pushNotifications: true,
      orderAlerts: true,
      tableAlerts: true,
      soundEnabled: true,
      vibrationEnabled: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update waiter preferences
router.put('/preferences', async (req, res) => {
  try {
    const { preferences } = req.body;
    
    await User.findByIdAndUpdate(
      req.user._id,
      { preferences },
      { new: true }
    );
    
    res.json({ success: true, preferences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Mobile waiter route is working',
    user: req.user.name,
    userId: req.user._id
  });
});

// Helper functions - add these at the bottom of your waiter.js file before module.exports
function calculateAverageServiceTime(orders) {
  const completedOrders = orders.filter(o => o.servedAt && o.createdAt);
  if (completedOrders.length === 0) return 0;
  
  const totalTime = completedOrders.reduce((sum, order) => {
    const serviceTime = new Date(order.servedAt) - new Date(order.createdAt);
    return sum + serviceTime;
  }, 0);
  
  return Math.round(totalTime / completedOrders.length / 1000 / 60); // in minutes
}

function calculateSatisfactionScore(orders) {
  const ratedOrders = orders.filter(o => o.rating);
  if (ratedOrders.length === 0) return 0;
  
  const totalRating = ratedOrders.reduce((sum, o) => sum + o.rating, 0);
  return (totalRating / ratedOrders.length).toFixed(1);
}

function calculateTablesPerHour(sessions, orders) {
  if (sessions.length === 0) return 0;
  
  const now = new Date();
  const earliestSession = sessions.reduce((earliest, session) => {
    const sessionTime = new Date(session.loginTime);
    return sessionTime < earliest ? sessionTime : earliest;
  }, now);
  
  const hoursWorked = (now - earliestSession) / 1000 / 60 / 60;
  return hoursWorked > 0 ? (orders.length / hoursWorked).toFixed(1) : 0;
}

module.exports = router;