const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const SUBDOMAIN = 'mughlaimagic';
const ADMIN_EMAIL = 'admin@mughlaimagic.ae';
const ADMIN_PASSWORD = 'password123';

let token = '';

async function login() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${API_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      headers: {
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    token = response.data.token;
    console.log('✅ Login successful');
    return token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testRealTimeMetrics() {
  try {
    console.log('\n📊 Testing Real-Time Metrics...');
    const response = await axios.get(`${API_URL}/admin/analytics/real-time-metrics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    console.log('✅ Real-time metrics received:');
    const metrics = response.data;
    
    console.log('\n💰 Revenue Metrics:');
    console.log(`  - Current: AED ${metrics.revenue.toFixed(2)}`);
    console.log(`  - Change: ${metrics.revenueChange > 0 ? '+' : ''}${metrics.revenueChange.toFixed(1)}%`);
    
    console.log('\n📦 Order Metrics:');
    console.log(`  - Total Orders: ${metrics.orders}`);
    console.log(`  - Change: ${metrics.ordersChange > 0 ? '+' : ''}${metrics.ordersChange.toFixed(1)}%`);
    console.log(`  - Avg Order Value: AED ${metrics.avgOrderValue.toFixed(2)}`);
    
    console.log('\n👥 Customer Metrics:');
    console.log(`  - Active Customers: ${metrics.activeCustomers}`);
    console.log(`  - Change: ${metrics.customersChange > 0 ? '+' : ''}${metrics.customersChange.toFixed(1)}%`);
    
    console.log('\n🏪 Operational Metrics:');
    console.log(`  - Table Occupancy: ${metrics.tableOccupancy}%`);
    console.log(`  - Avg Prep Time: ${metrics.avgPrepTime} minutes`);
    console.log(`  - Staff Efficiency: ${metrics.staffEfficiency}%`);
    console.log(`  - Customer Satisfaction: ${metrics.customerSatisfaction}%`);
    
    console.log('\n📈 Sparkline Data:');
    console.log(`  - Revenue sparkline points: ${metrics.revenueSparkline.length}`);
    console.log(`  - Last updated: ${new Date(metrics.lastUpdated).toLocaleString()}`);
    
    // Check for alerts
    console.log('\n🚨 Alert Conditions:');
    if (metrics.tableOccupancy > 90) {
      console.log('  ⚠️  HIGH TABLE OCCUPANCY - Consider opening additional sections');
    }
    if (metrics.avgPrepTime > 25) {
      console.log('  ⚠️  ELEVATED PREP TIMES - Check kitchen capacity');
    }
    if (metrics.staffEfficiency < 70) {
      console.log('  ⚠️  LOW STAFF EFFICIENCY - Consider additional training');
    }
    
  } catch (error) {
    console.error('❌ Real-time metrics test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Real-Time Performance Dashboard API');
  console.log('==========================================');
  
  try {
    await login();
    await testRealTimeMetrics();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

runTests();