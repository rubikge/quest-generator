import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { SessionSchema, TaskSchema, type Session, type Task } from './model/index';

/**
 * Firestore access for the `tasks` catalog (read) and `sessions` (read/write).
 * Uses firebase-admin; when FIRESTORE_EMULATOR_HOST is set the SDK targets the local
 * emulator automatically (no credentials needed with a project id). See research R4.
 */

let cached: Firestore | null = null;

export function getDb(): Firestore {
  if (cached) return cached;
  if (!getApps().length) {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'demo-quest-generator';
    initializeApp({ projectId });
  }
  cached = getFirestore();
  return cached;
}

const TASKS = 'tasks';
const SESSIONS = 'sessions';

export interface QuestStore {
  /** All ready tasks (selection ranks these by complexity and splits into tiers). */
  getReadyTasks(): Promise<Task[]>;
  /** A single task by its public id (used to load solverSource/testGenSource for grading). */
  getTask(taskId: string): Promise<Task | null>;
  getSession(sessionId: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
}

export function createStore(db: Firestore = getDb()): QuestStore {
  return {
    async getReadyTasks() {
      const snap = await db.collection(TASKS).where('ready', '==', true).get();
      return snap.docs.map((d) => TaskSchema.parse({ id: d.id, ...d.data() }));
    },

    async getTask(taskId) {
      const doc = await db.collection(TASKS).doc(taskId).get();
      if (!doc.exists) return null;
      return TaskSchema.parse({ id: doc.id, ...doc.data() });
    },

    async getSession(sessionId) {
      const doc = await db.collection(SESSIONS).doc(sessionId).get();
      if (!doc.exists) return null;
      return SessionSchema.parse(doc.data());
    },

    async saveSession(session) {
      const validated = SessionSchema.parse(session);
      await db.collection(SESSIONS).doc(validated.sessionId).set(validated);
    },
  };
}
