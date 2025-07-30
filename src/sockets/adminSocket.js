module.exports = (io) => {
  const adminNamespace = io.of('/admin');
  
  adminNamespace.on('connection', (socket) => {
    console.log('Admin connected:', socket.id);

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

    socket.on('disconnect', () => {
      console.log('Admin disconnected:', socket.id);
    });
  });
};