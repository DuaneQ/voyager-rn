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
        const searchResult = await airportService.searchAirportsNearLocation(location, undefined, 200, 10);
        results = searchResult.airports;

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

      setAirports(results);
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
          <Text style={styles.airportName} numberOfLines={1}>{item.name}</Text>
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
});

export default AirportSelector;