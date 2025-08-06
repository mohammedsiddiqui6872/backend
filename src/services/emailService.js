// src/services/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email service: Missing credentials. Email functionality disabled.');
      this.transporter = null;
      return;
    }
    
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service error:', error);
        this.transporter = null; // Disable on error
      } else {
        console.log('Email service ready');
      }
    });
  }

  async sendOrderConfirmation(order, customerEmail) {
    if (!this.transporter) {
      console.log('Email service disabled - skipping order confirmation email');
      return { success: false, error: 'Email service not configured' };
    }
    
    const template = await this.loadTemplate('orderConfirmation');
    const html = this.processTemplate(template, {
      orderNumber: order.orderNumber,
      customerName: order.customerName || 'Valued Customer',
      items: order.items,
      total: order.total,
      estimatedTime: '30-45 minutes'
    });

    const mailOptions = {
      from: `"${process.env.RESTAURANT_NAME || 'Bella Vista'}" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: html,
      text: this.stripHtml(html)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Order confirmation sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendReservationConfirmation(reservation) {
    if (!this.transporter) {
      console.log('Email service disabled - skipping reservation confirmation email');
      return { success: false, error: 'Email service not configured' };
    }
    
    const template = await this.loadTemplate('reservationConfirmation');
    const html = this.processTemplate(template, reservation);

    const mailOptions = {
      from: `"${process.env.RESTAURANT_NAME || 'Bella Vista'}" <${process.env.EMAIL_USER}>`,
      to: reservation.email,
      subject: `Reservation Confirmation - ${reservation.date}`,
      html: html,
      text: this.stripHtml(html)
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordReset(user, resetToken) {
    if (!this.transporter) {
      console.log('Email service disabled - cannot send password reset email');
      return { success: false, error: 'Email service not configured' };
    }
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"${process.env.RESTAURANT_NAME || 'Bella Vista'}" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  // Send shift notification emails
  async sendShiftNotification(email, subject, content) {
    const mailOptions = {
      from: `"${process.env.RESTAURANT_NAME || 'GRIT Services'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: content.html || content,
      text: content.text || this.stripHtml(content.html || content)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Shift notification sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending shift notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send shift reminder email
  async sendShiftReminder(employee, shift, minutesBefore) {
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
    `;

    return this.sendShiftNotification(
      employee.email,
      `Shift Reminder - Starting in ${minutesBefore} minutes`,
      { html }
    );
  }

  // Send break reminder email
  async sendBreakReminder(employee, breakType, breakDuration) {
    const html = `
      <h2>Break Reminder</h2>
      <p>Hi ${employee.name},</p>
      <p>It's time for your ${breakDuration}-minute ${breakType} break.</p>
      <p>Please take your break to ensure you stay refreshed and comply with labor regulations.</p>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Break Duration:</strong> ${breakDuration} minutes</p>
        <p><strong>Type:</strong> ${breakType}</p>
      </div>
    `;

    return this.sendShiftNotification(
      employee.email,
      `Break Reminder - ${breakType} Break`,
      { html }
    );
  }

  // Send general email
  async sendEmail(options) {
    const mailOptions = {
      from: options.from || `"${process.env.RESTAURANT_NAME || 'GRIT Services'}" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || this.stripHtml(options.html)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDailyReport(reportData) {
    const template = await this.loadTemplate('dailyReport');
    const html = this.processTemplate(template, reportData);

    const mailOptions = {
      from: `"${process.env.RESTAURANT_NAME || 'Bella Vista'}" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `Daily Report - ${new Date().toLocaleDateString()}`,
      html: html,
      attachments: reportData.attachments || []
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.html`);
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      // Return a default template if file not found
      return this.getDefaultTemplate(templateName);
    }
  }

  processTemplate(template, data) {
    let processed = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, data[key]);
    });
    return processed;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  getDefaultTemplate(templateName) {
    const templates = {
      orderConfirmation: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f4f4f4; }
            .footer { text-align: center; padding: 20px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <h2>Thank you for your order!</h2>
              <p>Order Number: <strong>{{orderNumber}}</strong></p>
              <p>Dear {{customerName}},</p>
              <p>Your order has been confirmed and is being prepared.</p>
              <p>Estimated preparation time: {{estimatedTime}}</p>
              <p>Total: <strong>AED {{total}}</strong></p>
            </div>
            <div class="footer">
              <p>Thank you for choosing Bella Vista!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      reservationConfirmation: `
        <h2>Reservation Confirmed</h2>
        <p>Your reservation has been confirmed for {{date}} at {{time}}.</p>
        <p>Party size: {{partySize}}</p>
        <p>We look forward to seeing you!</p>
      `,
      dailyReport: `
        <h2>Daily Report</h2>
        <p>Total Orders: {{totalOrders}}</p>
        <p>Total Revenue: AED {{totalRevenue}}</p>
        <p>Average Order Value: AED {{averageOrderValue}}</p>
      `
    };

    return templates[templateName] || '<p>Template not found</p>';
  }
}

module.exports = new EmailService();