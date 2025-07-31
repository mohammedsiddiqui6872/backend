const Tenant = require('../models/Tenant');
const asyncLocalStorage = require('../utils/asyncLocalStorage');

// Middleware to identify and set tenant context
const tenantContext = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenant = null;

    // Debug logging
    console.log('\n=== TENANT CONTEXT DEBUG ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Path:', req.path);
    console.log('Request Method:', req.method);
    console.log('Host:', req.get('host'));
    console.log('Headers - x-tenant-id:', req.headers['x-tenant-id']);
    console.log('Headers - x-tenant-subdomain:', req.headers['x-tenant-subdomain']);
    console.log('Query - subdomain:', req.query.subdomain);

    // 1. Check for tenant ID in header (for API calls)
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId) {
      console.log('Step 1: Checking tenant ID in header:', headerTenantId);
      tenant = await Tenant.findOne({ tenantId: headerTenantId, status: 'active' });
      if (tenant) {
        console.log('✓ Found tenant by header tenant ID:', tenant.name, '(', tenant.tenantId, ')');
      } else {
        console.log('✗ No tenant found for header tenant ID:', headerTenantId);
      }
    }

    // 2. Check for subdomain in header (for admin panel API calls)
    if (!tenant && req.headers['x-tenant-subdomain']) {
      console.log('Step 2: Checking subdomain in header:', req.headers['x-tenant-subdomain']);
      tenant = await Tenant.findBySubdomain(req.headers['x-tenant-subdomain']);
      if (tenant) {
        console.log('✓ Found tenant by header subdomain:', tenant.name, '(', tenant.tenantId, ')');
      } else {
        console.log('✗ No tenant found for header subdomain:', req.headers['x-tenant-subdomain']);
      }
    }

    // 3. Check for subdomain in query parameter (for admin panel)
    if (!tenant && req.query.subdomain) {
      console.log('Step 3: Checking subdomain in query parameter:', req.query.subdomain);
      tenant = await Tenant.findBySubdomain(req.query.subdomain);
      if (tenant) {
        console.log('✓ Found tenant by query subdomain:', tenant.name, '(', tenant.tenantId, ')');
      } else {
        console.log('✗ No tenant found for query subdomain:', req.query.subdomain);
      }
    }

    // 4. Extract from subdomain
    if (!tenant) {
      const host = req.get('host') || '';
      const subdomain = host.split('.')[0];
      console.log('Step 4: Extracting subdomain from host:', host, '-> subdomain:', subdomain);
      
      // Skip if localhost or IP address
      if (subdomain && !['localhost', '127', '0', 'api', 'admin', 'www'].includes(subdomain)) {
        console.log('Step 4: Looking up tenant by extracted subdomain:', subdomain);
        tenant = await Tenant.findBySubdomain(subdomain);
        if (tenant) {
          console.log('✓ Found tenant by extracted subdomain:', tenant.name, '(', tenant.tenantId, ')');
        } else {
          console.log('✗ No tenant found for extracted subdomain:', subdomain);
        }
      } else {
        console.log('Step 4: Skipping subdomain lookup for:', subdomain);
      }
    }

    // 5. Check for custom domain
    if (!tenant && req.get('host')) {
      console.log('Step 5: Checking custom domain:', req.get('host'));
      tenant = await Tenant.findByDomain(req.get('host'));
      if (tenant) {
        console.log('✓ Found tenant by custom domain:', tenant.name, '(', tenant.tenantId, ')');
      } else {
        console.log('✗ No tenant found for custom domain:', req.get('host'));
      }
    }

    // 6. For super admin routes, allow without tenant
    if (req.path.startsWith('/api/super-admin') || req.path.startsWith('/api/public')) {
      console.log('Step 6: Allowing super admin/public route without tenant context');
      console.log('=== END TENANT CONTEXT DEBUG ===\n');
      // Super admin and public routes don't need tenant context
      return next();
    }

    // If no tenant found and it's a tenant-specific route, return error
    if (!tenant) {
      console.log('❌ FINAL RESULT: No tenant found for request');
      console.log('=== END TENANT CONTEXT DEBUG ===\n');
      return res.status(404).json({ 
        error: 'Restaurant not found',
        message: 'Please check your URL and try again'
      });
    }

    if (tenant) {
      // Check if tenant is active
      if (tenant.status !== 'active') {
        console.log('❌ FINAL RESULT: Tenant found but not active:', tenant.status);
        console.log('=== END TENANT CONTEXT DEBUG ===\n');
        return res.status(403).json({ 
          error: 'Restaurant suspended',
          message: 'This restaurant account has been suspended. Please contact support.'
        });
      }

      console.log('✅ FINAL RESULT: Tenant resolved successfully');
      console.log('Tenant Name:', tenant.name);
      console.log('Tenant ID:', tenant.tenantId);
      console.log('Tenant Subdomain:', tenant.subdomain);
      console.log('=== END TENANT CONTEXT DEBUG ===\n');

      // Set tenant in request
      req.tenant = tenant;
      req.tenantId = tenant.tenantId;

      // Set tenant in async local storage for model access
      console.log('Setting asyncLocalStorage with tenantId:', tenant.tenantId);
      asyncLocalStorage.run({ tenantId: tenant.tenantId }, () => {
        console.log('Inside asyncLocalStorage.run - tenantId:', tenant.tenantId);
        next();
      });
    } else {
      console.log('❌ FINAL RESULT: Unexpected - no tenant but passed previous checks');
      console.log('=== END TENANT CONTEXT DEBUG ===\n');
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