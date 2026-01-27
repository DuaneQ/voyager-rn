/**
 * City Picker Component
 * 
 * Modal-based city selection with search.
 * User MUST select from the list - no free text input allowed.
 * 
 * Benefits:
 * - Zero API cost (static database)
 * - Prevents invalid city entries
 * - Better mobile UX with full-screen modal
 * - Returns coordinates (solves Naples disambiguation)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { getCityService, isCitiesPreloaded, isCitiesLoading } from '../../services/CityService';
import { City, CitySearchResult } from '../../types/City';

interface CityPickerProps {
  placeholder?: string;
  /** Called when user selects a city */
  onCitySelected: (city: City, displayName: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  containerStyle?: any;
  inputStyle?: any;
  error?: boolean;
  testID?: string;
}

export const CityPicker: React.FC<CityPickerProps> = ({
  placeholder = 'Select a city',
  onCitySelected,
  value = '',
  onChangeText,
  containerStyle,
  inputStyle,
  error = false,
  testID,
}) => {
  const [selectedCity, setSelectedCity] = useState(value);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [citiesReady, setCitiesReady] = useState(isCitiesPreloaded());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const cityService = getCityService();

  // Update selected city when value prop changes
  useEffect(() => {
    setSelectedCity(value);
  }, [value]);

  // Check if cities are ready when modal opens
  useEffect(() => {
    if (modalVisible && !citiesReady) {
      // Poll for cities ready state (in case preload is still in progress)
      const checkReady = setInterval(() => {
        if (isCitiesPreloaded()) {
          setCitiesReady(true);
          clearInterval(checkReady);
        }
      }, 100);
      
      // Cleanup interval
      return () => clearInterval(checkReady);
    }
  }, [modalVisible, citiesReady]);

  // Focus search input when modal opens
  useEffect(() => {
    if (modalVisible) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [modalVisible]);

  const searchCities = useCallback(async (searchText: string) => {
    if (searchText.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const results = await cityService.searchCities(searchText, { limit: 20 });
      setSuggestions(results);
    } catch (err: any) {
      console.error('[CityPicker] Search error:', err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [cityService]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search by 150ms
    timeoutRef.current = setTimeout(() => {
      searchCities(text);
    }, 150);
  }, [searchCities]);

  const handleSelectCity = useCallback((result: CitySearchResult) => {
    setSelectedCity(result.displayName);
    onCitySelected(result.city, result.displayName);
    onChangeText?.(result.displayName);
    setModalVisible(false);
    setSearchQuery('');
    setSuggestions([]);
  }, [onCitySelected, onChangeText]);

  const handleOpenModal = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSearchQuery('');
    setSuggestions([]);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedCity('');
    onChangeText?.('');
  }, [onChangeText]);

  const renderCityItem = useCallback(({ item }: { item: CitySearchResult }) => (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => handleSelectCity(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.cityName}>{item.displayName}</Text>
      {item.city.coordinates.lat !== 0 && (
        <Text style={styles.coordsText}>
          {item.city.coordinates.lat.toFixed(2)}°, {item.city.coordinates.lng.toFixed(2)}°
        </Text>
      )}
    </TouchableOpacity>
  ), [handleSelectCity]);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Display field - tappable to open modal */}
      <Pressable
        testID={testID}
        style={[
          styles.displayField,
          error && styles.displayFieldError,
          inputStyle,
        ]}
        onPress={handleOpenModal}
      >
        <Text style={[
          styles.displayText,
          !selectedCity && styles.placeholderText,
        ]}>
          {selectedCity || placeholder}
        </Text>
        {selectedCity ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.chevron}>▼</Text>
        )}
      </Pressable>

      {/* Search Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select City</Text>
            <View style={styles.cancelButton} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search for a city..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {loading && (
              <ActivityIndicator 
                size="small" 
                color="#0066cc" 
                style={styles.searchLoader}
              />
            )}
          </View>

          {/* Instructions */}
          {!citiesReady ? (
            <View style={styles.instructionsContainer}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={[styles.instructionsText, { marginTop: 12 }]}>
                Loading city database...
              </Text>
            </View>
          ) : searchQuery.length < 2 && suggestions.length === 0 ? (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                Type at least 2 characters to search
              </Text>
            </View>
          ) : null}

          {/* Results List */}
          <FlatList
            data={suggestions}
            keyExtractor={(item) => 
              `${item.city.name}-${item.city.countryCode}-${item.city.stateCode || ''}`
            }
            renderItem={renderCityItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              searchQuery.length >= 2 && !loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No cities found</Text>
                </View>
              ) : null
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  displayField: {
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayFieldError: {
    borderColor: '#ff4444',
  },
  displayText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  chevron: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    minWidth: 60,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#0066cc',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  searchLoader: {
    position: 'absolute',
    right: 28,
    top: 22,
  },
  instructionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  cityItem: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cityName: {
    fontSize: 16,
    color: '#333',
  },
  coordsText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
  },
});

export default CityPicker;
