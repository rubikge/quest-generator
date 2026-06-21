import { defineConfig } from '@playwright/test';

// E2E runs under `firebase emulators:exec` (provides FIRESTORE_EMULATOR_HOST). The Next dev
// server is started with QUEST_E2E_STUB=1 so narrative + deployment checks are deterministic
// (plan C2). Tasks are seeded in globalSetup.
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    launchOptions: { args: ['--no-sandbox'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'next dev -p 3100',
    url: 'http://localhost:3100',
    timeout: 120000,
    reuseExistingServer: false,
    env: { ...process.env, QUEST_E2E_STUB: '1' } as Record<string, string>,
  },
});
