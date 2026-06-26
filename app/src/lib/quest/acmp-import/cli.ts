import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { importTasks } from './index.js';
import { CURATED_TASK_IDS } from './authored/index.js';
import { makeGenkitTranslator, type Translator } from './translate.js';
import { markReady } from './upsert.js';

/**
 * ACMP import CLI (Article II). Examples:
 *   npm run import:acmp -- --ids 1,2,3 --dry-run --json
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --ids 1,2,3,4,6,7,9,10,11,24
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --mark-ready 1
 * Output: a JSON summary to stdout; errors to stderr.
 */

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'public');

async function main() {
  const markReadyId = arg('--mark-ready');
  if (markReadyId) {
    await markReady(markReadyId);
    process.stdout.write(JSON.stringify({ markedReady: markReadyId }) + '\n');
    return;
  }

  const ids = (arg('--ids')?.split(',').map((s) => s.trim()).filter(Boolean)) ?? CURATED_TASK_IDS;
  const dryRun = has('--dry-run');

  // Lazy Genkit translator (kept out of the unit suite). Stubbed by --no-translate for offline runs.
  let translate: Translator;
  if (has('--no-translate')) {
    translate = async (ru) => ru; // keep canonical text as-is (no live model call)
  } else {
    const { ai } = await import('../../../ai/genkit.js');
    translate = makeGenkitTranslator(ai, z);
  }

  const results = await importTasks(ids, { translate, fsRoot: PUBLIC_DIR, dryRun });
  const summary = {
    dryRun,
    imported: results.filter((r) => r.status === 'imported').length,
    flagged: results.filter((r) => r.status === 'flagged').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main().catch((err) => {
  process.stderr.write(`import:acmp error: ${(err as Error).message}\n`);
  process.exit(1);
});
