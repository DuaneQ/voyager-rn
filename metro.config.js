const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Override resolver to alias expo-av on web platform
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // On web platform, resolve expo-av to an empty stub to prevent loading
    if (platform === 'web' && moduleName === 'expo-av') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'expo-av.web.js'),
      };
    }
    
    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;