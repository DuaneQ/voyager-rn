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

const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

const GOOGLE_MAPS_PLACEHOLDER = '${GOOGLE_MAPS_API_KEY}';

function injectManifestPlaceholder(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const existingMetaDataIndex = application['meta-data'].findIndex(
      item => item.$['android:name'] === 'com.google.android.geo.API_KEY'
    );

    const metaDataEntry = {
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': GOOGLE_MAPS_PLACEHOLDER
      }
    };

    if (existingMetaDataIndex !== -1) {
      application['meta-data'][existingMetaDataIndex] = metaDataEntry;
    } else {
      application['meta-data'].push(metaDataEntry);
    }

    return config;
  });
}

function injectBuildGradleManifestPlaceholder(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('GOOGLE_MAPS_API_KEY')) {
      return config;
    }

    const defaultConfigRegex = /defaultConfig\s*\{\n/;
    const placeholderLine =
      '        manifestPlaceholders = [GOOGLE_MAPS_API_KEY: (System.getenv("GOOGLE_PLACES_API_KEY") ?: System.getenv("REACT_APP_GOOGLE_PLACES_API_KEY") ?: "")]\n';

    if (!defaultConfigRegex.test(contents)) {
      throw new Error('Unable to find defaultConfig block in android/app/build.gradle for Google Maps placeholder injection.');
    }

    config.modResults.contents = contents.replace(defaultConfigRegex, (match) => `${match}${placeholderLine}`);
    return config;
  });
}

/**
 * Add Google Places API key meta-data to AndroidManifest.xml
 * 
 * @param {object} config - Expo config object
 * @returns {object} Modified config object
 */
function withGooglePlacesAndroid(config) {
  config = injectManifestPlaceholder(config);
  config = injectBuildGradleManifestPlaceholder(config);
  return config;
}

module.exports = withGooglePlacesAndroid;
