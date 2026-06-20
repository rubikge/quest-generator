import { describe, it, expect } from 'vitest';
import {
  TaskSchema,
  ThemeSchema,
  QuestSchema,
  ProgressSchema,
  SessionSchema,
  type Quest,
} from '../../src/lib/quest/model/index.js';

const codingMission = (order: 1 | 2 | 3) => ({
  order,
  kind: 'coding' as const,
  taskId: `id-${order}`,
  solverKey: `solver-${order}`,
  title: `Mission ${order}`,
  statement: 'Solve it.',
  storyFraming: 'Once upon a time...',
});

const deploymentMission = {
  order: 4 as const,
  kind: 'deployment' as const,
  taskId: null,
  solverKey: null,
  title: 'Final report',
  statement: 'Deploy to GitHub.',
  storyFraming: 'The end is near...',
};

const validQuest = (): Quest => ({
  id: 'q1',
  theme: 'alien invasion',
  level: 'beginner',
  questIntro: 'Earth needs you.',
  missions: [codingMission(1), codingMission(2), codingMission(3), deploymentMission],
  createdAt: '2026-06-20T12:00:00.000Z',
});

describe('TaskSchema', () => {
  it('accepts a valid task', () => {
    const t = { taskId: '892', title: 'Seasons', statement: 'Do it', level: 'beginner', solverKey: 'season-analysis' };
    expect(TaskSchema.parse(t).taskId).toBe('892');
  });

  it('rejects an unknown level', () => {
    const t = { taskId: '1', title: 'x', statement: 'y', level: 'expert', solverKey: 'k' };
    expect(() => TaskSchema.parse(t)).toThrow();
  });

  it('rejects an empty taskId', () => {
    const t = { taskId: '', title: 'x', statement: 'y', level: 'beginner', solverKey: 'k' };
    expect(() => TaskSchema.parse(t)).toThrow();
  });
});

describe('ThemeSchema', () => {
  it('accepts a normal theme', () => {
    expect(ThemeSchema.parse('fantasy heist')).toBe('fantasy heist');
  });
  it('rejects empty and over-long themes', () => {
    expect(() => ThemeSchema.parse('')).toThrow();
    expect(() => ThemeSchema.parse('x'.repeat(121))).toThrow();
  });
});

describe('QuestSchema', () => {
  it('accepts a valid 4-mission quest', () => {
    expect(QuestSchema.parse(validQuest()).missions).toHaveLength(4);
  });

  it('rejects a quest without exactly 4 missions', () => {
    const q = validQuest();
    (q.missions as unknown[]).pop();
    expect(() => QuestSchema.parse(q)).toThrow();
  });

  it('rejects when the final mission is not a deployment mission', () => {
    const q = validQuest();
    q.missions[3] = { ...codingMission(3), order: 4 } as never;
    expect(() => QuestSchema.parse(q)).toThrow();
  });

  it('rejects a coding mission with a null solverKey', () => {
    const q = validQuest();
    q.missions[0] = { ...codingMission(1), solverKey: null } as never;
    expect(() => QuestSchema.parse(q)).toThrow();
  });
});

describe('ProgressSchema / SessionSchema', () => {
  it('accepts valid progress', () => {
    expect(ProgressSchema.parse({ currentMission: 1, solvedMissions: [], won: false }).won).toBe(false);
  });

  it('rejects won=true unless mission 4 is solved', () => {
    const session = {
      sessionId: 's1',
      quest: validQuest(),
      progress: { currentMission: 4, solvedMissions: [1, 2, 3], won: true },
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    expect(() => SessionSchema.parse(session)).toThrow();
  });

  it('accepts won=true when mission 4 is solved', () => {
    const session = {
      sessionId: 's1',
      quest: validQuest(),
      progress: { currentMission: 4, solvedMissions: [1, 2, 3, 4], won: true },
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    expect(SessionSchema.parse(session).progress.won).toBe(true);
  });
});
