import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/lib/quest/store.js';
import { assembleQuest } from '../../src/lib/quest/assemble.js';
import { SEED_TASKS } from '../../scripts/seed-tasks.js';
import type { Session } from '../../src/lib/quest/model/index.js';

// T007 — Session document round-trip against the Firestore emulator.
describe('store: session round-trip (emulator)', () => {
  const store = createStore();

  const quest = assembleQuest({
    id: 'q-int',
    theme: 'alien invasion',
    level: 'beginner',
    createdAt: '2026-06-20T12:00:00.000Z',
    codingTasks: SEED_TASKS,
    narrative: { questIntro: 'intro', framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' } },
  });

  it('saves and reads back a valid session', async () => {
    const session: Session = {
      sessionId: 'sess-roundtrip',
      quest,
      progress: { currentMission: 1, solvedMissions: [], won: false },
      missionInputs: {},
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    await store.saveSession(session);
    const read = await store.getSession('sess-roundtrip');
    expect(read).not.toBeNull();
    expect(read?.quest?.missions).toHaveLength(4);
    expect(read?.sessionId).toBe('sess-roundtrip');
  });

  it('returns null for an unknown session', async () => {
    expect(await store.getSession('does-not-exist')).toBeNull();
  });
});
