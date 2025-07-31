import axios from 'axios';

// Get tenant info from URL or localStorage
const getTenantInfo = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subdomain = urlParams.get('subdomain') || localStorage.getItem('subdomain');
  const tenantId = localStorage.getItem('tenantId');
  
  return { subdomain, tenantId };
};

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add tenant headers to all requests
api.interceptors.request.use((config) => {
  const { subdomain, tenantId } = getTenantInfo();
  const token = localStorage.getItem('adminToken');
  
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  // Always include subdomain for tenant identification
  if (subdomain) {
    config.headers['X-Tenant-Subdomain'] = subdomain;
    // Also add subdomain as query parameter for routes that need it
    if (config.url && !config.url.includes('?')) {
      config.url += `?subdomain=${subdomain}`;
    } else if (config.url) {
      config.url += `&subdomain=${subdomain}`;
    }
  }
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin-panel/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/admin/login', { email, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getProfile: () => 
    api.get('/auth/profile'),
};

// Team API
export const teamAPI = {
  getMembers: () => 
    api.get('/admin/users'),
  
  addMember: (data: any) => 
    api.post('/admin/users', data),
  
  updateMember: (id: string, data: any) => 
    api.put(`/admin/users/${id}`, data),
  
  deleteMember: (id: string) => 
    api.delete(`/admin/users/${id}`),
};

// Menu API
export const menuAPI = {
  getCategories: () => 
    api.get('/admin/categories'),
  
  addCategory: (data: any) => 
    api.post('/admin/categories', data),
  
  updateCategory: (id: string, data: any) => 
    api.put(`/admin/categories/${id}`, data),
  
  deleteCategory: (id: string) => 
    api.delete(`/admin/categories/${id}`),
  
  getItems: () => 
    api.get('/admin/menu'),
  
  addItem: (data: any) => 
    api.post('/admin/menu', data),
  
  updateItem: (id: string, data: any) => 
    api.put(`/admin/menu/${id}`, data),
  
  deleteItem: (id: string) => 
    api.delete(`/admin/menu/${id}`),
  
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/admin/menu/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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

export default api;