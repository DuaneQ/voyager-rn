// Database connection test for voyager-RN
// This will verify we can connect to the same Firebase database as voyager-pwa

import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, query, limit } from 'firebase/firestore';

export const testDatabaseConnection = async () => {
  console.log('🧪 Testing Firebase database connection...');
  
  try {
    // Test 1: Try to read from users collection (should exist from voyager-pwa)
    console.log('📋 Test 1: Reading users collection...');
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(1));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`✅ Users collection accessible. Document count: ${usersSnapshot.size}`);
    
    // Test 2: Try to read from itineraries collection
    console.log('📋 Test 2: Reading itineraries collection...');
    const itinerariesRef = collection(db, 'itineraries');
    const itinerariesQuery = query(itinerariesRef, limit(1));
    const itinerariesSnapshot = await getDocs(itinerariesQuery);
    
    console.log(`✅ Itineraries collection accessible. Document count: ${itinerariesSnapshot.size}`);
    
    // Test 3: Try to read from connections collection
    console.log('📋 Test 3: Reading connections collection...');
    const connectionsRef = collection(db, 'connections');
    const connectionsQuery = query(connectionsRef, limit(1));
    const connectionsSnapshot = await getDocs(connectionsQuery);
    
    console.log(`✅ Connections collection accessible. Document count: ${connectionsSnapshot.size}`);
    
    console.log('🎉 All database tests passed! voyager-RN can access the shared database.');
    
    return {
      success: true,
      results: {
        users: usersSnapshot.size,
        itineraries: itinerariesSnapshot.size,
        connections: connectionsSnapshot.size
      }
    };
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};