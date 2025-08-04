const mongoose = require('mongoose');

const staffAssignmentSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  waiterName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['primary', 'assistant'],
    default: 'primary'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedByName: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'ended'],
    default: 'active'
  },
  endedAt: {
    type: Date
  },
  endedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  sectionId: {
    type: String
  },
  floorId: {
    type: String
  },
  // Performance tracking
  ordersServed: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  reason: {
    type: String,
    enum: ['manual', 'shift_start', 'rotation', 'emergency', 'rule_based'],
    default: 'manual'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
staffAssignmentSchema.index({ tenantId: 1, status: 1 });
staffAssignmentSchema.index({ tenantId: 1, waiterId: 1, status: 1 });
staffAssignmentSchema.index({ tenantId: 1, tableId: 1, status: 1 });
staffAssignmentSchema.index({ tenantId: 1, assignedAt: -1 });
staffAssignmentSchema.index({ tenantId: 1, endedAt: -1 });

// Virtual for active duration
staffAssignmentSchema.virtual('activeDuration').get(function() {
  if (this.status === 'active') {
    return Math.floor((Date.now() - this.assignedAt) / 1000 / 60); // minutes
  }
  return this.duration;
});

// Method to end assignment
staffAssignmentSchema.methods.endAssignment = async function(endedBy) {
  this.status = 'ended';
  this.endedAt = new Date();
  this.endedBy = endedBy;
  this.duration = Math.floor((this.endedAt - this.assignedAt) / 1000 / 60); // minutes
  
  // Update orders served and revenue from related orders
  const Order = mongoose.model('Order');
  const orders = await Order.find({
    tenantId: this.tenantId,
    tableNumber: this.tableNumber,
    createdAt: { $gte: this.assignedAt, $lte: this.endedAt || new Date() }
  });
  
  this.ordersServed = orders.length;
  this.revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  
  return this.save();
};

// Static method to get active assignments
staffAssignmentSchema.statics.getActiveAssignments = async function(tenantId, filters = {}) {
  const query = { tenantId, status: 'active' };
  
  if (filters.waiterId) query.waiterId = filters.waiterId;
  if (filters.tableId) query.tableId = filters.tableId;
  if (filters.sectionId) query.sectionId = filters.sectionId;
  if (filters.floorId) query.floorId = filters.floorId;
  
  return this.find(query)
    .populate('waiterId', 'name email')
    .populate('tableId', 'number displayName')
    .populate('assignedBy', 'name')
    .sort('-assignedAt');
};

// Static method to get waiter loads
staffAssignmentSchema.statics.getWaiterLoads = async function(tenantId) {
  const activeAssignments = await this.aggregate([
    { $match: { tenantId, status: 'active' } },
    { 
      $group: {
        _id: '$waiterId',
        currentTables: { $sum: 1 },
        tableNumbers: { $push: '$tableNumber' }
      }
    }
  ]);
  
  // Get all active waiters
  const User = mongoose.model('User');
  const TableSession = mongoose.model('TableSession');
  const activeWaiters = await User.find({
    tenantId,
    role: 'waiter',
    isActive: true
  }).select('name email maxTables');
  
  // Get active table sessions for additional load info
  const tableSessions = await TableSession.aggregate([
    { $match: { tenantId, isActive: true } },
    {
      $lookup: {
        from: 'customersessions',
        localField: 'tableNumber',
        foreignField: 'tableNumber',
        as: 'customerSessions'
      }
    },
    {
      $group: {
        _id: '$waiter',
        activeOrders: { $sum: { $size: '$customerSessions' } },
        totalGuests: { 
          $sum: { 
            $sum: '$customerSessions.occupancy' 
          } 
        }
      }
    }
  ]);
  
  // Combine data
  const waiterLoads = activeWaiters.map(waiter => {
    const assignment = activeAssignments.find(a => a._id.toString() === waiter._id.toString()) || {};
    const session = tableSessions.find(s => s._id.toString() === waiter._id.toString()) || {};
    
    return {
      waiterId: waiter._id,
      waiterName: waiter.name,
      currentTables: assignment.currentTables || 0,
      tableNumbers: assignment.tableNumbers || [],
      activeOrders: session.activeOrders || 0,
      totalGuests: session.totalGuests || 0,
      maxCapacity: waiter.maxTables || 4,
      isAvailable: (assignment.currentTables || 0) < (waiter.maxTables || 4),
      performanceScore: 0 // TODO: Calculate based on metrics
    };
  });
  
  return waiterLoads;
};

module.exports = mongoose.model('StaffAssignment', staffAssignmentSchema);