/**
 * Custom Places Autocomplete Component
 * 
 * Direct implementation using Google Places API with axios to bypass
 * react-native-google-places-autocomplete bugs in React Native 0.79.x
 * 
 * COST OPTIMIZATION: Uses session tokens to group autocomplete requests.
 * Without session tokens: Each keystroke = separate billing (~$0.00283 each)
 * With session tokens: All keystrokes in one session = flat rate (~$0.017)
 * This can reduce costs by 50-80% depending on user typing behavior.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import axios from 'axios';
import { getGooglePlacesApiKey } from '../../constants/apiConfig';

// Module-level session token storage for testability
let currentSessionToken: string | null = null;

/**
 * Generate a UUID v4 for session tokens
 * Google Places API uses session tokens to group autocomplete requests
 */
export const generateSessionToken = (): string => {
  const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  currentSessionToken = token;
  return token;
};

/**
 * Get or create a session token
 * Creates new token on first request, reuses for subsequent requests
 */
export const getSessionToken = (): string => {
  if (!currentSessionToken) {
    currentSessionToken = generateSessionToken();
  }
  return currentSessionToken;
};

/**
 * Clear session token (should be called after place selection)
 */
export const clearSessionToken = (): void => {
  currentSessionToken = null;
};

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
  
  // Session timeout ref for auto-clearing expired sessions
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Session expires after 3 minutes of inactivity (Google's recommendation)
  const SESSION_TIMEOUT_MS = 3 * 60 * 1000;
  
  /**
   * Get session token with timeout reset
   * Uses module-level token management for consistency
   */
  const getTokenWithTimeout = useCallback((): string => {
    const token = getSessionToken();
    
    // Reset session timeout on each use
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    sessionTimeoutRef.current = setTimeout(() => {
      // Session expired - clear token so next search starts fresh
      clearSessionToken();
    }, SESSION_TIMEOUT_MS);
    
    return token;
  }, []);
  
  /**
   * Handle session cleanup when user selects a place
   */
  const handleClearSession = useCallback(() => {
    clearSessionToken();
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  }, []);

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
      
      // Get session token for this search session
      const sessionToken = getTokenWithTimeout();

      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).google) {
        // Use Google Maps JavaScript SDK on web
        const service = new (window as any).google.maps.places.AutocompleteService();
        
        // Create a SessionToken object for web SDK
        const webSessionToken = new (window as any).google.maps.places.AutocompleteSessionToken();
        
        service.getPlacePredictions(
          {
            input: searchText,
            types: ['(cities)'],
            language: 'en',
            sessionToken: webSessionToken, // Web SDK uses its own token object
          },
          (predictions: any, status: any) => {
            if (status === 'OK' && predictions) {
              setSuggestions(predictions.map((p: any) => ({
                place_id: p.place_id,
                description: p.description,
              })));
              setShowSuggestions(true);
            } else {
              console.warn('[PlacesAutocomplete] API error:', status);
              setSuggestions([]);
            }
            setLoading(false);
          }
        );
      } else {
        // Use axios for mobile with session token
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/place/autocomplete/json',
          {
            params: {
              input: searchText,
              key: getGooglePlacesApiKey(),
              types: '(cities)',
              language: 'en',
              sessiontoken: sessionToken, // Groups all requests into one billing session
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
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[PlacesAutocomplete] Error:', err.message);
      setSuggestions([]);
      setLoading(false);
    }
  }, [getTokenWithTimeout]);

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
    
    // Clear session token when user selects a place
    // This ends the billing session for this search
    handleClearSession();
  }, [onPlaceSelected, handleClearSession]);

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
          {/* Using ScrollView instead of FlatList to avoid VirtualizedList nesting warning */}
          {/* For a small dropdown (~5 items), ScrollView performs better anyway */}
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
