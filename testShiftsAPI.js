require('dotenv').config();
const axios = require('axios');

async function testShiftsAPI() {
  try {
    // First login as admin with subdomain
    const loginResponse = await axios.post('http://localhost:5000/api/auth/admin/login?subdomain=mughlaimagic', {
      email: 'admin@mughlaimagic.ae',
      password: 'GritAdmin2025!'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, got token');
    
    // Now get shifts
    const shiftsResponse = await axios.get('http://localhost:5000/api/admin/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': 'mughlaimagic'
      },
      params: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
    
    console.log('\nShifts API Response:');
    console.log('Status:', shiftsResponse.status);
    console.log('Total shifts:', shiftsResponse.data.data?.length || 0);
    console.log('Total pages:', shiftsResponse.data.totalPages);
    
    // Also test the stats endpoint
    const statsResponse = await axios.get('http://localhost:5000/api/admin/shifts/stats/overview', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': 'mughlaimagic'
      }
    });
    
    console.log('\nShifts Stats Response:');
    console.log('Status:', statsResponse.status);
    console.log('Stats:', statsResponse.data.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testShiftsAPI();