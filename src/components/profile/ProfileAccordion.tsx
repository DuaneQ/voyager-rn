/**
 * ProfileAccordion Component
 * Generic reusable accordion with expand/collapse animation
 * Used for Personal Info, Lifestyle, and Travel Preferences sections
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ProfileAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  testID?: string;
}

export const ProfileAccordion: React.FC<ProfileAccordionProps> = ({
  title,
  children,
  defaultExpanded = false,
  testID,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${expanded ? 'expanded' : 'collapsed'}`}
        accessibilityHint="Double tap to toggle"
        testID={`${testID}-header`}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#666"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content} testID={`${testID}-content`}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 44, // Accessibility: minimum touch target
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
});
