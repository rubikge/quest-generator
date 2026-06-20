import { describe, it, expect } from 'vitest';
import { getSolver, hasSolver, listSolverKeys } from '../../src/lib/quest/tasks/registry.js';

describe('solver registry', () => {
  it('resolves the three ported prototype solvers', () => {
    for (const key of ['season-analysis', 'molecule-calc', 'mouse-rug']) {
      expect(hasSolver(key)).toBe(true);
      expect(typeof getSolver(key)?.solve).toBe('function');
      expect(typeof getSolver(key)?.generateInput).toBe('function');
    }
  });

  it('reports unknown keys as unresolvable', () => {
    expect(hasSolver('does-not-exist')).toBe(false);
    expect(getSolver('does-not-exist')).toBeUndefined();
  });

  it('lists registered keys', () => {
    expect(listSolverKeys()).toEqual(expect.arrayContaining(['season-analysis', 'molecule-calc', 'mouse-rug']));
  });
});

describe('season-analysis solver', () => {
  const s = getSolver('season-analysis')!;
  it('maps months to seasons and flags invalid months', () => {
    const input = '1\n4\n7\n10\n0\n13\nx';
    expect(s.solve(input)).toBe('Winter\nSpring\nSummer\nAutumn\nError\nError\nError');
  });
  it('generates 50 lines of input', () => {
    expect(s.generateInput().split('\n')).toHaveLength(50);
  });
});

describe('molecule-calc solver', () => {
  const s = getSolver('molecule-calc')!;
  it('computes min(C/2, H/6, O) using big integers', () => {
    // C=4 -> 2, H=12 -> 2, O=5 -> 5  => min = 2
    expect(s.solve('4 12 5')).toBe('2');
    // limited by oxygen
    expect(s.solve('100 600 3')).toBe('3');
  });
  it('flags malformed lines as Error', () => {
    expect(s.solve('1 2')).toBe('Error');
  });
});

describe('mouse-rug solver', () => {
  const s = getSolver('mouse-rug')!;
  it('answers YES when the beacon fits under the panel', () => {
    // diameter 2*R must be <= W and <= H
    expect(s.solve('10 10 4')).toBe('YES'); // d=8 <=10,10
    expect(s.solve('10 5 4')).toBe('NO'); // d=8 > 5
  });
  it('flags malformed lines as Error', () => {
    expect(s.solve('10 10')).toBe('Error');
  });
});
