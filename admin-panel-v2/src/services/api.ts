import axios from 'axios';
import storageManager from '../utils/storageManager';

// Get tenant info from URL or subdomain-specific localStorage
const getTenantInfo = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlSubdomain = urlParams.get('subdomain');
  
  // Update storage manager's subdomain if URL has it
  if (urlSubdomain) {
    storageManager.setSubdomain(urlSubdomain);
  }
  
  let storedSubdomain = storageManager.getItem('subdomain');
  
  console.log('=== ADMIN PANEL API DEBUG ===');
  console.log('Current URL:', window.location.href);
  console.log('URL subdomain param:', urlSubdomain);
  console.log('Stored subdomain (isolated):', storedSubdomain);
  console.log('Storage subdomain:', storageManager.getSubdomain());
  
  // Store subdomain for display purposes only
  if (urlSubdomain && urlSubdomain !== storedSubdomain) {
    console.log('Storing subdomain for display:', urlSubdomain);
    storageManager.setItem('subdomain', urlSubdomain);
    storedSubdomain = urlSubdomain;
  }
  
  // If no subdomain in URL but we have one stored, add it to the URL
  if (!urlSubdomain && storedSubdomain && window.location.pathname.includes('/admin-panel')) {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('subdomain', storedSubdomain);
    window.history.replaceState({}, '', newUrl.toString());
    console.log('Added subdomain to URL:', storedSubdomain);
  }
  
  const subdomain = urlSubdomain || storedSubdomain;
  const tenantId = storageManager.getItem('tenantId');
  
  console.log('Final tenant info:');
  console.log('- Subdomain:', subdomain);
  console.log('- Tenant ID:', tenantId);
  console.log('=== END ADMIN PANEL API DEBUG ===');
  
  return { subdomain, tenantId };
};

// Create axios instance
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.gritservices.ae/api'
    : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add tenant headers to all requests
api.interceptors.request.use((config) => {
  const { subdomain, tenantId } = getTenantInfo();
  const token = storageManager.getItem('adminToken');
  
  console.log('=== API REQUEST INTERCEPTOR ===');
  console.log('Request URL:', config.url);
  console.log('Request Method:', config.method?.toUpperCase());
  
  // If sending FormData, remove the default Content-Type header
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    console.log('Removed Content-Type header for FormData upload');
  }
  
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
    console.log('Added X-Tenant-Id header:', tenantId);
  }
  
  // Always include subdomain for tenant identification
  if (subdomain) {
    config.headers['X-Tenant-Subdomain'] = subdomain;
    console.log('Added X-Tenant-Subdomain header:', subdomain);
    
    // Also add subdomain as query parameter for routes that need it
    if (config.url && !config.url.includes('?')) {
      config.url += `?subdomain=${subdomain}`;
      console.log('Added subdomain query param (new): ?subdomain=' + subdomain);
    } else if (config.url) {
      config.url += `&subdomain=${subdomain}`;
      console.log('Added subdomain query param (append): &subdomain=' + subdomain);
    }
  } else {
    console.log('⚠️  No subdomain available for request');
  }
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    console.log('Added Authorization header');
  }
  
  console.log('Final request URL:', config.url);
  console.log('Final headers:', {
    'X-Tenant-Id': config.headers['X-Tenant-Id'],
    'X-Tenant-Subdomain': config.headers['X-Tenant-Subdomain'],
    'Authorization': config.headers['Authorization'] ? 'Bearer [TOKEN]' : undefined
  });
  console.log('=== END API REQUEST INTERCEPTOR ===');
  
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storageManager.removeItem('adminToken');
      // Preserve subdomain when redirecting to login
      const subdomain = storageManager.getItem('subdomain');
      const queryParam = subdomain ? `?subdomain=${subdomain}` : '';
      window.location.href = `/admin-panel/login${queryParam}`;
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    // Check if it's super admin
    if (email === 'admin@gritservices.ae') {
      // Try super admin login first
      try {
        const response = await axios.post('/api/super-admin/login', { email, password });
        // Store super admin flag
        storageManager.setItem('isSuperAdmin', 'true');
        return response;
      } catch (error) {
        // If super admin login fails, continue with regular admin login
        console.log('Not a super admin, trying regular admin login');
      }
    }
    
    // Regular tenant admin login
    return api.post('/auth/admin/login', { email, password });
  },
  
  logout: () => 
    api.post('/auth/logout'),
  
  getProfile: () => 
    api.get('/auth/profile'),
};

// Team API
export const teamAPI = {
  getMembers: (params?: any) => 
    api.get('/admin/team/members', { params }),
  
  getMember: (id: string) =>
    api.get(`/admin/team/members/${id}`),
  
  addMember: (data: any) => 
    api.post('/admin/team/members', data),
  
  updateMember: (id: string, data: any) => 
    api.put(`/admin/team/members/${id}`, data),
  
  deleteMember: (id: string) => 
    api.delete(`/admin/team/members/${id}`),
    
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    // Don't set Content-Type header - let the browser set it with proper boundary
    return api.post(`/admin/team/members/${id}/photo`, formData);
  },
  
  uploadDocuments: (id: string, files: FileList, type: string, expiryDate?: string) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('documents', file));
    formData.append('type', type);
    if (expiryDate) formData.append('expiryDate', expiryDate);
    // Don't set Content-Type header - let the browser set it with proper boundary
    return api.post(`/admin/team/members/${id}/documents`, formData);
  },
  
  getStats: () =>
    api.get('/admin/team/stats'),
    
  // Team Member Password Update
  updateTeamMemberPassword: (id: string, newPassword: string) =>
    api.patch(`/admin/team/members/${id}/password`, { newPassword }),
    
  // Export team members
  exportMembers: (format: 'csv' | 'json' = 'csv') =>
    api.get(`/admin/team/export?format=${format}`, {
      responseType: format === 'csv' ? 'blob' : 'json'
    }),
    
  // Get document
  getDocument: (memberId: string, documentId: string) =>
    api.get(`/admin/team/members/${memberId}/documents/${documentId}`, {
      responseType: 'blob'
    }),
    
  // Delete document
  deleteDocument: (memberId: string, documentId: string) =>
    api.delete(`/admin/team/members/${memberId}/documents/${documentId}`),
    
  // Role Management
  getRoles: (params?: any) =>
    api.get('/admin/roles', { params }),
    
  getPermissions: () =>
    api.get('/admin/roles/permissions'),
    
  createRole: (data: any) =>
    api.post('/admin/roles', data),
    
  updateRole: (id: string, data: any) =>
    api.put(`/admin/roles/${id}`, data),
    
  deleteRole: (id: string) =>
    api.delete(`/admin/roles/${id}`),
    
  getRoleById: (id: string) =>
    api.get(`/admin/roles/${id}`),
};

// Menu API
// Shifts API
export const shiftsAPI = {
  getShifts: (params?: any) =>
    api.get('/admin/shifts', { params }),
  
  getShift: (id: string) =>
    api.get(`/admin/shifts/${id}`),
  
  createShift: (data: any) =>
    api.post('/admin/shifts', data),
  
  updateShift: (id: string, data: any) =>
    api.put(`/admin/shifts/${id}`, data),
  
  deleteShift: (id: string) =>
    api.delete(`/admin/shifts/${id}`),
  
  getStats: (params?: any) =>
    api.get('/admin/shifts/stats/overview', { params }),
  
  getEmployees: () =>
    api.get('/admin/team/members', { params: { isActive: true } }),
  
  // Clock in/out
  clockIn: (shiftId: string, data?: any) =>
    api.post(`/admin/shifts/${shiftId}/clock-in`, data),
  
  clockOut: (shiftId: string, data?: any) =>
    api.post(`/admin/shifts/${shiftId}/clock-out`, data),
  
  startBreak: (shiftId: string, data?: any) =>
    api.post(`/admin/shifts/${shiftId}/break/start`, data),
  
  endBreak: (shiftId: string, data?: any) =>
    api.post(`/admin/shifts/${shiftId}/break/end`, data),
  
  // Swap requests
  createSwapRequest: (shiftId: string, data: { requestedWith: string; reason: string }) =>
    api.post(`/admin/shifts/${shiftId}/swap-request`, data),
  
  respondToSwapRequest: (shiftId: string, data: { status: 'approved' | 'rejected' }) =>
    api.put(`/admin/shifts/${shiftId}/swap-request`, data),
  
  // Notifications
  getNotifications: (params?: any) =>
    api.get('/admin/shifts/notifications', { params }),
  
  markNotificationAsRead: (notificationId: string) =>
    api.put(`/admin/shifts/notifications/${notificationId}/read`),
  
  getNotificationPreferences: () =>
    api.get('/admin/shifts/notifications/preferences'),
  
  updateNotificationPreferences: (data: any) =>
    api.put('/admin/shifts/notifications/preferences', data),
  
  getActiveShift: (employeeId: string) =>
    api.get('/admin/shifts/active', { params: { employee: employeeId, date: new Date().toISOString().split('T')[0] } }),
  
  requestSwap: (shiftId: string, data: any) =>
    api.post(`/admin/shifts/${shiftId}/swap-request`, data),
  
  respondToSwap: (shiftId: string, status: 'approved' | 'rejected') =>
    api.put(`/admin/shifts/${shiftId}/swap-request`, { status }),
};

// Shift Templates API
export const shiftTemplatesAPI = {
  getTemplates: (params?: any) =>
    api.get('/admin/shift-templates', { params }),
  
  getTemplate: (id: string) =>
    api.get(`/admin/shift-templates/${id}`),
  
  createTemplate: (data: any) =>
    api.post('/admin/shift-templates', data),
  
  updateTemplate: (id: string, data: any) =>
    api.put(`/admin/shift-templates/${id}`, data),
  
  deleteTemplate: (id: string) =>
    api.delete(`/admin/shift-templates/${id}`),
  
  applyTemplate: (id: string, data: { startDate: string; employees?: string[] }) =>
    api.post(`/admin/shift-templates/${id}/apply`, data),
  
  getPopularTemplates: () =>
    api.get('/admin/shift-templates/stats/popular'),
};

export const menuAPI = {
  getCategories: () => 
    api.get('/admin/categories'),
  
  addCategory: (data: any) => {
    // If uploadImage is present, send as JSON (base64)
    if (data.uploadImage) {
      return api.post('/admin/categories', data);
    }
    // Otherwise, create FormData for file upload
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/admin/categories', formData);
  },
  
  updateCategory: (id: string, data: any) => {
    // If uploadImage is present, send as JSON (base64)
    if (data.uploadImage) {
      return api.put(`/admin/categories/${id}`, data);
    }
    // Otherwise, create FormData for file upload
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/admin/categories/${id}`, formData);
  },
  
  deleteCategory: (id: string) => 
    api.delete(`/admin/categories/${id}`),
  
  getItems: (params?: { all?: boolean; limit?: number }) => 
    api.get('/admin/menu', { params: { ...params, all: true } }),
  
  addItem: (data: any) => {
    // If uploadImage is present, send as JSON (base64)
    if (data.uploadImage) {
      return api.post('/admin/menu', data);
    }
    // Otherwise, create FormData for file upload
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (key === 'allergens' || key === 'dietary' || key === 'tags') {
          // Convert arrays to JSON strings for FormData
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return api.post('/admin/menu', formData);
  },
  
  updateItem: (id: string, data: any) => {
    // If uploadImage is present, send as JSON (base64)
    if (data.uploadImage) {
      return api.put(`/admin/menu/${id}`, data);
    }
    // Otherwise, create FormData for file upload
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (key === 'allergens' || key === 'dietary' || key === 'tags') {
          // Convert arrays to JSON strings for FormData
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return api.put(`/admin/menu/${id}`, formData);
  },
  
  deleteItem: (id: string) => 
    api.delete(`/admin/menu/${id}`),
  
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/admin/menu/upload', formData);
  },
  
  // Bulk operations
  bulkImportCategories: (data: any[], format: 'csv' | 'json') =>
    api.post('/admin/categories/bulk-import', { data, format }),
  
  bulkImportItems: (data: any[], format: 'csv' | 'json') =>
    api.post('/admin/menu/bulk-import', { data, format }),
  
  bulkImportZip: (formData: FormData) =>
    api.post('/admin/menu/bulk-import-zip', formData),
  
  exportCategories: (format: 'csv' | 'json') =>
    api.get(`/admin/categories/export?format=${format}`),
  
  exportItems: (format: 'csv' | 'json') =>
    api.get(`/admin/menu/export?format=${format}`),
};

// Stock API
export const stockAPI = {
  getStockLevels: (params?: any) =>
    api.get('/admin/stock/levels', { params }),
    
  getValueReport: () =>
    api.get('/admin/stock/value-report'),
    
  getTransactions: (params?: any) =>
    api.get('/admin/stock/transactions', { params }),
    
  getTransactionSummary: (params?: any) =>
    api.get('/admin/stock/transactions/summary', { params }),
    
  adjustStock: (data: any) =>
    api.post('/admin/stock/adjust', data),
    
  recordWaste: (data: any) =>
    api.post('/admin/stock/waste', data),
    
  updateSettings: (menuItemId: string, data: any) =>
    api.put(`/admin/stock/settings/${menuItemId}`, data),
    
  getLowStockItems: (threshold?: number) =>
    api.get('/admin/stock/low-stock', { params: { threshold } }),
    
  batchUpdate: (data: any) =>
    api.post('/admin/stock/batch-update', data),
};

// Ingredients API
export const ingredientsAPI = {
  getIngredients: (params?: any) =>
    api.get('/admin/ingredients', { params }),
    
  getIngredient: (id: string) =>
    api.get(`/admin/ingredients/${id}`),
    
  createIngredient: (data: any) =>
    api.post('/admin/ingredients', data),
    
  updateIngredient: (id: string, data: any) =>
    api.put(`/admin/ingredients/${id}`, data),
    
  deleteIngredient: (id: string) =>
    api.delete(`/admin/ingredients/${id}`),
    
  purchaseIngredient: (id: string, data: any) =>
    api.post(`/admin/ingredients/${id}/purchase`, data),
    
  getTransactions: (id: string, params?: any) =>
    api.get(`/admin/ingredients/${id}/transactions`, { params }),
    
  getBatches: (id: string, params?: any) =>
    api.get(`/admin/ingredients/${id}/batches`, { params }),
    
  getExpiringIngredients: (days?: number) =>
    api.get('/admin/ingredients/expiring/list', { params: { days } }),
    
  bulkImport: (data: any) =>
    api.post('/admin/ingredients/bulk-import', data),
};

// Recipes API  
export const recipesAPI = {
  getRecipes: () =>
    api.get('/admin/recipes'),
    
  getRecipeByMenuItem: (menuItemId: string) =>
    api.get(`/admin/recipes/menu-item/${menuItemId}`),
    
  createOrUpdateRecipe: (data: any) =>
    api.post('/admin/recipes', data),
    
  deleteRecipe: (id: string) =>
    api.delete(`/admin/recipes/${id}`),
    
  checkAvailability: (id: string) =>
    api.get(`/admin/recipes/${id}/availability`),
    
  calculateNutrition: (id: string) =>
    api.get(`/admin/recipes/${id}/nutrition`),
    
  bulkCreate: (data: any) =>
    api.post('/admin/recipes/bulk-create', data),
};

// Pricing Rules API
export const pricingRulesAPI = {
  getRules: (params?: any) =>
    api.get('/admin/pricing-rules', { params }),
    
  getMenuItemRules: (menuItemId: string) =>
    api.get(`/admin/pricing-rules/menu-item/${menuItemId}`),
    
  calculatePrice: (data: any) =>
    api.post('/admin/pricing-rules/calculate-price', data),
    
  createRule: (data: any) =>
    api.post('/admin/pricing-rules', data),
    
  updateRule: (id: string, data: any) =>
    api.put(`/admin/pricing-rules/${id}`, data),
    
  deleteRule: (id: string) =>
    api.delete(`/admin/pricing-rules/${id}`),
    
  toggleActive: (id: string) =>
    api.patch(`/admin/pricing-rules/${id}/toggle-active`),
    
  bulkCreate: (data: any) =>
    api.post('/admin/pricing-rules/bulk-create', data),
};

// Combos API
export const combosAPI = {
  getCombos: (params?: any) =>
    api.get('/admin/combos', { params }),
    
  getCombo: (id: string) =>
    api.get(`/admin/combos/${id}`),
    
  createCombo: (data: any) =>
    api.post('/admin/combos', data),
    
  updateCombo: (id: string, data: any) =>
    api.put(`/admin/combos/${id}`, data),
    
  deleteCombo: (id: string) =>
    api.delete(`/admin/combos/${id}`),
    
  toggleActive: (id: string) =>
    api.patch(`/admin/combos/${id}/toggle-active`),
    
  checkAvailability: (id: string) =>
    api.get(`/admin/combos/${id}/availability`),
    
  bulkCreate: (data: any) =>
    api.post('/admin/combos/bulk-create', data),
};

// Modifier Groups API
export const modifiersAPI = {
  getModifierGroups: (params?: any) =>
    api.get('/admin/modifiers', { params }),
    
  getModifierGroup: (id: string) =>
    api.get(`/admin/modifiers/${id}`),
    
  createModifierGroup: (data: any) =>
    api.post('/admin/modifiers', data),
    
  updateModifierGroup: (id: string, data: any) =>
    api.put(`/admin/modifiers/${id}`, data),
    
  deleteModifierGroup: (id: string) =>
    api.delete(`/admin/modifiers/${id}`),
    
  addToMenuItem: (modifierId: string, menuItemId: string, displayOrder?: number) =>
    api.post(`/admin/modifiers/${modifierId}/menu-items/${menuItemId}`, { displayOrder }),
    
  removeFromMenuItem: (modifierId: string, menuItemId: string) =>
    api.delete(`/admin/modifiers/${modifierId}/menu-items/${menuItemId}`),
    
  getAnalytics: (id: string) =>
    api.get(`/admin/modifiers/${id}/analytics`),
};

// Menu Analytics API
export const menuAnalyticsAPI = {
  getProfitability: (params?: any) =>
    api.get('/admin/menu-analytics/profitability', { params }),
    
  getSalesVelocity: (params?: any) =>
    api.get('/admin/menu-analytics/sales-velocity', { params }),
    
  getMenuEngineering: (params?: any) =>
    api.get('/admin/menu-analytics/menu-engineering', { params }),
};

// Channels API
export const channelsAPI = {
  getChannels: () =>
    api.get('/admin/channels'),
    
  getChannel: (id: string) =>
    api.get(`/admin/channels/${id}`),
    
  createChannel: (data: any) =>
    api.post('/admin/channels', data),
    
  updateChannel: (id: string, data: any) =>
    api.put(`/admin/channels/${id}`, data),
    
  deleteChannel: (id: string) =>
    api.delete(`/admin/channels/${id}`),
    
  initializeChannels: () =>
    api.post('/admin/channels/initialize'),
    
  reorderChannels: (channelOrders: { id: string; displayOrder: number }[]) =>
    api.put('/admin/channels/reorder', { channelOrders }),
    
  getChannelMenuItems: (channelId: string, params?: any) =>
    api.get(`/admin/channels/${channelId}/menu-items`, { params }),
    
  updateChannelMenuItem: (channelId: string, itemId: string, data: any) =>
    api.put(`/admin/channels/${channelId}/menu-items/${itemId}`, data),
    
  bulkUpdateChannelItems: (channelId: string, action: string, itemIds: string[], data?: any) =>
    api.put(`/admin/channels/${channelId}/menu-items/bulk`, { action, itemIds, data }),
};

// Menu Schedules API
export const menuSchedulesAPI = {
  getSchedules: (params?: any) =>
    api.get('/admin/menu-schedules', { params }),
    
  getSchedule: (id: string) =>
    api.get(`/admin/menu-schedules/${id}`),
    
  getActiveMenu: (channelId?: string) =>
    api.get('/admin/menu-schedules/active', { params: { channelId } }),
    
  createSchedule: (data: any) =>
    api.post('/admin/menu-schedules', data),
    
  updateSchedule: (id: string, data: any) =>
    api.put(`/admin/menu-schedules/${id}`, data),
    
  deleteSchedule: (id: string) =>
    api.delete(`/admin/menu-schedules/${id}`),
    
  initializeDefaults: () =>
    api.post('/admin/menu-schedules/initialize'),
    
  checkItemAvailability: (itemId: string, channelId?: string) =>
    api.get(`/admin/menu-schedules/check-availability/${itemId}`, { params: { channelId } }),
};

// Tables API
export const tablesAPI = {
  getTables: () => 
    api.get('/admin/tables'),
  
  addTable: (data: any) => 
    api.post('/admin/tables', data),
  
  updateTable: (id: string, data: any) => 
    api.put(`/admin/tables/${id}`, data),
  
  deleteTable: (id: string) => 
    api.delete(`/admin/tables/${id}`),
  
  generateQR: (tableNumber: string) => 
    api.get(`/admin/tables/${tableNumber}/qr`),
  
  updateTableStatus: (tableNumber: string, status: string) =>
    api.patch(`/admin/tables/${tableNumber}/status`, { status }),
};

// Orders API
export const ordersAPI = {
  getOrders: (params?: any) => 
    api.get('/orders', { params }),
    
  getOrderFlow: () => 
    api.get('/orders/flow'),
  
  updateOrderStatus: (id: string, status: string) => 
    api.patch(`/orders/${id}/status`, { status }),
  
  getOrderDetails: (id: string) => 
    api.get(`/orders/${id}`),
  
  processPayment: (id: string, data: { paymentMethod: string; amountPaid: number; tip: number }) =>
    api.post(`/orders/${id}/payment`, data),
  
  updateItemStatus: (orderId: string, itemId: string, status: string) =>
    api.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
  
  addItem: (orderId: string, item: any) =>
    api.post(`/orders/${orderId}/items`, item),
  
  updateItem: (orderId: string, itemId: string, updates: any) =>
    api.put(`/orders/${orderId}/items/${itemId}`, updates),
  
  removeItem: (orderId: string, itemId: string) =>
    api.delete(`/orders/${orderId}/items/${itemId}`),
  
  cancelOrder: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  
  createOrder: (data: any) =>
    api.post('/orders', data),
  
  updateOrder: (id: string, data: any) =>
    api.put(`/orders/${id}`, data),
  
  getChefPerformance: (params?: any) =>
    api.get('/admin/analytics/chef-performance', { params }),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: () => 
    api.get('/admin/analytics/dashboard'),
  
  getSalesData: (period: string) => 
    api.get(`/admin/analytics/sales?period=${period}`),
  
  getPopularItems: () => 
    api.get('/admin/analytics/popular-items'),
  
  getRevenue: (period: string) => 
    api.get(`/admin/analytics/revenue?period=${period}`),
  
  getHeatMapData: (params?: any) =>
    api.get('/admin/analytics/heat-map', { params }),
  
  getTrendAnalysis: (params?: any) =>
    api.get('/admin/analytics/trends', { params }),
  
  getPrepTimePredictions: (data: any) =>
    api.post('/admin/analytics/prep-time-predictions', data),
  
  getStationLoadData: () =>
    api.get('/admin/stations/load-data'),
  
  reassignStationItem: (data: any) =>
    api.post('/admin/stations/reassign-item', data),
  
  batchReassignItems: (reassignments: any[]) =>
    api.post('/admin/stations/batch-reassign', { reassignments }),
  
  // AI Predictive Analytics
  getRevenuePredictions: (params?: any) =>
    api.get('/admin/analytics/revenue-predictions', { params }),
  
  getDemandForecasts: (params?: any) =>
    api.get('/admin/analytics/demand-forecasts', { params }),
  
  getAnomalies: (params?: any) =>
    api.get('/admin/analytics/anomalies', { params }),
  
  getAIInsights: (params?: any) =>
    api.get('/admin/analytics/ai-insights', { params }),
  
  // Real-Time Performance
  getRealTimeMetrics: () =>
    api.get('/admin/analytics/real-time-metrics'),
  
  // Customer Behavior Analytics
  getCustomerSegments: (params?: any) =>
    api.get('/admin/analytics/customer-segments', { params }),
  
  getCustomerJourney: (params?: any) =>
    api.get('/admin/analytics/customer-journey', { params }),
  
  getLoyaltyMetrics: (params?: any) =>
    api.get('/admin/analytics/loyalty-metrics', { params }),
  
  getSentimentAnalysis: (params?: any) =>
    api.get('/admin/analytics/sentiment-analysis', { params }),
  
  getBehaviorPatterns: (params?: any) =>
    api.get('/admin/analytics/behavior-patterns', { params }),
  
  // Competitive Intelligence
  getCompetitors: (params?: any) =>
    api.get('/admin/analytics/competitors', { params }),
  
  getMarketPosition: (params?: any) =>
    api.get('/admin/analytics/market-position', { params }),
  
  getPricingOpportunities: (params?: any) =>
    api.get('/admin/analytics/pricing-opportunities', { params }),
  
  getMarketTrends: (params?: any) =>
    api.get('/admin/analytics/market-trends', { params }),
  
  getBenchmarkData: (params?: any) =>
    api.get('/admin/analytics/benchmark-data', { params }),
  
  // Financial Deep Dive
  getPLStatement: (params?: any) =>
    api.get('/admin/analytics/pl-statement', { params }),
  
  getCostBreakdown: (params?: any) =>
    api.get('/admin/analytics/cost-breakdown', { params }),
  
  getROIMetrics: (params?: any) =>
    api.get('/admin/analytics/roi-metrics', { params }),
  
  getCashFlow: (params?: any) =>
    api.get('/admin/analytics/cash-flow', { params }),
  
  getFinancialRatios: (params?: any) =>
    api.get('/admin/analytics/financial-ratios', { params }),
  
  getFinancialSummary: (params?: any) =>
    api.get('/admin/analytics/financial-summary', { params }),
    
  // Employee Performance Analytics
  getEmployeePerformance: (params?: any) => 
    api.get('/admin/analytics/employee-performance', { params }),
  
  getTeamPerformance: (params?: any) => 
    api.get('/admin/analytics/team-performance', { params }),
  
  getPerformanceLeaderboard: (params?: any) => 
    api.get('/admin/analytics/performance-leaderboard', { params }),
  
  getEmployeeGameStats: (employeeId: string) => 
    api.get(`/admin/analytics/employee/${employeeId}/game-stats`),
  
  updateEmployeeAchievement: (employeeId: string, achievementId: string, data: any) => 
    api.put(`/admin/analytics/employee/${employeeId}/achievement/${achievementId}`, data),
};

// Helper to clear tenant data when switching restaurants
export const clearTenantData = () => {
  storageManager.clearSubdomainData();
};

// Category API (alias for menuAPI category methods)
export const categoryAPI = {
  getCategories: menuAPI.getCategories,
  addCategory: menuAPI.addCategory,
  updateCategory: menuAPI.updateCategory,
  deleteCategory: menuAPI.deleteCategory,
};

export default api;