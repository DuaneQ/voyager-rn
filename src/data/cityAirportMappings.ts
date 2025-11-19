/**
 * Curated mapping of major cities to their serving airports
 * Based on Wikipedia's busiest airports list and Google Flights behavior
 * This ensures we show the correct airports for major metropolitan areas
 */
export const cityAirportMappings: Record<string, string[]> = {
  // United States - Major Cities
  "Atlanta, GA, USA": ["ATL"],
  "New York, NY, USA": ["JFK", "LGA", "EWR"],
  "New York": ["JFK", "LGA", "EWR"],
  "Dallas, TX, USA": ["DFW", "DAL"],
  "Dallas": ["DFW", "DAL"],
  "Denver, CO, USA": ["DEN"],
  "Chicago, IL, USA": ["ORD", "MDW"],
  "Chicago": ["ORD", "MDW"],
  "Los Angeles, CA, USA": ["LAX", "BUR", "ONT", "SNA", "LGB"],
  "Los Angeles": ["LAX", "BUR", "ONT", "SNA", "LGB"],
  "Charlotte, NC, USA": ["CLT"],
  "Las Vegas, NV, USA": ["LAS"],
  "Las Vegas": ["LAS"],
  "Orlando, FL, USA": ["MCO", "SFB"],
  "Orlando": ["MCO", "SFB"],
  "Miami, FL, USA": ["MIA", "FLL", "PBI"],
  "Miami": ["MIA", "FLL", "PBI"],
  "Seattle, WA, USA": ["SEA"],
  "Seattle": ["SEA"],
  "Phoenix, AZ, USA": ["PHX"],
  "Phoenix": ["PHX"],
  "San Francisco, CA, USA": ["SFO", "OAK", "SJC"],
  "San Francisco": ["SFO", "OAK", "SJC"],
  "Houston, TX, USA": ["IAH", "HOU"],
  "Houston": ["IAH", "HOU"],
  "Boston, MA, USA": ["BOS"],
  "Boston": ["BOS"],
  "Philadelphia, PA, USA": ["PHL"],
  "Philadelphia": ["PHL"],
  "Minneapolis, MN, USA": ["MSP"],
  "Minneapolis": ["MSP"],
  "Detroit, MI, USA": ["DTW"],
  "Detroit": ["DTW"],
  "Baltimore, MD, USA": ["BWI", "DCA", "IAD"],
  "Baltimore": ["BWI", "DCA", "IAD"],
  "Washington, DC, USA": ["DCA", "IAD", "BWI"],
  "Washington": ["DCA", "IAD", "BWI"],
  "San Diego, CA, USA": ["SAN"],
  "San Diego": ["SAN"],
  "Tampa, FL, USA": ["TPA"],
  "Tampa": ["TPA"],
  "Portland, OR, USA": ["PDX"],
  "Portland": ["PDX"],
  "Salt Lake City, UT, USA": ["SLC"],
  "Salt Lake City": ["SLC"],
  
  // Europe - Major Cities
  "London, UK": ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
  "London": ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
  "Paris, France": ["CDG", "ORY", "BVA"],
  "Paris": ["CDG", "ORY", "BVA"],
  "Amsterdam, Netherlands": ["AMS"],
  "Amsterdam": ["AMS"],
  "Frankfurt, Germany": ["FRA"],
  "Frankfurt": ["FRA"],
  "Madrid, Spain": ["MAD"],
  "Madrid": ["MAD"],
  "Barcelona, Spain": ["BCN"],
  "Barcelona": ["BCN"],
  "Rome, Italy": ["FCO", "CIA"],
  "Rome": ["FCO", "CIA"],
  "Munich, Germany": ["MUC"],
  "Munich": ["MUC"],
  "Istanbul, Turkey": ["IST", "SAW"],
  "Istanbul": ["IST", "SAW"],
  "Milan, Italy": ["MXP", "LIN", "BGY"],
  "Milan": ["MXP", "LIN", "BGY"],
  "Vienna, Austria": ["VIE"],
  "Vienna": ["VIE"],
  "Dublin, Ireland": ["DUB"],
  "Dublin": ["DUB"],
  "Copenhagen, Denmark": ["CPH"],
  "Copenhagen": ["CPH"],
  "Stockholm, Sweden": ["ARN", "BMA"],
  "Stockholm": ["ARN", "BMA"],
  "Brussels, Belgium": ["BRU", "CRL"],
  "Brussels": ["BRU", "CRL"],
  "Zurich, Switzerland": ["ZRH"],
  "Zurich": ["ZRH"],
  "Athens, Greece": ["ATH"],
  "Athens": ["ATH"],
  "Lisbon, Portugal": ["LIS"],
  "Lisbon": ["LIS"],
  
  // Asia - Major Cities
  "Tokyo, Japan": ["HND", "NRT"],
  "Tokyo": ["HND", "NRT"],
  "Dubai, UAE": ["DXB", "DWC"],
  "Dubai": ["DXB", "DWC"],
  "Seoul, South Korea": ["ICN", "GMP"],
  "Seoul": ["ICN", "GMP"],
  "Singapore": ["SIN"],
  "Bangkok, Thailand": ["BKK", "DMK"],
  "Bangkok": ["BKK", "DMK"],
  "Hong Kong": ["HKG"],
  "Beijing, China": ["PEK", "PKX"],
  "Beijing": ["PEK", "PKX"],
  "Shanghai, China": ["PVG", "SHA"],
  "Shanghai": ["PVG", "SHA"],
  "Guangzhou, China": ["CAN"],
  "Guangzhou": ["CAN"],
  "Delhi, India": ["DEL"],
  "Delhi": ["DEL"],
  "Mumbai, India": ["BOM"],
  "Mumbai": ["BOM"],
  "Kuala Lumpur, Malaysia": ["KUL"],
  "Kuala Lumpur": ["KUL"],
  "Jakarta, Indonesia": ["CGK"],
  "Jakarta": ["CGK"],
  "Manila, Philippines": ["MNL"],
  "Manila": ["MNL"],
  "Taipei, Taiwan": ["TPE", "TSA"],
  "Taipei": ["TPE", "TSA"],
  "Osaka, Japan": ["KIX", "ITM"],
  "Osaka": ["KIX", "ITM"],
  
  // Middle East
  "Doha, Qatar": ["DOH"],
  "Doha": ["DOH"],
  "Jeddah, Saudi Arabia": ["JED"],
  "Jeddah": ["JED"],
  "Riyadh, Saudi Arabia": ["RUH"],
  "Riyadh": ["RUH"],
  "Tel Aviv, Israel": ["TLV"],
  "Tel Aviv": ["TLV"],
  
  // Canada
  "Toronto, Canada": ["YYZ", "YTZ"],
  "Toronto": ["YYZ", "YTZ"],
  "Vancouver, Canada": ["YVR"],
  "Vancouver": ["YVR"],
  "Montreal, Canada": ["YUL"],
  "Montreal": ["YUL"],
  "Calgary, Canada": ["YYC"],
  "Calgary": ["YYC"],
  
  // Latin America
  "Mexico City, Mexico": ["MEX"],
  "Mexico City": ["MEX"],
  "São Paulo, Brazil": ["GRU", "CGH"],
  "Sao Paulo": ["GRU", "CGH"],
  "Bogotá, Colombia": ["BOG"],
  "Bogota": ["BOG"],
  "Buenos Aires, Argentina": ["EZE", "AEP"],
  "Buenos Aires": ["EZE", "AEP"],
  "Lima, Peru": ["LIM"],
  "Lima": ["LIM"],
  "Cancún, Mexico": ["CUN"],
  "Cancun": ["CUN"],
  
  // Oceania
  "Sydney, Australia": ["SYD"],
  "Sydney": ["SYD"],
  "Melbourne, Australia": ["MEL"],
  "Melbourne": ["MEL"],
  "Brisbane, Australia": ["BNE"],
  "Brisbane": ["BNE"],
  "Auckland, New Zealand": ["AKL"],
  "Auckland": ["AKL"],
};

/**
 * Normalize a location string for mapping lookup
 * Handles various input formats: "Paris", "Paris, France", "paris, france"
 */
export function normalizeLocationForMapping(location: string): string[] {
  const normalized = location.trim();
  const possibleKeys: string[] = [normalized];
  
  // Don't add single-word fallback if there's a comma (user specified a location)
  // This prevents "Paris, TX" from matching "Paris" → "Paris, France"
  // We only want exact matches or case-insensitive exact matches
  
  return possibleKeys;
}

/**
 * Get airport IATA codes for a given location from curated mappings
 * Returns null if location is not in curated list
 */
export function getAirportsForLocation(location: string): string[] | null {
  const possibleKeys = normalizeLocationForMapping(location);
  
  for (const key of possibleKeys) {
    // Try exact match
    if (cityAirportMappings[key]) {
      return cityAirportMappings[key];
    }
    
    // Try case-insensitive match
    const lowerKey = key.toLowerCase();
    for (const [mappingKey, airports] of Object.entries(cityAirportMappings)) {
      if (mappingKey.toLowerCase() === lowerKey) {
        return airports;
      }
    }
  }
  
  return null;
}
