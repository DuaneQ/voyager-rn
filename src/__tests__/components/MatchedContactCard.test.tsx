import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MatchedContactCard } from '../../components/contacts/MatchedContactCard';
import { MatchedContact } from '../../services/contacts/types';

describe('MatchedContactCard', () => {
  const mockContact: MatchedContact = {
    userId: 'user123',
    displayName: 'Sarah Johnson',
    username: 'sarahjay',
    profilePhotoUrl: 'https://example.com/photo.jpg',
  };

  const mockOnConnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders contact name', () => {
      const { getByText } = render(
        <MatchedContactCard contact={mockContact} onConnect={mockOnConnect} />
      );

      expect(getByText('Sarah Johnson')).toBeDefined();
    });

    it('renders username with @ prefix', () => {
      const { getByText } = render(
        <MatchedContactCard contact={mockContact} onConnect={mockOnConnect} />
      );

      expect(getByText('@sarahjay')).toBeDefined();
    });

    it('does not render username if not provided', () => {
      const contactWithoutUsername = { ...mockContact, username: undefined };
      const { queryByText } = render(
        <MatchedContactCard contact={contactWithoutUsername} onConnect={mockOnConnect} />
      );

      expect(queryByText(/@/)).toBeNull();
    });

    it('renders Connect button by default', () => {
      const { getByText } = render(
        <MatchedContactCard contact={mockContact} onConnect={mockOnConnect} />
      );

      expect(getByText('Connect')).toBeDefined();
    });

    it('renders Connecting... when isConnecting is true', () => {
      const { getByText } = render(
        <MatchedContactCard
          contact={mockContact}
          onConnect={mockOnConnect}
          isConnecting={true}
        />
      );

      expect(getByText('Connecting...')).toBeDefined();
    });

    it('renders profile photo when URL provided', () => {
      const { UNSAFE_getByType } = render(
        <MatchedContactCard contact={mockContact} onConnect={mockOnConnect} />
      );

      const image = UNSAFE_getByType(require('react-native').Image);
      expect(image.props.source.uri).toBe('https://example.com/photo.jpg');
    });

    it('renders placeholder with first initial when no photo URL', () => {
      const contactWithoutPhoto = { ...mockContact, profilePhotoUrl: undefined };
      const { getByText } = render(
        <MatchedContactCard contact={contactWithoutPhoto} onConnect={mockOnConnect} />
      );

      expect(getByText('S')).toBeDefined();
    });
  });

  describe('Interaction', () => {
    it('calls onConnect with userId when button pressed', () => {
      const { getByText } = render(
        <MatchedContactCard contact={mockContact} onConnect={mockOnConnect} />
      );

      fireEvent.press(getByText('Connect'));

      expect(mockOnConnect).toHaveBeenCalledTimes(1);
      expect(mockOnConnect).toHaveBeenCalledWith('user123');
    });

    it('does not call onConnect when isConnecting is true', () => {
      const { getByText } = render(
        <MatchedContactCard
          contact={mockContact}
          onConnect={mockOnConnect}
          isConnecting={true}
        />
      );

      fireEvent.press(getByText('Connecting...'));

      expect(mockOnConnect).not.toHaveBeenCalled();
    });
  });
});
