import { describe, it, expect } from 'vitest';
import { config } from 'dotenv';
import { z } from 'zod';
import type { WeaveQuestInput } from '../../src/ai/flows/weave-quest.js';

// T054 — GATED LIVE smoke test exercising the REAL Gemini path end-to-end:
//   ACMP-import translate (RU prose -> EN) + quest weave (tasks -> themed narrative).
// It is SKIPPED unless GEMINI_API_KEY is set, so default CI/offline runs stay deterministic
// (the rest of the suite stubs the model). Do not run this without a real key.
config(); // load .env / .env.local if present

const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

describe.skipIf(!hasKey)('live Gemini smoke (translate + weave)', () => {
  it('translates a Russian task to English without dropping numbers/constraints', async () => {
    const { ai } = await import('../../src/ai/genkit.js');
    const { makeGenkitTranslator } = await import('../../src/lib/quest/acmp-import/translate.js');
    const translate = makeGenkitTranslator(ai, z);

    const en = await translate({
      title: 'Яблоки',
      statement:
        'В корзине лежат N яблок (1 ≤ N ≤ 10000), которые нужно поровну раздать K школьникам.',
      inputFormat: 'Два целых числа N и K, каждое на своей строке.',
      outputFormat: 'Выведите YES, если яблоки делятся поровну, иначе NO.',
    });

    expect(en.title.trim().length).toBeGreaterThan(0);
    expect(en.statement.trim().length).toBeGreaterThan(0);
    // Constraints / literals must survive translation (translator contract).
    expect(en.statement).toContain('10000');
    expect(en.statement).toMatch(/\bN\b/);
    expect(en.statement).toMatch(/\bK\b/);
  }, 60000);

  it('weaves four tasks into a themed narrative with one framing per mission', async () => {
    const { liveWeaveQuest } = await import('../../src/ai/flows/weave-quest.js');
    const codingTask = (taskId: string, title: string, statement: string) => ({
      taskId,
      sourceUrl: `https://acmp.ru/index.asp?main=task&id_task=${taskId}`,
      title,
      statement,
      inputFormat: 'Integers on their own lines.',
      outputFormat: 'One result per line.',
      examples: [{ input: '1', output: '1' }],
      images: [] as string[],
    });
    const input: WeaveQuestInput = {
      theme: 'deep-sea expedition',
      level: 'beginner',
      tasks: [
        codingTask('1', 'Apples', 'Divide N apples among K children.'),
        codingTask('892', 'Seasons', 'Map a month to its season.'),
        codingTask('757', 'Fuel', 'Count alcohol molecules.'),
      ],
    };

    const result = await liveWeaveQuest(input);
    expect(result.questIntro.length).toBeGreaterThan(0);
    // framings cover the three coding missions (1..3) plus the deployment mission (4).
    expect(result.framings[1].length).toBeGreaterThan(0);
    expect(result.framings[4].length).toBeGreaterThan(0);
    expect((result.detectedLanguage ?? '').length).toBeGreaterThan(0);
  }, 60000);
});

describe.skipIf(hasKey)('live Gemini smoke (skipped: no GEMINI_API_KEY)', () => {
  it('is skipped until a Gemini key is provided', () => {
    expect(hasKey).toBe(false);
  });
});
