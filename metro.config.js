/**
 * Minimal Metro configuration that delegates to Expo's default Metro config.
 * This file allows `npx react-native start` to find a Metro configuration
 * in environments where it's missing. It's safe to remove later if not needed.
 */
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
