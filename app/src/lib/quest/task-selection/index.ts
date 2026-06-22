import type { Level, Task } from '../model/index';

export const CODING_MISSION_COUNT = 3;

export interface Tiers {
  beginner: Task[];
  intermediate: Task[];
  expert: Task[];
}

/**
 * Rank all READY tasks by ACMP complexity and split them into three contiguous tiers (as equal in
 * size as possible). Sort key is `(complexity, taskId)` so ties break deterministically and the
 * split is stable. Boundaries use floor(n/3) and floor(2n/3), so every task lands in exactly one
 * tier for any n (no task lost when n is not divisible by 3). Research R4 / FR-009/FR-010.
 */
export function splitTiers(tasks: Task[]): Tiers {
  const ready = tasks
    .filter((t) => t.ready)
    .slice()
    .sort((a, b) => (a.complexity - b.complexity) || (a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0));
  const n = ready.length;
  const b1 = Math.floor(n / 3);
  const b2 = Math.floor((2 * n) / 3);
  return {
    beginner: ready.slice(0, b1),
    intermediate: ready.slice(b1, b2),
    expert: ready.slice(b2, n),
  };
}

export type SelectionResult =
  | { ok: true; codingTasks: Task[] }
  | { ok: false; code: 'INSUFFICIENT_TASKS'; available: number };

export interface SelectQuestTasksOptions {
  tasks: Task[];
  level: Level;
  /** Picker selecting `n` tasks from the tier pool. Defaults to a random sample.
   * Tests inject a deterministic picker. */
  pick?: (pool: Task[], n: number) => Task[];
}

/** Deterministic-free default picker: shuffle then take n (variety per playthrough, FR-011). */
function randomPick(pool: Task[], n: number): Task[] {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, n);
}

/**
 * Choose the 3 coding tasks for a quest from the complexity tier matching the chosen level
 * (beginner → lowest, intermediate → middle, expert → highest third). Returns INSUFFICIENT_TASKS
 * (FR-012) when that tier has fewer than 3 ready tasks. The deployment mission is composed
 * separately (it carries no task).
 */
export function selectQuestTasks(opts: SelectQuestTasksOptions): SelectionResult {
  const pick = opts.pick ?? randomPick;
  const tier = splitTiers(opts.tasks)[opts.level];

  if (tier.length < CODING_MISSION_COUNT) {
    return { ok: false, code: 'INSUFFICIENT_TASKS', available: tier.length };
  }

  return { ok: true, codingTasks: pick(tier, CODING_MISSION_COUNT) };
}
