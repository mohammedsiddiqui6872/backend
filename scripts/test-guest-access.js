const axios = require('axios');

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.gritservices.ae' 
  : 'http://localhost:5000';

const SUBDOMAIN = 'bellavista';
const TABLE_NUMBER = 'T1';

async function testGuestAccess() {
  try {
    console.log('🚀 Testing Guest Access API...\n');

    // 1. Test menu access without authentication
    console.log('1. Testing menu access (no auth required)...');
    const menuResponse = await axios.get(`${API_URL}/api/menu`, {
      headers: {
        'X-Tenant-Subdomain': SUBDOMAIN,
        'X-Guest-Session-Id': `guest-${TABLE_NUMBER}-${Date.now()}`,
        'X-Table-Number': TABLE_NUMBER
      }
    });
    console.log('✅ Menu fetched successfully');
    // Menu response is an object with categories as keys
    const menuItems = [];
    Object.keys(menuResponse.data).forEach(category => {
      if (Array.isArray(menuResponse.data[category])) {
        menuItems.push(...menuResponse.data[category]);
      }
    });
    console.log(`   Items found: ${menuItems.length}`);
    console.log(`   Categories: ${Object.keys(menuResponse.data).join(', ')}`);
    console.log('');

    // 2. Test categories access
    console.log('2. Testing categories access...');
    const categoriesResponse = await axios.get(`${API_URL}/api/categories`, {
      headers: {
        'X-Tenant-Subdomain': SUBDOMAIN,
        'X-Guest-Session-Id': `guest-${TABLE_NUMBER}-${Date.now()}`,
        'X-Table-Number': TABLE_NUMBER
      }
    });
    console.log('✅ Categories fetched successfully');
    console.log(`   Categories found: ${categoriesResponse.data.length}`);
    console.log('');

    // 3. Test creating an order
    console.log('3. Testing order creation...');
    const orderData = {
      tableNumber: TABLE_NUMBER,
      customerName: 'Test Guest',
      customerPhone: '+971501234567',
      items: menuItems.slice(0, 2).map(item => ({
        menuItem: item._id,
        name: item.name,
        price: item.price,
        quantity: 1
      })),
      specialInstructions: 'Test order from guest access'
    };

    const orderResponse = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: {
        'X-Tenant-Subdomain': SUBDOMAIN,
        'X-Guest-Session-Id': `guest-${TABLE_NUMBER}-${Date.now()}`,
        'X-Table-Number': TABLE_NUMBER
      }
    });
    console.log('✅ Order created successfully');
    console.log(`   Order ID: ${orderResponse.data.order._id}`);
    console.log(`   Order Number: ${orderResponse.data.order.orderNumber}`);
    console.log(`   Total Amount: ${orderResponse.data.order.totalAmount}`);
    console.log('');

    // 4. Test CORS headers
    console.log('4. Testing CORS headers...');
    const corsTestResponse = await axios.options(`${API_URL}/api/menu`, {
      headers: {
        'Origin': 'https://bellavista.gritservices.ae',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-Tenant-Subdomain,X-Guest-Session-Id,X-Table-Number'
      }
    });
    console.log('✅ CORS preflight successful');
    console.log(`   Access-Control-Allow-Origin: ${corsTestResponse.headers['access-control-allow-origin']}`);
    console.log(`   Access-Control-Allow-Headers: ${corsTestResponse.headers['access-control-allow-headers']}`);
    console.log('');

    console.log('✅ All guest access tests passed!');

  } catch (error) {
    console.error('\n❌ Error testing guest access:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testGuestAccess();