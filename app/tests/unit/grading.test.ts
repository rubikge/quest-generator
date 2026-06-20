import { describe, it, expect } from 'vitest';
import { gradeOutput, gradeMission } from '../../src/lib/quest/grading/index.js';

describe('gradeOutput', () => {
  it('marks an exact match correct', () => {
    expect(gradeOutput({ expected: 'Winter\nSpring', submitted: 'Winter\nSpring' }).correct).toBe(true);
  });

  it('ignores surrounding whitespace / trailing newline', () => {
    expect(gradeOutput({ expected: 'YES\nNO', submitted: '  YES\nNO\n' }).correct).toBe(true);
  });

  it('marks a mismatch incorrect', () => {
    expect(gradeOutput({ expected: 'YES', submitted: 'NO' }).correct).toBe(false);
  });

  it('treats empty / whitespace-only submissions as incorrect', () => {
    expect(gradeOutput({ expected: 'YES', submitted: '' }).correct).toBe(false);
    expect(gradeOutput({ expected: 'YES', submitted: '   \n ' }).correct).toBe(false);
  });
});

describe('gradeMission', () => {
  const registry = {
    getSolver: (key: string) =>
      key === 'echo' ? { generateInput: () => 'x', solve: (input: string) => input.toUpperCase() } : undefined,
  };

  it('computes the expected output via the solver and compares', () => {
    expect(gradeMission({ solverKey: 'echo', input: 'abc', submitted: 'ABC' }, registry).correct).toBe(true);
    expect(gradeMission({ solverKey: 'echo', input: 'abc', submitted: 'abc' }, registry).correct).toBe(false);
  });

  it('throws for an unresolvable solverKey', () => {
    expect(() => gradeMission({ solverKey: 'missing', input: 'x', submitted: 'X' }, registry)).toThrow();
  });
});
