/**
 * Integration Test Setup
 * This file runs BEFORE jest.setup.js and sets up the environment for Firebase Admin SDK
 * 
 * CRITICAL: Environment variables MUST be set BEFORE importing firebase-admin
 */

// Set Firebase Emulator environment variables FIRST (before any imports)
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
console.log('✅ [Setup] Emulator environment configured:');
console.log(`   - FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST}`);
console.log(`   - FIREBASE_AUTH_EMULATOR_HOST: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

// Polyfill fetch for Firebase Admin SDK and callFunction
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Import Firebase modules AFTER environment is configured
const admin = require('firebase-admin');

// Clean up any existing apps on startup
const existingApps = admin.apps;
if (existingApps.length > 0) {
  console.log(`🧹 Cleaning up ${existingApps.length} existing Firebase Admin apps...`);
  existingApps.filter(app => app).forEach(app => {
    try {
      app.delete();
    } catch (e) {
      // Ignore cleanup errors
    }
  });
}

console.log('✅ Integration test setup complete (Firebase Admin SDK ready)');

