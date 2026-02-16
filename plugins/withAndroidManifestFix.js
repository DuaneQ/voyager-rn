/**
 * Expo Config Plugin: Fix Android manifest merger conflicts
 * 
 * expo-notifications and @react-native-firebase/messaging both declare
 * the same meta-data entries (default_notification_channel_id, default_notification_color).
 * This plugin adds tools:replace attributes to resolve the merger conflict.
 * 
 * Must be listed AFTER expo-notifications in app.json plugins.
 * Uses withAndroidManifest to modify the in-memory manifest representation.
 * If entries already exist (from expo-notifications), adds tools:replace to them.
 * If entries don't exist yet, creates them with tools:replace pre-set.
 */

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    // Ensure xmlns:tools is declared
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Initialize meta-data array if needed
    if (!app['meta-data']) {
      app['meta-data'] = [];
    }
    const metaData = app['meta-data'];

    // Find existing entries and add tools:replace
    let foundChannelId = false;
    let foundColor = false;

    for (const entry of metaData) {
      const name = entry.$?.['android:name'];
      if (name === 'com.google.firebase.messaging.default_notification_channel_id') {
        entry.$['tools:replace'] = 'android:value';
        foundChannelId = true;
      }
      if (name === 'com.google.firebase.messaging.default_notification_color') {
        entry.$['tools:replace'] = 'android:resource';
        foundColor = true;
      }
    }

    // If entries don't exist yet (expo-notifications adds them later via dangerousMod),
    // create them with tools:replace pre-set so the manifest merger doesn't fail
    if (!foundChannelId) {
      metaData.push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_channel_id',
          'android:value': 'default',
          'tools:replace': 'android:value',
        },
      });
    }

    if (!foundColor) {
      metaData.push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_color',
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource',
        },
      });
    }

    return config;
  });
};
