const semver = require('semver');

// API version configuration
const API_VERSIONS = {
  v1: {
    version: '1.0.0',
    deprecated: false,
    sunsetDate: null,
    changes: ['Initial API release']
  },
  v2: {
    version: '2.0.0',
    deprecated: false,
    sunsetDate: null,
    changes: [
      'Improved order management endpoints',
      'Enhanced analytics APIs',
      'New bulk operations support'
    ]
  }
};

// Default version if none specified
const DEFAULT_VERSION = 'v1';

// Supported versioning strategies
const VersioningStrategy = {
  URL_PATH: 'url-path',        // /api/v1/resource
  HEADER: 'header',            // X-API-Version: v1
  QUERY_PARAM: 'query-param',  // /api/resource?version=v1
  ACCEPT_HEADER: 'accept'      // Accept: application/vnd.gritservices.v1+json
};

/**
 * API Versioning Middleware
 * Supports multiple versioning strategies
 */
const apiVersioning = (options = {}) => {
  const {
    strategy = VersioningStrategy.URL_PATH,
    versions = API_VERSIONS,
    defaultVersion = DEFAULT_VERSION,
    headerName = 'X-API-Version',
    queryParam = 'version',
    deprecationWarning = true
  } = options;

  return (req, res, next) => {
    let requestedVersion = null;

    // Extract version based on strategy
    switch (strategy) {
      case VersioningStrategy.URL_PATH:
        // Extract from URL path: /api/v1/resource
        const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
        if (pathMatch) {
          requestedVersion = pathMatch[1];
        }
        break;

      case VersioningStrategy.HEADER:
        // Extract from custom header
        requestedVersion = req.headers[headerName.toLowerCase()];
        break;

      case VersioningStrategy.QUERY_PARAM:
        // Extract from query parameter
        requestedVersion = req.query[queryParam];
        break;

      case VersioningStrategy.ACCEPT_HEADER:
        // Extract from Accept header
        const acceptHeader = req.headers.accept || '';
        const acceptMatch = acceptHeader.match(/application\/vnd\.gritservices\.(v\d+)\+json/);
        if (acceptMatch) {
          requestedVersion = acceptMatch[1];
        }
        break;
    }

    // Use default version if none specified
    const version = requestedVersion || defaultVersion;

    // Validate version
    if (!versions[version]) {
      return res.status(400).json({
        error: 'Invalid API version',
        message: `Version '${version}' is not supported`,
        supportedVersions: Object.keys(versions),
        defaultVersion
      });
    }

    // Check if version is deprecated
    const versionInfo = versions[version];
    if (versionInfo.deprecated && deprecationWarning) {
      res.setHeader('X-API-Deprecation', 'true');
      res.setHeader('X-API-Deprecation-Date', versionInfo.sunsetDate || 'TBD');
      res.setHeader('X-API-Deprecation-Info', 
        `This API version is deprecated and will be removed after ${versionInfo.sunsetDate || 'a future date'}`
      );
    }

    // Attach version info to request
    req.apiVersion = version;
    req.apiVersionInfo = versionInfo;

    // Set response headers
    res.setHeader('X-API-Version', version);
    res.setHeader('X-API-Version-Requested', requestedVersion || 'none');

    // For URL path strategy, rewrite the URL to remove version
    if (strategy === VersioningStrategy.URL_PATH && requestedVersion) {
      req.url = req.url.replace(`/${version}`, '');
      req.baseUrl = req.baseUrl.replace(`/${version}`, '');
    }

    next();
  };
};

/**
 * Route version handler
 * Allows different implementations for different versions
 */
const versionedRoute = (handlers) => {
  return (req, res, next) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    const handler = handlers[version] || handlers.default;

    if (!handler) {
      return res.status(501).json({
        error: 'Not implemented',
        message: `This endpoint is not available in API version ${version}`
      });
    }

    handler(req, res, next);
  };
};

/**
 * Version-specific middleware
 * Apply middleware only for specific versions
 */
const versionMiddleware = (versions, middleware) => {
  const versionSet = new Set(Array.isArray(versions) ? versions : [versions]);
  
  return (req, res, next) => {
    if (versionSet.has(req.apiVersion)) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
};

/**
 * Check if a version satisfies a range
 */
const satisfiesVersion = (version, range) => {
  const versionInfo = API_VERSIONS[version];
  if (!versionInfo) return false;
  
  return semver.satisfies(versionInfo.version, range);
};

/**
 * Get version changelog
 */
const getVersionChangelog = (fromVersion, toVersion) => {
  const changes = [];
  let foundFrom = false;

  for (const [version, info] of Object.entries(API_VERSIONS)) {
    if (version === fromVersion) {
      foundFrom = true;
      continue;
    }
    
    if (foundFrom) {
      changes.push({
        version,
        changes: info.changes
      });
      
      if (version === toVersion) {
        break;
      }
    }
  }

  return changes;
};

// Backwards compatibility transformers
const transformers = {
  // Transform v2 response to v1 format
  v2ToV1: {
    order: (order) => {
      // Remove fields not in v1
      const { newField, ...v1Order } = order;
      return v1Order;
    },
    user: (user) => {
      // Flatten nested structure for v1
      if (user.profile) {
        return {
          ...user,
          ...user.profile,
          profile: undefined
        };
      }
      return user;
    }
  },
  
  // Transform v1 request to v2 format
  v1ToV2: {
    order: (order) => {
      // Add default values for v2 fields
      return {
        ...order,
        newField: 'default'
      };
    },
    user: (user) => {
      // Nest flat structure for v2
      const { dateOfBirth, gender, nationality, ...baseUser } = user;
      return {
        ...baseUser,
        profile: {
          dateOfBirth,
          gender,
          nationality
        }
      };
    }
  }
};

/**
 * Transform response based on requested version
 */
const transformResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    const version = req.apiVersion;
    
    // Apply transformations if needed
    if (version === 'v1' && req.baseApiVersion === 'v2') {
      // Transform v2 data to v1 format
      if (data.orders) {
        data.orders = data.orders.map(transformers.v2ToV1.order);
      }
      if (data.user) {
        data.user = transformers.v2ToV1.user(data.user);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  apiVersioning,
  versionedRoute,
  versionMiddleware,
  satisfiesVersion,
  getVersionChangelog,
  transformResponse,
  VersioningStrategy,
  API_VERSIONS
};