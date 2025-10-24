import { Platform } from '../config/platform';

export abstract class BasePage {
  protected p(selectorWeb: string, selectorMobile: string) {
    return Platform.isWeb ? selectorWeb : selectorMobile;
  }

  async isDisplayed(selector: string) {
    const el = await $(selector);
    return el.isDisplayed();
  }
}
