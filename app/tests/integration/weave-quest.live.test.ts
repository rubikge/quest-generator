import { describe, it, expect } from 'vitest';
import { config } from 'dotenv';
import { liveWeaveQuest, type WeaveQuestInput } from '../../src/ai/flows/weave-quest.js';

// T039 — LIVE smoke test against real Gemini via Genkit. Separately gated (plan C2):
// only runs when GEMINI_API_KEY is set, so default CI stays deterministic/offline.
config(); // load .env / .env.local if present

const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

const input: WeaveQuestInput = {
  theme: 'alien invasion',
  level: 'beginner',
  tasks: [
    { order: 1, kind: 'coding', title: 'Seasons', statement: 'Map months to seasons.', taskId: '892' },
    { order: 2, kind: 'coding', title: 'Fuel', statement: 'Count alcohol molecules.', taskId: '757' },
    { order: 3, kind: 'coding', title: 'Beacon', statement: 'Does the circle fit?', taskId: '907' },
    { order: 4, kind: 'deployment', title: 'Final report', statement: 'Deploy to GitHub.', taskId: null },
  ],
};

describe.skipIf(!hasKey)('weaveQuest LIVE (real Gemini)', () => {
  it('returns schema-valid narrative with 4 mission framings', async () => {
    const result = await liveWeaveQuest(input);
    expect(result.questIntro.length).toBeGreaterThan(0);
    expect(Object.keys(result.framings)).toHaveLength(4);
    expect(result.framings[1].length).toBeGreaterThan(0);
    expect(result.framings[4].length).toBeGreaterThan(0);
  }, 60000);
});

describe.skipIf(hasKey)('weaveQuest LIVE (skipped: no GEMINI_API_KEY)', () => {
  it('is skipped until a Gemini key is provided', () => {
    expect(hasKey).toBe(false);
  });
});
