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
  questIntro: 'A storyline unfolds across four missions...',
  framings: Object.fromEntries(tasks.map((t) => [t.order, `Mission ${t.order}: the story continues.`])) as Record<
    1 | 2 | 3 | 4,
    string
  >,
});

// Deterministic README fetch for e2e: pretend the repo lists the beginner task ids.
const stubFetch = (async (url: string) =>
  String(url).includes('/main/README.md')
    ? { ok: true, text: async () => 'Solved tasks: 892, 757, 907' }
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
