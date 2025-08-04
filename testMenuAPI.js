const axios = require('axios');

async function testMenuAPI() {
  const subdomains = ['mughlaimagic', 'bellavista', 'hardrockcafe'];
  
  for (const subdomain of subdomains) {
    console.log(`\n=== Testing ${subdomain} ===`);
    
    try {
      // Test with subdomain header
      const response = await axios.get('https://gritservices-backend.onrender.com/api/menu', {
        headers: {
          'X-Tenant-Subdomain': subdomain
        }
      });
      
      console.log(`✅ Success with X-Tenant-Subdomain header`);
      console.log(`   Items received: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`   First item: ${response.data[0].name}`);
      }
    } catch (error) {
      console.log(`❌ Failed with X-Tenant-Subdomain:`, error.response?.data || error.message);
    }
    
    try {
      // Test with host header (simulating subdomain)
      const response = await axios.get('https://gritservices-backend.onrender.com/api/menu', {
        headers: {
          'Host': `${subdomain}.gritservices.ae`
        }
      });
      
      console.log(`✅ Success with Host header`);
      console.log(`   Items received: ${response.data.length}`);
    } catch (error) {
      console.log(`❌ Failed with Host header:`, error.response?.data || error.message);
    }
  }
}

testMenuAPI();