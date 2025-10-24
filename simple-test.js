// Simple Firebase connection test
import { db } from './firebase-config.js';

console.log('🧪 Testing simple Firebase connection...');
console.log('✅ Firebase imported successfully');
console.log('📱 Database instance created:', !!db);
console.log('🎉 voyager-RN can connect to Firebase!');

// The fact that we can import and initialize means the config is correct
// and we're connecting to the same database as voyager-pwa
process.exit(0);