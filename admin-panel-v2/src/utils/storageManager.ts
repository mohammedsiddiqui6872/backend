/**
 * Storage Manager for Multi-Tenant Sessions
 * Isolates localStorage data per subdomain to prevent session conflicts
 */

class StorageManager {
  private subdomain: string | null = null;
  
  constructor() {
    // Get subdomain from URL on initialization
    const urlParams = new URLSearchParams(window.location.search);
    this.subdomain = urlParams.get('subdomain');
  }
  
  // Get storage key with subdomain prefix
  private getKey(key: string): string {
    if (!this.subdomain) {
      // Try to get subdomain from URL again
      const urlParams = new URLSearchParams(window.location.search);
      this.subdomain = urlParams.get('subdomain');
    }
    
    // If we have a subdomain, prefix the key
    if (this.subdomain) {
      return `${this.subdomain}_${key}`;
    }
    
    // Fallback to unprefixed key (for backward compatibility)
    return key;
  }
  
  // Set item in localStorage with subdomain prefix
  setItem(key: string, value: string): void {
    const prefixedKey = this.getKey(key);
    localStorage.setItem(prefixedKey, value);
    
    // Also store the subdomain itself without prefix for reference
    if (key === 'subdomain' && this.subdomain) {
      localStorage.setItem('current_subdomain', this.subdomain);
    }
  }
  
  // Get item from localStorage with subdomain prefix
  getItem(key: string): string | null {
    const prefixedKey = this.getKey(key);
    return localStorage.getItem(prefixedKey);
  }
  
  // Remove item from localStorage with subdomain prefix
  removeItem(key: string): void {
    const prefixedKey = this.getKey(key);
    localStorage.removeItem(prefixedKey);
  }
  
  // Clear all items for current subdomain
  clearSubdomainData(): void {
    if (!this.subdomain) return;
    
    const keysToRemove: string[] = [];
    
    // Find all keys for this subdomain
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.subdomain}_`)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all subdomain-specific keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Get current subdomain
  getSubdomain(): string | null {
    return this.subdomain;
  }
  
  // Update subdomain (when switching restaurants)
  setSubdomain(subdomain: string): void {
    this.subdomain = subdomain;
    localStorage.setItem('current_subdomain', subdomain);
  }
}

// Create singleton instance
const storageManager = new StorageManager();

export default storageManager;