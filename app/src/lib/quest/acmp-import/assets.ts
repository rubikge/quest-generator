import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParsedTask } from './parse.js';

/**
 * Download a task's content figures and store them as static app assets under
 * `<fsRoot>/tasks/<taskId>/<n>.<ext>` (served by the app). Returns the relative paths to store on
 * the task (`tasks/<taskId>/<n>.<ext>`). A task with no figures yields `[]`. Research R6.
 */

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function absolutize(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return `https:${src}`;
  return `https://acmp.ru${src.startsWith('/') ? '' : '/'}${src}`;
}

export interface DownloadImagesOptions {
  /** Filesystem root that maps to the served static dir (e.g. `<repo>/app/public`). */
  fsRoot: string;
  fetchImpl?: typeof fetch;
}

export async function downloadImages(parsed: Pick<ParsedTask, 'taskId' | 'imageUrls'>, opts: DownloadImagesOptions): Promise<string[]> {
  if (parsed.imageUrls.length === 0) return [];
  const fetchImpl = opts.fetchImpl ?? fetch;
  const relDir = join('tasks', parsed.taskId);
  const absDir = join(opts.fsRoot, relDir);
  await mkdir(absDir, { recursive: true });

  const paths: string[] = [];
  let n = 0;
  for (const src of parsed.imageUrls) {
    n += 1;
    const res = await fetchImpl(absolutize(src));
    if (!res.ok) throw new Error(`image fetch failed (${res.status}) for ${src}`);
    const type = (res.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
    const ext = EXT_BY_TYPE[type] ?? 'png';
    const bytes = Buffer.from(await res.arrayBuffer());
    const rel = join(relDir, `${n}.${ext}`);
    await writeFile(join(opts.fsRoot, rel), bytes);
    paths.push(rel.split(/[\\/]/).join('/')); // POSIX-style relative path for the web
  }
  return paths;
}
