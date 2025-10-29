/**
 * LifestyleAccordion Component
 * Displays education, drinking, and smoking habits
 * Reads from UserProfileContext
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileAccordion } from './ProfileAccordion';

interface LifestyleAccordionProps {
  education?: string;
  drinking?: string;
  smoking?: string;
}

export const LifestyleAccordion: React.FC<LifestyleAccordionProps> = ({
  education,
  drinking,
  smoking,
}) => {
  const formatValue = (value: string | undefined) => {
    return value || 'Not specified';
  };

  return (
    <ProfileAccordion title="Lifestyle" testID="lifestyle-accordion">
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Education</Text>
          <Text style={styles.value}>{formatValue(education)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Drinking</Text>
          <Text style={styles.value}>{formatValue(drinking)}</Text>
        </View>

        <View style={[styles.row, styles.lastRow]}>
          <Text style={styles.label}>Smoking</Text>
          <Text style={styles.value}>{formatValue(smoking)}</Text>
        </View>
      </View>
    </ProfileAccordion>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
});
