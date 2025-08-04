import api from '../services/api';

interface TenantInfo {
  tenantId: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  configuration?: any;
}

class TenantService {
  private tenantCache: Map<string, TenantInfo> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastFetch: number = 0;

  /**
   * Get tenant information from subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<TenantInfo | null> {
    // Check cache first
    const cached = this.tenantCache.get(subdomain);
    if (cached && Date.now() - this.lastFetch < this.cacheExpiry) {
      return cached;
    }

    try {
      // Fetch from backend
      const response = await api.get(`/super-admin/restaurants/subdomain/${subdomain}`);
      const tenant = response.data;
      
      if (tenant) {
        this.tenantCache.set(subdomain, tenant);
        this.lastFetch = Date.now();
        return tenant;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch tenant info:', error);
      // Fallback to cache if available
      return cached || null;
    }
  }

  /**
   * Get current tenant from URL
   */
  getCurrentTenant(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const subdomain = urlParams.get('subdomain');
    
    if (subdomain) {
      return subdomain;
    }

    // Try to extract from hostname
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // For subdomains like mughlaimagic.gritservices.ae
    if (parts.length >= 3 && parts[1] === 'gritservices') {
      return parts[0];
    }
    
    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return localStorage.getItem('subdomain') || null;
    }
    
    return null;
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(subdomain: string): Promise<boolean> {
    const tenant = await this.getTenantBySubdomain(subdomain);
    return tenant !== null && tenant.isActive;
  }

  /**
   * Clear tenant cache
   */
  clearCache(): void {
    this.tenantCache.clear();
    this.lastFetch = 0;
  }

  /**
   * Get all active tenants (for super admin)
   */
  async getAllTenants(): Promise<TenantInfo[]> {
    try {
      const response = await api.get('/super-admin/restaurants');
      return response.data.filter((tenant: TenantInfo) => tenant.isActive);
    } catch (error) {
      console.error('Failed to fetch all tenants:', error);
      return [];
    }
  }
}

export const tenantService = new TenantService();