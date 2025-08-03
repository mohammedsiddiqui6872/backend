/**
 * Type definitions for shift management
 */

export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  profile?: {
    department?: string;
    position?: string;
    salary?: {
      type: 'hourly' | 'monthly' | 'yearly';
      amount: number;
      currency?: string;
    };
  };
}

export interface ShiftTime {
  start: string; // Format: "HH:MM" in 24-hour format
  end: string;   // Format: "HH:MM" in 24-hour format
}

export interface Break {
  start: string;
  end?: string;
  type: 'short' | 'meal' | 'prayer';
}

export interface ActualTimes {
  clockIn?: string;
  clockOut?: string;
  breaks: Break[];
}

export interface Overtime {
  hours: number;
  rate: number;
  approved: boolean;
  approvedBy?: string;
}

export interface SwapRequest {
  requestedBy: Employee;
  requestedWith: Employee;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  responseDate?: string;
  approvedBy?: Employee;
}

export interface Payroll {
  regularHours?: number;
  overtimeHours?: number;
  breakDeduction?: number;
  totalHours?: number;
  hourlyRate?: number;
  totalPay?: number;
  tips?: number;
  deductions?: Array<{
    type: string;
    amount: number;
    reason: string;
  }>;
}

export interface Performance {
  ordersServed?: number;
  tablesServed?: number;
  revenue?: number;
  customerRatings?: number[];
  issues?: Array<{
    type: 'late' | 'early-leave' | 'no-show' | 'complaint' | 'commendation';
    description: string;
    reportedBy: string;
    timestamp: string;
  }>;
}

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
export type ShiftStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';

export interface Shift {
  _id: string;
  employee?: Employee;
  date: string;
  shiftType: ShiftType;
  scheduledTimes: ShiftTime;
  actualTimes?: ActualTimes;
  status: ShiftStatus;
  department?: string;
  position?: string;
  notes?: string;
  overtime?: Overtime;
  swapRequest?: SwapRequest;
  payroll?: Payroll;
  performance?: Performance;
}

export interface ShiftStats {
  totalShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  noShowShifts: number;
  completionRate: number;
  totalHoursScheduled: number;
  totalHoursWorked: number;
  overtimeHours: number;
  pendingSwapRequests: number;
}

export interface ShiftFormData {
  employee: string;
  date: string;
  shiftType: ShiftType;
  scheduledTimes: ShiftTime;
  department?: string;
  position?: string;
  notes?: string;
}

export interface ShiftUpdateData {
  shiftType?: ShiftType;
  scheduledTimes?: ShiftTime;
  department?: string;
  position?: string;
  notes?: string;
  status?: ShiftStatus;
}

export interface SwapRequestData {
  requestedWithId: string;
  reason: string;
}