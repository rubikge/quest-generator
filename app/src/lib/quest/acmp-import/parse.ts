import { parse as parseHtml, type HTMLElement } from 'node-html-parser';
import { taskUrl } from './fetch.js';

/**
 * Parse an ACMP task page (already decoded to a UTF-8 string) into structured, still-Russian fields.
 * Translation to English happens in a later stage (translate.ts). The statement block is delimited
 * by ACMP's `google_ad_section_start` / `google_ad_section_end` markers; inside it the prose uses
 * inline headers «Входные данные» / «Выходные данные» / «Пример», followed by an examples table
 * (`№ | INPUT.TXT | OUTPUT.TXT`). Complexity is read from the page header `Сложность: N%`.
 *
 * Returns a discriminated result so the orchestrator can flag (not crash on) unparseable pages.
 */

export interface ParsedTask {
  taskId: string;
  sourceUrl: string;
  titleRu: string;
  statementRu: string;
  inputFormatRu: string;
  outputFormatRu: string;
  examples: Array<{ input: string; output: string }>;
  imageUrls: string[];
  complexity: number;
}

export type ParseResult = { ok: true; task: ParsedTask } | { ok: false; reason: string };

const IN_HEADER = 'Входные данные';
const OUT_HEADER = 'Выходные данные';
const EX_HEADER = 'Пример';

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };

function decodeEntities(s: string): string {
  return s.replace(/&nbsp;|&lt;|&gt;|&amp;|&quot;|&#39;/g, (m) => ENTITIES[m] ?? m);
}

/** Text of an element preserving <br> as newlines and collapsing other inline whitespace. */
function cellText(el: HTMLElement): string {
  const withBreaks = el.innerHTML.replace(/<br\s*\/?>(\r?\n)?/gi, '\n').replace(/<[^>]+>/g, '');
  return decodeEntities(withBreaks).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
}

function collapse(s: string): string {
  return decodeEntities(s).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*\n\s*/g, '\n').trim();
}

function sliceBetween(text: string, start: string, end: string | null): string {
  const i = text.indexOf(start);
  if (i < 0) return '';
  const from = i + start.length;
  const j = end ? text.indexOf(end, from) : -1;
  return text.slice(from, j < 0 ? undefined : j);
}

export function parseTaskPage(html: string, id: string | number): ParseResult {
  const taskId = String(id);

  const titleMatch = html.match(/<title>\s*\d+\.\s*([^<]+?)\s*<\/title>/i);
  if (!titleMatch) return { ok: false, reason: 'no title' };
  const titleRu = decodeEntities(titleMatch[1]!.trim());

  const cxMatch = html.match(/Сложность:\s*(\d+)/);
  if (!cxMatch) return { ok: false, reason: 'no complexity' };
  const complexity = Number(cxMatch[1]);

  const s = html.indexOf('google_ad_section_start');
  const e = html.indexOf('google_ad_section_end');
  if (s < 0 || e < 0 || e <= s) return { ok: false, reason: 'no statement block' };
  const blockHtml = html.slice(html.indexOf('>', s) + 1, e);
  const block = parseHtml(blockHtml);

  // Examples table: rows of 3 cells whose first cell is a number.
  const examples: Array<{ input: string; output: string }> = [];
  let imageUrls: string[] = [];
  for (const table of block.querySelectorAll('table')) {
    for (const tr of table.querySelectorAll('tr')) {
      const tds = tr.querySelectorAll('td');
      if (tds.length === 3 && /^\d+$/.test(tds[0]!.text.trim())) {
        examples.push({ input: cellText(tds[1]!), output: cellText(tds[2]!) });
      }
    }
  }
  if (examples.length === 0) return { ok: false, reason: 'no examples' };

  // Content images (figures live in the statement block; nav assets are outside it).
  imageUrls = block
    .querySelectorAll('img')
    .map((i) => i.getAttribute('src') || '')
    .filter((src) => src && !/circle\.gif|youtube|rutube|yadro|yandex/i.test(src));

  // Prose: flatten block text (the examples table text trails after «Пример» and is cut off).
  const text = collapse(block.text);
  const statementRu = collapse(text.slice(0, text.indexOf(IN_HEADER) >= 0 ? text.indexOf(IN_HEADER) : undefined));
  const inputFormatRu = collapse(sliceBetween(text, IN_HEADER, OUT_HEADER));
  const afterOut = sliceBetween(text, OUT_HEADER, EX_HEADER);
  const outputFormatRu = collapse(afterOut);

  if (!statementRu || !inputFormatRu || !outputFormatRu) return { ok: false, reason: 'missing statement/input/output section' };

  return {
    ok: true,
    task: { taskId, sourceUrl: taskUrl(taskId), titleRu, statementRu, inputFormatRu, outputFormatRu, examples, imageUrls, complexity },
  };
}
