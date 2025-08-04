interface User {
  role: string;
  permissions?: string[];
}

export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'admin') return true;

  // Check specific permissions
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }

  // Role-based permissions
  const rolePermissions: Record<string, string[]> = {
    manager: [
      'dashboard.view',
      'orders.view',
      'orders.manage',
      'menu.view',
      'menu.manage',
      'tables.view',
      'tables.manage',
      'team.view',
      'team.manage',
      'shifts.view',
      'shifts.manage',
      'assignments.view',
      'assignments.manage',
      'analytics.view'
    ],
    chef: [
      'dashboard.view',
      'orders.view',
      'menu.view',
      'inventory.view',
      'inventory.manage'
    ],
    waiter: [
      'dashboard.view',
      'orders.view',
      'orders.manage',
      'tables.view',
      'assignments.view'
    ],
    cashier: [
      'dashboard.view',
      'orders.view',
      'payments.view',
      'payments.manage'
    ]
  };

  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
};

export const hasAnyPermission = (user: User | null, permissions: string[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

export const hasAllPermissions = (user: User | null, permissions: string[]): boolean => {
  return permissions.every(permission => hasPermission(user, permission));
};