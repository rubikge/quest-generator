import { z } from 'zod';
import { LevelSchema } from '../../lib/quest/model/index';
import type { QuestNarrative } from '../../lib/quest/assemble';

/**
 * weaveQuest: wrap four authoritative tasks in a single themed storyline. The model
 * produces NARRATIVE ONLY (questIntro + per-mission framing); it never alters task
 * statements or ids (contract: contracts/narrative-flow.md, research R1).
 *
 * The model call is injected (`generate`) so the flow is unit-testable with a stub and
 * runs live with Gemini in production. This keeps the schema contract verifiable in CI
 * without non-deterministic LLM calls (plan C2).
 */

export const WeaveQuestInputSchema = z.object({
  theme: z.string().trim().min(1).max(120),
  level: LevelSchema,
  tasks: z
    .array(
      z.object({
        order: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        kind: z.enum(['coding', 'deployment']),
        title: z.string(),
        statement: z.string(),
        taskId: z.string().nullable(),
      }),
    )
    .length(4),
});
export type WeaveQuestInput = z.infer<typeof WeaveQuestInputSchema>;

export const WeaveQuestOutputSchema = z.object({
  questIntro: z.string().min(1),
  missions: z
    .array(
      z.object({
        order: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        storyFraming: z.string().min(1),
      }),
    )
    .length(4),
});
export type WeaveQuestOutput = z.infer<typeof WeaveQuestOutputSchema>;

/** Signature of the model-call dependency (matches Genkit's `ai.generate` shape we use). */
export type GenerateFn = (args: {
  prompt: string;
  output: { schema: typeof WeaveQuestOutputSchema };
}) => Promise<{ output: WeaveQuestOutput | null }>;

export function buildPrompt(input: WeaveQuestInput): string {
  const missionList = input.tasks
    .map((t) => `- Mission ${t.order} (${t.kind}): ${t.title} — ${t.statement}`)
    .join('\n');
  return [
    `You are a narrative designer for a Python coding quest. Theme: "${input.theme}". Learner level: ${input.level}.`,
    `Write a single coherent storyline that connects these four missions in order. Keep it appropriate for a learning context.`,
    `Do NOT change, restate, or solve the tasks — only provide narrative framing.`,
    `Return questIntro (overall hook) and one storyFraming per mission, aligned to the mission orders below:`,
    missionList,
  ].join('\n\n');
}

/**
 * Run the flow. Validates input, calls the (injected) model constrained to the output
 * schema, and validates the result. Throws if the model returns nothing usable.
 */
export async function weaveQuest(input: WeaveQuestInput, generate: GenerateFn): Promise<QuestNarrative> {
  const parsed = WeaveQuestInputSchema.parse(input);
  const { output } = await generate({ prompt: buildPrompt(parsed), output: { schema: WeaveQuestOutputSchema } });
  if (!output) throw new Error('weaveQuest: model returned no structured output');
  const valid = WeaveQuestOutputSchema.parse(output);

  const framings = Object.fromEntries(valid.missions.map((m) => [m.order, m.storyFraming])) as QuestNarrative['framings'];
  return { questIntro: valid.questIntro, framings };
}

/** Production binding: call the real Gemini model via Genkit. */
export async function liveWeaveQuest(input: WeaveQuestInput): Promise<QuestNarrative> {
  const { ai } = await import('../genkit');
  const generate: GenerateFn = (args) => ai.generate(args) as ReturnType<GenerateFn>;
  return weaveQuest(input, generate);
}
