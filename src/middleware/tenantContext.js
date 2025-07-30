const Tenant = require('../models/Tenant');
const asyncLocalStorage = require('../utils/asyncLocalStorage');

// Middleware to identify and set tenant context
const tenantContext = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenant = null;

    // 1. Check for tenant ID in header (for API calls)
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId) {
      tenant = await Tenant.findOne({ tenantId: headerTenantId, status: 'active' });
    }

    // 2. Extract from subdomain
    if (!tenant) {
      const host = req.get('host') || '';
      const subdomain = host.split('.')[0];
      
      // Skip if localhost or IP address
      if (subdomain && !['localhost', '127', '0', 'api', 'admin', 'www'].includes(subdomain)) {
        tenant = await Tenant.findBySubdomain(subdomain);
      }
    }

    // 3. Check for custom domain
    if (!tenant && req.get('host')) {
      tenant = await Tenant.findByDomain(req.get('host'));
    }

    // 4. For super admin routes, allow without tenant
    if (req.path.startsWith('/api/super-admin') || req.path.startsWith('/api/public')) {
      // Super admin and public routes don't need tenant context
      return next();
    }

    // If no tenant found and it's a tenant-specific route, return error
    if (!tenant) {
      return res.status(404).json({ 
        error: 'Restaurant not found',
        message: 'Please check your URL and try again'
      });
    }

    if (tenant) {
      // Check if tenant is active
      if (tenant.status !== 'active') {
        return res.status(403).json({ 
          error: 'Restaurant suspended',
          message: 'This restaurant account has been suspended. Please contact support.'
        });
      }

      // Set tenant in request
      req.tenant = tenant;
      req.tenantId = tenant.tenantId;

      // Set tenant in async local storage for model access
      asyncLocalStorage.run({ tenantId: tenant.tenantId }, () => {
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    console.error('Tenant context error:', error);
    res.status(500).json({ 
      error: 'System error',
      message: 'Failed to identify restaurant'
    });
  }
};

// Middleware to ensure tenant isolation in queries
const ensureTenantIsolation = (req, res, next) => {
  if (!req.tenantId && !req.path.startsWith('/api/public') && !req.path.startsWith('/api/admin/super')) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Tenant context required'
    });
  }
  next();
};

// Helper to get current tenant ID from async local storage
const getCurrentTenantId = () => {
  const store = asyncLocalStorage.getStore();
  return store?.tenantId;
};

module.exports = {
  tenantContext,
  ensureTenantIsolation,
  getCurrentTenantId
};