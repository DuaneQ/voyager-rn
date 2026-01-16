/**
 * AI Itinerary Section Component
 * Container with two sub-tabs: Travel Preferences and AI Itineraries Display
 * 
 * This wraps TravelPreferencesTab and AIItineraryListTab in a tabbed interface
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TravelPreferencesTab } from './TravelPreferencesTab';
import { AIItineraryListTab } from './AIItineraryListTab';
import { AIItineraryGenerationModal } from '../modals/AIItineraryGenerationModal';
import { UserProfileContext } from '../../context/UserProfileContext';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { useAlert } from '../../context/AlertContext';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { validateProfileForItinerary, getProfileValidationMessage } from '../../utils/profileValidation';

type SubTabType = 'preferences' | 'itineraries';

interface AIItinerarySectionProps {
  onRequestEditProfile?: () => void;
}

export const AIItinerarySection: React.FC<AIItinerarySectionProps> = ({
  onRequestEditProfile,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('preferences');
  const [modalVisible, setModalVisible] = useState(false);
  
  // Get user profile and travel preferences
  const { userProfile } = useContext(UserProfileContext);
  const { preferences, refreshPreferences } = useTravelPreferences();
  const { showAlert } = useAlert();
  
  // Usage tracking for AI generation limits
  const { hasReachedAILimit, getRemainingAICreations, refreshProfile } = useUsageTracking();

  const handleGenerateItinerary = async () => {
    // Refresh user profile to get latest usage data from Firestore
    await refreshProfile();
    
    // Check AI usage limit BEFORE opening modal
    if (hasReachedAILimit()) {
      const remaining = getRemainingAICreations();
      showAlert(
        'error', 
        `Daily AI limit reached (${remaining} remaining). Sign in on the web and tap the UPGRADE button on TravalMatch to get unlimited AI itineraries.`,
        'https://travalpass.com/login',
        'Sign In to Upgrade'
      );
      return;
    }
    
    // Validate profile before opening modal
    const validationResult = validateProfileForItinerary(userProfile);
    
    if (!validationResult.isValid) {
      // Show informative alert with clear explanation
      const missingFieldsList = validationResult.missingFields.join(', ');
      
      let message: string;
      if (onRequestEditProfile) {
        message = `Your profile is missing required information to generate an AI itinerary.\n\nRequired fields: ${missingFieldsList}\n\nYour profile editor will open automatically in a moment so you can add this information.`;
      } else {
        message = `Your profile is missing required information to generate an AI itinerary.\n\nRequired fields: ${missingFieldsList}\n\nPlease complete your profile before trying again.`;
      }
      
      showAlert('warning', message);
      
      // Auto-open edit profile modal if callback provided
      if (onRequestEditProfile) {
        // Delay so user can read the message
        setTimeout(() => {
          onRequestEditProfile();
        }, 2500); // 2.5 seconds to read the message
      }
      return;
    }
    
    // Refresh travel preferences to ensure we have the latest profiles
    
    await refreshPreferences();

    // Profile is valid, open the AI generation modal
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleItineraryGenerated = (result: any) => {
    // Close modal and switch to itineraries tab to show the new itinerary
    setModalVisible(false);
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

      {/* AI Generation Modal */}
      <AIItineraryGenerationModal
        visible={modalVisible}
        onClose={handleModalClose}
        onGenerated={handleItineraryGenerated}
        userProfile={userProfile}
        preferences={preferences}
      />
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
    paddingBottom: 16,
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
