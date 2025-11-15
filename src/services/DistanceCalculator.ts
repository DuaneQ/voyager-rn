import { LocationCoordinates } from '../types/Airport';
import { IDistanceCalculator } from './interfaces/IAirportService';

export class DistanceCalculator implements IDistanceCalculator {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param coord1 - First coordinate point
   * @param coord2 - Second coordinate point  
   * @returns Distance in kilometers
   */
  calculateDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * 
              Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param degrees - Value in degrees
   * @returns Value in radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default DistanceCalculator;