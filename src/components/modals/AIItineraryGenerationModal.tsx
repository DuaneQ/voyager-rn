/**
 * AI Itinerary Generation Modal for React Native
 * Exact replica of PWA AIItineraryGenerationModal.tsx functionality
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { format, addDays } from 'date-fns';
import { auth } from '../../config/firebaseConfig';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { AIGenerationRequest } from '../../types/AIGeneration';
import { getGooglePlacesApiKey } from '../../constants/apiConfig';
import ProfileValidationService from '../../services/ProfileValidationService';
import AirportSelector from '../common/AirportSelector';

// Input limits matching PWA exactly
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 80;
const MAX_SPECIAL_REQUESTS_LENGTH = 500;

// Trip types matching PWA
const TRIP_TYPES = [
  { value: 'leisure', label: 'Leisure' },
  { value: 'business', label: 'Business' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'family', label: 'Family' },
  { value: 'bachelor', label: 'Bachelor/ette' }
];

// Flight classes matching PWA
const FLIGHT_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium-economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' }
];

// Stop preferences matching PWA
const STOP_PREFERENCES = [
  { value: 'non-stop', label: 'Non-stop preferred' },
  { value: 'one-stop', label: 'Up to 1 stop' },
  { value: 'any', label: 'Any number of stops' }
];

interface AIItineraryGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerated?: (result: any) => void;
  initialDestination?: string;
  initialDates?: {
    startDate: string;
    endDate: string;
  };
  initialPreferenceProfileId?: string;
  userProfile?: any;
  preferences?: any;
  autoGenerateOnOpen?: boolean;
}

export const AIItineraryGenerationModal: React.FC<AIItineraryGenerationModalProps> = ({
  visible,
  onClose,
  onGenerated,
  initialDestination = '',
  initialDates,
  initialPreferenceProfileId,
  userProfile,
  preferences,
  autoGenerateOnOpen
}) => {
  const { 
    generateItinerary, 
    isGenerating, 
    progress, 
    error,
    cancelGeneration 
  } = useAIGeneration();

  // Form state matching PWA exactly
  const [formData, setFormData] = useState<AIGenerationRequest>({
    destination: initialDestination,
    destinationAirportCode: '',
    departure: '',
    departureAirportCode: '',
    startDate: initialDates?.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: initialDates?.endDate || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    tripType: 'leisure',
    preferenceProfileId: '',
    specialRequests: '',
    mustInclude: [],
    mustAvoid: [],
    flightPreferences: {
      class: 'economy',
      stopPreference: 'any',
      preferredAirlines: []
    }
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mustIncludeInput, setMustIncludeInput] = useState('');
  const [mustAvoidInput, setMustAvoidInput] = useState('');
  const [showSuccessState, setShowSuccessState] = useState(false);

  // Initialize form when modal opens (matching PWA logic)
  useEffect(() => {
    if (visible) {
      const defaultProfileId = preferences?.profiles?.find((p: any) => p.isDefault)?.id || '';
      const initProfileId = initialPreferenceProfileId || defaultProfileId || '';

      setFormData({
        destination: initialDestination,
        destinationAirportCode: '',
        departure: '',
        departureAirportCode: '',
        startDate: initialDates?.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: initialDates?.endDate || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        tripType: 'leisure',
        preferenceProfileId: initProfileId,
        specialRequests: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: []
        }
      });

      setFormErrors({});
      setShowSuccessState(false);
    }
  }, [visible, initialDestination, initialDates, initialPreferenceProfileId, preferences]);

  // Get selected profile (matching PWA logic exactly)
  const selectedProfile = useMemo(() => {
    if (!formData.preferenceProfileId || !preferences?.profiles) return null;
    return preferences.profiles.find((p: any) => p.id === formData.preferenceProfileId) || null;
  }, [formData.preferenceProfileId, preferences]);

  // Check if flights should be shown using ProfileValidationService (matching PWA)
  const shouldShowFlights = useMemo(() => {
    return ProfileValidationService.isFlightSectionVisible(selectedProfile);
  }, [selectedProfile]);

  // Handle field changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
    // Clear related errors
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  // Validation (matching PWA logic)
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.destination?.trim()) {
      errors.destination = 'Destination is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        errors.startDate = 'Start date cannot be in the past';
      }

      if (end <= start) {
        errors.endDate = 'End date must be after start date';
      }
    }

    if (!formData.preferenceProfileId) {
      errors.preferenceProfileId = 'Please select a travel preference profile';
    }

    // Add ProfileValidationService flight field validation (matching PWA)
    Object.assign(errors, ProfileValidationService.validateFlightFields(formData, selectedProfile));

    if (formData.specialRequests && formData.specialRequests.length > MAX_SPECIAL_REQUESTS_LENGTH) {
      errors.specialRequests = `Special requests must be at most ${MAX_SPECIAL_REQUESTS_LENGTH} characters`;
    }

    return errors;
  }, [formData, selectedProfile]);

  // Handle generation (matching PWA flow)
  const handleGenerate = useCallback(async () => {
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Get user ID from Firebase Auth (not userProfile which doesn't have uid)
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        setFormErrors({ general: 'You must be logged in to generate an itinerary' });
        return;
      }

      const request: AIGenerationRequest = {
        ...formData,
        userInfo: {
          uid: currentUserId,
          username: userProfile?.username || '',
          gender: userProfile?.gender || 'prefer-not-to-say',
          dob: userProfile?.dob || '',
          status: userProfile?.status || '',
          sexualOrientation: userProfile?.sexualOrientation || 'prefer-not-to-say',
          email: userProfile?.email || auth.currentUser?.email || '',
          blocked: userProfile?.blocked || []
        },
        travelPreferences: selectedProfile,
        preferenceProfile: selectedProfile
      };

      const result = await generateItinerary(request);

      if (result.success) {
        setShowSuccessState(true);
        
        // Auto-close after success (matching PWA behavior)
        setTimeout(() => {
          onGenerated?.(result);
          handleClose();
        }, 3000);
      } else {
        setFormErrors({ general: result.error || 'Generation failed' });
      }
    } catch (err) {
      setFormErrors({ general: 'An unexpected error occurred' });
    }
  }, [formData, userProfile, selectedProfile, validateForm, generateItinerary, onGenerated]);

  // Handle modal close (matching PWA logic)
  const handleClose = useCallback(() => {
    if (isGenerating) {
      cancelGeneration();
    }
    
    setShowSuccessState(false);
    setFormErrors({});
    
    // Reset form
    setFormData({
      destination: '',
      destinationAirportCode: '',
      departure: '',
      departureAirportCode: '',
      startDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      tripType: 'leisure',
      preferenceProfileId: preferences?.profiles?.find((p: any) => p.isDefault)?.id || '',
      specialRequests: '',
      mustInclude: [],
      mustAvoid: [],
      flightPreferences: {
        class: 'economy',
        stopPreference: 'any',
        preferredAirlines: []
      }
    });

    onClose();
  }, [isGenerating, cancelGeneration, onClose, preferences]);

  // Handle tag addition (matching PWA logic)
  const handleTagAdd = useCallback((type: 'mustInclude' | 'mustAvoid', value: string) => {
    const trimmedValue = value.trim();
    const currentArray = formData[type] || [];

    if (!trimmedValue) return;
    
    if (trimmedValue.length > MAX_TAG_LENGTH) {
      setFormErrors(prev => ({ ...prev, [type]: `Each item must be at most ${MAX_TAG_LENGTH} characters` }));
      return;
    }

    if (currentArray.length >= MAX_TAGS) {
      setFormErrors(prev => ({ ...prev, [type]: `Maximum ${MAX_TAGS} items allowed` }));
      return;
    }

    if (currentArray.includes(trimmedValue)) {
      setFormErrors(prev => ({ ...prev, [type]: 'Item already added' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [type]: [...currentArray, trimmedValue]
    }));

    // Clear input
    if (type === 'mustInclude') {
      setMustIncludeInput('');
    } else {
      setMustAvoidInput('');
    }

    // Clear error
    setFormErrors(prev => ({ ...prev, [type]: '' }));
  }, [formData]);

  // Handle tag removal
  const handleTagRemove = useCallback((type: 'mustInclude' | 'mustAvoid', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index) || []
    }));
  }, []);

  // Get progress message (matching PWA stages)
  const getProgressMessage = () => {
    if (!progress) return 'Starting generation...';
    
    switch (progress.stage) {
      case 'searching':
        return 'Searching for travel and accommodations...';
      case 'activities':
        return 'Searching for activities and restaurants...';
      case 'ai_generation':
        return 'Generating itinerary with AI...';
      case 'saving':
        return 'Saving your itinerary...';
      case 'done':
        return 'Finalizing...';
      default:
        return 'Working...';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>✨ Generate AI Itinerary</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
          {/* Error Display */}
          {formErrors.general && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formErrors.general}</Text>
            </View>
          )}

          {/* Loading State */}
          {isGenerating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingTitle}>{getProgressMessage()}</Text>
              <Text style={styles.loadingMessage}>
                {progress?.message || 'Please wait while we find the best options for your trip.'}
              </Text>
              {progress && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${progress.percent}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{progress.percent}%</Text>
                </View>
              )}
            </View>
          )}

          {/* Success State */}
          {showSuccessState && (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successMessage}>
                Your AI itinerary has been generated successfully!
              </Text>
              <View style={styles.successAlert}>
                <Text style={styles.successAlertTitle}>✅ Generation Complete</Text>
                <Text style={styles.successAlertText}>
                  • Itinerary saved to your account{'\n'}
                  • Check the "AI Itineraries" tab to view{'\n'}
                  • Modal will close automatically
                </Text>
              </View>
              <Text style={styles.successFooter}>Closing modal in a moment...</Text>
            </View>
          )}

          {/* Form Content */}
          {!isGenerating && !showSuccessState && (
            <View style={styles.form}>
              {/* Trip Details Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🌍</Text>
                  <Text style={styles.sectionTitle}>Trip Details</Text>
                </View>

                {/* Destination */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Destination *</Text>
                  <GooglePlacesAutocomplete
                    placeholder="Where do you want to go?"
                    onPress={(data, details = null) => {
                      handleFieldChange('destination', data.description);
                    }}
                    query={{
                      key: getGooglePlacesApiKey(),
                      language: 'en',
                      types: '(cities)',
                    }}
                    styles={{
                      container: {
                        flex: 0,
                        width: '100%',
                        zIndex: 1000,
                      },
                      textInputContainer: {
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                        borderBottomWidth: 0,
                        width: '100%',
                      },
                      textInput: {
                        marginLeft: 0,
                        marginRight: 0,
                        height: 42,
                        color: '#333',
                        fontSize: 15,
                        backgroundColor: '#fff',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: formErrors.destination ? '#ff4444' : '#ddd',
                        fontFamily: undefined,
                      },
                      predefinedPlacesDescription: {
                        color: '#1faadb',
                      },
                      listView: {
                        backgroundColor: 'white',
                        borderRadius: 8,
                        marginTop: 4,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        maxHeight: 200,
                      },
                      row: {
                        backgroundColor: 'white',
                        padding: 13,
                        height: 44,
                        flexDirection: 'row',
                      },
                      separator: {
                        height: 0.5,
                        backgroundColor: '#c8c7cc',
                      },
                      description: {
                        color: '#333',
                        fontSize: 15,
                      },
                      loader: {
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        height: 20,
                      },
                    }}
                    textInputProps={{
                      onChangeText: (text) => {
                        handleFieldChange('destination', text);
                      },
                      placeholderTextColor: '#999',
                      autoCorrect: false,
                      autoCapitalize: 'none',
                    }}
                    enablePoweredByContainer={false}
                    fetchDetails={false}
                    debounce={200}
                    minLength={2}
                    keyboardShouldPersistTaps="handled"
                    listUnderlayColor="transparent"
                  />
                  {formErrors.destination && (
                    <Text style={styles.fieldError}>{formErrors.destination}</Text>
                  )}
                </View>

                {/* Destination Airport - Only shown when flights are enabled */}
                {shouldShowFlights && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Destination Airport</Text>
                    <AirportSelector
                      placeholder="Select destination airport"
                      selectedAirportCode={formData.destinationAirportCode}
                      location={formData.destination}
                      onAirportSelect={(code, name) => {
                        handleFieldChange('destinationAirportCode', code);
                      }}
                      onClear={() => handleFieldChange('destinationAirportCode', '')}
                      error={!!formErrors.destinationAirportCode}
                    />
                    {formErrors.destinationAirportCode && (
                      <Text style={styles.fieldError}>{formErrors.destinationAirportCode}</Text>
                    )}
                  </View>
                )}

                {/* Departure */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Flying From</Text>
                  <GooglePlacesAutocomplete
                    placeholder="Where are you flying from? (for flight pricing)"
                    onPress={(data, details = null) => {
                      handleFieldChange('departure', data.description);
                    }}
                    query={{
                      key: getGooglePlacesApiKey(),
                      language: 'en',
                      types: '(cities)',
                    }}
                    styles={{
                      container: {
                        flex: 0,
                        width: '100%',
                        zIndex: 999,
                      },
                      textInputContainer: {
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                        borderBottomWidth: 0,
                        width: '100%',
                      },
                      textInput: {
                        marginLeft: 0,
                        marginRight: 0,
                        height: 42,
                        color: '#333',
                        fontSize: 15,
                        backgroundColor: '#fff',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: '#ddd',
                        fontFamily: undefined,
                      },
                      predefinedPlacesDescription: {
                        color: '#1faadb',
                      },
                      listView: {
                        backgroundColor: 'white',
                        borderRadius: 8,
                        marginTop: 4,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        maxHeight: 200,
                      },
                      row: {
                        backgroundColor: 'white',
                        padding: 13,
                        height: 44,
                        flexDirection: 'row',
                      },
                      separator: {
                        height: 0.5,
                        backgroundColor: '#c8c7cc',
                      },
                      description: {
                        color: '#333',
                        fontSize: 15,
                      },
                      loader: {
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        height: 20,
                      },
                    }}
                    textInputProps={{
                      onChangeText: (text) => {
                        handleFieldChange('departure', text);
                      },
                      placeholderTextColor: '#999',
                      autoCorrect: false,
                      autoCapitalize: 'none',
                    }}
                    enablePoweredByContainer={false}
                    fetchDetails={false}
                    debounce={200}
                    minLength={2}
                    keyboardShouldPersistTaps="handled"
                    listUnderlayColor="transparent"
                  />
                </View>

                {/* Departure Airport - Only shown when flights are enabled */}
                {shouldShowFlights && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Departure Airport</Text>
                    <AirportSelector
                      placeholder="Select departure airport"
                      selectedAirportCode={formData.departureAirportCode}
                      location={formData.departure}
                      onAirportSelect={(code, name) => {
                        handleFieldChange('departureAirportCode', code);
                      }}
                      onClear={() => handleFieldChange('departureAirportCode', '')}
                      error={!!formErrors.departureAirportCode}
                    />
                    {formErrors.departureAirportCode && (
                      <Text style={styles.fieldError}>{formErrors.departureAirportCode}</Text>
                    )}
                  </View>
                )}

                {/* Dates */}
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Text style={styles.fieldLabel}>Start Date *</Text>
                    <TextInput
                      style={[styles.textInput, formErrors.startDate && styles.inputError]}
                      value={formData.startDate}
                      onChangeText={(text) => handleFieldChange('startDate', text)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                    />
                    {formErrors.startDate && (
                      <Text style={styles.fieldError}>{formErrors.startDate}</Text>
                    )}
                  </View>

                  <View style={styles.dateField}>
                    <Text style={styles.fieldLabel}>End Date *</Text>
                    <TextInput
                      style={[styles.textInput, formErrors.endDate && styles.inputError]}
                      value={formData.endDate}
                      onChangeText={(text) => handleFieldChange('endDate', text)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                    />
                    {formErrors.endDate && (
                      <Text style={styles.fieldError}>{formErrors.endDate}</Text>
                    )}
                  </View>
                </View>

                {/* Trip Type */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Trip Type</Text>
                  <View style={styles.chipContainer}>
                    {TRIP_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.chip,
                          formData.tripType === type.value && styles.chipSelected
                        ]}
                        onPress={() => handleFieldChange('tripType', type.value)}
                      >
                        <Text style={[
                          styles.chipText,
                          formData.tripType === type.value && styles.chipTextSelected
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Preference Profile */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Travel Preferences *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.preferenceProfileId}
                      onValueChange={(value) => handleFieldChange('preferenceProfileId', value)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      dropdownIconColor="#3B82F6"
                      mode="dropdown" // Ensure dropdown mode for cleaner rendering
                    >
                      <Picker.Item 
                        label="Select a profile..." 
                        value="" 
                        color="#9CA3AF"
                        fontFamily="System" // Use system font to prevent rendering issues
                      />
                      {preferences?.profiles?.map((profile: any) => (
                        <Picker.Item 
                          key={profile.id} 
                          label={profile.name} 
                          value={profile.id}
                          color="#111827"
                          fontFamily="System" // Use system font to prevent rendering issues
                        />
                      ))}
                    </Picker>
                  </View>
                  {formErrors.preferenceProfileId && (
                    <Text style={styles.fieldError}>{formErrors.preferenceProfileId}</Text>
                  )}
                </View>
              </View>

              {/* Flight Preferences (conditional) */}
              {shouldShowFlights && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>✈️</Text>
                    <Text style={styles.sectionTitle}>Flight Preferences</Text>
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Class</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.flightPreferences?.class}
                        onValueChange={(value) => handleFieldChange('flightPreferences', {
                          ...formData.flightPreferences,
                          class: value
                        })}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        dropdownIconColor="#3B82F6"
                        mode="dropdown"
                      >
                        {FLIGHT_CLASSES.map((cls) => (
                          <Picker.Item 
                            key={cls.value} 
                            label={cls.label} 
                            value={cls.value}
                            color="#111827"
                            fontFamily="System"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Stop Preference</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.flightPreferences?.stopPreference}
                        onValueChange={(value) => handleFieldChange('flightPreferences', {
                          ...formData.flightPreferences,
                          stopPreference: value
                        })}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        dropdownIconColor="#3B82F6"
                        mode="dropdown"
                      >
                        {STOP_PREFERENCES.map((pref) => (
                          <Picker.Item 
                            key={pref.value} 
                            label={pref.label} 
                            value={pref.value}
                            color="#111827"
                            fontFamily="System"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Preferred Airlines (Optional)</Text>
                    <Text style={styles.fieldHint}>Press enter to add airline preferences</Text>
                    {(formData.flightPreferences?.preferredAirlines || []).length > 0 && (
                      <View style={styles.tagList}>
                        {(formData.flightPreferences?.preferredAirlines || []).map((airline: string, index: number) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{airline}</Text>
                            <TouchableOpacity 
                              onPress={() => {
                                const updated = (formData.flightPreferences?.preferredAirlines || []).filter((_: any, i: number) => i !== index);
                                handleFieldChange('flightPreferences', {
                                  ...formData.flightPreferences,
                                  preferredAirlines: updated
                                });
                              }}
                              style={styles.tagRemoveButton}
                            >
                              <Text style={styles.tagRemoveText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    {formErrors.preferredAirlines && (
                      <Text style={styles.fieldError}>{formErrors.preferredAirlines}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Special Requests */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>💭</Text>
                  <Text style={styles.sectionTitle}>Additional Preferences</Text>
                </View>
                
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    Special Requests ({formData.specialRequests?.length || 0}/{MAX_SPECIAL_REQUESTS_LENGTH})
                  </Text>
                  <TextInput
                    style={[
                      styles.textArea, 
                      formErrors.specialRequests && styles.inputError
                    ]}
                    value={formData.specialRequests}
                    onChangeText={(text) => handleFieldChange('specialRequests', text)}
                    placeholder="Any special requests or preferences for your trip?"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    maxLength={MAX_SPECIAL_REQUESTS_LENGTH}
                  />
                  {formErrors.specialRequests && (
                    <Text style={styles.fieldError}>{formErrors.specialRequests}</Text>
                  )}
                </View>

                {/* Must Include Tags */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    Must Include ({formData.mustInclude?.length || 0}/{MAX_TAGS})
                  </Text>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={styles.tagInput}
                      value={mustIncludeInput}
                      onChangeText={setMustIncludeInput}
                      placeholder="Add specific places or activities..."
                      placeholderTextColor="#999"
                      onSubmitEditing={() => handleTagAdd('mustInclude', mustIncludeInput)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.tagAddButton}
                      onPress={() => handleTagAdd('mustInclude', mustIncludeInput)}
                    >
                      <Text style={styles.tagAddButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagList}>
                    {formData.mustInclude?.map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.tag}
                        onPress={() => handleTagRemove('mustInclude', index)}
                      >
                        <Text style={styles.tagText}>{tag}</Text>
                        <Text style={styles.tagRemove}>×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formErrors.mustInclude && (
                    <Text style={styles.fieldError}>{formErrors.mustInclude}</Text>
                  )}
                </View>

                {/* Must Avoid Tags */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    Must Avoid ({formData.mustAvoid?.length || 0}/{MAX_TAGS})
                  </Text>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={styles.tagInput}
                      value={mustAvoidInput}
                      onChangeText={setMustAvoidInput}
                      placeholder="Add things to avoid..."
                      placeholderTextColor="#999"
                      onSubmitEditing={() => handleTagAdd('mustAvoid', mustAvoidInput)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.tagAddButton}
                      onPress={() => handleTagAdd('mustAvoid', mustAvoidInput)}
                    >
                      <Text style={styles.tagAddButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagList}>
                    {formData.mustAvoid?.map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.tag}
                        onPress={() => handleTagRemove('mustAvoid', index)}
                      >
                        <Text style={styles.tagText}>{tag}</Text>
                        <Text style={styles.tagRemove}>×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formErrors.mustAvoid && (
                    <Text style={styles.fieldError}>{formErrors.mustAvoid}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer Actions */}
        {!isGenerating && !showSuccessState && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
              <Text style={styles.generateButtonText}>🤖 Generate AI Itinerary</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Generation Button */}
        {isGenerating && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelGenerationButton} onPress={cancelGeneration}>
              <Text style={styles.cancelGenerationButtonText}>Cancel Generation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    maxHeight: '85%' // Make modal 15% smaller in height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 16 // 15% smaller padding
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.25
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
    lineHeight: 24
  },
  content: {
    flex: 1,
    paddingHorizontal: 20
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginVertical: 10
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 68,
    paddingHorizontal: 28
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.25
  },
  loadingMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 12
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 68,
    paddingHorizontal: 28
  },
  successEmoji: {
    fontSize: 68,
    marginBottom: 20
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 14,
    textAlign: 'center'
  },
  successMessage: {
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26
  },
  successAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%'
  },
  successAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8
  },
  successAlertText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 22
  },
  successFooter: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  form: {
    paddingVertical: 8
  },
  section: {
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 6
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  field: {
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    letterSpacing: 0.25
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#111827'
  },
  textInputFocused: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#111827',
    minHeight: 85,
    textAlignVertical: 'top'
  },
  inputError: {
    borderColor: '#EF4444'
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4
  },
  dateRow: {
    flexDirection: 'row',
    gap: 14
  },
  dateField: {
    flex: 1
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'visible', // Critical fix: visible overflow prevents shade rendering issues
    minHeight: 48,
  },
  picker: {
    height: 48,
    width: '100%',
    color: '#111827',
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    height: 44,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#111827'
  },
  tagAddButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center'
  },
  tagAddButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  tag: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  tagText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '500'
  },
  tagRemove: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 4,
  },
  tagRemoveButton: {
    marginLeft: 4,
  },
  tagRemoveText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    gap: 14,
    paddingBottom: 20 // 15% smaller padding
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 85
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500'
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  cancelGenerationButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  cancelGenerationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff'
  },
  chipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151'
  },
  chipTextSelected: {
    color: '#ffffff'
  }
});

export default AIItineraryGenerationModal;