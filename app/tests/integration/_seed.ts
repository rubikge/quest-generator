import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from '../../src/lib/quest/store.js';
import { upsertTask, markReady } from '../../src/lib/quest/acmp-import/upsert.js';
import { getAuthoredAlgorithms } from '../../src/lib/quest/acmp-import/authored/index.js';
import { TaskSchema, type Task } from '../../src/lib/quest/model/index.js';

/**
 * Offline seed helper for the emulator-backed integration + e2e suites. Replaces the removed
 * `scripts/seed-tasks.ts`. Each entry pairs hardcoded canonical-English presentation prose (so we
 * NEVER call Gemini here) with the REAL `solverSource`/`testGenSource` authored for that ACMP id
 * (via `getAuthoredAlgorithms`). Tasks are written then flipped `ready` (the readiness gate) so they
 * are selectable. Complexities are spread so the three tiers each receive ≥3 ready tasks
 * (beginner→lowest third, intermediate→middle, expert→highest).
 */

/** Hardcoded English presentation for each seeded task (everything except the code fields). */
export interface SeedMeta {
  taskId: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  examples: Array<{ input: string; output: string }>;
  complexity: number;
}

const META: SeedMeta[] = [
  {
    taskId: '1',
    title: 'A+B',
    statement: 'For each line containing two integers, output their sum.',
    inputFormat: 'Each line has two integers a and b separated by a space.',
    outputFormat: 'For each line, the sum a + b on its own line.',
    examples: [{ input: '2 3', output: '5' }],
    complexity: 1,
  },
  {
    taskId: '2',
    title: 'Sum 1..N',
    statement: 'For each line with an integer N, output the sum of all integers between 1 and N inclusive.',
    inputFormat: 'Each line has one integer N (|N| <= 10000).',
    outputFormat: 'For each line, the sum on its own line.',
    examples: [{ input: '3', output: '6' }],
    complexity: 2,
  },
  {
    taskId: '3',
    title: 'Five by five',
    statement: 'For each line with a number N ending in 5, output N squared.',
    inputFormat: 'Each line has one non-negative integer N ending in the digit 5.',
    outputFormat: 'For each line, N squared on its own line.',
    examples: [{ input: '5', output: '25' }],
    complexity: 3,
  },
  {
    taskId: '4',
    title: 'Guess the number',
    statement:
      'Given the first digit f of the difference |abc - cba|, output 99 * (f + 1).',
    inputFormat: 'Each line has one digit f.',
    outputFormat: 'For each line, the result on its own line.',
    examples: [{ input: '1', output: '198' }],
    complexity: 11,
  },
  {
    taskId: '6',
    title: 'Chess knight move',
    statement: 'For each line "X#-Y#", output YES if it is a valid knight move, NO if not, or ERROR if malformed.',
    inputFormat: 'Each line is a move such as C7-D5 (columns A-H, rows 1-8).',
    outputFormat: 'For each line, YES, NO, or ERROR on its own line.',
    examples: [{ input: 'C7-D5', output: 'YES' }],
    complexity: 22,
  },
  {
    taskId: '7',
    title: 'Gold',
    statement: 'For each line with three non-negative integers, output the largest of them.',
    inputFormat: 'Each line has three non-negative integers (up to 10^100).',
    outputFormat: 'For each line, the maximum on its own line.',
    examples: [{ input: '5 7 3', output: '7' }],
    complexity: 4,
  },
  {
    taskId: '9',
    title: 'Homework',
    statement:
      'For each case (a line with N, then a line of N integers), output the sum of the positive values and the product of the elements strictly between the max and min positions.',
    inputFormat: 'Each case is two lines: N, then N integers.',
    outputFormat: 'For each case, "sumPositive productBetween" on its own line.',
    examples: [{ input: '5\n10 1 -2 3 -10', output: '14 -6' }],
    complexity: 33,
  },
  {
    taskId: '10',
    title: 'Equation',
    statement:
      'For each line with coefficients A B C D, output the integer roots of A x^3 + B x^2 + C x + D in [-100, 100], ascending, space-separated.',
    inputFormat: 'Each line has four integers A B C D.',
    outputFormat: 'For each line, the ascending integer roots on its own line.',
    examples: [{ input: '1 -3 0 0', output: '0 3' }],
    complexity: 44,
  },
  {
    taskId: '11',
    title: 'Bunny',
    statement: 'For each line "K N", output the number of compositions of N using parts in 1..K.',
    inputFormat: 'Each line has two integers K and N.',
    outputFormat: 'For each line, the count on its own line.',
    examples: [{ input: '2 7', output: '21' }],
    complexity: 55,
  },
  {
    taskId: '24',
    title: 'Clearing',
    statement:
      'For each line "n m", output the number of ways to keep m equally-spaced trees out of n in a row.',
    inputFormat: 'Each line has two integers n and m.',
    outputFormat: 'For each line, the count on its own line.',
    examples: [{ input: '5 3', output: '4' }],
    complexity: 66,
  },
];

/** Build a complete, schema-valid Task from its metadata + the authored code fields. */
export function buildSeedTask(meta: SeedMeta): Task {
  const algos = getAuthoredAlgorithms(meta.taskId);
  if (!algos) throw new Error(`no authored algorithms for task ${meta.taskId}`);
  return TaskSchema.parse({
    taskId: meta.taskId,
    sourceUrl: `https://acmp.ru/index.asp?main=task&id_task=${meta.taskId}`,
    title: meta.title,
    statement: meta.statement,
    inputFormat: meta.inputFormat,
    outputFormat: meta.outputFormat,
    examples: meta.examples,
    images: [],
    complexity: meta.complexity,
    runtime: algos.runtime,
    solverSource: algos.solverSource,
    testGenSource: algos.testGenSource,
    ready: false,
  });
}

/** The full set of Task objects this helper seeds (handy for in-memory assertions). */
export const SEED_TASKS: Task[] = META.map(buildSeedTask);

/** Task ids seeded, ordered by ascending complexity. */
export const SEED_TASK_IDS: string[] = META.map((m) => m.taskId);

/**
 * Upsert every seed task into the emulator and mark it ready. Idempotent (keyed by taskId), so it is
 * safe to call from multiple test files' `beforeAll`. Returns the number of tasks seeded.
 */
export async function seedCatalog(db: Firestore = getDb()): Promise<number> {
  for (const task of SEED_TASKS) {
    await upsertTask(task, db);
    await markReady(task.taskId, db);
  }
  return SEED_TASKS.length;
}
