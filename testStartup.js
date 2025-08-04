const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing backend startup requirements...\n');

// Test MongoDB connection
console.log('1. Testing MongoDB connection...');
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ MongoDB connection successful!');
  mongoose.connection.close();
  
  // Test required modules
  console.log('\n2. Testing required modules...');
  try {
    require('express');
    console.log('✅ Express loaded');
    require('cors');
    console.log('✅ CORS loaded');
    require('helmet');
    console.log('✅ Helmet loaded');
    require('socket.io');
    console.log('✅ Socket.io loaded');
    require('jsonwebtoken');
    console.log('✅ JWT loaded');
    require('bcryptjs');
    console.log('✅ Bcrypt loaded');
    
    console.log('\n3. Testing models...');
    require('./src/models/User');
    console.log('✅ User model loaded');
    require('./src/models/Tenant');
    console.log('✅ Tenant model loaded');
    require('./src/models/Order');
    console.log('✅ Order model loaded');
    require('./src/models/Table');
    console.log('✅ Table model loaded');
    
    console.log('\n✅ All startup requirements passed!');
    console.log('The backend should be ready to run.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Module loading error:', error.message);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});