const Tenant = require('../models/Tenant');

/**
 * Public tenant context middleware
 * Identifies tenant for public routes (no authentication required)
 * Uses only enterprise tenant isolation approach
 */

// Cache for tenant lookups to reduce database queries
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const publicTenantContext = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenant = null;

    // 1. Check for tenant ID in header (highest priority)
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
      const cacheKey = `tenant:${tenantId}`;
      
      // Check cache first
      if (tenantCache.has(cacheKey)) {
        const cached = tenantCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          tenant = cached.data;
        }
      }
      
      if (!tenant) {
        tenant = await Tenant.findOne({ tenantId, status: 'active' });
        if (tenant) {
          tenantCache.set(cacheKey, {
            data: tenant,
            timestamp: Date.now()
          });
        }
      }
    }

    // 2. Check for subdomain in header
    if (!tenant && req.headers['x-tenant-subdomain']) {
      const subdomain = req.headers['x-tenant-subdomain'];
      const cacheKey = `subdomain:${subdomain}`;
      
      if (tenantCache.has(cacheKey)) {
        const cached = tenantCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          tenant = cached.data;
        }
      }
      
      if (!tenant) {
        tenant = await Tenant.findOne({ subdomain, status: 'active' });
        if (tenant) {
          tenantCache.set(cacheKey, {
            data: tenant,
            timestamp: Date.now()
          });
        }
      }
    }

    // 3. Check query parameter (for debugging/admin panel)
    if (!tenant && req.query.subdomain) {
      const subdomain = req.query.subdomain;
      tenant = await Tenant.findOne({ subdomain, status: 'active' });
    }

    // 4. Extract from host header (subdomain routing)
    if (!tenant) {
      const host = req.get('host');
      if (host) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'localhost' && subdomain !== 'api') {
          tenant = await Tenant.findOne({ subdomain, status: 'active' });
        }
      }
    }

    if (!tenant) {
      return res.status(400).json({ 
        error: 'Tenant not found',
        message: 'Unable to identify restaurant. Please ensure you are using the correct URL or provide tenant information.'
      });
    }

    // Set tenant context
    req.tenant = {
      tenantId: tenant.tenantId,
      name: tenant.name,
      subdomain: tenant.subdomain,
      subscription: tenant.subscription,
      settings: tenant.settings
    };
    req.tenantId = tenant.tenantId;

    next();
  } catch (error) {
    console.error('Public tenant context error:', error);
    res.status(500).json({ 
      error: 'System error',
      message: 'Failed to identify tenant'
    });
  }
};

// Clear expired cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tenantCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      tenantCache.delete(key);
    }
  }
}, 60 * 1000);

module.exports = publicTenantContext;