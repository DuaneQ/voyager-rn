import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActionSheetIOS,
  PanResponder,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import RangeSlider from '../common/RangeSlider';
import { useCreateItinerary } from '../../hooks/useCreateItinerary';
import { useDeleteItinerary } from '../../hooks/useDeleteItinerary';
import {
  ManualItineraryFormData,
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from '../../types/ManualItinerary';
import { Itinerary } from '../../hooks/useAllItineraries';
import ItineraryListItem from './ItineraryListItem';
import { getGooglePlacesApiKey } from '../../constants/apiConfig';

// Minimal UserProfile interface needed for this component
interface UserProfile {
  uid?: string;
  username?: string;
  email?: string;
  dob?: string;
  gender?: string;
  status?: string;
  sexualOrientation?: string;
  blocked?: string[];
}

interface AddItineraryModalProps {
  visible: boolean;
  onClose: () => void;
  onItineraryAdded: () => void;
  itineraries: Itinerary[];
  userProfile?: UserProfile | null;
}

const AddItineraryModal: React.FC<AddItineraryModalProps> = ({
  visible,
  onClose,
  onItineraryAdded,
  itineraries,
  userProfile,
}) => {
  // Form state
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [description, setDescription] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [gender, setGender] = useState<ManualItineraryFormData['gender']>('No Preference');
  const [status, setStatus] = useState<ManualItineraryFormData['status']>('No Preference');
  const [sexualOrientation, setSexualOrientation] = useState<ManualItineraryFormData['sexualOrientation']>('No Preference');
  const [lowerRange, setLowerRange] = useState(25);
  const [upperRange, setUpperRange] = useState(45);

  // UI state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [editingItineraryId, setEditingItineraryId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Scroll ref for auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Hooks
  const { createItinerary, loading: creating } = useCreateItinerary();
  const { deleteItinerary, loading: deleting } = useDeleteItinerary();

  // Check profile completion
  const profileComplete = userProfile?.dob && userProfile?.gender;

  // Reset form
  const resetForm = () => {
    setDestination('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setDescription('');
    setActivities([]);
    setNewActivity('');
    setGender('No Preference');
    setStatus('No Preference');
    setSexualOrientation('No Preference');
    setLowerRange(25);
    setUpperRange(45);
    setEditingItineraryId(null);
    setValidationErrors([]);
  };

  // Load itinerary for editing
  const handleEdit = (itineraryId: string) => {
    const itinerary = itineraries.find(i => i.id === itineraryId);
    if (!itinerary) return;

    setDestination(itinerary.destination);
    setStartDate(new Date(itinerary.startDate));
    setEndDate(new Date(itinerary.endDate));
    setDescription(itinerary.description || '');
    
    // Parse activities from JSON string or array
    try {
      const acts = typeof itinerary.activities === 'string' 
        ? JSON.parse(itinerary.activities) 
        : itinerary.activities;
      setActivities(Array.isArray(acts) ? acts : []);
    } catch {
      setActivities([]);
    }

    setGender(itinerary.gender as ManualItineraryFormData['gender']);
    setStatus(itinerary.status as ManualItineraryFormData['status']);
    setSexualOrientation(itinerary.sexualOrientation as ManualItineraryFormData['sexualOrientation']);
    setLowerRange(typeof itinerary.lowerRange === 'number' ? itinerary.lowerRange : parseInt(String(itinerary.lowerRange), 10));
    setUpperRange(typeof itinerary.upperRange === 'number' ? itinerary.upperRange : parseInt(String(itinerary.upperRange), 10));
    setEditingItineraryId(itineraryId);
    
    // Auto-scroll to top when editing starts
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  // Handle delete
  const handleDelete = (itineraryId: string) => {
    Alert.alert(
      'Delete Itinerary',
      'Are you sure you want to delete this itinerary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const response = await deleteItinerary(itineraryId);
            if (response.success) {
              Alert.alert('Success', 'Itinerary deleted');
              onItineraryAdded(); // Refresh list
              if (editingItineraryId === itineraryId) {
                resetForm();
              }
            } else {
              Alert.alert('Error', response.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Add activity
  const handleAddActivity = () => {
    const trimmed = newActivity.trim();
    if (trimmed && !activities.includes(trimmed)) {
      setActivities([...activities, trimmed]);
      setNewActivity('');
    }
  };

  // Remove activity
  const handleRemoveActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  // Save itinerary
  const handleSave = async () => {
    if (!profileComplete) {
      Alert.alert('Profile Incomplete', 'Please complete your profile (date of birth and gender) before creating an itinerary.');
      return;
    }

    const formData: ManualItineraryFormData = {
      destination: destination.trim(),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      description: description.trim(),
      activities,
      gender,
      status,
      sexualOrientation,
      lowerRange,
      upperRange,
    };

    const response = await createItinerary(formData, userProfile!, editingItineraryId || undefined);

    if (response.success) {
      Alert.alert('Success', editingItineraryId ? 'Itinerary updated' : 'Itinerary created');
      resetForm();
      onItineraryAdded();
      onClose();
    } else if (response.validationErrors) {
      setValidationErrors(response.validationErrors.map(e => `${e.field}: ${e.message}`));
    } else {
      Alert.alert('Error', response.error || 'Failed to save itinerary');
    }
  };

  // Date picker handlers
  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    // On Android, close picker after selection
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    // On Android, close picker after selection
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleStartDateDone = () => {
    setShowStartPicker(false);
  };

  const handleEndDateDone = () => {
    setShowEndPicker(false);
  };

  // Selection helpers for iOS ActionSheet and Android Alert
  const showGenderPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...GENDER_OPTIONS],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setGender(GENDER_OPTIONS[buttonIndex - 1]);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Gender Preference',
        '',
        [
          ...GENDER_OPTIONS.map(option => ({
            text: option,
            onPress: () => setGender(option),
          })),
          { text: 'Cancel', style: 'cancel' as const }
        ]
      );
    }
  };

  const showStatusPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...STATUS_OPTIONS],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setStatus(STATUS_OPTIONS[buttonIndex - 1]);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Relationship Status',
        '',
        [
          ...STATUS_OPTIONS.map(option => ({
            text: option,
            onPress: () => setStatus(option),
          })),
          { text: 'Cancel', style: 'cancel' as const }
        ]
      );
    }
  };

  const showOrientationPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...SEXUAL_ORIENTATION_OPTIONS],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setSexualOrientation(SEXUAL_ORIENTATION_OPTIONS[buttonIndex - 1]);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Sexual Orientation',
        '',
        [
          ...SEXUAL_ORIENTATION_OPTIONS.map(option => ({
            text: option,
            onPress: () => setSexualOrientation(option),
          })),
          { text: 'Cancel', style: 'cancel' as const }
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingItineraryId ? 'Edit Itinerary' : 'Create Itinerary'}
          </Text>
          {editingItineraryId ? (
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Warning */}
          {!profileComplete && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Please complete your profile (date of birth and gender) before creating an itinerary.
              </Text>
            </View>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <View style={styles.errorBox}>
              {validationErrors.map((error, index) => (
                <Text key={index} style={styles.errorText}>• {error}</Text>
              ))}
            </View>
          )}

          {/* Form Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>

            {/* Destination */}
            <Text style={styles.label}>Destination *</Text>
            <GooglePlacesAutocomplete
              placeholder="Where do you want to go?"
              onPress={(data, details = null) => {
                setDestination(data.description);
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
                  setDestination(text);
                },
                placeholderTextColor: '#999',
                autoCorrect: false,
                autoCapitalize: 'none',
                value: destination,
              }}
              enablePoweredByContainer={false}
              fetchDetails={false}
              debounce={200}
              minLength={2}
              keyboardShouldPersistTaps="handled"
              listUnderlayColor="transparent"
            />

            {/* Start Date */}
            <Text style={styles.label}>Start Date *</Text>
            <TouchableOpacity 
              testID="start-date-button"
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text>{startDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <View>
                <DateTimePicker
                  testID="start-date-picker"
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    testID="start-date-done"
                    style={styles.datePickerDoneButton}
                    onPress={handleStartDateDone}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* End Date */}
            <Text style={styles.label}>End Date *</Text>
            <TouchableOpacity 
              testID="end-date-button"
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text>{endDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <View>
                <DateTimePicker
                  testID="end-date-picker"
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                  minimumDate={startDate}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    testID="end-date-done"
                    style={styles.datePickerDoneButton}
                    onPress={handleEndDateDone}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              testID="description-input"
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us about your trip..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            {/* Activities */}
            <Text style={styles.label}>Activities</Text>
            <View style={styles.activityInputRow}>
              <TextInput
                style={[styles.input, styles.activityInput]}
                value={newActivity}
                onChangeText={setNewActivity}
                placeholder="Add an activity"
                placeholderTextColor="#999"
                onSubmitEditing={handleAddActivity}
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddActivity}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityList}>
              {activities.map((activity, index) => (
                <View key={index} style={styles.activityChip}>
                  <Text style={styles.activityText}>{activity}</Text>
                  <TouchableOpacity onPress={() => handleRemoveActivity(index)}>
                    <Text style={styles.removeActivity}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Match Preferences</Text>

            {/* Gender */}
            <Text style={styles.label}>Gender Preference *</Text>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={showGenderPicker}
            >
              <Text style={styles.selectionButtonText}>{gender}</Text>
              <Text style={styles.selectionArrow}>▼</Text>
            </TouchableOpacity>

            {/* Status */}
            <Text style={styles.label}>Relationship Status Preference *</Text>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={showStatusPicker}
            >
              <Text style={styles.selectionButtonText}>{status}</Text>
              <Text style={styles.selectionArrow}>▼</Text>
            </TouchableOpacity>

            {/* Sexual Orientation */}
            <Text style={styles.label}>Sexual Orientation Preference *</Text>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={showOrientationPicker}
            >
              <Text style={styles.selectionButtonText}>{sexualOrientation}</Text>
              <Text style={styles.selectionArrow}>▼</Text>
            </TouchableOpacity>

            {/* Age Range */}
            <Text style={styles.label}>Age Range (18-100) *</Text>
            <View style={styles.sliderContainer}>
              <RangeSlider
                min={18}
                max={100}
                step={1}
                lowValue={lowerRange}
                highValue={upperRange}
                onValueChange={(low, high) => {
                  setLowerRange(low);
                  setUpperRange(high);
                }}
              />
              
              <View style={styles.ageRangeBadge}>
                <Text style={styles.ageRangeBadgeText}>
                  Age Range: {lowerRange} - {upperRange}
                </Text>
              </View>
            </View>
          </View>

          {/* Existing Itineraries */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Itineraries ({itineraries.length})</Text>
            {itineraries.length === 0 ? (
              <Text style={styles.emptyText}>No itineraries yet</Text>
            ) : (
              itineraries.map((itinerary) => (
                <ItineraryListItem
                  key={itinerary.id}
                  itinerary={itinerary}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isEditing={editingItineraryId === itinerary.id}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            testID="save-button"
            style={[styles.saveButton, (creating || deleting) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={creating || deleting || !profileComplete}
          >
            <Text style={styles.saveButtonText}>
              {creating ? 'Saving...' : editingItineraryId ? 'Update Itinerary' : 'Create Itinerary'}
            </Text>
          </TouchableOpacity>
          {editingItineraryId && (
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={resetForm}
            >
              <Text style={styles.cancelEditText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
    width: 60,
  },
  cancelButton: {
    fontSize: 16,
    color: '#ff3b30',
    width: 60,
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c2c7',
  },
  errorText: {
    color: '#842029',
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  datePickerDoneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  activityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activityText: {
    color: '#1976d2',
    fontSize: 14,
  },
  removeActivity: {
    color: '#1976d2',
    fontSize: 20,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  selectionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectionButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectionArrow: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  ageRangeBadge: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  ageRangeBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  ageRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
    textAlign: 'center',
  },
  ageRangeSeparator: {
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelEditButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelEditText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default AddItineraryModal;
