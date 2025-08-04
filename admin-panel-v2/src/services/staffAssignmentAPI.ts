import api from './api';
import { 
  StaffAssignment, 
  AssignmentHistory, 
  AssignmentRule, 
  WaiterLoad, 
  AssignmentMetrics,
  BulkAssignmentRequest,
  AssignmentFilters,
  AssignmentConflict
} from '../types/staffAssignment';

class StaffAssignmentAPI {
  // Current Assignments
  async getAssignments(filters?: AssignmentFilters): Promise<StaffAssignment[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.floors?.length) params.append('floors', filters.floors.join(','));
      if (filters.sections?.length) params.append('sections', filters.sections.join(','));
      if (filters.waiters?.length) params.append('waiters', filters.waiters.join(','));
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.tableTypes?.length) params.append('tableTypes', filters.tableTypes.join(','));
    }
    
    const response = await api.get(`/admin/staff-assignments?${params.toString()}`);
    return response.data;
  }

  async assignWaiter(tableId: string, waiterId: string, role: 'primary' | 'assistant' = 'primary'): Promise<StaffAssignment> {
    const response = await api.post(`/admin/tables/${tableId}/assign-waiter`, {
      waiterId,
      role
    });
    return response.data;
  }

  async unassignWaiter(tableId: string, waiterId: string): Promise<void> {
    await api.post(`/admin/tables/${tableId}/remove-waiter`, { waiterId });
  }

  async bulkAssign(request: BulkAssignmentRequest): Promise<{
    successful: StaffAssignment[];
    conflicts: AssignmentConflict[];
  }> {
    const response = await api.post('/admin/staff-assignments/bulk-assign', request);
    return response.data;
  }

  async resolveConflict(
    tableId: string, 
    newWaiterId: string, 
    resolution: 'replace' | 'skip' | 'add_assistant'
  ): Promise<StaffAssignment> {
    const response = await api.post(`/admin/staff-assignments/resolve-conflict`, {
      tableId,
      newWaiterId,
      resolution
    });
    return response.data;
  }

  // Waiter Load Management
  async getWaiterLoads(): Promise<WaiterLoad[]> {
    const response = await api.get('/admin/staff-assignments/waiter-loads');
    return response.data;
  }

  async getAvailableWaiters(shiftId?: string): Promise<WaiterLoad[]> {
    const params = shiftId ? `?shiftId=${shiftId}` : '';
    const response = await api.get(`/admin/staff-assignments/available-waiters${params}`);
    return response.data;
  }

  // Assignment History
  async getAssignmentHistory(filters?: {
    tableNumber?: string;
    waiterId?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<AssignmentHistory[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.tableNumber) params.append('tableNumber', filters.tableNumber);
      if (filters.waiterId) params.append('waiterId', filters.waiterId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }
      if (filters.limit) params.append('limit', filters.limit.toString());
    }
    
    const response = await api.get(`/admin/staff-assignments/history?${params.toString()}`);
    return response.data;
  }

  async exportHistory(format: 'csv' | 'pdf', filters?: any): Promise<Blob> {
    const params = new URLSearchParams({ format, ...filters });
    const response = await api.get(`/admin/staff-assignments/history/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Assignment Rules
  async getRules(): Promise<AssignmentRule[]> {
    const response = await api.get('/admin/staff-assignments/rules');
    return response.data;
  }

  async getRule(ruleId: string): Promise<AssignmentRule> {
    const response = await api.get(`/admin/staff-assignments/rules/${ruleId}`);
    return response.data;
  }

  async createRule(rule: Omit<AssignmentRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<AssignmentRule> {
    const response = await api.post('/admin/staff-assignments/rules', rule);
    return response.data;
  }

  async updateRule(ruleId: string, updates: Partial<AssignmentRule>): Promise<AssignmentRule> {
    const response = await api.put(`/admin/staff-assignments/rules/${ruleId}`, updates);
    return response.data;
  }

  async deleteRule(ruleId: string): Promise<void> {
    await api.delete(`/admin/staff-assignments/rules/${ruleId}`);
  }

  async toggleRule(ruleId: string, isActive: boolean): Promise<AssignmentRule> {
    const response = await api.patch(`/admin/staff-assignments/rules/${ruleId}/toggle`, { isActive });
    return response.data;
  }

  async testRule(ruleId: string): Promise<{
    matches: { tableId: string; tableNumber: string; suggestedWaiters: string[] }[];
    wouldAssign: number;
  }> {
    const response = await api.post(`/admin/staff-assignments/rules/${ruleId}/test`);
    return response.data;
  }

  // Analytics
  async getMetrics(period: 'today' | 'week' | 'month' = 'today'): Promise<AssignmentMetrics> {
    const response = await api.get(`/admin/staff-assignments/metrics?period=${period}`);
    return response.data;
  }

  async getWaiterPerformance(waiterId: string, period: string): Promise<{
    tablesServed: number;
    averageServiceTime: number;
    customerSatisfaction: number;
    revenue: number;
    peakHours: { hour: number; tables: number }[];
  }> {
    const response = await api.get(`/admin/staff-assignments/performance/${waiterId}?period=${period}`);
    return response.data;
  }

  async getTableAssignmentStats(tableId: string): Promise<{
    totalAssignments: number;
    averageDuration: number;
    topWaiters: { waiterId: string; name: string; count: number }[];
    turnoverRate: number;
  }> {
    const response = await api.get(`/admin/staff-assignments/table-stats/${tableId}`);
    return response.data;
  }

  // Real-time Operations
  async rotateAssignments(sectionId?: string): Promise<{
    rotated: number;
    newAssignments: StaffAssignment[];
  }> {
    const body = sectionId ? { sectionId } : {};
    const response = await api.post('/admin/staff-assignments/rotate', body);
    return response.data;
  }

  async optimizeAssignments(): Promise<{
    current: { waiterId: string; load: number }[];
    optimized: { waiterId: string; load: number }[];
    changes: { tableId: string; from: string; to: string }[];
  }> {
    const response = await api.post('/admin/staff-assignments/optimize');
    return response.data;
  }

  async emergencyReassign(fromWaiterId: string, toWaiterId: string): Promise<{
    reassigned: number;
    assignments: StaffAssignment[];
  }> {
    const response = await api.post('/admin/staff-assignments/emergency-reassign', {
      fromWaiterId,
      toWaiterId
    });
    return response.data;
  }
}

export const staffAssignmentAPI = new StaffAssignmentAPI();