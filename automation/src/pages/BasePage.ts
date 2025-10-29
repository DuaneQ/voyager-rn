import { Platform } from '../config/platform';

export abstract class BasePage {
  protected p(selectorWeb: string, selectorMobile: string) {
    return Platform.isWeb ? selectorWeb : selectorMobile;
  }

  async isDisplayed(selector: string) {
    const el = await $(selector);
    return el.isDisplayed();
  }

  /**
   * Get element by testID (React Native testID prop)
   * Works on both iOS and Android
   * Android: Uses resource-id
   * iOS: Uses accessibility id
   */
  protected async getElementByTestId(testId: string) {
    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    
    if (isAndroid) {
      // Android uses resource-id
      return await $(`android=new UiSelector().resourceId("${testId}")`);
    } else {
      // iOS uses accessibility id
      return await $(`~${testId}`);
    }
  }

  /**
   * Get element by accessibility ID
   * Works on both iOS and Android
   */
  protected async getElementByAccessibilityId(accessibilityId: string) {
    return await $(`~${accessibilityId}`);
  }

  /**
   * Get element by visible text
   * Platform-specific implementation
   */
  protected async getElementByText(text: string) {
    const isAndroid = (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
    
    if (isAndroid) {
      return await $(`android=new UiSelector().textContains("${text}")`);
    } else {
      return await $(`-ios predicate string:label CONTAINS "${text}" OR name CONTAINS "${text}"`);
    }
  }

  /**
   * Wait for element to be displayed
   */
  protected async waitForElement(element: WebdriverIO.Element, timeout: number = 10000) {
    await element.waitForDisplayed({ timeout });
  }

  /**
   * Scroll to element (if needed)
   */
  protected async scrollToElement(element: WebdriverIO.Element) {
    try {
      await element.scrollIntoView();
    } catch (e) {
      //ScrollIntoView may not work on mobile, use swipe instead
      console.log('[BasePage] scrollIntoView failed, element may already be visible');
    }
  }
}

