import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTaskPage } from '../../src/lib/quest/acmp-import/parse.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'acmp');
const load = (id: string) => readFileSync(join(fixtures, `${id}.html`), 'utf8');

describe('parseTaskPage (against real ACMP fixtures)', () => {
  it('extracts all fields from task 1 (A+B, no figure)', () => {
    const r = parseTaskPage(load('1'), 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.task;
    expect(t.taskId).toBe('1');
    expect(t.sourceUrl).toBe('https://acmp.ru/index.asp?main=task&id_task=1');
    expect(t.titleRu).toBe('A+B');
    expect(t.complexity).toBe(2);
    expect(t.statementRu.length).toBeGreaterThan(0);
    expect(t.inputFormatRu).toContain('INPUT.TXT');
    expect(t.outputFormatRu).toContain('OUTPUT.TXT');
    expect(t.examples.length).toBeGreaterThanOrEqual(1);
    expect(t.examples[0]).toEqual({ input: '2 3', output: '5' });
    expect(t.imageUrls).toEqual([]);
  });

  it('captures the content figure on task 6 (Chess)', () => {
    const r = parseTaskPage(load('6'), 6);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.task.complexity).toBe(23);
    expect(r.task.imageUrls.length).toBe(1);
    expect(r.task.imageUrls[0]).toContain('image.asp?id=');
    expect(r.task.examples.length).toBeGreaterThanOrEqual(1);
  });

  it('parses several low-complexity tasks without throwing', () => {
    for (const id of ['2', '3', '4']) {
      const r = parseTaskPage(load(id), id);
      expect(r.ok, `task ${id}`).toBe(true);
      if (r.ok) {
        expect(r.task.examples.length).toBeGreaterThanOrEqual(1);
        expect(r.task.titleRu.length).toBeGreaterThan(0);
      }
    }
  });

  it('flags (does not throw) a page with no examples table', () => {
    const noExamples = `<html><head><title>999. Test</title></head><body>
      Сложность: 5%
      <!-- google_ad_section_start -->
      Some statement. Входные данные in. Выходные данные out.
      <!-- google_ad_section_end --></body></html>`;
    const r = parseTaskPage(noExamples, 999);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no examples');
  });

  it('flags a page missing the statement block', () => {
    const r = parseTaskPage('<html><head><title>5. X</title></head><body>Сложность: 1%</body></html>', 5);
    expect(r.ok).toBe(false);
  });
});
