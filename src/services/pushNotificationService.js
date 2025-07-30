// src/services/pushNotificationService.js
const User = require('../models/User');

class PushNotificationService {
  constructor() {
    this.admin = null;
    try {
      this.admin = require('firebase-admin');
      console.log('Push notification service ready');
    } catch (error) {
      console.log('Firebase admin not available in push service');
    }
  }
  
  async sendToDevice(deviceToken, notification) {
    if (!this.admin) {
      console.log('Firebase admin not initialized, cannot send notification');
      return { success: false, error: 'Firebase not initialized' };
    }
    
    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        token: deviceToken,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: notification.action
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: notification.badge || 1
            }
          }
        }
      };
      
      const response = await this.admin.messaging().send(message);
      return { success: true, response };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  async sendToRole(role, notification) {
    if (!this.admin) {
      console.log('Firebase admin not initialized, cannot send notification');
      return { success: false, error: 'Firebase not initialized' };
    }
    
    try {
      const users = await User.find({ 
        role, 
        isActive: true,
        fcmToken: { $exists: true, $ne: null }
      });
      
      if (users.length === 0) {
        console.log(`No active users with role ${role} have FCM tokens`);
        return { success: false, error: 'No users to notify' };
      }
      
      const tokens = users.map(u => u.fcmToken).filter(token => token);
      
      if (tokens.length === 0) {
        return { success: false, error: 'No valid tokens found' };
      }
      
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        tokens
      };
      
      const response = await this.admin.messaging().sendMulticast(message);
      return { success: true, response };
    } catch (error) {
      console.error('Error sending push notifications to role:', error);
      return { success: false, error: error.message };
    }
  }
  
  async sendToWaiter(waiterId, notification) {
    try {
      const waiter = await User.findById(waiterId);
      
      if (!waiter || !waiter.fcmToken) {
        console.log('Waiter not found or no FCM token');
        return { success: false, error: 'Waiter not found or no token' };
      }
      
      return await this.sendToDevice(waiter.fcmToken, notification);
    } catch (error) {
      console.error('Error sending notification to waiter:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PushNotificationService;