const fs = require('fs');
const { remote } = require('webdriverio');

(async () => {
  try {
    const caps = {
      platformName: 'iOS',
      'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15 Pro',
      'appium:udid': process.env.SIMULATOR_ID || process.env.IOS_UDID || '69160A0F-7DDF-4442-8C1D-FBA991D48EA7',
      'appium:platformVersion': process.env.IOS_SIM_VERSION || '17.5',
      'appium:automationName': 'XCUITest',
      'appium:bundleId': 'com.voyager.rn',
      'appium:noReset': false,
      'appium:newCommandTimeout': 300,
      'appium:wdaLaunchTimeout': 180000,
    // Force a fresh WDA build in case the installed WDA is missing selectors
    // (this makes Appium rebuild/install a new WebDriverAgentRunner on the simulator)
    'appium:useNewWDA': true,
      'appium:autoAcceptAlerts': true,
    'appium:shouldWaitForQuiescence': false,
      'appium:waitForQuiescence': false,
      'appium:waitForIdleTimeout': 0,
      'appium:animationCoolOffTimeout': 0,
      'appium:waitForAnimations': false,
      'appium:shouldUseSingletonTestManager': false,
    };

    console.log('Connecting to Appium at http://127.0.0.1:4723');
    const client = await remote({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',
      logLevel: 'error',
      capabilities: caps,
    });

    console.log('Session created, getting page source...');
    const source = await client.getPageSource();

    const outPath = './debug-page-source-dump.xml';
    fs.writeFileSync(outPath, source);
    console.log(`Page source written to ${outPath} (length: ${source.length} bytes)`);

    await client.deleteSession();
    console.log('Session ended.');
  } catch (err) {
    console.error('ERROR:', err && (err.stack || err.message || err));
    process.exit(2);
  }
})();
