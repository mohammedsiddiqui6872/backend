// Test multi-tenant API endpoints
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testMultiTenant() {
  console.log('🧪 Testing Multi-Tenant API...\n');

  // Test tenants
  const tenants = [
    { 
      subdomain: 'mughlaimagic', 
      tenantId: 'rest_mughlaimagic_001',
      admin: 'admin@mughlaimagic.ae'
    },
    { 
      subdomain: 'bellavista', 
      tenantId: 'rest_bellavista_002',
      admin: 'admin@bellavista.ae'
    },
    { 
      subdomain: 'hardrockcafe', 
      tenantId: 'rest_hardrockcafe_003',
      admin: 'admin@hardrockcafe.ae'
    }
  ];

  for (const tenant of tenants) {
    console.log(`\n📍 Testing ${tenant.subdomain}...`);
    
    try {
      // Test 1: Get menu with tenant header
      console.log('  1️⃣ Testing menu endpoint...');
      const menuResponse = await axios.get(`${API_URL}/menu`, {
        headers: {
          'X-Tenant-Id': tenant.tenantId
        }
      });
      const menuCount = Array.isArray(menuResponse.data) 
        ? menuResponse.data.length 
        : Object.keys(menuResponse.data).reduce((sum, cat) => sum + menuResponse.data[cat].length, 0);
      console.log(`     ✅ Found ${menuCount} menu items`);
      
      // Test 2: Get categories
      console.log('  2️⃣ Testing categories endpoint...');
      const categoriesResponse = await axios.get(`${API_URL}/categories`, {
        headers: {
          'X-Tenant-Id': tenant.tenantId
        }
      });
      console.log(`     ✅ Found ${categoriesResponse.data.length} categories`);
      
      // Test 3: Login as admin
      console.log('  3️⃣ Testing login...');
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: tenant.admin,
        password: 'admin123'
      }, {
        headers: {
          'X-Tenant-Id': tenant.tenantId
        }
      });
      console.log(`     ✅ Logged in as ${loginResponse.data.user.name}`);
      
      const token = loginResponse.data.token;
      
      // Test 4: Get tables (authenticated)
      console.log('  4️⃣ Testing tables endpoint (authenticated)...');
      const tablesResponse = await axios.get(`${API_URL}/tables`, {
        headers: {
          'X-Tenant-Id': tenant.tenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`     ✅ Found ${tablesResponse.data.length} tables`);
      
      // Test 5: Get orders (authenticated)
      console.log('  5️⃣ Testing orders endpoint (authenticated)...');
      const ordersResponse = await axios.get(`${API_URL}/orders`, {
        headers: {
          'X-Tenant-Id': tenant.tenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`     ✅ Found ${ordersResponse.data.length} orders`);
      
    } catch (error) {
      console.error(`     ❌ Error: ${error.response?.data?.error || error.message}`);
      if (error.config?.url) {
        console.error(`        Failed URL: ${error.config.url}`);
      }
    }
  }
  
  // Test super admin endpoints
  console.log('\n\n🔑 Testing Super Admin Endpoints...');
  
  try {
    // Login as super admin
    console.log('  1️⃣ Logging in as super admin...');
    const superAdminLogin = await axios.post(`${API_URL}/super-admin/login`, {
      email: 'admin@gritservices.ae',
      password: 'gritadmin2024!'
    });
    console.log('     ✅ Logged in as super admin');
    
    const superToken = superAdminLogin.data.token;
    
    // Get all tenants
    console.log('  2️⃣ Getting all tenants...');
    const tenantsResponse = await axios.get(`${API_URL}/super-admin/tenants`, {
      headers: {
        'Authorization': `Bearer ${superToken}`
      }
    });
    console.log(`     ✅ Found ${tenantsResponse.data.length} tenants`);
    
    // Get platform stats
    console.log('  3️⃣ Getting platform stats...');
    const statsResponse = await axios.get(`${API_URL}/super-admin/stats`, {
      headers: {
        'Authorization': `Bearer ${superToken}`
      }
    });
    console.log(`     ✅ Platform stats:
        - Active tenants: ${statsResponse.data.activeTenants}
        - Total users: ${statsResponse.data.totalUsers}
        - MRR: $${statsResponse.data.mrr}`);
    
  } catch (error) {
    console.error(`     ❌ Error: ${error.response?.data?.error || error.message}`);
    if (error.config?.url) {
      console.error(`        Failed URL: ${error.config.url}`);
    }
  }
  
  console.log('\n\n✨ Multi-tenant API test complete!');
}

// Add axios to test
console.log('Installing axios for testing...');
const { execSync } = require('child_process');
try {
  execSync('npm install axios', { stdio: 'ignore' });
} catch (e) {
  // Axios might already be installed
}

testMultiTenant().catch(console.error);