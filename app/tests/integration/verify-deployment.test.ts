import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/lib/quest/store.js';
import { verifyDeployment } from '../../src/lib/quest/service.js';
import { assembleQuest } from '../../src/lib/quest/assemble.js';
import { SEED_TASKS } from './_seed.js';
import type { Session, Task } from '../../src/lib/quest/model/index.js';

// T031 — verifyDeployment (US4): the README win condition now requires BOTH every quest task id AND
// a link to each task's original ACMP page. Uses an injected fetch (deterministic) plus the BAD_URL /
// UNREACHABLE / MISSING_LINKS paths. No live network call.
const store = createStore();
const now = () => '2026-06-20T12:00:00.000Z';

// Three coding missions; capture their ids + source links for the README fixtures.
const codingTasks: Task[] = [...SEED_TASKS].sort((a, b) => a.complexity - b.complexity).slice(0, 3);
const taskIds = codingTasks.map((t) => t.taskId);
const sourceUrls = codingTasks.map((t) => t.sourceUrl);

const finalMissionSession = (): Session => ({
  sessionId: 'sess-deploy',
  quest: assembleQuest({
    id: 'q-deploy',
    theme: 'alien invasion',
    level: 'beginner',
    createdAt: now(),
    codingTasks,
    narrative: { questIntro: 'i', framings: { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4' } },
  }),
  progress: { currentMission: 4, solvedMissions: [1, 2, 3], won: false },
  updatedAt: now(),
});

/** A fetch stub returning the given README body on the main/README.md path, else 404. */
const readmeFetch = (body: string) =>
  (async (url: string) =>
    String(url).includes('/main/README.md')
      ? { ok: true, text: async () => body }
      : { ok: false, text: async () => '' }) as unknown as typeof fetch;

describe('verifyDeployment (emulator)', () => {
  beforeEach(async () => {
    await store.saveSession(finalMissionSession());
  });

  it('wins when the README lists all task ids AND links each ACMP source', async () => {
    const readme = `Solved task ids: ${taskIds.join(', ')}\n\n` + sourceUrls.map((u) => `- ${u}`).join('\n');
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'https://github.com/u/r' },
      { store, now, fetchImpl: readmeFetch(readme) },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.won).toBe(true);
      expect(res.progress.won).toBe(true);
      expect(res.progress.solvedMissions).toContain(4);
    }
  });

  it('reports MISSING_LINKS when the ids are present but a source link is absent', async () => {
    // Include the ids and the first two links, but omit the third link.
    const readme = `Solved: ${taskIds.join(', ')}\n` + sourceUrls.slice(0, 2).map((u) => `- ${u}`).join('\n');
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'https://github.com/u/r' },
      { store, now, fetchImpl: readmeFetch(readme) },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('MISSING_LINKS');
      if (res.code === 'MISSING_LINKS') {
        expect(res.missingLinks).toContain(sourceUrls[2]);
        expect(res.missingTaskIds).toEqual([]);
      }
    }
  });

  it('reports MISSING_LINKS when the README has neither ids nor links', async () => {
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'https://github.com/u/r' },
      { store, now, fetchImpl: readmeFetch('A README with no task references at all.') },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('MISSING_LINKS');
      if (res.code === 'MISSING_LINKS') {
        expect(res.missingLinks).toEqual(sourceUrls);
      }
    }
  });

  it('rejects a malformed link with BAD_URL', async () => {
    const res = await verifyDeployment(
      { sessionId: 'sess-deploy', repoUrl: 'not-a-url' },
      { store, now, fetchImpl: readmeFetch('') },
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
});
