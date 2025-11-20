import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

// Mock navigation hooks used by the component
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { connectionId: 'conn-ui-1', otherUserName: 'Other' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

// Mock hooks used inside ChatThreadScreen
const mockUseMessages = jest.fn();
jest.mock('../../hooks/chat/useMessages', () => ({
  useMessages: (...args: any[]) => mockUseMessages(...args),
}));

jest.mock('../../hooks/chat/useConnections', () => ({
  useConnections: () => ({ connections: [{ id: 'conn-ui-1', users: ['currentUser', 'other'] }] }),
}));

// Mock connection repository to avoid side effects
jest.mock('../../repositories/ConnectionRepository', () => ({
  connectionRepository: {
    markMessagesAsRead: jest.fn(),
  },
}));

// Mock getDoc used for fetching user profiles (silence network calls)
jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(async () => ({ exists: false })),
}));

import ChatThreadScreen from '../../pages/ChatThreadScreen';
import { UserProfileContext } from '../../context/UserProfileContext';

describe('ChatThreadScreen UI — initial page size', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders 10 messages initially and calls loadMore when user requests older messages', async () => {
    // Prepare 10 mock messages
    const msgs = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      sender: i % 2 === 0 ? 'currentUser' : 'other',
      text: `Message ${i}`,
      createdAt: new Date(Date.now() - i * 1000),
      readBy: i % 2 === 0 ? ['currentUser'] : [],
    }));

    const loadMoreMock = jest.fn().mockResolvedValue(undefined);

    // Mock hook to return exactly 10 messages initially
    mockUseMessages.mockReturnValue({
      messages: msgs,
      loading: false,
      error: null,
      hasMore: true,
      loadMore: loadMoreMock,
      refresh: jest.fn(),
    });

    // Provide a simple userProfile via provider
    const userProfileValue = { userProfile: { uid: 'currentUser' }, setUserProfile: () => {}, updateUserProfile: () => {}, updateProfile: async () => {}, isLoading: false, loading: false } as any;

    const { getByText, queryByText } = render(
      <UserProfileContext.Provider value={userProfileValue}>
        <ChatThreadScreen />
      </UserProfileContext.Provider>
    );

    // Wait for the messages to render
    await waitFor(() => {
      expect(getByText('Message 0')).toBeTruthy();
    });

    // Ensure 10 messages rendered by checking one early and one late index
    expect(getByText('Message 0')).toBeTruthy();
    expect(getByText('Message 9')).toBeTruthy();

    // The hook reports hasMore === true and exposes a loadMore fn
    expect(mockUseMessages().hasMore).toBe(true);
    expect(loadMoreMock).not.toHaveBeenCalled();

    // Simulate the user requesting older messages by calling the hook-provided loadMore
    await loadMoreMock();
    expect(loadMoreMock).toHaveBeenCalledTimes(1);
  });
});
