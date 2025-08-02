// src/models/Order.js - CORRECT MODEL WITHOUT PENDING IN PAYMENT
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    validate: {
      validator: async function(value) {
        if (!value) return true; // Allow null for historical orders
        const MenuItem = mongoose.model('MenuItem');
        const item = await MenuItem.findById(value);
        return item && !item.isDeleted;
      },
      message: 'Menu item does not exist or has been deleted'
    }
  },
  // For combo orders
  combo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Combo'
  },
  comboItems: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    quantity: Number,
    name: String,
    price: Number
  }],
  isCombo: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: true // Always require name for order history
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: Number, // For showing discounts
  discount: Number, // Applied discount amount
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending'
  },
  station: {
    type: String,
    enum: ['grill', 'salad', 'dessert', 'beverage', 'main'],
    default: 'main'
  },
  preparedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  preparedAt: Date
});

const orderSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  // Multiple waiter reference fields for compatibility
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  waiterInfo: {
    id: String,
    name: String
  },
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  tip: {
    type: Number,
    default: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
    default: 'pending'  // Order starts as pending confirmation
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet'],  // NO 'pending' here - only actual payment methods
    required: false  // Not required until payment
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  // Kitchen management
  chef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: Date,
  startedAt: Date,
  preparedAt: Date,
  servedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledByRole: {
    type: String,
    enum: ['customer', 'waiter', 'admin', 'system']
  },
  cancelReason: String,
  estimatedPrepTime: {
    type: Number,
    default: 30 // minutes
  },
  actualPrepTime: Number, // minutes
  // Session tracking
  tableSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TableSession'
  },
  customerSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerSession'
  }
}, {
  timestamps: true
});

// Pre-save middleware to ensure waiter fields are synchronized
orderSchema.pre('save', async function(next) {
  // Generate order number if not exists
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.orderNumber = `ORD-${date}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Synchronize waiter fields
  if (this.waiter && !this.waiterId) {
    this.waiterId = this.waiter;
  } else if (this.waiterId && !this.waiter) {
    this.waiter = this.waiterId;
  }
  
  if (this.assignedTo && !this.waiter) {
    this.waiter = this.assignedTo;
    this.waiterId = this.assignedTo;
  }
  
  // Update waiterInfo if we have a waiter reference
  if (this.waiter && !this.waiterInfo?.id) {
    try {
      const User = mongoose.model('User');
      const waiterUser = await User.findById(this.waiter).select('name');
      if (waiterUser) {
        this.waiterInfo = {
          id: this.waiter.toString(),
          name: waiterUser.name
        };
      }
    } catch (error) {
      console.error('Error populating waiter info:', error);
    }
  }
  
  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    this.total = this.subtotal + (this.tax || 0) + (this.tip || 0) - (this.discount || 0) + (this.deliveryCharge || 0);
  }
  
  // Update timestamps based on status changes
  if (this.isModified('status')) {
    switch (this.status) {
      case 'confirmed':
        this.confirmedAt = new Date();
        break;
      case 'preparing':
        this.startedAt = new Date();
        break;
      case 'ready':
        this.preparedAt = new Date();
        if (this.startedAt) {
          this.actualPrepTime = Math.round((this.preparedAt - this.startedAt) / 1000 / 60);
        }
        break;
      case 'served':
        this.servedAt = new Date();
        break;
      case 'paid':
        this.completedAt = new Date();
        break;
      case 'cancelled':
        this.cancelledAt = new Date();
        break;
    }
  }
  
  next();
});

// Additional validation middleware for data integrity
orderSchema.pre('save', async function(next) {
  // Validate items have required data
  if (this.items && this.items.length > 0) {
    const MenuItem = mongoose.model('MenuItem');
    
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      
      // If menuItem is provided, validate and populate details
      if (item.menuItem) {
        try {
          const menuItem = await MenuItem.findById(item.menuItem);
          if (!menuItem) {
            // Menu item was deleted - preserve order data
            if (!item.name) {
              return next(new Error(`Item ${i + 1}: Menu item not found and no name provided`));
            }
          } else if (menuItem.isDeleted && this.isNew) {
            // Don't allow new orders with deleted items
            return next(new Error(`Item ${i + 1}: Menu item "${menuItem.name}" is no longer available`));
          } else {
            // Update item details from menu item
            if (!item.name) item.name = menuItem.name;
            if (item.price === undefined || item.price === null) item.price = menuItem.price;
          }
        } catch (error) {
          if (!item.name) {
            return next(new Error(`Item ${i + 1}: Invalid menu item reference`));
          }
        }
      } else {
        // No menuItem reference - ensure we have minimum required data
        if (!item.name) {
          return next(new Error(`Item ${i + 1}: Name is required`));
        }
      }
      
      // Validate price
      if (item.price === undefined || item.price === null || item.price < 0) {
        return next(new Error(`Item ${i + 1}: Valid price is required`));
      }
    }
  }
  
  next();
});

// Indexes for better query performance
// Indexes - removed duplicate orderNumber index (already defined as unique in schema)
orderSchema.index({ tableNumber: 1, status: 1 });
orderSchema.index({ waiter: 1, createdAt: -1 });
orderSchema.index({ waiterId: 1, createdAt: -1 });
orderSchema.index({ assignedTo: 1, createdAt: -1 });
orderSchema.index({ 'waiterInfo.id': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

// Virtual for active status
orderSchema.virtual('isActive').get(function() {
  return ['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(this.status);
});

// Method to update item status
orderSchema.methods.updateItemStatus = function(itemId, status) {
  const item = this.items.id(itemId);
  if (item) {
    item.status = status;
    if (status === 'ready') {
      item.preparedAt = new Date();
    }
  }
  return this.save({ validateModifiedOnly: true });
};

// Method to check if order is ready
orderSchema.methods.checkIfReady = function() {
  const allItemsReady = this.items.every(item => 
    item.status === 'ready' || item.status === 'served'
  );
  
  if (allItemsReady && this.status === 'preparing') {
    this.status = 'ready';
    this.preparedAt = new Date();
    this.actualPrepTime = Math.round(
      (this.preparedAt - this.confirmedAt) / 1000 / 60
    );
  }
  
  return allItemsReady;
};

// Method to validate cancellation
orderSchema.methods.canBeCancelled = function() {
  // Can only cancel if status is pending or confirmed
  return ['pending', 'confirmed'].includes(this.status);
};

// Static method to find orders by waiter
orderSchema.statics.findByWaiter = function(waiterId, options = {}) {
  const query = {
    $or: [
      { waiter: waiterId },
      { waiterId: waiterId },
      { assignedTo: waiterId },
      { 'waiterInfo.id': waiterId.toString() }
    ]
  };
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) {
      query.createdAt.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.createdAt.$lte = new Date(options.endDate);
    }
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('items.menuItem')
    .populate('waiter', 'name')
    .sort('-createdAt');
};

// Compound index for tenant-specific order numbers
orderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });

module.exports = mongoose.model('Order', orderSchema);