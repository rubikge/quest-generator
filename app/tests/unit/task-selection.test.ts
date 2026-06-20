import { describe, it, expect } from 'vitest';
import { selectQuestTasks } from '../../src/lib/quest/task-selection/index.js';
import type { Task } from '../../src/lib/quest/model/index.js';

const task = (taskId: string, level: Task['level'], solverKey: string): Task => ({
  taskId,
  title: `Task ${taskId}`,
  statement: 'Solve it.',
  level,
  solverKey,
});

// Every solverKey resolves except 'broken'.
const resolves = (key: string) => key !== 'broken';

describe('selectQuestTasks', () => {
  it('selects exactly 3 coding tasks at the requested level', () => {
    const tasks = [
      task('1', 'beginner', 'season-analysis'),
      task('2', 'beginner', 'molecule-calc'),
      task('3', 'beginner', 'mouse-rug'),
      task('4', 'advanced', 'season-analysis'),
    ];
    const result = selectQuestTasks({ tasks, level: 'beginner', hasSolver: resolves });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.codingTasks).toHaveLength(3);
      expect(result.codingTasks.every((t) => t.level === 'beginner')).toBe(true);
    }
  });

  it('excludes tasks whose solverKey does not resolve', () => {
    const tasks = [
      task('1', 'beginner', 'season-analysis'),
      task('2', 'beginner', 'broken'),
      task('3', 'beginner', 'mouse-rug'),
    ];
    const result = selectQuestTasks({ tasks, level: 'beginner', hasSolver: resolves });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INSUFFICIENT_TASKS');
      expect(result.available).toBe(2);
    }
  });

  it('returns INSUFFICIENT_TASKS when fewer than 3 eligible tasks exist for the level', () => {
    const tasks = [task('1', 'advanced', 'season-analysis'), task('2', 'advanced', 'mouse-rug')];
    const result = selectQuestTasks({ tasks, level: 'advanced', hasSolver: resolves });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INSUFFICIENT_TASKS');
  });

  it('uses an injected picker for deterministic selection order', () => {
    const tasks = [
      task('1', 'beginner', 'season-analysis'),
      task('2', 'beginner', 'molecule-calc'),
      task('3', 'beginner', 'mouse-rug'),
      task('4', 'beginner', 'season-analysis'),
    ];
    // picker that reverses the eligible pool
    const result = selectQuestTasks({
      tasks,
      level: 'beginner',
      hasSolver: resolves,
      pick: (pool, n) => [...pool].reverse().slice(0, n),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.codingTasks.map((t) => t.taskId)).toEqual(['4', '3', '2']);
  });
});
