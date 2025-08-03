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

async function testRevenuePredictions() {
  try {
    console.log('\n📊 Testing Revenue Predictions...');
    const response = await axios.get(`${API_URL}/admin/analytics/revenue-predictions`, {
      params: { range: '7d' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    console.log('✅ Revenue predictions received:');
    console.log(`  - Predictions count: ${response.data.predictions.length}`);
    console.log(`  - Accuracy: ${response.data.accuracy}%`);
    console.log(`  - Model version: ${response.data.modelVersion}`);
    console.log(`  - Sample prediction:`, response.data.predictions[0]);
  } catch (error) {
    console.error('❌ Revenue predictions failed:', error.response?.data || error.message);
  }
}

async function testDemandForecasts() {
  try {
    console.log('\n📈 Testing Demand Forecasts...');
    const response = await axios.get(`${API_URL}/admin/analytics/demand-forecasts`, {
      params: { range: '7d' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    console.log('✅ Demand forecasts received:');
    console.log(`  - Forecasts count: ${response.data.forecasts.length}`);
    console.log(`  - Accuracy: ${response.data.accuracy}%`);
    console.log(`  - Sample forecast:`, response.data.forecasts[0]);
  } catch (error) {
    console.error('❌ Demand forecasts failed:', error.response?.data || error.message);
  }
}

async function testAnomalies() {
  try {
    console.log('\n🚨 Testing Anomaly Detection...');
    const response = await axios.get(`${API_URL}/admin/analytics/anomalies`, {
      params: { range: '7d' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    console.log('✅ Anomalies detection completed:');
    console.log(`  - Total anomalies: ${response.data.totalDetected}`);
    console.log(`  - Detection rate: ${response.data.detectionRate}%`);
    if (response.data.anomalies.length > 0) {
      console.log(`  - Sample anomaly:`, response.data.anomalies[0]);
    }
  } catch (error) {
    console.error('❌ Anomaly detection failed:', error.response?.data || error.message);
  }
}

async function testAIInsights() {
  try {
    console.log('\n🧠 Testing AI Insights...');
    const response = await axios.get(`${API_URL}/admin/analytics/ai-insights`, {
      params: { range: '7d' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    
    console.log('✅ AI insights generated:');
    console.log(`  - Total insights: ${response.data.totalInsights}`);
    console.log(`  - Average confidence: ${response.data.avgConfidence.toFixed(1)}%`);
    if (response.data.insights.length > 0) {
      console.log(`  - Top insight:`, {
        category: response.data.insights[0].category,
        insight: response.data.insights[0].insight,
        recommendation: response.data.insights[0].recommendation
      });
    }
  } catch (error) {
    console.error('❌ AI insights failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Predictive Analytics API Tests');
  console.log('====================================');
  
  try {
    await login();
    await testRevenuePredictions();
    await testDemandForecasts();
    await testAnomalies();
    await testAIInsights();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

runTests();