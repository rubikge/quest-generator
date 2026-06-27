import { seedCatalog } from '../integration/_seed';

// Seed the catalog into the emulator before the e2e run. Uses the shared offline seed helper
// (curated ACMP tasks with real solver/test-gen code, hardcoded English prose — no Gemini call).
export default async function globalSetup() {
  const n = await seedCatalog();
  // eslint-disable-next-line no-console
  console.log(`[e2e] seeded ${n} tasks`);
}
