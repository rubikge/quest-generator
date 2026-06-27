import { runSolver, runGenerator, type SandboxErrorKind, type SandboxOptions, type TestCase } from '../sandbox/index';

/**
 * Output-comparison grading (FR-019/FR-020). The reference solver and test generator are the task's
 * DB-stored code, executed only via the sandbox (research R2/R5/R9). The learner's own code is never
 * executed — we compare their submitted output to the sandboxed solver's expected output over the
 * full ≥30-case battery.
 */

export interface GradeResult {
  correct: boolean;
}

/**
 * Whitespace-tolerant normalization (FR-020): trim trailing whitespace on each line and drop
 * trailing blank lines. Interior and leading content must match exactly.
 */
export function normalizeOutput(s: string): string {
  return s
    .split('\n')
    .map((line) => line.replace(/[ \t\r]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/** Compare a submitted output against the expected output (whitespace-tolerant per FR-020). */
export function gradeOutput(args: { expected: string; submitted: string }): GradeResult {
  return { correct: normalizeOutput(args.submitted) === normalizeOutput(args.expected) };
}

export type GradeMissionResult = { correct: boolean } | { error: SandboxErrorKind; message: string };

/**
 * Grade a coding mission: run the task's stored solver (in the sandbox) over the persisted input to
 * compute the expected output, then compare to the submission. Returns a typed `{ error }` (never
 * throws) if the sandboxed solver faults (timeout/throw/memory/invalid).
 */
export function gradeMission(
  args: { solverSource: string; input: string; submitted: string },
  opts: SandboxOptions = {},
): GradeMissionResult {
  const res = runSolver(args.solverSource, args.input, opts);
  if (!res.ok) return { error: res.error, message: res.message };
  return gradeOutput({ expected: res.output, submitted: args.submitted });
}

export interface Battery {
  inputBlock: string;
  cases: TestCase[];
}

export type BuildBatteryResult = { ok: true; battery: Battery } | { ok: false; error: SandboxErrorKind; message: string };

/**
 * Build a mission's test battery: run the task's stored test generator (in the sandbox) to produce
 * ≥30 labeled cases, then concatenate their inputs into one input block (the learner runs their own
 * program over this block and submits the combined output). Research R5.
 */
export function buildBattery(testGenSource: string, opts: SandboxOptions = {}): BuildBatteryResult {
  const res = runGenerator(testGenSource, opts);
  if (!res.ok) return { ok: false, error: res.error, message: res.message };
  const inputBlock = res.cases.map((c) => c.input).join('\n');
  return { ok: true, battery: { inputBlock, cases: res.cases } };
}
