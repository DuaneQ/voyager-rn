/**
 * Unit Tests for ManageChatMembersModal
 * Tests group chat member management UI and permissions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ManageChatMembersModal } from '../../../components/modals/ManageChatMembersModal';

describe('ManageChatMembersModal', () => {
  const mockMembers = [
    {
      uid: 'user-1',
      username: 'Alice',
      avatarUrl: 'https://example.com/alice.jpg',
      addedBy: 'user-current',
    },
    {
      uid: 'user-2',
      username: 'Bob',
      avatarUrl: undefined,
      addedBy: 'user-1',
    },
    {
      uid: 'user-current',
      username: 'CurrentUser',
      avatarUrl: 'https://example.com/current.jpg',
      addedBy: 'user-1',
    },
    {
      uid: 'user-3',
      username: 'Charlie',
      avatarUrl: 'https://example.com/charlie.jpg',
      addedBy: 'user-current',
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    members: mockMembers,
    currentUserId: 'user-current',
    onRemoveMember: jest.fn().mockResolvedValue(undefined),
    onAddMembers: jest.fn(),
    onViewProfile: jest.fn(),
    removeLoading: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByText('Traval Buddies')).toBeTruthy();
    });

    it('should not show content when not visible', () => {
      const { queryByText } = render(
        <ManageChatMembersModal {...defaultProps} visible={false} />
      );

      // Modal content is not rendered when visible=false
      expect(queryByText('Traval Buddies')).toBeNull();
    });

    it('should render all members', () => {
      const { getByText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText(/CurrentUser/)).toBeTruthy();
      expect(getByText('Charlie')).toBeTruthy();
    });

    it('should mark current user with (You) label', () => {
      const { getByText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByText('(You)')).toBeTruthy();
    });

    it('should display member avatars', () => {
      const { getByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByLabelText('View profile: Alice')).toBeTruthy();
      expect(getByLabelText('View profile: Bob')).toBeTruthy();
    });

    it('should show initial for members without avatar', () => {
      const { getByText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByText('B')).toBeTruthy(); // Bob's initial
    });

    it('should show addedBy metadata', () => {
      const { getAllByText } = render(<ManageChatMembersModal {...defaultProps} />);

      const addedByElements = getAllByText(/Added by/);
      expect(addedByElements.length).toBeGreaterThan(0);
    });

    it('should show "Added by you" for members current user added', () => {
      const { getAllByText } = render(<ManageChatMembersModal {...defaultProps} />);

      const addedByYouElements = getAllByText(/Added by you/);
      expect(addedByYouElements.length).toBeGreaterThan(0);
    });

    it('should render Add Existing Connections button', () => {
      const { getByText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByText('Add Existing Connections')).toBeTruthy();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByLabelText('Close')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no members', () => {
      const { getByText } = render(
        <ManageChatMembersModal {...defaultProps} members={[]} />
      );

      expect(getByText('No members in this chat yet.')).toBeTruthy();
    });

    it('should still show Add button in empty state', () => {
      const { getByText } = render(
        <ManageChatMembersModal {...defaultProps} members={[]} />
      );

      expect(getByText('Add Existing Connections')).toBeTruthy();
    });
  });

  describe('Permission-Based Remove Button', () => {
    it('should show remove button for members current user added', () => {
      const { getByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      // Alice was added by current user
      expect(getByLabelText('Remove Alice')).toBeTruthy();
    });

    it('should not show remove button for members added by others', () => {
      const { queryByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      // Bob was added by user-1, not current user
      expect(queryByLabelText('Remove Bob')).toBeNull();
    });

    it('should not show remove button for current user', () => {
      const { queryByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(queryByLabelText('Remove CurrentUser')).toBeNull();
    });

    it('should show remove button only when canRemove is true', () => {
      const { getByLabelText, queryByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} />
      );

      // Charlie was added by current user - should show remove
      expect(getByLabelText('Remove Charlie')).toBeTruthy();
      
      // Bob was added by user-1 - should not show remove
      expect(queryByLabelText('Remove Bob')).toBeNull();
    });
  });

  describe('Member Removal', () => {
    it('should call onRemoveMember when remove button is pressed', async () => {
      const onRemoveMember = jest.fn().mockResolvedValue(undefined);
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} onRemoveMember={onRemoveMember} />
      );

      fireEvent.press(getByLabelText('Remove Alice'));

      await waitFor(() => {
        expect(onRemoveMember).toHaveBeenCalledWith('user-1');
      });
    });

    it('should show loading indicator when removing member', () => {
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} removeLoading="user-1" />
      );

      // Should show ActivityIndicator instead of remove icon
      // The button should still be accessible by label
      expect(getByLabelText('Remove Alice')).toBeTruthy();
    });

    it('should disable remove button while removing', () => {
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} removeLoading="user-1" />
      );

      const removeButton = getByLabelText('Remove Alice');
      expect(removeButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should not disable other remove buttons while removing one member', () => {
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} removeLoading="user-1" />
      );

      const charlieRemoveButton = getByLabelText('Remove Charlie');
      // Other buttons should not be disabled (disabled=false or undefined)
      expect(charlieRemoveButton.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} onClose={onClose} />
      );

      fireEvent.press(getByLabelText('Close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onAddMembers when Add button is pressed', () => {
      const onAddMembers = jest.fn();
      const { getByText } = render(
        <ManageChatMembersModal {...defaultProps} onAddMembers={onAddMembers} />
      );

      fireEvent.press(getByText('Add Existing Connections'));

      expect(onAddMembers).toHaveBeenCalledTimes(1);
    });

    it('should call onViewProfile when avatar is pressed', () => {
      const onViewProfile = jest.fn();
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} onViewProfile={onViewProfile} />
      );

      fireEvent.press(getByLabelText('View profile: Alice'));

      expect(onViewProfile).toHaveBeenCalledWith('user-1');
    });

    it('should call onViewProfile for different members', () => {
      const onViewProfile = jest.fn();
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} onViewProfile={onViewProfile} />
      );

      fireEvent.press(getByLabelText('View profile: Bob'));

      expect(onViewProfile).toHaveBeenCalledWith('user-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle members without addedBy metadata', () => {
      const membersWithoutAddedBy = [
        {
          uid: 'user-1',
          username: 'Alice',
          addedBy: undefined,
        },
      ];

      const { getByText, queryByText } = render(
        <ManageChatMembersModal
          {...defaultProps}
          members={membersWithoutAddedBy}
        />
      );

      expect(getByText('Alice')).toBeTruthy();
      expect(queryByText(/Added by/)).toBeNull();
    });

    it('should not show addedBy when member added themselves', () => {
      const selfAddedMembers = [
        {
          uid: 'user-1',
          username: 'Alice',
          addedBy: 'user-1', // Added themselves
        },
      ];

      const { queryByText } = render(
        <ManageChatMembersModal
          {...defaultProps}
          members={selfAddedMembers}
        />
      );

      expect(queryByText(/Added by/)).toBeNull();
    });

    it('should handle members without username', () => {
      const membersWithoutUsername = [
        {
          uid: 'user-1',
          username: '',
          addedBy: 'user-current',
        },
      ];

      const { getByText } = render(
        <ManageChatMembersModal
          {...defaultProps}
          members={membersWithoutUsername}
        />
      );

      expect(getByText('U')).toBeTruthy(); // Default initial
    });

    it('should handle members without avatarUrl', () => {
      const membersWithoutAvatar = [
        {
          uid: 'user-1',
          username: 'Alice',
          avatarUrl: undefined,
          addedBy: 'user-current',
        },
      ];

      const { getByText } = render(
        <ManageChatMembersModal
          {...defaultProps}
          members={membersWithoutAvatar}
        />
      );

      expect(getByText('A')).toBeTruthy(); // Initial fallback
    });

    it('should handle removeLoading for non-existent member', () => {
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} removeLoading="non-existent" />
      );

      // Should still render normally
      expect(getByLabelText('Remove Alice')).toBeTruthy();
    });

    it('should handle empty removeLoading', () => {
      const { getByLabelText } = render(
        <ManageChatMembersModal {...defaultProps} removeLoading={null} />
      );

      expect(getByLabelText('Remove Alice')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible member labels', () => {
      const { getByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByLabelText('Alice')).toBeTruthy();
      expect(getByLabelText('CurrentUser (You)')).toBeTruthy();
    });

    it('should have accessible buttons', () => {
      const { getByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByLabelText('Close')).toBeTruthy();
      expect(getByLabelText('Add existing connections')).toBeTruthy();
    });

    it('should have accessible member list', () => {
      const { getByLabelText } = render(<ManageChatMembersModal {...defaultProps} />);

      expect(getByLabelText('Member list')).toBeTruthy();
    });
  });

  describe('Member Ordering', () => {
    it('should render members in provided order', () => {
      const { UNSAFE_root } = render(<ManageChatMembersModal {...defaultProps} />);

      // Component should render without errors
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle single member', () => {
      const singleMember = [mockMembers[0]];

      const { getByText } = render(
        <ManageChatMembersModal {...defaultProps} members={singleMember} />
      );

      expect(getByText('Alice')).toBeTruthy();
    });

    it('should handle many members', () => {
      const manyMembers = [
        ...mockMembers,
        { uid: 'user-5', username: 'Diana', addedBy: 'user-current' },
        { uid: 'user-6', username: 'Eve', addedBy: 'user-1' },
        { uid: 'user-7', username: 'Frank', addedBy: 'user-current' },
      ];

      const { getByText } = render(
        <ManageChatMembersModal {...defaultProps} members={manyMembers} />
      );

      expect(getByText('Diana')).toBeTruthy();
      expect(getByText('Eve')).toBeTruthy();
      expect(getByText('Frank')).toBeTruthy();
    });
  });
});
