const axios = require('axios');

const API_URL = process.env.API_URL || 'https://api.gritservices.ae';
const SUBDOMAIN = 'bellavista';

async function debugCustomerSession() {
  try {
    console.log('🔍 Debugging Customer Session Endpoint...\n');

    // Test 1: Check if tenant is properly identified
    console.log('1. Testing with full headers...');
    const headers = {
      'X-Tenant-Subdomain': SUBDOMAIN,
      'X-Guest-Session-Id': `guest-T2-${Date.now()}`,
      'X-Table-Number': 'T2',
      'X-Device-Type': 'tablet',
      'Content-Type': 'application/json',
      'Origin': `https://${SUBDOMAIN}.gritservices.ae`
    };

    console.log('Headers:', JSON.stringify(headers, null, 2));

    const sessionData = {
      tableNumber: 'T2',
      customerName: 'Test Guest',
      customerPhone: '+971501234567',
      occupancy: 2
    };

    console.log('Request data:', JSON.stringify(sessionData, null, 2));

    try {
      const response = await axios.post(`${API_URL}/api/guest/customer-session`, sessionData, { headers });
      console.log('✅ Success!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Response headers:', error.response?.headers);
    }

    // Test 2: Check if tables exist for this tenant
    console.log('\n2. Checking if tables exist...');
    try {
      const response = await axios.get(`${API_URL}/api/tables`, { headers });
      console.log('✅ Tables endpoint works');
      console.log('Tables count:', Array.isArray(response.data) ? response.data.length : 'Not an array');
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('First few tables:', response.data.slice(0, 3).map(t => ({ number: t.number, status: t.status })));
      }
    } catch (error) {
      console.log('❌ Tables endpoint failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }

    // Test 3: Try with different table numbers
    console.log('\n3. Testing with different table numbers...');
    const tableNumbers = ['1', '2', 'T1', 'T2', 'Table1', 'Table 1'];
    
    for (const tableNum of tableNumbers) {
      try {
        const testData = {
          tableNumber: tableNum,
          customerName: 'Test Guest',
          customerPhone: '+971501234567'
        };
        
        const response = await axios.post(`${API_URL}/api/guest/customer-session`, testData, { headers });
        console.log(`✅ Table "${tableNum}" works`);
        break; // Stop on first success
      } catch (error) {
        console.log(`❌ Table "${tableNum}" failed - ${error.response?.status}: ${error.response?.data?.message}`);
      }
    }

    // Test 4: Check menu to verify tenant context
    console.log('\n4. Verifying tenant context with menu...');
    try {
      const response = await axios.get(`${API_URL}/api/menu?all=true`, { headers });
      console.log('✅ Menu works - tenant context is properly set');
      console.log('Menu items count:', Object.keys(response.data).length);
    } catch (error) {
      console.log('❌ Menu failed - tenant context might be wrong');
      console.log('Error:', error.response?.data);
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
debugCustomerSession();