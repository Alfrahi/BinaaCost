const { defineConfig, devices } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8080',

    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  globalSetup: require.resolve('./tests/e2e/globalSetup.cjs'),
  globalTeardown: require.resolve('./tests/e2e/globalTeardown.cjs'),
});