/**
 * Test Travel Preference Profiles for AI Generation Testing
 * 
 * Covers all transportation modes:
 * - airplane (with flight preferences)
 * - train
 * - driving/rental
 * - public transportation
 * - walking
 * 
 * Different travel styles and budgets to test diverse scenarios
 */

export interface TestPreferenceProfile {
  id: string;
  name: string;
  isDefault: boolean;
  travelStyle: 'luxury' | 'budget' | 'mid-range' | 'backpacker';
  budgetRange: {
    min: number;
    max: number;
    currency: 'USD';
  };
  activities: string[];
  foodPreferences: {
    dietaryRestrictions: string[];
    cuisineTypes: string[];
    foodBudgetLevel: 'low' | 'medium' | 'high';
  };
  accommodation: {
    type: 'hotel' | 'hostel' | 'airbnb' | 'resort' | 'any';
    starRating: number;
    minUserRating?: number;
  };
  transportation: {
    primaryMode: 'walking' | 'public' | 'taxi' | 'rental' | 'airplane' | 'bus' | 'train';
    maxWalkingDistance?: number;
    includeFlights?: boolean;
  };
  groupSize: {
    preferred: number;
    sizes: number[];
  };
  accessibility: {
    mobilityNeeds: boolean;
    visualNeeds: boolean;
    hearingNeeds: boolean;
    details?: string;
  };
}

export const generateTestPreferenceProfiles = (): TestPreferenceProfile[] => {
  const timestamp = Date.now();

  return [
    // === AIRPLANE PROFILE (Luxury Business Travel) ===
    {
      id: `test-profile-airplane-${timestamp}`,
      name: 'Business Flight Travel',
      isDefault: false,
      travelStyle: 'luxury',
      budgetRange: {
        min: 3000,
        max: 8000,
        currency: 'USD',
      },
      activities: ['food', 'culture', 'business', 'shopping'],
      foodPreferences: {
        dietaryRestrictions: [],
        cuisineTypes: ['local', 'fine-dining', 'international'],
        foodBudgetLevel: 'high',
      },
      accommodation: {
        type: 'hotel',
        starRating: 5,
        minUserRating: 4.5,
      },
      transportation: {
        primaryMode: 'airplane',
        includeFlights: true,
      },
      groupSize: {
        preferred: 1,
        sizes: [1],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    },

    // === TRAIN PROFILE (Mid-range European Travel) ===
    {
      id: `test-profile-train-${timestamp}`,
      name: 'European Train Adventure',
      isDefault: false,
      travelStyle: 'mid-range',
      budgetRange: {
        min: 1500,
        max: 3500,
        currency: 'USD',
      },
      activities: ['culture', 'food', 'nature', 'sightseeing'],
      foodPreferences: {
        dietaryRestrictions: ['vegetarian'],
        cuisineTypes: ['local', 'italian', 'french'],
        foodBudgetLevel: 'medium',
      },
      accommodation: {
        type: 'hotel',
        starRating: 4,
        minUserRating: 4.0,
      },
      transportation: {
        primaryMode: 'train',
        maxWalkingDistance: 15,
      },
      groupSize: {
        preferred: 2,
        sizes: [2],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    },

    // === RENTAL CAR PROFILE (Road Trip Adventure) ===
    {
      id: `test-profile-rental-${timestamp}`,
      name: 'Road Trip Explorer',
      isDefault: false,
      travelStyle: 'mid-range',
      budgetRange: {
        min: 2000,
        max: 4000,
        currency: 'USD',
      },
      activities: ['nature', 'adventure', 'food', 'photography'],
      foodPreferences: {
        dietaryRestrictions: [],
        cuisineTypes: ['local', 'bbq', 'casual'],
        foodBudgetLevel: 'medium',
      },
      accommodation: {
        type: 'hotel',
        starRating: 3,
        minUserRating: 3.8,
      },
      transportation: {
        primaryMode: 'rental',
        maxWalkingDistance: 20,
      },
      groupSize: {
        preferred: 4,
        sizes: [4],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    },

    // === PUBLIC TRANSIT PROFILE (Budget City Explorer) ===
    {
      id: `test-profile-public-${timestamp}`,
      name: 'Urban Transit Explorer',
      isDefault: false,
      travelStyle: 'budget',
      budgetRange: {
        min: 800,
        max: 1500,
        currency: 'USD',
      },
      activities: ['culture', 'food', 'nightlife', 'shopping'],
      foodPreferences: {
        dietaryRestrictions: ['vegan'],
        cuisineTypes: ['local', 'street-food', 'asian'],
        foodBudgetLevel: 'low',
      },
      accommodation: {
        type: 'hostel',
        starRating: 3,
        minUserRating: 4.2,
      },
      transportation: {
        primaryMode: 'public',
        maxWalkingDistance: 25,
      },
      groupSize: {
        preferred: 1,
        sizes: [1],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    },

    // === WALKING PROFILE (Backpacker Minimalist) ===
    {
      id: `test-profile-walking-${timestamp}`,
      name: 'Walkable City Backpacker',
      isDefault: false,
      travelStyle: 'backpacker',
      budgetRange: {
        min: 500,
        max: 1000,
        currency: 'USD',
      },
      activities: ['culture', 'food', 'history', 'photography'],
      foodPreferences: {
        dietaryRestrictions: [],
        cuisineTypes: ['local', 'street-food', 'budget'],
        foodBudgetLevel: 'low',
      },
      accommodation: {
        type: 'hostel',
        starRating: 2,
        minUserRating: 3.5,
      },
      transportation: {
        primaryMode: 'walking',
        maxWalkingDistance: 30,
      },
      groupSize: {
        preferred: 1,
        sizes: [1],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    },

    // === BUS PROFILE (Budget Long-Distance) ===
    {
      id: `test-profile-bus-${timestamp}`,
      name: 'Budget Bus Traveler',
      isDefault: false,
      travelStyle: 'budget',
      budgetRange: {
        min: 600,
        max: 1200,
        currency: 'USD',
      },
      activities: ['nature', 'food', 'adventure', 'local-culture'],
      foodPreferences: {
        dietaryRestrictions: [],
        cuisineTypes: ['local', 'casual'],
        foodBudgetLevel: 'low',
      },
      accommodation: {
        type: 'hostel',
        starRating: 2,
        minUserRating: 3.8,
      },
      transportation: {
        primaryMode: 'bus',
        maxWalkingDistance: 20,
      },
      groupSize: {
        preferred: 2,
        sizes: [2],
      },
      accessibility: {
        mobilityNeeds: false,
        visualNeeds: false,
        hearingNeeds: false,
      },
    },
  ];
};

export default generateTestPreferenceProfiles;
