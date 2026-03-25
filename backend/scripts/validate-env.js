#!/usr/bin/env node
// scripts/validate-env.js
// Run before starting or deploying the backend to catch missing environment variables early.

'use strict';

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PORT',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SOROBAN_CONTRACT_ADDRESS',
  'STELLAR_NETWORK_URL',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error(
    '\nPlease add them to your .env file or your deployment environment.\n' +
    'See backend/.env.example for the full list of required variables.\n'
  );
  if (process.env.CI) {
    console.warn('⚠️  Running in CI without secrets — skipping hard failure.');
    process.exit(0);
  }
  process.exit(1);
}

console.log('✅ All required environment variables are present.');
