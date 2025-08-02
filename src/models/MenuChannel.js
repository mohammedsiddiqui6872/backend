const mongoose = require('mongoose');

const menuChannelSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    enum: ['dine-in', 'takeaway', 'delivery', 'drive-thru', 'catering', 'online', 'mobile-app', 'third-party'],
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  icon: String,
  color: String,
  settings: {
    // Channel-specific settings
    requiresTable: {
      type: Boolean,
      default: false
    },
    requiresCustomerInfo: {
      type: Boolean,
      default: false
    },
    minOrderAmount: {
      type: Number,
      default: 0
    },
    maxOrderAmount: Number,
    deliveryFee: {
      type: Number,
      default: 0
    },
    packagingFee: {
      type: Number,
      default: 0
    },
    estimatedTime: {
      min: {
        type: Number,
        default: 15
      },
      max: {
        type: Number,
        default: 30
      }
    },
    // Third-party integration settings
    thirdPartyConfig: {
      platform: String, // e.g., 'ubereats', 'deliveroo', 'talabat'
      storeId: String,
      commission: Number,
      autoSync: {
        type: Boolean,
        default: false
      }
    }
  },
  // Operating hours for this channel
  operatingHours: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    sunday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    }
  },
  // Menu customization per channel
  menuCustomization: {
    hiddenCategories: [String], // Category IDs to hide in this channel
    hiddenItems: [String], // Item IDs to hide in this channel
    priceAdjustment: {
      type: {
        type: String,
        enum: ['none', 'percentage', 'fixed'],
        default: 'none'
      },
      value: {
        type: Number,
        default: 0
      }
    },
    limitedTimeOffers: [{
      itemId: String,
      startDate: Date,
      endDate: Date,
      specialPrice: Number
    }]
  },
  // Analytics
  analytics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
menuChannelSchema.index({ tenantId: 1, name: 1 }, { unique: true });
menuChannelSchema.index({ tenantId: 1, isActive: 1 });

// Methods
menuChannelSchema.methods.isOpenNow = function() {
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentDay = this.operatingHours[dayOfWeek];
  
  if (!currentDay.isOpen) return false;
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = currentDay.openTime.split(':').map(Number);
  const [closeHour, closeMin] = currentDay.closeTime.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  // Handle cases where closing time is after midnight
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime;
  }
  
  return currentTime >= openTime && currentTime <= closeTime;
};

menuChannelSchema.methods.getAdjustedPrice = function(originalPrice) {
  if (this.menuCustomization.priceAdjustment.type === 'none') {
    return originalPrice;
  }
  
  if (this.menuCustomization.priceAdjustment.type === 'percentage') {
    return originalPrice * (1 + this.menuCustomization.priceAdjustment.value / 100);
  }
  
  if (this.menuCustomization.priceAdjustment.type === 'fixed') {
    return originalPrice + this.menuCustomization.priceAdjustment.value;
  }
  
  return originalPrice;
};

// Statics
menuChannelSchema.statics.getDefaultChannels = function() {
  return [
    {
      name: 'dine-in',
      displayName: 'Dine In',
      description: 'For customers dining in the restaurant',
      icon: 'restaurant',
      color: '#4F46E5',
      settings: {
        requiresTable: true,
        requiresCustomerInfo: false
      }
    },
    {
      name: 'takeaway',
      displayName: 'Takeaway',
      description: 'For customers picking up their orders',
      icon: 'shopping-bag',
      color: '#10B981',
      settings: {
        requiresTable: false,
        requiresCustomerInfo: true,
        packagingFee: 2
      }
    },
    {
      name: 'delivery',
      displayName: 'Delivery',
      description: 'For home delivery orders',
      icon: 'truck',
      color: '#F59E0B',
      settings: {
        requiresTable: false,
        requiresCustomerInfo: true,
        minOrderAmount: 20,
        deliveryFee: 5,
        packagingFee: 2,
        estimatedTime: {
          min: 30,
          max: 45
        }
      }
    },
    {
      name: 'online',
      displayName: 'Online Ordering',
      description: 'Orders placed through website',
      icon: 'globe',
      color: '#6366F1',
      settings: {
        requiresTable: false,
        requiresCustomerInfo: true
      }
    }
  ];
};

menuChannelSchema.statics.initializeDefaultChannels = async function(tenantId) {
  const defaultChannels = this.getDefaultChannels();
  const channels = [];
  
  for (let i = 0; i < defaultChannels.length; i++) {
    const channelData = {
      ...defaultChannels[i],
      tenantId,
      displayOrder: i,
      operatingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '23:00' },
        sunday: { isOpen: true, openTime: '09:00', closeTime: '22:00' }
      }
    };
    
    const channel = await this.create(channelData);
    channels.push(channel);
  }
  
  return channels;
};

// Update analytics
menuChannelSchema.methods.updateAnalytics = async function(orderData) {
  this.analytics.totalOrders += 1;
  this.analytics.totalRevenue += orderData.totalAmount;
  this.analytics.averageOrderValue = this.analytics.totalRevenue / this.analytics.totalOrders;
  this.analytics.lastOrderDate = new Date();
  await this.save();
};

const MenuChannel = mongoose.model('MenuChannel', menuChannelSchema);

module.exports = MenuChannel;