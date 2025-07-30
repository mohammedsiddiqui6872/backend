# Seamless Restaurant Onboarding Implementation Guide

## Overview
This document details the implementation of a seamless onboarding process for both restaurant owners and you as the SaaS provider.

## 1. SaaS Control Panel Structure

### Create a New Next.js App for Super Admin
```bash
npx create-next-app@latest restaurant-saas-portal
cd restaurant-saas-portal
```

### Key Pages & Features

```
/dashboard - Overview of all tenants
/tenants - Manage restaurants
/tenants/new - Onboard new restaurant
/tenants/[id] - Individual restaurant details
/billing - Revenue & billing management
/analytics - Platform-wide analytics
/support - Support ticket system
/settings - Platform settings
```

## 2. Restaurant Onboarding Workflow

### A. Self-Service Flow (Recommended)

```javascript
// pages/signup.js - Public signup page
export default function RestaurantSignup() {
  return (
    <SignupWizard steps={[
      'Restaurant Details',
      'Choose Subdomain',
      'Select Plan',
      'Payment Setup',
      'Confirm & Launch'
    ]} />
  );
}
```

### Step 1: Restaurant Details
```javascript
const RestaurantDetailsForm = () => {
  return (
    <form>
      <input name="restaurantName" placeholder="Restaurant Name" required />
      <input name="ownerName" placeholder="Owner Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="phone" placeholder="Phone Number" required />
      <textarea name="address" placeholder="Restaurant Address" />
      <select name="cuisine">
        <option>Italian</option>
        <option>Chinese</option>
        <option>Indian</option>
        <option>American</option>
        <option>Mexican</option>
      </select>
      <input name="seats" type="number" placeholder="Number of Tables" />
    </form>
  );
};
```

### Step 2: Subdomain Selection
```javascript
const SubdomainSelector = () => {
  const [subdomain, setSubdomain] = useState('');
  const [available, setAvailable] = useState(null);
  
  const checkAvailability = async () => {
    const res = await fetch(`/api/check-subdomain?name=${subdomain}`);
    const data = await res.json();
    setAvailable(data.available);
  };
  
  return (
    <div>
      <input 
        value={subdomain}
        onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
        placeholder="myrestaurant"
      />
      <span>.ordernow.com</span>
      <button onClick={checkAvailability}>Check Availability</button>
      
      {available === false && (
        <p>This subdomain is taken. Try another one.</p>
      )}
      
      {available === true && (
        <p>Great! {subdomain}.ordernow.com is available!</p>
      )}
    </div>
  );
};
```

### Step 3: Plan Selection
```javascript
const PlanSelector = () => {
  const plans = [
    {
      id: 'trial',
      name: 'Free Trial',
      price: 0,
      duration: '14 days',
      features: ['Up to 50 orders', '5 staff accounts', 'Basic support']
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 29,
      features: ['500 orders/month', '10 staff accounts', 'Email support']
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 79,
      features: ['Unlimited orders', '25 staff accounts', 'Priority support', 'Custom branding']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      features: ['Everything in Pro', 'Custom domain', 'API access', 'Dedicated support']
    }
  ];
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {plans.map(plan => (
        <PlanCard key={plan.id} {...plan} />
      ))}
    </div>
  );
};
```

### Step 4: Automated Setup Process
```javascript
// api/tenant/create.js
export async function createTenant(data) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Create tenant record
    const tenant = await Tenant.create({
      tenantId: generateTenantId(),
      name: data.restaurantName,
      subdomain: data.subdomain,
      plan: data.plan,
      owner: {
        name: data.ownerName,
        email: data.email,
        phone: data.phone
      }
    });
    
    // 2. Create admin user
    const adminUser = await User.create({
      tenantId: tenant.tenantId,
      email: data.email,
      name: data.ownerName,
      role: 'admin',
      password: generateTempPassword()
    });
    
    // 3. Initialize default data
    await Promise.all([
      createDefaultCategories(tenant.tenantId),
      createDefaultTables(tenant.tenantId, data.seats || 10),
      createSampleMenuItems(tenant.tenantId),
      createDefaultSettings(tenant.tenantId)
    ]);
    
    // 4. Setup Stripe subscription
    if (data.plan !== 'trial') {
      const subscription = await createStripeSubscription(
        tenant.billing.stripeCustomerId,
        data.plan
      );
      tenant.billing.subscriptionId = subscription.id;
      await tenant.save();
    }
    
    // 5. Send welcome email
    await sendWelcomeEmail({
      email: data.email,
      restaurantName: data.restaurantName,
      subdomain: data.subdomain,
      tempPassword: adminUser.tempPassword,
      loginUrl: `https://${data.subdomain}.ordernow.com/admin`
    });
    
    await session.commitTransaction();
    return { success: true, tenant };
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## 3. Provider Management Dashboard

### A. Tenant Overview Dashboard
```javascript
// pages/dashboard.js
export default function ProviderDashboard() {
  const { data: stats } = useSWR('/api/stats');
  
  return (
    <Dashboard>
      <StatCard title="Active Restaurants" value={stats?.activeRestaurants} />
      <StatCard title="Total Orders Today" value={stats?.ordersToday} />
      <StatCard title="MRR" value={`$${stats?.mrr}`} />
      <StatCard title="Active Users" value={stats?.activeUsers} />
      
      <RecentActivity />
      <RevenueChart />
      <TopRestaurants />
      <PendingOnboardings />
    </Dashboard>
  );
}
```

### B. Tenant Management Interface
```javascript
// pages/tenants/index.js
export default function TenantManagement() {
  return (
    <TenantTable
      columns={[
        'Restaurant Name',
        'Subdomain',
        'Plan',
        'Status',
        'MRR',
        'Orders',
        'Created',
        'Actions'
      ]}
      actions={[
        { label: 'View Details', action: 'view' },
        { label: 'Login As', action: 'impersonate' },
        { label: 'Suspend', action: 'suspend' },
        { label: 'Upgrade Plan', action: 'upgrade' }
      ]}
    />
  );
}
```

### C. Support & Communication
```javascript
// Built-in support system
const SupportSystem = () => {
  return (
    <>
      <TicketList />
      <LiveChat />
      <KnowledgeBase />
      <AnnouncementSystem />
    </>
  );
};
```

## 4. Deployment Strategy

### A. Vercel Configuration

#### 1. Main SaaS Portal (Vercel)
```json
// vercel.json for SaaS portal
{
  "domains": [
    "app.ordernow.com",
    "portal.ordernow.com"
  ]
}
```

#### 2. Restaurant Frontend (Vercel)
```json
// vercel.json for restaurant app
{
  "domains": ["*.ordernow.com"],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/tenant-proxy"
    }
  ]
}
```

### B. Render Configuration

#### Backend API
```yaml
# render.yaml
services:
  - type: web
    name: restaurant-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: MULTI_TENANT
        value: true
      - key: NODE_ENV
        value: production
```

## 5. Infrastructure Setup

### A. DNS Configuration
```
1. Main domain: ordernow.com → Vercel (Portal)
2. Wildcard: *.ordernow.com → Vercel (Restaurant Apps)
3. API: api.ordernow.com → Render
4. Admin: admin.ordernow.com → Render
```

### B. SSL Certificates
- Vercel: Automatic SSL for all subdomains
- Render: Automatic SSL for admin and API

## 6. MongoDB Atlas Configuration

### A. Create Indexes for Multi-Tenancy
```javascript
// Run these in MongoDB Atlas
db.tenants.createIndex({ subdomain: 1 }, { unique: true });
db.tenants.createIndex({ tenantId: 1 }, { unique: true });
db.tenants.createIndex({ status: 1 });

// For all collections
const collections = ['users', 'orders', 'menuitems', 'categories'];
collections.forEach(coll => {
  db[coll].createIndex({ tenantId: 1 });
  db[coll].createIndex({ tenantId: 1, createdAt: -1 });
});
```

### B. Connection String Management
```javascript
// Different connection strings per environment
const getMongoUri = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.MONGODB_URI_PROD;
  }
  return process.env.MONGODB_URI_DEV;
};
```

## 7. Automated Onboarding Scripts

### A. Tenant Provisioning Script
```javascript
// scripts/provision-tenant.js
const provisionTenant = async (tenantData) => {
  console.log(`Provisioning ${tenantData.name}...`);
  
  // 1. Database setup
  await createTenantCollections(tenantData.tenantId);
  
  // 2. Default data
  await seedDefaultData(tenantData.tenantId);
  
  // 3. Configure subdomain
  await configureSubdomain(tenantData.subdomain);
  
  // 4. Setup monitoring
  await setupMonitoring(tenantData.tenantId);
  
  // 5. Send notifications
  await notifySuccess(tenantData);
};
```

### B. Health Check System
```javascript
// Monitor tenant health
const tenantHealthCheck = async () => {
  const tenants = await Tenant.find({ status: 'active' });
  
  for (const tenant of tenants) {
    const health = await checkTenantHealth(tenant);
    
    if (!health.isHealthy) {
      await notifyIssue(tenant, health.issues);
    }
  }
};

// Run every 5 minutes
setInterval(tenantHealthCheck, 5 * 60 * 1000);
```

## 8. Billing & Subscription Management

### A. Stripe Integration
```javascript
// Webhook handler for Stripe events
app.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
});
```

## 9. Monitoring & Analytics

### A. Platform Analytics
```javascript
const PlatformAnalytics = () => {
  const metrics = {
    totalRestaurants: 50,
    activeRestaurants: 48,
    totalOrdersToday: 1234,
    totalRevenueToday: 45678,
    avgOrderValue: 37.05,
    topPerformers: [...],
    churnRate: 2.1
  };
  
  return <AnalyticsDashboard metrics={metrics} />;
};
```

### B. Tenant Usage Tracking
```javascript
// Track usage per tenant
const trackUsage = async (tenantId, metric, value = 1) => {
  const key = `usage:${tenantId}:${moment().format('YYYY-MM')}`;
  await redis.hincrby(key, metric, value);
};

// Usage metrics
await trackUsage(tenantId, 'orders', 1);
await trackUsage(tenantId, 'api_calls', 1);
await trackUsage(tenantId, 'storage_mb', fileSize);
```

## 10. Free MongoDB Atlas Limitations & Solutions

### Current Limits (M0 Free Tier)
- 512MB storage
- 100 max connections
- No performance advisor

### When to Upgrade
```
10 restaurants = ~100-200MB (OK for free tier)
20 restaurants = ~200-400MB (OK for free tier)
30+ restaurants = ~500MB+ (Need to upgrade)
```

### Optimization Tips
1. Enable compression
2. Use proper indexes
3. Archive old data
4. Implement data retention policies

### Migration Path
```
M0 (Free) → M10 ($57/mo) → M20 ($140/mo) → M30+ (Custom)
```

## Summary

This multi-tenant architecture provides:
1. **Seamless onboarding** through automated provisioning
2. **Centralized management** via SaaS control panel
3. **Scalable infrastructure** using Vercel + Render
4. **Cost-effective** solution starting at ~$115/month
5. **MongoDB scaling path** from free tier to dedicated clusters

The system can easily handle 50+ restaurants with room for growth!