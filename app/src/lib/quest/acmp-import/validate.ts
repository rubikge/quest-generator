import { runSolver, runGenerator, type SandboxOptions } from '../sandbox/index.js';
import { normalizeOutput } from '../grading/index.js';

/**
 * Readiness validation (FR-006/FR-007/FR-007a): a task's stored solver + generator code must run in
 * the sandbox such that (a) the solver reproduces EVERY published ACMP example, and (b) the
 * generator yields ≥30 distinct cases including ≥1 each of positive/negative/edge. A task that fails
 * any check stays not-ready (and never reaches a learner). Curator confirmation is a separate gate.
 */

export interface ValidateInput {
  solverSource: string;
  testGenSource: string;
  examples: Array<{ input: string; output: string }>;
}

export interface ValidateResult {
  ok: boolean;
  reasons: string[];
  caseCount: number;
  kinds: string[];
}

const MIN_CASES = 30;

export function validateTask(task: ValidateInput, opts: SandboxOptions = {}): ValidateResult {
  const reasons: string[] = [];

  // (a) solver reproduces every published example
  task.examples.forEach((ex, i) => {
    const res = runSolver(task.solverSource, ex.input, opts);
    if (!res.ok) {
      reasons.push(`example ${i + 1}: solver ${res.error} (${res.message})`);
    } else if (normalizeOutput(res.output) !== normalizeOutput(ex.output)) {
      reasons.push(`example ${i + 1}: expected ${JSON.stringify(ex.output)}, solver produced ${JSON.stringify(res.output)}`);
    }
  });

  // (b) generator yields ≥30 labeled cases covering all kinds
  const gen = runGenerator(task.testGenSource, opts);
  let caseCount = 0;
  let kinds: string[] = [];
  if (!gen.ok) {
    reasons.push(`generator ${gen.error} (${gen.message})`);
  } else {
    caseCount = gen.cases.length;
    kinds = [...new Set(gen.cases.map((c) => c.kind))].sort();
    if (caseCount < MIN_CASES) reasons.push(`generator produced ${caseCount} cases (< ${MIN_CASES})`);
    for (const kind of ['positive', 'negative', 'edge'] as const) {
      if (!kinds.includes(kind)) reasons.push(`generator missing a '${kind}' case`);
    }
    // The solver must also run cleanly over the full generated battery.
    const block = gen.cases.map((c) => c.input).join('\n');
    const battery = runSolver(task.solverSource, block, opts);
    if (!battery.ok) reasons.push(`solver failed over the generated battery: ${battery.error} (${battery.message})`);
  }

  return { ok: reasons.length === 0, reasons, caseCount, kinds };
}
