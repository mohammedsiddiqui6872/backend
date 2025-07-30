// src/services/notificationService.js
const emailService = require('./emailService');
const smsService = require('./smsService');
const User = require('../models/User');

class NotificationService {
  async notifyOrder(order, type = 'confirmation') {
    const notifications = [];

    // Email notification
    if (order.customerEmail) {
      const emailResult = await emailService.sendOrderConfirmation(order, order.customerEmail);
      notifications.push({ type: 'email', ...emailResult });
    }

    // SMS notification
    if (order.customerPhone) {
      const phoneNumber = smsService.formatPhoneNumber(order.customerPhone);
      let smsResult;
      
      switch (type) {
        case 'confirmation':
          smsResult = await smsService.sendOrderConfirmation(phoneNumber, order);
          break;
        case 'ready':
          smsResult = await smsService.sendOrderReady(phoneNumber, order.orderNumber);
          break;
        default:
          smsResult = { success: false, error: 'Unknown notification type' };
      }
      
      notifications.push({ type: 'sms', ...smsResult });
    }

    // In-app notification via Socket.io
    const io = global.io;
    if (io) {
      io.to(`table-${order.tableNumber}`).emit(`order-${type}`, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        message: this.getNotificationMessage(type)
      });
      notifications.push({ type: 'socket', success: true });
    }

    return notifications;
  }

  async notifyStaff(message, role = 'all') {
    const query = role === 'all' ? {} : { role };
    const staff = await User.find({ ...query, isActive: true });

    const notifications = [];

    for (const user of staff) {
      if (user.email) {
        // Send email notification
        // Implementation depends on message type
      }

      if (user.phone) {
        // Send SMS if urgent
        // Implementation depends on urgency
      }
    }

    // Broadcast via Socket.io
    const io = global.io;
    if (io) {
      if (role === 'all') {
        io.of('/admin').emit('staff-notification', message);
      } else {
        io.of('/admin').to(`role-${role}`).emit('staff-notification', message);
      }
    }

    return notifications;
  }

  async notifyLowStock(items) {
    const managers = await User.find({ 
      role: { $in: ['admin', 'manager'] },
      isActive: true 
    });

    const message = {
      subject: 'Low Stock Alert',
      items: items.map(item => ({
        name: item.menuItem.name,
        current: item.currentStock,
        minimum: item.minStock
      })),
      timestamp: new Date()
    };

    // Send to all managers
    for (const manager of managers) {
      if (manager.email) {
        // Send low stock email
      }
    }

    // Real-time notification
    const io = global.io;
    if (io) {
      io.of('/admin').emit('low-stock-alert', message);
    }

    return { success: true, notified: managers.length };
  }

  getNotificationMessage(type) {
    const messages = {
      confirmation: 'Your order has been confirmed!',
      preparing: 'Your order is being prepared.',
      ready: 'Your order is ready!',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'Your order has been cancelled.'
    };

    return messages[type] || 'Order update';
  }
}

module.exports = new NotificationService();