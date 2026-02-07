/**
 * EditProfileModal Component
 * Complete profile editing matching PWA functionality
 * All required fields for itinerary creation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from '../../types/ManualItinerary';
import { AndroidPickerModal } from '../common/AndroidPickerModal';
import { CrossPlatformDatePicker } from '../common/CrossPlatformDatePicker';
import { parseLocalDate } from '../../utils/formatDate';

// iOS Picker Modal Component
const IOSPickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: { label: string; value: string }[];
  selectedValue: string;
  title: string;
}> = ({ visible, onClose, onSelect, options, selectedValue, title }) => {
  const [tempValue, setTempValue] = useState(selectedValue);

  useEffect(() => {
    setTempValue(selectedValue);
  }, [selectedValue, visible]);

  const handleDone = () => {
    onSelect(tempValue);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.pickerModalOverlay}>
        <TouchableOpacity style={styles.pickerModalBackdrop} onPress={onClose} />
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerModalTitle}>{title}</Text>
            <TouchableOpacity onPress={handleDone}>
              <Text style={styles.pickerModalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <Picker
            selectedValue={tempValue}
            onValueChange={setTempValue}
            style={styles.pickerModalPicker}
            itemStyle={styles.pickerModalItem}
          >
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  );
};

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ProfileData) => Promise<void>;
  initialData: ProfileData;
}

export interface ProfileData {
  username: string;
  bio: string;
  dob: string;
  gender: string;
  sexualOrientation: string;
  status: string;
  edu: string;
  drinking: string;
  smoking: string;
}

// Constants from PWA
const EDUCATION_OPTIONS = ['High School', "Bachelor's Degree", "Master's Degree", 'PhD', 'Trade School', 'Some College', 'Other'];
const FREQUENCY = ['Never', 'Occasionally', 'Socially', 'Regularly'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<ProfileData>(initialData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  
  // iOS Picker Modal states
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [orientationModalVisible, setOrientationModalVisible] = useState(false);
  const [eduModalVisible, setEduModalVisible] = useState(false);
  const [drinkingModalVisible, setDrinkingModalVisible] = useState(false);
  const [smokingModalVisible, setSmokingModalVisible] = useState(false);

  // Date state for CrossPlatformDatePicker
  const [dateValue, setDateValue] = useState<Date>(() => {
    if (initialData.dob) {
      return parseLocalDate(initialData.dob);
    }
    // Default to 25 years ago
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  });

  useEffect(() => {
    setFormData(initialData);
    setErrors({});
    // Update dateValue when initialData.dob changes
    if (initialData.dob) {
      setDateValue(parseLocalDate(initialData.dob));
    }
  }, [visible, initialData]);

  const isUserOver18 = (dob: string): boolean => {
    if (!dob) return false;
    const birthDate = parseLocalDate(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileData, string>> = {};

    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else if (!isUserOver18(formData.dob)) {
      newErrors.dob = 'You must be 18 years or older';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (!formData.sexualOrientation) {
      newErrors.sexualOrientation = 'Sexual orientation is required';
    }

    if (formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ username: 'Failed to save profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            testID="save-profile-button"
            onPress={handleSave}
            style={styles.saveButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1976d2" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.form} 
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={false}
          scrollEventThrottle={16}
        >
          <Text style={styles.sectionNote}>* Required fields for creating itineraries</Text>

          {/* Username */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              testID="username-input"
              style={[styles.input, errors.username && styles.inputError]}
              value={formData.username}
              onChangeText={(value) => handleChange('username', value)}
              placeholder="Enter your username"
              maxLength={50}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
            <Text style={styles.helperText}>{formData.username.length}/50 characters</Text>
          </View>

          {/* Bio */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              testID="bio-input"
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(value) => handleChange('bio', value)}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>{formData.bio.length}/500 characters</Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date of Birth *</Text>
            <CrossPlatformDatePicker
              testID="dob-input"
              value={dateValue}
              onChange={(date) => {
                setDateValue(date);
                // Format date as YYYY-MM-DD
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                handleChange('dob', formattedDate);
              }}
              maximumDate={new Date()}
              error={!!errors.dob}
              errorMessage={errors.dob}
            />
          </View>

          {/* Status */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Status *</Text>
            <TouchableOpacity
              testID="status-picker"
              style={[styles.input, errors.status && styles.inputError]}
              onPress={() => setStatusModalVisible(true)}
            >
              <Text style={[styles.inputText, !formData.status && styles.placeholderText]}>
                {formData.status ? STATUS_OPTIONS.find(opt => opt.toLowerCase() === formData.status) || formData.status : 'Select status...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <IOSPickerModal
                visible={statusModalVisible}
                onClose={() => setStatusModalVisible(false)}
                onSelect={(value) => handleChange('status', value)}
                selectedValue={formData.status}
                title="Select Status"
                options={[
                  { label: 'Select status...', value: '' },
                  ...STATUS_OPTIONS.map(opt => ({ label: opt, value: opt.toLowerCase() }))
                ]}
              />
            ) : (
              <AndroidPickerModal
                visible={statusModalVisible}
                onClose={() => setStatusModalVisible(false)}
                onSelect={(value) => handleChange('status', value)}
                selectedValue={formData.status}
                title="Select Status"
                options={[
                  { label: 'Select status...', value: '' },
                  ...STATUS_OPTIONS.map(opt => ({ label: opt, value: opt.toLowerCase() }))
                ]}
              />
            )}
            {errors.status && (
              <Text style={styles.errorText}>{errors.status}</Text>
            )}
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Gender *</Text>
            <TouchableOpacity
              testID="gender-picker"
              style={[styles.input, errors.gender && styles.inputError]}
              onPress={() => setGenderModalVisible(true)}
            >
              <Text style={[styles.inputText, !formData.gender && styles.placeholderText]}>
                {formData.gender || 'Select gender...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <IOSPickerModal
                visible={genderModalVisible}
                onClose={() => setGenderModalVisible(false)}
                onSelect={(value) => handleChange('gender', value)}
                selectedValue={formData.gender}
                title="Select Gender"
                options={[
                  { label: 'Select gender...', value: '' },
                  ...GENDER_OPTIONS.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            ) : (
              <AndroidPickerModal
                visible={genderModalVisible}
                onClose={() => setGenderModalVisible(false)}
                onSelect={(value) => handleChange('gender', value)}
                selectedValue={formData.gender}
                title="Select Gender"
                options={[
                  { label: 'Select gender...', value: '' },
                  ...GENDER_OPTIONS.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            )}
            {errors.gender && (
              <Text style={styles.errorText}>{errors.gender}</Text>
            )}
          </View>

          {/* Sexual Orientation */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Sexual Orientation *</Text>
            <TouchableOpacity
              testID="orientation-picker"
              style={[styles.input, errors.sexualOrientation && styles.inputError]}
              onPress={() => setOrientationModalVisible(true)}
            >
              <Text style={[styles.inputText, !formData.sexualOrientation && styles.placeholderText]}>
                {formData.sexualOrientation ? SEXUAL_ORIENTATION_OPTIONS.find(opt => opt.toLowerCase() === formData.sexualOrientation) || formData.sexualOrientation : 'Select orientation...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <IOSPickerModal
                visible={orientationModalVisible}
                onClose={() => setOrientationModalVisible(false)}
                onSelect={(value) => handleChange('sexualOrientation', value)}
                selectedValue={formData.sexualOrientation}
                title="Sexual Orientation"
                options={[
                  { label: 'Select orientation...', value: '' },
                  ...SEXUAL_ORIENTATION_OPTIONS.map(opt => ({ label: opt, value: opt.toLowerCase() }))
                ]}
              />
            ) : (
              <AndroidPickerModal
                visible={orientationModalVisible}
                onClose={() => setOrientationModalVisible(false)}
                onSelect={(value) => handleChange('sexualOrientation', value)}
                selectedValue={formData.sexualOrientation}
                title="Sexual Orientation"
                options={[
                  { label: 'Select orientation...', value: '' },
                  ...SEXUAL_ORIENTATION_OPTIONS.map(opt => ({ label: opt, value: opt.toLowerCase() }))
                ]}
              />
            )}
            {errors.sexualOrientation && (
              <Text style={styles.errorText}>{errors.sexualOrientation}</Text>
            )}
          </View>

          {/* Education */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Education</Text>
            <TouchableOpacity
              testID="education-picker"
              style={styles.input}
              onPress={() => setEduModalVisible(true)}
            >
              <Text style={[styles.inputText, !formData.edu && styles.placeholderText]}>
                {formData.edu || 'Select education...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <IOSPickerModal
                visible={eduModalVisible}
                onClose={() => setEduModalVisible(false)}
                onSelect={(value) => handleChange('edu', value)}
                selectedValue={formData.edu}
                title="Select Education"
                options={[
                  { label: 'Select education...', value: '' },
                  ...EDUCATION_OPTIONS.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            ) : (
              <AndroidPickerModal
                visible={eduModalVisible}
                onClose={() => setEduModalVisible(false)}
                onSelect={(value) => handleChange('edu', value)}
                selectedValue={formData.edu}
                title="Select Education"
                options={[
                  { label: 'Select education...', value: '' },
                  ...EDUCATION_OPTIONS.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            )}
          </View>

          {/* Drinking */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Drinking</Text>
            <TouchableOpacity
              testID="drinking-picker"
              style={styles.input}
              onPress={() => setDrinkingModalVisible(true)}
            >
              <Text style={[styles.inputText, !formData.drinking && styles.placeholderText]}>
                {formData.drinking || 'Select frequency...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <IOSPickerModal
                visible={drinkingModalVisible}
                onClose={() => setDrinkingModalVisible(false)}
                onSelect={(value) => handleChange('drinking', value)}
                selectedValue={formData.drinking}
                title="Drinking Frequency"
                options={[
                  { label: 'Select frequency...', value: '' },
                  ...FREQUENCY.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            ) : (
              <AndroidPickerModal
                visible={drinkingModalVisible}
                onClose={() => setDrinkingModalVisible(false)}
                onSelect={(value) => handleChange('drinking', value)}
                selectedValue={formData.drinking}
                title="Drinking Frequency"
                options={[
                  { label: 'Select frequency...', value: '' },
                  ...FREQUENCY.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            )}
          </View>

          {/* Smoking */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Smoking</Text>
            <TouchableOpacity
              testID="smoking-picker"
              style={styles.input}
              onPress={() => setSmokingModalVisible(true)}
            >
              <Text style={[styles.inputText, !formData.smoking && styles.placeholderText]}>
                {formData.smoking || 'Select frequency...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <IOSPickerModal
                visible={smokingModalVisible}
                onClose={() => setSmokingModalVisible(false)}
                onSelect={(value) => handleChange('smoking', value)}
                selectedValue={formData.smoking}
                title="Smoking Frequency"
                options={[
                  { label: 'Select frequency...', value: '' },
                  ...FREQUENCY.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            ) : (
              <AndroidPickerModal
                visible={smokingModalVisible}
                onClose={() => setSmokingModalVisible(false)}
                onSelect={(value) => handleChange('smoking', value)}
                selectedValue={formData.smoking}
                title="Smoking Frequency"
                options={[
                  { label: 'Select frequency...', value: '' },
                  ...FREQUENCY.map(opt => ({ label: opt, value: opt }))
                ]}
              />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  sectionNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#f44336',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...(Platform.OS === 'ios' && {
      height: 50,
      justifyContent: 'center',
    }),
  },
  picker: {
    height: Platform.OS === 'ios' ? 50 : 50,
    color: '#000000',
    width: '100%',
    ...(Platform.OS === 'android' && {
      backgroundColor: '#FFFFFF',
    }),
  },
  pickerItem: {
    fontSize: 16,
    height: 50,
    color: '#333',
  },
  // iOS Picker Modal styles
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalBackdrop: {
    flex: 1,
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#F8F9FA',
  },
  pickerModalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  pickerModalDone: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  pickerModalPicker: {
    width: '100%',
    height: 216,
    backgroundColor: '#FFFFFF',
  },
  pickerModalItem: {
    fontSize: 20,
    height: 216,
    color: '#000000',
  },
  // Date Picker Modal styles (iOS)
  datePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#F8F9FA',
  },
  datePickerCancelButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  datePickerDoneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
});
