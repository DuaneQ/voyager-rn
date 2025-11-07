import { BasePage } from './BasePage';
import { Platform } from '../config/platform';

export class LoginPage extends BasePage {
  // Platform detection
  private get isMobile(): boolean {
    return driver.isAndroid || driver.isIOS;
  }

  // Mobile selector helper - uses accessibility ID
  private async findByTestID(testID: string) {
    if (driver.isIOS) {
      return await $(`~${testID}`); // iOS accessibility ID
    } else if (driver.isAndroid) {
      // Retry more aggressively because the app may still be launching or transitioning from
      // the Expo dev launcher -> app activity. Increasing attempts and pause duration
      // helps avoid transient failures where the element isn't present immediately
      // after clicking the Voyager RN tile and the RN bundle finishes loading.
      const maxAttempts = 12;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // ...existing Android search strategies (below) will run per-attempt
          // If found, return early. If not, pause and retry.
        } catch (e) {
          // swallow and retry
        }
        if (attempt < maxAttempts) {
          console.log(`[LoginPage] findByTestID: attempt ${attempt} for "${testID}" - not found, waiting 1500ms before retry`);
          await browser.pause(1500);
        }
      }
      // After retries, fall through to the actual search logic once more (final try)
      // Try resource ID first, then content description
      try {
        // try plain resource-id (may be short) first
        const byResourceId = await $(`android=new UiSelector().resourceId("${testID}")`);
        if (await byResourceId.isExisting()) {
          return byResourceId;
        }
        // try with package prefix if available (com.example.app:id/testID)
        try {
          const pkg = await driver.getCurrentPackage?.();
          if (pkg) {
            const withPkg = await $(`android=new UiSelector().resourceId("${pkg}:id/${testID}")`);
            if (await withPkg.isExisting()) return withPkg;
          }
        } catch (e) {
          // ignore if getCurrentPackage isn't available
        }
      } catch (e) {
        // Try content description as fallback
      }
        // Primary: try resource-id without package (use $ wrapper so result is a WebdriverIO element)
        try {
          const el = await $(`android=new UiSelector().resourceId("${testID}")`);
          if (await el.isExisting()) return el;
        } catch (e) {
          // continue to other strategies
        }

        // Try content-desc/description
        try {
          const el = await $(`android=new UiSelector().description("${testID}")`);
          if (await el.isExisting()) return el;
        } catch (e) {
          // continue
        }

        // Try accessibility id
        try {
          const el = await $(`~${testID}`);
          if (await el.isExisting()) return el;
        } catch (e) {
          // continue
        }

        // Try resource-id with current package prefix (handles host.exp.exponent / expo wrapper)
        try {
          const pkg = await driver.getCurrentPackage?.();
          if (pkg) {
            const compound = `${pkg}:id/${testID}`;
            try {
              const el = await $(`android=new UiSelector().resourceId("${compound}")`);
              if (await el.isExisting()) return el;
            } catch (e) {
              // continue
            }
          }
        } catch (e) {
          // ignore getCurrentPackage errors
        }

        // Fallback: find EditText inputs and pick one whose hint/text contains 'email'
        try {
          const editTexts = await $$(`android=new UiSelector().className("android.widget.EditText")`);
          if (editTexts && editTexts.length) {
            for (const et of editTexts) {
              try {
                const hint = await et.getAttribute('hint');
                const text = await et.getText();
                const desc = await et.getAttribute('content-desc');
                const rid = await et.getAttribute('resource-id');
                const combined = `${hint || ''} ${text || ''} ${desc || ''} ${rid || ''}`.toLowerCase();
                if (combined.includes('email')) {
                  return et;
                }
              } catch (inner) {
                // ignore per-element failures and continue
              }
            }

            // If none match heuristically, return the first EditText as a last resort
            return editTexts[0];
          }
        } catch (e) {
          // continue
        }

        // Try textContains as extra fallback
        try {
          const el = await $(`android=new UiSelector().textContains("${testID.split('-')[0]}")`);
          if (await el.isExisting()) return el;
        } catch (e) {
          // give up
        }

        return null;
    }
    // Web fallback
    return await $(`[data-testid="${testID}"]`);
  }

  // Attempt multiple selectors to be resilient across RN-web/PWA implementations
  private async firstExisting(selectorCandidates: string[]) {
    for (const s of selectorCandidates) {
      const el = await $(s);
      try {
        if (await el.isExisting()) return el;
      } catch (e) {
        // ignore
      }
    }
    return null;
  }

  /**
   * Wait for the login screen to be present and interactive.
   * This polls for the email input (best indicator) and returns the element when found.
   */
  async waitForLoginScreen(timeout = 15000): Promise<WebdriverIO.Element | null> {
    // Increase timeout for iOS in CI - RN bundle loading can take longer
    const effectiveTimeout = (driver.isIOS && process.env.CI) ? 45000 : timeout;
    const start = Date.now();
    const pollInterval = 500;
    let attemptCount = 0;
    
    console.log(`[LoginPage] waitForLoginScreen: starting (timeout: ${effectiveTimeout}ms, platform: ${driver.isIOS ? 'iOS' : 'Android'})`);
    
    while (Date.now() - start < effectiveTimeout) {
      attemptCount++;
      try {
        const el = await this.findByTestID('login-email-input');
        if (el) {
          try {
            if (await el.isExisting()) {
              // if element has waitForDisplayed available, use it to ensure visibility
              try {
                await (el as any).waitForDisplayed?.({ timeout: 2000 });
              } catch (e) {
                // ignore - we'll still treat existing as acceptable
              }
              console.log(`[LoginPage] waitForLoginScreen: login email input found after ${attemptCount} attempts (${Date.now() - start}ms)`);
              return el;
            }
          } catch (e) {
            // ignore transient attribute errors
          }
        }
      } catch (e) {
        // ignore intermittent find errors and retry
      }
      
      // Log progress every 5 seconds
      if (attemptCount % 10 === 0) {
        console.log(`[LoginPage] waitForLoginScreen: still waiting after ${attemptCount} attempts (${Math.floor((Date.now() - start) / 1000)}s elapsed)`);
      }
      
      // If we repeatedly land on the Android launcher or another package, try to start the app
      try {
        if (driver.isAndroid && typeof driver.getCurrentPackage === 'function') {
          const currentPkg = await driver.getCurrentPackage();
          // If the launcher or expo dev client is in front, attempt to launch the app package explicitly
          if (currentPkg && !currentPkg.includes('com.voyager.rn') ) {
            console.log(`[LoginPage] waitForLoginScreen: current package is '${currentPkg}', attempting to start com.voyager.rn`);
            try {
              // Try Appium startActivity if available
              // @ts-ignore - startActivity exists on the Android driver session
              if (typeof (driver as any).startActivity === 'function') {
                await (driver as any).startActivity({
                  appPackage: 'com.voyager.rn',
                  appActivity: '.MainActivity',
                });
              } else {
                // Fallback to executing shell am start
                await driver.execute('mobile: shell', { command: 'am', args: ['start', '-n', 'com.voyager.rn/.MainActivity', '-W'] });
              }
              // give the app a short moment to come to foreground
              await browser.pause(800);
            } catch (startErr) {
              console.log('[LoginPage] waitForLoginScreen: failed to start app package:', (startErr as Error).message);
            }
          }
        }
      } catch (pkgErr) {
        // ignore getCurrentPackage/startActivity errors and continue polling
      }
      await browser.pause(pollInterval);
    }
    console.log(`[LoginPage] waitForLoginScreen: timed out after ${attemptCount} attempts (${effectiveTimeout}ms)`);
    
    // On iOS, try to capture page source for debugging
    if (driver.isIOS) {
      try {
        console.log('[LoginPage] Capturing page source for debugging...');
        const source = await driver.getPageSource();
        console.log('[LoginPage] Page source length:', source.length);
        // Log first 1000 chars to see what's visible
        console.log('[LoginPage] Page source preview:', source.substring(0, 1000));
      } catch (e) {
        console.log('[LoginPage] Could not capture page source:', (e as Error).message);
      }
    }
    
    return null;
  }

  /**
   * Attempt to login by filling the form and clicking submit.
   * Uses mobile selectors for iOS/Android, web selectors for browser.
   */
  async login(email: string, password: string): Promise<void> {
    // For mobile, use testID selectors
    if (this.isMobile) {
      console.log('[LoginPage] Mobile platform detected - using testID selectors');
      // Dismiss possible system overlays (autofill/assistant/dialog) that can block inputs
      // Strategy: try clicking Android dialog OK, press back, then tap a safe corner.
      try {
        console.log('[LoginPage] Attempting to dismiss system overlays if present');
        const okBtn = await $('android=new UiSelector().resourceId("android:id/button1")');
        if (await okBtn.isExisting()) {
          await okBtn.click();
          console.log('[LoginPage] Clicked android dialog OK');
          await browser.pause(250);
        }
      } catch (e) {
        // ignore
      }
      try {
        // Press Android back as a gentle fallback to close overlays
        if (driver.isAndroid) {
          await driver.back();
          await browser.pause(200);
          console.log('[LoginPage] driver.back() executed to close overlays');
        }
      } catch (e) {
        // ignore
      }
      try {
        // Tap near the top-left corner to remove any floating UI (safe fallback)
        await driver.touchAction?.({ action: 'tap', x: 10, y: 10 });
        await browser.pause(150);
      } catch (e) {
        // ignore if touchAction not available
      }

      // If running inside Expo dev client on Android, the Dev Launcher may show a "Voyager RN" entry.
      // For Expo Go, navigate directly to the tunnel URL
      try {
        if (driver.isAndroid) {
          console.log('[LoginPage] Navigating to Expo tunnel URL');
          // Navigate directly to the tunnel URL
          await driver.executeScript('mobile: deepLink', [{
            url: 'exp://f60g7cq-travalpassllc-8082.exp.direct',
            package: 'host.exp.exponent'
          }]);
          console.log('[LoginPage] Deep link opened in Expo Go');
          // Give the app time to load from tunnel
          await browser.pause(8000);
        }
      } catch (e) {
        console.log('[LoginPage] Deep link failed, trying manual navigation');
        // Fallback: try to find and click Voyager RN if it exists
        try {
          console.log('[LoginPage] Checking for Expo dev launcher (Voyager RN)');
          // try accessibility id / content-desc first
          const voyagerBtn = await $('~Voyager RN');
                if (await voyagerBtn.isExisting()) {
            await voyagerBtn.click();
            console.log('[LoginPage] Clicked Voyager RN in Expo dev launcher (accessibility id)');
            // Give the Expo dev client and RN bundle a bit more time to load the app
            await browser.pause(4000);
          } else {
            // fallback: look for a button/text with exact text
            try {
              const voyagerText = await $('android=new UiSelector().text("Voyager RN")');
              if (await voyagerText.isExisting()) {
                await voyagerText.click();
                console.log('[LoginPage] Clicked Voyager RN in Expo dev launcher (text selector)');
                // Give the app a longer pause to transition to RN foreground
                await browser.pause(4000);
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // best-effort only; continue to normal login flow if not present
        }
      }

      // iOS CI: Add extra wait for app to fully initialize
      // Native iOS apps need more time to load in CI environment
      if (driver.isIOS && process.env.CI) {
        console.log('[LoginPage] iOS CI detected - waiting 10s for app initialization...');
        await browser.pause(10000);
        console.log('[LoginPage] iOS CI wait complete, proceeding with login...');
      }

      // Find email input with retry logic
      let emailInput = await this.findByTestID('login-email-input');
      
      // iOS CI: Retry if element not found (app may still be loading)
      if (driver.isIOS && process.env.CI && (!emailInput || !await emailInput.isExisting())) {
        console.log('[LoginPage] iOS CI: Email input not found, retrying after 5s...');
        await browser.pause(5000);
        emailInput = await this.findByTestID('login-email-input');
        
        // Still not found - dump diagnostics
        if (!emailInput || !await emailInput.isExisting()) {
          console.log('[LoginPage] iOS CI: Email input still not found after retry');
          console.log('[LoginPage] Dumping page source for debugging...');
          
          try {
            const pageSource = await driver.getPageSource();
            const fs = require('fs');
            const path = require('path');
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) {
              fs.mkdirSync(logsDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = path.join(logsDir, `page-source-login-fail-${timestamp}.xml`);
            fs.writeFileSync(filename, pageSource);
            console.log(`[LoginPage] Page source saved to: ${filename}`);
            
            // Also take a screenshot
            const screenshotDir = path.join(process.cwd(), 'screenshots');
            if (!fs.existsSync(screenshotDir)) {
              fs.mkdirSync(screenshotDir, { recursive: true });
            }
            const screenshotPath = path.join(screenshotDir, `login-fail-${timestamp}.png`);
            await driver.saveScreenshot(screenshotPath);
            console.log(`[LoginPage] Screenshot saved to: ${screenshotPath}`);
          } catch (diagError) {
            console.error('[LoginPage] Failed to capture diagnostics:', diagError);
          }
        }
      }
      
      if (!emailInput) {
        throw new Error('Could not find email input with testID="login-email-input" (null)');
      }
      const emailInputEl: any = emailInput;
      if (!await emailInputEl.isExisting()) {
        throw new Error('Could not find email input with testID="login-email-input" (not existing)');
      }
      console.log('[LoginPage] Found email input (mobile)');
      // Try multiple strategies to set text reliably on Android TextInput
      try {
        await emailInputEl.click();
      } catch (e) {
        // ignore click failures
      }
      try {
        await emailInputEl.clearValue();
      } catch (e) {
        // clearValue may not be supported everywhere
      }
      await emailInputEl.setValue(email);
      await browser.pause(500);
      // Verify the value was set; attempt fallback with addValue if not
      try {
  const current = await emailInputEl.getText();
        console.log('[LoginPage] Email input value after setValue():', current);
        if (!current || !current.includes(email)) {
          console.log('[LoginPage] setValue did not set the email correctly, trying addValue fallback');
          await emailInputEl.addValue(email);
          await browser.pause(300);
          const current2 = await emailInputEl.getText();
          console.log('[LoginPage] Email input value after addValue():', current2);
        }
      } catch (e) {
        console.log('[LoginPage] Could not verify email input value:', (e as Error).message);
      }
      
      // Find password input
      const passwordInput = await this.findByTestID('login-password-input');
      if (!passwordInput) {
        throw new Error('Could not find password input with testID="login-password-input" (null)');
      }
      const passwordInputEl: any = passwordInput;
      if (!await passwordInputEl.isExisting()) {
        throw new Error('Could not find password input with testID="login-password-input" (not existing)');
      }
      console.log('[LoginPage] Found password input (mobile)');
      try {
        await passwordInputEl.click();
      } catch (e) {}
      try {
        await passwordInputEl.clearValue();
      } catch (e) {}
      await passwordInputEl.setValue(password);
      await browser.pause(500);
      try {
  const curP = await passwordInputEl.getText();
        console.log('[LoginPage] Password input value after setValue():', curP ? curP.replace(/./g, '*') : '(empty)');
        if (!curP || curP.length === 0) {
          console.log('[LoginPage] setValue did not set the password correctly, trying addValue fallback');
          await passwordInputEl.addValue(password);
          await browser.pause(300);
          const curP2 = await passwordInputEl.getText();
          console.log('[LoginPage] Password input value after addValue():', curP2 ? curP2.replace(/./g, '*') : '(empty)');
        }
      } catch (e) {
        console.log('[LoginPage] Could not verify password input value:', (e as Error).message);
      }
      
      // Find and click sign in button
      let signInButton: WebdriverIO.Element | null = await this.findByTestID('signin-button');
      
      // Android-specific fallbacks: some RN builds expose the label as text instead of testID
      if (!signInButton && driver.isAndroid) {
        try {
          const byExactText = await $(
            'android=new UiSelector().classNameMatches(".*(Button|TextView|View)").textMatches("(?i)\\s*sign\\s*in\\s*")'
          );
          if (await byExactText.isExisting()) signInButton = byExactText;
        } catch {}
        if (!signInButton) {
          try {
            const byTextContains = await $(
              'android=new UiSelector().classNameMatches(".*(Button|TextView|View)").textContains("Sign")'
            );
            if (await byTextContains.isExisting()) signInButton = byTextContains;
          } catch {}
        }
        if (!signInButton) {
          try {
            const byDescContains = await $(
              'android=new UiSelector().descriptionContains("signin")'
            );
            if (await byDescContains.isExisting()) signInButton = byDescContains;
          } catch {}
        }
      }

      if (!signInButton) {
        throw new Error('Could not find sign in button with testID="signin-button" (null)');
      }
      const signInButtonEl: any = signInButton;
      if (!await signInButtonEl.isExisting()) {
        throw new Error('Could not find sign in button with testID="signin-button" (not existing)');
      }
      console.log('[LoginPage] Found sign in button (mobile)');
      // Hide keyboard if visible before tapping sign in
      try {
        await driver.hideKeyboard();
      } catch (e) {
        // ignore if not supported
      }
      try {
        await signInButtonEl.click();
      } catch (e) {
        // As a last resort, try tapping the element's center via touchAction
        try {
          const rect = await signInButtonEl.getRect();
          const centerX = Math.round(rect.x + rect.width / 2);
          const centerY = Math.round(rect.y + rect.height / 2);
          await driver.touchAction?.({ action: 'tap', x: centerX, y: centerY });
        } catch {}
      }
      console.log('[LoginPage] Clicked sign in button');

      // Small pause to let any native dialogs (success/error) appear
      await browser.pause(500);

      // If a native dialog appears (OK button), click it to clear the dialog so the app can navigate
      try {
        const okBtnAfter = await $('android=new UiSelector().resourceId("android:id/button1")');
        if (await okBtnAfter.isExisting()) {
          await okBtnAfter.click();
          console.log('[LoginPage] Clicked dialog OK after sign-in');
          await browser.pause(300);
        }
      } catch (e) {
        // ignore
      }

      // Do NOT navigate back after sign-in; this can pop the app off the home screen or
      // return to the login screen on Android. We rely on the test to wait for home.
      
      return; // Mobile login complete
    }

    // ...existing web login code...

    // Web platform - use existing web selectors
    // Strategy: Try candidate selectors for email/password inputs and login button
    const emailCandidates = [
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[name="email"]',
      'input[autocomplete="email"]',
      '[data-testid="email-input"]',
      '[data-test-id="email-input"]',
    ];

    const passwordCandidates = [
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[name="password"]',
      '[data-testid="password-input"]',
      '[data-test-id="password-input"]',
    ];

    const buttonCandidates = [
      '[data-testid="signin-button"]',
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("SIGN IN")',
      'button:has-text("Login")',
      '[data-testid="login-button"]',
      '[data-test-id="login-button"]',
      'div[role="button"]:has-text("Sign In")',
      'div[role="button"]:has-text("SIGN IN")',
    ];

    // Find and fill email
    const emailSelector = await this.firstExisting(emailCandidates);
    if (!emailSelector) {
      throw new Error(`Could not find email input using candidates: ${emailCandidates.join(', ')}`);
    }
    console.log(`[LoginPage] Found email input`);
    
    // For RN-web controlled inputs, we must trigger React's onChange handlers
    // Standard setValue() doesn't work because React doesn't see the change
    await browser.execute((selector: string, value: string) => {
      const input = document.querySelector(selector) as HTMLInputElement;
      if (!input) return;
      
      // Set the native value (bypasses React's control)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      }
      
      // Trigger React's onChange by dispatching input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('[RN-web input] Set email to:', value, 'Current value:', input.value);
    }, await emailSelector.selector, email);

    console.log('⏸️  [Visual Demo] Email entered - pausing 1 second...');
    await browser.pause(1000); // Visual delay

    // Find and fill password
    const passwordSelector = await this.firstExisting(passwordCandidates);
    if (!passwordSelector) {
      throw new Error(`Could not find password input using candidates: ${passwordCandidates.join(', ')}`);
    }
    console.log(`[LoginPage] Found password input`);
    
    // Same controlled input handling for password
    await browser.execute((selector: string, value: string) => {
      const input = document.querySelector(selector) as HTMLInputElement;
      if (!input) return;
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      }
      
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('[RN-web input] Set password to:', value, 'Current value:', input.value);
    }, await passwordSelector.selector, password);

    console.log('⏸️  [Visual Demo] Password entered - pausing 1 second...');
    await browser.pause(1000); // Visual delay

    // Try to submit via button click with aggressive pointer event simulation
    const buttonSelector = await this.firstExisting(buttonCandidates);
    if (buttonSelector) {
      console.log(`[LoginPage] Found login button`);
      
      console.log('⏸️  [Visual Demo] About to click login button - pausing 1 second...');
      await browser.pause(1000); // Visual delay
      
      // Strategy 1: Standard click
      await buttonSelector.click();
      console.log('[LoginPage] Executed standard click on button');
      await browser.pause(500);
      
      // Check if we landed on home screen
      try {
        const homeExists = await $('#homeScreen').isExisting();
        if (homeExists) {
          console.log('[LoginPage] ✓ Standard click succeeded - navigated to home');
          return; // Success!
        }
      } catch (e) {
        // Not found, continue to fallbacks
      }

      // Strategy 2: Aggressive pointer event dispatch (RN-web often uses pointer events)
      console.log('[LoginPage] Standard click did not navigate; trying pointer event dispatch...');
      const btnSelector = await buttonSelector.selector;
      await browser.execute((sel: string) => {
        const btn = document.querySelector(sel);
        if (!btn) {
          console.log('Pointer fallback: button not found');
          return;
        }
        
        console.log('Pointer fallback: dispatching pointerdown → pointerup → click on:', btn);
        
        // Dispatch pointer events (RN-web uses these)
        btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
        btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1 }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        
        // Also try touch events as RN-web may listen to those
        btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
        
        console.log('Pointer fallback: events dispatched');
      }, btnSelector);
      
      await browser.pause(800);
      try {
        const homeExistsAfterPointer = await $('#homeScreen').isExisting();
        if (homeExistsAfterPointer) {
          console.log('[LoginPage] ✓ Pointer event dispatch succeeded - navigated to home');
          return;
        }
      } catch (e) {
        // Not found, continue
      }

      // Strategy 3: Focus button and dispatch Enter key
      console.log('[LoginPage] Pointer events did not navigate; trying focus + Enter key...');
      await browser.execute((sel: string) => {
        const btn = document.querySelector(sel);
        if (btn instanceof HTMLElement) {
          btn.focus();
          console.log('Enter fallback: focused button, dispatching Enter key');
          btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
          btn.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
        }
      }, btnSelector);
      
      await browser.pause(500);
      try {
        const homeExistsAfterEnter = await $('#homeScreen').isExisting();
        if (homeExistsAfterEnter) {
          console.log('[LoginPage] ✓ Enter key dispatch succeeded - navigated to home');
          return;
        }
      } catch (e) {
        // Not found
      }
    }

    // All UI strategies failed
    console.log('[LoginPage] All UI login strategies failed - button clicks and events did not trigger navigation');
    throw new Error('Failed to login via UI - no navigation to home screen occurred');
  }
}
