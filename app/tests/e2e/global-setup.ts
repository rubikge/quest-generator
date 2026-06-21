import { seedTasks } from '../../scripts/seed-tasks';

// Seed the catalog into the emulator before the e2e run (3 beginner tasks).
export default async function globalSetup() {
  const n = await seedTasks();
  // eslint-disable-next-line no-console
  console.log(`[e2e] seeded ${n} tasks`);
}
