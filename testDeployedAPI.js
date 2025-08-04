const axios = require('axios');

async function testDeployedAPI() {
  const backendUrl = 'https://backend-b3tt.onrender.com';
  const subdomains = ['mughlaimagic', 'bellavista', 'hardrockcafe'];
  
  console.log(`Testing backend at: ${backendUrl}\n`);
  
  // First test health endpoint
  try {
    const health = await axios.get(`${backendUrl}/api/system/health`);
    console.log('✅ Health check passed:', health.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.status || error.message);
  }
  
  console.log('\n=== Testing Menu API ===');
  
  for (const subdomain of subdomains) {
    console.log(`\nTesting ${subdomain}:`);
    
    try {
      const response = await axios.get(`${backendUrl}/api/menu`, {
        headers: {
          'X-Tenant-Subdomain': subdomain
        }
      });
      
      console.log(`✅ Success!`);
      console.log(`   Response type: ${typeof response.data}`);
      console.log(`   Response structure:`, Object.keys(response.data || {}));
      
      if (Array.isArray(response.data)) {
        console.log(`   Items count: ${response.data.length}`);
        if (response.data.length > 0) {
          console.log(`   First item:`, response.data[0]);
        }
      } else {
        console.log(`   Data preview:`, JSON.stringify(response.data).substring(0, 200));
      }
    } catch (error) {
      console.log(`❌ Failed:`, error.response?.data || error.message);
    }
  }
  
  // Test what happens without tenant context
  console.log('\n=== Testing without tenant context ===');
  try {
    const response = await axios.get(`${backendUrl}/api/menu`);
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Expected error:', error.response?.data);
  }
}

testDeployedAPI();