#!/usr/bin/env node
/*
 * Fetch the OpenFlights airports.dat CSV and convert to a trimmed JSON file
 * Usage: node scripts/import-openflights.js
 * Output: src/data/openflights.json
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const OPENFLIGHTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'openflights.json');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

console.log('Fetching OpenFlights data...');
https.get(OPENFLIGHTS_URL, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to fetch OpenFlights:', res.statusCode);
    process.exit(1);
  }
  let raw = '';
  res.on('data', (chunk) => raw += chunk);
  res.on('end', () => {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const line of lines) {
      const parts = parseCSVLine(line);
      // OpenFlights: ID,Name,City,Country,IATA,ICAO,Latitude,Longitude,Altitude,Timezone,DST,Tz,Type,Source
      if (parts.length < 14) continue;
      const iata = parts[4] ? parts[4].replace(/"/g, '') : '';
      const type = parts[12] ? parts[12].replace(/"/g, '') : '';
      const lat = parseFloat(parts[6]);
      const lng = parseFloat(parts[7]);
      if (!iata || iata === '\\N' || iata.length !== 3) continue;
      if (type !== 'airport') continue;
      if (!lat || !lng) continue;
      out.push({
        iata: iata.toUpperCase(),
        name: (parts[1] || '').replace(/"/g, ''),
        city: (parts[2] || '').replace(/"/g, ''),
        country: (parts[3] || '').replace(/"/g, ''),
        latitude: lat,
        longitude: lng
      });
    }
    try {
      fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
      fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
      console.log('Wrote', OUT_PATH, 'with', out.length, 'airports');
    } catch (err) {
      console.error('Failed to write output file:', err);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP error:', err);
  process.exit(1);
});
