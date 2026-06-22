/**
 * CLI for the grading library (Constitution Article II: text/JSON in → JSON out).
 * Usage:
 *   echo '{"solverSource":"function solve(i){return i.toUpperCase()}","input":"ab","submitted":"AB"}' \
 *          | tsx src/lib/quest/grading/cli.ts
 *   echo '{"expected":"YES","submitted":"YES"}' | tsx src/lib/quest/grading/cli.ts
 */
import { gradeOutput, gradeMission } from './index';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  try {
    const data = JSON.parse(await readStdin());
    const result =
      typeof data.solverSource === 'string'
        ? gradeMission({ solverSource: data.solverSource, input: data.input ?? '', submitted: data.submitted ?? '' })
        : gradeOutput({ expected: data.expected ?? '', submitted: data.submitted ?? '' });
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit('correct' in result && result.correct ? 0 : 1);
  } catch (err) {
    process.stderr.write(`grading error: ${(err as Error).message}\n`);
    process.exit(2);
  }
}

void main();
