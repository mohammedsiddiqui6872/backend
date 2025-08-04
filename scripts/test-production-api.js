const axios = require('axios');

const API_URL = 'https://api.gritservices.ae';
const SUBDOMAIN = 'bellavista';

async function testProductionAPI() {
  try {
    console.log('🚀 Testing Production API...\n');

    // Test 1: Check if menu endpoint works
    console.log('1. Testing menu endpoint...');
    try {
      const menuResponse = await axios.get(`${API_URL}/api/menu`, {
        headers: {
          'X-Tenant-Subdomain': SUBDOMAIN
        }
      });
      console.log('✅ Menu endpoint works');
      console.log(`   Status: ${menuResponse.status}`);
      console.log(`   Data type: ${typeof menuResponse.data}`);
    } catch (error) {
      console.log('❌ Menu endpoint failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 2: Check if categories endpoint works
    console.log('\n2. Testing categories endpoint...');
    try {
      const categoriesResponse = await axios.get(`${API_URL}/api/categories`, {
        headers: {
          'X-Tenant-Subdomain': SUBDOMAIN
        }
      });
      console.log('✅ Categories endpoint works');
      console.log(`   Status: ${categoriesResponse.status}`);
      console.log(`   Categories count: ${categoriesResponse.data.length}`);
    } catch (error) {
      console.log('❌ Categories endpoint failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Check if guest endpoints exist
    console.log('\n3. Testing guest customer session endpoint...');
    try {
      const guestResponse = await axios.get(`${API_URL}/api/guest/customer-session/table/T1`, {
        headers: {
          'X-Tenant-Subdomain': SUBDOMAIN,
          'X-Device-Type': 'tablet'
        }
      });
      console.log('✅ Guest endpoint works');
      console.log(`   Status: ${guestResponse.status}`);
      console.log(`   Data: ${JSON.stringify(guestResponse.data)}`);
    } catch (error) {
      console.log('❌ Guest endpoint failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 4: Check server health
    console.log('\n4. Testing server health...');
    try {
      const healthResponse = await axios.get(`${API_URL}/health`);
      console.log('✅ Server is healthy');
      console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
    } catch (error) {
      console.log('❌ Health check failed');
      console.log(`   Status: ${error.response?.status}`);
    }

    // Test 5: Check if tenant subdomain is working
    console.log('\n5. Testing with restaurant-specific subdomain header...');
    try {
      const tenantResponse = await axios.get(`${API_URL}/api/menu`, {
        headers: {
          'X-Tenant-Subdomain': 'mughlaimagic',
          'Origin': 'https://mughlaimagic.gritservices.ae'
        }
      });
      console.log('✅ Tenant isolation works');
      console.log(`   Status: ${tenantResponse.status}`);
    } catch (error) {
      console.log('❌ Tenant isolation failed');
      console.log(`   Status: ${error.response?.status}`);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

testProductionAPI();