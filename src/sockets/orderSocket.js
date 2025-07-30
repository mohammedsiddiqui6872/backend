module.exports = (io) => {
  const orderNamespace = io.of('/orders');
  
  orderNamespace.on('connection', (socket) => {
    console.log('Order client connected:', socket.id);

    // Join table room
    socket.on('join-table', (tableNumber) => {
      socket.join(`table-${tableNumber}`);
      console.log(`Socket ${socket.id} joined table ${tableNumber}`);
    });

    // Handle order updates
    socket.on('order-update', async (data) => {
      const { orderId, status } = data;
      
      // Broadcast to relevant parties
      orderNamespace.emit('order-status-changed', {
        orderId,
        status,
        timestamp: new Date()
      });
    });

    // Handle new order
    socket.on('new-order', (orderData) => {
      // Notify kitchen
      io.of('/kitchen').emit('new-order', orderData);
      
      // Notify admin
      io.of('/admin').emit('new-order', orderData);
    });

    socket.on('disconnect', () => {
      console.log('Order client disconnected:', socket.id);
    });
  });
};