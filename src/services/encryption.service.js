const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Use environment variable or generate a key
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateKey();
    
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️  ENCRYPTION_KEY not found in environment variables!');
      console.warn('⚠️  Using generated key - this should only be for development!');
      console.warn(`⚠️  Add this to your .env file: ENCRYPTION_KEY=${this.secretKey}`);
    }
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    if (!text) return null;
    
    try {
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(64);
      const key = crypto.pbkdf2Sync(this.secretKey, salt, 2145, 32, 'sha512');
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine salt, iv, authTag, and encrypted data
      const combined = Buffer.concat([salt, iv, authTag, encrypted]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.slice(0, 64);
      const iv = combined.slice(64, 80);
      const authTag = combined.slice(80, 96);
      const encrypted = combined.slice(96);
      
      const key = crypto.pbkdf2Sync(this.secretKey, salt, 2145, 32, 'sha512');
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash for non-reversible data (like search indexes)
  hash(text) {
    if (!text) return null;
    return crypto
      .createHash('sha256')
      .update(text + this.secretKey)
      .digest('hex');
  }

  // Mask data for display (e.g., phone: +1234****89)
  mask(text, visibleStart = 4, visibleEnd = 2) {
    if (!text || text.length < visibleStart + visibleEnd) return text;
    
    const start = text.slice(0, visibleStart);
    const end = text.slice(-visibleEnd);
    const middle = '*'.repeat(Math.max(text.length - visibleStart - visibleEnd, 4));
    
    return start + middle + end;
  }

  // Mask email (e.g., jo**@example.com)
  maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    
    const [localPart, domain] = email.split('@');
    const visibleChars = Math.min(2, Math.floor(localPart.length / 2));
    const maskedLocal = this.mask(localPart, visibleChars, 0);
    
    return `${maskedLocal}@${domain}`;
  }
}

module.exports = new EncryptionService();