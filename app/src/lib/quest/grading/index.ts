/**
 * Output-comparison grading (research R2 / clarified scope): the platform computes the
 * correct output for a generated input via the task's reference solver and compares it
 * to the learner's submitted output. Learner code is never executed.
 */

export interface GradeResult {
  correct: boolean;
}

const normalize = (s: string): string => s.trim();

/** Compare a submitted output against the expected output (whitespace-tolerant at the edges). */
export function gradeOutput(args: { expected: string; submitted: string }): GradeResult {
  return { correct: normalize(args.submitted) === normalize(args.expected) };
}

export interface SolverLookup {
  getSolver: (key: string) => { solve: (input: string) => string } | undefined;
}

/** Grade a coding mission: resolve its solver, compute the expected output for the
 * given input, and compare to the submission. Throws if the solverKey is unresolvable. */
export function gradeMission(
  args: { solverKey: string; input: string; submitted: string },
  registry: SolverLookup,
): GradeResult {
  const solver = registry.getSolver(args.solverKey);
  if (!solver) throw new Error(`Unresolvable solverKey: ${args.solverKey}`);
  return gradeOutput({ expected: solver.solve(args.input), submitted: args.submitted });
}
