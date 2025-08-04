const RestaurantAuditLog = require('../models/RestaurantAuditLog');

// Middleware to automatically log restaurant operations
const restaurantAuditLogger = {
  // Log order operations
  logOrderOperation: async (req, action, order, changes) => {
    try {
      if (!req.tenant || !req.user) return;
      
      await RestaurantAuditLog.logOrderAction(
        req.tenant.tenantId,
        action,
        order,
        req.user,
        changes
      );
    } catch (error) {
      console.error('Error logging order operation:', error);
    }
  },

  // Log table operations
  logTableOperation: async (req, action, table, details) => {
    try {
      if (!req.tenant || !req.user) return;
      
      await RestaurantAuditLog.logTableAction(
        req.tenant.tenantId,
        action,
        table,
        req.user,
        details
      );
    } catch (error) {
      console.error('Error logging table operation:', error);
    }
  },

  // Log staff operations
  logStaffOperation: async (req, action, staff, details) => {
    try {
      if (!req.tenant || !req.user) return;
      
      await RestaurantAuditLog.logStaffAction(
        req.tenant.tenantId,
        action,
        staff,
        req.user,
        details
      );
    } catch (error) {
      console.error('Error logging staff operation:', error);
    }
  },

  // Generic log function
  log: async (req, action, category, resource, changes) => {
    try {
      if (!req.tenant || !req.user) return;
      
      await RestaurantAuditLog.create({
        tenantId: req.tenant.tenantId,
        action,
        category,
        resource,
        performedBy: {
          userId: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          shift: req.user.currentShift
        },
        changes,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (error) {
      console.error('Error logging restaurant operation:', error);
    }
  }
};

module.exports = restaurantAuditLogger;