import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, createStore } from '../../src/lib/quest/store.js';
import { upsertTask, markReady } from '../../src/lib/quest/acmp-import/upsert.js';
import { buildSeedTask, SEED_TASKS } from './_seed.js';

// T010 — store reads against the Firestore emulator: getReadyTasks() filters on the readiness gate
// and getTask() round-trips the FULL Task document, including the executable code fields.
describe('store reads (emulator)', () => {
  const store = createStore();

  beforeAll(async () => {
    // Start from a clean tasks collection so the ready/unready assertions are exact.
    const snap = await getDb().collection('tasks').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  });

  it('getReadyTasks() returns only tasks past the readiness gate', async () => {
    // One ready task (id 1) and one explicitly-unready task (id 2, never markReady'd).
    const ready = buildSeedTask({
      taskId: '1',
      title: 'A+B',
      statement: 'Sum two integers.',
      inputFormat: 'Two integers.',
      outputFormat: 'Their sum.',
      examples: [{ input: '2 3', output: '5' }],
      complexity: 1,
    });
    await upsertTask(ready);
    await markReady(ready.taskId);

    const unready = buildSeedTask({
      taskId: '2',
      title: 'Sum 1..N',
      statement: 'Sum of integers 1..N.',
      inputFormat: 'One integer N.',
      outputFormat: 'The sum.',
      examples: [{ input: '3', output: '6' }],
      complexity: 2,
    });
    await upsertTask(unready); // upsert writes ready:false; we never markReady it.

    const got = await store.getReadyTasks();
    const ids = got.map((t) => t.taskId);
    expect(ids).toContain('1');
    expect(ids).not.toContain('2');
    expect(got.every((t) => t.ready)).toBe(true);
  });

  it('getTask() round-trips the full Task incl. solverSource/testGenSource', async () => {
    const original = SEED_TASKS.find((t) => t.taskId === '1')!;
    await upsertTask(original);
    await markReady('1');

    const loaded = await store.getTask('1');
    expect(loaded).not.toBeNull();
    expect(loaded!.taskId).toBe('1');
    expect(loaded!.runtime).toBe('js');
    expect(loaded!.solverSource).toBe(original.solverSource);
    expect(loaded!.testGenSource).toBe(original.testGenSource);
    expect(loaded!.solverSource).toContain('solve');
    expect(loaded!.testGenSource).toContain('generateTests');
    expect(loaded!.sourceUrl).toContain('id_task=1');
    expect(loaded!.ready).toBe(true);
  });

  it('getTask() returns null for an unknown task', async () => {
    expect(await store.getTask('does-not-exist')).toBeNull();
  });
});
