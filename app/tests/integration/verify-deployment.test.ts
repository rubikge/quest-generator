import { describe, it, expect, beforeAll } from 'vitest';
import { createStore } from '../../src/lib/quest/store.js';
import { verifyDeployment } from '../../src/lib/quest/service.js';
import { assembleQuest } from '../../src/lib/quest/assemble.js';
import { SEED_TASKS } from '../../scripts/seed-tasks.js';
import type { Session } from '../../src/lib/quest/model/index.js';

// T031 — verifyDeployment: one REAL raw-README fetch (public repo) + the BAD_URL /
// UNREACHABLE paths (deterministic injected fetch). Quest task ids: 892, 757, 907.
const store = createStore();
const now = () => '2026-06-20T12:00:00.000Z';

const finalMissionSession = (): Session => ({
  sessionId: 'sess-deploy',
  quest: assembleQuest({
    id: 'q-deploy',
    theme: 'alien invasion',
    level: 'beginner',
    createdAt: now(),
    codingTasks: SEED_TASKS,
    narrative: { questIntro: 'i', framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' } },
  }),
  progress: { currentMission: 4, solvedMissions: [1, 2, 3], won: false },
  updatedAt: now(),
});

describe('verifyDeployment (emulator)', () => {
  beforeAll(async () => {
    await store.saveSession(finalMissionSession());
  });

  it('REAL fetch: a reachable public repo whose README lacks the task ids => MISSING_IDS', async () => {
    // github/gitignore has a README.md on its default branch that will not contain 892/757/907.
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'https://github.com/github/gitignore' },
      { store, now },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('MISSING_IDS');
  });

  it('rejects a malformed link with BAD_URL', async () => {
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'not-a-url' },
      { store, now, fetchImpl: (async () => ({ ok: false, text: async () => '' })) as unknown as typeof fetch },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BAD_URL');
  });

  it('reports UNREACHABLE when no README can be fetched', async () => {
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'https://github.com/u/r' },
      { store, now, fetchImpl: (async () => ({ ok: false, text: async () => '' })) as unknown as typeof fetch },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('UNREACHABLE');
  });

  it('wins when the README contains all task ids (injected fetch)', async () => {
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'https://github.com/u/r' },
      {
        store,
        now,
        fetchImpl: (async (url: string) =>
          String(url).includes('/main/README.md')
            ? { ok: true, text: async () => 'Solved: 892, 757, 907' }
            : { ok: false, text: async () => '' }) as unknown as typeof fetch,
      },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.won).toBe(true);
  });
});
