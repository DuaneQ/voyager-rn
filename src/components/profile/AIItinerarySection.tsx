/**
 * AI Itinerary Section Component
 * Container with two sub-tabs: Travel Preferences and AI Itineraries Display
 * 
 * This wraps TravelPreferencesTab and AIItineraryListTab in a tabbed interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TravelPreferencesTab } from './TravelPreferencesTab';
import { AIItineraryListTab } from './AIItineraryListTab';

type SubTabType = 'preferences' | 'itineraries';

export const AIItinerarySection: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('preferences');

  const handleGenerateItinerary = () => {
    // After generation, switch to itineraries tab
    setActiveSubTab('itineraries');
  };

  return (
    <View style={styles.container}>
      {/* Sub-Tab Navigation */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'preferences' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('preferences')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'preferences' && styles.activeSubTabText]}>
            Travel Preferences
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'itineraries' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('itineraries')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'itineraries' && styles.activeSubTabText]}>
            My AI Itineraries
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeSubTab === 'preferences' && (
          <TravelPreferencesTab onGenerateItinerary={handleGenerateItinerary} />
        )}
        
        {activeSubTab === 'itineraries' && (
          <AIItineraryListTab />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSubTab: {
    borderBottomColor: '#007AFF',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeSubTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
