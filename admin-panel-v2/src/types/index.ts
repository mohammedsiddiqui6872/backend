// @ts-ignore - Shared types package will be built separately
// Re-export shared types and add admin-panel specific types
export * from '@gritservices/shared-types';

// Admin panel specific types that extend shared types
export interface AdminDashboardStats {
  revenue: {
    today: number;
    week: number;
    month: number;
    growth: number;
  };
  orders: {
    pending: number;
    preparing: number;
    completed: number;
    total: number;
  };
  tables: {
    occupied: number;
    available: number;
    reserved: number;
    total: number;
  };
  staff: {
    online: number;
    onShift: number;
    scheduled: number;
    total: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

export interface ActivityFeed {
  id: string;
  type: 'order' | 'table' | 'staff' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, any>;
}