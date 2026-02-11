import React from 'react';
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
});
