const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');

/**
 * Enhanced Security Configuration Module
 * Handles authentication, validation, and security policies
 */

class SecurityManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationRounds = 12;
    this.tokenExpiry = {
      access: '15m',
      refresh: '7d',
      admin: '1h',
      superAdmin: '30m'
    };
  }

  /**
   * Validate super admin credentials securely
   */
  async validateSuperAdminCredentials(email, password) {
    try {
      // Environment-based super admin credentials
      const allowedSuperAdmins = this.getSuperAdminAccounts();
      
      const adminAccount = allowedSuperAdmins.find(admin => 
        admin.email.toLowerCase() === email.toLowerCase()
      );

      if (!adminAccount) {
        // Simulate password check to prevent timing attacks
        await bcrypt.compare(password, '$2a$12$dummy.hash.to.prevent.timing.attacks');
        return { valid: false, reason: 'invalid_credentials' };
      }

      // Check if using environment password or hashed password
      let isValid = false;
      if (adminAccount.envPassword && process.env[adminAccount.envPassword]) {
        isValid = password === process.env[adminAccount.envPassword];
      } else if (adminAccount.hashedPassword) {
        isValid = await bcrypt.compare(password, adminAccount.hashedPassword);
      }

      if (!isValid) {
        return { valid: false, reason: 'invalid_credentials' };
      }

      // Additional security checks
      if (adminAccount.requiresMFA && !this.validateMFA(email)) {
        return { valid: false, reason: 'mfa_required' };
      }

      return {
        valid: true,
        admin: {
          id: adminAccount.id,
          email: adminAccount.email,
          role: 'super_admin',
          name: adminAccount.name,
          permissions: adminAccount.permissions || ['*']
        }
      };
    } catch (error) {
      console.error('Super admin validation error:', error);
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Get super admin accounts from environment
   */
  getSuperAdminAccounts() {
    const accounts = [];

    // Primary super admin from environment
    if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
      accounts.push({
        id: 'super_admin_001',
        email: process.env.SUPER_ADMIN_EMAIL,
        name: 'Super Administrator',
        envPassword: 'SUPER_ADMIN_PASSWORD',
        requiresMFA: process.env.SUPER_ADMIN_MFA === 'true'
      });
    }

    // Secondary super admin (if configured)
    if (process.env.SUPER_ADMIN_EMAIL_2 && process.env.SUPER_ADMIN_PASSWORD_2) {
      accounts.push({
        id: 'super_admin_002',
        email: process.env.SUPER_ADMIN_EMAIL_2,
        name: 'Secondary Super Administrator',
        envPassword: 'SUPER_ADMIN_PASSWORD_2',
        requiresMFA: process.env.SUPER_ADMIN_MFA_2 === 'true'
      });
    }

    // GRIT Services admin (if configured with proper hashing)
    if (process.env.GRIT_ADMIN_EMAIL && process.env.GRIT_ADMIN_PASSWORD_HASH) {
      accounts.push({
        id: 'grit_admin_001',
        email: process.env.GRIT_ADMIN_EMAIL,
        name: 'GRIT Services Administrator',
        hashedPassword: process.env.GRIT_ADMIN_PASSWORD_HASH,
        requiresMFA: process.env.GRIT_ADMIN_MFA === 'true'
      });
    }

    return accounts;
  }

  /**
   * Validate MFA token (placeholder for future implementation)
   */
  validateMFA(email, token = null) {
    // TODO: Implement proper MFA validation
    // For now, return true if MFA is not strictly required
    return !process.env.STRICT_MFA || false;
  }

  /**
   * Enhanced input validation and sanitization
   */
  validateAndSanitizeInput(input, rules = {}) {
    const errors = [];
    const sanitized = {};

    for (const [field, value] of Object.entries(input)) {
      const rule = rules[field] || {};
      
      try {
        // Basic sanitization
        let sanitizedValue = typeof value === 'string' ? value.trim() : value;

        // Type validation
        if (rule.type) {
          switch (rule.type) {
            case 'email':
              if (!validator.isEmail(sanitizedValue)) {
                errors.push(`${field} must be a valid email`);
                continue;
              }
              sanitizedValue = validator.normalizeEmail(sanitizedValue);
              break;
            
            case 'string':
              if (typeof sanitizedValue !== 'string') {
                errors.push(`${field} must be a string`);
                continue;
              }
              // Escape HTML entities and remove null bytes
              sanitizedValue = validator.escape(sanitizedValue).replace(/\0/g, '');
              break;
            
            case 'number':
              sanitizedValue = Number(sanitizedValue);
              if (isNaN(sanitizedValue)) {
                errors.push(`${field} must be a number`);
                continue;
              }
              break;
            
            case 'boolean':
              sanitizedValue = Boolean(sanitizedValue);
              break;
            
            case 'objectId':
              if (!validator.isMongoId(sanitizedValue)) {
                errors.push(`${field} must be a valid ObjectId`);
                continue;
              }
              break;
          }
        }

        // Length validation
        if (rule.minLength && sanitizedValue.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
          continue;
        }
        if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
          errors.push(`${field} must be no more than ${rule.maxLength} characters`);
          continue;
        }

        // Range validation for numbers
        if (rule.min && sanitizedValue < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`);
          continue;
        }
        if (rule.max && sanitizedValue > rule.max) {
          errors.push(`${field} must be no more than ${rule.max}`);
          continue;
        }

        // Custom validation
        if (rule.custom && !rule.custom(sanitizedValue)) {
          errors.push(`${field} validation failed`);
          continue;
        }

        sanitized[field] = sanitizedValue;
      } catch (error) {
        errors.push(`${field} validation error: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Generate secure session token
   */
  generateSecureToken(payload, expiresIn = '1h') {
    const jwt = require('jsonwebtoken');
    
    const jwtPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // JWT ID for token invalidation
    };

    return jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn,
      issuer: 'gritservices-api',
      audience: 'gritservices-clients'
    });
  }

  /**
   * Verify and decode JWT token with enhanced security
   */
  verifyToken(token) {
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'gritservices-api',
        audience: 'gritservices-clients'
      });

      // Additional security checks
      if (this.isTokenBlacklisted(decoded.jti)) {
        throw new Error('Token has been revoked');
      }

      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check if token is blacklisted (placeholder for Redis implementation)
   */
  isTokenBlacklisted(jti) {
    // TODO: Implement Redis-based token blacklist
    return false;
  }

  /**
   * Hash password with enhanced security
   */
  async hashPassword(password) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check password strength
    if (!this.isStrongPassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    return bcrypt.hash(password, this.keyDerivationRounds);
  }

  /**
   * Verify password strength
   */
  isStrongPassword(password) {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    });
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text, secretKey = process.env.ENCRYPTION_KEY) {
    if (!secretKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, secretKey);
    cipher.setAAD(Buffer.from('gritservices', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData, secretKey = process.env.ENCRYPTION_KEY) {
    if (!secretKey) {
      throw new Error('Encryption key not configured');
    }

    const { encrypted, iv, authTag } = encryptedData;
    const decipher = crypto.createDecipher(this.algorithm, secretKey);
    
    decipher.setAAD(Buffer.from('gritservices', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token, sessionToken) {
    // Implement CSRF validation logic
    return token && sessionToken && token.length === 64;
  }
}

// Singleton instance
const securityManager = new SecurityManager();

module.exports = {
  SecurityManager,
  securityManager
};