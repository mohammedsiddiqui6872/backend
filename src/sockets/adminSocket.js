const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

module.exports = (io) => {
  const adminNamespace = io.of('/admin');
  
  adminNamespace.on('connection', (socket) => {
    console.log('Admin connected:', socket.id);
    
    // Get tenant context from socket handshake
    const tenantId = socket.handshake.auth?.tenantId || socket.handshake.query?.tenantId;
    const userId = socket.handshake.auth?.userId;
    
    if (tenantId && userId) {
      // Join user-specific room for targeted notifications
      socket.join(`user-${userId}-${tenantId}`);
      
      // Join role-specific rooms
      const userRole = socket.handshake.auth?.role;
      if (userRole) {
        socket.join(`role-${userRole}-${tenantId}`);
      }
    }

    // Admin monitoring
    socket.on('monitor-all', () => {
      socket.join('admin-monitor');
    });

    // Real-time analytics updates
    setInterval(() => {
      // Send real-time stats to admin
      socket.to('admin-monitor').emit('stats-update', {
        timestamp: new Date(),
        activeOrders: Math.floor(Math.random() * 20),
        revenue: Math.floor(Math.random() * 5000)
      });
    }, 5000);

    // Handle menu updates
    socket.on('menu-update', (data) => {
      // Broadcast menu changes to all clients
      io.emit('menu-changed', data);
    });

    // Handle emergency notifications
    socket.on('alert-kitchen', (message) => {
      io.of('/kitchen').emit('admin-alert', {
        message,
        timestamp: new Date()
      });
    });

    // Handle shift notification acknowledgment
    socket.on('acknowledge-notification', (notificationId) => {
      console.log(`Notification ${notificationId} acknowledged by user ${userId}`);
    });

    // Subscribe to shift updates for real-time notifications
    socket.on('subscribe-shift-updates', (employeeId) => {
      if (employeeId && tenantId) {
        socket.join(`shift-updates-${employeeId}-${tenantId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Admin disconnected:', socket.id);
    });
  });
};