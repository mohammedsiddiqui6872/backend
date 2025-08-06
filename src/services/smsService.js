// src/services/smsService.js
const twilio = require('twilio');

class SMSService {
  constructor() {
    // Check if Twilio credentials are valid
    if (
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
      process.env.TWILIO_ACCOUNT_SID.length > 2
    ) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
        this.enabled = true;
        console.log('SMS service initialized');
      } catch (error) {
        this.enabled = false;
        console.log('SMS service disabled - Invalid Twilio credentials');
      }
    } else {
      this.enabled = false;
      console.log('SMS service disabled - Twilio credentials not configured');
    }
  }

  async sendOrderConfirmation(phoneNumber, order) {
    if (!this.enabled) {
      console.log('SMS service disabled, skipping order confirmation');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const message = await this.client.messages.create({
        body: `Your order ${order.orderNumber} has been confirmed! Estimated time: 30-45 mins. Total: AED ${order.total}`,
        from: this.fromNumber,
        to: phoneNumber
      });

      console.log('SMS sent:', message.sid);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendOrderReady(phoneNumber, orderNumber) {
    if (!this.enabled) return { success: false };

    try {
      const message = await this.client.messages.create({
        body: `Your order ${orderNumber} is ready for pickup! Thank you for your patience.`,
        from: this.fromNumber,
        to: phoneNumber
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTableReady(phoneNumber, partyName) {
    if (!this.enabled) return { success: false };

    try {
      const message = await this.client.messages.create({
        body: `${partyName}, your table is ready! Please proceed to the host stand.`,
        from: this.fromNumber,
        to: phoneNumber
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(phoneNumber, otp) {
    if (!this.enabled) return { success: false };

    try {
      const message = await this.client.messages.create({
        body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
        from: this.fromNumber,
        to: phoneNumber
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send shift notification via SMS
  async sendShiftNotification(phoneNumber, message) {
    if (!this.enabled) {
      console.log('SMS service disabled, skipping shift notification');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const smsMessage = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log('Shift SMS sent:', smsMessage.sid);
      return { success: true, messageId: smsMessage.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send shift reminder SMS
  async sendShiftReminder(phoneNumber, shift, minutesBefore) {
    if (!this.enabled) return { success: false, error: 'SMS service not configured' };

    const message = `Shift Reminder: Your ${shift.shiftType} shift starts in ${minutesBefore} minutes at ${shift.scheduledTimes.start}. Please clock in on time.`;
    
    return this.sendShiftNotification(phoneNumber, message);
  }

  // Send break reminder SMS
  async sendBreakReminder(phoneNumber, breakType, breakDuration) {
    if (!this.enabled) return { success: false, error: 'SMS service not configured' };

    const message = `Break Reminder: Time for your ${breakDuration}-minute ${breakType} break. Please take your scheduled break.`;
    
    return this.sendShiftNotification(phoneNumber, message);
  }

  // Send no-show alert SMS
  async sendNoShowAlert(phoneNumber, employeeName, shiftDetails) {
    if (!this.enabled) return { success: false, error: 'SMS service not configured' };

    const message = `Alert: ${employeeName} has not clocked in for their ${shiftDetails.shiftType} shift that started at ${shiftDetails.startTime}. Please check in immediately.`;
    
    return this.sendShiftNotification(phoneNumber, message);
  }

  // Send shift swap request SMS
  async sendSwapRequest(phoneNumber, requesterName, shiftDetails) {
    if (!this.enabled) return { success: false, error: 'SMS service not configured' };

    const message = `Shift Swap Request: ${requesterName} wants to swap their ${shiftDetails.date} shift (${shiftDetails.startTime}-${shiftDetails.endTime}). Reply to approve/reject.`;
    
    return this.sendShiftNotification(phoneNumber, message);
  }

  // Send overtime warning SMS
  async sendOvertimeWarning(phoneNumber, currentHours, maxHours) {
    if (!this.enabled) return { success: false, error: 'SMS service not configured' };

    const remainingHours = (maxHours - currentHours).toFixed(1);
    const message = `Overtime Warning: You've worked ${currentHours.toFixed(1)} hours this week. Only ${remainingHours} hours remaining before overtime limit.`;
    
    return this.sendShiftNotification(phoneNumber, message);
  }

  formatPhoneNumber(phoneNumber) {
    // Ensure phone number has country code
    if (!phoneNumber.startsWith('+')) {
      // Default to UAE country code
      return `+971${phoneNumber.replace(/^0+/, '')}`;
    }
    return phoneNumber;
  }
}

module.exports = new SMSService();