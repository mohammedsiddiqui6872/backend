const axios = require('axios');

async function testPortalLogin() {
  console.log('Testing SaaS Portal Login...\n');
  
  // Test with deployment URL
  const apiUrl = 'https://saas-portal-rho-six.vercel.app';
  
  const credentials = {
    email: 'admin@gritservices.ae',
    password: 'Admin@123'
  };
  
  console.log('Testing login with:');
  console.log('URL:', apiUrl);
  console.log('Email:', credentials.email);
  console.log('Password:', '***');
  
  try {
    // First check if the API is reachable
    console.log('\n1. Checking if backend is reachable...');
    const healthCheck = await axios.get('https://gritservices-backend.onrender.com/api/public/health');
    console.log('✅ Backend is reachable:', healthCheck.data);
    
    // Try login
    console.log('\n2. Attempting login...');
    const response = await axios.post('https://gritservices-backend.onrender.com/api/auth/admin/login', credentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', {
      user: response.data.user,
      token: response.data.token ? 'Token received' : 'No token'
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.log('\nThe backend is returning a 500 error. This could mean:');
      console.log('1. The backend deployment is still building');
      console.log('2. There\'s a database connection issue');
      console.log('3. The environment variables are not set correctly on Render');
      
      console.log('\nPlease check:');
      console.log('- Render deployment logs at https://dashboard.render.com');
      console.log('- Ensure all environment variables are set in Render');
      console.log('- Wait a few minutes for the deployment to complete');
    }
  }
}

testPortalLogin();