const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const { decrypt } = require('../models/Settings');

class TenantEmailService {
  constructor() {
    this.transporters = new Map(); // Cache transporters per tenant
  }

  async getTransporter(tenantId) {
    // Check cache first
    if (this.transporters.has(tenantId)) {
      return this.transporters.get(tenantId);
    }

    // Get tenant settings
    const settings = await Settings.findOne({ tenantId });
    if (!settings || !settings.email || settings.email.provider === 'disabled') {
      throw new Error('Email service not configured for this tenant');
    }

    let transporter;
    const emailConfig = settings.email;

    switch (emailConfig.provider) {
      case 'smtp':
        const smtpConfig = emailConfig.smtp;
        transporter = nodemailer.createTransporter({
          host: smtpConfig.host,
          port: smtpConfig.port || 587,
          secure: smtpConfig.secure || false,
          auth: {
            user: smtpConfig.username,
            pass: decrypt(smtpConfig.password)
          }
        });
        break;

      case 'sendgrid':
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(decrypt(emailConfig.sendgrid.apiKey));
        // Create a wrapper for SendGrid to match nodemailer interface
        transporter = {
          sendMail: async (mailOptions) => {
            const msg = {
              to: mailOptions.to,
              from: mailOptions.from || emailConfig.sendgrid.fromEmail,
              subject: mailOptions.subject,
              text: mailOptions.text,
              html: mailOptions.html
            };
            const result = await sgMail.send(msg);
            return { messageId: result[0].headers['x-message-id'] };
          }
        };
        break;

      case 'mailgun':
        const mailgun = require('mailgun-js');
        const mg = mailgun({
          apiKey: decrypt(emailConfig.mailgun.apiKey),
          domain: emailConfig.mailgun.domain,
          host: emailConfig.mailgun.region === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net'
        });
        // Create a wrapper for Mailgun
        transporter = {
          sendMail: async (mailOptions) => {
            const data = {
              from: mailOptions.from || emailConfig.mailgun.fromEmail,
              to: mailOptions.to,
              subject: mailOptions.subject,
              text: mailOptions.text,
              html: mailOptions.html
            };
            const result = await mg.messages().send(data);
            return { messageId: result.id };
          }
        };
        break;

      case 'ses':
        const AWS = require('aws-sdk');
        const ses = new AWS.SES({
          accessKeyId: decrypt(emailConfig.ses.accessKeyId),
          secretAccessKey: decrypt(emailConfig.ses.secretAccessKey),
          region: emailConfig.ses.region
        });
        transporter = nodemailer.createTransporter({
          SES: ses
        });
        break;

      default:
        throw new Error(`Unsupported email provider: ${emailConfig.provider}`);
    }

    // Cache the transporter
    this.transporters.set(tenantId, transporter);

    // Clear cache after 5 minutes to allow for settings changes
    setTimeout(() => {
      this.transporters.delete(tenantId);
    }, 5 * 60 * 1000);

    return transporter;
  }

  async sendEmail(tenantId, options) {
    try {
      const transporter = await this.getTransporter(tenantId);
      const settings = await Settings.findOne({ tenantId });
      
      // Get from address based on provider
      let fromAddress;
      switch (settings.email.provider) {
        case 'smtp':
          fromAddress = `"${settings.email.smtp.fromName || settings.general?.restaurantName || 'Restaurant'}" <${settings.email.smtp.fromEmail}>`;
          break;
        case 'sendgrid':
          fromAddress = `"${settings.email.sendgrid.fromName || settings.general?.restaurantName || 'Restaurant'}" <${settings.email.sendgrid.fromEmail}>`;
          break;
        case 'mailgun':
          fromAddress = `"${settings.email.mailgun.fromName || settings.general?.restaurantName || 'Restaurant'}" <${settings.email.mailgun.fromEmail}>`;
          break;
        case 'ses':
          fromAddress = `"${settings.email.ses.fromName || settings.general?.restaurantName || 'Restaurant'}" <${settings.email.ses.fromEmail}>`;
          break;
      }

      const mailOptions = {
        from: options.from || fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent for tenant ${tenantId}:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Email send error for tenant ${tenantId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(tenantId, testEmail) {
    const html = `
      <h2>Test Email</h2>
      <p>This is a test email from your restaurant management system.</p>
      <p>If you're receiving this email, your email configuration is working correctly!</p>
      <hr>
      <p><small>Tenant ID: ${tenantId}</small></p>
      <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
    `;

    return this.sendEmail(tenantId, {
      to: testEmail,
      subject: 'Test Email - Configuration Successful',
      html
    });
  }

  async sendOrderConfirmation(tenantId, order, customerEmail) {
    const settings = await Settings.findOne({ tenantId });
    if (!settings?.email?.preferences?.enableOrderConfirmations) {
      return { success: false, error: 'Order confirmations disabled' };
    }

    const html = `
      <h2>Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Order Number: <strong>${order.orderNumber}</strong></p>
      <p>Total: <strong>${settings.general?.currencySymbol || 'AED'} ${order.total}</strong></p>
      <p>Estimated Time: ${settings.orders?.estimatedPrepTime || 30} minutes</p>
    `;

    return this.sendEmail(tenantId, {
      to: customerEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html
    });
  }

  async sendShiftReminder(tenantId, employee, shift, minutesBefore) {
    const settings = await Settings.findOne({ tenantId });
    if (!settings?.email?.preferences?.enableShiftReminders) {
      return { success: false, error: 'Shift reminders disabled' };
    }

    const shiftTime = new Date(shift.date);
    const [hours, minutes] = shift.scheduledTimes.start.split(':');
    shiftTime.setHours(parseInt(hours), parseInt(minutes));

    const html = `
      <h2>Shift Reminder</h2>
      <p>Hi ${employee.name},</p>
      <p>This is a reminder that your shift starts in ${minutesBefore} minutes.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Shift Details:</h3>
        <p><strong>Date:</strong> ${new Date(shift.date).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${shift.scheduledTimes.start} - ${shift.scheduledTimes.end}</p>
        <p><strong>Type:</strong> ${shift.shiftType}</p>
        ${shift.department ? `<p><strong>Department:</strong> ${shift.department}</p>` : ''}
        ${shift.position ? `<p><strong>Position:</strong> ${shift.position}</p>` : ''}
      </div>
      <p>Please make sure to clock in on time.</p>
      <hr>
      <p><small>${settings.general?.restaurantName || 'Restaurant'}</small></p>
    `;

    return this.sendEmail(tenantId, {
      to: employee.email,
      subject: `Shift Reminder - Starting in ${minutesBefore} minutes`,
      html
    });
  }

  async sendBreakReminder(tenantId, employee, breakType, breakDuration) {
    const settings = await Settings.findOne({ tenantId });
    
    const html = `
      <h2>Break Reminder</h2>
      <p>Hi ${employee.name},</p>
      <p>It's time for your ${breakDuration}-minute ${breakType} break.</p>
      <p>Please take your break to ensure you stay refreshed and comply with labor regulations.</p>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Break Duration:</strong> ${breakDuration} minutes</p>
        <p><strong>Type:</strong> ${breakType}</p>
      </div>
      <hr>
      <p><small>${settings.general?.restaurantName || 'Restaurant'}</small></p>
    `;

    return this.sendEmail(tenantId, {
      to: employee.email,
      subject: `Break Reminder - ${breakType} Break`,
      html
    });
  }

  async sendPasswordReset(tenantId, user, resetToken) {
    const settings = await Settings.findOne({ tenantId });
    const resetUrl = `${process.env.FRONTEND_URL || 'https://portal.gritservices.ae'}/reset-password?token=${resetToken}`;
    
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: ${settings.general?.primaryColor || '#7c3aed'}; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr>
      <p><small>${settings.general?.restaurantName || 'Restaurant'}</small></p>
    `;

    return this.sendEmail(tenantId, {
      to: user.email,
      subject: 'Password Reset Request',
      html
    });
  }

  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }

  // Clear cache for a specific tenant (called when settings are updated)
  clearCache(tenantId) {
    if (this.transporters.has(tenantId)) {
      this.transporters.delete(tenantId);
    }
  }

  // Clear all cached transporters
  clearAllCache() {
    this.transporters.clear();
  }
}

module.exports = new TenantEmailService();