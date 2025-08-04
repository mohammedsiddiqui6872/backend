const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Tenant = require('./src/models/Tenant');
require('dotenv').config();
async function resetMughlaiMagicAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain: 'mughlaimagic' });
    if (!tenant) {
      process.exit(1);
    }
    // Find the admin user
    const adminEmail = 'admin@mughlaimagic.ae';
    const adminUser = await User.findOne({
      tenantId: tenant.tenantId,
      email: adminEmail
    });
    if (!adminUser) {
      process.exit(1);
    }
    // Reset password to a known value
    const newPassword = 'MughlaiAdmin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    adminUser.password = hashedPassword;
    adminUser.isActive = true;
    await adminUser.save();
  } catch (error) {
  } finally {
    await mongoose.connection.close();
  }
}
resetMughlaiMagicAdmin();