import type { Firestore } from 'firebase-admin/firestore';
import { fetchTaskPage } from './fetch.js';
import { parseTaskPage } from './parse.js';
import { translateTask, type Translator } from './translate.js';
import { downloadImages } from './assets.js';
import { validateTask, type ValidateResult } from './validate.js';
import { getAuthoredAlgorithms } from './authored/index.js';
import { upsertTask } from './upsert.js';
import { type Task } from '../model/index.js';

/**
 * ACMP import orchestrator: fetch → parse → translate → download figures → attach the authored
 * solver/generator code → sandbox-validate → upsert (as `ready:false`). Each task is isolated: a
 * parse/translate/asset/validate problem flags or skips that task without corrupting the rest
 * (FR-018). Marking `ready` is a separate curator step (FR-006).
 */

export interface ImportDeps {
  translate: Translator;
  fsRoot: string; // maps to the served static dir (e.g. <repo>/app/public)
  fetchImpl?: typeof fetch;
  db?: Firestore;
  dryRun?: boolean; // parse/translate/validate but do not write to the catalog or download images
}

export interface ImportOutcome {
  taskId: string;
  status: 'imported' | 'flagged' | 'skipped';
  ready?: boolean;
  title?: string;
  complexity?: number;
  images?: number;
  confidence?: 'high' | 'medium';
  validation?: ValidateResult;
  reason?: string;
}

export async function importTask(id: string | number, deps: ImportDeps): Promise<ImportOutcome> {
  const taskId = String(id);
  try {
    const page = await fetchTaskPage(id, deps.fetchImpl);
    const parsed = parseTaskPage(page.html, id);
    if (!parsed.ok) return { taskId, status: 'flagged', reason: `parse: ${parsed.reason}` };

    const authored = getAuthoredAlgorithms(taskId);
    if (!authored) return { taskId, status: 'flagged', reason: 'no authored solver/generator' };

    const validation = validateTask({
      solverSource: authored.solverSource,
      testGenSource: authored.testGenSource,
      examples: parsed.task.examples,
    });

    const en = await translateTask(parsed.task, deps.translate);
    const images = deps.dryRun ? [] : await downloadImages(parsed.task, { fsRoot: deps.fsRoot, fetchImpl: deps.fetchImpl });

    const task: Task = {
      taskId: en.taskId,
      sourceUrl: en.sourceUrl,
      title: en.title,
      statement: en.statement,
      inputFormat: en.inputFormat,
      outputFormat: en.outputFormat,
      examples: en.examples,
      images,
      complexity: en.complexity,
      runtime: authored.runtime,
      solverSource: authored.solverSource,
      testGenSource: authored.testGenSource,
      // FR-006 gate: ready only when validated AND curator-approved (recorded in the authored registry).
      ready: validation.ok && authored.approved,
    };
    if (!deps.dryRun) await upsertTask(task, deps.db);

    return {
      taskId,
      status: validation.ok ? 'imported' : 'flagged',
      ready: task.ready,
      title: en.title,
      complexity: en.complexity,
      images: images.length,
      confidence: authored.confidence,
      validation,
      reason: validation.ok ? authored.note : `validation: ${validation.reasons.join('; ')}`,
    };
  } catch (err) {
    return { taskId, status: 'skipped', reason: (err as Error).message };
  }
}

export async function importTasks(ids: Array<string | number>, deps: ImportDeps): Promise<ImportOutcome[]> {
  const out: ImportOutcome[] = [];
  for (const id of ids) out.push(await importTask(id, deps)); // sequential: polite to ACMP, ordered logs
  return out;
}
