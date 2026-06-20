import { z } from 'zod';

/**
 * Single source of truth for the feature's entities (Anti-Abstraction Gate:
 * one representation per entity, shared across UI, server actions, flow, and store).
 */

export const LevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type Level = z.infer<typeof LevelSchema>;

/** A real, pre-authored coding problem from the catalog. Grading code lives in the
 * solver registry keyed by `solverKey`; it is NOT stored on the document. */
export const TaskSchema = z.object({
  id: z.string().min(1).optional(), // Firestore document id (internal)
  taskId: z.string().min(1), // public id used in the README win check
  title: z.string().min(1),
  statement: z.string().min(1),
  level: LevelSchema,
  sourceUrl: z.string().url().optional(),
  solverKey: z.string().min(1),
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
    solverKey: z.string().min(1).nullable(),
    title: z.string().min(1),
    statement: z.string().min(1),
    storyFraming: z.string().min(1),
  })
  .superRefine((m, ctx) => {
    if (m.kind === 'coding' && (m.taskId === null || m.solverKey === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'coding missions require taskId and solverKey' });
    }
    if (m.kind === 'deployment' && (m.taskId !== null || m.solverKey !== null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'deployment mission must have null taskId/solverKey' });
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
    // Per-mission generated input (keyed by mission order as a string), persisted so
    // grading recomputes the expected output against the SAME input shown to the learner.
    missionInputs: z.record(z.string(), z.string()).optional(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((s, ctx) => {
    if (s.progress.won && !s.progress.solvedMissions.includes(4)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'won cannot be true unless mission 4 is solved' });
    }
  });
export type Session = z.infer<typeof SessionSchema>;

/** The fixed set of selectable Python levels. */
export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
