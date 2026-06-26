import { describe, it, expect } from 'vitest';
import {
  weaveQuest,
  type GenerateFn,
  type WeaveQuestInput,
} from '../../src/ai/flows/weave-quest.js';

// US3 — localization contract test with a STUBBED model (no live Gemini; plan C2 deterministic CI).
// The flow must (a) auto-detect the theme's language and (b) localize the per-mission display prose
// (title/statement/inputFormat/outputFormat) in addition to the storyFraming — returning PROSE ONLY
// (never examples/taskId/sourceUrl/images, which come from the catalog).

const tasks: WeaveQuestInput['tasks'] = [
  {
    taskId: '892',
    sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=892',
    title: 'Seasons',
    statement: 'Given a month number from 1 to 12, print the season.',
    inputFormat: 'A single integer m (1 ≤ m ≤ 12).',
    outputFormat: 'One word: the season name.',
    examples: [{ input: '1', output: 'winter' }],
    images: ['tasks/892/1.png'],
  },
  {
    taskId: '757',
    sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=757',
    title: 'Sum',
    statement: 'Read two integers a and b and print a + b.',
    inputFormat: 'Two integers a and b.',
    outputFormat: 'A single integer: a + b.',
    examples: [{ input: '2 3', output: '5' }],
    images: [],
  },
  {
    taskId: '907',
    sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=907',
    title: 'Beacon',
    statement: 'Print the maximum of three numbers.',
    inputFormat: 'Three integers.',
    outputFormat: 'The maximum.',
    examples: [{ input: '1 2 3', output: '3' }],
    images: [],
  },
];

// A stubbed model that "translates" by detecting the requested language from the theme and
// emitting localized prose. We don't call Gemini — we just return a schema-valid fixture that
// mirrors what a real localization would produce, so the contract (schema + alignment) is tested.
function makeStub(detectedLanguage: string, prefix: string): GenerateFn {
  return async ({ output }) => {
    void output;
    return {
      output: {
        detectedLanguage,
        questIntro: `${prefix} intro`,
        missions: tasks.map((t, i) => ({
          order: (i + 1) as 1 | 2 | 3,
          title: `${prefix} ${t.title}`,
          statement: `${prefix} ${t.statement}`,
          inputFormat: `${prefix} ${t.inputFormat}`,
          outputFormat: `${prefix} ${t.outputFormat}`,
          storyFraming: `${prefix} framing ${i + 1}`,
        })),
        deploymentFraming: `${prefix} deploy`,
      },
    };
  };
}

describe('weaveQuest localization (stubbed model)', () => {
  const ru: WeaveQuestInput = { theme: 'космическое путешествие к далёким галактикам', level: 'beginner', tasks };
  const ambiguous: WeaveQuestInput = { theme: 'a', level: 'beginner', tasks };

  it('produces a localized entry for every coding mission (length === tasks length)', async () => {
    const result = await weaveQuest(ru, makeStub('ru', 'РУ'));
    expect(result.localized).toBeDefined();
    expect(Object.keys(result.localized!)).toHaveLength(tasks.length);
    // framings cover all 4 mission orders (3 coding + deployment).
    expect(Object.keys(result.framings)).toEqual(['1', '2', '3', '4']);
  });

  it('a Russian theme yields non-English statements and detectedLanguage ≈ ru', async () => {
    const result = await weaveQuest(ru, makeStub('ru', 'РУ'));
    expect(result.detectedLanguage!.toLowerCase()).toContain('ru');
    const m1 = result.localized![1]!;
    expect(m1.statement).not.toBe(tasks[0]!.statement);
    expect(m1.title).toContain('РУ');
    expect(m1.inputFormat).toBeTruthy();
    expect(m1.outputFormat).toBeTruthy();
  });

  it('an ambiguous/short theme yields detectedLanguage "en"', async () => {
    const result = await weaveQuest(ambiguous, makeStub('en', 'EN'));
    expect(result.detectedLanguage).toBe('en');
  });

  it('does NOT emit examples / taskId / sourceUrl / images (assembled from the catalog)', async () => {
    const result = await weaveQuest(ru, makeStub('ru', 'РУ'));
    for (const order of [1, 2, 3] as const) {
      const m = result.localized![order]!;
      expect(m).not.toHaveProperty('examples');
      expect(m).not.toHaveProperty('taskId');
      expect(m).not.toHaveProperty('sourceUrl');
      expect(m).not.toHaveProperty('images');
    }
  });

  it('preserves alignment: each localized entry maps to the input task order', async () => {
    const result = await weaveQuest(ru, makeStub('ru', 'РУ'));
    expect(Object.keys(result.localized!).map(Number).sort()).toEqual([1, 2, 3]);
  });
});
