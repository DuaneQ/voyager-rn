/**
 * FeedbackButton - Small vertical "Feedback" button for mobile
 * 
 * Positioned on the right side of the screen, vertical tab style.
 * Opens FeedbackModal when pressed.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { FeedbackModal } from '../modals/FeedbackModal';

interface FeedbackButtonProps {
  initialType?: 'bug' | 'feature' | 'improvement' | 'general';
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  initialType,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>F</Text>
        <Text style={styles.buttonText}>e</Text>
        <Text style={styles.buttonText}>e</Text>
        <Text style={styles.buttonText}>d</Text>
        <Text style={styles.buttonText}>b</Text>
        <Text style={styles.buttonText}>a</Text>
        <Text style={styles.buttonText}>c</Text>
        <Text style={styles.buttonText}>k</Text>
      </TouchableOpacity>

      <FeedbackModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        initialType={initialType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 0,
    bottom: 140,
    zIndex: 1000,
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    // Stack letters vertically
    flexDirection: 'column',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
  },
});

export default FeedbackButton;
