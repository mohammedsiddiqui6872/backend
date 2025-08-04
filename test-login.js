const axios = require('axios');

// Test credentials from CLAUDE.md
const testCredentials = {
  saasPortal: {
    email: 'admin@gritservices.ae',
    password: 'Admin@123'
  },
  restaurantAdmins: [
    { email: 'admin@mughlaimagic.ae', password: 'password123', subdomain: 'mughlaimagic' },
    { email: 'admin@bellavista.ae', password: 'password123', subdomain: 'bellavista' },
    { email: 'admin@hardrockcafe.ae', password: 'password123', subdomain: 'hardrockcafe' }
  ],
  superAdmin: {
    email: 'admin@gritservices.ae',
    password: 'gritadmin2024!'
  }
};

// Use deployed backend URL since local might not be running
const API_URL = 'https://gritservices-backend.onrender.com';

async function testLogin(credentials, endpoint, description) {
  console.log(`\n${description}:`);
  console.log('Credentials:', { email: credentials.email, password: '***' });
  
  try {
    const response = await axios.post(`${API_URL}${endpoint}`, credentials, {
      headers: {
        'Content-Type': 'application/json',
        ...(credentials.subdomain && { 'x-tenant-subdomain': credentials.subdomain })
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', {
      status: response.status,
      user: response.data.user ? {
        id: response.data.user._id || response.data.user.id,
        email: response.data.user.email,
        role: response.data.user.role,
        tenantId: response.data.user.tenantId
      } : 'No user data',
      token: response.data.token ? 'Token received' : 'No token'
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Error:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return null;
  }
}

async function runTests() {
  console.log('=== Testing Login Functionality Across All Portals ===');
  console.log('Using API:', API_URL);
  
  // Test 1: Super Admin Login
  console.log('\n1. Testing Super Admin Login');
  await testLogin(testCredentials.superAdmin, '/api/auth/admin/login', 'Super Admin Login');
  
  // Test 2: Restaurant Admin Logins
  console.log('\n2. Testing Restaurant Admin Logins');
  for (const admin of testCredentials.restaurantAdmins) {
    await testLogin(admin, '/api/auth/admin/login', `Restaurant Admin: ${admin.subdomain}`);
  }
  
  // Test 3: Regular Auth Login (for waiters/customers)
  console.log('\n3. Testing Regular Auth Login');
  await testLogin({
    email: 'waiter@mughlaimagic.ae',
    password: 'password123'
  }, '/api/auth/login', 'Waiter Login');
  
  // Test 4: Check health endpoint
  console.log('\n4. Testing Health Endpoint');
  try {
    const health = await axios.get(`${API_URL}/api/public/health`);
    console.log('✅ Health check passed:', health.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

// Run the tests
runTests().then(() => {
  console.log('\n=== Login Tests Completed ===');
}).catch(error => {
  console.error('Test suite error:', error);
});