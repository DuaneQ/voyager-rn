# useAIGeneration Hook - React Native Documentation

## Overview

The `useAIGeneration` hook provides AI-powered itinerary generation for React Native apps with full parity to the PWA Firebase Cloud Functions. It includes mobile-specific optimizations like retry logic, progress tracking, and input sanitization.

## Features

- **PWA Parity**: Exact same Firebase Cloud Function integration as the web app
- **Input Sanitization**: Comprehensive protection against injection attacks
- **Retry Logic**: Exponential backoff with configurable retry attempts
- **Progress Tracking**: Real-time generation progress with mobile-optimized UI feedback
- **Cancellation Support**: AbortController integration for user cancellation
- **Error Handling**: Detailed error types with recovery suggestions
- **Mobile Optimized**: Network resilience and offline-friendly patterns

## Installation

```typescript
import { useAIGeneration } from '../hooks/useAIGeneration';
```

## Basic Usage

```typescript
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { AIGenerationRequest } from '../types/AIGeneration';

const ItineraryGenerator: React.FC = () => {
  const { generateItinerary, progress, isGenerating, error, cancelGeneration } = useAIGeneration();

  const handleGenerateItinerary = async () => {
    const request: AIGenerationRequest = {
      destination: 'Paris, France',
      startDate: '2024-08-01',
      endDate: '2024-08-07',
      tripType: 'romantic',
      preferenceProfileId: 'user-profile-id',
      userInfo: {
        uid: 'user-123',
        username: 'traveler',
        gender: 'prefer-not-to-say',
        dob: '1990-01-01',
        status: 'single',
        sexualOrientation: 'prefer-not-to-say',
        email: 'user@example.com',
        blocked: []
      }
    };

    const result = await generateItinerary(request);
    
    if (result.success) {
      console.log('Generated itinerary:', result.itinerary);
      console.log('Saved with ID:', result.savedDocId);
    } else {
      console.error('Generation failed:', result.error);
    }
  };

  return (
    <View>
      <Button 
        title={isGenerating ? "Generating..." : "Generate Itinerary"} 
        onPress={handleGenerateItinerary}
        disabled={isGenerating}
      />
      
      {isGenerating && (
        <View>
          <Text>Progress: {progress.percent}%</Text>
          <Text>{progress.message}</Text>
          <Button title="Cancel" onPress={cancelGeneration} />
        </View>
      )}
      
      {error && (
        <Text style={{ color: 'red' }}>
          Error: {error.message}
        </Text>
      )}
    </View>
  );
};
```

## API Reference

### Hook Return Value

```typescript
interface UseAIGenerationReturn {
  generateItinerary: (request: AIGenerationRequest) => Promise<ItineraryResult>;
  progress: AIGenerationProgress;
  isGenerating: boolean;
  error: AIGenerationError | null;
  cancelGeneration: () => void;
}
```

#### `generateItinerary(request: AIGenerationRequest)`

Main function to generate an AI itinerary. Returns a Promise with the generation result.

**Parameters:**
- `request`: Complete itinerary generation request with user preferences

**Returns:**
- `Promise<ItineraryResult>`: Result containing success status, itinerary data, and error information

#### `progress: AIGenerationProgress`

Current generation progress with stage information:

```typescript
interface AIGenerationProgress {
  stage: 'initializing' | 'searching' | 'activities' | 'ai_generation' | 'saving' | 'done';
  percent: number;
  message?: string;
}
```

**Progress Stages:**
- `initializing` (10%): Preparing request and validation
- `searching` (30%): Finding flights and accommodations
- `activities` (50%): Discovering activities and attractions
- `ai_generation` (75%): AI creating personalized itinerary
- `saving` (90%): Saving itinerary to database
- `done` (100%): Generation complete

#### `isGenerating: boolean`

Boolean flag indicating whether generation is currently in progress.

#### `error: AIGenerationError | null`

Current error state with detailed error information:

```typescript
interface AIGenerationError extends Error {
  type: AIGenerationErrorType;
  code?: string;
  details?: any;
}

type AIGenerationErrorType = 
  | 'network_error'
  | 'validation_error'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'server_error'
  | 'timeout_error'
  | 'unknown_error';
```

#### `cancelGeneration()`

Cancels the current generation process and resets all state.

## Modal Integration

The complete AI Generation Modal component (`AIItineraryGenerationModal.tsx`) provides the full user interface matching the PWA exactly:

```typescript
import { AIItineraryGenerationModal } from '../components/modals/AIItineraryGenerationModal';

const MyScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  
  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text>Generate AI Itinerary</Text>
      </TouchableOpacity>
      
      <AIItineraryGenerationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGenerated={(result) => {
          console.log('Generated:', result);
          setModalVisible(false);
        }}
        userProfile={userProfile}
        preferences={travelPreferences}
      />
    </>
  );
};
```

## Advanced Usage

### Custom Retry Configuration

The hook uses default retry settings, but you can modify the retry behavior by updating the `DEFAULT_RETRY_CONFIG`:

```typescript
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,     // 1 second
  maxDelay: 10000,     // 10 seconds
  backoffMultiplier: 2
};
```

### Flight vs Non-Flight Logic

The hook automatically determines whether to include flights based on transportation preferences:

```typescript
// Flights will be included
const requestWithFlights: AIGenerationRequest = {
  destination: 'Tokyo, Japan',
  departure: 'New York, NY',
  // ...other fields
  travelPreferences: {
    transportation: { mode: 'flights' }
  }
};

// Flights will be skipped
const requestWithoutFlights: AIGenerationRequest = {
  destination: 'Boston, MA',
  // ...other fields  
  travelPreferences: {
    transportation: { mode: 'driving' }
  }
};
```

### Error Handling Patterns

```typescript
const { generateItinerary, error } = useAIGeneration();

const handleGeneration = async () => {
  const result = await generateItinerary(request);
  
  if (!result.success) {
    switch (error?.type) {
      case 'network_error':
        // Show network retry option
        break;
      case 'validation_error':
        // Show form validation errors
        break;
      case 'permission_denied':
        // Redirect to authentication
        break;
      case 'quota_exceeded':
        // Show upgrade to premium option
        break;
      default:
        // Generic error handling
    }
  }
};
```

### Progress UI Implementation

```typescript
const ProgressIndicator: React.FC<{ progress: AIGenerationProgress }> = ({ progress }) => {
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'initializing': return '#FFA500';
      case 'searching': return '#1E90FF';
      case 'activities': return '#32CD32';
      case 'ai_generation': return '#9370DB';
      case 'saving': return '#FF6347';
      case 'done': return '#228B22';
      default: return '#808080';
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <View style={{
        width: '100%',
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4
      }}>
        <View style={{
          width: `${progress.percent}%`,
          height: '100%',
          backgroundColor: getStageColor(progress.stage),
          borderRadius: 4
        }} />
      </View>
      <Text style={{ marginTop: 8, textAlign: 'center' }}>
        {progress.message}
      </Text>
    </View>
  );
};
```

## Input Sanitization

All requests are automatically sanitized using the `sanitizeAIGenerationRequest` function:

- **String Cleaning**: Removes HTML tags, script injections, and malicious content
- **Length Limits**: Enforces maximum lengths for text fields
- **Array Validation**: Validates and cleans array elements
- **Location Safety**: Sanitizes location names and addresses
- **Special Characters**: Preserves legitimate special characters while blocking dangerous ones

## Firebase Cloud Functions Integration

The hook maintains exact parity with PWA Firebase Cloud Functions:

### Function Calls
- `searchFlights`: Flight options and pricing
- `searchAccommodations`: Hotel recommendations
- `searchActivities`: Activities and attractions
- `generateItineraryWithAI`: AI-powered itinerary creation
- `createItinerary`: Save generated itinerary

### Data Flow
1. Input sanitization and validation
2. Parallel external API calls (flights, accommodations, activities)
3. AI generation with external data
4. Database persistence
5. Result return with metadata

## Performance Considerations

- **Parallel Execution**: External API calls run concurrently
- **Retry Logic**: Exponential backoff prevents overwhelming servers
- **Cancellation**: AbortController prevents memory leaks
- **Input Validation**: Early validation prevents unnecessary API calls
- **Mobile Optimizations**: Network-aware retry strategies

## Error Recovery

The hook provides several error recovery mechanisms:

1. **Automatic Retry**: Network errors are retried with exponential backoff
2. **Graceful Degradation**: Partial failures don't stop the entire process
3. **User Cancellation**: Clean cancellation with state reset
4. **Detailed Error Info**: Specific error types enable targeted recovery

## Testing

```typescript
// Mock the Firebase functions for testing
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn())
}));

// Test the hook behavior
import { renderHook, act } from '@testing-library/react-hooks';
import { useAIGeneration } from '../useAIGeneration';

test('should generate itinerary successfully', async () => {
  const { result } = renderHook(() => useAIGeneration());
  
  await act(async () => {
    const response = await result.current.generateItinerary(mockRequest);
    expect(response.success).toBe(true);
  });
});
```

## Migration from PWA

This React Native implementation maintains 100% API compatibility with the PWA version:

- Same Firebase Cloud Function calls
- Identical data structures
- Same error handling patterns
- Compatible progress tracking

The only additions are mobile-specific optimizations:
- Enhanced retry logic for mobile networks
- AbortController cancellation support
- Input sanitization for mobile keyboards
- Platform-aware error messages