/**
 * Metro configuration
 * Standard Expo Metro config without custom resolution
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
