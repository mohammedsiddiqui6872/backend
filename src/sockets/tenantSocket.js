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

    // Handle staff assignment requests
    socket.on('assignment:request-update', async () => {
      try {
        const StaffAssignment = require('../models/StaffAssignment');
        const assignments = await StaffAssignment.getActiveAssignments(tenantId);
        
        socket.emit('assignment:current-list', {
          assignments,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error fetching assignments:', error);
        socket.emit('error', { message: 'Failed to fetch assignments' });
      }
    });

    // Handle assignment creation from client
    socket.on('assignment:create', async (data) => {
      try {
        const { tableId, waiterId, role = 'primary' } = data;
        
        // Validate waiter and table exist
        const User = require('../models/User');
        const waiter = await User.findOne({
          _id: waiterId,
          tenantId,
          role: 'waiter',
          isActive: true
        });
        
        const table = await Table.findOne({
          _id: tableId,
          tenantId
        });
        
        if (!waiter || !table) {
          return socket.emit('error', { 
            message: 'Invalid waiter or table' 
          });
        }
        
        // Create assignment
        const StaffAssignment = require('../models/StaffAssignment');
        const assignment = new StaffAssignment({
          tenantId,
          tableId: table._id,
          tableNumber: table.number,
          waiterId: waiter._id,
          waiterName: waiter.name,
          role,
          assignedBy: socket.userId || waiterId, // Use socket user if available
          assignedByName: socket.userName || waiter.name,
          sectionId: table.location?.section,
          floorId: table.location?.floor,
          reason: 'manual'
        });
        
        await assignment.save();
        
        // Update table
        await table.assignWaiter(waiterId, role);
        
        // Emit to all clients
        io.to(`tenant:${tenantId}`).emit('assignment:created', {
          assignment: await StaffAssignment.findById(assignment._id)
            .populate('waiterId', 'name email avatar')
            .populate('tableId', 'number displayName location')
        });
      } catch (error) {
        console.error('Error creating assignment:', error);
        socket.emit('error', { message: 'Failed to create assignment' });
      }
    });

    // Handle assignment end from client
    socket.on('assignment:end', async (data) => {
      try {
        const { assignmentId } = data;
        const StaffAssignment = require('../models/StaffAssignment');
        
        const assignment = await StaffAssignment.findOne({
          _id: assignmentId,
          tenantId,
          status: 'active'
        });
        
        if (!assignment) {
          return socket.emit('error', { message: 'Assignment not found' });
        }
        
        // End assignment
        await assignment.endAssignment(socket.userId || assignment.waiterId);
        
        // Update table
        const table = await Table.findById(assignment.tableId);
        if (table) {
          await table.removeWaiter(assignment.waiterId);
        }
        
        // Emit to all clients
        io.to(`tenant:${tenantId}`).emit('assignment:ended', {
          assignmentId: assignment._id,
          tableNumber: assignment.tableNumber,
          waiterId: assignment.waiterId
        });
      } catch (error) {
        console.error('Error ending assignment:', error);
        socket.emit('error', { message: 'Failed to end assignment' });
      }
    });

    // Handle waiter load request
    socket.on('assignment:request-loads', async () => {
      try {
        const StaffAssignment = require('../models/StaffAssignment');
        const waiterLoads = await StaffAssignment.getWaiterLoads(tenantId);
        
        socket.emit('assignment:waiter-loads', {
          loads: waiterLoads,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error fetching waiter loads:', error);
        socket.emit('error', { message: 'Failed to fetch waiter loads' });
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