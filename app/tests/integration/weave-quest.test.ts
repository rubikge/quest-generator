import { describe, it, expect } from 'vitest';
import { weaveQuest, type GenerateFn, type WeaveQuestInput } from '../../src/ai/flows/weave-quest.js';

// T015 — weaveQuest flow contract test with a STUBBED model (plan C2: deterministic CI).
const input: WeaveQuestInput = {
  theme: 'alien invasion',
  level: 'beginner',
  tasks: [
    { order: 1, kind: 'coding', title: 'A', statement: 'sa', taskId: '892' },
    { order: 2, kind: 'coding', title: 'B', statement: 'sb', taskId: '757' },
    { order: 3, kind: 'coding', title: 'C', statement: 'sc', taskId: '907' },
    { order: 4, kind: 'deployment', title: 'Final', statement: 'deploy', taskId: null },
  ],
};

describe('weaveQuest (stubbed model)', () => {
  it('returns schema-valid narrative with framings for all 4 missions', async () => {
    const generate: GenerateFn = async () => ({
      output: {
        questIntro: 'Earth needs you.',
        missions: [
          { order: 1, storyFraming: 'f1' },
          { order: 2, storyFraming: 'f2' },
          { order: 3, storyFraming: 'f3' },
          { order: 4, storyFraming: 'f4' },
        ],
      },
    });
    const result = await weaveQuest(input, generate);
    expect(result.questIntro).toBe('Earth needs you.');
    expect(result.framings[1]).toBe('f1');
    expect(result.framings[4]).toBe('f4');
  });

  it('rejects malformed model output (missing a mission)', async () => {
    const generate: GenerateFn = async () => ({
      output: {
        questIntro: 'x',
        missions: [
          { order: 1, storyFraming: 'f1' },
          { order: 2, storyFraming: 'f2' },
          { order: 3, storyFraming: 'f3' },
        ],
      } as never,
    });
    await expect(weaveQuest(input, generate)).rejects.toThrow();
  });

  it('throws when the model returns no structured output', async () => {
    const generate: GenerateFn = async () => ({ output: null });
    await expect(weaveQuest(input, generate)).rejects.toThrow(/no structured output/);
  });
});
