import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default run targets the framework-agnostic domain core (runnable without
    // Firestore emulator, Gemini, or a browser). Integration/e2e suites are
    // opt-in via their own configs/scripts once those services are available.
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
