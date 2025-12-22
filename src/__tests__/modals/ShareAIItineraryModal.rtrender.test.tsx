import React from 'react';
import renderer from 'react-test-renderer';
import ShareAIItineraryModal from '../../components/modals/ShareAIItineraryModal';

describe('ShareAIItineraryModal react-test-renderer', () => {
  test('renders with test renderer', () => {
    const sampleItinerary = { id: '1', destination: 'Paris', startDate: '2025-01-01', endDate: '2025-01-05', startDay: 1, endDay: 5, response: { data: { itinerary: {} } } };
    const tree = renderer.create(
      <ShareAIItineraryModal 
        visible={true} 
        onClose={() => {}} 
        itinerary={sampleItinerary} 
      />
    );
    expect(tree).toBeTruthy();
  });
});
