import { LoginPage } from '../../src/pages/LoginPage';
import { SearchPage } from '../../src/pages/SearchPage';
import { performQuickUILogin } from '../../src/helpers/authHelper';

describe('Create Manual Itinerary - HAPPY PATH', () => {
  let loginPage: LoginPage;
  let searchPage: SearchPage;

  beforeEach(async () => {
    loginPage = new LoginPage();
    searchPage = new SearchPage();

    console.log('\n=== CREATE MANUAL ITINERARY TEST - HAPPY PATH ===');
  });

  afterEach(async () => {
    console.log('=== Create Manual Itinerary Test Complete ===\n');
  });

  it('creates and saves a manual itinerary', async () => {
    console.log('[Test] Step 1: Perform quick UI login');
    const loginOk = await performQuickUILogin('usertravaltest@gmail.com', '1234567890');
    if (!loginOk) {
      console.log('[Test] Quick UI login failed, attempting UI login via LoginPage');
      await loginPage.login('usertravaltest@gmail.com', '1234567890');
    }

    // Wait for app to stabilize
    await browser.pause(2000);

    console.log('[Test] Step 2: Navigate to Search Page');
    await searchPage.navigateToSearch();

    // Generate unique itinerary name
    const itineraryName = `ManualItinerary-${Date.now()}`;
    console.log('[Test] Step 3: Create manual itinerary with name:', itineraryName);
    await searchPage.createManualItinerary(itineraryName);

    console.log('[Test] Step 4: Verify itinerary saved');
    const saved = await searchPage.verifyItinerarySaved(itineraryName);
    if (!saved) {
      console.log('[Test] Verification failed - listing page source for debugging');
      try {
        const src = await browser.getPageSource();
        console.log('[Test] Page Source snippet:', src.substring(0, 2000));
      } catch (e) {
        console.log('[Test] Could not capture page source:', (e as Error).message);
      }
    }

    expect(saved).toBe(true);
    console.log(`[Test] ✅ Successfully created and verified itinerary: ${itineraryName}`);
  });
});
