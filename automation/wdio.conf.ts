export const config = {
  runner: 'local',
  specs: ['./tests/web/**/*.test.ts'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          // Use HEADLESS env var to control headless mode (default: true)
          ...(process.env.HEADLESS !== 'false' ? ['--headless=new'] : []),
          '--no-sandbox',
          '--disable-gpu',
          '--window-size=1280,1024',
          '--start-maximized'
        ]
      }
    }
  ],
  logLevel: 'info',
  bail: 0,
  baseUrl: process.env.APP_URL || 'http://localhost:19006',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: ['devtools'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000
  },
  reporters: ['spec'],
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: './tsconfig.json'
    }
  }
};

export default config;
