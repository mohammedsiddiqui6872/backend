const fs = require('fs');
const path = require('path');

// Common environment variables used in the project
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
  'FRONTEND_URL'
];

const optionalEnvVars = [
  'REDIS_URL',
  'ENCRYPTION_KEY',
  'JWT_REFRESH_SECRET',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'USE_CLOUDINARY',
  'RATE_LIMIT_WINDOW',
  'RATE_LIMIT_MAX',
  'SESSION_SECRET',
  'CORS_ORIGIN'
];

console.log('Checking environment variables...\n');

// Load .env file
require('dotenv').config();

console.log('REQUIRED Environment Variables:');
console.log('==============================');
let missingRequired = 0;

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${varName.includes('PASSWORD') || varName.includes('SECRET') ? '***' : process.env[varName].substring(0, 30) + '...'}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    missingRequired++;
  }
});

console.log('\n\nOPTIONAL Environment Variables:');
console.log('==============================');
let missingOptional = 0;

optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('KEY') ? '***' : process.env[varName].substring(0, 30) + '...'}`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
    missingOptional++;
  }
});

console.log('\n\nSummary:');
console.log('========');
console.log(`Required variables missing: ${missingRequired}`);
console.log(`Optional variables missing: ${missingOptional}`);

if (missingRequired > 0) {
  console.log('\n❌ Some required environment variables are missing!');
  console.log('Please set them in your .env file or environment.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}