import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadImages } from '../../src/lib/quest/acmp-import/assets.js';

const root = mkdtempSync(join(tmpdir(), 'acmp-assets-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const pngResponse = () =>
  new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { 'content-type': 'image/png' } });

describe('downloadImages', () => {
  it('writes figures under tasks/<id>/ and returns POSIX relative paths', async () => {
    const fetchImpl = (async () => pngResponse()) as unknown as typeof fetch;
    const paths = await downloadImages({ taskId: '6', imageUrls: ['/asp/article/image.asp?id=144'] }, { fsRoot: root, fetchImpl });
    expect(paths).toEqual(['tasks/6/1.png']);
    expect(existsSync(join(root, 'tasks', '6', '1.png'))).toBe(true);
    expect(readdirSync(join(root, 'tasks', '6'))).toEqual(['1.png']);
  });

  it('returns [] for a task with no figures (no fetch, no dir)', async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return pngResponse();
    }) as unknown as typeof fetch;
    const paths = await downloadImages({ taskId: '1', imageUrls: [] }, { fsRoot: root, fetchImpl });
    expect(paths).toEqual([]);
    expect(called).toBe(false);
  });

  it('throws on a failed image fetch', async () => {
    const fetchImpl = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    await expect(downloadImages({ taskId: '9', imageUrls: ['/x.png'] }, { fsRoot: root, fetchImpl })).rejects.toThrow();
  });
});
