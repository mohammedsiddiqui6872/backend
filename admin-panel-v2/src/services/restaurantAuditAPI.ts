import axiosInstance from './axiosConfig';
import { 
  RestaurantAuditLog, 
  RestaurantAuditLogFilters,
  RestaurantAuditStats,
  DailyOperationsSummary
} from '../types/restaurantAuditLog';

export const restaurantAuditAPI = {
  // Get audit logs
  async getLogs(filters: RestaurantAuditLogFilters) {
    const { data } = await axiosInstance.get('/api/admin/restaurant-audit-logs', {
      params: filters
    });
    return data;
  },

  // Get statistics
  async getStats(period: string = 'today') {
    const { data } = await axiosInstance.get('/api/admin/restaurant-audit-logs/stats', {
      params: { period }
    });
    return data;
  },

  // Get daily summary
  async getDailySummary(date: string) {
    const { data } = await axiosInstance.get('/api/admin/restaurant-audit-logs/daily-summary', {
      params: { date }
    });
    return data;
  },

  // Export logs
  async exportLogs(format: 'csv' | 'pdf' | 'excel', filters: RestaurantAuditLogFilters) {
    const { data } = await axiosInstance.get('/api/admin/restaurant-audit-logs/export', {
      params: { ...filters, format },
      responseType: 'blob'
    });
    return data;
  },

  // Download export
  downloadExport(blob: Blob, format: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-activities-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};