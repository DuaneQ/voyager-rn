import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ContactDiscoveryBanner } from '../../components/contacts/ContactDiscoveryBanner';

describe('ContactDiscoveryBanner', () => {
  describe('Banner Text', () => {
    it('displays "Find friends" text before sync', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={false}
          matchCount={0}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('Find friends on TravalPass')).toBeDefined();
    });
    
    it('displays "Invite friends" text when synced with 0 matches', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={0}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('Invite friends to join')).toBeDefined();
    });
    
    it('displays singular contact count for 1 match', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={1}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('1 contact is on TravalPass')).toBeDefined();
    });
    
    it('displays plural contact count for 2-5 matches', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={3}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('3 contacts are on TravalPass')).toBeDefined();
    });
    
    it('displays "X+ friends found" for more than 5 matches', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={12}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('12+ friends on TravalPass!')).toBeDefined();
    });
    
    it('displays "X+ friends found" for exactly 6 matches', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={6}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('6+ friends on TravalPass!')).toBeDefined();
    });
  });
  
  describe('Button Text', () => {
    it('displays "Discover" button before sync', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={false}
          matchCount={0}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('Discover')).toBeDefined();
    });
    
    it('displays "Invite" button when synced with 0 matches', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={0}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('Invite')).toBeDefined();
    });
    
    it('displays "View Them" button when synced with matches', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={true}
          matchCount={3}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('View Them')).toBeDefined();
    });
  });
  
  describe('Interaction', () => {
    it('calls onPress when banner is tapped', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={false}
          matchCount={0}
          onPress={mockOnPress}
        />
      );
      
      fireEvent.press(getByText('Find friends on TravalPass'));
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
    
    it('calls onPress when button text is tapped', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={false}
          matchCount={0}
          onPress={mockOnPress}
        />
      );
      
      fireEvent.press(getByText('Discover'));
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Visual Elements', () => {
    it('renders the people emoji icon', () => {
      const { getByText } = render(
        <ContactDiscoveryBanner
          hasSynced={false}
          matchCount={0}
          onPress={jest.fn()}
        />
      );
      
      expect(getByText('👥')).toBeDefined();
    });
  });
});
