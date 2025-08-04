const axios = require('axios');

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.gritservices.ae' 
  : 'http://localhost:5000';

async function testCORS() {
  try {
    console.log('🚀 Testing CORS Headers...\n');

    const testOrigins = [
      'https://bellavista.gritservices.ae',
      'https://mughlaimagic.gritservices.ae',
      'https://hardrockcafe.gritservices.ae',
      'https://portal.gritservices.ae',
      'https://gritservices.ae',
      'http://localhost:3000',
      'http://localhost:5173'
    ];

    for (const origin of testOrigins) {
      console.log(`Testing origin: ${origin}`);
      
      try {
        // Test preflight request
        const preflightResponse = await axios({
          method: 'OPTIONS',
          url: `${API_URL}/api/menu`,
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'X-Tenant-Subdomain,X-Guest-Session-Id,X-Table-Number'
          }
        });

        console.log(`✅ Preflight successful`);
        console.log(`   Access-Control-Allow-Origin: ${preflightResponse.headers['access-control-allow-origin']}`);
        console.log(`   Access-Control-Allow-Credentials: ${preflightResponse.headers['access-control-allow-credentials']}`);
        
        // Test actual request
        const actualResponse = await axios({
          method: 'GET',
          url: `${API_URL}/api/categories`,
          headers: {
            'Origin': origin,
            'X-Tenant-Subdomain': 'bellavista'
          }
        });

        console.log(`✅ Actual request successful`);
        console.log(`   Response status: ${actualResponse.status}`);
        console.log(`   Categories found: ${actualResponse.data.length}`);
        
      } catch (error) {
        console.log(`❌ Failed for origin ${origin}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   CORS headers: ${JSON.stringify({
            'access-control-allow-origin': error.response.headers['access-control-allow-origin'],
            'access-control-allow-credentials': error.response.headers['access-control-allow-credentials']
          }, null, 2)}`);
        } else {
          console.log(`   Error: ${error.message}`);
        }
      }
      
      console.log('');
    }

    console.log('✅ CORS testing complete!');

  } catch (error) {
    console.error('\n❌ Error testing CORS:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the test
testCORS();