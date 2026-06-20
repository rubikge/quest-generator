/**
 * CLI for the task-selection library (Constitution Article II: text/JSON in → JSON out).
 * Usage: echo '{"tasks":[...],"level":"beginner"}' | tsx src/lib/quest/task-selection/cli.ts
 */
import { selectQuestTasks } from './index.js';
import { TaskSchema, LevelSchema } from '../model/index.js';
import { z } from 'zod';

const InputSchema = z.object({ tasks: z.array(TaskSchema), level: LevelSchema });

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  try {
    const parsed = InputSchema.parse(JSON.parse(await readStdin()));
    const result = selectQuestTasks({ tasks: parsed.tasks, level: parsed.level });
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    process.stderr.write(`task-selection error: ${(err as Error).message}\n`);
    process.exit(2);
  }
}

void main();
