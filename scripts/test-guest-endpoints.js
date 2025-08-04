const axios = require('axios');

const API_URL = process.env.API_URL || 'https://api.gritservices.ae';
const SUBDOMAIN = 'bellavista';
const TABLE_NUMBER = 'T2';

async function testGuestEndpoints() {
  try {
    console.log('🚀 Testing Guest API Endpoints...\n');

    // Common headers
    const headers = {
      'X-Tenant-Subdomain': SUBDOMAIN,
      'X-Guest-Session-Id': `guest-${TABLE_NUMBER}-${Date.now()}`,
      'X-Table-Number': TABLE_NUMBER,
      'X-Device-Type': 'tablet',
      'Content-Type': 'application/json'
    };

    // Test 1: Service Request
    console.log('1. Testing service request endpoint...');
    try {
      const serviceData = {
        tableNumber: TABLE_NUMBER,
        type: 'water',
        urgent: false
      };
      const response = await axios.post(`${API_URL}/api/guest/service-request`, serviceData, { headers });
      console.log('✅ Service request endpoint works');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Service request failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 2: Table Info
    console.log('\n2. Testing table info endpoint...');
    try {
      const response = await axios.get(`${API_URL}/api/guest/table/${TABLE_NUMBER}/info`, { headers });
      console.log('✅ Table info endpoint works');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Table info failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 3: Wait Times
    console.log('\n3. Testing wait times endpoint...');
    try {
      const response = await axios.get(`${API_URL}/api/guest/wait-times`, { headers });
      console.log('✅ Wait times endpoint works');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Wait times failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 4: Feedback
    console.log('\n4. Testing feedback endpoint...');
    try {
      const feedbackData = {
        tableNumber: TABLE_NUMBER,
        sessionId: `session-${Date.now()}`,
        rating: 5,
        foodQuality: 5,
        serviceQuality: 4,
        ambiance: 5,
        comments: 'Great experience!'
      };
      const response = await axios.post(`${API_URL}/api/guest/feedback`, feedbackData, { headers });
      console.log('✅ Feedback endpoint works');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Feedback failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 5: Call Waiter with bill request
    console.log('\n5. Testing call waiter for bill...');
    try {
      const billRequest = {
        tableNumber: TABLE_NUMBER,
        type: 'bill',
        urgent: true
      };
      const response = await axios.post(`${API_URL}/api/guest/service-request`, billRequest, { headers });
      console.log('✅ Bill request works');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Bill request failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
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
testGuestEndpoints();