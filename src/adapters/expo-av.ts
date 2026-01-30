/**
 * Platform-agnostic expo-av adapter
 * 
 * TEMPORARILY DISABLED FOR TESTING
 * On native: Re-exports the real expo-av
 * On web: Provides stubs (via expo-av.web.ts)
 */

// TEMPORARILY COMMENTED OUT FOR iOS SAFARI TESTING
// export { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
// export type { AVPlaybackStatusSuccess } from 'expo-av';

// Use web stub for all platforms temporarily
export { Video, ResizeMode, AVPlaybackStatus } from './expo-av.web';
export type { AVPlaybackStatusSuccess } from './expo-av.web';
