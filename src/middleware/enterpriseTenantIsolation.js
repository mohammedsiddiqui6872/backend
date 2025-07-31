const Tenant = require('../models/Tenant');
const asyncLocalStorage = require('../utils/asyncLocalStorage');

/**
 * Enterprise-grade tenant isolation middleware
 * Ensures complete data isolation between tenants with multiple verification layers
 */

// Cache for tenant lookups to reduce database queries
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of tenantCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      tenantCache.delete(key);
    }
  }
};

// Clear cache periodically
setInterval(clearExpiredCache, 60 * 1000); // Every minute

const enterpriseTenantIsolation = async (req, res, next) => {
  try {
    // Layer 1: Extract tenant information from authenticated user
    const userTenantId = req.user?.tenantId;
    
    if (!userTenantId) {
      console.error('No tenant ID in authenticated user');
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'User not associated with any tenant'
      });
    }

    // Layer 2: Get tenant from database with caching
    let tenant = null;
    const cacheKey = `tenant:${userTenantId}`;
    
    if (tenantCache.has(cacheKey)) {
      const cached = tenantCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        tenant = cached.data;
      } else {
        tenantCache.delete(cacheKey);
      }
    }

    if (!tenant) {
      tenant = await Tenant.findOne({ 
        tenantId: userTenantId,
        status: 'active'
      });

      if (tenant) {
        tenantCache.set(cacheKey, {
          data: tenant,
          timestamp: Date.now()
        });
      }
    }

    if (!tenant) {
      console.error('Tenant not found or inactive:', userTenantId);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Invalid or inactive tenant'
      });
    }

    // Layer 3: Verify subdomain matches (if provided)
    const requestedSubdomain = req.headers['x-tenant-subdomain'] || req.query.subdomain;
    if (requestedSubdomain && requestedSubdomain !== tenant.subdomain) {
      console.error('Subdomain mismatch:', requestedSubdomain, 'vs', tenant.subdomain);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Invalid tenant access attempt'
      });
    }

    // Layer 4: Set tenant context securely
    req.tenant = {
      tenantId: tenant.tenantId,
      name: tenant.name,
      subdomain: tenant.subdomain,
      subscription: tenant.subscription,
      settings: tenant.settings
    };
    req.tenantId = tenant.tenantId;

    // Layer 5: Set async local storage for model-level isolation
    asyncLocalStorage.run({ 
      tenantId: tenant.tenantId,
      userId: req.user._id,
      requestId: req.id || Math.random().toString(36).substr(2, 9)
    }, () => {
      next();
    });

  } catch (error) {
    console.error('Enterprise tenant isolation error:', error);
    res.status(500).json({ 
      error: 'System error',
      message: 'Failed to verify tenant access'
    });
  }
};

// Strict tenant isolation - use this for sensitive operations
const strictTenantIsolation = async (req, res, next) => {
  // First apply enterprise isolation
  await enterpriseTenantIsolation(req, res, () => {
    // Additional verification for strict mode
    const contextTenantId = asyncLocalStorage.getStore()?.tenantId;
    
    if (!contextTenantId || contextTenantId !== req.tenant.tenantId) {
      console.error('Strict isolation failed: Context mismatch');
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Tenant context verification failed'
      });
    }

    // Verify user still belongs to tenant (real-time check)
    const User = require('../models/User');
    User.findById(req.user._id).then(user => {
      if (!user || user.tenantId !== req.tenant.tenantId) {
        console.error('Strict isolation failed: User tenant mismatch');
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'User tenant verification failed'
        });
      }
      next();
    }).catch(err => {
      console.error('Strict isolation error:', err);
      res.status(500).json({ 
        error: 'System error',
        message: 'Failed to verify user access'
      });
    });
  });
};

// Helper to get current tenant context
const getCurrentTenant = () => {
  const store = asyncLocalStorage.getStore();
  return store ? {
    tenantId: store.tenantId,
    userId: store.userId,
    requestId: store.requestId
  } : null;
};

// Middleware to log tenant access for audit
const auditTenantAccess = (req, res, next) => {
  const tenant = getCurrentTenant();
  if (tenant) {
    console.log(`[AUDIT] User ${tenant.userId} accessing tenant ${tenant.tenantId} - ${req.method} ${req.path}`);
  }
  next();
};

module.exports = {
  enterpriseTenantIsolation,
  strictTenantIsolation,
  getCurrentTenant,
  auditTenantAccess
};