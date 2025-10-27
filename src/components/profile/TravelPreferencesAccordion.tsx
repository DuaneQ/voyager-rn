/**
 * TravelPreferencesAccordion Component
 * Displays top 3 travel preference tags and Edit Preferences button
 * Uses placeholder tags until preferences feature is implemented
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProfileAccordion } from './ProfileAccordion';

interface TravelPreferencesAccordionProps {
  preferences?: string[];
  onEditPress?: () => void;
}

export const TravelPreferencesAccordion: React.FC<TravelPreferencesAccordionProps> = ({
  preferences = ['Adventure', 'Beach', 'Culture'], // Placeholder defaults
  onEditPress,
}) => {
  const topThree = preferences.slice(0, 3);

  return (
    <ProfileAccordion title="Travel Preferences" testID="travel-preferences-accordion">
      <View style={styles.content}>
        {/* Preference tags */}
        <View style={styles.tagsContainer}>
          {topThree.map((tag, index) => (
            <React.Fragment key={tag}>
              <Text style={styles.tag}>{tag}</Text>
              {index < topThree.length - 1 && <Text style={styles.separator}> • </Text>}
            </React.Fragment>
          ))}
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditPress}
          accessibilityRole="button"
          accessibilityLabel="Edit Travel Preferences"
          testID="edit-preferences-button"
        >
          <Text style={styles.editButtonText}>Edit Travel Preferences</Text>
        </TouchableOpacity>
      </View>
    </ProfileAccordion>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1976d2',
  },
  separator: {
    fontSize: 16,
    color: '#999',
  },
  editButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
});
