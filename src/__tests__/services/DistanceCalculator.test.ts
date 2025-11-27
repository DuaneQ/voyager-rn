import { DistanceCalculator } from '../../services/DistanceCalculator';

describe('DistanceCalculator', () => {
  let calculator: DistanceCalculator;

  beforeEach(() => {
    calculator = new DistanceCalculator();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // New York to Los Angeles (approx 3936 km)
      const coord1 = { lat: 40.7128, lng: -74.0060 };
      const coord2 = { lat: 34.0522, lng: -118.2437 };

      const distance = calculator.calculateDistance(coord1, coord2);

      // Distance should be approximately 3936 km (within 10% tolerance)
      expect(distance).toBeGreaterThan(3500);
      expect(distance).toBeLessThan(4300);
    });

    it('should return 0 for same coordinates', () => {
      const coord = { lat: 40.7128, lng: -74.0060 };

      const distance = calculator.calculateDistance(coord, coord);

      expect(distance).toBeCloseTo(0, 2);
    });

    it('should calculate distance for nearby points', () => {
      // Two points 1 degree apart (roughly 111 km)
      const coord1 = { lat: 0, lng: 0 };
      const coord2 = { lat: 1, lng: 0 };

      const distance = calculator.calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });

    it('should handle negative coordinates', () => {
      const coord1 = { lat: -33.8688, lng: 151.2093 }; // Sydney
      const coord2 = { lat: 51.5074, lng: -0.1278 }; // London

      const distance = calculator.calculateDistance(coord1, coord2);

      // Distance should be significant (over 15,000 km)
      expect(distance).toBeGreaterThan(15000);
    });

    it('should be symmetric', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 };
      const coord2 = { lat: 34.0522, lng: -118.2437 };

      const distance1 = calculator.calculateDistance(coord1, coord2);
      const distance2 = calculator.calculateDistance(coord2, coord1);

      expect(distance1).toBeCloseTo(distance2, 2);
    });
  });
});
