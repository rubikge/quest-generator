import { z } from 'zod';

/**
 * Single source of truth for the feature's entities (Anti-Abstraction Gate:
 * one representation per entity, shared across UI, server actions, flow, and store).
 */

/** The learner's chosen skill level; maps to a complexity tier at selection time. */
export const LevelSchema = z.enum(['beginner', 'intermediate', 'expert']);
export type Level = z.infer<typeof LevelSchema>;

/** A worked input/output example (stored verbatim from the source; never translated). */
export const ExampleSchema = z.object({ input: z.string(), output: z.string() });
export type Example = z.infer<typeof ExampleSchema>;

/** Runtime/language of a task's stored solution + test-generation code (v1: JavaScript). */
export const RuntimeSchema = z.enum(['js']);
export type Runtime = z.infer<typeof RuntimeSchema>;

/**
 * A real, pre-authored coding problem ported from ACMP. Presentation, selection, attribution data
 * AND the executable reference logic (solution + test-generation algorithms, as code) all live on
 * the document. The code is executed ONLY via the sandbox (research R2/R9) — never here, never in
 * the database, and never as learner code.
 */
export const TaskSchema = z.object({
  id: z.string().min(1).optional(), // Firestore document id (internal); equals taskId
  taskId: z.string().min(1), // public ACMP id, used in the README win check
  sourceUrl: z.string().url(), // original ACMP task page (required for attribution / README links)
  title: z.string().min(1), // English (translated on import)
  statement: z.string().min(1), // English problem statement
  inputFormat: z.string().min(1), // English "input data requirements"
  outputFormat: z.string().min(1), // English "output data requirements"
  examples: z.array(ExampleSchema).min(1), // verbatim worked examples
  images: z.array(z.string()).default([]), // relative static-asset paths; may be empty
  complexity: z.number().min(0), // ACMP complexity score; ranking key for tiers
  runtime: RuntimeSchema,
  solverSource: z.string().min(1), // reference solution as code: solve(input)->output
  testGenSource: z.string().min(1), // test generator as code: generateTests()->TestCase[]
  ready: z.boolean(), // true only after the readiness gate passes; selection uses ready only
});
export type Task = z.infer<typeof TaskSchema>;

/** Learner-chosen theme; sanitized + length-bounded before reaching the model. */
export const ThemeSchema = z.string().trim().min(1).max(120);
export type Theme = z.infer<typeof ThemeSchema>;

export const MissionKindSchema = z.enum(['coding', 'deployment']);
export type MissionKind = z.infer<typeof MissionKindSchema>;

export const MissionSchema = z
  .object({
    order: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    kind: MissionKindSchema,
    taskId: z.string().min(1).nullable(),
    sourceUrl: z.string().url().nullable(),
    title: z.string().min(1),
    statement: z.string().min(1),
    inputFormat: z.string().min(1).nullable(),
    outputFormat: z.string().min(1).nullable(),
    examples: z.array(ExampleSchema).nullable(),
    images: z.array(z.string()),
    storyFraming: z.string().min(1),
  })
  .superRefine((m, ctx) => {
    if (m.kind === 'coding') {
      if (m.taskId === null || m.sourceUrl === null || m.inputFormat === null || m.outputFormat === null || m.examples === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'coding missions require taskId, sourceUrl, inputFormat, outputFormat, examples' });
      }
    }
    if (m.kind === 'deployment') {
      if (m.taskId !== null || m.sourceUrl !== null || m.inputFormat !== null || m.outputFormat !== null || m.examples !== null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'deployment mission must have null taskId/sourceUrl/inputFormat/outputFormat/examples' });
      }
    }
  });
export type Mission = z.infer<typeof MissionSchema>;

export const QuestSchema = z
  .object({
    id: z.string().min(1),
    theme: ThemeSchema,
    level: LevelSchema,
    questIntro: z.string().min(1),
    missions: z.array(MissionSchema).length(4),
    createdAt: z.string().datetime(),
  })
  .superRefine((q, ctx) => {
    const orders = q.missions.map((m) => m.order).sort((a, b) => a - b);
    if (orders.join(',') !== '1,2,3,4') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'missions must be ordered 1..4 with no duplicates' });
    }
    const deployment = q.missions.filter((m) => m.kind === 'deployment');
    if (deployment.length !== 1 || deployment[0]?.order !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exactly one deployment mission, at order 4' });
    }
  });
export type Quest = z.infer<typeof QuestSchema>;

export const ProgressSchema = z.object({
  currentMission: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  solvedMissions: z.array(z.number().int().min(1).max(4)),
  won: z.boolean(),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const SessionSchema = z
  .object({
    sessionId: z.string().min(1),
    quest: QuestSchema.nullable(),
    progress: ProgressSchema,
    // Per-mission generated test-battery input block (keyed by mission order as a string),
    // persisted so grading recomputes the expected output against the SAME input shown.
    missionInputs: z.record(z.string(), z.string()).optional(),
    // Language auto-detected from the learner's theme (English fallback); set at generation time.
    detectedLanguage: z.string().min(1).optional(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((s, ctx) => {
    if (s.progress.won && !s.progress.solvedMissions.includes(4)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'won cannot be true unless mission 4 is solved' });
    }
  });
export type Session = z.infer<typeof SessionSchema>;

/** The fixed set of selectable skill levels. */
export const LEVELS: Level[] = ['beginner', 'intermediate', 'expert'];
