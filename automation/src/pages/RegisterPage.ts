import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  get emailInput() {
    return $(this.p('#email', '~registerEmailInput'));
  }

  get passwordInput() {
    return $(this.p('#password', '~registerPasswordInput'));
  }

  get displayNameInput() {
    return $(this.p('#displayName', '~registerDisplayNameInput'));
  }

  get registerButton() {
    return $(this.p('#registerButton', '~registerButton'));
  }

  async register(email: string, password: string, displayName: string) {
    await (await this.emailInput).waitForDisplayed({ timeout: 5000 });
    await (await this.emailInput).setValue(email);
    await (await this.passwordInput).setValue(password);
    await (await this.displayNameInput).setValue(displayName);
    await (await this.registerButton).click();
  }
}
