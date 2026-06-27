import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from '../store.js';
import { TaskSchema, type Task } from '../model/index.js';

/**
 * Idempotent catalog write (FR-017): the Firestore document id IS the taskId, so re-importing a task
 * updates (never duplicates) it. New/re-imported tasks are written `ready:false`; `markReady` flips
 * the gate only after validation + curator confirmation (R7/FR-006).
 */

const TASKS = 'tasks';

export async function upsertTask(task: Task, db: Firestore = getDb()): Promise<'created' | 'updated'> {
  const validated = TaskSchema.parse(task);
  const ref = db.collection(TASKS).doc(validated.taskId);
  const existing = await ref.get();
  const { id: _id, ...data } = validated; // doc id is the taskId; don't store a redundant `id` field
  await ref.set(data);
  return existing.exists ? 'updated' : 'created';
}

export async function markReady(taskId: string, db: Firestore = getDb()): Promise<void> {
  await db.collection(TASKS).doc(taskId).update({ ready: true });
}
