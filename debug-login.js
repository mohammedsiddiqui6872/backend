// Temporary debug script to test super admin configuration
require('dotenv').config();

console.log('=== Super Admin Configuration Debug ===');
console.log('SUPER_ADMIN_EMAIL:', process.env.SUPER_ADMIN_EMAIL || 'NOT SET');
console.log('SUPER_ADMIN_PASSWORD exists:', !!process.env.SUPER_ADMIN_PASSWORD);
console.log('SUPER_ADMIN_PASSWORD length:', process.env.SUPER_ADMIN_PASSWORD ? process.env.SUPER_ADMIN_PASSWORD.length : 0);
console.log('SUPER_ADMIN_MFA:', process.env.SUPER_ADMIN_MFA || 'NOT SET');

// Test the security manager
const { securityManager } = require('./src/config/security');
const accounts = securityManager.getSuperAdminAccounts();

console.log('\n=== Configured Super Admin Accounts ===');
accounts.forEach((account, index) => {
  console.log(`Account ${index + 1}:`);
  console.log(`  Email: ${account.email}`);
  console.log(`  Name: ${account.name}`);
  console.log(`  Has envPassword: ${!!account.envPassword}`);
  console.log(`  Has hashedPassword: ${!!account.hashedPassword}`);
  console.log(`  Requires MFA: ${account.requiresMFA}`);
});

// Test a login attempt
async function testLogin() {
  console.log('\n=== Testing Login ===');
  const testEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@gritservices.ae';
  const testPassword = process.env.SUPER_ADMIN_PASSWORD || 'test';
  
  console.log(`Testing with email: ${testEmail}`);
  console.log(`Password length: ${testPassword.length}`);
  
  const result = await securityManager.validateSuperAdminCredentials(testEmail, testPassword);
  console.log('Login result:', result);
}

testLogin().then(() => {
  console.log('\n=== Debug Complete ===');
  process.exit(0);
});