import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, createStore } from '../../src/lib/quest/store.js';
import { selectQuestTasks, splitTiers } from '../../src/lib/quest/task-selection/index.js';
import { seedCatalog, SEED_TASKS } from './_seed.js';
import type { Level, Task } from '../../src/lib/quest/model/index.js';

// T030 — difficulty-tiered selection end-to-end against the emulator: seed ready tasks of varied
// complexity, read them back via getReadyTasks(), and confirm selectQuestTasks(level) returns 3
// tasks drawn from the correct complexity tier per level (beginner→lowest third, expert→highest).
describe('tiered selection (emulator)', () => {
  const store = createStore();
  let ready: Task[];
  // Deterministic picker so we can assert exactly which tier the picks come from (order preserved).
  const pickFirst = (pool: Task[], n: number) => pool.slice(0, n);

  beforeAll(async () => {
    const snap = await getDb().collection('tasks').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    await seedCatalog();
    ready = await store.getReadyTasks();
  });

  it('seeds 10 ready tasks of varied complexity', () => {
    expect(ready).toHaveLength(SEED_TASKS.length);
    expect(ready.every((t) => t.ready)).toBe(true);
    const complexities = new Set(ready.map((t) => t.complexity));
    expect(complexities.size).toBeGreaterThan(1);
  });

  it('splits the ready tasks into three non-overlapping, complexity-ordered tiers', () => {
    const tiers = splitTiers(ready);
    expect(tiers.beginner.length).toBeGreaterThanOrEqual(3);
    expect(tiers.intermediate.length).toBeGreaterThanOrEqual(3);
    expect(tiers.expert.length).toBeGreaterThanOrEqual(3);

    const maxBeginner = Math.max(...tiers.beginner.map((t) => t.complexity));
    const minIntermediate = Math.min(...tiers.intermediate.map((t) => t.complexity));
    const maxIntermediate = Math.max(...tiers.intermediate.map((t) => t.complexity));
    const minExpert = Math.min(...tiers.expert.map((t) => t.complexity));
    expect(maxBeginner).toBeLessThanOrEqual(minIntermediate);
    expect(maxIntermediate).toBeLessThanOrEqual(minExpert);
  });

  it.each(['beginner', 'intermediate', 'expert'] as Level[])(
    '%s selects 3 tasks from the matching tier',
    (level) => {
      const tiers = splitTiers(ready);
      const tierIds = new Set(tiers[level].map((t) => t.taskId));

      const result = selectQuestTasks({ tasks: ready, level, pick: pickFirst });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.codingTasks).toHaveLength(3);
        for (const t of result.codingTasks) expect(tierIds.has(t.taskId)).toBe(true);
      }
    },
  );

  it('beginner picks have lower complexity than expert picks', () => {
    const beginner = selectQuestTasks({ tasks: ready, level: 'beginner', pick: pickFirst });
    const expert = selectQuestTasks({ tasks: ready, level: 'expert', pick: pickFirst });
    expect(beginner.ok && expert.ok).toBe(true);
    if (beginner.ok && expert.ok) {
      const maxBeginner = Math.max(...beginner.codingTasks.map((t) => t.complexity));
      const minExpert = Math.min(...expert.codingTasks.map((t) => t.complexity));
      expect(maxBeginner).toBeLessThan(minExpert);
    }
  });
});
