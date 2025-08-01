const crypto = require('crypto');

// Use environment variable or fallback to a default key (should be changed in production)
const ENCRYPTION_KEY = process.env.TABLE_ENCRYPTION_KEY || 'GRITServices2024TableEncryptionKey32';
const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

// Ensure key is 32 bytes
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

/**
 * Encrypts a table identifier
 * @param {Object} data - Data to encrypt (tenantId, tableId, timestamp)
 * @returns {string} - Encrypted string (base64url encoded)
 */
function encryptTableData(data) {
  try {
    const text = JSON.stringify(data);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Combine IV and encrypted data
    const combined = Buffer.concat([iv, encrypted]);
    
    // Convert to base64url (URL-safe base64)
    return combined.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt table data');
  }
}

/**
 * Decrypts a table identifier
 * @param {string} encryptedData - Encrypted string (base64url encoded)
 * @returns {Object} - Decrypted data (tenantId, tableId, timestamp)
 */
function decryptTableData(encryptedData) {
  try {
    // Convert from base64url to base64
    let base64 = encryptedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padding = (4 - base64.length % 4) % 4;
    if (padding) {
      base64 += '='.repeat(padding);
    }
    
    const combined = Buffer.from(base64, 'base64');
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return JSON.parse(decrypted.toString());
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid or expired QR code');
  }
}

/**
 * Generates an encrypted QR code for a table
 * @param {string} tenantId - Tenant identifier
 * @param {string} tableId - Table identifier
 * @param {string} tableNumber - Table number for display
 * @param {number} expiryHours - Hours until expiry (0 for no expiry)
 * @returns {Object} - QR code data with encrypted code and URL
 */
function generateEncryptedQRCode(tenantId, tableId, tableNumber, expiryHours = 0) {
  const data = {
    tid: tenantId,
    tbl: tableId,
    num: tableNumber,
    ts: Date.now()
  };
  
  if (expiryHours > 0) {
    data.exp = Date.now() + (expiryHours * 60 * 60 * 1000);
  }
  
  const encryptedCode = encryptTableData(data);
  const frontendUrl = process.env.FRONTEND_URL || 'https://app.gritservices.ae';
  
  return {
    code: encryptedCode,
    url: `${frontendUrl}/t/${encryptedCode}`,
    displayCode: `Table-${tableNumber}`,
    encrypted: true
  };
}

/**
 * Validates an encrypted QR code
 * @param {string} encryptedCode - Encrypted QR code
 * @returns {Object} - Validation result with decrypted data
 */
function validateEncryptedQRCode(encryptedCode) {
  try {
    const data = decryptTableData(encryptedCode);
    
    // Check expiry if set
    if (data.exp && Date.now() > data.exp) {
      return {
        valid: false,
        error: 'QR code has expired'
      };
    }
    
    // Check if timestamp is reasonable (not too old, not in future)
    const age = Date.now() - data.ts;
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    
    if (age < 0) {
      return {
        valid: false,
        error: 'Invalid QR code timestamp'
      };
    }
    
    if (age > maxAge && !data.exp) {
      return {
        valid: false,
        error: 'QR code is too old'
      };
    }
    
    return {
      valid: true,
      tenantId: data.tid,
      tableId: data.tbl,
      tableNumber: data.num,
      timestamp: new Date(data.ts),
      expiry: data.exp ? new Date(data.exp) : null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message || 'Invalid QR code'
    };
  }
}

module.exports = {
  encryptTableData,
  decryptTableData,
  generateEncryptedQRCode,
  validateEncryptedQRCode
};