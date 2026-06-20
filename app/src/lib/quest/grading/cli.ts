/**
 * CLI for the grading library (Constitution Article II: text/JSON in → JSON out).
 * Usage: echo '{"solverKey":"season-analysis","input":"1\n7","submitted":"Winter\nSummer"}' \
 *          | tsx src/lib/quest/grading/cli.ts
 * Or:    echo '{"expected":"YES","submitted":"YES"}' | tsx src/lib/quest/grading/cli.ts
 */
import { gradeOutput, gradeMission } from './index.js';
import { getSolver } from '../tasks/registry.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  try {
    const data = JSON.parse(await readStdin());
    const result =
      typeof data.solverKey === 'string'
        ? gradeMission({ solverKey: data.solverKey, input: data.input ?? '', submitted: data.submitted ?? '' }, { getSolver })
        : gradeOutput({ expected: data.expected ?? '', submitted: data.submitted ?? '' });
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.correct ? 0 : 1);
  } catch (err) {
    process.stderr.write(`grading error: ${(err as Error).message}\n`);
    process.exit(2);
  }
}

void main();
