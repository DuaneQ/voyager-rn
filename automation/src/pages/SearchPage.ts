import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  private get isAndroid(): boolean {
    return (browser.capabilities as any)?.platformName?.toLowerCase().includes('android');
  }

  /** Primary tab/button to open Search page */
  get searchTab() {
    return this.getElementByText('Search');
  }

  /** Generic create/add button (FAB or text) */
  get createButton() {
    return this.getElementByText('Create');
  }

  /** Manual itinerary option in creation flow */
  get manualItineraryOption() {
    return this.getElementByText('Manual Itinerary');
  }

  /** Itinerary name input - fallback strategies */
  async getItineraryNameInput() {
    try {
      // Try common testID first
      const el = await this.getElementByTestId('itinerary-name-input');
      if (el) return el;
    } catch (e) {}

    // Fallback: look for first text input on the page
    try {
      if (this.isAndroid) {
        const inputs = await $$('android=new UiSelector().className("android.widget.EditText")');
        if (inputs && inputs.length) return inputs[0];
      } else {
        const inputs = await $$('-ios predicate string:type == "XCUIElementTypeTextField"');
        if (inputs && inputs.length) return inputs[0];
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /** Save button for itinerary form */
  get saveItineraryButton() {
    return this.getElementByText('Save');
  }

  /** Navigate to Search page using bottom nav */
  async navigateToSearch() {
    console.log('[SearchPage] Navigating to Search tab...');
    try {
      const tab = await this.searchTab;
      await (tab as any).waitForDisplayed?.({ timeout: 5000 });
      await tab.click();
      console.log('[SearchPage] ✓ Search tab clicked');
    } catch (e) {
      console.log('[SearchPage] Could not click Search tab by text, trying fallback selectors');
      try {
        const alt = await this.getElementByAccessibilityId('Search');
        if (alt) {
          await (alt as any).click();
          console.log('[SearchPage] ✓ Search tab clicked via accessibility id');
        }
      } catch (e2) {
        console.log('[SearchPage] Navigation to Search failed:', (e2 as Error).message);
        throw e2;
      }
    }
    await browser.pause(1500);
  }

  /** Create a manual itinerary with a given name (happy path) */
  async createManualItinerary(name: string) {
    console.log('[SearchPage] Creating manual itinerary:', name);

    // Try clicking common create flows
    try {
      const createBtn = await this.createButton;
      if (createBtn) {
        await (createBtn as any).click();
        console.log('[SearchPage] Clicked Create button');
        await browser.pause(1000);
      }
    } catch (e) {
      console.log('[SearchPage] Create button not found via text');
    }

    // Try to pick manual itinerary option
    try {
      const manual = await this.manualItineraryOption;
      if (manual) {
        await (manual as any).waitForDisplayed?.({ timeout: 3000 });
        await (manual as any).click();
        console.log('[SearchPage] Selected Manual Itinerary option');
      }
    } catch (e) {
      console.log('[SearchPage] Manual Itinerary option not found by text, proceeding to attempt form open');
    }

    // Fill itinerary name
    const nameInput = await this.getItineraryNameInput();
    if (!nameInput) {
      throw new Error('Could not find itinerary name input');
    }
    try {
      await (nameInput as any).click();
    } catch {}
    try {
      await (nameInput as any).clearValue?.();
    } catch {}
    await (nameInput as any).setValue(name);
    await browser.pause(500);

    // Save itinerary
    try {
      const saveBtn = await this.saveItineraryButton;
      if (saveBtn) {
        await (saveBtn as any).click();
        console.log('[SearchPage] Clicked Save');
      }
    } catch (e) {
      console.log('[SearchPage] Save button not found (attempting fallback)');
      // Try pressing enter via keyboard if available
      try {
        await browser.keys(['Enter']);
      } catch (ke) {
        // ignore
      }
    }

    // Wait briefly for save to complete
    await browser.pause(1500);
  }

  /** Verify that an itinerary with the given name exists in the list */
  async verifyItinerarySaved(name: string) {
    console.log('[SearchPage] Verifying itinerary saved:', name);
    const isAndroid = this.isAndroid;
    try {
      // Search for list item by text
      if (isAndroid) {
        const el = await $(`android=new UiSelector().textContains("${name}")`);
        return await el.isExisting();
      } else {
        const el = await $(`-ios predicate string:label CONTAINS "${name}" OR name CONTAINS "${name}"`);
        return await el.isExisting();
      }
    } catch (e) {
      console.log('[SearchPage] Error during itinerary verification:', (e as Error).message);
      return false;
    }
  }
}
