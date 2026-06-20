import { type Level, type Progress, type Quest, type Session, type Theme, ThemeSchema } from './model/index.js';
import { type QuestStore } from './store.js';
import { selectQuestTasks } from './task-selection/index.js';
import { assembleQuest, type QuestNarrative } from './assemble.js';
import { gradeMission } from './grading/index.js';
import { getSolver, hasSolver } from './tasks/registry.js';
import { verifyDeployment as verifyRepo } from './github-verify/index.js';

/**
 * Application services: the logic behind the generateQuest / verifySolution /
 * verifyDeployment server actions. Framework-agnostic (Library-First, Article I) with
 * injected dependencies so they run against the real store + flow in production and the
 * emulator + a stubbed flow in tests.
 */

export type WeaveFn = (args: {
  theme: Theme;
  level: Level;
  tasks: Array<{ order: 1 | 2 | 3 | 4; kind: 'coding' | 'deployment'; title: string; statement: string; taskId: string | null }>;
}) => Promise<QuestNarrative>;

export interface ServiceDeps {
  store: QuestStore;
  weave: WeaveFn;
  now: () => string; // ISO timestamp (injected; no Date.now in logic)
  newId: () => string; // quest id generator (injected)
}

const freshProgress = (): Progress => ({ currentMission: 1, solvedMissions: [], won: false });

// ---------------------------------------------------------------------------
// generateQuest (US1)
// ---------------------------------------------------------------------------

export type GenerateQuestResult =
  | { ok: true; quest: Quest }
  | { ok: false; code: 'INSUFFICIENT_TASKS'; message: string };

export async function generateQuest(
  input: { sessionId: string; theme: string; level: Level },
  deps: ServiceDeps,
): Promise<GenerateQuestResult> {
  const theme = ThemeSchema.parse(input.theme);
  const tasks = await deps.store.getTasksByLevel(input.level);
  const selection = selectQuestTasks({ tasks, level: input.level, hasSolver });

  if (!selection.ok) {
    return {
      ok: false,
      code: 'INSUFFICIENT_TASKS',
      message: `Not enough ${input.level} tasks to build a quest (need 3, found ${selection.available}). Try another level.`,
    };
  }

  const coding = selection.codingTasks;
  const narrative = await deps.weave({
    theme,
    level: input.level,
    tasks: [
      ...coding.map((t, i) => ({ order: (i + 1) as 1 | 2 | 3, kind: 'coding' as const, title: t.title, statement: t.statement, taskId: t.taskId })),
      { order: 4 as const, kind: 'deployment' as const, title: 'Final report', statement: 'Deploy to GitHub.', taskId: null },
    ],
  });

  const quest = assembleQuest({
    id: deps.newId(),
    theme,
    level: input.level,
    createdAt: deps.now(),
    codingTasks: coding,
    narrative,
  });

  const session: Session = {
    sessionId: input.sessionId,
    quest,
    progress: freshProgress(),
    missionInputs: {},
    updatedAt: deps.now(),
  };
  await deps.store.saveSession(session);
  return { ok: true, quest };
}

// ---------------------------------------------------------------------------
// getMissionInput (US2) — generate + persist the input for a coding mission
// ---------------------------------------------------------------------------

export async function getMissionInput(
  input: { sessionId: string; missionOrder: 1 | 2 | 3 },
  deps: Pick<ServiceDeps, 'store' | 'now'>,
): Promise<{ ok: true; input: string } | { ok: false; code: 'NOT_FOUND'; message: string }> {
  const session = await deps.store.getSession(input.sessionId);
  const mission = session?.quest?.missions.find((m) => m.order === input.missionOrder);
  if (!session || !mission || mission.kind !== 'coding' || !mission.solverKey) {
    return { ok: false, code: 'NOT_FOUND', message: 'Mission not found.' };
  }
  const existing = session.missionInputs?.[String(input.missionOrder)];
  if (existing) return { ok: true, input: existing };

  const solver = getSolver(mission.solverKey);
  if (!solver) return { ok: false, code: 'NOT_FOUND', message: 'Mission solver unavailable.' };
  const generated = solver.generateInput();
  const next: Session = {
    ...session,
    missionInputs: { ...(session.missionInputs ?? {}), [String(input.missionOrder)]: generated },
    updatedAt: deps.now(),
  };
  await deps.store.saveSession(next);
  return { ok: true, input: generated };
}

// ---------------------------------------------------------------------------
// verifySolution (US2)
// ---------------------------------------------------------------------------

export type VerifySolutionResult =
  | { ok: true; correct: boolean; message: string; progress: Progress }
  | { ok: false; code: 'NOT_FOUND' | 'LOCKED' | 'NO_INPUT'; message: string };

export async function verifySolution(
  input: { sessionId: string; missionOrder: 1 | 2 | 3; output: string },
  deps: Pick<ServiceDeps, 'store' | 'now'>,
): Promise<VerifySolutionResult> {
  const session = await deps.store.getSession(input.sessionId);
  const mission = session?.quest?.missions.find((m) => m.order === input.missionOrder);
  if (!session || !mission || mission.kind !== 'coding' || !mission.solverKey) {
    return { ok: false, code: 'NOT_FOUND', message: 'Mission not found.' };
  }
  if (session.progress.currentMission !== input.missionOrder) {
    return { ok: false, code: 'LOCKED', message: 'This mission is not currently unlocked.' };
  }
  const missionInput = session.missionInputs?.[String(input.missionOrder)];
  if (missionInput === undefined) {
    return { ok: false, code: 'NO_INPUT', message: 'Request the mission input before submitting.' };
  }

  const { correct } = gradeMission({ solverKey: mission.solverKey, input: missionInput, submitted: input.output }, { getSolver });
  if (!correct) {
    return { ok: true, correct: false, message: 'Incorrect output — the signal stays encrypted. Try again.', progress: session.progress };
  }

  const solved = Array.from(new Set([...session.progress.solvedMissions, input.missionOrder])).sort((a, b) => a - b);
  const progress: Progress = {
    solvedMissions: solved,
    currentMission: (input.missionOrder + 1) as 1 | 2 | 3 | 4,
    won: false,
  };
  await deps.store.saveSession({ ...session, progress, updatedAt: deps.now() });
  return { ok: true, correct: true, message: 'Decrypted. The next mission is unlocked.', progress };
}

// ---------------------------------------------------------------------------
// verifyDeployment (US3)
// ---------------------------------------------------------------------------

export type VerifyDeploymentResult =
  | { ok: true; won: boolean; message: string; progress: Progress }
  | { ok: false; code: 'NOT_FOUND' | 'LOCKED' | 'BAD_URL' | 'UNREACHABLE' | 'MISSING_IDS'; message: string };

export async function verifyDeployment(
  input: { sessionId: string; repoUrl: string },
  deps: Pick<ServiceDeps, 'store' | 'now'> & { fetchImpl?: typeof fetch },
): Promise<VerifyDeploymentResult> {
  const session = await deps.store.getSession(input.sessionId);
  if (!session?.quest) return { ok: false, code: 'NOT_FOUND', message: 'No active quest.' };
  if (session.progress.currentMission !== 4) {
    return { ok: false, code: 'LOCKED', message: 'Finish the earlier missions first.' };
  }

  const taskIds = session.quest.missions.filter((m) => m.kind === 'coding' && m.taskId).map((m) => m.taskId as string);
  const result = await verifyRepo({ repoUrl: input.repoUrl, taskIds, fetchImpl: deps.fetchImpl });

  if (!result.ok) return { ok: false, code: result.code, message: result.message };

  const progress: Progress = {
    solvedMissions: Array.from(new Set([...session.progress.solvedMissions, 4])).sort((a, b) => a - b),
    currentMission: 4,
    won: true,
  };
  await deps.store.saveSession({ ...session, progress, updatedAt: deps.now() });
  return { ok: true, won: true, message: 'Report accepted. Mission complete — humanity is saved!', progress };
}
