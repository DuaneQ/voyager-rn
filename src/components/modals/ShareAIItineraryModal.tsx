/**
 * Share AI Itinerary Modal - React Native
 * Matches PWA ShareAIItineraryModal functionality exactly
 * Allows users to share AI-generated itineraries via link
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';

interface ShareAIItineraryModalProps {
  visible: boolean;
  onClose: () => void;
  itinerary: AIGeneratedItinerary;
}

export const ShareAIItineraryModal: React.FC<ShareAIItineraryModalProps> = ({
  visible,
  onClose,
  itinerary
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate shareable URL - matching PWA logic exactly
  const cloudFunctionDevBase = 'https://us-central1-mundo1-dev.cloudfunctions.net/itineraryShare';
  const productionHost = 'travalpass.com';
  
  // Use production origin only when explicitly on production domain
  // Otherwise default to dev cloud function share endpoint
  const baseUrl = cloudFunctionDevBase; // RN always uses cloud function endpoint
  const shareUrl = `${baseUrl.replace(/\/$/, '')}/share-itinerary/${itinerary.id}`;
  
  // Generate share text - matching PWA exactly
  const destination = itinerary.response?.data?.itinerary?.destination || itinerary.destination;
  const startDate = itinerary.response?.data?.itinerary?.startDate || itinerary.startDate;
  const endDate = itinerary.response?.data?.itinerary?.endDate || itinerary.endDate;
  
  const formatShareDate = (dateString: string) => {
    if (!dateString) return '';
    // Avoid timezone shifts for date-only strings by forcing midday (noon) UTC
    const dateInput = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const shareTitle = `My AI Travel Itinerary: ${destination}`;
  const shareText = `Check out my AI-generated travel itinerary for ${destination} (${formatShareDate(startDate)} - ${formatShareDate(endDate)})! 🌍✈️`;

  // Extract filtering terms (if present) - matching PWA
  const filtering = (itinerary.response?.data?.metadata as any)?.filtering || {};
  const userMustInclude = Array.isArray(filtering.userMustInclude) ? filtering.userMustInclude : [];
  const userMustAvoid = Array.isArray(filtering.userMustAvoid) ? filtering.userMustAvoid : [];

  const extractLabel = (term: any) => {
    if (!term && term !== 0) return '';
    if (typeof term === 'string') return term;
    if (typeof term === 'object') return term.name || term.term || term.value || term.label || JSON.stringify(term);
    return String(term);
  };

  const includePreviewText = userMustInclude.length > 0 ? ` Includes: ${userMustInclude.slice(0,3).map(extractLabel).join(', ')}${userMustInclude.length > 3 ? ` +${userMustInclude.length - 3} more` : ''}.` : '';
  const avoidPreviewText = userMustAvoid.length > 0 ? ` Avoids: ${userMustAvoid.slice(0,3).map(extractLabel).join(', ')}${userMustAvoid.length > 3 ? ` +${userMustAvoid.length - 3} more` : ''}.` : '';

  const shareTextWithFilters = `${shareText}${includePreviewText}${avoidPreviewText}`;

  const handleCopyLink = async () => {
    try {
      Clipboard.setString(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  const handleNativeShare = async () => {
    try {
      const result = await Share.share({
        title: shareTitle,
        message: `${shareTextWithFilters}\n\n${shareUrl}`,
        url: shareUrl, // iOS only
      });

      if (result.action === Share.sharedAction) {
        // Successfully shared
      }
    } catch (error) {
      // Fallback to copy if share fails
      handleCopyLink();
    }
  };

  // Format itinerary description for preview
  const itineraryDescription = itinerary.response?.data?.itinerary?.description || '';
  const truncatedDescription = itineraryDescription.length > 100 
    ? `"${itineraryDescription.substring(0, 97)}..."` 
    : `"${itineraryDescription}"`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="share-outline" size={24} color="#fff" />
              <Text style={styles.headerTitle}>Share Itinerary</Text>
            </View>
            <TouchableOpacity 
              testID="close-button"
              onPress={onClose} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.preview}>
            <Text style={styles.previewDestination}>{destination}</Text>
            <Text style={styles.previewDates}>
              {formatShareDate(startDate)} - {formatShareDate(endDate)}
            </Text>
            {truncatedDescription && (
              <Text style={styles.previewDescription}>{truncatedDescription}</Text>
            )}
          </View>

          {/* Share URL */}
          <View style={styles.urlContainer}>
            <Text style={styles.label}>Share Link</Text>
            <View style={styles.urlInputContainer}>
              <TextInput
                testID="share-url-input"
                style={styles.urlInput}
                value={shareUrl}
                editable={false}
                selectTextOnFocus={true}
              />
              <TouchableOpacity 
                testID="copy-button"
                onPress={handleCopyLink} 
                style={styles.copyButton}
              >
                <Ionicons 
                  name={copySuccess ? "checkmark-circle" : "copy-outline"} 
                  size={20} 
                  color={copySuccess ? "#4caf50" : "#fff"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Alert */}
          <View style={styles.infoAlert}>
            <Ionicons name="information-circle-outline" size={20} color="#2196f3" />
            <Text style={styles.infoText}>
              Anyone with this link can view your itinerary. No login required!
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              testID="close-action-button"
              onPress={onClose} 
              style={styles.closeActionButton}
            >
              <Text style={styles.closeActionText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              testID="share-button"
              onPress={handleNativeShare} 
              style={styles.shareButton}
            >
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Copy Success Message */}
          {copySuccess && (
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
              <Text style={styles.successText}>Link copied to clipboard!</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    maxWidth: 500,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  preview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 16,
  },
  previewDestination: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewDates: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  previewDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  urlContainer: {
    marginBottom: 16,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  urlInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    padding: 12,
  },
  copyButton: {
    padding: 12,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  closeActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeActionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    gap: 8,
  },
  successText: {
    color: '#4caf50',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ShareAIItineraryModal;
