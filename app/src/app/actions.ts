'use server';

import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import type { Level } from '../lib/quest/model/index';
import { createStore } from '../lib/quest/store';
import {
  generateQuest,
  getMissionInput,
  verifySolution,
  verifyDeployment,
  type ServiceDeps,
  type WeaveFn,
} from '../lib/quest/service';
import { liveWeaveQuest } from '../ai/flows/weave-quest';

const E2E_STUB = process.env.QUEST_E2E_STUB === '1';

const stubWeave: WeaveFn = async ({ tasks }) => ({
  detectedLanguage: 'en',
  questIntro: 'A storyline unfolds across four missions...',
  framings: { 1: 'Mission 1: the story continues.', 2: 'Mission 2: the story continues.', 3: 'Mission 3: the story continues.', 4: 'Mission 4: deploy to finish.' },
  // Keep the canonical English content (no real translation in the e2e stub).
  localized: Object.fromEntries(
    tasks.map((t, i) => [
      (i + 1) as 1 | 2 | 3,
      { title: t.title, statement: t.statement, inputFormat: t.inputFormat, outputFormat: t.outputFormat },
    ]),
  ) as NonNullable<Awaited<ReturnType<WeaveFn>>['localized']>,
});

// Deterministic README fetch for e2e: pretend the repo's README lists every seeded task id AND a
// link to each task's original ACMP page (a superset, so whichever 3 tasks the quest picks, the
// README satisfies both the id check and the source-link check in verifyDeployment).
const E2E_SEED_IDS = ['1', '2', '3', '4', '6', '7', '9', '10', '11', '24'];
const stubReadme = () =>
  `Solved tasks: ${E2E_SEED_IDS.join(', ')}\n\nOriginal tasks:\n` +
  E2E_SEED_IDS.map((id) => `- https://acmp.ru/index.asp?main=task&id_task=${id}`).join('\n');
const stubFetch = (async (url: string) =>
  String(url).includes('/main/README.md')
    ? { ok: true, text: async () => stubReadme() }
    : { ok: false, text: async () => '' }) as unknown as typeof fetch;

function deps(): ServiceDeps {
  return {
    store: createStore(),
    weave: E2E_STUB ? stubWeave : liveWeaveQuest,
    now: () => new Date().toISOString(),
    newId: () => randomUUID(),
  };
}

async function sessionId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get('qsid')?.value;
  if (!id) {
    id = randomUUID();
    jar.set('qsid', id, { httpOnly: true, sameSite: 'lax', path: '/' });
  }
  return id;
}

export async function startQuestAction(theme: string, level: Level) {
  return generateQuest({ sessionId: await sessionId(), theme, level }, deps());
}

export async function getInputAction(missionOrder: 1 | 2 | 3) {
  return getMissionInput({ sessionId: await sessionId(), missionOrder }, { store: createStore(), now: () => new Date().toISOString() });
}

export async function submitSolutionAction(missionOrder: 1 | 2 | 3, output: string) {
  return verifySolution({ sessionId: await sessionId(), missionOrder, output }, { store: createStore(), now: () => new Date().toISOString() });
}

export async function submitDeploymentAction(repoUrl: string) {
  return verifyDeployment(
    { sessionId: await sessionId(), repoUrl },
    { store: createStore(), now: () => new Date().toISOString(), ...(E2E_STUB ? { fetchImpl: stubFetch } : {}) },
  );
}

export async function getStateAction() {
  const store = createStore();
  const session = await store.getSession(await sessionId());
  return session ? { quest: session.quest, progress: session.progress } : null;
}
