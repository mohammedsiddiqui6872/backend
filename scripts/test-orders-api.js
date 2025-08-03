const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@mughlaimagic.ae';
const ADMIN_PASSWORD = 'password123';
const TENANT_ID = 'rest_mughlaimagic_001';
const SUBDOMAIN = 'mughlaimagic';

let authToken = '';

async function loginAdmin() {
  try {
    console.log('1. Testing Admin Login...');
    const response = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      headers: {
        'X-Tenant-Id': TENANT_ID,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    authToken = response.data.token;
    console.log('✅ Admin login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetOrders() {
  try {
    console.log('\n2. Testing Get Orders...');
    const response = await axios.get(`${API_BASE_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Id': TENANT_ID,
        'X-Tenant-Subdomain': SUBDOMAIN
      },
      params: {
        subdomain: SUBDOMAIN
      }
    });
    
    console.log('✅ Get orders successful');
    console.log(`   Total orders: ${response.data.length}`);
    console.log(`   Order statuses:`, response.data.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {}));
    
    // Show first order details
    if (response.data.length > 0) {
      const firstOrder = response.data[0];
      console.log(`\n   Sample Order:`);
      console.log(`   - Order #: ${firstOrder.orderNumber}`);
      console.log(`   - Table: ${firstOrder.tableNumber}`);
      console.log(`   - Customer: ${firstOrder.customerName}`);
      console.log(`   - Status: ${firstOrder.status}`);
      console.log(`   - Total: AED ${firstOrder.total}`);
      console.log(`   - Items: ${firstOrder.items?.length || 0}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Get orders failed:', error.response?.data || error.message);
    return [];
  }
}

async function testOrdersWithFilters() {
  try {
    console.log('\n3. Testing Orders with Filters...');
    
    // Test status filter
    const pendingOrders = await axios.get(`${API_BASE_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Id': TENANT_ID,
        'X-Tenant-Subdomain': SUBDOMAIN
      },
      params: {
        subdomain: SUBDOMAIN,
        status: ['pending', 'confirmed']
      }
    });
    
    console.log('✅ Filter by status successful');
    console.log(`   Pending/Confirmed orders: ${pendingOrders.data.length}`);
    
    // Test date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await axios.get(`${API_BASE_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Id': TENANT_ID,
        'X-Tenant-Subdomain': SUBDOMAIN
      },
      params: {
        subdomain: SUBDOMAIN,
        startDate: today.toISOString()
      }
    });
    
    console.log(`   Today's orders: ${todayOrders.data.length}`);
    
  } catch (error) {
    console.error('❌ Orders filter test failed:', error.response?.data || error.message);
  }
}

async function testOrderDetails(orderId) {
  try {
    console.log('\n4. Testing Get Order Details...');
    const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Id': TENANT_ID,
        'X-Tenant-Subdomain': SUBDOMAIN
      },
      params: {
        subdomain: SUBDOMAIN
      }
    });
    
    console.log('✅ Get order details successful');
    const order = response.data;
    console.log(`   Order #: ${order.orderNumber}`);
    console.log(`   Items:`);
    order.items.forEach((item, index) => {
      console.log(`     ${index + 1}. ${item.quantity}x ${item.name} - AED ${item.price} (${item.status})`);
      if (item.modifiers?.length > 0) {
        console.log(`        Modifiers: ${item.modifiers.map(m => m.name).join(', ')}`);
      }
      if (item.allergens?.length > 0) {
        console.log(`        Allergens: ${item.allergens.join(', ')}`);
      }
    });
    
    return order;
  } catch (error) {
    console.error('❌ Get order details failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateOrderStatus(orderId, newStatus) {
  try {
    console.log(`\n5. Testing Update Order Status to '${newStatus}'...`);
    const response = await axios.patch(`${API_BASE_URL}/orders/${orderId}/status`, 
      { status: newStatus },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Id': TENANT_ID,
          'X-Tenant-Subdomain': SUBDOMAIN
        },
        params: {
          subdomain: SUBDOMAIN
        }
      }
    );
    
    console.log('✅ Update order status successful');
    console.log(`   New status: ${response.data.status}`);
    
  } catch (error) {
    console.error('❌ Update order status failed:', error.response?.data || error.message);
  }
}

async function testCreateOrder() {
  try {
    console.log('\n6. Testing Create Order...');
    
    const newOrder = {
      tableNumber: 'T15',
      customerName: 'API Test Customer',
      customerPhone: '+971501234567',
      items: [
        {
          menuItem: '123456789012345678901234', // Dummy ID
          name: 'Chicken Biryani',
          price: 45,
          quantity: 2,
          modifiers: [
            { name: 'Extra Spicy', price: 2 }
          ],
          specialRequests: 'Extra rice please',
          status: 'pending',
          station: 'main',
          allergens: ['gluten'],
          dietary: []
        }
      ],
      subtotal: 94,
      tax: 4.7,
      total: 98.7,
      status: 'pending',
      paymentStatus: 'pending',
      createdBy: 'admin'
    };
    
    const response = await axios.post(`${API_BASE_URL}/orders`, newOrder, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Id': TENANT_ID,
        'X-Tenant-Subdomain': SUBDOMAIN
      },
      params: {
        subdomain: SUBDOMAIN
      }
    });
    
    console.log('✅ Create order successful');
    console.log(`   Order #: ${response.data.orderNumber}`);
    console.log(`   Order ID: ${response.data._id}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Create order failed:', error.response?.data || error.message);
    return null;
  }
}

async function testAnalyticsAPIs() {
  try {
    console.log('\n7. Testing Analytics APIs...');
    
    // Test Chef Performance
    try {
      const chefPerf = await axios.get(`${API_BASE_URL}/admin/analytics/chef-performance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Id': TENANT_ID,
          'X-Tenant-Subdomain': SUBDOMAIN
        },
        params: {
          subdomain: SUBDOMAIN,
          period: 'week'
        }
      });
      console.log('✅ Chef Performance API: OK');
    } catch (error) {
      console.error('❌ Chef Performance API:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    // Test Heat Map Data
    try {
      const heatMap = await axios.get(`${API_BASE_URL}/admin/analytics/heat-map`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Id': TENANT_ID,
          'X-Tenant-Subdomain': SUBDOMAIN
        },
        params: {
          subdomain: SUBDOMAIN,
          period: 'week'
        }
      });
      console.log('✅ Heat Map API: OK');
    } catch (error) {
      console.error('❌ Heat Map API:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    // Test Trend Analysis
    try {
      const trends = await axios.get(`${API_BASE_URL}/admin/analytics/trends`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Id': TENANT_ID,
          'X-Tenant-Subdomain': SUBDOMAIN
        },
        params: {
          subdomain: SUBDOMAIN,
          period: 'month'
        }
      });
      console.log('✅ Trends API: OK');
    } catch (error) {
      console.error('❌ Trends API:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    // Test Prep Time Predictions
    try {
      const prepTime = await axios.post(`${API_BASE_URL}/admin/analytics/prep-time-predictions`, 
        {
          items: [
            { menuItemId: '123', quantity: 2 }
          ],
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Tenant-Id': TENANT_ID,
            'X-Tenant-Subdomain': SUBDOMAIN
          },
          params: {
            subdomain: SUBDOMAIN
          }
        }
      );
      console.log('✅ Prep Time Predictions API: OK');
    } catch (error) {
      console.error('❌ Prep Time Predictions API:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    // Test Station Load Data
    try {
      const stationLoad = await axios.get(`${API_BASE_URL}/admin/stations/load-data`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Id': TENANT_ID,
          'X-Tenant-Subdomain': SUBDOMAIN
        },
        params: {
          subdomain: SUBDOMAIN
        }
      });
      console.log('✅ Station Load Data API: OK');
    } catch (error) {
      console.error('❌ Station Load Data API:', error.response?.status, error.response?.data?.error || error.message);
    }
    
  } catch (error) {
    console.error('Analytics API test error:', error.message);
  }
}

async function runTests() {
  console.log('Starting Orders API Tests...\n');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Testing Tenant:', SUBDOMAIN);
  console.log('=' .repeat(50));
  
  // Login first
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Get orders
  const orders = await testGetOrders();
  
  // Test filters
  await testOrdersWithFilters();
  
  // Test order details if we have orders
  if (orders.length > 0) {
    const firstOrder = orders[0];
    await testOrderDetails(firstOrder._id);
    
    // Test status update for a pending order
    const pendingOrder = orders.find(o => o.status === 'pending');
    if (pendingOrder) {
      await testUpdateOrderStatus(pendingOrder._id, 'confirmed');
    }
  }
  
  // Test create order
  await testCreateOrder();
  
  // Test analytics APIs
  await testAnalyticsAPIs();
  
  console.log('\n' + '=' .repeat(50));
  console.log('API Tests completed!');
}

// Run the tests
runTests().catch(console.error);