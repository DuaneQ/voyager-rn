/**
 * LandingPage.web.tsx - ABSOLUTE MINIMUM FOR DEBUGGING
 * 
 * Zero dependencies, zero hooks, zero context
 */

import React from 'react';
import {
  View,
  Text,
  Platform,
  StyleSheet,
} from 'react-native';

export const LandingPage: React.FC = () => {
  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello iOS Safari</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 500,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff0000',
  },
  text: {
    fontSize: 24,
    color: '#ffffff',
  },
});

export default LandingPage;
