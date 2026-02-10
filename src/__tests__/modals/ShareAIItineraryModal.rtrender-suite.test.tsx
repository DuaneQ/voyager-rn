import React from 'react';
import renderer, { ReactTestInstance, act } from 'react-test-renderer';

jest.mock('../../config/firebaseConfig', () => {
  const APP_DOMAIN = 'https://mundo1-dev.web.app';
  const SHAREABLE_FUNCTIONS = new Set(['videoShare', 'itineraryShare']);
  return {
    db: {},
    APP_DOMAIN,
    getCloudFunctionUrl: (functionName: string) => {
      if (SHAREABLE_FUNCTIONS.has(functionName)) {
        return APP_DOMAIN;
      }
      return `https://us-central1-mundo1-dev.cloudfunctions.net/${functionName}`;
    },
  };
});

describe('ShareAIItineraryModal - rtrender suite', () => {
  const Share = require('../../components/modals/ShareAIItineraryModal').default;
  // Prefer top-level react-native mocks to avoid instance divergence
  const RN = require('react-native');
  const InternalClipboard = require('react-native/Libraries/Components/Clipboard/Clipboard');

  const mockItinerary = {
    id: 'test-itinerary-123',
    userId: 'user-123',
    destination: 'Paris, France',
    startDate: '2025-08-15',
    endDate: '2025-08-22',
    startDay: 1,
    endDay: 8,
    ai_status: 'completed',
    createdAt: '2025-10-31T00:00:00Z',
    updatedAt: '2025-10-31T00:00:00Z',
    response: {
      success: true,
      data: {
        itinerary: {
          id: 'test-itinerary-123',
          destination: 'Paris, France',
          startDate: '2025-08-15',
          endDate: '2025-08-22',
          description: 'A wonderful AI-generated trip to the City of Light',
          days: []
        },
        metadata: {}
      }
    }
  };

  const defaultProps = { visible: true, onClose: jest.fn(), itinerary: mockItinerary };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function childText(nodeChildren: any): string | null {
    if (typeof nodeChildren === 'string') return nodeChildren;
    if (Array.isArray(nodeChildren)) {
      if (nodeChildren.every((c) => typeof c === 'string')) return nodeChildren.join('');
      return null;
    }
    return null;
  }

  function findByText(root: ReactTestInstance, text: RegExp | string) {
    const matches = root.findAll((n) => {
      if (!n.props) return false;
      const content = childText(n.props.children);
      if (content == null) return false;
      return typeof text === 'string' ? content === text : text.test(content);
    });
    return matches[0];
  }

  test('renders header, destination and dates (flexible date format)', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(React.createElement(Share, defaultProps));
    });
    const root = tree.root;
    expect(findByText(root, 'Share Itinerary')).toBeTruthy();
    expect(findByText(root, 'Paris, France')).toBeTruthy();
    // Node Intl availability may vary; accept either long or numeric US format
    // Fallback: locate the Text node whose children contains both start and end year fragments
    const dateNode = root.findAll((n) => {
      const c = childText(n.props?.children);
      if (!c) return false;
      return c.includes('2025') && c.includes('-') && (c.includes('Aug') || /\d{1,2}\/\d{1,2}\/2025/.test(c));
    })[0];
    expect(dateNode).toBeTruthy();
  });

  test('share URL present and copy triggers clipboard', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(React.createElement(Share, defaultProps));
    });
    const root = tree.root;
    // Find TextInput by prop testID
    const input = root.findAll((n) => n.props && n.props.testID === 'share-url-input')[0];
    expect(input).toBeTruthy();
    expect(input.props.value).toContain('/share-itinerary/test-itinerary-123');

    const copyBtn = root.findAll((n) => n.props && n.props.testID === 'copy-button')[0];
    expect(copyBtn).toBeTruthy();
    // simulate press
    copyBtn.props.onPress();
    expect(InternalClipboard.setString).toHaveBeenCalledWith(expect.stringContaining('/share-itinerary/test-itinerary-123'));
  });

  test('share button calls Share.share', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(React.createElement(Share, defaultProps));
    });
    const root = tree.root;
    const shareBtn = root.findAll((n) => n.props && n.props.testID === 'share-button')[0];
    expect(shareBtn).toBeTruthy();
    shareBtn.props.onPress();
    expect(RN.Share.share).toHaveBeenCalled();
  });

  test('close buttons call onClose', () => {
    const onClose = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(React.createElement(Share, { ...defaultProps, onClose }));
    });
    const root = tree.root;
    const closeBtn = root.findAll((n) => n.props && n.props.testID === 'close-button')[0];
    const closeActionBtn = root.findAll((n) => n.props && n.props.testID === 'close-action-button')[0];
    closeBtn.props.onPress();
    closeActionBtn.props.onPress();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
