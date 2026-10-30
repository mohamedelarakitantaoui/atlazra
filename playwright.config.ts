import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.PW_BUILT
      ? 'node --experimental-strip-types scripts/serve-built.ts'
      : 'pnpm exec astro dev --host 127.0.0.1 --port 4321',
    env: { PORT: '4321' },
    timeout: 120000,
    url: 'http://127.0.0.1:4321/fr/',
    reuseExistingServer: !process.env.CI,
  },
});
