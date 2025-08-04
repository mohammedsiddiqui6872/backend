const axios = require('axios');

const API_URL = 'https://api.gritservices.ae';
const SUBDOMAIN = 'bellavista';

async function testWithExactHeaders() {
  try {
    console.log('🚀 Testing Production API with exact frontend headers...\n');

    // Test with exact headers the frontend uses
    const headers = {
      'X-Tenant-Subdomain': SUBDOMAIN,
      'X-Guest-Session-Id': `guest-T2-${Date.now()}`,
      'X-Table-Number': 'T2',
      'X-Device-Type': 'tablet',
      'Content-Type': 'application/json',
      'Origin': 'https://bellavista.gritservices.ae'
    };

    console.log('Headers being sent:', JSON.stringify(headers, null, 2));

    // Test 1: Guest customer session
    console.log('\n1. Testing guest customer session...');
    try {
      const response = await axios.get(`${API_URL}/api/guest/customer-session/table/T2`, { headers });
      console.log('✅ Success');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
      if (error.response?.headers) {
        console.log('Response headers:', error.response.headers);
      }
    }

    // Test 2: Menu
    console.log('\n2. Testing menu endpoint...');
    try {
      const response = await axios.get(`${API_URL}/api/menu?all=true`, { headers });
      console.log('✅ Success');
      console.log('Response has categories:', Object.keys(response.data).slice(0, 5).join(', '), '...');
    } catch (error) {
      console.log('❌ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

    // Test 3: Categories
    console.log('\n3. Testing categories endpoint...');
    try {
      const response = await axios.get(`${API_URL}/api/categories`, { headers });
      console.log('✅ Success');
      console.log('Categories count:', response.data.length);
    } catch (error) {
      console.log('❌ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

    // Test 4: Create session
    console.log('\n4. Testing create customer session...');
    try {
      const sessionData = {
        tableNumber: 'T2',
        customerName: 'Test Guest',
        customerPhone: '+971501234567',
        occupancy: 2
      };
      const response = await axios.post(`${API_URL}/api/guest/customer-session`, sessionData, { headers });
      console.log('✅ Success');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

testWithExactHeaders();