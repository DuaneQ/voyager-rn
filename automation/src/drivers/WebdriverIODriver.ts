import { BaseDriver } from './BaseDriver';
import { browser } from '@wdio/globals';

export class WebdriverIODriver extends BaseDriver {
  async launchApp(): Promise<void> {
    // For mobile runs with Appium, capabilities and wdio runner will launch the app.
    // For web, navigate to the app url if provided via env var.
    if (process.env.APP_URL) {
      await browser.url(process.env.APP_URL);
    }
  }

  async closeApp(): Promise<void> {
    try {
      await browser.deleteSession();
    } catch (err) {
      // runner might handle session lifecycle; ignore safe errors
    }
  }

  async takeScreenshot(name: string): Promise<void> {
    const png = await browser.takeScreenshot();
    // Downstream test runner can store the screenshot; here we keep it simple
    // In Node you could write to disk: fs.writeFileSync(`${name}.png`, png, 'base64')
    return Promise.resolve();
  }
}
