/**
 * ReportVideoModal Component
 * 
 * @module components/modals/ReportVideoModal
 * @description Modal for reporting objectionable video content. Reuses the same
 * violations collection and reporting pattern as user reports, with videoId added.
 * 
 * Features:
 * - Dropdown selection for violation reason
 * - Text input for additional description
 * - Submits to Firestore violations collection
 * - Triggers existing email notification Cloud Function
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Video } from '../../types/Video';

interface ReportVideoModalProps {
  visible: boolean;
  onClose: () => void;
  video: Video;
  reporterId: string;
}

const REPORT_REASONS = [
  { value: '', label: 'Select a reason' },
  { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'nudity_sexual_content', label: 'Nudity or Sexual Content' },
  { value: 'violence', label: 'Violence or Dangerous Content' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'spam', label: 'Spam or Misleading' },
  { value: 'offensive_content', label: 'Offensive Content' },
  { value: 'other', label: 'Other' },
];

export const ReportVideoModal: React.FC<ReportVideoModalProps> = ({
  visible,
  onClose,
  video,
  reporterId,
}) => {
  const [reason, setReason] = useState('');
  const [reasonLabel, setReasonLabel] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Required', 'Please select a reason for your report');
      return;
    }

    if (!reporterId || !video.userId) {
      Alert.alert('Error', 'Unable to submit report: Missing user information');
      return;
    }

    setSubmitting(true);

    try {
      const db = getFirestore();
      const violationsRef = collection(db, 'violations');
      const violationData = {
        reportedUserId: video.userId,
        reportedByUserId: reporterId,
        videoId: video.id,
        reason: reason,
        description: description.trim(),
        timestamp: serverTimestamp(),
        status: 'pending',
        videoDetails: {
          title: video.title || 'Untitled',
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
        },
      };

      await addDoc(violationsRef, violationData);

      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this content. Our team will review it within 24 hours.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Error reporting video:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setReasonLabel('');
    setDescription('');
    setSubmitting(false);
    setShowReasonPicker(false);
    onClose();
  };

  const handleReasonSelect = (value: string, label: string) => {
    setReason(value);
    setReasonLabel(label);
    setShowReasonPicker(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!showReasonPicker ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Report Video</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content}>
                <Text style={styles.description}>
                  Please tell us why you are reporting this video. Your report will be
                  reviewed by our team within 24 hours.
                </Text>

                {/* Video Info */}
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>
                    {video.title || 'Untitled Video'}
                  </Text>
                  {video.description && (
                    <Text style={styles.videoDescription} numberOfLines={2}>
                      {video.description}
                    </Text>
                  )}
                </View>

                {/* Reason Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Reason for Report *</Text>
                  <TouchableOpacity
                    style={styles.reasonSelector}
                    onPress={() => {
                      setShowReasonPicker(true);
                    }}
                    disabled={submitting}
                  >
                    <Text style={[styles.reasonSelectorText, !reasonLabel && styles.placeholderText]}>
                      {reasonLabel || 'Select a reason'}
                    </Text>
                    <Text style={styles.chevron}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Description Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Additional Details</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Please provide any additional information about the issue"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!submitting}
                  />
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="submit-report-button"
                  style={[
                    styles.button,
                    styles.submitButton,
                    (!reason || submitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!reason || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Reason Picker View */}
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Reason</Text>
                <TouchableOpacity onPress={() => setShowReasonPicker(false)}>
                  <Text style={styles.pickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={REPORT_REASONS.filter(r => r.value !== '')}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    testID={`picker-item-${item.value}`}
                    style={[
                      styles.reasonOption,
                      reason === item.value && styles.reasonOptionSelected,
                    ]}
                    onPress={() => handleReasonSelect(item.value, item.label)}
                  >
                    <Text style={[
                      styles.reasonOptionText,
                      reason === item.value && styles.reasonOptionTextSelected,
                    ]}>
                      {item.label}
                    </Text>
                    {reason === item.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>
      </View>
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
    maxHeight: '85%',
    marginBottom: '15%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  videoInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  reasonSelectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  chevron: {
    fontSize: 12,
    color: '#666',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ed6c02',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Reason Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerClose: {
    fontSize: 24,
    color: '#666',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reasonOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  reasonOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  reasonOptionTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#1976d2',
    fontWeight: 'bold',
  },
});
