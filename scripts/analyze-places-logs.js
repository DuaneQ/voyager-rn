#!/usr/bin/env node

/**
 * Analyze Google Places API logs to identify cost spikes
 * 
 * Usage:
 *   node analyze-places-logs.js feb9_logs.txt
 *   
 * Or pipe Firebase logs directly:
 *   firebase functions:log --project mundo1-1 --lines 5000 | grep "Places API" | node analyze-places-logs.js
 */

const fs = require('fs');
const readline = require('readline');

// Cost per API call
const API_COSTS = {
  autocompleteWithSession: 0.017,
  autocompleteNoSession: 0.00283,
  textSearch: 0.032,
  placeDetails: 0.017,
  nearbySearch: 0.032,
};

// Stats object
const stats = {
  totalLines: 0,
  apiCalls: {
    autocomplete: { total: 0, withSession: 0, withoutSession: 0 },
    textSearch: { total: 0, byFunction: {}, byQuery: {}, paginated: 0 },
    placeDetails: { total: 0, byFunction: {} },
    nearbySearch: { total: 0 },
  },
  byFunction: {},
  byComponent: {},
  estimatedCost: 0,
};

function parseLogLine(line) {
  stats.totalLines++;

  // Parse autocomplete
  if (line.includes('🔍 [Places API] Autocomplete')) {
    stats.apiCalls.autocomplete.total++;
    
    const hasSession = line.includes('Session: YES');
    if (hasSession) {
      stats.apiCalls.autocomplete.withSession++;
      stats.estimatedCost += API_COSTS.autocompleteWithSession;
    } else {
      stats.apiCalls.autocomplete.withoutSession++;
      stats.estimatedCost += API_COSTS.autocompleteNoSession;
    }
    
    // Extract component name
    const componentMatch = line.match(/Component: ([^\s]+)/);
    if (componentMatch) {
      const component = componentMatch[1];
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
    }
  }
  
  // Parse text search
  if (line.includes('⚠️ [Places API] TEXT SEARCH')) {
    stats.apiCalls.textSearch.total++;
    stats.estimatedCost += API_COSTS.textSearch;
    
    // Extract function name
    const functionMatch = line.match(/Function: ([^\s]+)/);
    if (functionMatch) {
      const functionName = functionMatch[1];
      stats.apiCalls.textSearch.byFunction[functionName] = 
        (stats.apiCalls.textSearch.byFunction[functionName] || 0) + 1;
      stats.byFunction[functionName] = (stats.byFunction[functionName] || 0) + 1;
    }
    
    // Check if paginated
    if (line.includes('Page: YES')) {
      stats.apiCalls.textSearch.paginated++;
    }
    
    // Extract query (rough approximation)
    const queryMatch = line.match(/"([^"]+)"/);
    if (queryMatch) {
      const query = queryMatch[1].substring(0, 50); // Truncate long queries
      stats.apiCalls.textSearch.byQuery[query] = 
        (stats.apiCalls.textSearch.byQuery[query] || 0) + 1;
    }
  }
  
  // Parse place details
  if (line.includes('PLACE DETAILS')) {
    stats.apiCalls.placeDetails.total++;
    stats.estimatedCost += API_COSTS.placeDetails;
    
    const functionMatch = line.match(/Function: ([^\s]+)/);
    if (functionMatch) {
      const functionName = functionMatch[1];
      stats.apiCalls.placeDetails.byFunction[functionName] = 
        (stats.apiCalls.placeDetails.byFunction[functionName] || 0) + 1;
      stats.byFunction[functionName] = (stats.byFunction[functionName] || 0) + 1;
    }
  }
  
  // Parse nearby search
  if (line.includes('NEARBY SEARCH')) {
    stats.apiCalls.nearbySearch.total++;
    stats.estimatedCost += API_COSTS.nearbySearch;
  }
}

async function processFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    parseLogLine(line);
  }
}

async function processStdin() {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    parseLogLine(line);
  }
}

function printReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 Google Places API Usage Analysis');
  console.log('='.repeat(80) + '\n');
  
  console.log('💰 **ESTIMATED COST**: $' + stats.estimatedCost.toFixed(2));
  console.log('📝 Total log lines processed:', stats.totalLines);
  console.log('');
  
  console.log('📈 API Calls Breakdown:');
  console.log('-'.repeat(80));
  
  // Autocomplete
  console.log(`\n🔍 Autocomplete: ${stats.apiCalls.autocomplete.total} calls`);
  console.log(`   ✅ With session token: ${stats.apiCalls.autocomplete.withSession} ($${(stats.apiCalls.autocomplete.withSession * API_COSTS.autocompleteWithSession).toFixed(2)})`);
  console.log(`   ❌ Without session token: ${stats.apiCalls.autocomplete.withoutSession} ($${(stats.apiCalls.autocomplete.withoutSession * API_COSTS.autocompleteNoSession).toFixed(2)})`);
  
  if (stats.apiCalls.autocomplete.withoutSession > stats.apiCalls.autocomplete.withSession) {
    console.log(`   ⚠️  WARNING: More calls WITHOUT session token! Session token implementation may be broken.`);
  }
  
  // Text Search
  console.log(`\n⚠️  Text Search (EXPENSIVE): ${stats.apiCalls.textSearch.total} calls ($${(stats.apiCalls.textSearch.total * API_COSTS.textSearch).toFixed(2)})`);
  console.log(`   📄 Paginated calls: ${stats.apiCalls.textSearch.paginated} (${((stats.apiCalls.textSearch.paginated / stats.apiCalls.textSearch.total) * 100).toFixed(1)}%)`);
  
  if (Object.keys(stats.apiCalls.textSearch.byFunction).length > 0) {
    console.log('\n   By Function:');
    Object.entries(stats.apiCalls.textSearch.byFunction)
      .sort((a, b) => b[1] - a[1])
      .forEach(([func, count]) => {
        console.log(`      ${func}: ${count} calls ($${(count * API_COSTS.textSearch).toFixed(2)})`);
      });
  }
  
  // Top queries
  if (Object.keys(stats.apiCalls.textSearch.byQuery).length > 0) {
    console.log('\n   Top 10 Queries:');
    Object.entries(stats.apiCalls.textSearch.byQuery)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([query, count]) => {
        console.log(`      "${query}": ${count} calls`);
      });
  }
  
  // Place Details
  if (stats.apiCalls.placeDetails.total > 0) {
    console.log(`\n⚠️  Place Details: ${stats.apiCalls.placeDetails.total} calls ($${(stats.apiCalls.placeDetails.total * API_COSTS.placeDetails).toFixed(2)})`);
    
    if (Object.keys(stats.apiCalls.placeDetails.byFunction).length > 0) {
      console.log('   By Function:');
      Object.entries(stats.apiCalls.placeDetails.byFunction)
        .sort((a, b) => b[1] - a[1])
        .forEach(([func, count]) => {
          console.log(`      ${func}: ${count} calls ($${(count * API_COSTS.placeDetails).toFixed(2)})`);
        });
    }
  }
  
  // Nearby Search
  if (stats.apiCalls.nearbySearch.total > 0) {
    console.log(`\n⚠️  Nearby Search: ${stats.apiCalls.nearbySearch.total} calls ($${(stats.apiCalls.nearbySearch.total * API_COSTS.nearbySearch).toFixed(2)})`);
  }
  
  // By Component (client-side)
  if (Object.keys(stats.byComponent).length > 0) {
    console.log('\n\n📱 Client-Side Components:');
    console.log('-'.repeat(80));
    Object.entries(stats.byComponent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([component, count]) => {
        console.log(`   ${component}: ${count} calls`);
      });
  }
  
  // By Function (server-side)
  if (Object.keys(stats.byFunction).length > 0) {
    console.log('\n\n⚙️  Cloud Functions:');
    console.log('-'.repeat(80));
    Object.entries(stats.byFunction)
      .sort((a, b) => b[1] - a[1])
      .forEach(([func, count]) => {
        console.log(`   ${func}: ${count} calls`);
      });
  }
  
  // Warnings
  console.log('\n\n⚠️  Warnings & Recommendations:');
  console.log('-'.repeat(80));
  
  if (stats.apiCalls.textSearch.total > 500) {
    console.log('   🔴 HIGH TEXT SEARCH VOLUME: Consider implementing result caching');
  }
  
  if (stats.apiCalls.textSearch.paginated > stats.apiCalls.textSearch.total * 0.3) {
    console.log('   🟡 HIGH PAGINATION RATE: Consider reducing maxResults or limiting pages');
  }
  
  if (stats.apiCalls.textSearch.byFunction['verifyPlaces'] > 0) {
    console.log('   🔴 CRITICAL: verifyPlaces is still being called! This function should be disabled.');
  }
  
  if (stats.apiCalls.autocomplete.withoutSession > stats.apiCalls.autocomplete.total * 0.2) {
    console.log('   🟡 AUTOCOMPLETE SESSION TOKENS: More than 20% of calls without session token');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Main
(async () => {
  const filePath = process.argv[2];
  
  if (!filePath && process.stdin.isTTY) {
    console.error('Usage: node analyze-places-logs.js <log-file>');
    console.error('   Or: firebase functions:log --lines 5000 | grep "Places API" | node analyze-places-logs.js');
    process.exit(1);
  }
  
  try {
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }
      await processFile(filePath);
    } else {
      await processStdin();
    }
    
    printReport();
  } catch (err) {
    console.error('Error processing logs:', err.message);
    process.exit(1);
  }
})();
