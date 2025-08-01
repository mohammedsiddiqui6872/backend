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
  
  getActiveShift: (employeeId: string) =>
    api.get('/admin/shifts/active', { params: { employee: employeeId, date: new Date().toISOString().split('T')[0] } }),
  
  clockIn: (shiftId: string) =>
    api.post(`/admin/shifts/${shiftId}/clock-in`),
  
  clockOut: (shiftId: string) =>
    api.post(`/admin/shifts/${shiftId}/clock-out`),
  
  startBreak: (shiftId: string, type: 'short' | 'meal') =>
    api.post(`/admin/shifts/${shiftId}/break/start`, { type }),
  
  endBreak: (shiftId: string) =>
    api.post(`/admin/shifts/${shiftId}/break/end`),
  
  requestSwap: (shiftId: string, data: any) =>
    api.post(`/admin/shifts/${shiftId}/swap-request`, data),
  
  respondToSwap: (shiftId: string, status: 'approved' | 'rejected') =>
    api.put(`/admin/shifts/${shiftId}/swap-request`, { status }),
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
  
  getItems: () => 
    api.get('/admin/menu'),
  
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
};

// Orders API
export const ordersAPI = {
  getOrders: (params?: any) => 
    api.get('/orders', { params }),
  
  updateOrderStatus: (id: string, status: string) => 
    api.patch(`/orders/${id}/status`, { status }),
  
  getOrderDetails: (id: string) => 
    api.get(`/orders/${id}`),
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
};

// Helper to clear tenant data when switching restaurants
export const clearTenantData = () => {
  storageManager.clearSubdomainData();
};

export default api;