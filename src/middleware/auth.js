// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

exports.auth = exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findOne({ _id: decoded.id, isActive: true }).select('-password');

    if (!user) {
      throw new Error();
    }

    // SECURITY: Verify tenant context matches
    if (decoded.tenantId && user.tenantId && decoded.tenantId !== user.tenantId) {
      console.error('Token tenant mismatch:', decoded.tenantId, 'vs', user.tenantId);
      throw new Error('Invalid token');
    }

    // For admin panel requests, verify tenant from subdomain
    if (req.headers['x-tenant-subdomain'] || req.query.subdomain) {
      const subdomain = req.headers['x-tenant-subdomain'] || req.query.subdomain;
      const Tenant = require('../models/Tenant');
      const tenant = await Tenant.findOne({ subdomain: subdomain });
      
      if (tenant && user.tenantId !== tenant.tenantId) {
        console.error('User tenant mismatch for subdomain:', subdomain, user.tenantId, 'vs', tenant.tenantId);
        throw new Error('Access denied');
      }
    }

    // Load role permissions if user has a role
    if (user.role) {
      const role = await Role.findOne({ 
        code: user.role.toUpperCase(), 
        tenantId: user.tenantId,
        isActive: true 
      });
      
      if (role) {
        // Merge role permissions with user-specific permissions
        const allPermissions = new Set([
          ...(user.permissions || []),
          ...(role.permissions || [])
        ]);
        user.permissions = Array.from(allPermissions);
        user.roleData = role;
      }
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

exports.authorize = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some(permission => 
      req.user.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
        userPermissions: req.user.permissions
      });
    }
    
    next();
  };
};

// Legacy support for role-based authorization
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

exports.checkPermission = (permission) => {
  return exports.authorize([permission]);
};