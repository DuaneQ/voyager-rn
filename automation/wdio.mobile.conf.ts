import type { Options } from '@wdio/types';
import { config as baseConfig } from './wdio.conf';
import path from 'path';

const platform = process.env.PLATFORM || 'ios'; // 'ios' or 'android'

/**
 * Mobile capabilities for iOS testing
 * Note: For Expo apps, you need to build the app first with:
 *   npx expo prebuild --platform ios
 *   cd ios && xcodebuild -workspace *.xcworkspace -scheme * -sdk iphonesimulator
 */
const iosCapabilities = {
  platformName: 'iOS',
  'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 17 Pro',
  // Use UDID to target specific booted simulator instead of creating a new one
  'appium:udid': process.env.IOS_UDID || '69160A0F-7DDF-4442-8C1D-FBA991D48EA7',
  'appium:platformVersion': process.env.IOS_SIM_VERSION || '18.6',
  'appium:automationName': 'XCUITest',
  // Path to .app file - update this after building the app
  'appium:app': process.env.IOS_APP_PATH || '/Users/icebergslim/projects/voyager-RN/ios/build/Build/Products/Debug-iphonesimulator/VoyagerRN.app',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 240,
  'appium:wdaLaunchTimeout': 120000,
  'appium:useNewWDA': false,
  // Provide Metro port to the app so Debug builds know where to fetch the JS bundle
  'appium:processArguments': {
    env: {
      RCT_METRO_PORT: String(process.env.METRO_PORT || process.env.RCT_METRO_PORT || '8081')
    }
  },
  // Reduce flakes due to iOS permission prompts
  'appium:autoAcceptAlerts': true,
};

/**
 * Mobile capabilities for Android testing
 * Note: For Expo apps, you need to build the APK first with:
 *   npx expo prebuild --platform android
 *   cd android && ./gradlew assembleDebug
 */
const androidCapabilities = {
  'appium:platformName': 'Android',
  'appium:platformVersion': '16.0',
  'appium:deviceName': 'Pixel_9a',
  'appium:automationName': 'UiAutomator2',
  // Auto-start emulator if AVD name is provided
  ...(process.env.ANDROID_AVD_NAME ? { 'appium:avd': process.env.ANDROID_AVD_NAME } : {}),
  ...(process.env.ANDROID_AVD_LAUNCH_TIMEOUT ? { 'appium:avdLaunchTimeout': Number(process.env.ANDROID_AVD_LAUNCH_TIMEOUT) } : {}),
  ...(process.env.ANDROID_AVD_READY_TIMEOUT ? { 'appium:avdReadyTimeout': Number(process.env.ANDROID_AVD_READY_TIMEOUT) } : {}),
  'appium:app': path.resolve(
    __dirname,
    '../android/app/build/outputs/apk/debug/app-debug.apk'
  ),
  'appium:autoGrantPermissions': true,
  // Use noReset for faster tests, rely on afterEach cleanup for isolation
  'appium:fullReset': false,
  'appium:noReset': true, // Back to true for speed and stability
};

export const config = {
  ...baseConfig,
  
  // Override specs to point to mobile tests
  specs: ['./tests/mobile/**/*.test.ts'],
  
  // Use appropriate capabilities based on PLATFORM env var
  capabilities: [platform === 'ios' ? iosCapabilities : androidCapabilities],
  
  // Appium service configuration
  services: [
    ['appium', {
      command: 'appium',
      args: {
        relaxedSecurity: true,
        // Log to file for debugging
        log: './appium.log',
        // Allow CORS for web views
        allowCors: true,
      },
    }],
  ],
  
  // Appium server runs on port 4723 by default
  port: 4723,
  
  // Mobile tests may take longer
  waitforTimeout: 15000,
  connectionRetryTimeout: 180000,
  
  // Mocha timeout for mobile tests
  mochaOpts: {
    ui: 'bdd',
    timeout: 300000, // 5 minutes for mobile tests
    // Ensure no implicit retries at the framework level
    retries: 0,
  },
  
  // Hooks
  beforeSession: function (config, capabilities, specs) {
    console.log(`\n🚀 Starting ${platform.toUpperCase()} test session...`);
    console.log(`📱 Device: ${capabilities['appium:deviceName']}`);
    console.log(`📦 App: ${capabilities['appium:app']}`);
  },
  
  afterSession: function (config, capabilities, specs) {
    console.log(`\n✅ ${platform.toUpperCase()} test session completed\n`);
  },
};

export default config;
