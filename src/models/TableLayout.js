// src/models/TableLayout.js
const mongoose = require('mongoose');

const waiterZoneSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  assignedWaiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#6B7280' },
  tables: [{ type: String }], // Table numbers
  waiterZones: [waiterZoneSchema]
});

const floorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  displayOrder: { type: Number, default: 0 },
  sections: [sectionSchema],
  backgroundImage: String,
  dimensions: {
    width: { type: Number, default: 1000 },
    height: { type: Number, default: 800 }
  }
});

const tableLayoutSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  floors: [floorSchema],
  gridSize: {
    width: { type: Number, default: 20 },
    height: { type: Number, default: 20 }
  },
  snapToGrid: { type: Boolean, default: true },
  defaultCapacity: { type: Number, default: 4 },
  theme: {
    tableColors: {
      available: { type: String, default: '#10B981' },
      occupied: { type: String, default: '#EF4444' },
      reserved: { type: String, default: '#F59E0B' },
      cleaning: { type: String, default: '#3B82F6' },
      maintenance: { type: String, default: '#6B7280' }
    },
    shapeDefaults: {
      square: { 
        width: { type: Number, default: 80 }, 
        height: { type: Number, default: 80 } 
      },
      rectangle: { 
        width: { type: Number, default: 120 }, 
        height: { type: Number, default: 80 } 
      },
      round: { 
        width: { type: Number, default: 80 }, 
        height: { type: Number, default: 80 } 
      },
      oval: { 
        width: { type: Number, default: 120 }, 
        height: { type: Number, default: 80 } 
      },
      custom: { 
        width: { type: Number, default: 100 }, 
        height: { type: Number, default: 100 } 
      }
    }
  },
  settings: {
    showTableNumbers: { type: Boolean, default: true },
    showCapacity: { type: Boolean, default: true },
    showWaiterInfo: { type: Boolean, default: true },
    enableDragDrop: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true },
    autoSaveInterval: { type: Number, default: 30000 } // 30 seconds
  }
}, { timestamps: true });

// Validate tenant before saving
tableLayoutSchema.pre('save', async function(next) {
  // ENTERPRISE TENANT VALIDATION
  if (!this.tenantId) {
    return next(new Error('Tenant ID is required for table layout'));
  }
  
  // Verify tenant exists and is active
  const Tenant = require('./Tenant');
  const tenant = await Tenant.findOne({ 
    tenantId: this.tenantId, 
    status: 'active' 
  });
  
  if (!tenant) {
    return next(new Error('Invalid or inactive tenant'));
  }
  
  next();
});

// Methods
tableLayoutSchema.methods.getFloor = function(floorId) {
  return this.floors.find(floor => floor.id === floorId);
};

tableLayoutSchema.methods.getSection = function(floorId, sectionId) {
  const floor = this.getFloor(floorId);
  return floor ? floor.sections.find(section => section.id === sectionId) : null;
};

tableLayoutSchema.methods.addFloor = function(floorData) {
  const newFloor = {
    id: floorData.id || new mongoose.Types.ObjectId().toString(),
    name: floorData.name,
    displayOrder: floorData.displayOrder || this.floors.length,
    sections: floorData.sections || [{
      id: 'default',
      name: 'Main Area',
      color: '#6B7280',
      tables: []
    }],
    backgroundImage: floorData.backgroundImage,
    dimensions: floorData.dimensions || { width: 1000, height: 800 }
  };
  
  this.floors.push(newFloor);
  return this.save();
};

tableLayoutSchema.methods.updateFloor = function(floorId, updates) {
  const floorIndex = this.floors.findIndex(floor => floor.id === floorId);
  if (floorIndex === -1) {
    throw new Error('Floor not found');
  }
  
  Object.assign(this.floors[floorIndex], updates);
  return this.save();
};

tableLayoutSchema.methods.removeFloor = function(floorId) {
  this.floors = this.floors.filter(floor => floor.id !== floorId);
  return this.save();
};

tableLayoutSchema.methods.addSection = function(floorId, sectionData) {
  const floor = this.getFloor(floorId);
  if (!floor) {
    throw new Error('Floor not found');
  }
  
  const newSection = {
    id: sectionData.id || new mongoose.Types.ObjectId().toString(),
    name: sectionData.name,
    color: sectionData.color || '#6B7280',
    tables: sectionData.tables || [],
    waiterZones: sectionData.waiterZones || []
  };
  
  floor.sections.push(newSection);
  return this.save();
};

tableLayoutSchema.methods.assignTableToSection = function(floorId, sectionId, tableNumber) {
  const section = this.getSection(floorId, sectionId);
  if (!section) {
    throw new Error('Section not found');
  }
  
  // Remove table from any other section first
  this.floors.forEach(floor => {
    floor.sections.forEach(sec => {
      sec.tables = sec.tables.filter(num => num !== tableNumber);
    });
  });
  
  // Add to new section
  if (!section.tables.includes(tableNumber)) {
    section.tables.push(tableNumber);
  }
  
  return this.save();
};

// Statics
tableLayoutSchema.statics.getOrCreate = async function(tenantId) {
  let layout = await this.findOne({ tenantId });
  
  if (!layout) {
    layout = new this({
      tenantId,
      floors: [{
        id: 'main',
        name: 'Main Floor',
        displayOrder: 0,
        sections: [{
          id: 'dining',
          name: 'Dining Area',
          color: '#6B7280',
          tables: []
        }],
        dimensions: { width: 1000, height: 800 }
      }]
    });
    await layout.save();
  }
  
  return layout;
};

module.exports = mongoose.model('TableLayout', tableLayoutSchema);