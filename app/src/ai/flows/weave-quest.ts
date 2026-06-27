import { z } from 'zod';
import { LevelSchema } from '../../lib/quest/model/index';
import type { MissionLocalization, QuestNarrative } from '../../lib/quest/assemble';

/**
 * weaveQuest (US3): in a single structured model call, (a) auto-detect the language of the learner's
 * theme and (b) wrap the three authoritative coding tasks in a themed storyline AND localize their
 * display prose (title/statement/inputFormat/outputFormat) into that language, plus a deployment
 * framing. The model produces NARRATIVE + LOCALIZED PROSE ONLY — it NEVER supplies
 * examples/taskId/sourceUrl/images (those come from the catalog) and NEVER alters the I/O rules or
 * any number/identifier (grading stays solver-driven). Contract: contracts/narrative-localization.md.
 *
 * The model call is injected (`generate`) so the flow is unit-testable with a stub and runs live
 * with Gemini in production (plan C2: deterministic CI, no non-deterministic LLM calls in tests).
 */

export const WeaveTaskSchema = z.object({
  taskId: z.string(),
  sourceUrl: z.string(),
  title: z.string(),
  statement: z.string(),
  inputFormat: z.string(),
  outputFormat: z.string(),
  examples: z.array(z.object({ input: z.string(), output: z.string() })),
  images: z.array(z.string()),
});

export const WeaveQuestInputSchema = z.object({
  theme: z.string().trim().min(1).max(120),
  level: LevelSchema,
  // The three coding tasks, canonical English. (Deployment framing is generated; no task needed.)
  tasks: z.array(WeaveTaskSchema).length(3),
});
export type WeaveQuestInput = z.infer<typeof WeaveQuestInputSchema>;

export const WeaveQuestOutputSchema = z.object({
  // BCP-47-ish; 'en' when detection is not confident (FR-014 fallback).
  detectedLanguage: z.string().min(1),
  questIntro: z.string().min(1),
  // One localized + themed entry per coding mission, aligned to the input task order (1..3).
  missions: z
    .array(
      z.object({
        order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        title: z.string().min(1),
        statement: z.string().min(1),
        inputFormat: z.string().min(1),
        outputFormat: z.string().min(1),
        storyFraming: z.string().min(1),
      }),
    )
    .length(3),
  // Narrative framing for the final deployment mission (order 4); no task content to localize.
  deploymentFraming: z.string().min(1),
});
export type WeaveQuestOutput = z.infer<typeof WeaveQuestOutputSchema>;

/** Signature of the model-call dependency (matches Genkit's `ai.generate` shape we use). */
export type GenerateFn = (args: {
  prompt: string;
  output: { schema: typeof WeaveQuestOutputSchema };
}) => Promise<{ output: WeaveQuestOutput | null }>;

export function buildPrompt(input: WeaveQuestInput): string {
  const missionList = input.tasks
    .map(
      (t, i) =>
        [
          `Mission ${i + 1} (taskId ${t.taskId}):`,
          `  title: ${t.title}`,
          `  statement: ${t.statement}`,
          `  inputFormat: ${t.inputFormat}`,
          `  outputFormat: ${t.outputFormat}`,
        ].join('\n'),
    )
    .join('\n\n');
  return [
    `You are a narrative designer AND translator for a coding quest. Theme: "${input.theme}". Learner level: ${input.level}.`,
    `STEP 1 — Detect the natural language the THEME is written in. Return it as a BCP-47-ish code in "detectedLanguage" (e.g. "en", "ru", "es"). If the theme is too short or ambiguous to be confident, use "en".`,
    `STEP 2 — Produce ALL output prose (questIntro, every mission's title/statement/inputFormat/outputFormat, every storyFraming, deploymentFraming) IN that detected language. If the language is "en", write English.`,
    `Write a single coherent storyline that connects the three coding missions (in order) and a final deployment mission. Keep everything appropriate for a learning context.`,
    `For each coding mission, rewrite the title/statement/inputFormat/outputFormat into the detected language, wrapped lightly in the theme. CRITICAL: preserve EXACTLY every number, identifier, variable name, constraint, and the precise input/output rules — change only the language and tone, never the meaning or the I/O contract. Do NOT solve the task, restate examples, or invent new constraints.`,
    `Return: detectedLanguage; questIntro (overall hook); one mission entry per coding mission below with order/title/statement/inputFormat/outputFormat/storyFraming; and deploymentFraming (story framing for the final "deploy to GitHub" mission). Do NOT include examples, taskId, sourceUrl, or images — those are supplied by the catalog.`,
    missionList,
  ].join('\n\n');
}

/**
 * Run the flow. Validates input, calls the (injected) model constrained to the output schema, and
 * validates the result. Returns a `QuestNarrative`: detectedLanguage, questIntro, per-mission story
 * framings (orders 1..4) AND the per-coding-mission localized display prose. Throws if the model
 * returns nothing usable.
 */
export async function weaveQuest(input: WeaveQuestInput, generate: GenerateFn): Promise<QuestNarrative> {
  const parsed = WeaveQuestInputSchema.parse(input);
  const { output } = await generate({ prompt: buildPrompt(parsed), output: { schema: WeaveQuestOutputSchema } });
  if (!output) throw new Error('weaveQuest: model returned no structured output');
  const valid = WeaveQuestOutputSchema.parse(output);

  const framings = {
    1: valid.missions.find((m) => m.order === 1)!.storyFraming,
    2: valid.missions.find((m) => m.order === 2)!.storyFraming,
    3: valid.missions.find((m) => m.order === 3)!.storyFraming,
    4: valid.deploymentFraming,
  } as QuestNarrative['framings'];

  const localized: Partial<Record<1 | 2 | 3, MissionLocalization>> = {};
  for (const m of valid.missions) {
    localized[m.order] = {
      title: m.title,
      statement: m.statement,
      inputFormat: m.inputFormat,
      outputFormat: m.outputFormat,
    };
  }

  return { detectedLanguage: valid.detectedLanguage, questIntro: valid.questIntro, framings, localized };
}

/** Production binding: call the real Gemini model via Genkit. */
export async function liveWeaveQuest(input: WeaveQuestInput): Promise<QuestNarrative> {
  const { ai } = await import('../genkit');
  const generate: GenerateFn = (args) => ai.generate(args) as ReturnType<GenerateFn>;
  return weaveQuest(input, generate);
}
