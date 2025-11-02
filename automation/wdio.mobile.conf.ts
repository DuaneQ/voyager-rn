import type { Options } from '@wdio/types';
import { config as baseConfig } from './wdio.conf';
import path from 'path';

const platform = process.env.PLATFORM || 'ios'; // 'ios' or 'android'

/**
 * Mobile capabilities for iOS testing
 * Using native iOS build (com.voyager.rn) for stable testing
 */
const iosCapabilities = {
  platformName: 'iOS',
  'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15 Pro',
  // Use SIMULATOR_ID from CI environment, fallback to local development UDID
  'appium:udid': process.env.SIMULATOR_ID || process.env.IOS_UDID || '69160A0F-7DDF-4442-8C1D-FBA991D48EA7',
  'appium:platformVersion': process.env.IOS_SIM_VERSION || '17.5',
  'appium:automationName': 'XCUITest',
  // Use app path for CI builds, bundleId for local development
  ...(process.env.CI && process.env.APP_PATH ? {
    'appium:app': process.env.APP_PATH
  } : {
    'appium:bundleId': 'com.voyager.rn'
  }),
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 300, // Increased for CI stability
  'appium:wdaLaunchTimeout': 180000, // Increased for CI stability
  'appium:useNewWDA': false,
  // Critical: Allow app more time to launch in CI before first command
  // iOS RN apps can take significantly longer to initialize the JS bundle
  'appium:appLaunchTimeout': process.env.CI ? 90000 : 30000, // 90s in CI (was 60s), 30s locally
  // Don't provide Metro port in CI - app should be pre-built
  ...(process.env.CI ? {} : {
    'appium:processArguments': {
      env: {
        RCT_METRO_PORT: String(process.env.METRO_PORT || process.env.RCT_METRO_PORT || '8081')
      }
    }
  }),
  // Reduce flakes due to iOS permission prompts
  'appium:autoAcceptAlerts': true,
  // Additional iOS stability settings for CI
  'appium:shouldUseSingletonTestManager': false,
  'appium:shouldUseTestManagerForVisibilityDetection': false,
  // Fix for XCUIApplicationProcess waitForQuiescence errors - comprehensive quiescence disabling
  'appium:shouldWaitForQuiescence': false,
  'appium:waitForQuiescence': false, // Alternative capability name
  'appium:waitForIdleTimeout': 0,
  'appium:animationCoolOffTimeout': 0,
  // Additional quiescence-related capabilities to ensure it's completely disabled
  'appium:waitForAnimations': false,
  'appium:commandTimeouts': {
    'default': 30000
  },
  // Conservative settings for better compatibility
  'appium:includeNonModalElements': false,
  'appium:snapshotMaxDepth': 50,
  // XCUITest 7.x specific settings for better compatibility
  'appium:simpleIsVisibleCheck': true, // Use simpler visibility check to avoid quiescence
  'appium:maxTypingFrequency': 60, // Reduce typing speed to avoid quiescence checks
  // Additional WebDriverAgent settings to prevent quiescence issues
  'appium:wdaStartupRetries': 2,
  'appium:wdaStartupRetryInterval': 10000,
  'appium:iosInstallPause': 5000, // Pause after app install before testing
  'appium:waitForAppScript': '', // Disable custom wait scripts that might trigger quiescence
  // Additional iOS-specific capabilities to avoid XCUITest compatibility issues
  'appium:skipLogCapture': true, // Skip log capture to avoid overhead
  'appium:wdaConnectionTimeout': 120000, // 2 minutes to connect to WDA
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
  // Use native Android app built with expo run:android (same as iOS approach)
  'appium:appPackage': 'com.voyager.rn',
  'appium:appActivity': '.MainActivity',
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
  
  // Appium service configuration - disable auto-start in CI since we start manually
  services: process.env.CI ? [] : [
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
  
  // Mobile tests may take longer, especially in CI
  waitforTimeout: process.env.CI ? 20000 : 15000,
  connectionRetryTimeout: process.env.CI ? 300000 : 180000, // 5 minutes in CI
  
  // Mocha timeout for mobile tests - longer in CI
  mochaOpts: {
    ui: 'bdd',
    timeout: process.env.CI ? 600000 : 300000, // 10 minutes in CI, 5 minutes locally
    // Ensure no implicit retries at the framework level
    retries: 0,
  },
  
  // Hooks
  beforeSession: function (config, capabilities, specs) {
    console.log(`\n🚀 Starting ${platform.toUpperCase()} test session...`);
    console.log(`📱 Device: ${capabilities['appium:deviceName']}`);
    console.log(`� UDID: ${capabilities['appium:udid']}`);
    console.log(`📦 Bundle ID: ${capabilities['appium:bundleId']}`);
    console.log(`🏗️  CI Mode: ${process.env.CI ? 'Yes' : 'No'}`);
    
    if (process.env.CI) {
      console.log(`🔧 Simulator ID: ${process.env.SIMULATOR_ID}`);
      console.log(`⚙️  Platform Version: ${capabilities['appium:platformVersion']}`);
    }
  },
  
  afterSession: function (config, capabilities, specs) {
    console.log(`\n✅ ${platform.toUpperCase()} test session completed\n`);
  },
};

export default config;
