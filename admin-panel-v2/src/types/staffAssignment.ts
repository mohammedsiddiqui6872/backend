// Staff Assignment Types for Enterprise Multi-Tenant System

export interface StaffAssignment {
  id: string;
  tenantId: string;
  tableId: string;
  tableNumber: string;
  waiterId: string;
  waiterName: string;
  waiterAvatar?: string;
  role: 'primary' | 'assistant';
  assignedBy: string;
  assignedByName: string;
  assignedAt: Date;
  status: 'active' | 'pending' | 'ended';
  endedAt?: Date;
  endedBy?: string;
  shiftId?: string;
  sectionId?: string;
  floorId?: string;
}

export interface AssignmentHistory {
  id: string;
  tenantId: string;
  tableNumber: string;
  waiterId: string;
  waiterName: string;
  assignedBy: string;
  assignedByName: string;
  assignedAt: Date;
  endedAt?: Date;
  duration?: number; // in minutes
  ordersServed?: number;
  revenue?: number;
  reason: 'manual' | 'shift_start' | 'rotation' | 'emergency' | 'rule_based';
  notes?: string;
}

export interface AssignmentRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: {
    shiftType?: string[];
    tableSection?: string[];
    tableFloor?: string[];
    tableType?: string[];
    waiterRole?: string[];
    dayOfWeek?: number[];
    timeRange?: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
    minExperience?: number; // months
  };
  actions: {
    autoAssign: boolean;
    preferredWaiters?: string[];
    maxTablesPerWaiter?: number;
    assignmentStrategy: 'round_robin' | 'least_loaded' | 'performance_based' | 'random';
    notifyOnAssignment: boolean;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaiterLoad {
  waiterId: string;
  waiterName: string;
  currentTables: number;
  tableNumbers: string[];
  activeOrders: number;
  totalGuests: number;
  shiftStartTime?: Date;
  lastAssignmentTime?: Date;
  performanceScore?: number;
  isAvailable: boolean;
  maxCapacity: number;
}

export interface AssignmentMetrics {
  tenantId: string;
  period: 'today' | 'week' | 'month';
  totalAssignments: number;
  activeAssignments: number;
  averageTablesPerWaiter: number;
  averageAssignmentDuration: number; // minutes
  busiestHours: { hour: number; assignments: number }[];
  topWaiters: {
    waiterId: string;
    waiterName: string;
    tablesServed: number;
    revenue: number;
  }[];
  assignmentsByReason: {
    manual: number;
    shift_start: number;
    rotation: number;
    emergency: number;
    rule_based: number;
  };
}

export interface BulkAssignmentRequest {
  tableIds: string[];
  waiterId: string;
  role: 'primary' | 'assistant';
  reason?: string;
  notifyWaiter?: boolean;
}

export interface AssignmentConflict {
  tableId: string;
  tableNumber: string;
  currentWaiterId: string;
  currentWaiterName: string;
  newWaiterId: string;
  newWaiterName: string;
  resolution?: 'replace' | 'skip' | 'add_assistant';
}

export type AssignmentViewMode = 'grid' | 'list' | 'schedule' | 'analytics';

export interface AssignmentFilters {
  floors?: string[];
  sections?: string[];
  waiters?: string[];
  status?: ('assigned' | 'unassigned')[];
  tableTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AssignmentNotification {
  id: string;
  type: 'new_assignment' | 'assignment_ended' | 'conflict' | 'rule_triggered';
  waiterId: string;
  tableNumber: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Socket events for real-time updates
export interface AssignmentSocketEvents {
  'assignment:created': StaffAssignment;
  'assignment:updated': StaffAssignment;
  'assignment:ended': { assignmentId: string; tableNumber: string; waiterId: string };
  'assignment:conflict': AssignmentConflict;
  'waiter:load_updated': WaiterLoad;
  'rule:triggered': { ruleId: string; assignments: StaffAssignment[] };
}