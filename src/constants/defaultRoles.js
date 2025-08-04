const defaultRoles = [
  {
    name: 'Super Admin',
    code: 'SUPER_ADMIN',
    description: 'Full system access with ability to manage all restaurants',
    permissions: ['*'], // All permissions
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
    level: 0,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Restaurant Admin',
    code: 'ADMIN',
    description: 'Full access to manage the restaurant',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.create', 'orders.update', 'orders.delete',
      'menu.view', 'menu.create', 'menu.update', 'menu.delete',
      'tables.view', 'tables.create', 'tables.update', 'tables.delete',
      'customers.view', 'customers.create', 'customers.update', 
      'analytics.view', 'analytics.export',
      'inventory.view', 'inventory.update',
      'staff.view', 'staff.create', 'staff.update', 'staff.delete',
      'settings.view', 'settings.update'
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
    level: 1,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Manager',
    code: 'MANAGER',
    description: 'Manage daily operations with limited admin access',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.create', 'orders.update',
      'menu.view', 'menu.update',
      'tables.view', 'tables.update',
      'customers.view',
      'analytics.view',
      'inventory.view', 'inventory.update',
      'staff.view', 'staff.update',
      'settings.view'
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
      settings: false
    },
    level: 2,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Head Chef',
    code: 'HEAD_CHEF',
    description: 'Kitchen management with menu and inventory access',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.update',
      'menu.view', 'menu.create', 'menu.update',
      'inventory.view', 'inventory.update',
      'analytics.view'
    ],
    uiAccess: {
      dashboard: true,
      orders: true,
      menu: true,
      tables: false,
      customers: false,
      analytics: true,
      inventory: true,
      staff: false,
      settings: false
    },
    level: 3,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Chef',
    code: 'CHEF',
    description: 'Kitchen staff with order management',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.update',
      'menu.view',
      'inventory.view'
    ],
    uiAccess: {
      dashboard: true,
      orders: true,
      menu: false,
      tables: false,
      customers: false,
      analytics: false,
      inventory: true,
      staff: false,
      settings: false
    },
    level: 4,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Waiter',
    code: 'WAITER',
    description: 'Service staff with order and table management',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.create', 'orders.update',
      'tables.view', 'tables.update',
      'customers.view'
    ],
    uiAccess: {
      dashboard: true,
      orders: true,
      menu: false,
      tables: true,
      customers: true,
      analytics: false,
      inventory: false,
      staff: false,
      settings: false
    },
    level: 5,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Cashier',
    code: 'CASHIER',
    description: 'Handle payments and basic order viewing',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.update',
      'customers.view',
      'analytics.view'
    ],
    uiAccess: {
      dashboard: true,
      orders: true,
      menu: false,
      tables: false,
      customers: true,
      analytics: true,
      inventory: false,
      staff: false,
      settings: false
    },
    level: 5,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Host',
    code: 'HOST',
    description: 'Manage table assignments and reservations',
    permissions: [
      'dashboard.view',
      'tables.view', 'tables.update',
      'customers.view'
    ],
    uiAccess: {
      dashboard: true,
      orders: false,
      menu: false,
      tables: true,
      customers: true,
      analytics: false,
      inventory: false,
      staff: false,
      settings: false
    },
    level: 5,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Bartender',
    code: 'BARTENDER',
    description: 'Bar staff with beverage order management',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.update',
      'menu.view',
      'inventory.view'
    ],
    uiAccess: {
      dashboard: true,
      orders: true,
      menu: false,
      tables: false,
      customers: false,
      analytics: false,
      inventory: true,
      staff: false,
      settings: false
    },
    level: 4,
    isActive: true,
    isSystem: true
  },
  {
    name: 'Cleaner',
    code: 'CLEANER',
    description: 'Cleaning staff with table status access',
    permissions: [
      'tables.view', 'tables.update'
    ],
    uiAccess: {
      dashboard: false,
      orders: false,
      menu: false,
      tables: true,
      customers: false,
      analytics: false,
      inventory: false,
      staff: false,
      settings: false
    },
    level: 6,
    isActive: true,
    isSystem: true
  }
];

module.exports = defaultRoles;