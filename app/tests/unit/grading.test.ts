import { describe, it, expect } from 'vitest';
import { gradeOutput, gradeMission, buildBattery, normalizeOutput } from '../../src/lib/quest/grading/index.js';

describe('normalizeOutput / gradeOutput', () => {
  it('marks an exact match correct', () => {
    expect(gradeOutput({ expected: 'Winter\nSpring', submitted: 'Winter\nSpring' }).correct).toBe(true);
  });

  it('tolerates trailing whitespace per line and a trailing newline', () => {
    expect(gradeOutput({ expected: 'YES\nNO', submitted: 'YES  \nNO\n' }).correct).toBe(true);
    expect(normalizeOutput('a \nb\n\n')).toBe('a\nb');
  });

  it('treats leading whitespace as significant (interior content must match exactly)', () => {
    expect(gradeOutput({ expected: 'YES\nNO', submitted: '  YES\nNO' }).correct).toBe(false);
  });

  it('marks a mismatch / empty submission incorrect', () => {
    expect(gradeOutput({ expected: 'YES', submitted: 'NO' }).correct).toBe(false);
    expect(gradeOutput({ expected: 'YES', submitted: '' }).correct).toBe(false);
  });
});

const ECHO = 'function solve(input){ return input.toUpperCase(); }';

describe('gradeMission (sandboxed solver)', () => {
  it('computes the expected output via the stored solver and compares', () => {
    expect(gradeMission({ solverSource: ECHO, input: 'abc', submitted: 'ABC' })).toEqual({ correct: true });
    expect(gradeMission({ solverSource: ECHO, input: 'abc', submitted: 'abc' })).toEqual({ correct: false });
  });

  it('is all-or-nothing across a multi-case block (29/30 wrong → incorrect)', () => {
    const input = Array.from({ length: 30 }, (_, i) => String(i + 1)).join('\n');
    const solver = 'function solve(input){ return input.split("\\n").map(n => String(Number(n) * 2)).join("\\n"); }';
    const expectedAll = Array.from({ length: 30 }, (_, i) => String((i + 1) * 2)).join('\n');
    expect(gradeMission({ solverSource: solver, input, submitted: expectedAll })).toEqual({ correct: true });
    const oneWrong = expectedAll.split('\n');
    oneWrong[15] = '999';
    expect(gradeMission({ solverSource: solver, input, submitted: oneWrong.join('\n') })).toEqual({ correct: false });
  });

  it('returns a typed error (not a throw) when the solver faults', () => {
    const r = gradeMission({ solverSource: 'function solve(){ while(true){} }', input: 'x', submitted: 'x' }, { timeoutMs: 150 });
    expect('error' in r).toBe(true);
    if ('error' in r) expect(r.error).toBe('timeout');
  });
});

describe('buildBattery (sandboxed generator)', () => {
  it('produces ≥30 labeled cases and a concatenated input block', () => {
    const gen = `function generateTests(){
      const cases = [];
      cases.push({ input: '0', kind: 'edge' });
      cases.push({ input: '-1', kind: 'negative' });
      for (let i = 1; i <= 30; i++) cases.push({ input: String(i), kind: 'positive' });
      return cases;
    }`;
    const r = buildBattery(gen);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.battery.cases.length).toBeGreaterThanOrEqual(30);
      const kinds = new Set(r.battery.cases.map((c) => c.kind));
      expect(kinds.has('positive') && kinds.has('negative') && kinds.has('edge')).toBe(true);
      expect(r.battery.inputBlock.split('\n')[0]).toBe('0');
    }
  });

  it('returns an error for an invalid generator', () => {
    const r = buildBattery('function generateTests(){ return "nope"; }');
    expect(r.ok).toBe(false);
  });
});
