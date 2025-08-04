import api from './api';
import { 
  AuditLog, 
  AuditLogFilters, 
  AuditLogStats,
  UserActivitySummary,
  ComplianceReport,
  ExportFormat,
  ReviewDecision,
  ComplianceRegulation
} from '../types/auditLog';

class AuditLogAPI {
  // Get audit logs with advanced filtering
  async getLogs(filters: AuditLogFilters = {}): Promise<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    // Add filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    const response = await api.get(`/admin/audit-logs?${params.toString()}`);
    return response.data;
  }

  // Get audit log statistics
  async getStats(params: {
    startDate?: string;
    endDate?: string;
    period?: '1h' | '24h' | '7d' | '30d' | '90d';
  } = {}): Promise<AuditLogStats> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period);
    
    const response = await api.get(`/admin/audit-logs/stats?${queryParams.toString()}`);
    return response.data;
  }

  // Get specific audit log entry
  async getLog(eventId: string): Promise<AuditLog> {
    const response = await api.get(`/admin/audit-logs/${eventId}`);
    return response.data;
  }

  // Get user activity summary
  async getUserActivity(userId: string, days: number = 30): Promise<UserActivitySummary> {
    const response = await api.get(`/admin/audit-logs/users/${userId}/activity?days=${days}`);
    return response.data;
  }

  // Get compliance report
  async getComplianceReport(
    regulation: ComplianceRegulation, 
    startDate: string, 
    endDate: string
  ): Promise<ComplianceReport> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    
    const response = await api.get(`/admin/audit-logs/compliance/${regulation}?${params.toString()}`);
    return response.data;
  }

  // Review audit log entry
  async reviewLog(eventId: string, data: {
    decision: ReviewDecision;
    notes?: string;
    escalateTo?: string;
  }): Promise<{ success: boolean; log: AuditLog }> {
    const response = await api.post(`/admin/audit-logs/${eventId}/review`, data);
    return response.data;
  }

  // Mark as false positive
  async markFalsePositive(eventId: string): Promise<{ success: boolean; log: AuditLog }> {
    const response = await api.post(`/admin/audit-logs/${eventId}/false-positive`);
    return response.data;
  }

  // Add tags to audit log
  async addTags(eventId: string, tags: string[]): Promise<{ success: boolean; tags: string[] }> {
    const response = await api.post(`/admin/audit-logs/${eventId}/tags`, { tags });
    return response.data;
  }

  // Export audit logs
  async exportLogs(format: ExportFormat, filters: AuditLogFilters = {}): Promise<Blob> {
    const response = await api.post('/admin/audit-logs/export', 
      { format, filters }, 
      { responseType: 'blob' }
    );
    
    return response.data;
  }

  // Download export
  downloadExport(blob: Blob, format: ExportFormat) {
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Real-time search
  async search(query: string, filters: AuditLogFilters = {}): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    const searchFilters = {
      ...filters,
      search: query,
      limit: 20
    };
    
    const result = await this.getLogs(searchFilters);
    return {
      logs: result.logs,
      total: result.pagination.total
    };
  }

  // Get high-risk events
  async getHighRiskEvents(hours: number = 24): Promise<AuditLog[]> {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const result = await this.getLogs({
      startDate,
      endDate,
      severity: ['high', 'critical'],
      sortBy: 'security.riskScore',
      sortOrder: 'desc',
      limit: 100
    });
    
    return result.logs;
  }

  // Get events requiring review
  async getEventsRequiringReview(): Promise<AuditLog[]> {
    const result = await this.getLogs({
      requiresReview: true,
      reviewed: false,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: 50
    });
    
    return result.logs;
  }

  // Get suspicious events
  async getSuspiciousEvents(days: number = 7): Promise<AuditLog[]> {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await this.getLogs({
      startDate,
      endDate,
      suspicious: true,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: 100
    });
    
    return result.logs;
  }

  // Get failed operations
  async getFailedOperations(hours: number = 24): Promise<AuditLog[]> {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const result = await this.getLogs({
      startDate,
      endDate,
      search: 'failed',
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: 100
    });
    
    return result.logs.filter(log => !log.result.success);
  }

  // Get GDPR-related events
  async getGDPREvents(days: number = 30): Promise<AuditLog[]> {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await this.getLogs({
      startDate,
      endDate,
      gdprOnly: true,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: 500
    });
    
    return result.logs;
  }

  // Batch operations
  async batchReview(eventIds: string[], decision: ReviewDecision, notes?: string): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const results = await Promise.allSettled(
      eventIds.map(id => this.reviewLog(id, { decision, notes }))
    );
    
    const successful: string[] = [];
    const failed: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(eventIds[index]);
      } else {
        failed.push(eventIds[index]);
      }
    });
    
    return { successful, failed };
  }

  // Format timestamp for display
  formatTimestamp(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  // Get severity color
  getSeverityColor(severity: string): string {
    const colors = {
      info: 'blue',
      low: 'green',
      medium: 'yellow',
      high: 'orange',
      critical: 'red'
    };
    
    return colors[severity as keyof typeof colors] || 'gray';
  }

  // Get action icon
  getActionIcon(action: string): string {
    const prefix = action.split('.')[0];
    
    const icons = {
      auth: 'Shield',
      user: 'User',
      data: 'Database',
      system: 'Settings',
      security: 'Lock',
      order: 'ShoppingCart',
      payment: 'CreditCard',
      table: 'Grid3X3',
      menu: 'MenuSquare',
      compliance: 'FileCheck',
      api: 'Code',
      report: 'FileText',
      analytics: 'BarChart3'
    };
    
    return icons[prefix as keyof typeof icons] || 'Activity';
  }
}

export const auditLogAPI = new AuditLogAPI();