/**
 * City Autocomplete Component
 * 
 * Offline city search using static database (148K+ cities).
 * Drop-in replacement for PlacesAutocomplete when selecting cities.
 * 
 * Benefits:
 * - Zero API cost (no Google Places calls)
 * - Fast search (<10ms vs 200-500ms)
 * - Works offline
 * - Returns coordinates (solves Naples disambiguation)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { getCityService, isCitiesPreloaded } from '../../services/CityService';
import { City, CitySearchResult } from '../../types/City';

interface CityAutocompleteProps {
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

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  placeholder = 'Search for a city',
  onCitySelected,
  value = '',
  onChangeText,
  containerStyle,
  inputStyle,
  error = false,
  testID,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasValidSelection, setHasValidSelection] = useState(!!value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityService = getCityService();

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
    setHasValidSelection(!!value);
  }, [value]);

  const searchCities = useCallback(async (searchText: string) => {
    if (searchText.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const results = await cityService.searchCities(searchText, { limit: 8 });
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err: any) {
      console.error('[CityAutocomplete] Search error:', err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [cityService]);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    setHasValidSelection(false); // User is typing, so no valid selection yet
    onChangeText?.(text);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search by 150ms (faster than API since it's local)
    timeoutRef.current = setTimeout(() => {
      searchCities(text);
    }, 150);
  }, [onChangeText, searchCities]);

  const handleSelectCity = useCallback((result: CitySearchResult) => {
    setQuery(result.displayName);
    setHasValidSelection(true);
    onCitySelected(result.city, result.displayName);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onCitySelected]);

  const handleBlur = useCallback(() => {
    // Delay to allow touch on suggestions to register
    setTimeout(() => {
      setShowSuggestions(false);
      // If user didn't select a valid city, clear the input
      if (!hasValidSelection) {
        setQuery('');
        onChangeText?.('');
      }
    }, 200);
  }, [hasValidSelection, onChangeText]);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          error && styles.inputError,
          inputStyle,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={query}
        onChangeText={handleTextChange}
        autoCorrect={false}
        autoCapitalize="words"
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={handleBlur}
      />
      
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#0066cc" />
        </View>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {suggestions.map((item, index) => (
              <React.Fragment key={`${item.city.name}-${item.city.countryCode}-${item.city.stateCode}`}>
                {index > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectCity(item)}
                >
                  <Text style={styles.suggestionText}>{item.displayName}</Text>
                  {item.city.stateCode && item.city.countryCode === 'US' && (
                    <Text style={styles.stateText}>{item.city.stateCode}</Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  input: {
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 15,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  loader: {
    position: 'absolute',
    right: 10,
    top: 11,
  },
  suggestionsList: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 13,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  stateText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#c8c7cc',
  },
});
