import { type Solver, seasonAnalysis, moleculeCalc, mouseRug } from './solvers/index.js';

/**
 * Maps a Task's `solverKey` to its deterministic input generator + reference solver.
 * Catalog documents reference solvers by key; the executable code lives here (research R2),
 * so it stays versioned, unit-tested, and out of the database.
 */
const registry = new Map<string, Solver>([
  ['season-analysis', seasonAnalysis],
  ['molecule-calc', moleculeCalc],
  ['mouse-rug', mouseRug],
]);

export function getSolver(key: string): Solver | undefined {
  return registry.get(key);
}

export function hasSolver(key: string): boolean {
  return registry.has(key);
}

export function listSolverKeys(): string[] {
  return [...registry.keys()];
}

export function registerSolver(key: string, solver: Solver): void {
  registry.set(key, solver);
}

export type { Solver };
