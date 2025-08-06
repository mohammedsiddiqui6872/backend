const ShiftNotification = require('../models/ShiftNotification');
const Shift = require('../models/Shift');
const User = require('../models/User');
const emailService = require('./emailService');
const smsService = require('./smsService');
const tenantEmailService = require('./tenantEmailService');
const tenantSmsService = require('./tenantSmsService');
const pushNotificationService = require('./pushNotificationService');
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

class ShiftNotificationService {
  constructor() {
    this.notificationQueue = [];
    this.processing = false;
    this.processingInterval = null;
  }

  // Initialize the notification service
  initialize() {
    // Process notification queue every minute
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 60000); // 1 minute

    // Process immediately on startup
    this.processNotificationQueue();
  }

  // Stop the notification service
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Create shift reminder notifications
  async createShiftReminders(shift, reminderIntervals = [60, 30, 15]) {
    const notifications = [];
    
    for (const minutes of reminderIntervals) {
      try {
        const notification = await ShiftNotification.createShiftReminder(shift, minutes);
        notifications.push(notification);
      } catch (error) {
        console.error(`Error creating ${minutes}-minute reminder for shift ${shift._id}:`, error);
      }
    }
    
    return notifications;
  }

  // Create no-show warning notification
  async createNoShowWarning(shift, minutesAfterStart = 15) {
    const shiftStartTime = new Date(shift.date);
    const [hours, minutes] = shift.scheduledTimes.start.split(':');
    shiftStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const warningTime = new Date(shiftStartTime);
    warningTime.setMinutes(warningTime.getMinutes() + minutesAfterStart);
    
    return ShiftNotification.create({
      tenantId: shift.tenantId,
      shift: shift._id,
      employee: shift.employee,
      type: 'no-show-warning',
      priority: 'urgent',
      channels: ['push', 'sms', 'in-app'],
      scheduledFor: warningTime,
      title: 'No Clock-In Detected',
      message: `You haven't clocked in for your ${shift.shiftType} shift that started at ${shift.scheduledTimes.start}. Please clock in immediately or contact your manager.`,
      data: {
        shiftDate: shift.date,
        shiftStart: shift.scheduledTimes.start,
        shiftEnd: shift.scheduledTimes.end,
        department: shift.department,
        position: shift.position
      }
    });
  }

  // Create swap request notification
  async createSwapRequestNotification(shift, requestedBy, requestedWith, reason) {
    const requestingEmployee = await User.findById(requestedBy).lean();
    const targetEmployee = await User.findById(requestedWith).lean();
    
    return ShiftNotification.create({
      tenantId: shift.tenantId,
      shift: shift._id,
      employee: requestedWith,
      type: 'swap-request',
      priority: 'high',
      channels: ['push', 'email', 'in-app'],
      scheduledFor: new Date(), // Send immediately
      title: 'Shift Swap Request',
      message: `${requestingEmployee.name} is requesting to swap their ${shift.shiftType} shift on ${new Date(shift.date).toLocaleDateString()} with you. Reason: ${reason}`,
      data: {
        shiftDate: shift.date,
        shiftStart: shift.scheduledTimes.start,
        shiftEnd: shift.scheduledTimes.end,
        department: shift.department,
        position: shift.position,
        otherEmployee: requestedBy,
        swapRequestId: shift.swapRequest?._id
      }
    });
  }

  // Create swap approval/rejection notification
  async createSwapResponseNotification(shift, requestedBy, approved, approvedBy) {
    const approver = await User.findById(approvedBy).lean();
    
    return ShiftNotification.create({
      tenantId: shift.tenantId,
      shift: shift._id,
      employee: requestedBy,
      type: approved ? 'swap-approved' : 'swap-rejected',
      priority: 'high',
      channels: ['push', 'email', 'in-app'],
      scheduledFor: new Date(), // Send immediately
      title: `Shift Swap ${approved ? 'Approved' : 'Rejected'}`,
      message: `Your shift swap request for ${shift.shiftType} shift on ${new Date(shift.date).toLocaleDateString()} has been ${approved ? 'approved' : 'rejected'} by ${approver.name}.`,
      data: {
        shiftDate: shift.date,
        shiftStart: shift.scheduledTimes.start,
        shiftEnd: shift.scheduledTimes.end,
        department: shift.department,
        position: shift.position
      }
    });
  }

  // Create break reminder notifications
  async createBreakReminders(shift) {
    const notifications = [];
    const shiftStartTime = new Date(shift.date);
    const [startHours, startMinutes] = shift.scheduledTimes.start.split(':');
    shiftStartTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
    
    // Calculate break times based on shift duration
    const shiftDuration = shift.scheduledDuration; // in hours
    
    // Break policy based on shift duration
    const breakPolicy = this.getBreakPolicy(shiftDuration);
    
    for (const breakInfo of breakPolicy) {
      const breakTime = new Date(shiftStartTime);
      breakTime.setMinutes(breakTime.getMinutes() + breakInfo.afterMinutes);
      
      // Create reminder 5 minutes before break time
      const reminderTime = new Date(breakTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 5);
      
      const notification = await ShiftNotification.create({
        tenantId: shift.tenantId,
        shift: shift._id,
        employee: shift.employee,
        type: 'break-reminder',
        priority: 'medium',
        channels: ['push', 'in-app'],
        scheduledFor: reminderTime,
        title: `${breakInfo.type} Break Coming Up`,
        message: `Your ${breakInfo.duration}-minute ${breakInfo.type.toLowerCase()} break is scheduled in 5 minutes. Please prepare to take your break.`,
        data: {
          shiftDate: shift.date,
          breakType: breakInfo.type,
          breakDuration: breakInfo.duration,
          suggestedBreakTime: breakTime.toISOString()
        }
      });
      
      notifications.push(notification);
    }
    
    return notifications;
  }
  
  // Get break policy based on shift duration
  getBreakPolicy(shiftDuration) {
    const breaks = [];
    
    if (shiftDuration >= 4 && shiftDuration < 6) {
      // 4-6 hour shift: 1 short break (15 minutes) after 2 hours
      breaks.push({
        type: 'Short',
        duration: 15,
        afterMinutes: 120
      });
    } else if (shiftDuration >= 6 && shiftDuration < 8) {
      // 6-8 hour shift: 1 meal break (30 minutes) after 3 hours
      breaks.push({
        type: 'Meal',
        duration: 30,
        afterMinutes: 180
      });
    } else if (shiftDuration >= 8 && shiftDuration < 10) {
      // 8-10 hour shift: 1 short break after 2 hours, 1 meal break after 4 hours
      breaks.push({
        type: 'Short',
        duration: 15,
        afterMinutes: 120
      });
      breaks.push({
        type: 'Meal',
        duration: 30,
        afterMinutes: 240
      });
    } else if (shiftDuration >= 10) {
      // 10+ hour shift: 2 short breaks and 1 meal break
      breaks.push({
        type: 'Short',
        duration: 15,
        afterMinutes: 120
      });
      breaks.push({
        type: 'Meal',
        duration: 30,
        afterMinutes: 240
      });
      breaks.push({
        type: 'Short',
        duration: 15,
        afterMinutes: 420
      });
    }
    
    return breaks;
  }

  // Create shift assignment notification
  async createShiftAssignmentNotification(shift) {
    return ShiftNotification.create({
      tenantId: shift.tenantId,
      shift: shift._id,
      employee: shift.employee,
      type: 'shift-assigned',
      priority: 'high',
      channels: ['push', 'email', 'in-app'],
      scheduledFor: new Date(), // Send immediately
      title: 'New Shift Assigned',
      message: `You have been assigned a ${shift.shiftType} shift on ${new Date(shift.date).toLocaleDateString()} from ${shift.scheduledTimes.start} to ${shift.scheduledTimes.end}.`,
      data: {
        shiftDate: shift.date,
        shiftStart: shift.scheduledTimes.start,
        shiftEnd: shift.scheduledTimes.end,
        department: shift.department,
        position: shift.position
      }
    });
  }

  // Create shift update notification
  async createShiftUpdateNotification(shift, changes) {
    const changeDescription = this.formatChanges(changes);
    
    return ShiftNotification.create({
      tenantId: shift.tenantId,
      shift: shift._id,
      employee: shift.employee,
      type: 'shift-updated',
      priority: 'high',
      channels: ['push', 'email', 'in-app'],
      scheduledFor: new Date(), // Send immediately
      title: 'Shift Updated',
      message: `Your ${shift.shiftType} shift on ${new Date(shift.date).toLocaleDateString()} has been updated. Changes: ${changeDescription}`,
      data: {
        shiftDate: shift.date,
        shiftStart: shift.scheduledTimes.start,
        shiftEnd: shift.scheduledTimes.end,
        department: shift.department,
        position: shift.position,
        customData: { changes }
      }
    });
  }

  // Create overtime warning notification
  async createOvertimeWarning(employee, currentHours, maxHours) {
    return ShiftNotification.create({
      tenantId: employee.tenantId,
      employee: employee._id,
      type: 'overtime-warning',
      priority: 'medium',
      channels: ['push', 'in-app'],
      scheduledFor: new Date(), // Send immediately
      title: 'Overtime Warning',
      message: `You have worked ${currentHours.toFixed(1)} hours this week. You are approaching the ${maxHours} hour weekly limit.`,
      data: {
        currentHours,
        maxHours,
        remainingHours: maxHours - currentHours
      }
    });
  }

  // Process the notification queue
  async processNotificationQueue() {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      // Get distinct tenant IDs from the database
      const Tenant = require('../models/Tenant');
      const activeTenants = await Tenant.find({ isActive: true }).select('_id');
      
      // Process notifications for each tenant separately
      for (const tenant of activeTenants) {
        try {
          // Process this tenant's notifications with explicit tenant context
          await this.processTenantNotifications(tenant._id);
        } catch (error) {
          console.error(`Error processing notifications for tenant ${tenant._id}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.processing = false;
    }
  }
  
  // Process notifications for a specific tenant
  async processTenantNotifications(tenantId) {
    try {
      // Find all pending notifications for this tenant
      const dueNotifications = await ShiftNotification.find({
        tenantId: tenantId,
        status: 'pending',
        scheduledFor: { $lte: new Date() },
        retryCount: { $lt: 3 }
      })
      .populate('employee')
      .populate('shift')
      .limit(50); // Process up to 50 at a time
      
      for (const notification of dueNotifications) {
        try {
          await this.sendNotification(notification);
        } catch (error) {
          console.error(`Error sending notification ${notification._id}:`, error);
          await notification.markAsFailed(error);
        }
      }
      
      // Retry failed notifications for this tenant
      await this.retryFailedNotifications(tenantId);
      
    } catch (error) {
      console.error(`Error processing tenant ${tenantId} notifications:`, error);
    }
  }

  // Send a notification through all configured channels
  async sendNotification(notification) {
    const employee = notification.employee;
    const results = {};
    
    // Send through each channel
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'push':
            if (employee.deviceTokens?.length > 0) {
              const pushResult = await pushNotificationService.sendToDevice(
                employee.deviceTokens,
                notification.title,
                notification.message,
                {
                  type: notification.type,
                  shiftId: notification.shift?._id,
                  notificationId: notification._id
                }
              );
              results.push = pushResult;
              notification.deliveryStatus.push = {
                sent: true,
                sentAt: new Date(),
                deviceTokens: employee.deviceTokens
              };
            }
            break;
            
          case 'email':
            if (employee.email) {
              const emailResult = await this.sendEmailNotification(notification, employee);
              results.email = emailResult;
              notification.deliveryStatus.email = {
                sent: emailResult.success,
                sentAt: new Date(),
                messageId: emailResult.messageId,
                error: emailResult.error
              };
            }
            break;
            
          case 'sms':
            if (employee.phone) {
              const smsResult = await this.sendSmsNotification(notification, employee);
              results.sms = smsResult;
              notification.deliveryStatus.sms = {
                sent: smsResult.success,
                sentAt: new Date(),
                messageId: smsResult.messageId,
                error: smsResult.error
              };
            }
            break;
            
          case 'in-app':
            await this.sendInAppNotification(notification, employee);
            results.inApp = { success: true };
            notification.deliveryStatus.inApp = {
              sent: true,
              sentAt: new Date()
            };
            break;
        }
      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
        notification.deliveryStatus[channel] = {
          sent: false,
          error: error.message
        };
      }
    }
    
    // Update notification status
    const anySent = Object.values(results).some(r => r?.success);
    if (anySent) {
      await notification.markAsSent();
    } else {
      await notification.markAsFailed(new Error('Failed to send through any channel'));
    }
    
    return results;
  }

  // Send email notification
  async sendEmailNotification(notification, employee) {
    try {
      // Try tenant-specific service first
      const tenantId = notification.tenantId || employee.tenantId;
      if (tenantId) {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ tenantId });
        
        if (settings?.email?.provider && settings.email.provider !== 'disabled') {
          // Use tenant-specific email service
          const html = `
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.data.shiftDate ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
                <h3>Shift Details:</h3>
                <p><strong>Date:</strong> ${new Date(notification.data.shiftDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${notification.data.shiftStart} - ${notification.data.shiftEnd}</p>
                ${notification.data.department ? `<p><strong>Department:</strong> ${notification.data.department}</p>` : ''}
                ${notification.data.position ? `<p><strong>Position:</strong> ${notification.data.position}</p>` : ''}
              </div>
            ` : ''}
          `;
          
          return await tenantEmailService.sendEmail(tenantId, {
            to: employee.email,
            subject: notification.title,
            html
          });
        }
      }
      
      // Fallback to default email service
      const emailContent = {
        to: employee.email,
        subject: notification.title,
        html: `
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          ${notification.data.shiftDate ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
              <h3>Shift Details:</h3>
              <p><strong>Date:</strong> ${new Date(notification.data.shiftDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${notification.data.shiftStart} - ${notification.data.shiftEnd}</p>
              ${notification.data.department ? `<p><strong>Department:</strong> ${notification.data.department}</p>` : ''}
              ${notification.data.position ? `<p><strong>Position:</strong> ${notification.data.position}</p>` : ''}
            </div>
          ` : ''}
        `
      };
      
      return emailService.sendEmail(emailContent);
    } catch (error) {
      console.error('Error sending email notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Send SMS notification
  async sendSmsNotification(notification, employee) {
    try {
      // Try tenant-specific service first
      const tenantId = notification.tenantId || employee.tenantId;
      if (tenantId) {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ tenantId });
        
        if (settings?.sms?.provider && settings.sms.provider !== 'disabled') {
          // Use tenant-specific SMS service
          return await tenantSmsService.sendSMS(tenantId, employee.phone, notification.message);
        }
      }
      
      // Fallback to default SMS service
      return await smsService.sendShiftNotification(employee.phone, notification.message);
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send in-app notification via Socket.io
  async sendInAppNotification(notification, employee) {
    const io = global.io;
    if (!io) return;
    
    const context = getCurrentTenant();
    const tenantId = notification.tenantId || context?.tenantId;
    
    // Send to specific employee
    io.of('/admin').to(`user-${employee._id}-${tenantId}`).emit('shift-notification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      data: notification.data,
      timestamp: new Date()
    });
    
    // Also send to managers for urgent notifications
    if (notification.priority === 'urgent') {
      io.of('/admin').to(`role-admin-${tenantId}`).emit('urgent-shift-notification', {
        employeeId: employee._id,
        employeeName: employee.name,
        notification: {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data
        }
      });
    }
  }

  // Retry failed notifications for a specific tenant
  async retryFailedNotifications(tenantId) {
    const failedNotifications = await ShiftNotification.find({
      tenantId: tenantId,
      status: 'failed',
      retryCount: { $lt: 3 },
      updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // Wait 5 minutes between retries
    })
    .populate('employee')
    .populate('shift')
    .limit(20);
    
    for (const notification of failedNotifications) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        console.error(`Error retrying notification ${notification._id}:`, error);
      }
    }
  }

  // Format changes for notification message
  formatChanges(changes) {
    const descriptions = [];
    
    if (changes.scheduledTimes) {
      descriptions.push(`Time changed to ${changes.scheduledTimes.start}-${changes.scheduledTimes.end}`);
    }
    if (changes.date) {
      descriptions.push(`Date changed to ${new Date(changes.date).toLocaleDateString()}`);
    }
    if (changes.department) {
      descriptions.push(`Department changed to ${changes.department}`);
    }
    if (changes.position) {
      descriptions.push(`Position changed to ${changes.position}`);
    }
    
    return descriptions.join(', ');
  }

  // Check for no-shows and send alerts
  async checkNoShows() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Find shifts that should have started but employee hasn't clocked in
    const noShowShifts = await Shift.find({
      status: 'scheduled',
      date: { $lte: new Date() },
      'actualTimes.clockIn': { $exists: false }
    }).populate('employee');
    
    for (const shift of noShowShifts) {
      const shiftStartTime = new Date(shift.date);
      const [hours, minutes] = shift.scheduledTimes.start.split(':');
      shiftStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (shiftStartTime <= fifteenMinutesAgo) {
        // Check if we already sent a no-show warning
        const existingWarning = await ShiftNotification.findOne({
          shift: shift._id,
          type: 'no-show-warning',
          createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Within last hour
        });
        
        if (!existingWarning) {
          await this.createNoShowWarning(shift);
          
          // Also notify managers
          await this.notifyManagersOfNoShow(shift);
        }
      }
    }
  }

  // Notify managers of no-show
  async notifyManagersOfNoShow(shift) {
    const managers = await User.find({
      tenantId: shift.tenantId,
      role: { $in: ['admin', 'manager'] },
      isActive: true
    });
    
    for (const manager of managers) {
      await ShiftNotification.create({
        tenantId: shift.tenantId,
        shift: shift._id,
        employee: manager._id,
        type: 'no-show-alert',
        priority: 'urgent',
        channels: ['push', 'in-app'],
        scheduledFor: new Date(),
        title: 'Employee No-Show Alert',
        message: `${shift.employee.name} has not clocked in for their ${shift.shiftType} shift that started at ${shift.scheduledTimes.start}.`,
        data: {
          employeeId: shift.employee._id,
          employeeName: shift.employee.name,
          shiftDate: shift.date,
          shiftStart: shift.scheduledTimes.start,
          department: shift.department
        }
      });
    }
  }

  // Get notification preferences for an employee
  async getNotificationPreferences(employeeId) {
    const employee = await User.findById(employeeId).lean();
    return {
      push: employee.notificationPreferences?.push ?? true,
      email: employee.notificationPreferences?.email ?? true,
      sms: employee.notificationPreferences?.sms ?? false,
      inApp: employee.notificationPreferences?.inApp ?? true,
      reminderTimes: employee.notificationPreferences?.reminderTimes ?? [60, 30, 15]
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(employeeId, preferences) {
    return User.findByIdAndUpdate(
      employeeId,
      { notificationPreferences: preferences },
      { new: true }
    );
  }
}

module.exports = new ShiftNotificationService();