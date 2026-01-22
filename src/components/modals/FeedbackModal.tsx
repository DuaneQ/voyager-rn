/**
 * FeedbackModal - React Native implementation for beta feedback collection
 * 
 * Saves feedback to the same Firestore 'feedback' collection as the PWA.
 * Collects device-specific info for React Native (OS, device model, app version).
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { collection, addDoc, getFirestore } from 'firebase/firestore';
import { app, getAuthInstance } from '../../config/firebaseConfig';

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'general' | '';
type SeverityType = 'low' | 'medium' | 'high' | 'critical' | '';

interface FeedbackData {
  type: FeedbackType;
  severity: SeverityType;
  rating: number;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  includeContactInfo: boolean;
  contactEmail: string;
}

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: FeedbackType;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: 'bug' },
  { value: 'feature', label: 'Feature Request', icon: 'bulb' },
  { value: 'improvement', label: 'Improvement', icon: 'trending-up' },
  { value: 'general', label: 'General Feedback', icon: 'chatbubble' },
];

const SEVERITY_LEVELS: { value: SeverityType; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'critical', label: 'Critical', color: '#9c27b0' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  initialType = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FeedbackData>({
    type: initialType,
    severity: '',
    rating: 0,
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    includeContactInfo: false,
    contactEmail: '',
  });

  const resetForm = () => {
    setFormData({
      type: '',
      severity: '',
      rating: 0,
      title: '',
      description: '',
      stepsToReproduce: '',
      expectedBehavior: '',
      actualBehavior: '',
      includeContactInfo: false,
      contactEmail: '',
    });
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setTimeout(resetForm, 300);
    }
  };

  const getDeviceInfo = () => ({
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    appVersion: Constants.expoConfig?.version || '1.0.0',
    buildVersion: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || 'unknown',
    screenWidth: Dimensions.get('window').width,
    screenHeight: Dimensions.get('window').height,
    timestamp: new Date().toISOString(),
  });

  const handleSubmit = async () => {
    if (!formData.type || !formData.title || !formData.description) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    if (formData.includeContactInfo && !formData.contactEmail) {
      setSubmitError('Please provide your email address for follow-up');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const db = getFirestore(app);
      const auth = getAuthInstance();
      const userId = auth?.currentUser?.uid || 'anonymous';

      const feedbackDoc: Record<string, any> = {
        userId,
        userEmail: formData.includeContactInfo ? formData.contactEmail.trim() : null,
        type: formData.type,
        severity: formData.severity || null,
        rating: formData.rating > 0 ? formData.rating : null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        stepsToReproduce: formData.stepsToReproduce ? formData.stepsToReproduce.trim() : null,
        expectedBehavior: formData.expectedBehavior ? formData.expectedBehavior.trim() : null,
        actualBehavior: formData.actualBehavior ? formData.actualBehavior.trim() : null,
        deviceInfo: getDeviceInfo(),
        status: 'new',
        priority: formData.severity === 'critical' ? 'urgent' :
                  formData.severity === 'high' ? 'high' : 'normal',
        createdAt: new Date(),
        source: 'mobile-app',
        version: Constants.expoConfig?.version || '1.0.0',
      };

      // Remove any undefined fields
      Object.keys(feedbackDoc).forEach(
        (k) => feedbackDoc[k] === undefined && delete feedbackDoc[k]
      );

      await addDoc(collection(db, 'feedback'), feedbackDoc);
      setSubmitSuccess(true);
      setTimeout(handleClose, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBugReport = formData.type === 'bug';

  const renderStarRating = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.label}>Overall Experience</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setFormData({ ...formData, rating: star })}
          >
            <Ionicons
              name={star <= formData.rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= formData.rating ? '#ffc107' : '#ccc'}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (submitSuccess) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#4caf50" />
            <Text style={styles.successTitle}>Feedback Submitted! 🎉</Text>
            <Text style={styles.successText}>
              Thank you for helping us improve TravalPass. We'll review your feedback and may reach out if you provided contact information.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Share Your Feedback</Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Error message */}
            {submitError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            )}

            {/* Feedback Type */}
            <Text style={styles.label}>Feedback Type *</Text>
            <View style={styles.typeGrid}>
              {FEEDBACK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    formData.type === type.value && styles.typeButtonSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, type: type.value })}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={formData.type === type.value ? '#fff' : '#1976d2'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === type.value && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Severity (for bugs) */}
            {isBugReport && (
              <>
                <Text style={styles.label}>Severity</Text>
                <View style={styles.severityRow}>
                  {SEVERITY_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.severityButton,
                        formData.severity === level.value && {
                          backgroundColor: level.color,
                          borderColor: level.color,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, severity: level.value })}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          formData.severity === level.value && styles.severityTextSelected,
                        ]}
                      >
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Star Rating */}
            {renderStarRating()}

            {/* Title */}
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Brief summary of your feedback"
              placeholderTextColor="#999"
              maxLength={100}
            />

            {/* Description */}
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Please provide details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Bug-specific fields */}
            {isBugReport && (
              <>
                <Text style={styles.label}>Steps to Reproduce</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.stepsToReproduce}
                  onChangeText={(text) => setFormData({ ...formData, stepsToReproduce: text })}
                  placeholder="1. Go to...\n2. Click on...\n3. See error"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>Expected Behavior</Text>
                <TextInput
                  style={styles.input}
                  value={formData.expectedBehavior}
                  onChangeText={(text) => setFormData({ ...formData, expectedBehavior: text })}
                  placeholder="What should have happened?"
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>Actual Behavior</Text>
                <TextInput
                  style={styles.input}
                  value={formData.actualBehavior}
                  onChangeText={(text) => setFormData({ ...formData, actualBehavior: text })}
                  placeholder="What actually happened?"
                  placeholderTextColor="#999"
                />
              </>
            )}

            {/* Contact Info Toggle */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, includeContactInfo: !formData.includeContactInfo })}
            >
              <Ionicons
                name={formData.includeContactInfo ? 'checkbox' : 'square-outline'}
                size={24}
                color="#1976d2"
              />
              <Text style={styles.checkboxLabel}>I'd like to be contacted about this feedback</Text>
            </TouchableOpacity>

            {formData.includeContactInfo && (
              <TextInput
                style={styles.input}
                value={formData.contactEmail}
                onChangeText={(text) => setFormData({ ...formData, contactEmail: text })}
                placeholder="your@email.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  textArea: {
    minHeight: 100,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#1976d2',
  },
  typeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  severityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  severityTextSelected: {
    color: '#fff',
  },
  ratingContainer: {
    marginTop: 16,
  },
  starsRow: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FeedbackModal;
