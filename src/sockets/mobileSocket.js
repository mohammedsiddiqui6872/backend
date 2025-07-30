// src/sockets/mobileSocket.js - Complete Mobile Socket Implementation
const User = require('../models/User');
const Order = require('../models/Order');
const TableSession = require('../models/TableSession');
const jwt = require('jsonwebtoken');

// Authentication middleware for socket connections
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      if (!user.isActive) {
        return next(new Error('Authentication error: User account is inactive'));
      }
      
      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;
      socket.userRole = user.role;
      
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  } catch (error) {
    return next(new Error('Authentication error: ' + error.message));
  }
};

module.exports = (io) => {
  // Kitchen namespace
  const kitchenNamespace = io.of('/kitchen');
  
  // Apply authentication middleware
  kitchenNamespace.use(authenticateSocket);
  
  kitchenNamespace.on('connection', (socket) => {
    console.log('Kitchen tablet connected:', socket.id, 'User:', socket.user?.name);
    
    socket.on('kitchen-online', async (data) => {
      socket.join('kitchen');
      if (data.station) {
        socket.join(`station-${data.station}`);
      }
      
      // Update chef status
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: true,
          lastSeen: new Date(),
          currentStation: data.station
        });
      }
      
      console.log(`Chef ${socket.user.name} is online at station: ${data.station || 'all'}`);
    });
    
    socket.on('order-started', async (orderId) => {
      try {
        const order = await Order.findByIdAndUpdate(orderId, {
          status: 'preparing',
          startedAt: new Date(),
          chef: socket.userId
        }, { new: true });
        
        // Notify all kitchen displays
        kitchenNamespace.emit('order-update', order);
        
        // Notify waiter
        if (order && order.waiter) {
          io.to(`waiter-${order.waiter}`).emit('order-status-update', {
            orderId,
            status: 'preparing',
            tableNumber: order.tableNumber
          });
          
          // Send to waiter namespace too
          io.of('/waiter').to(`waiter-${order.waiter}`).emit('order-preparing', {
            orderId,
            tableNumber: order.tableNumber
          });
        }
      } catch (error) {
        console.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });
    
    socket.on('order-ready', async (orderId) => {
      try {
        const order = await Order.findByIdAndUpdate(orderId, {
          status: 'ready',
          preparedAt: new Date()
        }, { new: true }).populate('waiter');
        
        // Calculate actual prep time
        if (order.startedAt) {
          order.actualPrepTime = Math.round((order.preparedAt - order.startedAt) / 1000 / 60);
          await order.save();
        }
        
        // Notify all kitchen displays
        kitchenNamespace.emit('order-update', order);
        
        // Notify waiter
        if (order && order.waiter) {
          const notification = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber,
            status: 'ready'
          };
          
          // Send to main namespace
          io.to(`waiter-${order.waiter._id}`).emit('order-ready', notification);
          
          // Send to waiter namespace
          io.of('/waiter').to(`waiter-${order.waiter._id}`).emit('order-ready', notification);
          
          // Send push notification
          if (global.sendNotificationToWaiter) {
            await global.sendNotificationToWaiter(order.waiter._id, {
              title: '🍽️ Order Ready!',
              body: `Order #${order.orderNumber} for Table ${order.tableNumber} is ready for pickup`,
              data: notification
            });
          }
        }
      } catch (error) {
        console.error('Error marking order ready:', error);
        socket.emit('error', { message: 'Failed to mark order as ready' });
      }
    });
    
    socket.on('item-status-update', async (data) => {
      try {
        const { orderId, itemId, status } = data;
        
        const order = await Order.findById(orderId);
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }
        
        const item = order.items.id(itemId);
        if (!item) {
          return socket.emit('error', { message: 'Item not found' });
        }
        
        item.status = status;
        if (status === 'ready') {
          item.preparedAt = new Date();
          item.preparedBy = socket.userId;
        }
        
        // Check if all items are ready
        const allReady = order.items.every(item => item.status === 'ready');
        if (allReady && order.status === 'preparing') {
          order.status = 'ready';
          order.preparedAt = new Date();
        }
        
        await order.save();
        
        // Notify all kitchen displays
        kitchenNamespace.emit('order-update', order);
        
        // Notify waiter if order is ready
        if (order.status === 'ready' && order.waiter) {
          io.to(`waiter-${order.waiter}`).emit('order-ready', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber
          });
        }
      } catch (error) {
        console.error('Error updating item status:', error);
        socket.emit('error', { message: 'Failed to update item status' });
      }
    });
    
    socket.on('disconnect', async () => {
      console.log('Kitchen tablet disconnected:', socket.id);
      
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false,
          lastSeen: new Date()
        });
      }
    });
  });
  
  // Waiter namespace
  const waiterNamespace = io.of('/waiter');
  
  // Apply authentication middleware
  waiterNamespace.use(authenticateSocket);
  
  waiterNamespace.on('connection', (socket) => {
    console.log('Waiter app connected:', socket.id, 'User:', socket.user?.name);
    
    // Join user-specific room
    if (socket.userId) {
      socket.join(`waiter-${socket.userId}`);
      console.log(`Waiter ${socket.user.name} joined room: waiter-${socket.userId}`);
    }
    
    socket.on('waiter-online', async (data) => {
      socket.join('waiters');
      
      if (socket.userId) {
        // Update waiter status
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: true,
          lastSeen: new Date()
        });
        
        // Join user-specific room
        socket.join(`waiter-${socket.userId}`);
        
        // Get active table sessions
        const sessions = await TableSession.find({
          waiter: socket.userId,
          isActive: true
        });
        
        // Join table rooms
        sessions.forEach(session => {
          socket.join(`table-${session.tableNumber}`);
        });
        
        console.log(`Waiter ${socket.user.name} is online with ${sessions.length} active tables`);
      }
    });
    
    socket.on('join-table', async (data) => {
      const { tableNumber } = data;
      socket.join(`table-${tableNumber}`);
      console.log(`Waiter ${socket.user.name} joined table ${tableNumber}`);
    });
    
    socket.on('leave-table', async (data) => {
      const { tableNumber } = data;
      socket.leave(`table-${tableNumber}`);
      console.log(`Waiter ${socket.user.name} left table ${tableNumber}`);
    });
    
    socket.on('order-status-update', async (data) => {
      try {
        const { orderId, status } = data;
        
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
        
        // Notify kitchen
        io.of('/kitchen').emit('order-update', order);
        
        // Notify table
        io.to(`table-${order.tableNumber}`).emit('order-status-update', {
          orderId: order._id,
          status: order.status
        });
        
        console.log(`Order ${orderId} status updated to ${status} by ${socket.user.name}`);
      } catch (error) {
        console.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });
    
    socket.on('request-bill', async (tableNumber) => {
      try {
        // Find all waiters for this table
        const sessions = await TableSession.find({
          tableNumber: String(tableNumber),
          isActive: true
        });
        
        // Notify all assigned waiters
        sessions.forEach(session => {
          if (session.waiter) {
            waiterNamespace.to(`waiter-${session.waiter}`).emit('bill-requested', {
              tableNumber,
              timestamp: new Date()
            });
          }
        });
        
        console.log(`Bill requested for table ${tableNumber}`);
      } catch (error) {
        console.error('Error requesting bill:', error);
      }
    });
    
    // Send live metrics periodically
    const metricsInterval = setInterval(() => {
      if (socket.connected) {
        sendLiveMetrics(socket);
      }
    }, 30000); // Every 30 seconds
    
    socket.on('disconnect', async () => {
      clearInterval(metricsInterval);
      console.log('Waiter app disconnected:', socket.id);
      
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false,
          lastSeen: new Date()
        });
      }
    });
  });
  
  // Manager namespace
  const managerNamespace = io.of('/admin');
  
  // Apply authentication middleware
  managerNamespace.use(authenticateSocket);
  
  managerNamespace.on('connection', (socket) => {
    console.log('Manager dashboard connected:', socket.id, 'User:', socket.user?.name);
    
    // Verify manager/admin role
    if (socket.userRole !== 'admin' && socket.userRole !== 'manager') {
      socket.emit('error', { message: 'Unauthorized: Manager access required' });
      socket.disconnect();
      return;
    }
    
    socket.on('join-admin', () => {
      socket.join('managers');
      socket.join('admin-dashboard');
      console.log(`Manager ${socket.user.name} joined admin dashboard`);
      
      // Send initial metrics
      sendManagerMetrics(socket);
    });
    
    socket.on('request-metrics', () => {
      sendManagerMetrics(socket);
    });
    
    // Send metrics every 5 seconds
    const metricsInterval = setInterval(() => {
      if (socket.connected) {
        sendManagerMetrics(socket);
      }
    }, 5000);
    
    socket.on('disconnect', () => {
      clearInterval(metricsInterval);
      console.log('Manager dashboard disconnected:', socket.id);
    });
  });
  
  // Main namespace handlers for customer requests
  io.on('connection', (socket) => {
    console.log('Client connected to main namespace:', socket.id);
    
    // Handle customer service requests from frontend
    socket.on('customer-request', async (data) => {
      console.log('Customer request received:', data);
      const { tableNumber, type, message, urgent } = data;
      
      try {
        // Find all waiters assigned to this table
        const sessions = await TableSession.find({
          tableNumber: String(tableNumber),
          isActive: true
        }).populate('waiter');
        
        console.log(`Found ${sessions.length} waiters for table ${tableNumber}`);
        
        // Send to each assigned waiter
        for (const session of sessions) {
          if (session.waiter) {
            const waiterId = session.waiter._id.toString();
            const waiterRoom = `waiter-${waiterId}`;
            
            // Emit to waiter's room on main namespace
            io.to(waiterRoom).emit('customer-request', data);
            
            // Also emit to waiter namespace
            waiterNamespace.to(waiterRoom).emit('table-service-request', {
              ...data,
              waiterId: waiterId,
              waiterName: session.waiter.name
            });
            
            console.log(`Sent notification to waiter ${session.waiter.name} in room ${waiterRoom}`);
            
            // Send push notification if available
            if (global.sendNotificationToWaiter) {
              await global.sendNotificationToWaiter(waiterId, {
                title: urgent ? '🚨 URGENT Request' : '🔔 Service Request',
                body: `Table ${tableNumber}: ${message || type}`,
                data: {
                  type: 'customer-request',
                  tableNumber: String(tableNumber),
                  requestType: type,
                  urgent: urgent
                }
              });
            }
          }
        }
        
        // Also broadcast to all waiters for awareness
        io.to('waiters').emit('service-activity', {
          tableNumber,
          type,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Error handling customer request:', error);
      }
    });
    
    // Handle specific call waiter requests
    socket.on('call-waiter', async (data) => {
      console.log('Call waiter request:', data);
      const { tableNumber } = data;
      
      try {
        // Find waiters for this table
        const sessions = await TableSession.find({
          tableNumber: String(tableNumber),
          isActive: true
        }).populate('waiter');
        
        // Send urgent notification
        for (const session of sessions) {
          if (session.waiter) {
            const waiterId = session.waiter._id.toString();
            const waiterRoom = `waiter-${waiterId}`;
            
            // Send as urgent
            io.to(waiterRoom).emit('call-waiter', {
              ...data,
              urgent: true,
              type: 'call-waiter',
              message: 'Customer is calling for assistance!'
            });
            
            // Also send to waiter namespace
            waiterNamespace.to(waiterRoom).emit('urgent-notification', {
              tableNumber,
              type: 'call-waiter',
              message: 'URGENT: Customer needs assistance!',
              urgent: true,
              timestamp: new Date()
            });
            
            // Push notification with high priority
            if (global.sendNotificationToWaiter) {
              await global.sendNotificationToWaiter(waiterId, {
                title: '🚨 URGENT: Customer Calling',
                body: `Table ${tableNumber} needs immediate assistance!`,
                data: {
                  type: 'call-waiter',
                  tableNumber: String(tableNumber),
                  urgent: true
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error handling call waiter:', error);
      }
    });
    
    // Handle table service requests (water, napkins, etc.)
    socket.on('table-service-request', async (data) => {
      console.log('Table service request:', data);
      
      // Forward to customer-request handler
      socket.emit('customer-request', data);
    });
    
    // When a waiter connects from mobile app, join their room
    socket.on('waiter-online', async (data) => {
      if (data.waiterId) {
        const waiterRoom = `waiter-${data.waiterId}`;
        socket.join(waiterRoom);
        socket.join('waiters');
        console.log(`Waiter ${data.waiterId} joined room ${waiterRoom} on main namespace`);
      }
    });
  });
  
  // Helper function to send live metrics to waiter
  async function sendLiveMetrics(socket) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeOrders = await Order.countDocuments({ 
        waiter: socket.userId,
        status: { $in: ['pending', 'confirmed', 'preparing'] } 
      });
      
      const completedToday = await Order.countDocuments({
        waiter: socket.userId,
        status: 'paid',
        createdAt: { $gte: today }
      });
      
      socket.emit('live-metrics', {
        activeOrders,
        completedToday,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending live metrics:', error);
    }
  }
  
  // Helper function to send manager metrics
  async function sendManagerMetrics(socket) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [activeOrders, totalRevenue, activeWaiters, activeChefs] = await Promise.all([
        Order.countDocuments({ 
          status: { $in: ['pending', 'confirmed', 'preparing'] } 
        }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: today },
              status: 'paid'
            } 
          },
          { 
            $group: { 
              _id: null, 
              total: { $sum: '$total' } 
            } 
          }
        ]),
        User.countDocuments({ 
          role: 'waiter', 
          isOnline: true 
        }),
        User.countDocuments({ 
          role: { $in: ['chef', 'cook'] }, 
          isOnline: true 
        })
      ]);
      
      socket.emit('metrics-update', {
        activeOrders,
        todayRevenue: totalRevenue[0]?.total || 0,
        staffOnDuty: activeWaiters + activeChefs,
        activeWaiters,
        activeChefs,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending manager metrics:', error);
    }
  }
};