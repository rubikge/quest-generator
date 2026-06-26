import { describe, it, expect } from 'vitest';
import { validateTask } from '../../src/lib/quest/acmp-import/validate.js';

// A+B reference solver + generator (the kind authored per task in T022).
const solverSource = 'function solve(input){ return input.trim().split("\\n").map(l => { const [a,b] = l.trim().split(/\\s+/).map(Number); return String(a+b); }).join("\\n"); }';
const genSource = `function generateTests(){
  const cases = [];
  cases.push({ input: '0 0', kind: 'edge' });
  cases.push({ input: '-5 5', kind: 'negative' });
  cases.push({ input: '1000000000 1000000000', kind: 'edge' });
  for (let i = 1; i <= 30; i++) cases.push({ input: (i) + ' ' + (i*2), kind: 'positive' });
  return cases;
}`;

describe('validateTask', () => {
  it('passes when the solver reproduces examples and the generator yields ≥30 labeled cases', () => {
    const r = validateTask({ solverSource, testGenSource: genSource, examples: [{ input: '2 3', output: '5' }, { input: '10 20', output: '30' }] });
    expect(r.ok).toBe(true);
    expect(r.caseCount).toBeGreaterThanOrEqual(30);
    expect(r.kinds).toEqual(['edge', 'negative', 'positive']);
  });

  it('fails when the solver does not reproduce an example', () => {
    const r = validateTask({ solverSource, testGenSource: genSource, examples: [{ input: '2 3', output: '6' }] });
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/example 1/);
  });

  it('fails when the generator yields too few cases or misses a required kind', () => {
    const few = "function generateTests(){ return [{input:'1 1',kind:'positive'}]; }";
    const r = validateTask({ solverSource, testGenSource: few, examples: [{ input: '2 3', output: '5' }] });
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/< 30|missing a 'edge'/);
  });

  it('fails safely when the solver code times out', () => {
    const r = validateTask(
      { solverSource: 'function solve(){ while(true){} }', testGenSource: genSource, examples: [{ input: '2 3', output: '5' }] },
      { timeoutMs: 150 },
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/timeout/);
  });
});
