const mongoose = require('mongoose');

const menuScheduleSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  // Schedule type
  scheduleType: {
    type: String,
    enum: ['time-based', 'date-based', 'recurring'],
    default: 'time-based'
  },
  // Time-based schedule (daily)
  timeSlots: [{
    name: String, // e.g., 'Breakfast', 'Lunch', 'Dinner'
    startTime: String, // HH:MM format
    endTime: String, // HH:MM format
    daysOfWeek: [Number], // 0-6 (Sunday to Saturday)
    menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    categories: [String], // Category slugs to show
    modifierGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup' }]
  }],
  // Date-based schedule (specific dates)
  dateSlots: [{
    name: String,
    startDate: Date,
    endDate: Date,
    menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    categories: [String],
    modifierGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup' }]
  }],
  // Priority for overlapping schedules
  priority: {
    type: Number,
    default: 0
  },
  // Channels this schedule applies to
  applicableChannels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuChannel'
  }],
  // Settings
  settings: {
    autoSwitch: {
      type: Boolean,
      default: true
    },
    showUpcomingItems: {
      type: Boolean,
      default: false
    },
    upcomingItemsMinutes: {
      type: Number,
      default: 30
    },
    hideUnavailableItems: {
      type: Boolean,
      default: true
    }
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
menuScheduleSchema.index({ tenantId: 1, isActive: 1 });
menuScheduleSchema.index({ tenantId: 1, priority: -1 });

// Methods
menuScheduleSchema.methods.getCurrentSlot = function() {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();
  
  if (this.scheduleType === 'time-based') {
    for (const slot of this.timeSlots) {
      // Check if today is included
      if (!slot.daysOfWeek.includes(currentDay)) continue;
      
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      const slotStart = startHour * 60 + startMin;
      const slotEnd = endHour * 60 + endMin;
      
      // Handle slots that cross midnight
      if (slotEnd < slotStart) {
        if (currentTime >= slotStart || currentTime <= slotEnd) {
          return slot;
        }
      } else {
        if (currentTime >= slotStart && currentTime <= slotEnd) {
          return slot;
        }
      }
    }
  } else if (this.scheduleType === 'date-based') {
    for (const slot of this.dateSlots) {
      if (now >= slot.startDate && now <= slot.endDate) {
        return slot;
      }
    }
  }
  
  return null;
};

menuScheduleSchema.methods.getUpcomingSlot = function(withinMinutes = 30) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();
  
  if (this.scheduleType === 'time-based') {
    let nearestSlot = null;
    let nearestTime = Infinity;
    
    for (const slot of this.timeSlots) {
      if (!slot.daysOfWeek.includes(currentDay)) continue;
      
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const slotStart = startHour * 60 + startMin;
      
      if (slotStart > currentTime && slotStart - currentTime <= withinMinutes) {
        if (slotStart - currentTime < nearestTime) {
          nearestTime = slotStart - currentTime;
          nearestSlot = slot;
        }
      }
    }
    
    return nearestSlot;
  }
  
  return null;
};

menuScheduleSchema.methods.isItemAvailable = function(itemId) {
  const currentSlot = this.getCurrentSlot();
  if (!currentSlot) return !this.settings.hideUnavailableItems;
  
  // Check if item is in current slot
  const isInCurrentSlot = currentSlot.menuItems.some(
    id => id.toString() === itemId.toString()
  );
  
  if (isInCurrentSlot) return true;
  
  // Check upcoming slots if enabled
  if (this.settings.showUpcomingItems) {
    const upcomingSlot = this.getUpcomingSlot(this.settings.upcomingItemsMinutes);
    if (upcomingSlot) {
      return upcomingSlot.menuItems.some(
        id => id.toString() === itemId.toString()
      );
    }
  }
  
  return !this.settings.hideUnavailableItems;
};

// Statics
menuScheduleSchema.statics.getActiveSchedules = async function(tenantId, channelId) {
  const query = {
    tenantId,
    isActive: true
  };
  
  if (channelId) {
    query.$or = [
      { applicableChannels: { $size: 0 } }, // Applies to all channels
      { applicableChannels: channelId }
    ];
  }
  
  return this.find(query).sort('-priority');
};

menuScheduleSchema.statics.getDefaultSchedules = function() {
  return [
    {
      name: 'Standard Day Schedule',
      description: 'Breakfast, Lunch, and Dinner menus',
      scheduleType: 'time-based',
      timeSlots: [
        {
          name: 'Breakfast',
          startTime: '06:00',
          endTime: '11:00',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          menuItems: [],
          categories: ['breakfast', 'beverages']
        },
        {
          name: 'Lunch',
          startTime: '11:00',
          endTime: '16:00',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          menuItems: [],
          categories: ['appetizers', 'main-courses', 'beverages', 'desserts']
        },
        {
          name: 'Dinner',
          startTime: '16:00',
          endTime: '23:00',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          menuItems: [],
          categories: ['appetizers', 'main-courses', 'beverages', 'desserts']
        }
      ]
    },
    {
      name: 'Weekend Brunch',
      description: 'Special weekend brunch menu',
      scheduleType: 'time-based',
      priority: 1, // Higher priority than standard schedule
      timeSlots: [
        {
          name: 'Weekend Brunch',
          startTime: '10:00',
          endTime: '14:00',
          daysOfWeek: [0, 6], // Sunday and Saturday
          menuItems: [],
          categories: ['breakfast', 'brunch-specials', 'beverages']
        }
      ]
    }
  ];
};

const MenuSchedule = mongoose.model('MenuSchedule', menuScheduleSchema);

module.exports = MenuSchedule;