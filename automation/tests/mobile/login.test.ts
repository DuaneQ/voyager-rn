/// <reference types="@wdio/globals/types" />
/// <reference types="mocha" />
/**
 * @testName Login Flow - Mobile
 * @description Validates that a user can login with valid credentials (mobile).
 * @platforms ios, android
 * @priority P1
 * @tags smoke, auth, mobile
 */
import { LoginPage } from '../../src/pages/LoginPage';
import { validUser } from '../../src/mocks/userMockData';
import { WebdriverIODriver } from '../../src/drivers/WebdriverIODriver';

describe('Login Flow - Mobile', () => {
  const loginPage = new LoginPage();
  const driver = new WebdriverIODriver();
  const fs = require('fs');
  const path = require('path');

  // Ensure this suite never retries implicitly (some environments set Mocha retries globally)
  before(function () {
    try {
      // Mocha sets retries on the runnable via `this`
      // Use optional chaining in case the runtime doesn't expose it
      (this as any)?.retries?.(0);
      console.log('[Test][Config] Disabled Mocha retries for this suite');
    } catch {
      // no-op
    }
  });

  // Capture device logs and diagnostics to automation/logs on failure
  const captureLogs = async (label = 'failure') => {
    try {
      const baseDir = path.join(__dirname, '../../logs');
      fs.mkdirSync(baseDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Detect platform
      const caps: any = (browser.capabilities || {});
      const platformName = ((caps.platformName || caps.platform) || process.env.PLATFORM || '').toString().toLowerCase();
      const isAndroid = platformName.includes('android');
      const isIOS = platformName.includes('ios');
      
      console.log(`[Test][Diagnostics] Capturing logs for platform: ${platformName}`);
      
      if (isAndroid) {
        // Android-specific diagnostics
        // capture adb logcat via Appium mobile shell
        try {
          const logcat = await (browser as any).execute('mobile: shell', { command: 'logcat', args: ['-d', '-v', 'time'] });
          fs.writeFileSync(path.join(baseDir, `logcat-${label}-${timestamp}.txt`), logcat || '');
        } catch (e) {
          fs.writeFileSync(path.join(baseDir, `logcat-${label}-${timestamp}.txt`), `logcat capture failed: ${(e as Error).message}`);
        }

        // capture dumpsys activities
        try {
          const dumpsys = await (browser as any).execute('mobile: shell', { command: 'dumpsys', args: ['activity', 'activities'] });
          fs.writeFileSync(path.join(baseDir, `dumpsys-activities-${label}-${timestamp}.txt`), dumpsys || '');
        } catch (e) {
          fs.writeFileSync(path.join(baseDir, `dumpsys-activities-${label}-${timestamp}.txt`), `dumpsys capture failed: ${(e as Error).message}`);
        }

        // record current package
        try {
          const pkg = await (browser as any).getCurrentPackage?.();
          fs.writeFileSync(path.join(baseDir, `current-package-${label}-${timestamp}.txt`), pkg || '');
        } catch (e) {
          fs.writeFileSync(path.join(baseDir, `current-package-${label}-${timestamp}.txt`), `getCurrentPackage failed: ${(e as Error).message}`);
        }
      } else if (isIOS) {
        // iOS-specific diagnostics
        console.log('[Test][Diagnostics] Capturing iOS-specific diagnostics...');
        
        // Capture page source (UI hierarchy)
        try {
          const pageSource = await browser.getPageSource();
          const filename = path.join(baseDir, `page-source-${label}-${timestamp}.xml`);
          fs.writeFileSync(filename, pageSource);
          console.log(`[Test][Diagnostics] iOS page source saved to: ${filename}`);
        } catch (e) {
          console.error('[Test][Diagnostics] Failed to capture page source:', (e as Error).message);
          fs.writeFileSync(path.join(baseDir, `page-source-${label}-${timestamp}.txt`), 
            `Page source capture failed: ${(e as Error).message}`);
        }
        
        // Take screenshot
        try {
          const screenshotDir = path.join(baseDir, '../screenshots');
          fs.mkdirSync(screenshotDir, { recursive: true });
          const screenshotPath = path.join(screenshotDir, `${label}-${timestamp}.png`);
          await browser.saveScreenshot(screenshotPath);
          console.log(`[Test][Diagnostics] iOS screenshot saved to: ${screenshotPath}`);
        } catch (e) {
          console.error('[Test][Diagnostics] Failed to capture screenshot:', (e as Error).message);
        }
        
        // Get current activity/screen info
        try {
          const activity = await (browser as any).getCurrentActivity?.();
          if (activity) {
            fs.writeFileSync(path.join(baseDir, `current-activity-${label}-${timestamp}.txt`), activity);
          }
        } catch (e) {
          // getCurrentActivity might not be available on iOS, that's okay
          console.log('[Test][Diagnostics] getCurrentActivity not available on iOS (expected)');
        }
        
        // Capture app state
        try {
          const appState = await (browser as any).queryAppState(caps['appium:bundleId'] || 'com.voyager.rn');
          fs.writeFileSync(path.join(baseDir, `app-state-${label}-${timestamp}.txt`), 
            `App State: ${appState}\n` +
            `0 = not installed\n` +
            `1 = not running\n` +
            `2 = running in background/suspended\n` +
            `3 = running in background\n` +
            `4 = running in foreground`
          );
          console.log(`[Test][Diagnostics] iOS app state: ${appState}`);
        } catch (e) {
          console.error('[Test][Diagnostics] Failed to query app state:', (e as Error).message);
        }
      }
    } catch (err) {
      console.log('[Test][Diagnostics] captureLogs failed:', (err as Error).message);
    }
  };

  // Helper: clear app data for Android or remove/reset for iOS
  const clearAppData = async () => {
    try {
      const caps: any = (browser.capabilities || {});
      const platformName = ((caps.platformName || caps.platform) || process.env.PLATFORM || '').toString().toLowerCase();

      if (platformName.includes('android')) {
        // Prefer an explicit package from env/capabilities rather than the current foreground package
        // which may be the launcher when the device is idle. This avoids accidentally clearing the
        // launcher or other unrelated packages.
        const packageToClear = process.env.ANDROID_PACKAGE || (caps['appium:appPackage'] || 'com.voyager.rn');
        console.log('[Test][Setup/Teardown] Clearing Android app data for package:', packageToClear);
        await (browser as any).execute('mobile: shell', { command: 'pm', args: ['clear', packageToClear] });
        console.log('[Test][Setup/Teardown] Android app data cleared');
      } else if (platformName.includes('ios')) {
        const bundleId = (caps['appium:bundleId'] || process.env.IOS_BUNDLE_ID || '').toString();
        if (bundleId) {
          console.log('[Test][Setup/Teardown] Removing iOS app to clear simulator data for bundleId:', bundleId);
          await (browser as any).removeApp(bundleId);
        } else {
          console.log('[Test][Setup/Teardown] No iOS bundleId available - attempting driver.reset()');
          await (browser as any).reset?.();
        }
      }
    } catch (e) {
      console.log('[Test][Setup/Teardown] clearAppData failed:', (e as Error).message);
    }
  };

  // Clear data before each test to guarantee we always start on the login screen
  beforeEach(async () => {
    await clearAppData();
    // Launch the app (wdio/appium capabilities will install/launch)
    await driver.launchApp();
    console.log('[Test] App launched, waiting for RN bundle to load...');
    // Give RN more time on iOS - bundle loading can be slower
    const isIOS = (browser.capabilities as any)?.platformName?.toLowerCase().includes('ios');
    const initialWait = (isIOS && process.env.CI) ? 10000 : 5000;
    console.log(`[Test] Initial wait: ${initialWait}ms (iOS: ${isIOS}, CI: ${!!process.env.CI})`);
    await browser.pause(initialWait);
    
    // Wait for the login screen to be present with extended timeout for iOS
    const loginTimeout = (isIOS && process.env.CI) ? 45000 : 25000;
    console.log(`[Test] Waiting for login screen (timeout: ${loginTimeout}ms)...`);
    try {
      const found = await loginPage.waitForLoginScreen(loginTimeout);
      if (!found) {
        console.log('[Test] login screen did not appear in beforeEach - capturing logs');
        await captureLogs('before-launch-timeout');
        // Try to capture page source for debugging
        try {
          const source = await browser.getPageSource();
          console.log('[Test] Page source length:', source.length);
          console.log('[Test] Page source preview (first 1000 chars):', source.substring(0, 1000));
        } catch (e) {
          console.log('[Test] Could not get page source:', (e as Error).message);
        }
      } else {
        console.log('[Test] ✅ Login screen found successfully');
      }
    } catch (e) {
      console.log('[Test] waitForLoginScreen threw:', (e as Error).message);
    }
  });

  // Ensure a clean slate after each test and attempt to sign out if possible
  afterEach(async () => {
    try {
      // Attempt an in-app sign out if the UI exposes it (best-effort)
      const possibleSignOutSelectors = [
        '~signout-button',
        '~logout',
        '~logout-button',
        'android=new UiSelector().text("Sign Out")',
        'android=new UiSelector().textContains("Logout")',
      ];
      for (const sel of possibleSignOutSelectors) {
        try {
          const el = await $(sel);
          if (await el.isExisting()) {
            console.log('[Test][Teardown] Found sign-out element, attempting to tap:', sel);
            await el.click();
            await browser.pause(800);
            break;
          }
        } catch (e) {
          // ignore selector errors
        }
      }

      // Clear app data to remove any persisted session & close session
      // Wrap in try-catch to ensure teardown never fails the test (which could trigger retries)
      try {
        await clearAppData();
      } catch (e) {
        console.log('[Test][Teardown] clearAppData failed (non-fatal):', (e as Error).message);
      }
      try {
        await driver.closeApp();
      } catch (e) {
        console.log('[Test][Teardown] closeApp failed (non-fatal):', (e as Error).message);
      }
    } catch (e) {
      console.log('[Test][Teardown] afterEach encountered an unexpected error (non-fatal):', (e as Error).message);
    }
  });

  it('should successfully login with valid credentials', async () => {
    // Debug: Check what's on screen
    const pageSource = await browser.getPageSource();
    console.log('[Test] Page source available, length:', pageSource?.length || 0);
    
    // Save page source to file for inspection
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../../debug-page-source.xml');
    fs.writeFileSync(outputPath, pageSource);
    console.log('[Test] Page source saved to:', outputPath);
    
    // Detect platform and use platform-appropriate selectors
  const caps: any = (browser.capabilities || {});
  const platformName = ((caps.platformName || caps.platform) || process.env.PLATFORM || '').toString().toLowerCase();
  const isAndroid = platformName.includes('android');

    // Try to find any text inputs on screen (platform-specific)
    const allInputs = await $$(isAndroid ? 'android.widget.EditText' : 'XCUIElementTypeTextField');
    console.log('[Test] Found', allInputs.length, isAndroid ? 'Android EditText elements' : 'iOS TextField elements');

    // Try to find specific login elements with different strategies depending on platform
  console.log('[Test] Attempting to find login elements...');
    const strategies = isAndroid
      ? [
          { name: 'Resource ID', selector: 'android=new UiSelector().resourceId("login-email-input")' },
          { name: 'Content Description', selector: 'android=new UiSelector().description("login-email-input")' },
          { name: 'Accessibility ID', selector: '~login-email-input' },
          { name: 'Text Contains email', selector: 'android=new UiSelector().textContains("email")' }
        ]
      : [
          { name: 'Accessibility ID', selector: '~login-email-input' },
          { name: 'iOS Class Chain - textfield by name', selector: '-ios class chain:**/XCUIElementTypeTextField[`name=="login-email-input"`]'},
          { name: 'iOS Predicate - value contains email', selector: '-ios predicate string:value CONTAINS[c] "email"' }
        ];

    for (const strategy of strategies) {
      try {
        const element = await $(strategy.selector);
        const exists = await element.isExisting();
        console.log(`[Test] ${strategy.name}: ${exists ? 'FOUND' : 'NOT FOUND'}`);
      } catch (e) {
        console.log(`[Test] ${strategy.name}: ERROR -`, (e as Error).message);
      }
    }
    
    console.log('[Test] Attempting login with:', validUser.email);
    // Ensure the login screen is visible before attempting to interact
    const loginScreenEl = await loginPage.waitForLoginScreen(20000);
    if (!loginScreenEl) {
      console.log('[Test] login screen not visible before login attempt - capturing logs');
      await captureLogs('pre-login-missing');
      // continue so loginPage.login will fail with clearer error, but we saved logs
    }
    await loginPage.login(validUser.email, validUser.password);
    
    // Wait a moment for the login to process
    console.log('[Test] Login submitted, waiting for response...');
    await browser.pause(3000);
    
    // Check what's on screen after login attempt
    const pageSourceAfterLogin = await browser.getPageSource();
    console.log('[Test] Page source after login, length:', pageSourceAfterLogin?.length || 0);
    
    // Check for error messages
    try {
      const errorTexts = await $$(isAndroid ? 'android.widget.TextView' : 'XCUIElementTypeStaticText');
      console.log('[Test] Found', errorTexts.length, (isAndroid ? 'TextView' : 'StaticText'), 'elements on screen');

      for (let i = 0; i < Math.min(errorTexts.length, 10); i++) {
        const text = await errorTexts[i].getText();
        if (text && text.length > 0) {
          console.log(`[Test] Text ${i}: "${text}"`);
        }
      }
    } catch (e) {
      console.log('[Test] Error checking TextViews:', (e as Error).message);
    }
    
    // Try to find homeScreen with longer timeout and multiple strategies
    console.log('[Test] Looking for homeScreen element...');
    let homeEl: WebdriverIO.Element | null = null;
    if (isAndroid) {
      // Strategy 1: resource-id (preferred)
      try {
        const byResId = await $('android=new UiSelector().resourceIdMatches(".*id/homeScreen")');
        if (await byResId.isExisting()) {
          homeEl = byResId;
        }
      } catch {}
      // Strategy 2: accessibility id fallback
      if (!homeEl) {
        try {
          const byA11y = await $('~homeScreen');
          if (await byA11y.isExisting()) {
            homeEl = byA11y;
          }
        } catch {}
      }
    } else {
      // iOS: use accessibility id for the primary tab/button
      try {
        const byA11y = await $('~Find Matches');
        if (await byA11y.isExisting()) {
          homeEl = byA11y;
        }
      } catch {}
    }

    try {
      const target = homeEl ?? (await $(isAndroid ? '~homeScreen' : '~Find Matches'));
      await target.waitForDisplayed({ timeout: 30000 });
      console.log('[Test] ✅ Home screen displayed successfully!');
      await expect(target).toBeDisplayed();
    } catch (e) {
      console.log('[Test] ❌ Home screen not found after 15 seconds');
      // Capture device logs and diagnostics for debugging
      try {
        await captureLogs('after-login-failure');
      } catch (e) {
        console.log('[Test] captureLogs failed during failure handling:', (e as Error).message);
      }
      
      // Check if we're still on login screen
  const emailSelector = isAndroid ? 'android=new UiSelector().resourceId("login-email-input")' : '~login-email-input';
  const emailInput = await $(emailSelector);
  const stillOnLogin = await emailInput.isExisting();
      console.log('[Test] Still on login screen:', stillOnLogin);
      
      // Take final page source snapshot
      const finalPageSource = await browser.getPageSource();
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(__dirname, '../../debug-page-source-after-login.xml');
      fs.writeFileSync(outputPath, finalPageSource);
      console.log('[Test] Final page source saved to:', outputPath);
      
      throw e;
    }
  });

  after(async () => {
    // Attempt to clear persistent app storage so subsequent test runs start clean.
    try {
      const caps: any = (browser.capabilities || {});
      const platformName = ((caps.platformName || caps.platform) || '').toString().toLowerCase();

      if (platformName.includes('android')) {
        // Try to clear Android app data via pm clear using Appium mobile: shell
        try {
          const pkg = await (browser as any).getCurrentPackage?.();
          if (pkg) {
            console.log('[Test][Teardown] Clearing Android app data for package:', pkg);
            await (browser as any).execute('mobile: shell', { command: 'pm', args: ['clear', pkg] });
            console.log('[Test][Teardown] Android app data cleared');
          }
        } catch (e) {
          console.log('[Test][Teardown] Failed to clear Android app data:', (e as Error).message);
        }
      } else if (platformName.includes('ios')) {
        // For iOS simulator, prefer removing the app to clear simulator data. Bundle id may be provided in capabilities or env.
        try {
          const bundleId = (caps['appium:bundleId'] || process.env.IOS_BUNDLE_ID || '').toString();
          if (bundleId) {
            console.log('[Test][Teardown] Removing iOS app with bundleId:', bundleId);
            await (browser as any).removeApp(bundleId);
            console.log('[Test][Teardown] iOS app removed to clear data');
          } else {
            // Fallback: call reset to restart app and clear state where supported
            console.log('[Test][Teardown] No iOS bundleId available - attempting driver.reset()');
            await (browser as any).reset?.();
            console.log('[Test][Teardown] driver.reset() invoked');
          }
        } catch (e) {
          console.log('[Test][Teardown] Failed to clear iOS app data:', (e as Error).message);
        }
      }
    } catch (err) {
      console.log('[Test][Teardown] Teardown storage-clear attempt failed:', (err as Error).message);
    }

    // Close the app / session
    try {
      await driver.closeApp();
    } catch (e) {
      console.log('[Test][Teardown] driver.closeApp() failed (non-fatal):', (e as Error).message);
    }
  });
});
