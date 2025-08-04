const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');

// Get all permissions (for UI)
router.get('/permissions', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const permissions = {
      menu: [
        { code: 'menu.view', name: 'View Menu', description: 'Can view menu items' },
        { code: 'menu.edit', name: 'Edit Menu', description: 'Can edit menu items' },
        { code: 'menu.create', name: 'Create Menu Items', description: 'Can create new menu items' },
        { code: 'menu.delete', name: 'Delete Menu Items', description: 'Can delete menu items' }
      ],
      orders: [
        { code: 'orders.view', name: 'View Orders', description: 'Can view orders' },
        { code: 'orders.edit', name: 'Edit Orders', description: 'Can edit orders' },
        { code: 'orders.create', name: 'Create Orders', description: 'Can create new orders' },
        { code: 'orders.delete', name: 'Delete Orders', description: 'Can delete orders' },
        { code: 'orders.cancel', name: 'Cancel Orders', description: 'Can cancel orders' },
        { code: 'orders.assign', name: 'Assign Orders', description: 'Can assign orders to staff' },
        { code: 'orders.complete', name: 'Complete Orders', description: 'Can mark orders as complete' }
      ],
      analytics: [
        { code: 'analytics.view', name: 'View Analytics', description: 'Can view analytics and reports' },
        { code: 'analytics.export', name: 'Export Analytics', description: 'Can export analytics data' },
        { code: 'analytics.financial', name: 'View Financial Data', description: 'Can view financial analytics' }
      ],
      users: [
        { code: 'users.view', name: 'View Users', description: 'Can view team members' },
        { code: 'users.manage', name: 'Manage Users', description: 'Can edit team members' },
        { code: 'users.create', name: 'Create Users', description: 'Can create new team members' },
        { code: 'users.delete', name: 'Delete Users', description: 'Can delete team members' },
        { code: 'users.roles', name: 'Manage Roles', description: 'Can manage roles and permissions' },
        { code: 'users.permissions', name: 'Assign Permissions', description: 'Can assign permissions to users' }
      ],
      shifts: [
        { code: 'shifts.view', name: 'View Shifts', description: 'Can view shift schedules' },
        { code: 'shifts.manage', name: 'Manage Shifts', description: 'Can create and edit shifts' },
        { code: 'shifts.approve', name: 'Approve Shifts', description: 'Can approve shift changes' },
        { code: 'shifts.swap', name: 'Request Shift Swaps', description: 'Can request shift swaps' },
        { code: 'shifts.clock', name: 'Clock In/Out', description: 'Can clock in and out of shifts' },
        { code: 'shifts.reports', name: 'View Shift Reports', description: 'Can view shift reports' }
      ],
      tables: [
        { code: 'tables.view', name: 'View Tables', description: 'Can view table layout' },
        { code: 'tables.manage', name: 'Manage Tables', description: 'Can manage table setup' },
        { code: 'tables.assign', name: 'Assign Tables', description: 'Can assign tables to customers' }
      ],
      inventory: [
        { code: 'inventory.view', name: 'View Inventory', description: 'Can view inventory levels' },
        { code: 'inventory.manage', name: 'Manage Inventory', description: 'Can manage inventory' },
        { code: 'inventory.order', name: 'Order Inventory', description: 'Can place inventory orders' }
      ],
      payments: [
        { code: 'payments.view', name: 'View Payments', description: 'Can view payment history' },
        { code: 'payments.process', name: 'Process Payments', description: 'Can process payments' },
        { code: 'payments.refund', name: 'Process Refunds', description: 'Can process refunds' },
        { code: 'payments.reports', name: 'View Payment Reports', description: 'Can view payment reports' }
      ],
      settings: [
        { code: 'settings.view', name: 'View Settings', description: 'Can view restaurant settings' },
        { code: 'settings.manage', name: 'Manage Settings', description: 'Can modify settings' },
        { code: 'settings.billing', name: 'Manage Billing', description: 'Can manage billing settings' }
      ],
      customers: [
        { code: 'customers.view', name: 'View Customers', description: 'Can view customer data' },
        { code: 'customers.manage', name: 'Manage Customers', description: 'Can manage customer data' },
        { code: 'customers.communicate', name: 'Communicate with Customers', description: 'Can send messages to customers' }
      ],
      reports: [
        { code: 'reports.view', name: 'View Reports', description: 'Can view reports' },
        { code: 'reports.export', name: 'Export Reports', description: 'Can export reports' },
        { code: 'reports.financial', name: 'View Financial Reports', description: 'Can view financial reports' },
        { code: 'reports.staff', name: 'View Staff Reports', description: 'Can view staff performance reports' }
      ]
    };

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, message: 'Error fetching permissions' });
  }
});

// Get all roles
router.get('/', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    const query = { tenantId: req.tenant.tenantId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const roles = await Role.find(query)
      .populate('reportsTo', 'name code')
      .sort({ level: 1, name: 1 })
      .lean();

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Error fetching roles' });
  }
});

// Get role by ID
router.get('/:id', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const role = await Role.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
    })
    .populate('reportsTo', 'name code')
    .lean();

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Get users with this role
    const usersCount = await User.countDocuments({ 
      tenantId: req.tenant.tenantId,
      role: role.code 
    });

    res.json({ 
      success: true, 
      data: {
        ...role,
        usersCount
      }
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, message: 'Error fetching role' });
  }
});

// Create role
router.post('/', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      permissions,
      uiAccess,
      level,
      reportsTo
    } = req.body;

    // Check if role code already exists
    const existingRole = await Role.findOne({ 
      code: code.toUpperCase(),
      tenantId: req.tenant.tenantId 
    });

    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Role code already exists' });
    }

    const role = new Role({
      tenantId: req.tenant.tenantId,
      name,
      code: code.toUpperCase(),
      description,
      permissions: permissions || [],
      uiAccess: uiAccess || {},
      level: level || 1,
      reportsTo
    });

    await role.save();

    res.status(201).json({ 
      success: true, 
      message: 'Role created successfully',
      data: role 
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: 'Error creating role' });
  }
});

// Update role
router.put('/:id', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.tenantId;
    delete updates.isSystem; // Don't allow changing system flag
    
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }

    const role = await Role.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot modify system roles' 
      });
    }

    // Check if changing code and it already exists
    if (updates.code && updates.code !== role.code) {
      const existingRole = await Role.findOne({ 
        code: updates.code,
        tenantId: req.tenant.tenantId,
        _id: { $ne: req.params.id }
      });

      if (existingRole) {
        return res.status(400).json({ 
          success: false, 
          message: 'Role code already exists' 
        });
      }
    }

    Object.assign(role, updates);
    await role.save();

    res.json({ 
      success: true, 
      message: 'Role updated successfully',
      data: role 
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: 'Error updating role' });
  }
});

// Delete/deactivate role
router.delete('/:id', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const role = await Role.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete system roles' 
      });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ 
      tenantId: req.tenant.tenantId,
      role: role.code 
    });

    if (usersWithRole > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete role. ${usersWithRole} users are assigned to this role.` 
      });
    }

    role.isActive = false;
    await role.save();

    res.json({ 
      success: true, 
      message: 'Role deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, message: 'Error deleting role' });
  }
});

// Clone role
router.post('/:id/clone', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { name, code } = req.body;

    const sourceRole = await Role.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
    });

    if (!sourceRole) {
      return res.status(404).json({ success: false, message: 'Source role not found' });
    }

    // Check if new code already exists
    const existingRole = await Role.findOne({ 
      code: code.toUpperCase(),
      tenantId: req.tenant.tenantId 
    });

    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Role code already exists' });
    }

    const newRole = new Role({
      tenantId: req.tenant.tenantId,
      name,
      code: code.toUpperCase(),
      description: `Cloned from ${sourceRole.name}`,
      permissions: [...sourceRole.permissions],
      uiAccess: { ...sourceRole.uiAccess },
      level: sourceRole.level,
      reportsTo: sourceRole.reportsTo,
      isSystem: false
    });

    await newRole.save();

    res.status(201).json({ 
      success: true, 
      message: 'Role cloned successfully',
      data: newRole 
    });
  } catch (error) {
    console.error('Error cloning role:', error);
    res.status(500).json({ success: false, message: 'Error cloning role' });
  }
});

// Get role templates (predefined roles)
router.get('/templates/list', authenticate, authorize(['users.roles']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const templates = [
      {
        name: 'Restaurant Manager',
        code: 'MANAGER',
        description: 'Full access to restaurant operations',
        permissions: [
          'menu.view', 'menu.edit', 'menu.create', 'menu.delete',
          'orders.view', 'orders.edit', 'orders.cancel', 'orders.assign',
          'analytics.view', 'analytics.export', 'analytics.financial',
          'users.view', 'users.manage', 'users.create',
          'shifts.view', 'shifts.manage', 'shifts.approve',
          'tables.view', 'tables.manage',
          'inventory.view', 'inventory.manage',
          'payments.view', 'payments.process', 'payments.reports',
          'settings.view', 'settings.manage',
          'customers.view', 'customers.manage',
          'reports.view', 'reports.export', 'reports.financial'
        ],
        uiAccess: {
          dashboard: true,
          orders: true,
          menu: true,
          tables: true,
          customers: true,
          analytics: true,
          inventory: true,
          staff: true,
          settings: true
        },
        level: 2
      },
      {
        name: 'Head Chef',
        code: 'HEAD_CHEF',
        description: 'Kitchen management and menu control',
        permissions: [
          'menu.view', 'menu.edit', 'menu.create',
          'orders.view', 'orders.edit', 'orders.complete',
          'inventory.view', 'inventory.manage', 'inventory.order',
          'users.view',
          'shifts.view', 'shifts.clock',
          'reports.view'
        ],
        uiAccess: {
          dashboard: true,
          orders: true,
          menu: true,
          inventory: true
        },
        level: 3
      },
      {
        name: 'Server',
        code: 'SERVER',
        description: 'Order taking and customer service',
        permissions: [
          'menu.view',
          'orders.view', 'orders.create', 'orders.edit',
          'tables.view', 'tables.assign',
          'customers.view',
          'shifts.view', 'shifts.clock', 'shifts.swap',
          'payments.view', 'payments.process'
        ],
        uiAccess: {
          dashboard: true,
          orders: true,
          menu: true,
          tables: true,
          customers: true
        },
        level: 4
      },
      {
        name: 'Cashier',
        code: 'CASHIER',
        description: 'Payment processing and basic reports',
        permissions: [
          'orders.view',
          'payments.view', 'payments.process', 'payments.refund',
          'customers.view',
          'shifts.view', 'shifts.clock',
          'reports.view'
        ],
        uiAccess: {
          dashboard: true,
          orders: true,
          customers: true
        },
        level: 4
      },
      {
        name: 'Kitchen Staff',
        code: 'KITCHEN_STAFF',
        description: 'Kitchen operations and order preparation',
        permissions: [
          'orders.view', 'orders.edit', 'orders.complete',
          'menu.view',
          'inventory.view',
          'shifts.view', 'shifts.clock'
        ],
        uiAccess: {
          dashboard: true,
          orders: true
        },
        level: 5
      }
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching role templates:', error);
    res.status(500).json({ success: false, message: 'Error fetching role templates' });
  }
});

module.exports = router;