const mongoose = require('mongoose');
const crypto = require('crypto');
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

// Encryption helper functions
const algorithm = 'aes-256-gcm';
const getKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';
  return crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);
};

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(getKey()), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(getKey()), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

const settingsSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    default: function() {
      const context = getCurrentTenant();
      return context?.tenantId;
    }
  },

  // General Settings
  general: {
    restaurantName: String,
    tagline: String,
    logo: String,
    favicon: String,
    primaryColor: { type: String, default: '#7c3aed' },
    secondaryColor: { type: String, default: '#6d28d9' },
    timezone: { type: String, default: 'Asia/Dubai' },
    currency: { type: String, default: 'AED' },
    currencySymbol: { type: String, default: 'AED' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '24h' },
    language: { type: String, default: 'en' },
    supportedLanguages: { type: [String], default: ['en', 'ar'] }
  },

  // Business Settings
  business: {
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    phone: String,
    email: String,
    website: String,
    taxNumber: String,
    registrationNumber: String,
    vatRate: { type: Number, default: 5 },
    serviceChargeRate: { type: Number, default: 0 },
    operatingHours: [{
      day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
      open: String, // Format: "HH:MM"
      close: String, // Format: "HH:MM"
      isClosed: { type: Boolean, default: false }
    }],
    holidays: [{
      date: Date,
      name: String,
      isClosed: { type: Boolean, default: true }
    }]
  },

  // Email Settings (Encrypted)
  email: {
    provider: { type: String, enum: ['smtp', 'sendgrid', 'mailgun', 'ses', 'disabled'], default: 'disabled' },
    
    // SMTP Settings
    smtp: {
      host: String,
      port: Number,
      secure: Boolean,
      username: String,
      password: String, // Will be encrypted
      fromEmail: String,
      fromName: String
    },
    
    // SendGrid Settings
    sendgrid: {
      apiKey: String, // Will be encrypted
      fromEmail: String,
      fromName: String,
      templateIds: {
        orderConfirmation: String,
        shiftReminder: String,
        passwordReset: String
      }
    },
    
    // Mailgun Settings
    mailgun: {
      apiKey: String, // Will be encrypted
      domain: String,
      fromEmail: String,
      fromName: String,
      region: { type: String, enum: ['us', 'eu'], default: 'us' }
    },
    
    // AWS SES Settings
    ses: {
      accessKeyId: String, // Will be encrypted
      secretAccessKey: String, // Will be encrypted
      region: String,
      fromEmail: String,
      fromName: String
    },
    
    // Email Preferences
    preferences: {
      enableOrderConfirmations: { type: Boolean, default: true },
      enableShiftReminders: { type: Boolean, default: true },
      enableMarketingEmails: { type: Boolean, default: false },
      enableDailyReports: { type: Boolean, default: true },
      dailyReportTime: { type: String, default: '09:00' },
      reportRecipients: [String]
    }
  },

  // SMS Settings (Encrypted)
  sms: {
    provider: { type: String, enum: ['twilio', 'nexmo', 'messagebird', 'disabled'], default: 'disabled' },
    
    // Twilio Settings
    twilio: {
      accountSid: String, // Will be encrypted
      authToken: String, // Will be encrypted
      phoneNumber: String,
      messagingServiceSid: String
    },
    
    // Nexmo/Vonage Settings
    nexmo: {
      apiKey: String, // Will be encrypted
      apiSecret: String, // Will be encrypted
      from: String
    },
    
    // MessageBird Settings
    messagebird: {
      accessKey: String, // Will be encrypted
      originator: String
    },
    
    // SMS Preferences
    preferences: {
      enableOrderConfirmations: { type: Boolean, default: false },
      enableShiftReminders: { type: Boolean, default: false },
      enableMarketingSMS: { type: Boolean, default: false },
      enableOTP: { type: Boolean, default: true },
      internationalFormat: { type: Boolean, default: true },
      defaultCountryCode: { type: String, default: '+971' }
    }
  },

  // Push Notification Settings (Encrypted)
  push: {
    provider: { type: String, enum: ['firebase', 'onesignal', 'disabled'], default: 'disabled' },
    
    // Firebase Settings
    firebase: {
      projectId: String,
      privateKey: String, // Will be encrypted
      clientEmail: String,
      databaseURL: String,
      serviceAccount: String // Full service account JSON, encrypted
    },
    
    // OneSignal Settings
    onesignal: {
      appId: String,
      apiKey: String, // Will be encrypted
      userAuthKey: String // Will be encrypted
    },
    
    // Push Preferences
    preferences: {
      enableOrderUpdates: { type: Boolean, default: true },
      enableShiftReminders: { type: Boolean, default: true },
      enablePromotions: { type: Boolean, default: false },
      enableTableReady: { type: Boolean, default: true }
    }
  },

  // Payment Gateway Settings (Encrypted)
  payment: {
    providers: [{
      name: { type: String, enum: ['stripe', 'paypal', 'square', 'razorpay', 'paytabs'] },
      enabled: { type: Boolean, default: false },
      testMode: { type: Boolean, default: true },
      
      // Stripe
      stripe: {
        publishableKey: String,
        secretKey: String, // Will be encrypted
        webhookSecret: String // Will be encrypted
      },
      
      // PayPal
      paypal: {
        clientId: String,
        clientSecret: String, // Will be encrypted
        webhookId: String
      },
      
      // Square
      square: {
        applicationId: String,
        accessToken: String, // Will be encrypted
        locationId: String,
        environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' }
      },
      
      // Razorpay
      razorpay: {
        keyId: String,
        keySecret: String, // Will be encrypted
        webhookSecret: String // Will be encrypted
      },
      
      // PayTabs
      paytabs: {
        profileId: String,
        serverKey: String, // Will be encrypted
        clientKey: String
      }
    }],
    
    // Payment Preferences
    preferences: {
      acceptCash: { type: Boolean, default: true },
      acceptCard: { type: Boolean, default: true },
      acceptOnline: { type: Boolean, default: true },
      requireDeposit: { type: Boolean, default: false },
      depositPercentage: { type: Number, default: 20 },
      tipOptions: { type: [Number], default: [10, 15, 20] },
      autoGratuity: { type: Number, default: 0 },
      autoGratuityPartySize: { type: Number, default: 6 }
    }
  },

  // Order Settings
  orders: {
    orderNumberPrefix: { type: String, default: 'ORD' },
    orderNumberLength: { type: Number, default: 6 },
    minimumOrderAmount: { type: Number, default: 0 },
    estimatedPrepTime: { type: Number, default: 30 }, // in minutes
    maxAdvanceOrderDays: { type: Number, default: 7 },
    allowGuestOrders: { type: Boolean, default: true },
    requirePhoneVerification: { type: Boolean, default: false },
    autoAcceptOrders: { type: Boolean, default: false },
    autoAssignWaiter: { type: Boolean, default: true },
    enableOrderComments: { type: Boolean, default: true },
    enableSpecialRequests: { type: Boolean, default: true }
  },

  // Table Management Settings
  tables: {
    enableReservations: { type: Boolean, default: true },
    reservationDuration: { type: Number, default: 120 }, // in minutes
    bufferTime: { type: Number, default: 15 }, // minutes between reservations
    maxPartySize: { type: Number, default: 20 },
    requireDeposit: { type: Boolean, default: false },
    depositAmount: { type: Number, default: 50 },
    autoReleaseTime: { type: Number, default: 15 }, // minutes after no-show
    enableWaitlist: { type: Boolean, default: true },
    enableTableCombining: { type: Boolean, default: true },
    qrCodeStyle: {
      size: { type: Number, default: 200 },
      margin: { type: Number, default: 4 },
      darkColor: { type: String, default: '#000000' },
      lightColor: { type: String, default: '#FFFFFF' },
      logo: String
    }
  },

  // Staff Management Settings
  staff: {
    requirePinLogin: { type: Boolean, default: false },
    pinLength: { type: Number, default: 4 },
    sessionTimeout: { type: Number, default: 480 }, // minutes
    allowClockInFromMobile: { type: Boolean, default: true },
    geofencingRadius: { type: Number, default: 100 }, // meters
    requirePhotoOnClockIn: { type: Boolean, default: false },
    overtimeThreshold: { type: Number, default: 40 }, // hours per week
    breakPolicy: {
      shortBreak: { duration: Number, afterHours: Number },
      mealBreak: { duration: Number, afterHours: Number }
    },
    allowShiftSwap: { type: Boolean, default: true },
    requireSwapApproval: { type: Boolean, default: true },
    minShiftNotice: { type: Number, default: 24 } // hours
  },

  // Integration Settings
  integrations: {
    pos: {
      provider: { type: String, enum: ['square', 'clover', 'toast', 'none'], default: 'none' },
      apiKey: String, // Will be encrypted
      merchantId: String,
      syncInventory: { type: Boolean, default: false },
      syncInterval: { type: Number, default: 60 } // minutes
    },
    
    accounting: {
      provider: { type: String, enum: ['quickbooks', 'xero', 'zoho', 'none'], default: 'none' },
      clientId: String,
      clientSecret: String, // Will be encrypted
      syncSales: { type: Boolean, default: false },
      syncPurchases: { type: Boolean, default: false },
      syncPayroll: { type: Boolean, default: false }
    },
    
    delivery: {
      providers: [{
        name: { type: String, enum: ['ubereats', 'deliveroo', 'talabat', 'zomato'] },
        enabled: { type: Boolean, default: false },
        storeId: String,
        apiKey: String, // Will be encrypted
        commission: Number
      }]
    },
    
    loyalty: {
      enabled: { type: Boolean, default: false },
      pointsPerCurrency: { type: Number, default: 1 },
      minimumPoints: { type: Number, default: 100 },
      pointsValue: { type: Number, default: 0.01 },
      expiryDays: { type: Number, default: 365 }
    }
  },

  // Security Settings
  security: {
    requireTwoFactor: { type: Boolean, default: false },
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: false },
      expiryDays: { type: Number, default: 90 }
    },
    ipWhitelist: [String],
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 30 }, // minutes
    sessionExpiry: { type: Number, default: 1440 }, // minutes
    apiRateLimit: { type: Number, default: 100 }, // requests per minute
    enableAuditLog: { type: Boolean, default: true },
    dataRetentionDays: { type: Number, default: 365 }
  },

  // Feature Flags
  features: {
    enableOnlineOrdering: { type: Boolean, default: true },
    enableTableReservation: { type: Boolean, default: true },
    enableLoyaltyProgram: { type: Boolean, default: false },
    enableInventoryManagement: { type: Boolean, default: false },
    enableKitchenDisplay: { type: Boolean, default: true },
    enableWaiterApp: { type: Boolean, default: true },
    enableCustomerFeedback: { type: Boolean, default: true },
    enablePromotions: { type: Boolean, default: true },
    enableMultiLocation: { type: Boolean, default: false },
    enableFranchise: { type: Boolean, default: false }
  },

  // Backup Settings
  backup: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    time: { type: String, default: '03:00' },
    retentionDays: { type: Number, default: 30 },
    provider: { type: String, enum: ['s3', 'azure', 'gcs', 'local'], default: 'local' },
    s3: {
      accessKeyId: String, // Will be encrypted
      secretAccessKey: String, // Will be encrypted
      bucket: String,
      region: String
    },
    azure: {
      accountName: String,
      accountKey: String, // Will be encrypted
      containerName: String
    },
    gcs: {
      projectId: String,
      keyFile: String, // Will be encrypted
      bucket: String
    }
  },

  // Metadata
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      // Decrypt sensitive fields when sending to client
      if (ret.email?.smtp?.password) {
        ret.email.smtp.password = '********'; // Mask in response
      }
      if (ret.email?.sendgrid?.apiKey) {
        ret.email.sendgrid.apiKey = '********';
      }
      if (ret.sms?.twilio?.authToken) {
        ret.sms.twilio.authToken = '********';
      }
      // Add more masking as needed
      return ret;
    }
  }
});

// Encrypt sensitive fields before saving
settingsSchema.pre('save', function(next) {
  // Encrypt email credentials
  if (this.email?.smtp?.password && !this.email.smtp.password.includes(':')) {
    this.email.smtp.password = encrypt(this.email.smtp.password);
  }
  if (this.email?.sendgrid?.apiKey && !this.email.sendgrid.apiKey.includes(':')) {
    this.email.sendgrid.apiKey = encrypt(this.email.sendgrid.apiKey);
  }
  if (this.email?.mailgun?.apiKey && !this.email.mailgun.apiKey.includes(':')) {
    this.email.mailgun.apiKey = encrypt(this.email.mailgun.apiKey);
  }
  if (this.email?.ses?.accessKeyId && !this.email.ses.accessKeyId.includes(':')) {
    this.email.ses.accessKeyId = encrypt(this.email.ses.accessKeyId);
    this.email.ses.secretAccessKey = encrypt(this.email.ses.secretAccessKey);
  }
  
  // Encrypt SMS credentials
  if (this.sms?.twilio?.accountSid && !this.sms.twilio.accountSid.includes(':')) {
    this.sms.twilio.accountSid = encrypt(this.sms.twilio.accountSid);
    this.sms.twilio.authToken = encrypt(this.sms.twilio.authToken);
  }
  if (this.sms?.nexmo?.apiKey && !this.sms.nexmo.apiKey.includes(':')) {
    this.sms.nexmo.apiKey = encrypt(this.sms.nexmo.apiKey);
    this.sms.nexmo.apiSecret = encrypt(this.sms.nexmo.apiSecret);
  }
  if (this.sms?.messagebird?.accessKey && !this.sms.messagebird.accessKey.includes(':')) {
    this.sms.messagebird.accessKey = encrypt(this.sms.messagebird.accessKey);
  }
  
  // Encrypt push notification credentials
  if (this.push?.firebase?.privateKey && !this.push.firebase.privateKey.includes(':')) {
    this.push.firebase.privateKey = encrypt(this.push.firebase.privateKey);
    if (this.push.firebase.serviceAccount) {
      this.push.firebase.serviceAccount = encrypt(this.push.firebase.serviceAccount);
    }
  }
  if (this.push?.onesignal?.apiKey && !this.push.onesignal.apiKey.includes(':')) {
    this.push.onesignal.apiKey = encrypt(this.push.onesignal.apiKey);
    this.push.onesignal.userAuthKey = encrypt(this.push.onesignal.userAuthKey);
  }
  
  // Encrypt payment gateway credentials
  if (this.payment?.providers) {
    this.payment.providers.forEach(provider => {
      if (provider.stripe?.secretKey && !provider.stripe.secretKey.includes(':')) {
        provider.stripe.secretKey = encrypt(provider.stripe.secretKey);
        provider.stripe.webhookSecret = encrypt(provider.stripe.webhookSecret);
      }
      if (provider.paypal?.clientSecret && !provider.paypal.clientSecret.includes(':')) {
        provider.paypal.clientSecret = encrypt(provider.paypal.clientSecret);
      }
      // Add more payment provider encryption as needed
    });
  }
  
  next();
});

// Method to decrypt credentials for use
settingsSchema.methods.getDecryptedCredentials = function(service) {
  const decrypted = {};
  
  switch(service) {
    case 'email':
      if (this.email?.provider === 'smtp' && this.email.smtp) {
        decrypted.smtp = { ...this.email.smtp.toObject() };
        decrypted.smtp.password = decrypt(this.email.smtp.password);
      } else if (this.email?.provider === 'sendgrid' && this.email.sendgrid) {
        decrypted.sendgrid = { ...this.email.sendgrid.toObject() };
        decrypted.sendgrid.apiKey = decrypt(this.email.sendgrid.apiKey);
      }
      // Add other email providers
      break;
      
    case 'sms':
      if (this.sms?.provider === 'twilio' && this.sms.twilio) {
        decrypted.twilio = { ...this.sms.twilio.toObject() };
        decrypted.twilio.accountSid = decrypt(this.sms.twilio.accountSid);
        decrypted.twilio.authToken = decrypt(this.sms.twilio.authToken);
      }
      // Add other SMS providers
      break;
      
    case 'push':
      if (this.push?.provider === 'firebase' && this.push.firebase) {
        decrypted.firebase = { ...this.push.firebase.toObject() };
        decrypted.firebase.privateKey = decrypt(this.push.firebase.privateKey);
        if (this.push.firebase.serviceAccount) {
          decrypted.firebase.serviceAccount = decrypt(this.push.firebase.serviceAccount);
        }
      }
      // Add other push providers
      break;
  }
  
  return decrypted;
};

// Apply tenant filter
settingsSchema.pre(/^find/, function() {
  const context = getCurrentTenant();
  if (context?.tenantId) {
    this.where({ tenantId: context.tenantId });
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;