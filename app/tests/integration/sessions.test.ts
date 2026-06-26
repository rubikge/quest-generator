import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/lib/quest/store.js';
import { assembleQuest } from '../../src/lib/quest/assemble.js';
import { SEED_TASKS } from './_seed.js';
import type { Session, Task } from '../../src/lib/quest/model/index.js';

// T007 — Session document round-trip against the Firestore emulator, including the new optional
// detectedLanguage + missionInputs fields (US3).
describe('store: session round-trip (emulator)', () => {
  const store = createStore();
  const codingTasks: Task[] = [...SEED_TASKS].sort((a, b) => a.complexity - b.complexity).slice(0, 3);

  const quest = assembleQuest({
    id: 'q-int',
    theme: 'космос',
    level: 'beginner',
    createdAt: '2026-06-20T12:00:00.000Z',
    codingTasks,
    narrative: {
      detectedLanguage: 'ru',
      questIntro: 'intro',
      framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' },
    },
  });

  it('saves and reads back a valid session incl. detectedLanguage + missionInputs', async () => {
    const session: Session = {
      sessionId: 'sess-roundtrip',
      quest,
      progress: { currentMission: 2, solvedMissions: [1], won: false },
      missionInputs: { '1': '2 3\n4 5', '2': '10\n20' },
      detectedLanguage: 'ru',
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    await store.saveSession(session);

    const read = await store.getSession('sess-roundtrip');
    expect(read).not.toBeNull();
    expect(read?.sessionId).toBe('sess-roundtrip');
    expect(read?.quest?.missions).toHaveLength(4);
    expect(read?.progress.currentMission).toBe(2);
    expect(read?.progress.solvedMissions).toEqual([1]);
    expect(read?.detectedLanguage).toBe('ru');
    expect(read?.missionInputs).toEqual({ '1': '2 3\n4 5', '2': '10\n20' });
  });

  it('round-trips a session without the optional fields', async () => {
    const session: Session = {
      sessionId: 'sess-minimal',
      quest: null,
      progress: { currentMission: 1, solvedMissions: [], won: false },
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    await store.saveSession(session);

    const read = await store.getSession('sess-minimal');
    expect(read).not.toBeNull();
    expect(read?.quest).toBeNull();
    expect(read?.detectedLanguage).toBeUndefined();
    expect(read?.missionInputs).toBeUndefined();
  });

  it('returns null for an unknown session', async () => {
    expect(await store.getSession('does-not-exist')).toBeNull();
  });
});
