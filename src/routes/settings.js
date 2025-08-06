const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { authenticate } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');

// Get current tenant settings
router.get('/', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    let settings = await Settings.findOne({ tenantId: req.tenant.tenantId });
    
    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        tenantId: req.tenant.tenantId,
        general: {
          restaurantName: req.tenant.name || 'Restaurant',
          timezone: 'Asia/Dubai',
          currency: 'AED',
          language: 'en'
        }
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

// Update general settings
router.put('/general', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        general: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.general,
      message: 'General settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating general settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating general settings',
      error: error.message
    });
  }
});

// Update business settings
router.put('/business', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        business: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.business,
      message: 'Business settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating business settings',
      error: error.message
    });
  }
});

// Update email settings
router.put('/email', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    // Validate email configuration
    const { provider } = req.body;
    if (provider !== 'disabled') {
      if (provider === 'smtp' && (!req.body.smtp?.host || !req.body.smtp?.username)) {
        return res.status(400).json({
          success: false,
          message: 'SMTP host and username are required'
        });
      }
      if (provider === 'sendgrid' && !req.body.sendgrid?.apiKey) {
        return res.status(400).json({
          success: false,
          message: 'SendGrid API key is required'
        });
      }
    }
    
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        email: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.email,
      message: 'Email settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating email settings',
      error: error.message
    });
  }
});

// Test email configuration
router.post('/email/test', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { testEmail } = req.body;
    const settings = await Settings.findOne({ tenantId: req.tenant.tenantId });
    
    if (!settings || settings.email?.provider === 'disabled') {
      return res.status(400).json({
        success: false,
        message: 'Email service is not configured'
      });
    }
    
    // Get tenant-specific email service
    const emailService = require('../services/tenantEmailService');
    const result = await emailService.sendTestEmail(req.tenant.tenantId, testEmail);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      error: result.error
    });
  } catch (error) {
    console.error('Error testing email:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing email configuration',
      error: error.message
    });
  }
});

// Update SMS settings
router.put('/sms', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    // Validate SMS configuration
    const { provider } = req.body;
    if (provider !== 'disabled') {
      if (provider === 'twilio' && (!req.body.twilio?.accountSid || !req.body.twilio?.authToken)) {
        return res.status(400).json({
          success: false,
          message: 'Twilio account SID and auth token are required'
        });
      }
    }
    
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        sms: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.sms,
      message: 'SMS settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating SMS settings',
      error: error.message
    });
  }
});

// Test SMS configuration
router.post('/sms/test', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { testPhone } = req.body;
    const settings = await Settings.findOne({ tenantId: req.tenant.tenantId });
    
    if (!settings || settings.sms?.provider === 'disabled') {
      return res.status(400).json({
        success: false,
        message: 'SMS service is not configured'
      });
    }
    
    // Get tenant-specific SMS service
    const smsService = require('../services/tenantSmsService');
    const result = await smsService.sendTestSMS(req.tenant.tenantId, testPhone);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
      error: result.error
    });
  } catch (error) {
    console.error('Error testing SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing SMS configuration',
      error: error.message
    });
  }
});

// Update push notification settings
router.put('/push', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        push: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.push,
      message: 'Push notification settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating push settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating push notification settings',
      error: error.message
    });
  }
});

// Update payment settings
router.put('/payment', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        payment: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.payment,
      message: 'Payment settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment settings',
      error: error.message
    });
  }
});

// Update order settings
router.put('/orders', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        orders: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.orders,
      message: 'Order settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating order settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order settings',
      error: error.message
    });
  }
});

// Update table settings
router.put('/tables', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        tables: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.tables,
      message: 'Table settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating table settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating table settings',
      error: error.message
    });
  }
});

// Update staff settings
router.put('/staff', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        staff: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.staff,
      message: 'Staff settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating staff settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating staff settings',
      error: error.message
    });
  }
});

// Update integration settings
router.put('/integrations', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        integrations: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.integrations,
      message: 'Integration settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating integration settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating integration settings',
      error: error.message
    });
  }
});

// Update security settings
router.put('/security', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    // Only admins can update security settings
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update security settings'
      });
    }
    
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        security: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.security,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating security settings',
      error: error.message
    });
  }
});

// Update feature flags
router.put('/features', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        features: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.features,
      message: 'Feature flags updated successfully'
    });
  } catch (error) {
    console.error('Error updating feature flags:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating feature flags',
      error: error.message
    });
  }
});

// Update backup settings
router.put('/backup', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        backup: req.body,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings.backup,
      message: 'Backup settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating backup settings',
      error: error.message
    });
  }
});

// Reset settings to default
router.post('/reset/:section', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    // Only admins can reset settings
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can reset settings'
      });
    }
    
    const { section } = req.params;
    const validSections = ['general', 'business', 'email', 'sms', 'push', 'payment', 
                          'orders', 'tables', 'staff', 'integrations', 'security', 
                          'features', 'backup'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings section'
      });
    }
    
    // Get default values from schema
    const defaultSettings = new Settings();
    const defaultValue = defaultSettings[section];
    
    const settings = await Settings.findOneAndUpdate(
      { tenantId: req.tenant.tenantId },
      { 
        [section]: defaultValue,
        lastModifiedBy: req.user._id,
        lastModifiedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      data: settings[section],
      message: `${section} settings reset to default`
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting settings',
      error: error.message
    });
  }
});

module.exports = router;