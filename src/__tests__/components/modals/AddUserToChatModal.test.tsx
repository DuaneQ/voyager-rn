/**
 * Unit Tests for AddUserToChatModal
 * Tests user selection and adding members to group chats
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddUserToChatModal } from '../../../components/modals/AddUserToChatModal';
import { getEligibleUsersForChat } from '../../../utils/getEligibleUsersForChat';
import { getDoc, getFirestore } from 'firebase/firestore';

// Mock dependencies
jest.mock('../../../utils/getEligibleUsersForChat');
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn((db, collection, id) => ({ id, collection })),
}));

const mockGetEligibleUsers = getEligibleUsersForChat as jest.MockedFunction<typeof getEligibleUsersForChat>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;

describe('AddUserToChatModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onAdd: jest.fn(),
    currentUserId: 'user-current',
    currentChatUserIds: ['user-current', 'user-1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Firestore
    mockGetFirestore.mockReturnValue({} as any);
    
    // Mock eligible users
    mockGetEligibleUsers.mockResolvedValue([
      { userId: 'user-2' },
      { userId: 'user-3' },
      { userId: 'user-4' },
    ]);

    // Mock Firestore user profile fetching
    mockGetDoc.mockImplementation(async (docRef: any) => {
      const userId = docRef.id;
      const profiles: Record<string, any> = {
        'user-2': { username: 'Alice', photoURL: 'https://example.com/alice.jpg' },
        'user-3': { username: 'Bob', photoURL: undefined },
        'user-4': { username: 'Charlie', photoURL: 'https://example.com/charlie.jpg' },
      };
      
      const profile = profiles[userId];
      return {
        exists: () => !!profile,
        data: () => profile,
      } as any;
    });
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText } = render(<AddUserToChatModal {...defaultProps} />);

      expect(getByText('Add to Chat')).toBeTruthy();
    });

    it('should not show content when not visible', () => {
      const { queryByText } = render(
        <AddUserToChatModal {...defaultProps} visible={false} />
      );

      expect(queryByText('Add to Chat')).toBeNull();
    });

    it('should show loading state while fetching users', () => {
      const { getByText } = render(<AddUserToChatModal {...defaultProps} />);

      expect(getByText('Finding your connections...')).toBeTruthy();
    });

    it('should render eligible users after loading', async () => {
      const { getByText, queryByText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(queryByText('Finding your connections...')).toBeNull();
      });

      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText('Charlie')).toBeTruthy();
    });

    it('should show search input', () => {
      const { getByPlaceholderText } = render(<AddUserToChatModal {...defaultProps} />);

      expect(getByPlaceholderText('Search by username')).toBeTruthy();
    });

    it('should render user avatars', async () => {
      const { getByText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
      });

      // Bob doesn't have avatar, should show initial
      expect(getByText('B')).toBeTruthy();
    });

    it('should show empty state when no eligible users', async () => {
      mockGetEligibleUsers.mockResolvedValue([]);

      const { getByText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByText(/No eligible users found/)).toBeTruthy();
      });
    });
  });

  describe('User Selection', () => {
    it('should select user when row is pressed', async () => {
      const { getByText, getByLabelText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
      });

      const aliceRow = getByLabelText('Alice');
      fireEvent.press(aliceRow);

      // Check if selected state is applied
      expect(getByLabelText('Alice selected')).toBeTruthy();
    });

    it('should deselect user when pressed again', async () => {
      const { getByLabelText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      const aliceRow = getByLabelText('Alice');
      
      // Select
      fireEvent.press(aliceRow);
      expect(getByLabelText('Alice selected')).toBeTruthy();

      // Deselect
      fireEvent.press(aliceRow);
      expect(getByLabelText('Alice')).toBeTruthy();
    });

    it('should allow selecting multiple users', async () => {
      const { getByLabelText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Alice'));
      fireEvent.press(getByLabelText('Bob'));
      fireEvent.press(getByLabelText('Charlie'));

      expect(getByLabelText('Alice selected')).toBeTruthy();
      expect(getByLabelText('Bob selected')).toBeTruthy();
      expect(getByLabelText('Charlie selected')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by search query', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <AddUserToChatModal {...defaultProps} />
      );

      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search by username');
      fireEvent.changeText(searchInput, 'ali');

      expect(getByText('Alice')).toBeTruthy();
      expect(queryByText('Bob')).toBeNull();
      expect(queryByText('Charlie')).toBeNull();
    });

    it('should show empty state when search has no matches', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddUserToChatModal {...defaultProps} />
      );

      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search by username');
      fireEvent.changeText(searchInput, 'nonexistent');

      expect(getByText('No users match your search.')).toBeTruthy();
    });

    it('should be case-insensitive', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddUserToChatModal {...defaultProps} />
      );

      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search by username');
      fireEvent.changeText(searchInput, 'ALICE');

      expect(getByText('Alice')).toBeTruthy();
    });
  });

  describe('Add Action', () => {
    it('should call onAdd with selected user IDs', async () => {
      const onAdd = jest.fn();
      const { getByLabelText, getByText } = render(
        <AddUserToChatModal {...defaultProps} onAdd={onAdd} />
      );

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Alice'));
      fireEvent.press(getByLabelText('Bob'));

      fireEvent.press(getByText(/Add \(2\)/));

      expect(onAdd).toHaveBeenCalledWith(['user-2', 'user-3']);
    });

    it('should disable Add button when no users selected', async () => {
      const { getByLabelText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByLabelText('Add 0 users')).toBeTruthy();
      });

      const addButton = getByLabelText('Add 0 users');
      expect(addButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should close modal and reset state after adding', async () => {
      const onAdd = jest.fn();
      const onClose = jest.fn();
      const { getByLabelText, getByText } = render(
        <AddUserToChatModal {...defaultProps} onAdd={onAdd} onClose={onClose} />
      );

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Alice'));
      fireEvent.press(getByText(/Add \(1\)/));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <AddUserToChatModal {...defaultProps} onClose={onClose} />
      );

      fireEvent.press(getByLabelText('Close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is pressed', async () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <AddUserToChatModal {...defaultProps} onClose={onClose} />
      );

      await waitFor(() => {
        expect(getByLabelText('Cancel')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset selection when reopening modal', async () => {
      const { rerender, getByLabelText, queryByLabelText } = render(
        <AddUserToChatModal {...defaultProps} />
      );

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      // Select user
      fireEvent.press(getByLabelText('Alice'));
      expect(getByLabelText('Alice selected')).toBeTruthy();

      // Close modal
      rerender(<AddUserToChatModal {...defaultProps} visible={false} />);

      // Reopen modal
      rerender(<AddUserToChatModal {...defaultProps} visible={true} />);

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      // Selection should be reset
      expect(queryByLabelText('Alice selected')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle users without usernames', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ photoURL: undefined }),
      } as any);

      const { getAllByText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        // Should fall back to userId
        expect(getAllByText(/user-/).length).toBeGreaterThan(0);
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockGetEligibleUsers.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByText(/No eligible users found/)).toBeTruthy();
      });
    });

    it('should handle profile fetch errors', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      const { getAllByText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        // Should still render users with fallback to userId
        expect(getAllByText(/user-/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all interactive elements', async () => {
      const { getByLabelText } = render(<AddUserToChatModal {...defaultProps} />);

      expect(getByLabelText('Close')).toBeTruthy();
      expect(getByLabelText('Search users')).toBeTruthy();
      expect(getByLabelText('Cancel')).toBeTruthy();
      
      await waitFor(() => {
        expect(getByLabelText(/Add/)).toBeTruthy();
      });
    });

    it('should mark selected users with accessibility state', async () => {
      const { getByLabelText } = render(<AddUserToChatModal {...defaultProps} />);

      await waitFor(() => {
        expect(getByLabelText('Alice')).toBeTruthy();
      });

      const aliceRow = getByLabelText('Alice');
      fireEvent.press(aliceRow);

      const selectedRow = getByLabelText('Alice selected');
      expect(selectedRow.props.accessibilityState?.selected).toBe(true);
    });
  });
});
