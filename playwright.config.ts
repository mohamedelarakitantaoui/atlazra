import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build (`pnpm build` first). The Vite dev
// server stalled module fetches for 60 s at random points under parallel load.
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/unit/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/unit/**', '**/garden.spec.ts'],
    },
    // SwiftShader frame timing is only reliable without other pages competing.
    {
      name: 'garden',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/garden.spec.ts',
      fullyParallel: false,
      dependencies: ['chromium'],
    },
  ],
  webServer: {
    command: 'node tests/serve.ts',
    env: {
      PORT: '4321',
      CONTACT_SIGNING_SECRET: 'local-playwright-signing-secret',
      RESEND_API_KEY: 'test-only',
      CONTACT_TO_EMAIL: 'recipient@example.test',
      CONTACT_FROM_EMAIL: 'sender@example.test',
    },
    timeout: 60000,
    url: 'http://127.0.0.1:4321/fr/',
    reuseExistingServer: false,
  },
});
