const axios = require('axios');

const API_URL = process.env.API_URL || 'https://api.gritservices.ae';
const SUBDOMAIN = 'bellavista';

async function verifyTenantContext() {
  try {
    console.log('🔍 Verifying Tenant Context Resolution...\n');

    const headers = {
      'X-Tenant-Subdomain': SUBDOMAIN,
      'Content-Type': 'application/json'
    };

    // Test a simple endpoint that shows tenant info
    console.log('1. Testing menu endpoint to see tenant context...');
    try {
      const response = await axios.get(`${API_URL}/api/menu?debug=true`, { headers });
      console.log('✅ Menu endpoint works');
      
      // The menu endpoint should have tenant context
      // Let's create a customer session and see what happens
      console.log('\n2. Creating customer session with verified tenant context...');
      
      const sessionData = {
        tableNumber: 'T2',
        customerName: 'Test Guest',
        customerPhone: '+971501234567',
        occupancy: 2
      };

      const sessionResponse = await axios.post(`${API_URL}/api/guest/customer-session`, sessionData, { headers });
      console.log('✅ Session created successfully!');
      console.log('Response:', JSON.stringify(sessionResponse.data, null, 2));
      
    } catch (error) {
      if (error.response?.data) {
        console.log('❌ Error:', error.response.status, '-', error.response.data);
        
        // If it's still 500, we need to check server logs
        if (error.response.status === 500) {
          console.log('\n⚠️  The 500 error suggests the tenant context is working but there\'s an issue in the route handler.');
          console.log('Possible causes:');
          console.log('1. The GuestSession model hasn\'t been deployed to production');
          console.log('2. There\'s a database connection issue');
          console.log('3. The encryption service is failing (if used)');
        }
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Accept API URL from command line
if (process.argv[2]) {
  process.env.API_URL = process.argv[2];
}

console.log(`Using API URL: ${process.env.API_URL || API_URL}\n`);
verifyTenantContext();