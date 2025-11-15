import React from 'react';
import renderer from 'react-test-renderer';

describe('ShareAIItineraryModal react-test-renderer', () => {
  test('renders with test renderer', () => {
    jest.resetModules();
    const Share = require('../../components/modals/ShareAIItineraryModal').default;
    const sampleItinerary = { id: '1', destination: 'Paris', startDate: '2025-01-01', endDate: '2025-01-05', startDay: 1, endDay: 5, response: { data: { itinerary: {} } } };
    const tree = renderer.create(React.createElement(Share, { visible: true, onClose: () => {}, itinerary: sampleItinerary }));
    expect(tree).toBeTruthy();
  });
});
