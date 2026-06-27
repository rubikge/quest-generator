import { describe, it, expect } from 'vitest';
import { splitTiers, selectQuestTasks } from '../../src/lib/quest/task-selection/index.js';
import type { Task } from '../../src/lib/quest/model/index.js';

const task = (taskId: string, complexity: number, ready = true): Task => ({
  taskId,
  sourceUrl: `https://acmp.ru/index.asp?main=task&id_task=${taskId}`,
  title: `Task ${taskId}`,
  statement: 'Solve it.',
  inputFormat: 'in',
  outputFormat: 'out',
  examples: [{ input: 'a', output: 'b' }],
  images: [],
  complexity,
  runtime: 'js',
  solverSource: 'function solve(i){return i;}',
  testGenSource: 'function generateTests(){return [{input:"a",kind:"edge"}];}',
  ready,
});

describe('splitTiers', () => {
  it('splits 9 tasks into 3/3/3 ascending by complexity', () => {
    const tasks = [9, 1, 8, 2, 7, 3, 6, 4, 5].map((c) => task(`t${c}`, c));
    const tiers = splitTiers(tasks);
    expect(tiers.beginner.map((t) => t.complexity)).toEqual([1, 2, 3]);
    expect(tiers.intermediate.map((t) => t.complexity)).toEqual([4, 5, 6]);
    expect(tiers.expert.map((t) => t.complexity)).toEqual([7, 8, 9]);
  });

  it('handles a count not divisible by 3 with contiguous floor boundaries (3/3/4)', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task(`t${i + 1}`, i + 1));
    const tiers = splitTiers(tasks);
    expect(tiers.beginner).toHaveLength(3);
    expect(tiers.intermediate).toHaveLength(3);
    expect(tiers.expert).toHaveLength(4);
    const total = tiers.beginner.length + tiers.intermediate.length + tiers.expert.length;
    expect(total).toBe(10); // no task lost
  });

  it('breaks complexity ties deterministically by taskId', () => {
    const tasks = [task('b', 5), task('a', 5), task('c', 5)];
    expect(splitTiers([...tasks]).beginner.concat(splitTiers([...tasks]).intermediate, splitTiers([...tasks]).expert).map((t) => t.taskId)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('excludes non-ready tasks', () => {
    const tasks = [task('1', 1, false), task('2', 2), task('3', 3), task('4', 4)];
    const tiers = splitTiers(tasks);
    const all = [...tiers.beginner, ...tiers.intermediate, ...tiers.expert];
    expect(all.find((t) => t.taskId === '1')).toBeUndefined();
    expect(all).toHaveLength(3);
  });
});

describe('selectQuestTasks', () => {
  const nine = [9, 1, 8, 2, 7, 3, 6, 4, 5].map((c) => task(`t${c}`, c));

  it('selects 3 from the correct tier per level', () => {
    const head = (pool: Task[], n: number) => pool.slice(0, n);
    const b = selectQuestTasks({ tasks: nine, level: 'beginner', pick: head });
    const m = selectQuestTasks({ tasks: nine, level: 'intermediate', pick: head });
    const e = selectQuestTasks({ tasks: nine, level: 'expert', pick: head });
    expect(b.ok && b.codingTasks.map((t) => t.complexity)).toEqual([1, 2, 3]);
    expect(m.ok && m.codingTasks.map((t) => t.complexity)).toEqual([4, 5, 6]);
    expect(e.ok && e.codingTasks.map((t) => t.complexity)).toEqual([7, 8, 9]);
  });

  it('returns INSUFFICIENT_TASKS with available count when a tier has < 3', () => {
    const few = [task('1', 1), task('2', 2), task('3', 3), task('4', 4)]; // beginner tier = floor(4/3)=1
    const r = selectQuestTasks({ tasks: few, level: 'beginner' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('INSUFFICIENT_TASKS');
      expect(r.available).toBe(1);
    }
  });

  it('uses an injected picker deterministically', () => {
    const r = selectQuestTasks({ tasks: nine, level: 'beginner', pick: (pool, n) => [...pool].reverse().slice(0, n) });
    expect(r.ok && r.codingTasks.map((t) => t.complexity)).toEqual([3, 2, 1]);
  });
});
