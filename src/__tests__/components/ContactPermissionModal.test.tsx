import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ContactPermissionModal } from '../../components/contacts/ContactPermissionModal';

describe('ContactPermissionModal', () => {
  const mockOnAllowAccess = jest.fn();
  const mockOnDismiss = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Visibility', () => {
    it('renders when visible is true', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(getByText('Find Friends on TravalPass')).toBeDefined();
    });
    
    it('does not render when visible is false', () => {
      const { queryByText } = render(
        <ContactPermissionModal
          visible={false}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(queryByText('Find Friends on TravalPass')).toBeNull();
    });
  });
  
  describe('Content', () => {
    it('displays the icon', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(getByText('👥')).toBeDefined();
    });
    
    it('displays the title', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(getByText('Find Friends on TravalPass')).toBeDefined();
    });
    
    it('displays the description', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(
        getByText(/Discover which of your contacts are already using TravalPass/i)
      ).toBeDefined();
    });
    
    it('displays all privacy points', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(getByText('Your contacts stay private')).toBeDefined();
      expect(getByText('We never share your contacts')).toBeDefined();
      expect(getByText('You control who you invite')).toBeDefined();
    });
    
    it('displays privacy checkmarks', () => {
      const { getAllByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      const checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBe(3);
    });
  });
  
  describe('Buttons', () => {
    it('displays primary button with correct text', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(getByText('Allow Contact Access')).toBeDefined();
    });
    
    it('displays secondary button with correct text', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      expect(getByText('Not Now')).toBeDefined();
    });
  });
  
  describe('Interactions', () => {
    it('calls onAllowAccess when primary button is pressed', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      fireEvent.press(getByText('Allow Contact Access'));
      
      expect(mockOnAllowAccess).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
    
    it('calls onDismiss when secondary button is pressed', () => {
      const { getByText } = render(
        <ContactPermissionModal
          visible={true}
          onAllowAccess={mockOnAllowAccess}
          onDismiss={mockOnDismiss}
        />
      );
      
      fireEvent.press(getByText('Not Now'));
      
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnAllowAccess).not.toHaveBeenCalled();
    });
  });
});
