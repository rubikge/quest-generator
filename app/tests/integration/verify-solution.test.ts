import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getDb, createStore } from '../../src/lib/quest/store.js';
import { verifySolution } from '../../src/lib/quest/service.js';
import { assembleQuest } from '../../src/lib/quest/assemble.js';
import { buildBattery } from '../../src/lib/quest/grading/index.js';
import { runSolver } from '../../src/lib/quest/sandbox/index.js';
import { seedCatalog, SEED_TASKS } from './_seed.js';
import type { Session, Task } from '../../src/lib/quest/model/index.js';

// T024 — verifySolution against the emulator using the REAL battery + sandboxed solver: build a
// mission's input via the task's testGenSource, compute the correct combined output by running its
// solverSource in-sandbox, and confirm a correct submission advances while a wrong one does not.
// The learner's code is never executed — only the stored solver is, by the grader.
const store = createStore();
const now = () => '2026-06-20T12:00:00.000Z';

// Use the three lowest-complexity seeded tasks as the coding missions (any three ready tasks work).
const codingTasks: Task[] = [...SEED_TASKS].sort((a, b) => a.complexity - b.complexity).slice(0, 3);
const mission1Task = codingTasks[0]!;

// Generate mission 1's persisted battery input and the matching correct output up front.
const battery = buildBattery(mission1Task.testGenSource);
if (!battery.ok) throw new Error('failed to build battery for the test fixture');
const mission1Input = battery.battery.inputBlock;
const solved = runSolver(mission1Task.solverSource, mission1Input);
if (!solved.ok) throw new Error('failed to run reference solver for the test fixture');
const mission1Output = solved.output;

const baseSession = (): Session => ({
  sessionId: 'sess-verify',
  quest: assembleQuest({
    id: 'q-verify',
    theme: 'alien invasion',
    level: 'beginner',
    createdAt: now(),
    codingTasks,
    narrative: { questIntro: 'i', framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' } },
  }),
  progress: { currentMission: 1, solvedMissions: [], won: false },
  missionInputs: { '1': mission1Input },
  updatedAt: now(),
});

describe('verifySolution (emulator)', () => {
  beforeAll(async () => {
    await seedCatalog(); // verifySolution loads the task's solverSource via getTask().
  });

  beforeEach(async () => {
    await store.saveSession(baseSession());
  });

  it('advances currentMission on a correct (battery) submission', async () => {
    const res = await verifySolution(
      { sessionId: 'sess-verify', missionOrder: 1, output: mission1Output },
      { store, now },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.correct).toBe(true);
      expect(res.progress.currentMission).toBe(2);
      expect(res.progress.solvedMissions).toEqual([1]);
    }
  });

  it('accepts a whitespace-tolerant correct submission (trailing newline)', async () => {
    const res = await verifySolution(
      { sessionId: 'sess-verify', missionOrder: 1, output: `${mission1Output}\n` },
      { store, now },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.correct).toBe(true);
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
      expect(res.progress.solvedMissions).toEqual([]);
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

  it('rejects a submission when no battery input was requested (NO_INPUT)', async () => {
    await store.saveSession({ ...baseSession(), missionInputs: {} });
    const res = await verifySolution(
      { sessionId: 'sess-verify', missionOrder: 1, output: mission1Output },
      { store, now },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NO_INPUT');
  });
});
