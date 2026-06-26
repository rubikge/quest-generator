import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, createStore } from '../../src/lib/quest/store.js';
import { generateQuest, type ServiceDeps, type WeaveFn } from '../../src/lib/quest/service.js';
import { seedCatalog } from './_seed.js';

// T016 — generateQuest server-action logic against the emulator + a STUBBED weave flow (no Gemini).
// The stub localizes the canonical English prose by prefixing it, so we can assert the localized
// fields flow through into the assembled quest (US3) while grading stays catalog-driven.
const stubWeave: WeaveFn = async ({ tasks }) => ({
  detectedLanguage: 'ru',
  questIntro: 'РУ intro',
  framings: { 1: 'РУ f1', 2: 'РУ f2', 3: 'РУ f3', 4: 'РУ deploy' },
  localized: Object.fromEntries(
    tasks.map((t, i) => [
      (i + 1) as 1 | 2 | 3,
      {
        title: `РУ ${t.title}`,
        statement: `РУ ${t.statement}`,
        inputFormat: `РУ ${t.inputFormat}`,
        outputFormat: `РУ ${t.outputFormat}`,
      },
    ]),
  ) as NonNullable<Awaited<ReturnType<WeaveFn>>['localized']>,
});

const deps = (overrides: Partial<ServiceDeps> = {}): ServiceDeps => ({
  store: createStore(),
  weave: stubWeave,
  now: () => '2026-06-20T12:00:00.000Z',
  newId: () => 'q-generated',
  ...overrides,
});

describe('generateQuest (emulator + stub flow)', () => {
  beforeAll(async () => {
    const snap = await getDb().collection('tasks').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    await seedCatalog(); // 10 ready tasks across all three complexity tiers.
  });

  it.each(['beginner', 'intermediate', 'expert'] as const)(
    'builds a 4-mission %s quest and persists fresh progress + detected language',
    async (level) => {
      const sessionId = `sess-gen-${level}`;
      const result = await generateQuest({ sessionId, theme: 'космос', level }, deps());
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { quest } = result;
      expect(quest.missions).toHaveLength(4);
      expect(quest.level).toBe(level);
      expect(quest.questIntro).toBe('РУ intro');

      const coding = quest.missions.filter((m) => m.kind === 'coding');
      expect(coding).toHaveLength(3);
      // Localized prose from the stub flows into the assembled coding missions (US3).
      for (const m of coding) {
        expect(m.title.startsWith('РУ ')).toBe(true);
        expect(m.statement.startsWith('РУ ')).toBe(true);
        expect(m.storyFraming.startsWith('РУ ')).toBe(true);
        // Catalog-authoritative fields are preserved (not localized).
        expect(m.taskId).toBeTruthy();
        expect(m.sourceUrl).toContain('id_task=');
        expect(m.examples).not.toBeNull();
      }

      // The deployment mission is order 4, carries no task, and lists the solved ids + links.
      const deployment = quest.missions.find((m) => m.kind === 'deployment')!;
      expect(deployment.order).toBe(4);
      expect(deployment.taskId).toBeNull();
      for (const c of coding) expect(deployment.statement).toContain(c.taskId!);

      const session = await createStore().getSession(sessionId);
      expect(session?.progress.currentMission).toBe(1);
      expect(session?.progress.solvedMissions).toEqual([]);
      expect(session?.progress.won).toBe(false);
      expect(session?.detectedLanguage).toBe('ru');
      expect(session?.missionInputs).toEqual({});
    },
  );

  it('returns INSUFFICIENT_TASKS when a tier lacks 3 ready tasks', async () => {
    // Empty the catalog so no tier can be filled, then attempt a generation.
    const snap = await getDb().collection('tasks').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    try {
      const result = await generateQuest(
        { sessionId: 'sess-gen-empty', theme: 'fantasy', level: 'expert' },
        deps(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('INSUFFICIENT_TASKS');
    } finally {
      await seedCatalog(); // restore for any later-running specs (fileParallelism is off).
    }
  });
});
