import { describe, it, expect, beforeAll } from 'vitest';
import { createStore } from '../../src/lib/quest/store.js';
import { generateQuest, type ServiceDeps } from '../../src/lib/quest/service.js';
import { seedTasks } from '../../scripts/seed-tasks.js';
import type { QuestNarrative } from '../../src/lib/quest/assemble.js';

// T016 — generateQuest server-action logic against the emulator + stubbed flow.
const stubWeave = async (): Promise<QuestNarrative> => ({
  questIntro: 'Earth needs you.',
  framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' },
});

const deps = (): ServiceDeps => ({
  store: createStore(),
  weave: stubWeave,
  now: () => '2026-06-20T12:00:00.000Z',
  newId: () => 'q-generated',
});

describe('generateQuest (emulator + stub flow)', () => {
  beforeAll(async () => {
    await seedTasks(); // 3 beginner tasks
  });

  it('builds a 4-mission beginner quest and persists fresh progress', async () => {
    const result = await generateQuest({ sessionId: 'sess-gen-1', theme: 'alien invasion', level: 'beginner' }, deps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quest.missions).toHaveLength(4);
      expect(result.quest.level).toBe('beginner');
      expect(result.quest.missions[3]?.kind).toBe('deployment');
    }
    const session = await createStore().getSession('sess-gen-1');
    expect(session?.progress.currentMission).toBe(1);
    expect(session?.progress.solvedMissions).toEqual([]);
  });

  it('returns INSUFFICIENT_TASKS for a level with no tasks', async () => {
    const result = await generateQuest({ sessionId: 'sess-gen-2', theme: 'fantasy', level: 'advanced' }, deps());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INSUFFICIENT_TASKS');
  });
});
