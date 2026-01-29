/**
 * Platform-agnostic expo-av adapter
 * 
 * On native: Re-exports the real expo-av
 * On web: Provides stubs (via expo-av.web.ts)
 */
export { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
export type { AVPlaybackStatusSuccess } from 'expo-av';
