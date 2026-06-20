/**
 * CLI for the github-verify library (Constitution Article II: text/JSON in → JSON out).
 * Usage: tsx src/lib/quest/github-verify/cli.ts <repoUrl> <taskId> [<taskId> ...]
 * Performs a real network fetch of the repository README.
 */
import { verifyDeployment } from './index.js';

async function main() {
  const [repoUrl, ...taskIds] = process.argv.slice(2);
  if (!repoUrl || taskIds.length === 0) {
    process.stderr.write('usage: github-verify <repoUrl> <taskId> [<taskId> ...]\n');
    process.exit(2);
  }
  try {
    const result = await verifyDeployment({ repoUrl, taskIds });
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    process.stderr.write(`github-verify error: ${(err as Error).message}\n`);
    process.exit(2);
  }
}

void main();
