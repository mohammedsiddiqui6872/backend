// Test server startup
try {
  console.log('Starting server test...');
  require('./server-multi-tenant.js');
} catch (error) {
  console.error('Server startup error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}