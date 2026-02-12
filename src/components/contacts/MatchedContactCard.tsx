import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MatchedContact } from '../../services/contacts/types';

export interface MatchedContactCardProps {
  contact: MatchedContact;
  onConnect: (userId: string) => void;
  isConnecting?: boolean;
}

export const MatchedContactCard: React.FC<MatchedContactCardProps> = ({
  contact,
  onConnect,
  isConnecting = false,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        {/* Profile Photo */}
        {contact.profilePhotoUrl ? (
          <Image
            source={{ uri: contact.profilePhotoUrl }}
            style={styles.photo}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>
              {contact.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Contact Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.displayName}
          </Text>
          {contact.username && (
            <Text style={styles.username} numberOfLines={1}>
              @{contact.username}
            </Text>
          )}
        </View>
      </View>
      
      {/* Connect Button */}
      <TouchableOpacity
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={() => onConnect(contact.userId)}
        disabled={isConnecting}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Shadow for Android
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  photoPlaceholder: {
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666666',
  },
  button: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
