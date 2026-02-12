import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { InviteContactCard, ContactToInvite } from '../../components/contacts/InviteContactCard';

describe('InviteContactCard', () => {
  const mockEmailContact: ContactToInvite = {
    id: 'contact1',
    name: 'Alex Smith',
    contactInfo: 'alex.smith@email.com',
    type: 'email',
    hash: 'hash123',
  };

  const mockPhoneContact: ContactToInvite = {
    id: 'contact2',
    name: 'Jamie Lee',
    contactInfo: '+1 (555) 123-4567',
    type: 'phone',
    hash: 'hash456',
  };

  const mockOnInvite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders contact name', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockEmailContact} onInvite={mockOnInvite} />
      );

      expect(getByText('Alex Smith')).toBeDefined();
    });

    it('renders contact info', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockEmailContact} onInvite={mockOnInvite} />
      );

      expect(getByText('alex.smith@email.com')).toBeDefined();
    });

    it('renders email icon for email contacts', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockEmailContact} onInvite={mockOnInvite} />
      );

      expect(getByText('📧')).toBeDefined();
    });

    it('renders phone icon for phone contacts', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockPhoneContact} onInvite={mockOnInvite} />
      );

      expect(getByText('💬')).toBeDefined();
    });

    it('renders send icon when not inviting', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockEmailContact} onInvite={mockOnInvite} />
      );

      expect(getByText('📤')).toBeDefined();
    });

    it('renders hourglass icon when inviting', () => {
      const { getByText } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isInviting={true}
        />
      );

      expect(getByText('⏳')).toBeDefined();
    });
  });

  describe('Interaction', () => {
    it('calls onInvite with contact when button pressed', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockEmailContact} onInvite={mockOnInvite} />
      );

      fireEvent.press(getByText('📤'));

      expect(mockOnInvite).toHaveBeenCalledTimes(1);
      expect(mockOnInvite).toHaveBeenCalledWith(mockEmailContact);
    });

    it('does not call onInvite when isInviting is true', () => {
      const { getByText } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isInviting={true}
        />
      );

      fireEvent.press(getByText('⏳'));

      expect(mockOnInvite).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Select Checkbox', () => {
    const mockOnToggleSelect = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders checkbox when onToggleSelect is provided', () => {
      const { getByText } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          onToggleSelect={mockOnToggleSelect}
          isSelected={false}
        />
      );

      // Card should render with checkbox (unselected state)
      expect(getByText('Alex Smith')).toBeDefined();
    });

    it('does not render checkbox when onToggleSelect is not provided', () => {
      const { getByText } = render(
        <InviteContactCard contact={mockEmailContact} onInvite={mockOnInvite} />
      );

      // Should still render the card normally
      expect(getByText('Alex Smith')).toBeDefined();
      expect(getByText('📤')).toBeDefined();
    });

    it('shows unchecked state when isSelected is false', () => {
      const { getByText } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isSelected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      // Check mark should not be present
      expect(() => getByText('✓')).toThrow();
    });

    it('shows checked state when isSelected is true', () => {
      const { getByText } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isSelected={true}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      // Check mark should be present
      expect(getByText('✓')).toBeDefined();
    });

    it('calls onToggleSelect when checkbox is pressed', () => {
      const { UNSAFE_getAllByType } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isSelected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      // Get all TouchableOpacity components - first one is checkbox, second is invite button
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      
      // Press the first touchable (checkbox)
      fireEvent.press(touchables[0]);

      expect(mockOnToggleSelect).toHaveBeenCalledTimes(1);
      expect(mockOnToggleSelect).toHaveBeenCalledWith(mockEmailContact);
    });

    it('toggles selection state', () => {
      const { rerender, getByText, queryByText } = render(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isSelected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      // Initially unchecked - no checkmark
      expect(() => getByText('✓')).toThrow();

      // Rerender with selected state
      rerender(
        <InviteContactCard
          contact={mockEmailContact}
          onInvite={mockOnInvite}
          isSelected={true}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      // Now checkmark should be visible
      expect(getByText('✓')).toBeDefined();
    });
  });
});
