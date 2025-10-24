export abstract class BaseDriver {
  abstract launchApp(): Promise<void>;
  abstract closeApp(): Promise<void>;
  abstract takeScreenshot(name: string): Promise<void>;
}
