/**
 * Mock for react-native-google-places-autocomplete
 */

import React from 'react';

export const GooglePlacesAutocomplete = ({ onPress, placeholder, textInputProps }) => {
  const { TextInput } = require('react-native');
  
  return React.createElement(TextInput, {
    testID: 'google-places-input',
    placeholder: placeholder,
    onChangeText: (text) => {
      if (text === 'Paris' && onPress) {
        onPress({ description: 'Paris, France' }, null);
      }
      if (text === 'New York' && onPress) {
        onPress({ description: 'New York, NY, USA' }, null);
      }
    },
    ...textInputProps,
  });
};

export default {
  GooglePlacesAutocomplete,
};