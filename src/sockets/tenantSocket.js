// Multi-tenant socket.io handler
const Order = require('../models/Order');
const Table = require('../models/Table');
const CustomerSession = require('../models/CustomerSession');

module.exports = (io) => {
  console.log('Multi-tenant socket handler initialized');

  io.on('connection', (socket) => {
    const tenantId = socket.tenantId;
    
    if (!tenantId) {
      console.log('Socket connected without tenant context');
      socket.disconnect();
      return;
    }

    console.log(`Socket connected for tenant: ${tenantId}`);
    
    // Join tenant-specific room
    socket.join(`tenant:${tenantId}`);

    // Handle table status updates
    socket.on('table:update-status', async (data) => {
      try {
        if (!data.tableNumber || !data.status) {
          return socket.emit('error', { message: 'Invalid table update data' });
        }

        const table = await Table.findOne({ 
          tenantId, 
          number: String(data.tableNumber) 
        });

        if (!table) {
          return socket.emit('error', { message: 'Table not found' });
        }

        table.status = data.status;
        if (data.occupants !== undefined) {
          table.currentGuests = data.occupants;
        }
        await table.save();

        // Emit to all clients of this tenant
        io.to(`tenant:${tenantId}`).emit('table:status-updated', {
          tableNumber: table.number,
          status: table.status,
          occupants: table.currentGuests
        });
      } catch (error) {
        console.error('Error updating table status:', error);
        socket.emit('error', { message: 'Failed to update table status' });
      }
    });

    // Handle new order notifications
    socket.on('order:new', async (data) => {
      try {
        // Emit to all waiters of this tenant
        io.to(`tenant:${tenantId}`).emit('order:new-notification', {
          orderNumber: data.orderNumber,
          tableNumber: data.tableNumber,
          items: data.items,
          total: data.total,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error broadcasting new order:', error);
      }
    });

    // Handle order status updates
    socket.on('order:update-status', async (data) => {
      try {
        const order = await Order.findOne({ 
          tenantId,
          _id: data.orderId 
        });

        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        order.status = data.status;
        await order.save();

        // Emit to all clients of this tenant
        io.to(`tenant:${tenantId}`).emit('order:status-updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          tableNumber: order.tableNumber
        });
      } catch (error) {
        console.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // Handle customer session updates
    socket.on('session:update', async (data) => {
      try {
        const session = await CustomerSession.findOne({
          tenantId,
          _id: data.sessionId,
          isActive: true
        });

        if (!session) {
          return socket.emit('error', { message: 'Session not found' });
        }

        // Update session data
        if (data.customerName) session.customerName = data.customerName;
        if (data.customerPhone) session.customerPhone = data.customerPhone;
        await session.save();

        // Emit to waiters
        io.to(`tenant:${tenantId}`).emit('session:updated', {
          sessionId: session._id,
          tableNumber: session.tableNumber,
          customerName: session.customerName
        });
      } catch (error) {
        console.error('Error updating session:', error);
        socket.emit('error', { message: 'Failed to update session' });
      }
    });

    // Handle waiter location updates (for table assignment)
    socket.on('waiter:location', async (data) => {
      try {
        socket.broadcast.to(`tenant:${tenantId}`).emit('waiter:location-update', {
          waiterId: data.waiterId,
          location: data.location,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error broadcasting waiter location:', error);
      }
    });

    // Handle kitchen notifications
    socket.on('kitchen:item-ready', async (data) => {
      try {
        // Notify waiters that item is ready
        io.to(`tenant:${tenantId}`).emit('kitchen:item-ready-notification', {
          orderId: data.orderId,
          itemId: data.itemId,
          tableNumber: data.tableNumber,
          itemName: data.itemName
        });
      } catch (error) {
        console.error('Error sending kitchen notification:', error);
      }
    });

    // Handle real-time analytics updates
    socket.on('analytics:request', async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayOrders, activeTabes] = await Promise.all([
          Order.countDocuments({
            tenantId,
            createdAt: { $gte: today }
          }),
          Table.countDocuments({
            tenantId,
            status: 'occupied'
          })
        ]);

        socket.emit('analytics:update', {
          todayOrders,
          activeTabes,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected for tenant: ${tenantId}`);
    });

    // Send initial connection success
    socket.emit('connected', { 
      tenantId,
      message: 'Connected to restaurant system' 
    });
  });
};