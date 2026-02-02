/**
 * Simplified flight display tests - Focus on critical regressions
 * Tests the fixes from 2025-11-05 session (flight reading locations and data correctness)
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AIItineraryDisplay } from '../../../components/ai/AIItineraryDisplay';

// Mock icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../../config/firebaseConfig', () => ({
  db: {},
  getCloudFunctionUrl: jest.fn((functionName) => `https://us-central1-mundo1-dev.cloudfunctions.net/${functionName}`),
}));

describe('AIItineraryDisplay - Critical Flight Regressions', () => {
  describe('Flight Data Reading from Correct Locations', () => {
    it('CRITICAL: should read flights from response.data.itinerary.flights (PRIMARY)', () => {
      const mockItinerary = {
        id: 'test-123',
        destination: 'Miami, FL',
        title: 'Test itinerary',
        startDate: '2025-11-11',
        endDate: '2025-11-18',
        response: {
          data: {
            itinerary: {
              flights: [
                {
                  id: 'flight1',
                  airline: 'American',
                  flightNumber: 'AA123',
                  route: 'JFK → MIA',
                  departure: { date: '2025-11-12', time: '10:00', iata: 'JFK' },
                  arrival: { date: '2025-11-12', time: '13:00', iata: 'MIA' },
                  duration: '3h',
                  stops: 0,
                  cabin: 'economy',
                  price: { amount: 320, currency: 'USD' },
                },
              ],
            },
          },
        },
      } as any;

      render(<AIItineraryDisplay itinerary={mockItinerary} />);

      // Verify flights section exists with correct count
      expect(screen.getByText(/Flight Options/i)).toBeTruthy();
      expect(screen.getByText(/\(1\)/)).toBeTruthy();
    });

    it('CRITICAL: should fallback to recommendations.flights when itinerary.flights missing', () => {
      const mockItinerary = {
        id: 'test-123',
        destination: 'Miami, FL',
        title: 'Test itinerary',
        startDate: '2025-11-11',
        endDate: '2025-11-18',
        response: {
          data: {
            itinerary: {},
            recommendations: {
              flights: [
                {
                  id: 'flight2',
                  airline: 'Delta',
                  flightNumber: 'DL456',
                  route: 'LAX → JFK',
                  departure: { date: '2025-11-12', time: '11:00', iata: 'LAX' },
                  arrival: { date: '2025-11-12', time: '19:00', iata: 'JFK' },
                  duration: '5h',
                  stops: 0,
                  cabin: 'economy',
                  price: { amount: 450, currency: 'USD' },
                },
              ],
            },
          },
        },
      } as any;

      render(<AIItineraryDisplay itinerary={mockItinerary} />);

      // Verify flights section exists with correct count
      expect(screen.getByText(/Flight Options/i)).toBeTruthy();
      expect(screen.getByText(/\(1\)/)).toBeTruthy();
    });

    it('CRITICAL: should fallback to top-level flights property (LEGACY)', () => {
      const mockItinerary = {
        id: 'test-123',
        destination: 'Miami, FL',
        title: 'Test itinerary',
        startDate: '2025-11-11',
        endDate: '2025-11-18',
        flights: [
          {
            id: 'flight3',
            airline: 'United',
            flightNumber: 'UA789',
            route: 'SFO → ORD',
            departure: { date: '2025-11-12', time: '08:00', iata: 'SFO' },
            arrival: { date: '2025-11-12', time: '12:00', iata: 'ORD' },
            duration: '4h',
            stops: 0,
            cabin: 'economy',
            price: { amount: 380, currency: 'USD' },
          },
        ],
        response: {
          data: {
            itinerary: {},
          },
        },
      } as any;

      render(<AIItineraryDisplay itinerary={mockItinerary} />);

      // Verify flights section exists with correct count
      expect(screen.getByText(/Flight Options/i)).toBeTruthy();
      expect(screen.getByText(/\(1\)/)).toBeTruthy();
    });

    it('CRITICAL: should prioritize itineraryData.flights over other locations', () => {
      const mockItinerary = {
        id: 'test-123',
        destination: 'Miami, FL',
        title: 'Test itinerary',
        startDate: '2025-11-11',
        endDate: '2025-11-18',
        flights: [{ id: 'wrong1' }, { id: 'wrong2' }] as any[],
        response: {
          data: {
            itinerary: {
              flights: [
                {
                  id: 'correct1',
                  airline: 'Correct Airline',
                  flightNumber: 'CA123',
                  route: 'ABC → DEF',
                  departure: { date: '2025-11-12', time: '10:00', iata: 'ABC' },
                  arrival: { date: '2025-11-12', time: '13:00', iata: 'DEF' },
                  duration: '3h',
                  stops: 0,
                  cabin: 'economy',
                  price: { amount: 300, currency: 'USD' },
                },
              ],
            },
            recommendations: {
              flights: [{ id: 'wrong3' }, { id: 'wrong4' }] as any[],
            },
          },
        },
      } as any;

      render(<AIItineraryDisplay itinerary={mockItinerary} />);

      // Should show only 1 flight (from itineraryData.flights), not 5 total
      expect(screen.getByText(/\(1\)/)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing flight data gracefully', () => {
      const mockItinerary = {
        id: 'test-123',
        destination: 'Miami, FL',
        title: 'Test itinerary',
        startDate: '2025-11-11',
        endDate: '2025-11-18',
        response: {
          data: {
            itinerary: {},
          },
        },
      } as any;

      const { root } = render(<AIItineraryDisplay itinerary={mockItinerary} />);

      // Should not crash
      expect(root).toBeTruthy();

      // Should not show flight section if no flights
      expect(screen.queryByText(/Flight Options/i)).toBeNull();
    });

    it('should handle empty flights array', () => {
      const mockItinerary = {
        id: 'test-123',
        destination: 'Miami, FL',
        title: 'Test itinerary',
        startDate: '2025-11-11',
        endDate: '2025-11-18',
        response: {
          data: {
            itinerary: {
              flights: [],
            },
          },
        },
      } as any;

      const { root } = render(<AIItineraryDisplay itinerary={mockItinerary} />);

      // Should not crash
      expect(root).toBeTruthy();

      // Should not show flight section if empty
      expect(screen.queryByText(/Flight Options/i)).toBeNull();
    });
  });
});
