import { describe, it, expect } from 'vitest';
import { assembleQuest, buildDeploymentStatement } from '../../src/lib/quest/assemble.js';
import { QuestSchema, type Task } from '../../src/lib/quest/model/index.js';

const task = (taskId: string, title: string): Task => ({
  taskId,
  sourceUrl: `https://acmp.ru/index.asp?main=task&id_task=${taskId}`,
  title,
  statement: `Statement ${taskId}`,
  inputFormat: 'in',
  outputFormat: 'out',
  examples: [{ input: 'a', output: 'b' }],
  images: taskId === '892' ? ['tasks/892/1.png'] : [],
  complexity: 10,
  runtime: 'js',
  solverSource: 'function solve(i){return i;}',
  testGenSource: 'function generateTests(){return [{input:"a",kind:"edge"}];}',
  ready: true,
});

const codingTasks: Task[] = [task('892', 'Seasons'), task('757', 'Alcohol'), task('907', 'Beacon')];

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

  it('maps the 3 coding tasks to ordered coding missions carrying display data', () => {
    expect(quest.missions.slice(0, 3).map((m) => m.taskId)).toEqual(['892', '757', '907']);
    expect(quest.missions.slice(0, 3).map((m) => m.kind)).toEqual(['coding', 'coding', 'coding']);
    expect(quest.missions[0]?.sourceUrl).toBe('https://acmp.ru/index.asp?main=task&id_task=892');
    expect(quest.missions[0]?.examples).toEqual([{ input: 'a', output: 'b' }]);
    expect(quest.missions[0]?.images).toEqual(['tasks/892/1.png']);
  });

  it('makes the 4th mission a deployment mission referencing all ids AND source links', () => {
    const final = quest.missions[3]!;
    expect(final.kind).toBe('deployment');
    expect(final.order).toBe(4);
    expect(final.taskId).toBeNull();
    for (const id of ['892', '757', '907']) expect(final.statement).toContain(id);
    expect(final.statement).toContain('https://acmp.ru/index.asp?main=task&id_task=907');
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
  it('lists the task ids and the original source links the README must contain', () => {
    const stmt = buildDeploymentStatement([
      { taskId: '892', sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=892' },
      { taskId: '757', sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=757' },
    ]);
    expect(stmt).toContain('892');
    expect(stmt).toContain('757');
    expect(stmt).toContain('https://acmp.ru/index.asp?main=task&id_task=892');
  });
});
