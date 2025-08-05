const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updatePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User');
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    
    const result = await User.updateOne(
      { 
        email: 'testwaiter@mughlaimagic.ae',
        tenantId: 'rest_mughlaimagic_001'
      },
      { 
        $set: { 
          password: hashedPassword,
          isActive: true 
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('Password updated successfully!');
    } else {
      console.log('User not found or password unchanged');
    }

    console.log('\nLogin credentials:');
    console.log('Email: testwaiter@mughlaimagic.ae');
    console.log('Password: Test@123');
    console.log('Tenant: mughlaimagic');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePassword();