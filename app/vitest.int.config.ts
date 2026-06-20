import { defineConfig } from 'vitest/config';

// Integration suite: runs against the Firestore emulator (launched via `firebase
// emulators:exec`) and may make real network calls. Kept separate from the fast unit run.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
