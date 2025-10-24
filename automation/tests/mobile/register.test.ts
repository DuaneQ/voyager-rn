/// <reference types="@wdio/globals/types" />
/// <reference types="mocha" />
/**
 * @testName Register Flow - Mobile
 * @description Validates that a user can register.
 * @platforms ios, android
 * @priority P1
 * @tags smoke, auth, mobile
 */
import { RegisterPage } from '../../src/pages/RegisterPage';
import { newUser } from '../../src/mocks/userMockData';
import { WebdriverIODriver } from '../../src/drivers/WebdriverIODriver';

describe('Register Flow - Mobile', () => {
  const registerPage = new RegisterPage();
  const driver = new WebdriverIODriver();

  before(async () => {
    await driver.launchApp();
  });

  it('should register a new user', async () => {
    await registerPage.register(newUser.email, newUser.password, newUser.displayName);
    const confirm = await $('~registrationSuccess');
    await confirm.waitForDisplayed({ timeout: 8000 });
    await expect(confirm).toBeDisplayed();
  });

  after(async () => {
    await driver.closeApp();
  });
});
