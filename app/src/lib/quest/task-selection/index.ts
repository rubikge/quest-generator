import type { Level, Task } from '../model/index.js';
import { hasSolver as defaultHasSolver } from '../tasks/registry.js';

export const CODING_MISSION_COUNT = 3;

export type SelectionResult =
  | { ok: true; codingTasks: Task[] }
  | { ok: false; code: 'INSUFFICIENT_TASKS'; available: number };

export interface SelectQuestTasksOptions {
  tasks: Task[];
  level: Level;
  /** Predicate deciding whether a solverKey resolves; defaults to the solver registry. */
  hasSolver?: (key: string) => boolean;
  /** Picker selecting `n` tasks from the eligible pool. Defaults to the first `n`
   * (deterministic). Production may inject a shuffler for variety (research R1/R3). */
  pick?: (pool: Task[], n: number) => Task[];
}

/**
 * Choose the coding tasks for a quest: tasks at the requested level whose solverKey
 * resolves. Returns INSUFFICIENT_TASKS (FR-018) when fewer than 3 are eligible.
 * The deployment mission is composed separately (it carries no task).
 */
export function selectQuestTasks(opts: SelectQuestTasksOptions): SelectionResult {
  const hasSolver = opts.hasSolver ?? defaultHasSolver;
  const pick = opts.pick ?? ((pool, n) => pool.slice(0, n));

  const eligible = opts.tasks.filter((t) => t.level === opts.level && hasSolver(t.solverKey));

  if (eligible.length < CODING_MISSION_COUNT) {
    return { ok: false, code: 'INSUFFICIENT_TASKS', available: eligible.length };
  }

  return { ok: true, codingTasks: pick(eligible, CODING_MISSION_COUNT) };
}
