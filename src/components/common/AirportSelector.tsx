import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Airport } from '../../types/Airport';
import ReactNativeAirportService from '../../services/ReactNativeAirportService';

interface AirportSelectorProps {
  placeholder?: string;
  selectedAirportCode?: string;
  location?: string; // City/location to search near
  onAirportSelect: (code: string, name: string) => void;
  onClear?: () => void;
  style?: any;
  error?: boolean;
}

const AirportSelector: React.FC<AirportSelectorProps> = ({
  placeholder = "Select airport",
  selectedAirportCode,
  location,
  onAirportSelect,
  onClear,
  style,
  error = false
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  
  // Use useMemo to create service instance only once
  const airportService = useMemo(() => new ReactNativeAirportService(), []);

  // Small helper: try to extract country from a location string like "City, Country"
  const extractCountryFromLocation = (loc?: string): string | undefined => {
    if (!loc) return undefined;
    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return undefined;
    // If there is more than one part, assume last part is country
    if (parts.length > 1) return parts[parts.length - 1];
    // Single part - could be city only, give up
    return undefined;
  };

  // Curated overrides for airports we know operate international flights even when heuristics fail
  const curatedMajorInternational = useMemo(() => new Set(['LHR','CDG','JFK','LAX','SFO','ORD','LGA','EWR','DUB','HND','NRT','AMS','IAD','DCA','BWI']), []);

  // Determine whether an airport should be considered international.
  // Returns true/false when decisive, otherwise undefined.
  const determineInternational = (airport: Airport, loc?: string): boolean | undefined => {
    // If service already provided an explicit flag, trust it
    if (typeof airport.isInternational === 'boolean') return airport.isInternational;

    // If this IATA is in our curated override list, treat as international
    if (airport.iataCode && curatedMajorInternational.has(airport.iataCode.toUpperCase())) return true;

    // If both airport.country and the destination country are known, compare them
    const destCountry = extractCountryFromLocation(loc);
    if (destCountry && airport.country && airport.country.toLowerCase() !== 'unknown') {
      return airport.country.toLowerCase() !== destCountry.toLowerCase();
    }

    // Fallback heuristic: look for international keywords in the airport name
    const nameHeuristic = /international|intl/i.test(airport.name || '');
    if (nameHeuristic) return true;

    // Not decisive
    return undefined;
  };

  // Load selected airport details with race condition guard
  useEffect(() => {
    if (selectedAirportCode) {
      loadAirportByCode(selectedAirportCode);
    } else {
      setSelectedAirport(null);
    }
  }, [selectedAirportCode]);

  const loadAirportByCode = async (code: string) => {
    // Prevent race conditions from multiple simultaneous loads
    if (isLoadingInitial) return;
    
    setIsLoadingInitial(true);
    try {
      const airport = await airportService.getAirportByIataCode(code);
      setSelectedAirport(airport);
    } catch (error) {
      // Silently fail - UI will show error state
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const searchAirports = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAirports([]);
      return;
    }

    setLoading(true);
    try {
      let results: Airport[] = [];

      // If we have a location context, search near that location
      if (location && location.trim()) {
        // First try curated mappings (most reliable for major cities)
        const curatedAirports = await (async () => {
          try {
            const curated = await airportService.searchAirportsByQuery(location);
            return curated.filter(a => a.iataCode && a.iataCode.length === 3);
          } catch {
            return [];
          }
        })();
        
        // If we have curated airports, use ONLY those (skip Google Places)
        if (curatedAirports.length > 0) {
          console.log(`[AirportSelector] Using ${curatedAirports.length} curated airports for "${location}"`);
          results = curatedAirports;
        } else {
          // No curated data, fall back to Google Places API
          console.log(`[AirportSelector] No curated data for "${location}", using Google Places`);
          const searchResult = await airportService.searchAirportsNearLocation(location, undefined, 200, 20);
          results = searchResult.airports;
        }

        // Filter results by query if user is typing
        if (query !== location) {
          results = results.filter(airport => 
            airport.name.toLowerCase().includes(query.toLowerCase()) ||
            airport.iataCode.toLowerCase().includes(query.toLowerCase()) ||
            airport.city.toLowerCase().includes(query.toLowerCase())
          );
        }
      } else {
        // Direct search by query
        results = await airportService.searchAirportsByQuery(query);
      }

      // CRITICAL: Filter out non-airports (items without valid IATA codes)
      // Google Places sometimes returns heliports, parking, etc. that aren't actual airports
      results = results.filter(airport => 
        airport.iataCode && 
        airport.iataCode.trim().length === 3 &&
        /^[A-Z]{3}$/i.test(airport.iataCode.trim())
      );

      setAirports(results);

      // Enrich airports with fallback data (major airports) when country/isInternational missing.
      // This helps classify well-known international airports (e.g., CDG) returned by Google Places.
          (async () => {
            // Curated overrides for airports we know operate international flights even when heuristics fail
            const curatedMajorInternational = new Set(['LHR','CDG','JFK','LAX','SFO','ORD','LGA','EWR','DUB','HND','NRT','AMS']);
        try {
          const enriched = await Promise.all(results.map(async (a) => {
                // If the service already provided an explicit flag, prefer it
                if (typeof a.isInternational === 'boolean') return a;

                // Always attempt authoritative lookup by IATA when available
                if (a.iataCode) {
                  try {
                    const known = await airportService.getAirportByIataCode(a.iataCode);
                    if (known) {
                      const merged = {
                        ...a,
                        country: known.country || a.country,
                        isInternational: typeof known.isInternational === 'boolean' ? known.isInternational : a.isInternational
                      } as Airport;
                      console.debug('AirportSelector: enriched by IATA', { original: a, known: known, merged });
                      return merged;
                    } else {
                      // If direct IATA lookup fails, try a name/city match against the curated fallback
                      const byName = (airportService as any).findAirportByName ? (airportService as any).findAirportByName(a.name || a.city || a.iataCode) : null;
                      if (byName) {
                        const merged = { ...a, country: byName.country || a.country, isInternational: typeof byName.isInternational === 'boolean' ? byName.isInternational : a.isInternational, iataCode: byName.iataCode || a.iataCode } as Airport;
                        console.debug('AirportSelector: enriched by name match', { original: a, byName, merged });
                        return merged;
                      }
                      // Log missing IATA mapping so dataset gaps can be filled
                      console.warn(`AirportSelector: no fallback record for IATA ${a.iataCode}`, a.name, a.city);
                    }
                  } catch (e) {
                    // For robustness, don't block on lookup errors
                    console.warn(`AirportSelector: lookup failed for ${a.iataCode}`, e);
                  }
                }

                // If authoritative data not available, apply curated overrides
                const up = (a.iataCode || '').toUpperCase();
                if (curatedMajorInternational.has(up)) {
                  console.debug('AirportSelector: applying curated override for', up, a.name);
                  return { ...a, isInternational: true } as Airport;
                }

                // If country info present and decisive, leave it for determineInternational
                if (a.country && a.country.toLowerCase() !== 'unknown') return a;

                // Fallback: heuristics (name-based) will be used at render-time
                return a;
              }));

              // Emit debug summary of decisions for the first few airports
              enriched.slice(0, 8).forEach(a => {
                try {
                  const decis = determineInternational(a, location);
                  console.debug('AirportSelector: post-enrich decision', { iata: a.iataCode, name: a.name, country: a.country, isInternationalField: a.isInternational, decision: decis });
                } catch (e) {}
              });

              // De-duplicate enriched results by IATA code (keep closest when duplicates)
              const uniqueMap = new Map<string, Airport>();
              enriched.forEach(item => {
                const key = (item.iataCode || '').toUpperCase() || `${item.name}::${item.city}`;
                if (!uniqueMap.has(key)) {
                  uniqueMap.set(key, item);
                } else {
                  const existing = uniqueMap.get(key)!;
                  const existingDist = existing.distance || Number.MAX_SAFE_INTEGER;
                  const thisDist = item.distance || Number.MAX_SAFE_INTEGER;
                  if (thisDist < existingDist) {
                    uniqueMap.set(key, item);
                  }
                }
              });

              const unique = Array.from(uniqueMap.values());
              
              // Final filter: ensure all results have valid IATA codes
              const validAirports = unique.filter(airport => 
                airport.iataCode && 
                airport.iataCode.trim().length === 3 &&
                /^[A-Z]{3}$/i.test(airport.iataCode.trim())
              );
              
              // Separate into international and domestic, then limit results
              // We want: 5 closest international + 1 closest domestic
              const international: Airport[] = [];
              const domestic: Airport[] = [];
              
              validAirports.forEach(airport => {
                const isIntl = determineInternational(airport, location);
                if (isIntl === true) {
                  international.push(airport);
                } else if (isIntl === false) {
                  domestic.push(airport);
                } else {
                  // If we can't determine, treat as international (safer default)
                  international.push(airport);
                }
              });
              
              // Sort both by distance (closest first)
              const sortByDistance = (a: Airport, b: Airport) => {
                const distA = a.distance || Number.MAX_SAFE_INTEGER;
                const distB = b.distance || Number.MAX_SAFE_INTEGER;
                return distA - distB;
              };
              
              international.sort(sortByDistance);
              domestic.sort(sortByDistance);
              
              // Take 5 closest international + 1 closest domestic
              const limitedResults = [
                ...international.slice(0, 5),
                ...domestic.slice(0, 1)
              ];
              
              // Re-sort combined results by distance
              limitedResults.sort(sortByDistance);
              
              setAirports(limitedResults);
            } catch (e) {
              console.warn('AirportSelector: enrichment failed', e);
            }
          })();
    } catch (error) {
      Alert.alert('Error', 'Failed to search airports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Auto-search when modal opens with location context
  useEffect(() => {
    if (isModalVisible && location) {
      setSearchQuery(location);
      searchAirports(location);
    }
  }, [isModalVisible, location, searchAirports]);

  // Search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchAirports(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchAirports]);

  const handleAirportSelect = (airport: Airport) => {
    setSelectedAirport(airport);
    onAirportSelect(airport.iataCode, airport.name);
    setIsModalVisible(false);
  };

  const handleClear = () => {
    setSelectedAirport(null);
    onClear?.();
  };

  const renderAirportItem = ({ item }: { item: Airport }) => (
    <TouchableOpacity 
      style={styles.airportItem}
      onPress={() => handleAirportSelect(item)}
    >
      <View style={styles.airportInfo}>
        <Text style={styles.airportCode}>{item.iataCode}</Text>
        <View style={styles.airportDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.airportName} numberOfLines={1}>{item.name}</Text>
            {(() => {
              const isIntl = determineInternational(item, location);
              if (isIntl === true) {
                return <Text style={styles.badgeIntl}>INTL</Text>;
              }
              if (isIntl === false) {
                return <Text style={styles.badgeDomestic}>DOM</Text>;
              }
              return null;
            })()}
          </View>
          <Text style={styles.airportLocation}>{item.city}, {item.country}</Text>
          {item.distance && (
            <Text style={styles.airportDistance}>{Math.round(item.distance)}km away</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity 
        style={[styles.selector, style, error && styles.selectorError]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={[styles.selectorText, (!selectedAirport && !selectedAirportCode) && styles.placeholderText]}>
          {selectedAirport 
            ? `${selectedAirport.name} (${selectedAirport.iataCode})`
            : selectedAirportCode 
            ? `Airport (${selectedAirportCode})`
            : placeholder
          }
        </Text>
        {(selectedAirport || selectedAirportCode) && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Airport</Text>
            <TouchableOpacity 
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search airports by name, code, or city..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Searching airports...</Text>
            </View>
          )}

          <FlatList
            data={airports}
            renderItem={renderAirportItem}
            keyExtractor={(item, index) => `${item.iataCode}-${item.name}-${index}`}
            style={styles.airportList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading && searchQuery.length >= 2 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No airports found</Text>
                  <Text style={styles.emptySubtext}>Try searching with a different term</Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  selectorError: {
    borderColor: '#ff4444',
  },
  selectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  airportList: {
    flex: 1,
  },
  airportItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  airportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airportCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    width: 50,
  },
  airportDetails: {
    flex: 1,
    marginLeft: 16,
  },
  airportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    flex: 1,
    marginRight: 8,
  },
  airportLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  airportDistance: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  badgeIntl: {
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 0,
  },
  badgeDomestic: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 0,
  },
});

export default AirportSelector;