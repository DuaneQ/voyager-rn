/**
 * Travel Preferences Tab Component
 * Mobile-first UI for managing travel preference profiles
 * 
 * Sub-tab of AI Itineraries tab with simplified mobile UX
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import {
  TravelPreferenceProfile,
  ACTIVITY_DEFINITIONS,
  DIETARY_RESTRICTIONS,
  CUISINE_TYPES,
  TRAVEL_STYLES,
  TRANSPORTATION_MODES,
  ACCOMMODATION_TYPES,
} from '../../types/TravelPreferences';
import { isTravelPreferencesError } from '../../errors/TravelPreferencesErrors';

interface TravelPreferencesTabProps {
  onGenerateItinerary?: () => void;
}

export const TravelPreferencesTab: React.FC<TravelPreferencesTabProps> = ({
  onGenerateItinerary,
}) => {
  const {
    profiles,
    defaultProfile,
    loading,
    error: hookError,
    createProfile,
    updateProfile,
    setDefaultProfile,
  } = useTravelPreferences();

  // Expanded sections for accordions
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    activities: false,
    food: false,
    accommodation: false,
    transportation: false,
    accessibility: false,
  });

  // Track currently selected profile ID for the dropdown
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Form data - just the current editing state
  const [formData, setFormData] = useState<Partial<TravelPreferenceProfile>>({
    name: '',
    isDefault: profiles.length === 0,
    travelStyle: 'mid-range',
    budgetRange: { min: 50, max: 200, currency: 'USD' },
    activities: [],
    foodPreferences: {
      dietaryRestrictions: [],
      cuisineTypes: [],
      foodBudgetLevel: 'medium',
    },
    accommodation: {
      type: 'any',
      starRating: 3,
      minUserRating: 3.0,
    },
    transportation: {
      primaryMode: 'public',
    },
    groupSize: {
      preferred: 2,
      sizes: [1, 2, 4],
    },
    accessibility: {
      mobilityNeeds: false,
      visualNeeds: false,
      hearingNeeds: false,
    },
  });

  // Initialize with default profile if exists
  React.useEffect(() => {
    if (profiles.length > 0 && defaultProfile && !formData.name) {
      setFormData(defaultProfile);
    }
  }, [profiles, defaultProfile]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle form field changes
  const updateFormField = <K extends keyof TravelPreferenceProfile>(
    field: K,
    value: TravelPreferenceProfile[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // If user manually changes the name, clear the selected profile ID
    if (field === 'name') {
      setSelectedProfileId('');
    }
  };

  // Toggle array values (for activities, dietary restrictions, etc.)
  const toggleArrayValue = (array: string[], value: string): string[] => {
    if (array.includes(value)) {
      return array.filter(v => v !== value);
    }
    return [...array, value];
  };

  // Load a profile into the form for editing
  const handleLoadProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setFormData(profile);
      setSelectedProfileId(profileId);
    }
  };

  // Save profile - create or update based on name
  const handleSave = async () => {
    try {
      if (!formData.name || formData.name.trim().length === 0) {
        Alert.alert('Error', 'Please enter a profile name');
        return;
      }

      const profileName = formData.name.trim();
      
      // Check if a profile with this name already exists
      const existingProfile = profiles.find(
        p => p.name.toLowerCase() === profileName.toLowerCase()
      );

      if (existingProfile) {
        // Update existing profile
        await updateProfile(existingProfile.id, formData);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        // Create new profile
        await createProfile(formData as Omit<TravelPreferenceProfile, 'id' | 'createdAt' | 'updatedAt'>);
        Alert.alert('Success', 'Profile created successfully');
      }
    } catch (err: any) {
      const errorMessage = isTravelPreferencesError(err)
        ? err.getUserMessage()
        : 'Failed to save profile. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  if (hookError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading preferences</Text>
        <Text style={styles.errorDetail}>{hookError.getUserMessage()}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Load Existing Profile Dropdown (only show if profiles exist) */}
      {profiles.length > 0 && (
        <View style={styles.section}>
          <View style={styles.pickerContainer}>
            <Picker
              testID="profile-picker"
              selectedValue={selectedProfileId}
              onValueChange={(itemValue) => {
                if (itemValue) {
                  handleLoadProfile(itemValue);
                } else {
                  // User selected "-- Select a profile to edit --", clear form
                  setSelectedProfileId('');
                }
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              mode="dropdown"
              dropdownIconColor="#007AFF"
            >
              <Picker.Item 
                label="-- Select a profile to edit --" 
                value="" 
                color="#888888"
                style={{ fontWeight: '600', fontSize: 18 }}
              />
              {profiles.map(profile => (
                <Picker.Item
                  key={profile.id}
                  label={`${profile.name}${profile.isDefault ? ' ⭐' : ''}`}
                  value={profile.id}
                  color="#000000"
                  style={{ fontWeight: '600', fontSize: 18 }}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.helperText}>
            💡 These profiles help AI personalize your travel itineraries
          </Text>
        </View>
      )}

      {/* Profile Name Input - Simple and Clean */}
      <View style={styles.section}>
        <Text style={styles.label}>Profile Name</Text>
        <TextInput
          style={styles.input}
          value={formData.name || ''}
          onChangeText={(text) => updateFormField('name', text)}
          placeholder="e.g., Family Vacation, Work Travel"
          placeholderTextColor="#999"
        />
        <Text style={styles.helperText}>
          {profiles.length > 0 
            ? 'Tip: Select from dropdown to edit, or enter a new name to create'
            : 'Enter a name for your first travel profile'}
        </Text>
      </View>

      {/* Basic Preferences (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection('basic')}
      >
        <Text style={styles.collapsibleTitle}>Basic Preferences</Text>
        <Text style={styles.collapsibleIcon}>
          {expandedSections.basic ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedSections.basic && (
        <View style={styles.collapsibleContent}>
          {/* Travel Style */}
          <Text style={styles.label}>Travel Style</Text>
          <View style={styles.chipContainer}>
            {TRAVEL_STYLES.map(style => (
              <TouchableOpacity
                key={style.value}
                style={[
                  styles.chip,
                  formData.travelStyle === style.value && styles.chipSelected,
                ]}
                onPress={() => updateFormField('travelStyle', style.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.travelStyle === style.value && styles.chipTextSelected,
                  ]}
                >
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Activities (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection('activities')}
      >
        <Text style={styles.collapsibleTitle}>Activities</Text>
        <Text style={styles.collapsibleIcon}>
          {expandedSections.activities ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedSections.activities && (
        <View style={styles.collapsibleContent}>
          <View style={styles.chipContainer}>
            {ACTIVITY_DEFINITIONS.map(activity => (
              <TouchableOpacity
                key={activity.key}
                style={[
                  styles.chip,
                  formData.activities?.includes(activity.key) && styles.chipSelected,
                ]}
                onPress={() => {
                  const newActivities = toggleArrayValue(
                    formData.activities || [],
                    activity.key
                  );
                  updateFormField('activities', newActivities);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.activities?.includes(activity.key) && styles.chipTextSelected,
                  ]}
                >
                  {activity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Food Preferences (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection('food')}
      >
        <Text style={styles.collapsibleTitle}>Food Preferences</Text>
        <Text style={styles.collapsibleIcon}>
          {expandedSections.food ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedSections.food && (
        <View style={styles.collapsibleContent}>
          <Text style={styles.label}>Dietary Restrictions</Text>
          <View style={styles.chipContainer}>
            {DIETARY_RESTRICTIONS.map(restriction => (
              <TouchableOpacity
                key={restriction}
                style={[
                  styles.chip,
                  formData.foodPreferences?.dietaryRestrictions?.includes(restriction) &&
                    styles.chipSelected,
                ]}
                onPress={() => {
                  const newRestrictions = toggleArrayValue(
                    formData.foodPreferences?.dietaryRestrictions || [],
                    restriction
                  );
                  updateFormField('foodPreferences', {
                    ...(formData.foodPreferences || {
                      cuisineTypes: [],
                      foodBudgetLevel: 'medium',
                    }),
                    dietaryRestrictions: newRestrictions,
                  });
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.foodPreferences?.dietaryRestrictions?.includes(restriction) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {restriction}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Cuisine Types</Text>
          <View style={styles.chipContainer}>
            {CUISINE_TYPES.map(cuisine => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.chip,
                  formData.foodPreferences?.cuisineTypes?.includes(cuisine) && styles.chipSelected,
                ]}
                onPress={() => {
                  const newCuisines = toggleArrayValue(
                    formData.foodPreferences?.cuisineTypes || [],
                    cuisine
                  );
                  updateFormField('foodPreferences', {
                    ...(formData.foodPreferences || {
                      dietaryRestrictions: [],
                      foodBudgetLevel: 'medium',
                    }),
                    cuisineTypes: newCuisines,
                  });
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.foodPreferences?.cuisineTypes?.includes(cuisine) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Accommodation (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection('accommodation')}
      >
        <Text style={styles.collapsibleTitle}>Accommodation</Text>
        <Text style={styles.collapsibleIcon}>
          {expandedSections.accommodation ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedSections.accommodation && (
        <View style={styles.collapsibleContent}>
          <Text style={styles.label}>Accommodation Type</Text>
          <View style={styles.chipContainer}>
            {ACCOMMODATION_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.chip,
                  formData.accommodation?.type === type.value && styles.chipSelected,
                ]}
                onPress={() => {
                  updateFormField('accommodation', {
                    ...(formData.accommodation || { starRating: 3 }),
                    type: type.value,
                  });
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.accommodation?.type === type.value && styles.chipTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Minimum Star Rating: {formData.accommodation?.starRating || 3}</Text>
          <View style={styles.sliderContainer}>
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={formData.accommodation?.starRating || 3}
              onValueChange={(val) => {
                updateFormField('accommodation', {
                  ...(formData.accommodation || { type: 'any' }),
                  starRating: Math.round(val),
                });
              }}
              minimumTrackTintColor="#1976d2"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#1976d2"
              style={styles.slider}
              accessibilityLabel="minimum-star-rating-slider"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1</Text>
              <Text style={styles.sliderLabel}>2</Text>
              <Text style={styles.sliderLabel}>3</Text>
              <Text style={styles.sliderLabel}>4</Text>
              <Text style={styles.sliderLabel}>5</Text>
            </View>
          </View>

          <Text style={styles.label}>Minimum User Rating: {(formData.accommodation?.minUserRating || 3.0).toFixed(1)}</Text>
          <View style={styles.sliderContainer}>
            <Slider
              minimumValue={1.0}
              maximumValue={5.0}
              step={0.1}
              value={formData.accommodation?.minUserRating || 3.0}
              onValueChange={(val) => {
                updateFormField('accommodation', {
                  ...(formData.accommodation || { type: 'any', starRating: 3 }),
                  minUserRating: parseFloat(val.toFixed(1)),
                });
              }}
              minimumTrackTintColor="#1976d2"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#1976d2"
              style={styles.slider}
              accessibilityLabel="minimum-user-rating-slider"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1.0</Text>
              <Text style={styles.sliderLabel}>2.0</Text>
              <Text style={styles.sliderLabel}>3.0</Text>
              <Text style={styles.sliderLabel}>4.0</Text>
              <Text style={styles.sliderLabel}>5.0</Text>
            </View>
            <Text style={styles.helperText}>User review rating (1.0 - 5.0)</Text>
          </View>
        </View>
      )}

      {/* Transportation (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection('transportation')}
      >
        <Text style={styles.collapsibleTitle}>Transportation</Text>
        <Text style={styles.collapsibleIcon}>
          {expandedSections.transportation ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedSections.transportation && (
        <View style={styles.collapsibleContent}>
          <Text style={styles.label}>Primary Mode</Text>
          <View style={styles.chipContainer}>
            {TRANSPORTATION_MODES.map(mode => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.chip,
                  formData.transportation?.primaryMode === mode.value && styles.chipSelected,
                ]}
                onPress={() => {
                  updateFormField('transportation', {
                    ...(formData.transportation || {}),
                    primaryMode: mode.value,
                  });
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.transportation?.primaryMode === mode.value && styles.chipTextSelected,
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}



      {/* Accessibility (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection('accessibility')}
      >
        <Text style={styles.collapsibleTitle}>Accessibility Needs</Text>
        <Text style={styles.collapsibleIcon}>
          {expandedSections.accessibility ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedSections.accessibility && (
        <View style={styles.collapsibleContent}>
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              formData.accessibility?.mobilityNeeds && styles.checkboxChecked,
            ]}
            onPress={() => {
              updateFormField('accessibility', {
                ...(formData.accessibility || { visualNeeds: false, hearingNeeds: false }),
                mobilityNeeds: !formData.accessibility?.mobilityNeeds,
              });
            }}
          >
            <Text style={styles.checkboxText}>
              {formData.accessibility?.mobilityNeeds ? '☑️' : '☐'} Mobility needs (wheelchair access, etc.)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              formData.accessibility?.visualNeeds && styles.checkboxChecked,
            ]}
            onPress={() => {
              updateFormField('accessibility', {
                ...(formData.accessibility || { mobilityNeeds: false, hearingNeeds: false }),
                visualNeeds: !formData.accessibility?.visualNeeds,
              });
            }}
          >
            <Text style={styles.checkboxText}>
              {formData.accessibility?.visualNeeds ? '☑️' : '☐'} Visual needs (braille, audio guides, etc.)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              formData.accessibility?.hearingNeeds && styles.checkboxChecked,
            ]}
            onPress={() => {
              updateFormField('accessibility', {
                ...(formData.accessibility || { mobilityNeeds: false, visualNeeds: false }),
                hearingNeeds: !formData.accessibility?.hearingNeeds,
              });
            }}
          >
            <Text style={styles.checkboxText}>
              {formData.accessibility?.hearingNeeds ? '☑️' : '☐'} Hearing needs (sign language, subtitles, etc.)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.buttonPrimary} 
          onPress={handleSave}
        >
          <Text style={styles.buttonPrimaryText}>Save Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Generate AI Itinerary Button */}
      <TouchableOpacity
        style={styles.buttonAI}
        onPress={() => {
          if (onGenerateItinerary) {
            onGenerateItinerary();
          } else {
            Alert.alert('Coming Soon', 'AI itinerary generation will be implemented next');
          }
        }}
      >
        <Text style={styles.buttonAIText}>✨ GENERATE AI ITINERARY</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  profileList: {
    marginTop: 8,
  },
  profileChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  profileChipActive: {
    backgroundColor: '#007AFF',
  },
  profileChipText: {
    fontSize: 14,
    color: '#333',
  },
  profileChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  profileChipNew: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  profileChipNewText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  collapsibleIcon: {
    fontSize: 14,
    color: '#666',
  },
  collapsibleContent: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  budgetValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  starContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  star: {
    fontSize: 32,
    marginRight: 8,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  checkboxChecked: {
    backgroundColor: '#E3F2FD',
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonAI: {
    margin: 16,
    paddingVertical: 18,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonAIText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.6,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    overflow: 'visible',
    minHeight: 50,
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#000000',
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    height: 44,
  },
  unsavedIndicator: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
  sliderContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
