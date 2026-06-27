import { readFileSync } from 'node:fs';
import { runSolver, runGenerator } from './index.js';

/**
 * Thin JSON CLI over the sandbox (Article II / observability).
 *
 *   npm run sandbox:run -- --solver <file.js> --input <file|-> [--timeout 1000] [--memory 32]
 *   npm run sandbox:run -- --gen <file.js> [--timeout 1000] [--memory 32]
 *
 * Prints the result as JSON to stdout; errors to stderr with a non-zero exit.
 */
function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

function readInput(spec: string | undefined): string {
  if (spec === undefined || spec === '-') return readFileSync(0, 'utf8'); // stdin
  return readFileSync(spec, 'utf8');
}

function main(): void {
  const opts = {
    timeoutMs: arg('--timeout') ? Number(arg('--timeout')) : undefined,
    memoryMb: arg('--memory') ? Number(arg('--memory')) : undefined,
  };

  const solverPath = arg('--solver');
  const genPath = arg('--gen');

  if (genPath) {
    const result = runGenerator(readSource(genPath), opts);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.ok ? 0 : 1);
  }

  if (solverPath) {
    const result = runSolver(readSource(solverPath), readInput(arg('--input')), opts);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.ok ? 0 : 1);
  }

  process.stderr.write('usage: --solver <file> --input <file|-> | --gen <file> [--timeout ms] [--memory mb]\n');
  process.exit(2);
}

main();
