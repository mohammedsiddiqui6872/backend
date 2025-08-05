const axios = require('axios');

async function testWaiterLoadsProd() {
  try {
    // First, login as admin
    console.log('Logging in as admin to production server...');
    const loginResponse = await axios.post('https://api.gritservices.ae/api/auth/admin/login', {
      email: 'admin@mughlaimagic.com',
      password: 'Admin@123456'
    }, {
      headers: {
        'X-Tenant-ID': 'mughlaimagic',
        'X-Restaurant-Subdomain': 'mughlaimagic'
      }
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    // Now test the waiter loads endpoint
    console.log('\nTesting waiter loads endpoint on production...');
    const waiterLoadsResponse = await axios.get('https://api.gritservices.ae/api/admin/staff-assignments/waiter-loads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'mughlaimagic',
        'X-Restaurant-Subdomain': 'mughlaimagic'
      }
    });

    console.log('Waiter loads fetched successfully:');
    console.log(JSON.stringify(waiterLoadsResponse.data, null, 2));
    
    return waiterLoadsResponse.data;
  } catch (error) {
    console.error('Error testing waiter loads:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Run the test
testWaiterLoadsProd()
  .then(data => {
    console.log(`\n✅ Test successful! Found ${data.length} waiter loads`);
    process.exit(0);
  })
  .catch(error => {
    console.log('\n❌ Test failed');
    process.exit(1);
  });