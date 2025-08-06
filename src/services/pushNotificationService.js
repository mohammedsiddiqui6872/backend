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
  
  async sendToDevice(deviceTokens, title, body, data = {}) {
    // Handle both single token and array of tokens
    const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];
    
    if (!this.admin) {
      console.log('Firebase admin not initialized, cannot send notification');
      return { success: false, error: 'Firebase not initialized' };
    }
    
    if (tokens.length === 0) {
      return { success: false, error: 'No device tokens provided' };
    }

    try {
      const results = [];
      
      for (const token of tokens) {
        if (!token) continue;
        
        const message = {
          notification: {
            title: title,
            body: body
          },
          data: {
            ...data,
            timestamp: new Date().toISOString()
          },
          token: token,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: data.action || 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: data.badge || 1,
                'content-available': 1
              }
            }
          }
        };
        
        try {
          const response = await this.admin.messaging().send(message);
          results.push({ token, success: true, response });
        } catch (error) {
          console.error(`Error sending to token ${token}:`, error.message);
          results.push({ token, success: false, error: error.message });
          
          // Remove invalid tokens
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            // TODO: Remove invalid token from user's deviceTokens
            console.log(`Invalid token detected: ${token}`);
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: successCount > 0, 
        successCount,
        totalCount: tokens.length,
        results 
      };
    } catch (error) {
      console.error('Error sending push notifications:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Legacy method for backward compatibility
  async sendToDeviceLegacy(deviceToken, notification) {
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
  
  // Send shift reminder push notification
  async sendShiftReminder(deviceTokens, shift, minutesBefore) {
    const title = 'Shift Reminder';
    const body = `Your ${shift.shiftType} shift starts in ${minutesBefore} minutes at ${shift.scheduledTimes.start}`;
    const data = {
      type: 'shift-reminder',
      shiftId: shift._id.toString(),
      shiftDate: shift.date.toISOString(),
      shiftStart: shift.scheduledTimes.start,
      shiftEnd: shift.scheduledTimes.end,
      minutesBefore: minutesBefore.toString()
    };
    
    return this.sendToDevice(deviceTokens, title, body, data);
  }
  
  // Send break reminder push notification
  async sendBreakReminder(deviceTokens, breakType, breakDuration) {
    const title = `${breakType} Break Reminder`;
    const body = `Time for your ${breakDuration}-minute ${breakType.toLowerCase()} break`;
    const data = {
      type: 'break-reminder',
      breakType,
      breakDuration: breakDuration.toString()
    };
    
    return this.sendToDevice(deviceTokens, title, body, data);
  }
  
  // Send no-show alert push notification
  async sendNoShowAlert(deviceTokens, employeeName, shiftDetails) {
    const title = 'No-Show Alert';
    const body = `${employeeName} has not clocked in for their shift`;
    const data = {
      type: 'no-show-alert',
      employeeName,
      ...shiftDetails
    };
    
    return this.sendToDevice(deviceTokens, title, body, data);
  }
  
  // Send shift assignment notification
  async sendShiftAssignment(deviceTokens, shift) {
    const title = 'New Shift Assigned';
    const body = `You have a new ${shift.shiftType} shift on ${new Date(shift.date).toLocaleDateString()}`;
    const data = {
      type: 'shift-assigned',
      shiftId: shift._id.toString(),
      shiftDate: shift.date.toISOString(),
      shiftStart: shift.scheduledTimes.start,
      shiftEnd: shift.scheduledTimes.end
    };
    
    return this.sendToDevice(deviceTokens, title, body, data);
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