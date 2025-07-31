// MongoDB script to create admin users
// Run this directly in MongoDB Atlas shell or Compass

// First, check if tenants exist
db.tenants.find({ subdomain: { $in: ['mughlaimagic', 'bellavista', 'hardrockcafe'] } }).pretty();

// Create admin users for each tenant
// Password is hashed for 'password123'
const hashedPassword = '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe'; // This is a bcrypt hash for 'password123'

// For Mughlai Magic
db.users.updateOne(
  { 
    email: 'admin@mughlaimagic.ae',
    tenantId: 'rest_mughlaimagic_001'
  },
  {
    $set: {
      tenantId: 'rest_mughlaimagic_001',
      name: 'Admin',
      email: 'admin@mughlaimagic.ae',
      password: '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe', // password123
      role: 'admin',
      permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
      phone: '+971501234567',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },
  { upsert: true }
);

// For Bella Vista
db.users.updateOne(
  { 
    email: 'admin@bellavista.ae',
    tenantId: 'rest_bellavista_002'
  },
  {
    $set: {
      tenantId: 'rest_bellavista_002',
      name: 'Admin',
      email: 'admin@bellavista.ae',
      password: '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe', // password123
      role: 'admin',
      permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
      phone: '+971501234568',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },
  { upsert: true }
);

// For Hard Rock Cafe
db.users.updateOne(
  { 
    email: 'admin@hardrockcafe.ae',
    tenantId: 'rest_hardrockcafe_003'
  },
  {
    $set: {
      tenantId: 'rest_hardrockcafe_003',
      name: 'Admin',
      email: 'admin@hardrockcafe.ae',
      password: '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe', // password123
      role: 'admin',
      permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
      phone: '+971501234569',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },
  { upsert: true }
);

// Check if users were created
db.users.find({ email: { $in: ['admin@mughlaimagic.ae', 'admin@bellavista.ae', 'admin@hardrockcafe.ae'] } }).pretty();