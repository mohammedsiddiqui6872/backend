require('dotenv').config();
const axios = require('axios');

async function testTablesAPI() {
  try {
    // First login as admin with subdomain
    const loginResponse = await axios.post('http://localhost:5000/api/auth/admin/login?subdomain=mughlaimagic', {
      email: 'admin@mughlaimagic.ae',
      password: 'GritAdmin2025!'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, got token');
    
    // Now get tables
    const tablesResponse = await axios.get('http://localhost:5000/api/admin/tables', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': 'mughlaimagic'
      }
    });
    
    console.log('\nTables API Response:');
    console.log('Status:', tablesResponse.status);
    console.log('Data structure:', Object.keys(tablesResponse.data));
    console.log('Tables count:', tablesResponse.data.tables?.length);
    console.log('Stats:', tablesResponse.data.stats);
    
    if (tablesResponse.data.tables?.length > 0) {
      console.log('\nFirst table:');
      console.log(JSON.stringify(tablesResponse.data.tables[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTablesAPI();