import { describe, it, expect } from 'vitest';
import { weaveQuest, type GenerateFn, type WeaveQuestInput } from '../../src/ai/flows/weave-quest.js';

// T015 — weaveQuest flow contract test with a STUBBED model (plan C2: deterministic CI). Focuses on
// the schema/error contract of the NEW flow I/O (the happy-path localization is covered in detail by
// weave-localization.test.ts). Input is the three canonical-English coding tasks; output is
// detectedLanguage + per-mission localized prose + deploymentFraming.
const input: WeaveQuestInput = {
  theme: 'alien invasion',
  level: 'beginner',
  tasks: [
    {
      taskId: '1',
      sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=1',
      title: 'A+B',
      statement: 'Sum two integers.',
      inputFormat: 'Two integers.',
      outputFormat: 'Their sum.',
      examples: [{ input: '2 3', output: '5' }],
      images: [],
    },
    {
      taskId: '2',
      sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=2',
      title: 'Sum 1..N',
      statement: 'Sum 1..N.',
      inputFormat: 'One integer N.',
      outputFormat: 'The sum.',
      examples: [{ input: '3', output: '6' }],
      images: [],
    },
    {
      taskId: '3',
      sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=3',
      title: 'Five by five',
      statement: 'Square of N.',
      inputFormat: 'One integer N.',
      outputFormat: 'N squared.',
      examples: [{ input: '5', output: '25' }],
      images: [],
    },
  ],
};

const fullMission = (order: 1 | 2 | 3) => ({
  order,
  title: `t${order}`,
  statement: `s${order}`,
  inputFormat: `in${order}`,
  outputFormat: `out${order}`,
  storyFraming: `f${order}`,
});

describe('weaveQuest (stubbed model)', () => {
  it('returns a schema-valid narrative with framings for all 4 missions', async () => {
    const generate: GenerateFn = async () => ({
      output: {
        detectedLanguage: 'en',
        questIntro: 'Earth needs you.',
        missions: [fullMission(1), fullMission(2), fullMission(3)],
        deploymentFraming: 'f4',
      },
    });
    const result = await weaveQuest(input, generate);
    expect(result.questIntro).toBe('Earth needs you.');
    expect(result.detectedLanguage).toBe('en');
    expect(result.framings[1]).toBe('f1');
    expect(result.framings[4]).toBe('f4');
    expect(Object.keys(result.localized!)).toHaveLength(3);
  });

  it('rejects malformed model output (missing a mission)', async () => {
    const generate: GenerateFn = async () => ({
      output: {
        detectedLanguage: 'en',
        questIntro: 'x',
        missions: [fullMission(1), fullMission(2)],
        deploymentFraming: 'f4',
      } as never,
    });
    await expect(weaveQuest(input, generate)).rejects.toThrow();
  });

  it('throws when the model returns no structured output', async () => {
    const generate: GenerateFn = async () => ({ output: null });
    await expect(weaveQuest(input, generate)).rejects.toThrow(/no structured output/);
  });
});
