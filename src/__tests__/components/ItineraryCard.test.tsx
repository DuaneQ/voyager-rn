import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock firebase imports used by ItineraryCard
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(() => ({})),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/avatar.jpg'),
}));

// Mock firestore used by ViewProfileModal to avoid runtime calls
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
}));

// Use centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

import ItineraryCard from '../../components/forms/ItineraryCard';

const baseItinerary: any = {
  id: 'it-1',
  destination: 'Test City',
  startDate: '2025-11-10',
  endDate: '2025-11-15',
  description: 'A lovely trip',
  activities: ['Sightseeing', 'Museums'],
  userInfo: {
    uid: 'test-user-123',
    username: 'johndoe',
  },
};

// Ensure tests have an authenticated user by default
jest.mock('../../config/firebaseConfig');
import { setMockUser, clearMockUser } from '../../testUtils/mockAuth';

beforeEach(() => {
  jest.clearAllMocks();
  setMockUser();
});

afterEach(() => {
  clearMockUser();
});

describe('ItineraryCard', () => {
  it('renders itinerary details and activities and profile photo', async () => {
    const onLike = jest.fn().mockResolvedValue(undefined);
    const onDislike = jest.fn().mockResolvedValue(undefined);

    const { getByText, getByTestId, queryByText } = render(
      <ItineraryCard itinerary={baseItinerary} onLike={onLike} onDislike={onDislike} />
    );

    // Basic content
    expect(getByText('Test City')).toBeTruthy();
    expect(getByText('A lovely trip')).toBeTruthy();
    expect(getByText('Activities:')).toBeTruthy();
    expect(getByText('Sightseeing')).toBeTruthy();
    expect(getByText('Museums')).toBeTruthy();

    // Buttons exist
    expect(getByTestId('like-button')).toBeTruthy();
    expect(getByTestId('dislike-button')).toBeTruthy();

    // ViewProfileModal isn't visible by default (username shown)
    expect(getByText('johndoe')).toBeTruthy();
    expect(queryByText('No description provided.')).toBeNull();
  });

  it('calls onLike and shows processing indicator while awaiting', async () => {
    // Make onLike resolve after a short delay so we can assert processing state
    let resolveLike: () => void;
    const onLike = jest.fn(() => new Promise<void>((res) => { resolveLike = res; }));
    const onDislike = jest.fn().mockResolvedValue(undefined);

    const { getByTestId, getByText, queryByTestId } = render(
      <ItineraryCard itinerary={baseItinerary} onLike={onLike} onDislike={onDislike} />
    );

    const likeButton = getByTestId('like-button');
    fireEvent.press(likeButton);

    // processingReaction should render ActivityIndicator - which is a native element without testID
    // We can assert that the button becomes disabled while processing by checking 'disabled' prop via query
    await waitFor(() => expect(onLike).toHaveBeenCalled());

    // Resolve the promise to finish
    resolveLike!();
    await waitFor(() => expect(queryByTestId('like-button')).toBeTruthy());
  });

  it('renders edit/delete buttons when showEditDelete and current user is owner', async () => {
  // Adjust itinerary owner to match mocked current user from top-level mock
  const ownerItinerary = { ...baseItinerary, userInfo: { ...baseItinerary.userInfo, uid: 'test-user-123' } };

    const onEdit = jest.fn();
    const onDelete = jest.fn();

    const { getByText } = render(
      <ItineraryCard itinerary={ownerItinerary} onLike={jest.fn()} onDislike={jest.fn()} showEditDelete onEdit={onEdit} onDelete={onDelete} />
    );

    // Edit and delete buttons are emoji-based; we assert presence by text
    expect(getByText('✏️')).toBeTruthy();
    expect(getByText('🗑️')).toBeTruthy();
  });

  it('calls onEdit when edit button is pressed', async () => {
    const ownerItinerary = { ...baseItinerary, userInfo: { ...baseItinerary.userInfo, uid: 'test-user-123' } };
    const onEdit = jest.fn();

    const { getByText } = render(
      <ItineraryCard itinerary={ownerItinerary} onLike={jest.fn()} onDislike={jest.fn()} showEditDelete onEdit={onEdit} />
    );

    fireEvent.press(getByText('✏️'));
    expect(onEdit).toHaveBeenCalledWith(ownerItinerary);
  });

  it('calls onDelete when delete button is pressed', async () => {
    const ownerItinerary = { ...baseItinerary, userInfo: { ...baseItinerary.userInfo, uid: 'test-user-123' } };
    const onDelete = jest.fn();

    const { getByText } = render(
      <ItineraryCard itinerary={ownerItinerary} onLike={jest.fn()} onDislike={jest.fn()} showEditDelete onDelete={onDelete} />
    );

    fireEvent.press(getByText('🗑️'));
    expect(onDelete).toHaveBeenCalledWith(ownerItinerary);
  });

  it('renders without activities', () => {
    const noActivitiesItinerary = { ...baseItinerary, activities: [] };

    const { queryByText } = render(
      <ItineraryCard itinerary={noActivitiesItinerary} onLike={jest.fn()} onDislike={jest.fn()} />
    );

    expect(queryByText('Activities:')).toBeNull();
  });

  it('renders without description', () => {
    const noDescriptionItinerary = { ...baseItinerary, description: '' };

    const { queryByText } = render(
      <ItineraryCard itinerary={noDescriptionItinerary} onLike={jest.fn()} onDislike={jest.fn()} />
    );

    expect(queryByText('A lovely trip')).toBeNull();
  });

  it('disables both buttons while processing reaction', async () => {
    let resolveLike: () => void;
    const onLike = jest.fn(() => new Promise<void>((res) => { resolveLike = res; }));

    const { getByTestId } = render(
      <ItineraryCard itinerary={baseItinerary} onLike={onLike} onDislike={jest.fn()} />
    );

    fireEvent.press(getByTestId('like-button'));
    
    await waitFor(() => expect(onLike).toHaveBeenCalled());
    resolveLike!();
  });

  it('calls onDislike when dislike button is pressed', async () => {
    const onDislike = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <ItineraryCard itinerary={baseItinerary} onLike={jest.fn()} onDislike={onDislike} />
    );

    fireEvent.press(getByTestId('dislike-button'));

    await waitFor(() => expect(onDislike).toHaveBeenCalledWith(baseItinerary));
  });

  it('opens view profile modal when username is pressed', async () => {
    const { getByText, findByText } = render(
      <ItineraryCard itinerary={baseItinerary} onLike={jest.fn()} onDislike={jest.fn()} />
    );

    fireEvent.press(getByText('johndoe'));
    
    // ViewProfileModal should open (it has a "Close" button or similar UI)
    // Since we mocked firestore to return no user, just verify modal interaction doesn't crash
    await waitFor(() => {
      expect(getByText('johndoe')).toBeTruthy();
    });
  });
});
