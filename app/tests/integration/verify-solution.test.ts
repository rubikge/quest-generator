import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/lib/quest/store.js';
import { verifySolution } from '../../src/lib/quest/service.js';
import { assembleQuest } from '../../src/lib/quest/assemble.js';
import { SEED_TASKS } from '../../scripts/seed-tasks.js';
import type { Session } from '../../src/lib/quest/model/index.js';

// T024 — verifySolution against the emulator. Mission 1 = season-analysis ('892').
const store = createStore();
const now = () => '2026-06-20T12:00:00.000Z';

const baseSession = (): Session => ({
  sessionId: 'sess-verify',
  quest: assembleQuest({
    id: 'q-verify',
    theme: 'alien invasion',
    level: 'beginner',
    createdAt: now(),
    codingTasks: SEED_TASKS,
    narrative: { questIntro: 'i', framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' } },
  }),
  progress: { currentMission: 1, solvedMissions: [], won: false },
  // season-analysis: '1\n7\n13' => Winter / Summer / Error
  missionInputs: { '1': '1\n7\n13' },
  updatedAt: now(),
});

describe('verifySolution (emulator)', () => {
  beforeEach(async () => {
    await store.saveSession(baseSession());
  });

  it('advances currentMission on a correct submission', async () => {
    const res = await verifySolution(
      { sessionId: 'sess-verify', missionOrder: 1, output: 'Winter\nSummer\nError' },
      { store, now },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.correct).toBe(true);
      expect(res.progress.currentMission).toBe(2);
      expect(res.progress.solvedMissions).toEqual([1]);
    }
  });

  it('keeps state and allows retry on an incorrect submission', async () => {
    const res = await verifySolution(
      { sessionId: 'sess-verify', missionOrder: 1, output: 'totally wrong' },
      { store, now },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.correct).toBe(false);
      expect(res.progress.currentMission).toBe(1);
    }
  });

  it('rejects a submission for a locked (future) mission', async () => {
    const res = await verifySolution(
      { sessionId: 'sess-verify', missionOrder: 2, output: 'anything' },
      { store, now },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('LOCKED');
  });
});
