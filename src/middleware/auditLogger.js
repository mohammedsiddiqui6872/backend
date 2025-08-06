const AuditLog = require('../models/AuditLog');
const { getClientIp } = require('../utils/ipUtils');
const useragent = require('useragent');
const geoip = require('geoip-lite');
const crypto = require('crypto');

// Skip logging for these endpoints
const SKIP_ENDPOINTS = [
  '/api/health',
  '/api/status',
  '/api/audit-logs', // Prevent recursive logging
  '/api/socket.io',
  '/api/metrics'
];

// Sensitive fields to track changes
const SENSITIVE_FIELDS = [
  'password', 'token', 'apiKey', 'secret', 'creditCard', 
  'bankAccount', 'ssn', 'pin', 'cvv'
];

// High-risk actions
const HIGH_RISK_ACTIONS = [
  'delete', 'remove', 'destroy', 'purge', 'reset',
  'admin', 'permission', 'role', 'security'
];

class AuditLogger {
  constructor() {
    this.correlationIds = new Map();
  }

  // Main middleware function
  middleware() {
    return async (req, res, next) => {
      // Skip if endpoint is in skip list
      if (SKIP_ENDPOINTS.some(endpoint => req.path.startsWith(endpoint))) {
        return next();
      }

      // Generate correlation ID
      const correlationId = req.headers['x-correlation-id'] || 
                          `corr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      req.correlationId = correlationId;

      // Start tracking
      const startTime = Date.now();
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Capture request data
      const requestData = {
        method: req.method,
        endpoint: req.originalUrl || req.path,
        params: req.params,
        query: req.query,
        body: this.sanitizeBody(req.body),
        headers: this.sanitizeHeaders(req.headers),
        files: req.files?.map(f => ({
          fieldname: f.fieldname,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size
        }))
      };

      // Parse user agent
      const agent = useragent.parse(req.headers['user-agent']);
      const ip = getClientIp(req);
      const geo = geoip.lookup(ip);

      // Actor information
      const actor = {
        type: req.user ? 'user' : req.apiKey ? 'api' : 'anonymous',
        id: req.user?._id?.toString() || req.apiKey?.id || 'anonymous',
        userId: req.user?._id,
        name: req.user?.name || req.apiKey?.name || 'Anonymous',
        email: req.user?.email,
        role: req.user?.role,
        permissions: req.user?.permissions || [],
        ip: ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id'],
        sessionId: req.sessionID || req.headers['x-session-id'],
        apiKeyId: req.apiKey?.id
      };

      // Context information
      const context = {
        browser: agent.family,
        browserVersion: agent.toVersion(),
        os: agent.os.family,
        osVersion: agent.os.toVersion(),
        device: agent.device.family,
        deviceType: this.getDeviceType(agent),
        location: geo ? {
          country: geo.country,
          countryCode: geo.cc,
          region: geo.region,
          city: geo.city,
          postalCode: geo.zip,
          latitude: geo.ll?.[0],
          longitude: geo.ll?.[1],
          timezone: geo.timezone
        } : null,
        referrer: req.headers.referer || req.headers.referrer,
        source: req.query.utm_source,
        medium: req.query.utm_medium,
        campaign: req.query.utm_campaign
      };

      // Store original response data
      let responseData = null;
      let responseStatus = null;

      // Override response methods
      res.send = function(data) {
        responseData = data;
        responseStatus = res.statusCode;
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        responseData = data;
        responseStatus = res.statusCode;
        return originalJson.call(this, data);
      };

      // Track changes for write operations
      const trackChanges = () => {
        if (req.originalModel && req.modifiedFields) {
          return req.modifiedFields.map(field => ({
            field: field.path,
            fieldPath: field.path,
            oldValue: field.oldValue,
            newValue: field.newValue,
            oldValueType: typeof field.oldValue,
            newValueType: typeof field.newValue,
            operation: field.operation || { type: 'set' },
            isSensitive: SENSITIVE_FIELDS.some(sf => field.path.toLowerCase().includes(sf))
          }));
        }
        return [];
      };

      // Log after response
      res.on('finish', async () => {
        try {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Determine action and category
          const action = this.determineAction(req);
          const category = this.determineCategory(action, req.path);
          
          // Determine resource
          const resource = await this.determineResource(req);

          // Skip audit logging for requests without tenant context (like static files)
          const tenantId = req.tenantId || req.tenant?.tenantId;
          if (!tenantId && !req.path.startsWith('/api/auth/login') && !req.path.startsWith('/api/system')) {
            // Skip audit logging for non-tenant requests (static assets, health checks, etc.)
            return;
          }
          
          // Build audit log entry
          const auditData = {
            tenantId: tenantId || 'system',
            action,
            category,
            resource,
            actor,
            request: {
              ...requestData,
              responseStatus: res.statusCode,
              responseTime: duration,
              responseSize: res.get('content-length') || 0,
              errorMessage: res.statusCode >= 400 ? (responseData?.error || responseData?.message) : null,
              errorCode: res.statusCode >= 400 ? (responseData?.code || res.statusCode.toString()) : null
            },
            changes: trackChanges(),
            context,
            relationships: {
              correlationId,
              traceId: req.headers['x-trace-id'],
              spanId: req.headers['x-span-id'],
              parentEventId: req.headers['x-parent-event-id']
            },
            performance: {
              duration,
              databaseQueries: req.dbQueryCount || 0,
              databaseTime: req.dbQueryTime || 0,
              cacheHits: req.cacheHits || 0,
              cacheMisses: req.cacheMisses || 0,
              externalApiCalls: req.externalApiCalls || 0,
              externalApiTime: req.externalApiTime || 0
            },
            result: {
              success: res.statusCode < 400,
              errorType: res.statusCode >= 400 ? this.getErrorType(res.statusCode) : null,
              errorMessage: res.statusCode >= 400 ? (responseData?.error || responseData?.message) : null,
              errorCode: res.statusCode >= 400 ? (responseData?.code || res.statusCode.toString()) : null
            },
            compliance: this.checkCompliance(req, action, resource),
            tags: this.generateTags(req, action, category),
            flags: {
              suspicious: this.checkSuspicious(req, res, duration),
              automated: req.headers['x-automated'] === 'true'
            },
            metadata: {
              requestId: req.id || req.headers['x-request-id'],
              ...req.auditMetadata
            }
          };

          // Log the event
          await AuditLog.logEvent(auditData);

        } catch (error) {
          console.error('Audit logging error:', error);
          // Don't break the application
        }
      });

      next();
    };
  }

  // Determine action from request
  determineAction(req) {
    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();
    
    // Authentication actions
    if (path.includes('/auth/login')) return 'auth.login';
    if (path.includes('/auth/logout')) return 'auth.logout';
    if (path.includes('/auth/refresh')) return 'auth.token_refresh';
    if (path.includes('/auth/reset')) return 'auth.password_reset';
    if (path.includes('/auth/2fa')) return path.includes('verify') ? 'auth.2fa_verified' : 'auth.2fa_enabled';
    
    // User actions
    if (path.includes('/users')) {
      if (method === 'post') return 'user.create';
      if (method === 'put' || method === 'patch') return 'user.update';
      if (method === 'delete') return 'user.delete';
      if (path.includes('/role')) return 'user.role_change';
      if (path.includes('/permissions')) return 'user.permissions_change';
    }
    
    // Order actions
    if (path.includes('/orders')) {
      if (method === 'post') return 'order.create';
      if (method === 'put' || method === 'patch') return 'order.update';
      if (path.includes('/cancel')) return 'order.cancel';
      if (path.includes('/complete')) return 'order.complete';
    }
    
    // Payment actions
    if (path.includes('/payment')) {
      if (path.includes('/process')) return 'payment.process';
      if (path.includes('/refund')) return 'payment.refund';
    }
    
    // Table actions
    if (path.includes('/tables')) {
      if (path.includes('/assign')) return 'table.assign';
      if (path.includes('/release')) return 'table.release';
      if (path.includes('/status')) return 'table.status_change';
    }
    
    // Menu actions
    if (path.includes('/menu')) {
      if (method === 'post') return 'menu.create';
      if (method === 'put' || method === 'patch') return 'menu.update';
      if (method === 'delete') return 'menu.delete';
      if (path.includes('/publish')) return 'menu.publish';
    }
    
    // Data operations
    if (path.includes('/export')) return 'data.export';
    if (path.includes('/import')) return 'data.import';
    if (path.includes('/bulk')) {
      if (method === 'post') return 'data.bulk_create';
      if (method === 'put' || method === 'patch') return 'data.bulk_update';
      if (method === 'delete') return 'data.bulk_delete';
    }
    
    // GDPR/Compliance
    if (path.includes('/gdpr')) {
      if (path.includes('/export')) return 'compliance.data_export';
      if (path.includes('/delete')) return 'compliance.data_deletion';
      if (path.includes('/consent')) return 'compliance.consent_given';
    }
    
    // API operations
    if (path.includes('/api/keys')) {
      if (method === 'post') return 'api.key_created';
      if (method === 'delete') return 'api.key_revoked';
    }
    
    // Default CRUD operations
    if (method === 'get') return 'data.read';
    if (method === 'post') return 'data.create';
    if (method === 'put' || method === 'patch') return 'data.update';
    if (method === 'delete') return 'data.delete';
    
    return 'api.call';
  }

  // Determine category from action
  determineCategory(action, path) {
    const actionPrefix = action.split('.')[0];
    
    const categoryMap = {
      'auth': 'authentication',
      'user': 'user_management',
      'data': path.includes('/admin') ? 'data_modification' : 'data_access',
      'system': 'system_operation',
      'security': 'security',
      'order': 'business_operation',
      'payment': 'business_operation',
      'table': 'business_operation',
      'menu': 'business_operation',
      'compliance': 'compliance',
      'api': 'api_operation',
      'report': 'reporting',
      'analytics': 'reporting'
    };
    
    return categoryMap[actionPrefix] || 'system_operation';
  }

  // Determine resource from request
  async determineResource(req) {
    const path = req.path.toLowerCase();
    const method = req.method.toLowerCase();
    
    // Extract resource type from path
    const pathParts = path.split('/').filter(p => p);
    let resourceType = 'system';
    let resourceId = null;
    let resourceName = null;
    
    // Common patterns
    if (pathParts.includes('users')) resourceType = 'user';
    else if (pathParts.includes('orders')) resourceType = 'order';
    else if (pathParts.includes('tables')) resourceType = 'table';
    else if (pathParts.includes('menu')) resourceType = 'menu';
    else if (pathParts.includes('payments')) resourceType = 'payment';
    else if (pathParts.includes('shifts')) resourceType = 'shift';
    else if (pathParts.includes('reports')) resourceType = 'report';
    else if (pathParts.includes('settings')) resourceType = 'settings';
    else if (pathParts.includes('roles')) resourceType = 'role';
    else if (pathParts.includes('permissions')) resourceType = 'permission';
    
    // Extract resource ID
    if (req.params.id) resourceId = req.params.id;
    else if (req.params.userId) resourceId = req.params.userId;
    else if (req.params.orderId) resourceId = req.params.orderId;
    else if (req.params.tableId) resourceId = req.params.tableId;
    else if (req.body?._id) resourceId = req.body._id;
    
    // Get resource name if possible
    if (req.resourceName) resourceName = req.resourceName;
    else if (req.body?.name) resourceName = req.body.name;
    else if (req.body?.title) resourceName = req.body.title;
    
    return {
      type: resourceType,
      id: resourceId,
      name: resourceName,
      collection: req.modelName || resourceType,
      path: req.path
    };
  }

  // Check compliance requirements
  checkCompliance(req, action, resource) {
    const compliance = {
      isGdprRelated: false,
      isPiiAccess: false,
      isSensitiveOperation: false,
      isFinancialData: false,
      regulations: []
    };
    
    // GDPR related actions
    if (action.includes('data.export') || action.includes('data.delete') || 
        action.includes('consent') || resource.type === 'user') {
      compliance.isGdprRelated = true;
      compliance.regulations.push({ type: 'GDPR', applicable: true });
    }
    
    // PII access
    if (req.body?.email || req.body?.phone || req.body?.address ||
        req.query?.includePersonalData) {
      compliance.isPiiAccess = true;
    }
    
    // Financial data
    if (resource.type === 'payment' || req.path.includes('financial') ||
        req.body?.creditCard || req.body?.bankAccount) {
      compliance.isFinancialData = true;
      compliance.regulations.push({ type: 'PCI-DSS', applicable: true });
    }
    
    // Sensitive operations
    if (action.includes('delete') || action.includes('permission') || 
        action.includes('role') || action.includes('security')) {
      compliance.isSensitiveOperation = true;
    }
    
    return compliance;
  }

  // Generate tags for the event
  generateTags(req, action, category) {
    const tags = [];
    
    // Method tag
    tags.push(req.method.toUpperCase());
    
    // Category tag
    tags.push(category);
    
    // High risk tag
    if (HIGH_RISK_ACTIONS.some(risk => action.includes(risk))) {
      tags.push('high-risk');
    }
    
    // API version
    if (req.path.includes('/v1/')) tags.push('api-v1');
    if (req.path.includes('/v2/')) tags.push('api-v2');
    
    // Admin operations
    if (req.path.includes('/admin')) tags.push('admin');
    
    // Bulk operations
    if (req.path.includes('/bulk')) tags.push('bulk-operation');
    
    // External API
    if (req.headers['x-api-key']) tags.push('external-api');
    
    return tags;
  }

  // Check for suspicious activity
  checkSuspicious(req, res, duration) {
    // Failed authentication
    if (req.path.includes('/auth') && res.statusCode === 401) {
      return true;
    }
    
    // Multiple failed attempts
    if (res.statusCode >= 400 && req.failedAttempts > 3) {
      return true;
    }
    
    // Unusual response time
    if (duration > 10000) { // 10 seconds
      return true;
    }
    
    // Unusual hours (customize based on business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      if (req.path.includes('/admin') || req.path.includes('/delete')) {
        return true;
      }
    }
    
    // Mass data access
    if (req.query?.limit > 1000 || req.body?.ids?.length > 100) {
      return true;
    }
    
    return false;
  }

  // Sanitize request body
  sanitizeBody(body) {
    if (!body) return null;
    
    const sanitized = JSON.parse(JSON.stringify(body));
    
    SENSITIVE_FIELDS.forEach(field => {
      this.redactField(sanitized, field);
    });
    
    return sanitized;
  }

  // Sanitize headers
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  // Redact sensitive field
  redactField(obj, field) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      if (key.toLowerCase().includes(field.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.redactField(obj[key], field);
      }
    }
  }

  // Get device type
  getDeviceType(agent) {
    if (agent.device.family !== 'Other') return agent.device.family;
    if (agent.os.family.includes('Mobile')) return 'Mobile';
    if (agent.os.family.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  // Get error type
  getErrorType(statusCode) {
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

// Export middleware
module.exports = {
  auditLogger,
  auditMiddleware: () => auditLogger.middleware()
};