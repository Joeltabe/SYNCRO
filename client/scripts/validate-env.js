#!/usr/bin/env node
// scripts/validate-env.js
// Run before `next build` to catch missing environment variables early.

'use strict';

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_API_URL',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error(
    '\nPlease add them to your .env.local file (locally) or to the Vercel project settings.\n' +
    'See client/.env.example for the full list of required variables.\n'
  );
  if (process.env.CI) {
    console.warn('⚠️  Running in CI without secrets — skipping hard failure.');
    process.exit(0);
  }
  process.exit(1);
}

console.log('✅ All required environment variables are present.');
