import { defineConfig, devices } from '@playwright/test';
import { availableParallelism, freemem } from 'node:os';

// Each worker (headless Chromium plus its SwiftShader GPU process) takes
// about 600 MB here. Playwright's default of half the cores (8 on this
// machine) ran out of memory when ~3.7 GB was free: free RAM fell to 19 MB,
// pages failed with net::ERR_INSUFFICIENT_RESOURCES or "Target crashed",
// and random tests (ui-ar-interaction in Phase 6b) failed. Locally, size the
// pool to free memory with headroom; CI keeps the default.
const localWorkers = Math.max(
  1,
  Math.min(
    Math.floor(availableParallelism() / 2),
    Math.floor(freemem() / (900 * 1024 * 1024)),
  ),
);

// Tests run against the production build (`pnpm build` first). The Vite dev
// server stalled module fetches for 60 s at random points under parallel load.
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/unit/**',
  fullyParallel: true,
  workers: process.env.CI ? undefined : localWorkers,
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
