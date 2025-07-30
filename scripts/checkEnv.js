// scripts/checkEnv.js
// Utility to check if all required environment variables are set

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'USE_CLOUDINARY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

console.log('🔍 Checking environment variables...\n');

// Check required variables
console.log('Required Variables:');
let missingRequired = false;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    missingRequired = true;
  }
});

console.log('\nOptional Variables:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
});

if (missingRequired) {
  console.log('\n❌ Missing required environment variables!');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}
