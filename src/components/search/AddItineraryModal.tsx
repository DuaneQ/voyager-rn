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
import { CrossPlatformDatePicker } from '../common/CrossPlatformDatePicker';
import { PlacesAutocomplete } from '../common/PlacesAutocomplete';
import { City } from '../../types/City';
import RangeSlider from '../common/RangeSlider';
import { AndroidPickerModal } from '../common/AndroidPickerModal';
import { useCreateItinerary } from '../../hooks/useCreateItinerary';
import { useDeleteItinerary } from '../../hooks/useDeleteItinerary';
import { formatDateLocal } from '../../utils/formatDate';
import {
  ManualItineraryFormData,
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from '../../types/ManualItinerary';
import { Itinerary } from '../../hooks/useAllItineraries';
import ItineraryListItem from './ItineraryListItem';

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
  // Defensive: ensure itineraries is an array in case parent passes undefined during async loads
  const safeItineraries = Array.isArray(itineraries) ? itineraries : [];

  // Helper to parse YYYY-MM-DD as local date (not UTC) - same as EditProfileModal
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helpful debug logging when modal opens to surface any unexpected shapes that could cause runtime errors
  React.useEffect(() => {
    if (visible) {
      // eslint-disable-next-line no-console
      
    }
  }, [visible, itineraries]);
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
  const [editingItineraryId, setEditingItineraryId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [itineraryToDelete, setItineraryToDelete] = useState<string | null>(null);
  
  // Android picker modal states
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showOrientationPicker, setShowOrientationPicker] = useState(false);

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

    console.log('[DATE_DEBUG][handleEdit] Loading itinerary:', {
      id: itinerary.id,
      destination: itinerary.destination,
      startDateRaw: itinerary.startDate,
      endDateRaw: itinerary.endDate,
      startDateType: typeof itinerary.startDate,
      endDateType: typeof itinerary.endDate,
    });

    setDestination(itinerary.destination);
    
    // CRITICAL: Use parseLocalDate to avoid timezone shifts (same as EditProfileModal)
    // itinerary.startDate is "2026-02-06" (YYYY-MM-DD string from Firestore)
    // new Date("2026-02-06") interprets as UTC midnight → shifts to previous day in PST
    // parseLocalDate manually parses components → Feb 6 stays Feb 6
    const parsedStartDate = parseLocalDate(itinerary.startDate);
    const parsedEndDate = parseLocalDate(itinerary.endDate);
    
    console.log('[DATE_DEBUG][handleEdit] After parseLocalDate:', {
      parsedStartDate: parsedStartDate.toISOString(),
      parsedStartDateLocal: parsedStartDate.toString(),
      parsedStartDateComponents: {
        year: parsedStartDate.getFullYear(),
        month: parsedStartDate.getMonth(),
        day: parsedStartDate.getDate(),
      },
      parsedEndDate: parsedEndDate.toISOString(),
      parsedEndDateLocal: parsedEndDate.toString(),
    });
    
    setStartDate(parsedStartDate);
    setEndDate(parsedEndDate);
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
    if (Platform.OS === 'web') {
      // Web: Use custom Modal (Alert.alert doesn't work on web)
      setItineraryToDelete(itineraryId);
      setDeleteConfirmModalVisible(true);
    } else {
      // Mobile: Use native Alert (nested Modals don't work on mobile)
      Alert.alert(
        'Delete Itinerary?',
        'Are you sure you want to delete this itinerary? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => confirmDelete(itineraryId),
          },
        ],
        { cancelable: true }
      );
    }
  };

  const confirmDelete = async (itineraryId?: string) => {
    const idToDelete = itineraryId || itineraryToDelete;
    if (!idToDelete) return;
    
    const response = await deleteItinerary(idToDelete);
    if (response.success) {
      // Parent will show a unified success notification. Refresh list and reset form if needed.
      onItineraryAdded(); // Refresh list
      if (editingItineraryId === idToDelete) {
        resetForm();
      }
    } else {
      Alert.alert('Error', response.error || 'Failed to delete');
    }
    
    setDeleteConfirmModalVisible(false);
    setItineraryToDelete(null);
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

    if (!destination.trim()) {
      Alert.alert('Validation Error', 'Please enter a destination.');
      return;
    }

    console.log('[DATE_DEBUG][handleSubmit] State dates before formatting:', {
      startDate: startDate.toISOString(),
      startDateLocal: startDate.toString(),
      endDate: endDate.toISOString(),
      endDateLocal: endDate.toString(),
    });

    const formattedStartDate = formatDateLocal(startDate);
    const formattedEndDate = formatDateLocal(endDate);
    
    console.log('[DATE_DEBUG][handleSubmit] Formatted dates:', {
      formattedStartDate,
      formattedEndDate,
    });

    const formData: ManualItineraryFormData = {
      destination: destination.trim(),
      startDate: formattedStartDate,
      endDate: formattedEndDate,
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
      // Parent will show a unified success notification. Close modal and refresh list.
      resetForm();
      onItineraryAdded();
      onClose();
    } else if (response.validationErrors) {
      const errors = response.validationErrors.map(e => `${e.field}: ${e.message}`);
      setValidationErrors(errors);
      // Scroll to top to show errors
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      // Also show an alert for immediate feedback
      Alert.alert(
        'Validation Error', 
        response.validationErrors.map(e => e.message).join('\n'),
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', response.error || 'Failed to save itinerary');
    }
  };

  // Selection helpers for iOS ActionSheet and Android Modal
  const handleGenderPress = () => {
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
      // Android and Web use the modal picker
      setShowGenderPicker(true);
    }
  };

  const handleStatusPress = () => {
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
      // Android and Web use the modal picker
      setShowStatusPicker(true);
    }
  };

  const handleOrientationPress = () => {
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
      // Android and Web use the modal picker
      setShowOrientationPicker(true);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
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
          // Per react-native-google-places-autocomplete docs:
          // keyboardShouldPersistTaps must be 'handled' or 'always' on all ancestor ScrollViews
          // to prevent the VirtualizedList touch issues on Android
          keyboardShouldPersistTaps="handled"
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

            {/* Destination - Google Places for comprehensive coverage */}
            <Text style={styles.label}>Destination *</Text>
            <PlacesAutocomplete
              testID="google-places-input"
              placeholder="Search for a destination"
              value={destination}
              onChangeText={setDestination}
              onPlaceSelected={(place: string) => {
                setDestination(place);
              }}
              error={!!destination && destination.length === 0}
            />

            {/* Start Date */}
            <Text style={styles.label}>Start Date *</Text>
            <CrossPlatformDatePicker
              testID="start-date-picker"
              value={startDate}
              onChange={(date) => {
                setStartDate(date);
                // If end date is before new start date, update it
                if (endDate < date) {
                  setEndDate(date);
                }
              }}
              minimumDate={new Date()}
            />

            {/* End Date */}
            <Text style={styles.label}>End Date *</Text>
            <CrossPlatformDatePicker
              testID="end-date-picker"
              value={endDate}
              onChange={setEndDate}
              minimumDate={startDate}
            />

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
              onPress={handleGenderPress}
            >
              <Text style={styles.selectionButtonText}>{gender}</Text>
              <Text style={styles.selectionArrow}>▼</Text>
            </TouchableOpacity>
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <AndroidPickerModal
                visible={showGenderPicker}
                onClose={() => setShowGenderPicker(false)}
                onSelect={(value) => setGender(value as ManualItineraryFormData['gender'])}
                selectedValue={gender}
                title="Gender Preference"
                options={GENDER_OPTIONS.map(opt => ({ label: opt, value: opt }))}
              />
            )}

            {/* Status */}
            <Text style={styles.label}>Relationship Status Preference *</Text>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={handleStatusPress}
            >
              <Text style={styles.selectionButtonText}>{status}</Text>
              <Text style={styles.selectionArrow}>▼</Text>
            </TouchableOpacity>
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <AndroidPickerModal
                visible={showStatusPicker}
                onClose={() => setShowStatusPicker(false)}
                onSelect={(value) => setStatus(value as ManualItineraryFormData['status'])}
                selectedValue={status}
                title="Relationship Status"
                options={STATUS_OPTIONS.map(opt => ({ label: opt, value: opt }))}
              />
            )}

            {/* Sexual Orientation */}
            <Text style={styles.label}>Sexual Orientation Preference *</Text>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={handleOrientationPress}
            >
              <Text style={styles.selectionButtonText}>{sexualOrientation}</Text>
              <Text style={styles.selectionArrow}>▼</Text>
            </TouchableOpacity>
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <AndroidPickerModal
                visible={showOrientationPicker}
                onClose={() => setShowOrientationPicker(false)}
                onSelect={(value) => setSexualOrientation(value as ManualItineraryFormData['sexualOrientation'])}
                selectedValue={sexualOrientation}
                title="Sexual Orientation"
                options={SEXUAL_ORIENTATION_OPTIONS.map(opt => ({ label: opt, value: opt }))}
              />
            )}

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
            <Text style={styles.sectionTitle}>Your Itineraries ({safeItineraries.length})</Text>
            {safeItineraries.length === 0 ? (
              <Text style={styles.emptyText}>No itineraries yet</Text>
            ) : (
              safeItineraries.map((itinerary) => (
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

    {/* Delete Confirmation Modal */}
    <Modal
      visible={deleteConfirmModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setDeleteConfirmModalVisible(false)}
    >
      <View style={styles.deleteModalOverlay}>
        <View style={styles.deleteModalContent}>
          <Text style={styles.deleteModalTitle}>Delete Itinerary?</Text>
          <Text style={styles.deleteModalText}>
            Are you sure you want to delete this itinerary? This action cannot be undone.
          </Text>
          
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={[styles.deleteModalButton, styles.deleteCancelButton]}
              onPress={() => {
                setDeleteConfirmModalVisible(false);
                setItineraryToDelete(null);
              }}
            >
              <Text style={styles.deleteCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.deleteModalButton, styles.deleteConfirmButton]}
              onPress={() => confirmDelete()}
            >
              <Text style={styles.deleteConfirmButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
  inputError: {
    borderColor: '#ff4444',
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
    paddingBottom: Platform.OS === 'ios' ? 50 : 60,
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#ff3b30',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddItineraryModal;
