import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, createStore } from '../../src/lib/quest/store.js';
import { upsertTask, markReady } from '../../src/lib/quest/acmp-import/upsert.js';
import type { Task } from '../../src/lib/quest/model/index.js';

/**
 * Integration (Firestore emulator): upsert idempotency + readiness gate. Run via `npm run test:int`
 * (boots the emulator). Requires FIRESTORE_EMULATOR_HOST to be set.
 */

const task = (overrides: Partial<Task> = {}): Task => ({
  taskId: 'IT1',
  sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=1',
  title: 'A+B',
  statement: 'Add two integers.',
  inputFormat: 'Two integers.',
  outputFormat: 'Their sum.',
  examples: [{ input: '2 3', output: '5' }],
  images: [],
  complexity: 2,
  runtime: 'js',
  solverSource: 'const solve = (i) => i;',
  testGenSource: 'const generateTests = () => [{input:"2 3",kind:"edge"}];',
  ready: false,
  ...overrides,
});

describe('acmp upsert (emulator)', () => {
  beforeAll(async () => {
    // Clear any prior IT* docs.
    const snap = await getDb().collection('tasks').get();
    await Promise.all(snap.docs.filter((d) => d.id.startsWith('IT')).map((d) => d.ref.delete()));
  });

  it('keys by taskId (re-import updates, never duplicates)', async () => {
    expect(await upsertTask(task())).toBe('created');
    expect(await upsertTask(task({ title: 'A+B v2' }))).toBe('updated');
    const doc = await createStore().getTask('IT1');
    expect(doc?.title).toBe('A+B v2');
  });

  it('writes ready:false and excludes from getReadyTasks until markReady', async () => {
    await upsertTask(task({ taskId: 'IT2' }));
    const store = createStore();
    let ready = await store.getReadyTasks();
    expect(ready.find((t) => t.taskId === 'IT2')).toBeUndefined();
    await markReady('IT2');
    ready = await store.getReadyTasks();
    expect(ready.find((t) => t.taskId === 'IT2')).toBeDefined();
  });
});
