import api from './api';

export interface Shift {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  date: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  department: string;
  position: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

class ShiftAPI {
  async getShifts(filters?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    department?: string;
    status?: string;
  }): Promise<Shift[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
    }
    
    const response = await api.get(`/admin/shifts?${params.toString()}`);
    return response.data;
  }

  async getShift(shiftId: string): Promise<Shift> {
    const response = await api.get(`/admin/shifts/${shiftId}`);
    return response.data;
  }

  async createShift(shiftData: Partial<Shift>): Promise<Shift> {
    const response = await api.post('/admin/shifts', shiftData);
    return response.data;
  }

  async updateShift(shiftId: string, updates: Partial<Shift>): Promise<Shift> {
    const response = await api.put(`/admin/shifts/${shiftId}`, updates);
    return response.data;
  }

  async deleteShift(shiftId: string): Promise<void> {
    await api.delete(`/admin/shifts/${shiftId}`);
  }

  async clockIn(shiftId: string): Promise<Shift> {
    const response = await api.post(`/admin/shifts/${shiftId}/clock-in`);
    return response.data;
  }

  async clockOut(shiftId: string): Promise<Shift> {
    const response = await api.post(`/admin/shifts/${shiftId}/clock-out`);
    return response.data;
  }

  async getActiveShifts(): Promise<Shift[]> {
    const response = await api.get('/admin/shifts/active');
    return response.data;
  }

  async getShiftStats(period: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const response = await api.get(`/admin/shifts/stats/overview?period=${period}`);
    return response.data;
  }
}

export const shiftAPI = new ShiftAPI();