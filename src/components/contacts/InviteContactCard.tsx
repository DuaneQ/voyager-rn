import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export interface ContactToInvite {
  id: string;
  name: string;
  contactInfo: string;
  type: 'email' | 'phone';
  hash: string;
}

export interface InviteContactCardProps {
  contact: ContactToInvite;
  onInvite: (contact: ContactToInvite) => void;
  isInviting?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (contact: ContactToInvite) => void;
}

export const InviteContactCard: React.FC<InviteContactCardProps> = ({
  contact,
  onInvite,
  isInviting = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const getIcon = () => {
    return contact.type === 'email' ? '📧' : '💬';
  };

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {/* Checkbox */}
      {onToggleSelect && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onToggleSelect(contact)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]}>
            {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
        </TouchableOpacity>
      )}
      
      <View style={styles.leftSection}>
        {/* Icon */}
        <Text style={styles.icon}>{getIcon()}</Text>
        
        {/* Contact Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.name}
          </Text>
          <Text style={styles.contactInfo} numberOfLines={1}>
            {contact.contactInfo}
          </Text>
        </View>
      </View>
      
      {/* Invite Button */}
      <TouchableOpacity
        style={[styles.button, isInviting && styles.buttonDisabled]}
        onPress={() => onInvite(contact)}
        disabled={isInviting}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonIcon}>
          {isInviting ? '⏳' : '📤'}
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
  cardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contactInfo: {
    fontSize: 13,
    color: '#666666',
  },
  button: {
    width: 32,
    height: 32,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  buttonIcon: {
    fontSize: 16,
  },
});
