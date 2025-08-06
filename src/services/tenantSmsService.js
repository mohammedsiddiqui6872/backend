const Settings = require('../models/Settings');
const { decrypt } = require('../models/Settings');

class TenantSmsService {
  constructor() {
    this.clients = new Map(); // Cache SMS clients per tenant
  }

  async getClient(tenantId) {
    // Check cache first
    if (this.clients.has(tenantId)) {
      return this.clients.get(tenantId);
    }

    // Get tenant settings
    const settings = await Settings.findOne({ tenantId });
    if (!settings || !settings.sms || settings.sms.provider === 'disabled') {
      throw new Error('SMS service not configured for this tenant');
    }

    let client;
    const smsConfig = settings.sms;

    switch (smsConfig.provider) {
      case 'twilio':
        const twilio = require('twilio');
        const accountSid = decrypt(smsConfig.twilio.accountSid);
        const authToken = decrypt(smsConfig.twilio.authToken);
        
        if (!accountSid || !authToken) {
          throw new Error('Twilio credentials not properly configured');
        }
        
        client = {
          provider: 'twilio',
          client: twilio(accountSid, authToken),
          fromNumber: smsConfig.twilio.phoneNumber,
          messagingServiceSid: smsConfig.twilio.messagingServiceSid
        };
        break;

      case 'nexmo':
        const Nexmo = require('nexmo');
        client = {
          provider: 'nexmo',
          client: new Nexmo({
            apiKey: decrypt(smsConfig.nexmo.apiKey),
            apiSecret: decrypt(smsConfig.nexmo.apiSecret)
          }),
          from: smsConfig.nexmo.from
        };
        break;

      case 'messagebird':
        const messagebird = require('messagebird');
        client = {
          provider: 'messagebird',
          client: messagebird(decrypt(smsConfig.messagebird.accessKey)),
          originator: smsConfig.messagebird.originator
        };
        break;

      default:
        throw new Error(`Unsupported SMS provider: ${smsConfig.provider}`);
    }

    // Cache the client
    this.clients.set(tenantId, client);

    // Clear cache after 5 minutes to allow for settings changes
    setTimeout(() => {
      this.clients.delete(tenantId);
    }, 5 * 60 * 1000);

    return client;
  }

  formatPhoneNumber(phoneNumber, settings) {
    if (!phoneNumber) return null;
    
    // Remove any non-digit characters except +
    phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add country code if not present
    if (!phoneNumber.startsWith('+')) {
      const defaultCode = settings?.sms?.preferences?.defaultCountryCode || '+971';
      phoneNumber = defaultCode + phoneNumber.replace(/^0+/, '');
    }
    
    return phoneNumber;
  }

  async sendSMS(tenantId, phoneNumber, message) {
    try {
      const settings = await Settings.findOne({ tenantId });
      const clientConfig = await this.getClient(tenantId);
      const formattedPhone = this.formatPhoneNumber(phoneNumber, settings);
      
      if (!formattedPhone) {
        return { success: false, error: 'Invalid phone number' };
      }

      let result;
      
      switch (clientConfig.provider) {
        case 'twilio':
          const twilioMessage = await clientConfig.client.messages.create({
            body: message,
            ...(clientConfig.messagingServiceSid 
              ? { messagingServiceSid: clientConfig.messagingServiceSid }
              : { from: clientConfig.fromNumber }),
            to: formattedPhone
          });
          result = { success: true, messageId: twilioMessage.sid };
          break;

        case 'nexmo':
          result = await new Promise((resolve, reject) => {
            clientConfig.client.message.sendSms(
              clientConfig.from,
              formattedPhone,
              message,
              (err, responseData) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({ 
                    success: true, 
                    messageId: responseData.messages[0]['message-id'] 
                  });
                }
              }
            );
          });
          break;

        case 'messagebird':
          const mbMessage = await clientConfig.client.messages.create({
            originator: clientConfig.originator,
            recipients: [formattedPhone],
            body: message
          });
          result = { success: true, messageId: mbMessage.id };
          break;
      }

      console.log(`SMS sent for tenant ${tenantId}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`SMS send error for tenant ${tenantId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendTestSMS(tenantId, testPhone) {
    const settings = await Settings.findOne({ tenantId });
    const message = `Test SMS from ${settings?.general?.restaurantName || 'Restaurant'}. Your SMS configuration is working correctly! Sent at ${new Date().toLocaleTimeString()}`;
    
    return this.sendSMS(tenantId, testPhone, message);
  }

  async sendOrderConfirmation(tenantId, phoneNumber, order) {
    const settings = await Settings.findOne({ tenantId });
    if (!settings?.sms?.preferences?.enableOrderConfirmations) {
      return { success: false, error: 'Order confirmations disabled' };
    }

    const message = `Your order ${order.orderNumber} has been confirmed! Total: ${settings.general?.currencySymbol || 'AED'} ${order.total}. Estimated time: ${settings.orders?.estimatedPrepTime || 30} mins.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendOrderReady(tenantId, phoneNumber, orderNumber) {
    const settings = await Settings.findOne({ tenantId });
    const message = `Your order ${orderNumber} is ready for pickup! Thank you for choosing ${settings?.general?.restaurantName || 'us'}.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendTableReady(tenantId, phoneNumber, partyName) {
    const settings = await Settings.findOne({ tenantId });
    const message = `${partyName}, your table at ${settings?.general?.restaurantName || 'the restaurant'} is ready! Please proceed to the host stand.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendOTP(tenantId, phoneNumber, otp) {
    const settings = await Settings.findOne({ tenantId });
    if (!settings?.sms?.preferences?.enableOTP) {
      return { success: false, error: 'OTP service disabled' };
    }

    const message = `Your verification code for ${settings?.general?.restaurantName || 'Restaurant'} is: ${otp}. Valid for 5 minutes.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendShiftReminder(tenantId, phoneNumber, shift, minutesBefore) {
    const settings = await Settings.findOne({ tenantId });
    if (!settings?.sms?.preferences?.enableShiftReminders) {
      return { success: false, error: 'Shift reminders disabled' };
    }

    const message = `Shift Reminder: Your ${shift.shiftType} shift starts in ${minutesBefore} minutes at ${shift.scheduledTimes.start}. Please clock in on time.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendBreakReminder(tenantId, phoneNumber, breakType, breakDuration) {
    const message = `Break Reminder: Time for your ${breakDuration}-minute ${breakType} break. Please take your scheduled break.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendNoShowAlert(tenantId, phoneNumber, employeeName, shiftDetails) {
    const message = `Alert: ${employeeName} has not clocked in for their ${shiftDetails.shiftType} shift that started at ${shiftDetails.startTime}. Please check in immediately.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendSwapRequest(tenantId, phoneNumber, requesterName, shiftDetails) {
    const message = `Shift Swap Request: ${requesterName} wants to swap their ${shiftDetails.date} shift (${shiftDetails.startTime}-${shiftDetails.endTime}). Login to approve/reject.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  async sendOvertimeWarning(tenantId, phoneNumber, currentHours, maxHours) {
    const remainingHours = (maxHours - currentHours).toFixed(1);
    const message = `Overtime Warning: You've worked ${currentHours.toFixed(1)} hours this week. Only ${remainingHours} hours remaining before overtime limit.`;
    
    return this.sendSMS(tenantId, phoneNumber, message);
  }

  // Clear cache for a specific tenant (called when settings are updated)
  clearCache(tenantId) {
    if (this.clients.has(tenantId)) {
      this.clients.delete(tenantId);
    }
  }

  // Clear all cached clients
  clearAllCache() {
    this.clients.clear();
  }
}

module.exports = new TenantSmsService();