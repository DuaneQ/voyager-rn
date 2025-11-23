/**
 * Unit Tests for ChatHeaderAvatars
 * Tests participant avatar display with overflow handling
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatHeaderAvatars } from '../../../components/chat/ChatHeaderAvatars';

describe('ChatHeaderAvatars', () => {
  const mockParticipants = [
    {
      uid: 'user-1',
      username: 'Alice',
      photoURL: 'https://example.com/alice.jpg',
    },
    {
      uid: 'user-2',
      username: 'Bob',
      photoURL: 'https://example.com/bob.jpg',
    },
    {
      uid: 'user-3',
      username: 'Charlie',
      photoURL: undefined,
    },
    {
      uid: 'user-4',
      username: 'Diana',
      photoURL: 'https://example.com/diana.jpg',
    },
    {
      uid: 'user-5',
      username: 'Eve',
      photoURL: 'https://example.com/eve.jpg',
    },
  ];

  const defaultProps = {
    participants: mockParticipants,
    currentUserId: 'current-user',
    maxVisible: 4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render participant avatars', () => {
      const { getByLabelText } = render(<ChatHeaderAvatars {...defaultProps} />);

      expect(getByLabelText('Open profile: Alice')).toBeTruthy();
      expect(getByLabelText('Open profile: Bob')).toBeTruthy();
      expect(getByLabelText('Open profile: Charlie')).toBeTruthy();
      expect(getByLabelText('Open profile: Diana')).toBeTruthy();
    });

    it('should display initials for participants without photos', () => {
      const { getByText } = render(<ChatHeaderAvatars {...defaultProps} />);

      expect(getByText('C')).toBeTruthy(); // Charlie's initial
    });

    it('should show overflow chip when more than maxVisible participants', () => {
      const { getByText } = render(<ChatHeaderAvatars {...defaultProps} />);

      expect(getByText('+1')).toBeTruthy(); // 5 participants, maxVisible=4, so +1
    });

    it('should not show overflow chip when participants <= maxVisible', () => {
      const { queryByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={mockParticipants.slice(0, 3)}
        />
      );

      expect(queryByText(/^\+\d+$/)).toBeNull();
    });

    it('should filter out current user from display', () => {
      const participantsWithCurrentUser = [
        ...mockParticipants,
        {
          uid: 'current-user',
          username: 'CurrentUser',
          photoURL: 'https://example.com/current.jpg',
        },
      ];

      const { queryByLabelText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={participantsWithCurrentUser}
        />
      );

      expect(queryByLabelText('Open profile: CurrentUser')).toBeNull();
    });

    it('should display correct accessibility label', () => {
      const { getByLabelText } = render(<ChatHeaderAvatars {...defaultProps} />);

      expect(getByLabelText('Chat with 5 participants')).toBeTruthy();
    });

    it('should use singular participant in accessibility label', () => {
      const { getByLabelText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={[mockParticipants[0]]}
        />
      );

      expect(getByLabelText('Chat with 1 participant')).toBeTruthy();
    });
  });

  describe('MaxVisible Configuration', () => {
    it('should respect custom maxVisible value', () => {
      const { getByText, queryByLabelText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          maxVisible={2}
        />
      );

      expect(getByText('+3')).toBeTruthy(); // 5 participants, maxVisible=2, so +3
      expect(queryByLabelText('Open profile: Charlie')).toBeNull(); // Should be hidden
    });

    it('should show all participants when maxVisible is greater than count', () => {
      const { queryByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={mockParticipants.slice(0, 2)}
          maxVisible={10}
        />
      );

      expect(queryByText(/^\+\d+$/)).toBeNull(); // No overflow chip
    });

    it('should default to 4 when maxVisible not provided', () => {
      const { getByText } = render(
        <ChatHeaderAvatars
          participants={mockParticipants}
          currentUserId="current-user"
        />
      );

      expect(getByText('+1')).toBeTruthy(); // Default maxVisible=4
    });
  });

  describe('Avatar Interactions', () => {
    it('should call onAvatarPress with participant when avatar is pressed', () => {
      const onAvatarPress = jest.fn();
      const { getByLabelText } = render(
        <ChatHeaderAvatars {...defaultProps} onAvatarPress={onAvatarPress} />
      );

      fireEvent.press(getByLabelText('Open profile: Alice'));

      expect(onAvatarPress).toHaveBeenCalledWith(mockParticipants[0]);
    });

    it('should handle multiple avatar presses', () => {
      const onAvatarPress = jest.fn();
      const { getByLabelText } = render(
        <ChatHeaderAvatars {...defaultProps} onAvatarPress={onAvatarPress} />
      );

      fireEvent.press(getByLabelText('Open profile: Alice'));
      fireEvent.press(getByLabelText('Open profile: Bob'));

      expect(onAvatarPress).toHaveBeenCalledTimes(2);
      expect(onAvatarPress).toHaveBeenNthCalledWith(1, mockParticipants[0]);
      expect(onAvatarPress).toHaveBeenNthCalledWith(2, mockParticipants[1]);
    });

    it('should not crash when onAvatarPress is not provided', () => {
      const { getByLabelText } = render(<ChatHeaderAvatars {...defaultProps} />);

      expect(() => {
        fireEvent.press(getByLabelText('Open profile: Alice'));
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty participants array', () => {
      const { getByLabelText } = render(
        <ChatHeaderAvatars {...defaultProps} participants={[]} />
      );

      expect(getByLabelText('Chat with 0 participants')).toBeTruthy();
    });

    it('should handle participants without usernames', () => {
      const participantsWithoutNames = [
        {
          uid: 'user-1',
          username: undefined,
          photoURL: undefined,
        },
      ];

      const { getByText, getByLabelText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={participantsWithoutNames}
        />
      );

      expect(getByText('U')).toBeTruthy(); // Default initial
      expect(getByLabelText('Open profile: Unknown')).toBeTruthy();
    });

    it('should handle participants with empty username', () => {
      const participantsWithEmptyName = [
        {
          uid: 'user-1',
          username: '',
          photoURL: undefined,
        },
      ];

      const { getByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={participantsWithEmptyName}
        />
      );

      expect(getByText('U')).toBeTruthy(); // Default initial
    });

    it('should handle only current user in participants', () => {
      const onlyCurrentUser = [
        {
          uid: 'current-user',
          username: 'CurrentUser',
          photoURL: 'https://example.com/current.jpg',
        },
      ];

      const { getByLabelText, queryByLabelText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={onlyCurrentUser}
        />
      );

      expect(getByLabelText('Chat with 0 participants')).toBeTruthy();
      expect(queryByLabelText('Open profile: CurrentUser')).toBeNull();
    });

    it('should handle uppercase initials for lowercase usernames', () => {
      const lowercaseParticipants = [
        {
          uid: 'user-1',
          username: 'alice',
          photoURL: undefined,
        },
      ];

      const { getByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={lowercaseParticipants}
        />
      );

      expect(getByText('A')).toBeTruthy(); // Uppercase initial
    });
  });

  describe('Overflow Calculation', () => {
    it('should calculate overflow correctly with exact maxVisible count', () => {
      const { queryByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={mockParticipants.slice(0, 4)}
          maxVisible={4}
        />
      );

      expect(queryByText(/^\+\d+$/)).toBeNull(); // No overflow
    });

    it('should show overflow chip with correct count', () => {
      const manyParticipants = [
        ...mockParticipants,
        { uid: 'user-6', username: 'Frank', photoURL: undefined },
        { uid: 'user-7', username: 'Grace', photoURL: undefined },
        { uid: 'user-8', username: 'Henry', photoURL: undefined },
      ];

      const { getByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={manyParticipants}
          maxVisible={3}
        />
      );

      expect(getByText('+5')).toBeTruthy(); // 8 participants, maxVisible=3, so +5
    });

    it('should not show negative overflow', () => {
      const { queryByText } = render(
        <ChatHeaderAvatars
          {...defaultProps}
          participants={mockParticipants.slice(0, 2)}
          maxVisible={10}
        />
      );

      // Should not show -8 or any negative number
      expect(queryByText(/^-\d+$/)).toBeNull();
    });
  });

  describe('Avatar Ordering', () => {
    it('should display participants in order', () => {
      const { getAllByLabelText } = render(
        <ChatHeaderAvatars {...defaultProps} />
      );

      const avatars = getAllByLabelText(/^Open profile:/);
      expect(avatars).toHaveLength(4); // maxVisible=4
    });

    it('should maintain participant order with overflow', () => {
      const { getByLabelText, queryByLabelText } = render(
        <ChatHeaderAvatars {...defaultProps} maxVisible={2} />
      );

      // First 2 should be visible
      expect(getByLabelText('Open profile: Alice')).toBeTruthy();
      expect(getByLabelText('Open profile: Bob')).toBeTruthy();

      // Rest should be in overflow
      expect(queryByLabelText('Open profile: Charlie')).toBeNull();
      expect(queryByLabelText('Open profile: Diana')).toBeNull();
    });
  });
});
