/**
 * Custom Places Autocomplete Component
 * 
 * Direct implementation using Google Places API with axios to bypass
 * react-native-google-places-autocomplete bugs in React Native 0.79.x
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
import axios from 'axios';
import { getGooglePlacesApiKey } from '../../constants/apiConfig';

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

interface PlacesAutocompleteProps {
  placeholder?: string;
  onPlaceSelected: (description: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  containerStyle?: any;
  inputStyle?: any;
  error?: boolean;
  testID?: string;
}

export const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  placeholder = 'Search for a place',
  onPlaceSelected,
  value = '',
  onChangeText,
  containerStyle,
  inputStyle,
  error = false,
  testID,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchPlaces = useCallback(async (searchText: string) => {
    if (searchText.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        {
          params: {
            input: searchText,
            key: getGooglePlacesApiKey(),
            types: '(cities)',
            language: 'en',
          },
        }
      );

      if (response.data.status === 'OK') {
        setSuggestions(response.data.predictions || []);
        setShowSuggestions(true);
      } else {
        console.warn('[PlacesAutocomplete] API error:', response.data.status);
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error('[PlacesAutocomplete] Error:', err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    onChangeText?.(text);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search by 300ms
    timeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  }, [onChangeText, searchPlaces]);

  const handleSelectPlace = useCallback((place: PlaceSuggestion) => {
    setQuery(place.description);
    onPlaceSelected(place.description);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onPlaceSelected]);

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
        autoCapitalize="none"
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
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
              <React.Fragment key={item.place_id}>
                {index > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectPlace(item)}
                >
                  <Text style={styles.suggestionText}>{item.description}</Text>
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
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#c8c7cc',
  },
});
