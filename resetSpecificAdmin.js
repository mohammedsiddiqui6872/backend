require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function resetSpecificAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = 'admin@mughlaimagic.ae';
    const newPassword = 'GritAdmin2025!';
    
    // Find user without tenant filter
    const user = await User.findOne({ email }).setOptions({ skipTenantFilter: true });
    
    if (!user) {
      console.error(`User ${email} not found`);
      return;
    }
    
    console.log(`Found user: ${user.email}`);
    console.log(`TenantId: ${user.tenantId}`);
    console.log(`Role: ${user.role}`);
    
    // Set password directly - the model will hash it
    user.password = newPassword;
    
    await user.save();
    console.log(`Password reset successfully for ${email}`);
    
    // Test the password
    const isValid = await bcrypt.compare(newPassword, user.password);
    console.log(`Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetSpecificAdmin();