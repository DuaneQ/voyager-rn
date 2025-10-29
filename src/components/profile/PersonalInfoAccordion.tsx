/**
 * PersonalInfoAccordion Component
 * Displays age, gender, status, and sexual orientation
 * Reads from UserProfileContext
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileAccordion } from './ProfileAccordion';

interface PersonalInfoAccordionProps {
  age?: number;
  gender?: string;
  status?: string;
  orientation?: string;
}

export const PersonalInfoAccordion: React.FC<PersonalInfoAccordionProps> = ({
  age,
  gender,
  status,
  orientation,
}) => {
  const formatValue = (value: string | number | undefined) => {
    return value || 'Not specified';
  };

  const calculateAge = (dob: string | undefined): number | undefined => {
    if (!dob) return undefined;
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  return (
    <ProfileAccordion title="Personal Info" testID="personal-info-accordion">
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Age</Text>
          <Text style={styles.value}>{formatValue(age)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Gender</Text>
          <Text style={styles.value}>{formatValue(gender)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{formatValue(status)}</Text>
        </View>

        <View style={[styles.row, styles.lastRow]}>
          <Text style={styles.label}>Orientation</Text>
          <Text style={styles.value}>{formatValue(orientation)}</Text>
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
