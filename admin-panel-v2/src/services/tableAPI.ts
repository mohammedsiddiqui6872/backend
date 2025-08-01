import api from './api';
import { 
  Table, 
  TableInput, 
  TableLayout, 
  Floor, 
  Section,
  TableSession,
  TableAnalytics,
  BulkTableOperation,
  QRExportOptions 
} from '../types/table';

export const tableAPI = {
  // Table CRUD operations
  async getTables() {
    const response = await api.get<{ 
      tables: Table[], 
      stats: any 
    }>('/tables');
    return response.data;
  },

  async createTable(table: TableInput) {
    const response = await api.post<{ 
      success: boolean, 
      table: Table 
    }>('/tables', table);
    return response.data;
  },

  async updateTable(id: string, updates: Partial<TableInput>) {
    const response = await api.put<{ 
      success: boolean, 
      table: Table 
    }>(`/tables/${id}`, updates);
    return response.data;
  },

  async deleteTable(tableNumber: string) {
    const response = await api.delete(`/tables/${tableNumber}`);
    return response.data;
  },

  async updateTableStatus(tableNumber: string, status: string, waiterId?: string) {
    const response = await api.patch(`/tables/${tableNumber}/status`, {
      status,
      waiterId
    });
    return response.data;
  },

  // Bulk operations
  async bulkOperation(operation: BulkTableOperation) {
    const response = await api.post('/tables/bulk', operation);
    return response.data;
  },

  // Layout management
  async getLayout() {
    const response = await api.get<{ 
      success: boolean, 
      layout: TableLayout 
    }>('/tables/layout/config');
    return response.data;
  },

  async updateLayout(updates: Partial<TableLayout>) {
    const response = await api.put<{ 
      success: boolean, 
      layout: TableLayout 
    }>('/tables/layout/config', updates);
    return response.data;
  },

  // Floor management
  async addFloor(floor: Omit<Floor, 'id'>) {
    const response = await api.post('/tables/layout/floors', floor);
    return response.data;
  },

  async updateFloor(floorId: string, updates: Partial<Floor>) {
    const response = await api.put(`/tables/layout/floors/${floorId}`, updates);
    return response.data;
  },

  async deleteFloor(floorId: string) {
    const response = await api.delete(`/tables/layout/floors/${floorId}`);
    return response.data;
  },

  // Section management
  async addSection(floorId: string, section: Omit<Section, 'id'>) {
    const response = await api.post(`/tables/layout/floors/${floorId}/sections`, section);
    return response.data;
  },

  // QR Code operations
  async generateQRCode(tableNumber: string) {
    const response = await api.post(`/tables/${tableNumber}/qr-code`);
    return response.data;
  },

  async exportQRCodes(options: QRExportOptions & { tableIds?: string[] }) {
    const response = await api.post('/tables/qr-codes/export', options, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `table-qr-codes.${options.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Table sessions
  async getTableSessions(tableId: string, options?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }) {
    const response = await api.get<{
      success: boolean;
      sessions: TableSession[];
    }>(`/tables/${tableId}/sessions`, { params: options });
    return response.data;
  },

  async getCurrentSession(tableId: string) {
    const response = await api.get<{
      success: boolean;
      session: TableSession | null;
    }>(`/tables/${tableId}/current-session`);
    return response.data;
  },

  // Analytics
  async getTableAnalytics(tableId: string, period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const response = await api.get<{
      success: boolean;
      analytics: TableAnalytics;
    }>(`/tables/${tableId}/analytics`, { params: { period } });
    return response.data;
  },

  // Waiter assignment
  async assignWaiter(tableId: string, waiterId: string, role: 'primary' | 'assistant' = 'primary') {
    const response = await api.post(`/tables/${tableId}/assign-waiter`, {
      waiterId,
      role
    });
    return response.data;
  },

  async removeWaiter(tableId: string, waiterId: string) {
    const response = await api.post(`/tables/${tableId}/remove-waiter`, {
      waiterId
    });
    return response.data;
  },

  // Table by QR code
  async getTableByQRCode(qrCode: string) {
    const response = await api.get(`/tables/qr/${qrCode}`);
    return response.data;
  }
};