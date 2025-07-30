module.exports = (io) => {
  const kitchenNamespace = io.of('/kitchen');
  
  kitchenNamespace.on('connection', (socket) => {
    console.log('Kitchen display connected:', socket.id);

    // Kitchen joins their station
    socket.on('join-station', (station) => {
      socket.join(`station-${station}`);
    });

    // Handle item preparation updates
    socket.on('item-status', (data) => {
      const { orderId, itemId, status } = data;
      
      // Notify waiters and customers
      io.of('/orders').emit('kitchen-update', {
        orderId,
        itemId,
        status,
        timestamp: new Date()
      });
    });

    // Handle order completion
    socket.on('order-ready', (orderId) => {
      io.of('/orders').emit('order-ready', {
        orderId,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log('Kitchen display disconnected:', socket.id);
    });
  });
};