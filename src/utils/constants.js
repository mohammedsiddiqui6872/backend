// src/utils/constants.js
module.exports = {
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    SERVED: 'served',
    PAID: 'paid',
    CANCELLED: 'cancelled'
  },
  
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CHEF: 'chef',
    WAITER: 'waiter',
    CASHIER: 'cashier'
  },
  
  PAYMENT_METHODS: {
    CASH: 'cash',
    CARD: 'card',
    ONLINE: 'online',
    WALLET: 'wallet'
  },
  
  TABLE_STATUS: {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    RESERVED: 'reserved',
    CLEANING: 'cleaning'
  },
  
  PERMISSIONS: {
    MENU_VIEW: 'menu.view',
    MENU_EDIT: 'menu.edit',
    ORDERS_VIEW: 'orders.view',
    ORDERS_EDIT: 'orders.edit',
    ANALYTICS_VIEW: 'analytics.view',
    USERS_MANAGE: 'users.manage'
  }
};
