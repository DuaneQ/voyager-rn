/**
 * Expo Config Plugin: Force Firebase native initialization in AppDelegate
 *
 * Problem: @react-native-firebase/app's own Expo plugin fails to inject
 * [FIRApp configure] / FirebaseApp.configure() into Expo SDK 54's AppDelegate
 * in some build environments, causing RNFB to throw:
 *   "No Firebase App '[DEFAULT]' has been created - call firebase.initializeApp()"
 *
 * This plugin runs AFTER the RNFB plugin and ensures the call is present.
 * It is idempotent — if the call is already there it does nothing.
 *
 * Supports both:
 *   - ObjC++ AppDelegate.mm  (Expo SDK managed workflow default)
 *   - Swift AppDelegate.swift (New Architecture / custom setups)
 */

const { withAppDelegate } = require('@expo/config-plugins');

module.exports = function withFirebaseAppDelegateFix(config) {
  return withAppDelegate(config, (config) => {
    let { contents } = config.modResults;
    const isSwift = config.modResults.language === 'swift';

    if (isSwift) {
      // Already injected — nothing to do
      if (contents.includes('FirebaseApp.configure()')) {
        return config;
      }

      // Add `import Firebase` after `import UIKit`
      if (!contents.includes('import Firebase')) {
        contents = contents.replace(
          'import UIKit',
          'import UIKit\nimport Firebase'
        );
      }

      // Insert FirebaseApp.configure() before the return super.application call
      contents = contents.replace(
        'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
        'FirebaseApp.configure()\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)'
      );
    } else {
      // ObjC / ObjC++ (Expo SDK 54 managed workflow uses AppDelegate.mm)

      // Already injected — nothing to do
      if (contents.includes('[FIRApp configure]')) {
        return config;
      }

      // Add `@import Firebase;` after the AppDelegate.h import
      if (
        !contents.includes('@import Firebase') &&
        !contents.includes('<Firebase/Firebase.h>')
      ) {
        contents = contents.replace(
          '#import "AppDelegate.h"',
          '#import "AppDelegate.h"\n@import Firebase;'
        );
      }

      // Insert [FIRApp configure]; before the return [super application:...] call
      if (
        contents.includes(
          'return [super application:application didFinishLaunchingWithOptions:launchOptions];'
        )
      ) {
        contents = contents.replace(
          'return [super application:application didFinishLaunchingWithOptions:launchOptions];',
          '[FIRApp configure];\n  return [super application:application didFinishLaunchingWithOptions:launchOptions];'
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};
