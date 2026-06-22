import type { ParsedTask } from './parse.js';

/**
 * Translate a parsed (Russian) ACMP task's prose into English. Worked examples are NEVER translated
 * (they are data). The translator is injected so unit tests run without live model calls; the
 * Genkit-backed default lives in `makeGenkitTranslator`. Research R3.
 */

export interface EnglishTask {
  taskId: string;
  sourceUrl: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  examples: Array<{ input: string; output: string }>;
  imageUrls: string[];
  complexity: number;
}

export interface ProseFields {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
}

export type Translator = (ru: ProseFields) => Promise<ProseFields>;

export async function translateTask(parsed: ParsedTask, translate: Translator): Promise<EnglishTask> {
  const en = await translate({
    title: parsed.titleRu,
    statement: parsed.statementRu,
    inputFormat: parsed.inputFormatRu,
    outputFormat: parsed.outputFormatRu,
  });
  return {
    taskId: parsed.taskId,
    sourceUrl: parsed.sourceUrl,
    title: en.title.trim(),
    statement: en.statement.trim(),
    inputFormat: en.inputFormat.trim(),
    outputFormat: en.outputFormat.trim(),
    examples: parsed.examples, // verbatim — never translated
    imageUrls: parsed.imageUrls,
    complexity: parsed.complexity,
  };
}

/**
 * Genkit/Gemini-backed translator. Constrained to preserve every number, identifier, filename, and
 * constraint, and to translate prose only (not the examples). Imported lazily so the unit suite
 * never loads Genkit.
 */
export function makeGenkitTranslator(ai: { generate: (opts: unknown) => Promise<{ output?: ProseFields | null; text?: string }> }, z: typeof import('zod').z): Translator {
  const schema = z.object({
    title: z.string(),
    statement: z.string(),
    inputFormat: z.string(),
    outputFormat: z.string(),
  });
  return async (ru) => {
    const res = await ai.generate({
      prompt:
        'Translate the following competitive-programming task fields from Russian to English. ' +
        'Preserve EVERY number, variable name, file name (e.g. INPUT.TXT), and constraint exactly. ' +
        'Translate prose only; do not solve or restate the task.\n\n' +
        `title: ${ru.title}\nstatement: ${ru.statement}\ninputFormat: ${ru.inputFormat}\noutputFormat: ${ru.outputFormat}`,
      output: { schema },
    });
    const out = res.output;
    if (!out) throw new Error('translation produced no structured output');
    return out;
  };
}
