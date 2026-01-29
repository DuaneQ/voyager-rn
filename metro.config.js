/**
 * Metro configuration with platform-specific module resolution
 * Prevents expo-av from loading on web to avoid iOS Safari crash
 * 
 * Based on Expo docs: https://docs.expo.dev/guides/customizing-metro/#aliases
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Platform-specific alias for expo-av
const ALIASES = {
  'expo-av': path.resolve(__dirname, 'expo-av.web.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only apply alias on web platform
  if (platform === 'web' && ALIASES[moduleName]) {
    return context.resolveRequest(context, ALIASES[moduleName], platform);
  }
  
  // Use default resolution for everything else
  // Note: context.resolveRequest is Metro's default resolver function
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
