// Mongoose plugin to add audit fields to any schema
module.exports = function auditPlugin(schema, options) {
  // Add audit fields
  schema.add({
    createdBy: {
      type: schema.constructor.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: schema.constructor.Types.ObjectId,
      ref: 'User',
      default: null
    },
    changeHistory: [{
      changedBy: {
        type: schema.constructor.Types.ObjectId,
        ref: 'User'
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      changeType: {
        type: String,
        enum: ['create', 'update', 'delete', 'restore', 'status_change']
      },
      changes: {
        type: Map,
        of: schema.constructor.Schema.Types.Mixed
      },
      reason: String
    }]
  });

  // Track changes on update
  schema.pre('save', function(next) {
    if (this.isNew) {
      // New document
      if (!this.changeHistory || this.changeHistory.length === 0) {
        this.changeHistory = [{
          changedBy: this.createdBy,
          changeType: 'create',
          changes: new Map(Object.entries(this.toObject()))
        }];
      }
    } else if (this.isModified()) {
      // Existing document being updated
      const changes = new Map();
      const modifiedPaths = this.modifiedPaths();
      
      modifiedPaths.forEach(path => {
        if (path !== 'changeHistory' && path !== 'updatedAt') {
          changes.set(path, {
            old: this._original ? this._original[path] : undefined,
            new: this[path]
          });
        }
      });

      if (changes.size > 0) {
        this.changeHistory.push({
          changedBy: this.updatedBy,
          changeType: 'update',
          changes: changes
        });
      }
    }
    next();
  });

  // Store original values for comparison
  schema.post('init', function() {
    this._original = this.toObject();
  });

  // Add helper methods
  schema.methods.getChangeHistory = function(limit = 10) {
    return this.changeHistory
      .slice(-limit)
      .reverse()
      .map(change => ({
        ...change.toObject(),
        changes: Object.fromEntries(change.changes)
      }));
  };

  schema.methods.getLastChange = function() {
    return this.changeHistory[this.changeHistory.length - 1];
  };

  schema.methods.wasModifiedBy = function(userId) {
    return this.changeHistory.some(change => 
      change.changedBy && change.changedBy.toString() === userId.toString()
    );
  };

  // Add indexes for audit fields
  schema.index({ createdBy: 1 });
  schema.index({ updatedBy: 1 });
  schema.index({ 'changeHistory.changedAt': -1 });
};