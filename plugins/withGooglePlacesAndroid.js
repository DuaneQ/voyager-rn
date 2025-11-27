/**
 * Expo Config Plugin: Add Google Places API Key to Android
 * 
 * This plugin automatically adds the Google Places API key to AndroidManifest.xml
 * during the prebuild process, ensuring it persists across rebuilds.
 * 
 * Usage:
 * 1. Add to app.json:
 *    "plugins": ["./plugins/withGooglePlacesAndroid"]
 * 2. Run: npx expo prebuild
 * 
 * The API key will be automatically injected into:
 * android/app/src/main/AndroidManifest.xml
 */

const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Get Google Places API key from environment or use default
 */
function getGooglePlacesApiKey() {
  // Priority: ENV variable > hardcoded fallback
  return process.env.GOOGLE_PLACES_API_KEY || 
         process.env.REACT_APP_GOOGLE_PLACES_API_KEY ||
         'AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8'; // Default dev key
}

/**
 * Add Google Places API key meta-data to AndroidManifest.xml
 * 
 * @param {object} config - Expo config object
 * @returns {object} Modified config object
 */
function withGooglePlacesAndroid(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Ensure meta-data array exists
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const apiKey = getGooglePlacesApiKey();

    // Check if Google Places API key already exists
    const existingMetaDataIndex = application['meta-data'].findIndex(
      item => item.$['android:name'] === 'com.google.android.geo.API_KEY'
    );

    const metaDataEntry = {
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': apiKey
      }
    };

    if (existingMetaDataIndex !== -1) {
      // Update existing entry
      application['meta-data'][existingMetaDataIndex] = metaDataEntry;
    } else {
      // Add new entry
      application['meta-data'].push(metaDataEntry);
    }
    return config;
  });
}

module.exports = withGooglePlacesAndroid;
