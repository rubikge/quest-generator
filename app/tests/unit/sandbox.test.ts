import { describe, it, expect } from 'vitest';
import { runSolver, runGenerator } from '../../src/lib/quest/sandbox/index.js';

const SOLVER_OK = 'function solve(input){ return input.trim().toUpperCase(); }';

describe('runSolver', () => {
  it('returns the correct output for a valid solver', () => {
    const r = runSolver(SOLVER_OK, ' yes\n');
    expect(r).toEqual({ ok: true, output: 'YES' });
  });

  it('flags a non-string return as invalid', () => {
    const r = runSolver('function solve(){ return 42; }', 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid');
  });

  it('flags a missing solve() as invalid', () => {
    const r = runSolver('const nope = 1;', 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid');
  });

  it('enforces a wall-clock timeout on an infinite loop', () => {
    const r = runSolver('function solve(){ while(true){} }', 'x', { timeoutMs: 150 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('timeout');
  });

  it('enforces a memory cap on runaway allocation', () => {
    const src = 'function solve(){ const a=[]; while(true){ a.push(new Array(1000000).fill(7)); } }';
    const r = runSolver(src, 'x', { timeoutMs: 3000, memoryMb: 16 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('memory');
  });

  it('denies host access (no process/require/global fetch)', () => {
    const r = runSolver('function solve(){ return typeof process + "," + typeof require + "," + typeof fetch; }', 'x');
    // Either the names are undefined (so the solver returns "undefined,undefined,undefined")
    // or accessing them throws — both prove no host access.
    if (r.ok) expect(r.output).toBe('undefined,undefined,undefined');
    else expect(['throw', 'invalid']).toContain(r.error);
  });

  it('does not leak state between calls (fresh isolate each time)', () => {
    runSolver('globalThis.LEAK = 1; function solve(){ return "a"; }', 'x');
    const r = runSolver('function solve(){ return String(typeof globalThis.LEAK); }', 'x');
    expect(r).toEqual({ ok: true, output: 'undefined' });
  });
});

describe('runGenerator', () => {
  it('returns parsed labeled TestCase[]', () => {
    const src = `function generateTests(){ return [
      { input: '1', kind: 'positive' },
      { input: '-1', kind: 'negative' },
      { input: '0', kind: 'edge' },
    ]; }`;
    const r = runGenerator(src);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cases).toHaveLength(3);
      expect(r.cases.map((c) => c.kind)).toEqual(['positive', 'negative', 'edge']);
      expect(r.cases[0]!.input).toBe('1');
    }
  });

  it('flags cases missing input/kind as invalid', () => {
    const r = runGenerator("function generateTests(){ return [{ foo: 1 }]; }");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid');
  });

  it('flags a non-array return as invalid', () => {
    const r = runGenerator("function generateTests(){ return 'nope'; }");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid');
  });
});
