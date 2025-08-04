// Restaurant Operations Audit Log Types

export interface RestaurantAuditLog {
  _id: string;
  tenantId: string;
  eventId: string;
  
  // Event Information
  action: RestaurantAction;
  category: RestaurantCategory;
  
  // Resource Information
  resource: {
    type: RestaurantResourceType;
    id?: string;
    name?: string;
    details?: Record<string, any>;
  };
  
  // Who performed the action
  performedBy: {
    userId: string;
    name: string;
    email?: string;
    role: string;
    shift?: string;
  };
  
  // Location context
  location?: {
    tableNumber?: string;
    section?: string;
    floor?: string;
  };
  
  // Change details
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    summary?: string;
  };
  
  // Impact
  impact?: {
    affectedOrders?: string[];
    affectedTables?: string[];
    affectedStaff?: string[];
    revenueImpact?: number;
  };
  
  // Status
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Restaurant-specific action types
export type RestaurantAction = 
  // Order Management
  | 'order.created' | 'order.updated' | 'order.cancelled' | 'order.completed' 
  | 'order.item_added' | 'order.item_removed' | 'order.item_modified'
  | 'order.payment_received' | 'order.refunded' | 'order.discounted'
  
  // Table Management
  | 'table.assigned' | 'table.released' | 'table.transferred' 
  | 'table.combined' | 'table.split' | 'table.cleaned'
  | 'table.reserved' | 'table.reservation_cancelled'
  
  // Staff Management
  | 'staff.clocked_in' | 'staff.clocked_out' | 'staff.break_started' | 'staff.break_ended'
  | 'staff.assigned_table' | 'staff.unassigned_table' | 'staff.shift_swapped'
  | 'staff.created' | 'staff.updated' | 'staff.deactivated'
  
  // Menu Management
  | 'menu.item_created' | 'menu.item_updated' | 'menu.item_deleted'
  | 'menu.item_out_of_stock' | 'menu.item_back_in_stock'
  | 'menu.price_changed' | 'menu.category_created' | 'menu.category_updated'
  
  // Inventory
  | 'inventory.received' | 'inventory.used' | 'inventory.wasted' 
  | 'inventory.transferred' | 'inventory.counted' | 'inventory.adjusted'
  
  // Customer Service
  | 'feedback.received' | 'complaint.registered' | 'complaint.resolved'
  | 'loyalty.points_earned' | 'loyalty.points_redeemed'
  
  // Financial
  | 'cash_register.opened' | 'cash_register.closed' | 'cash_register.reconciled'
  | 'tip.distributed' | 'expense.recorded' | 'discount.applied';

// Restaurant operation categories
export type RestaurantCategory = 
  | 'orders'
  | 'tables' 
  | 'staff'
  | 'menu'
  | 'inventory'
  | 'customer_service'
  | 'financial';

// Restaurant resource types
export type RestaurantResourceType = 
  | 'order' | 'table' | 'staff_member' | 'menu_item' 
  | 'inventory_item' | 'customer' | 'cash_register';

// Filter interface for restaurant audit logs
export interface RestaurantAuditLogFilters {
  startDate?: string;
  endDate?: string;
  action?: RestaurantAction | RestaurantAction[];
  category?: RestaurantCategory | RestaurantCategory[];
  userId?: string;
  tableNumber?: string;
  orderId?: string;
  staffId?: string;
  shiftId?: string;
  search?: string;
  status?: 'success' | 'failed' | 'pending';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Statistics for restaurant operations
export interface RestaurantAuditStats {
  timeRange: {
    start: Date;
    end: Date;
  };
  operations: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  tables: {
    totalAssignments: number;
    averageTurnoverTime: number;
    peakHours: Array<{ hour: number; count: number }>;
  };
  staff: {
    totalShifts: number;
    totalHoursWorked: number;
    mostActiveStaff: Array<{
      name: string;
      actions: number;
    }>;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

// Daily summary interface
export interface DailyOperationsSummary {
  date: Date;
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
  };
  tables: {
    totalCovers: number;
    averageTableTime: number;
  };
  staff: {
    totalWorked: number;
    totalHours: number;
  };
  inventory: {
    itemsReceived: number;
    itemsUsed: number;
    wastage: number;
  };
  issues: {
    complaints: number;
    resolved: number;
  };
}