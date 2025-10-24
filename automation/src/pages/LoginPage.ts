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
      // Try resource ID first, then content description
      try {
        const byResourceId = await $(`android=new UiSelector().resourceId("${testID}")`);
        if (await byResourceId.isExisting()) {
          return byResourceId;
        }
      } catch (e) {
        // Try content description as fallback
      }
      return await $(`android=new UiSelector().description("${testID}")`);
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
   * Attempt to login by filling the form and clicking submit.
   * Uses mobile selectors for iOS/Android, web selectors for browser.
   */
  async login(email: string, password: string): Promise<void> {
    // For mobile, use testID selectors
    if (this.isMobile) {
      console.log('[LoginPage] Mobile platform detected - using testID selectors');
      
      // Find email input
      const emailInput = await this.findByTestID('login-email-input');
      if (!await emailInput.isExisting()) {
        throw new Error('Could not find email input with testID="login-email-input"');
      }
      console.log('[LoginPage] Found email input (mobile)');
      await emailInput.setValue(email);
      await browser.pause(500);
      
      // Find password input
      const passwordInput = await this.findByTestID('login-password-input');
      if (!await passwordInput.isExisting()) {
        throw new Error('Could not find password input with testID="login-password-input"');
      }
      console.log('[LoginPage] Found password input (mobile)');
      await passwordInput.setValue(password);
      await browser.pause(500);
      
      // Find and click sign in button
      const signInButton = await this.findByTestID('signin-button');
      if (!await signInButton.isExisting()) {
        throw new Error('Could not find sign in button with testID="signin-button"');
      }
      console.log('[LoginPage] Found sign in button (mobile)');
      await signInButton.click();
      console.log('[LoginPage] Clicked sign in button');
      
      return; // Mobile login complete
    }

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
