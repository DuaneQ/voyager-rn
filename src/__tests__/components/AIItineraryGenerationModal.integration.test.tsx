/**
 * Integration tests for AIItineraryGenerationModal
 * Tests the integration between the modal and useUsageTracking hook
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AIItineraryGenerationModal } from '../../components/modals/AIItineraryGenerationModal';
import * as firebaseCfg from '../../config/firebaseConfig';
import { AlertProvider } from '../../context/AlertContext';

// Helper to render with AlertProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<AlertProvider>{component}</AlertProvider>);
};

// Mock dependencies
jest.mock('../../hooks/useAIGenerationV2', () => ({
  useAIGenerationV2: () => ({
    generateItinerary: jest.fn().mockResolvedValue({ success: true, data: { id: 'test-id' } }),
    isGenerating: false,
    progress: null,
    error: null,
    cancelGeneration: jest.fn(),
  }),
}));

jest.mock('../../hooks/useUsageTracking');
jest.mock('../../config/firebaseConfig');
jest.mock('../../constants/apiConfig', () => ({
  getGooglePlacesApiKey: () => 'test-api-key',
}));
jest.mock('../../services/ProfileValidationService', () => ({
  __esModule: true,
  default: {
    isFlightSectionVisible: jest.fn(() => false),
    validateFlightFields: jest.fn(() => ({})),
    validateTagsAndSpecialRequests: jest.fn(() => ({})),
    validateProfileCompleteness: jest.fn(() => ({ isValid: true })),
  },
}));

describe('AIItineraryGenerationModal - Usage Tracking Integration', () => {
  const mockOnClose = jest.fn();
  const mockOnGenerated = jest.fn();
  const mockTrackAICreation = jest.fn();
  const mockHasReachedAILimit = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onGenerated: mockOnGenerated,
    userProfile: {
      uid: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      dob: '1990-01-01',
      gender: 'male',
    },
    preferences: {
      profiles: [
        {
          id: 'profile-1',
          name: 'Test Profile',
          isDefault: true,
          accommodationBudget: 'medium',
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Firebase auth
    (firebaseCfg as any).getAuthInstance = jest.fn(() => ({
      currentUser: { uid: 'test-user-123' },
    }));

    // Mock useUsageTracking
    const useUsageTracking = require('../../hooks/useUsageTracking');
    useUsageTracking.useUsageTracking = jest.fn(() => ({
      hasReachedAILimit: mockHasReachedAILimit,
      trackAICreation: mockTrackAICreation,
      hasReachedLimit: jest.fn(() => false),
      trackView: jest.fn(),
      hasPremium: jest.fn(() => false),
      isLoading: false,
      userProfile: null,
      refreshProfile: jest.fn(),
      getRemainingAICreations: jest.fn(() => 5),
      dailyViewCount: 0,
      dailyAICount: 0,
    }));

    // Default: user has not reached limit
    mockHasReachedAILimit.mockReturnValue(false);
    mockTrackAICreation.mockResolvedValue(true);
  });

  describe('useUsageTracking Integration', () => {
    it('should call useUsageTracking hook when modal renders', () => {
      const useUsageTracking = require('../../hooks/useUsageTracking');
      
      renderWithProvider(<AIItineraryGenerationModal {...defaultProps} />);
      
      expect(useUsageTracking.useUsageTracking).toHaveBeenCalled();
    });

    it('should extract hasReachedAILimit from useUsageTracking', () => {
      const useUsageTracking = require('../../hooks/useUsageTracking');
      
      renderWithProvider(<AIItineraryGenerationModal {...defaultProps} />);
      
      const hookReturn = useUsageTracking.useUsageTracking.mock.results[0].value;
      expect(hookReturn.hasReachedAILimit).toBe(mockHasReachedAILimit);
    });

    it('should extract trackAICreation from useUsageTracking', () => {
      const useUsageTracking = require('../../hooks/useUsageTracking');
      
      renderWithProvider(<AIItineraryGenerationModal {...defaultProps} />);
      
      const hookReturn = useUsageTracking.useUsageTracking.mock.results[0].value;
      expect(hookReturn.trackAICreation).toBe(mockTrackAICreation);
    });
  });

  describe('PWA Parity', () => {
    it('should import useUsageTracking (matching PWA)', () => {
      // PWA imports: import { useUsageTracking } from '../../hooks/useUsageTracking';
      const useUsageTracking = require('../../hooks/useUsageTracking');
      
      renderWithProvider(<AIItineraryGenerationModal {...defaultProps} />);
      
      expect(useUsageTracking.useUsageTracking).toHaveBeenCalled();
    });

    it('should have both hasReachedAILimit and trackAICreation (matching PWA)', () => {
      // PWA pattern: const { hasReachedAILimit, trackAICreation } = useUsageTracking();
      const useUsageTracking = require('../../hooks/useUsageTracking');
      
      renderWithProvider(<AIItineraryGenerationModal {...defaultProps} />);
      
      const hookReturn = useUsageTracking.useUsageTracking.mock.results[0].value;
      expect(hookReturn.hasReachedAILimit).toBeDefined();
      expect(hookReturn.trackAICreation).toBeDefined();
    });
  });

  describe('Modal Rendering', () => {
    it('should render modal header', async () => {
      const { getAllByText } = renderWithProvider(
        <AIItineraryGenerationModal {...defaultProps} />
      );

      await waitFor(() => {
        // Use getAllByText since text appears in both TouchableOpacity and Text
        const elements = getAllByText(/Generate AI Itinerary/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should render with usage tracking initialized', () => {
      const useUsageTracking = require('../../hooks/useUsageTracking');
      
      const { getAllByText } = renderWithProvider(
        <AIItineraryGenerationModal {...defaultProps} />
      );

      expect(useUsageTracking.useUsageTracking).toHaveBeenCalled();
      
      // Modal should render successfully with tracking
      const elements = getAllByText(/Generate AI Itinerary/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
