const mongoose = require('mongoose');

const restaurantAuditLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Event Information
  action: {
    type: String,
    required: true,
    enum: [
      // Order Management
      'order.created', 'order.updated', 'order.cancelled', 'order.completed',
      'order.item_added', 'order.item_removed', 'order.item_modified',
      'order.payment_received', 'order.refunded', 'order.discounted',
      
      // Table Management
      'table.assigned', 'table.released', 'table.transferred',
      'table.combined', 'table.split', 'table.cleaned',
      'table.reserved', 'table.reservation_cancelled',
      
      // Staff Management
      'staff.clocked_in', 'staff.clocked_out', 'staff.break_started', 'staff.break_ended',
      'staff.assigned_table', 'staff.unassigned_table', 'staff.shift_swapped',
      'staff.created', 'staff.updated', 'staff.deactivated',
      
      // Menu Management
      'menu.item_created', 'menu.item_updated', 'menu.item_deleted',
      'menu.item_out_of_stock', 'menu.item_back_in_stock',
      'menu.price_changed', 'menu.category_created', 'menu.category_updated',
      
      // Inventory
      'inventory.received', 'inventory.used', 'inventory.wasted',
      'inventory.transferred', 'inventory.counted', 'inventory.adjusted',
      
      // Customer Service
      'feedback.received', 'complaint.registered', 'complaint.resolved',
      'loyalty.points_earned', 'loyalty.points_redeemed',
      
      // Financial
      'cash_register.opened', 'cash_register.closed', 'cash_register.reconciled',
      'tip.distributed', 'expense.recorded', 'discount.applied'
    ]
  },
  
  category: {
    type: String,
    required: true,
    enum: ['orders', 'tables', 'staff', 'menu', 'inventory', 'customer_service', 'financial']
  },
  
  // Resource Information
  resource: {
    type: {
      type: String,
      enum: ['order', 'table', 'staff_member', 'menu_item', 'inventory_item', 'customer', 'cash_register'],
      required: true
    },
    id: String,
    name: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // Who performed the action
  performedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String,
    role: String,
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift'
    }
  },
  
  // Location context
  location: {
    tableNumber: String,
    section: String,
    floor: String
  },
  
  // Change details
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    summary: String
  },
  
  // Impact
  impact: {
    affectedOrders: [String],
    affectedTables: [String],
    affectedStaff: [String],
    revenueImpact: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  errorMessage: String,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // IP and device info
  ip: String,
  userAgent: String,
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for common queries
restaurantAuditLogSchema.index({ tenantId: 1, timestamp: -1 });
restaurantAuditLogSchema.index({ tenantId: 1, category: 1, timestamp: -1 });
restaurantAuditLogSchema.index({ tenantId: 1, 'performedBy.userId': 1, timestamp: -1 });
restaurantAuditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });
restaurantAuditLogSchema.index({ tenantId: 1, 'resource.type': 1, 'resource.id': 1 });

// Static methods for common operations
restaurantAuditLogSchema.statics.logOrderAction = async function(tenantId, action, order, user, changes) {
  return this.create({
    tenantId,
    action,
    category: 'orders',
    resource: {
      type: 'order',
      id: order._id.toString(),
      name: `Order #${order.orderNumber}`,
      details: {
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        totalAmount: order.totalAmount
      }
    },
    performedBy: {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    changes,
    location: {
      tableNumber: order.tableNumber
    },
    impact: {
      revenueImpact: order.totalAmount
    }
  });
};

restaurantAuditLogSchema.statics.logTableAction = async function(tenantId, action, table, user, details) {
  return this.create({
    tenantId,
    action,
    category: 'tables',
    resource: {
      type: 'table',
      id: table._id.toString(),
      name: `Table ${table.number}`,
      details: {
        tableNumber: table.number,
        capacity: table.capacity,
        section: table.section
      }
    },
    performedBy: {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    location: {
      tableNumber: table.number,
      section: table.section
    },
    changes: details
  });
};

restaurantAuditLogSchema.statics.logStaffAction = async function(tenantId, action, staff, performedBy, details) {
  return this.create({
    tenantId,
    action,
    category: 'staff',
    resource: {
      type: 'staff_member',
      id: staff._id.toString(),
      name: staff.name,
      details: {
        employeeId: staff.profile?.employeeId,
        department: staff.profile?.department,
        position: staff.profile?.position
      }
    },
    performedBy: {
      userId: performedBy._id,
      name: performedBy.name,
      email: performedBy.email,
      role: performedBy.role
    },
    changes: details
  });
};

// Get daily summary
restaurantAuditLogSchema.statics.getDailySummary = async function(tenantId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const summary = await this.aggregate([
    {
      $match: {
        tenantId,
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        orderActions: {
          $sum: { $cond: [{ $eq: ['$category', 'orders'] }, 1, 0] }
        },
        tableActions: {
          $sum: { $cond: [{ $eq: ['$category', 'tables'] }, 1, 0] }
        },
        staffActions: {
          $sum: { $cond: [{ $eq: ['$category', 'staff'] }, 1, 0] }
        },
        successfulActions: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $ifNull: ['$impact.revenueImpact', 0] }
        }
      }
    }
  ]);
  
  return summary[0] || {
    totalActions: 0,
    orderActions: 0,
    tableActions: 0,
    staffActions: 0,
    successfulActions: 0,
    failedActions: 0,
    totalRevenue: 0
  };
};

module.exports = mongoose.model('RestaurantAuditLog', restaurantAuditLogSchema);