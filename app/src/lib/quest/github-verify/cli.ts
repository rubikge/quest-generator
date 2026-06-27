/**
 * CLI for the github-verify library (Constitution Article II: text/JSON in → JSON out).
 * Usage:
 *   tsx src/lib/quest/github-verify/cli.ts <repoUrl> <taskId> [<taskId> ...] \
 *     [--link <sourceUrl>] [--link <sourceUrl> ...]
 * Performs a real network fetch of the repository README. Emits the JSON VerifyResult, which
 * for US4 reports `missingTaskIds` and `missingLinks` when the win condition is not met.
 */
import { verifyDeployment } from './index.js';

async function main() {
  const argv = process.argv.slice(2);
  const taskIds: string[] = [];
  const sourceUrls: string[] = [];
  let repoUrl: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--link') {
      const url = argv[++i];
      if (url) sourceUrls.push(url);
    } else if (repoUrl === undefined) {
      repoUrl = arg;
    } else {
      taskIds.push(arg);
    }
  }

  if (!repoUrl || taskIds.length === 0) {
    process.stderr.write('usage: github-verify <repoUrl> <taskId> [<taskId> ...] [--link <sourceUrl> ...]\n');
    process.exit(2);
  }
  try {
    const result = await verifyDeployment({
      repoUrl,
      taskIds,
      sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
    });
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    process.stderr.write(`github-verify error: ${(err as Error).message}\n`);
    process.exit(2);
  }
}

void main();
