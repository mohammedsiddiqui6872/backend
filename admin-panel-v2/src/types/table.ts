export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
export type TableType = 'regular' | 'vip' | 'outdoor' | 'private' | 'bar';
export type TableShape = 'square' | 'rectangle' | 'round' | 'oval' | 'custom';

export interface TableLocation {
  floor: string;
  section: string;
  zone?: string;
  x: number;
  y: number;
  rotation?: number;
  width?: number;
  height?: number;
}

export interface QRCodeConfig {
  code: string;
  url: string;
  customization?: {
    logo?: string;
    color?: string;
    style?: string;
  };
}

export interface TableMetadata {
  lastCleaned?: Date;
  maintenanceNotes?: string;
  preferredWaiters?: string[];
}

export interface Table {
  _id: string;
  tenantId: string;
  number: string;
  displayName?: string;
  capacity: number;
  minCapacity?: number;
  maxCapacity?: number;
  type: TableType;
  shape: TableShape;
  location: TableLocation;
  qrCode: QRCodeConfig;
  features: string[];
  isCombinable: boolean;
  combinesWith?: string[];
  status: TableStatus;
  metadata: TableMetadata;
  currentWaiter?: {
    _id: string;
    name: string;
  };
  assistingWaiters?: Array<{
    _id: string;
    name: string;
  }>;
  activeCustomerSession?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TableInput extends Omit<Table, '_id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'qrCode' | 'currentWaiter' | 'assistingWaiters' | 'activeCustomerSession'> {
  _id?: string;
}

export interface Floor {
  id: string;
  name: string;
  displayOrder: number;
  sections: Section[];
  backgroundImage?: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface Section {
  id: string;
  name: string;
  color: string;
  tables: string[];
  waiterZones?: WaiterZone[];
}

export interface WaiterZone {
  id: string;
  name: string;
  assignedWaiters: string[];
}

export interface TableLayout {
  _id?: string;
  tenantId: string;
  floors: Floor[];
  gridSize: {
    width: number;
    height: number;
  };
  snapToGrid: boolean;
  defaultCapacity: number;
  theme?: {
    tableColors?: {
      available: string;
      occupied: string;
      reserved: string;
      cleaning: string;
      maintenance: string;
    };
    shapeDefaults?: {
      square: { width: number; height: number };
      rectangle: { width: number; height: number };
      round: { width: number; height: number };
      oval: { width: number; height: number };
      custom: { width: number; height: number };
    };
  };
}

export interface TableSession {
  _id: string;
  tableId: string;
  tableNumber: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  customerName?: string;
  customerPhone?: string;
  numberOfGuests: number;
  orders: Array<{
    orderId: string;
    amount: number;
    items: number;
  }>;
  totalAmount: number;
  waiterId: string;
  waiterName: string;
  status: 'active' | 'completed' | 'cancelled';
  feedback?: {
    rating: number;
    comment: string;
  };
}

export interface TableAnalytics {
  tableId: string;
  tableNumber: string;
  metrics: {
    totalSessions: number;
    totalGuests: number;
    averageOccupancyTime: number;
    averageOrderValue: number;
    turnoverRate: number;
    revenue: number;
    popularTimes: Array<{
      hour: number;
      day?: string;
      count: number;
    }>;
    customerSatisfaction: number;
  };
  period: 'day' | 'week' | 'month' | 'year';
}

export interface BulkTableOperation {
  operation: 'create' | 'update' | 'delete';
  tables: TableInput[];
  updateFields?: Partial<Table>;
}

export interface QRExportOptions {
  format: 'pdf' | 'zip';
  includeTableNumbers: boolean;
  includeQRCode: boolean;
  paperSize?: 'A4' | 'Letter' | 'Custom';
  qrSize?: number;
  customization?: {
    logo?: string;
    brandColor?: string;
    headerText?: string;
    footerText?: string;
  };
}