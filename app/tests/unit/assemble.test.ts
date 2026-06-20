import { describe, it, expect } from 'vitest';
import { assembleQuest, buildDeploymentStatement } from '../../src/lib/quest/assemble.js';
import { QuestSchema, type Task } from '../../src/lib/quest/model/index.js';

const codingTasks: Task[] = [
  { taskId: '892', title: 'Seasons', statement: 'Map months', level: 'beginner', solverKey: 'season-analysis' },
  { taskId: '757', title: 'Alcohol', statement: 'Count molecules', level: 'beginner', solverKey: 'molecule-calc' },
  { taskId: '907', title: 'Beacon', statement: 'Fit circle', level: 'beginner', solverKey: 'mouse-rug' },
];

const narrative = {
  questIntro: 'Earth needs you.',
  framings: { 1: 'Frame 1', 2: 'Frame 2', 3: 'Frame 3', 4: 'Frame 4 (deploy)' } as Record<1 | 2 | 3 | 4, string>,
};

describe('assembleQuest', () => {
  const quest = assembleQuest({
    id: 'q1',
    theme: 'alien invasion',
    level: 'beginner',
    createdAt: '2026-06-20T12:00:00.000Z',
    codingTasks,
    narrative,
  });

  it('produces a schema-valid 4-mission quest', () => {
    expect(() => QuestSchema.parse(quest)).not.toThrow();
    expect(quest.missions).toHaveLength(4);
  });

  it('maps the 3 coding tasks to ordered coding missions with their solverKeys', () => {
    expect(quest.missions.slice(0, 3).map((m) => m.taskId)).toEqual(['892', '757', '907']);
    expect(quest.missions.slice(0, 3).map((m) => m.kind)).toEqual(['coding', 'coding', 'coding']);
    expect(quest.missions[1]?.solverKey).toBe('molecule-calc');
  });

  it('makes the 4th mission a deployment mission referencing all task ids', () => {
    const final = quest.missions[3]!;
    expect(final.kind).toBe('deployment');
    expect(final.order).toBe(4);
    expect(final.taskId).toBeNull();
    expect(final.statement).toContain('892');
    expect(final.statement).toContain('757');
    expect(final.statement).toContain('907');
  });

  it('applies the woven narrative framings', () => {
    expect(quest.questIntro).toBe('Earth needs you.');
    expect(quest.missions[0]?.storyFraming).toBe('Frame 1');
    expect(quest.missions[3]?.storyFraming).toBe('Frame 4 (deploy)');
  });

  it('throws if not given exactly 3 coding tasks', () => {
    expect(() =>
      assembleQuest({ id: 'q', theme: 't', level: 'beginner', createdAt: '2026-06-20T12:00:00.000Z', codingTasks: codingTasks.slice(0, 2), narrative }),
    ).toThrow();
  });
});

describe('buildDeploymentStatement', () => {
  it('lists the task ids the README must contain', () => {
    const stmt = buildDeploymentStatement(['892', '757', '907']);
    expect(stmt).toContain('892');
    expect(stmt).toContain('757');
    expect(stmt).toContain('907');
  });
});
