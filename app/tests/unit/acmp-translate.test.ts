import { describe, it, expect } from 'vitest';
import { translateTask, type Translator } from '../../src/lib/quest/acmp-import/translate.js';
import type { ParsedTask } from '../../src/lib/quest/acmp-import/parse.js';

const parsed: ParsedTask = {
  taskId: '1',
  sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=1',
  titleRu: 'A+B',
  statementRu: 'Требуется сложить два числа A и B, |A|,|B| <= 109.',
  inputFormatRu: 'В файле INPUT.TXT два числа.',
  outputFormatRu: 'В файл OUTPUT.TXT их сумму.',
  examples: [{ input: '2 3', output: '5' }],
  imageUrls: [],
  complexity: 2,
};

// Stub translator: pretend-translate by tagging, but echo back the same numbers/identifiers so the
// test can assert they were preserved by the (real) prompt contract.
const stub: Translator = async (ru) => ({
  title: ru.title, // A+B has no Russian
  statement: 'Add two numbers A and B, |A|,|B| <= 109.',
  inputFormat: 'Two numbers in INPUT.TXT.',
  outputFormat: 'Their sum in OUTPUT.TXT.',
});

describe('translateTask', () => {
  it('translates prose, preserves numbers/identifiers, keeps examples verbatim', async () => {
    const en = await translateTask(parsed, stub);
    expect(en.statement).toContain('109'); // numeric constraint preserved
    expect(en.inputFormat).toContain('INPUT.TXT'); // filename preserved
    expect(en.outputFormat).toContain('OUTPUT.TXT');
    expect(en.examples).toEqual([{ input: '2 3', output: '5' }]); // verbatim
    expect(en.complexity).toBe(2);
    expect(en.sourceUrl).toBe(parsed.sourceUrl);
  });

  it('propagates a translator failure', async () => {
    const failing: Translator = async () => {
      throw new Error('no output');
    };
    await expect(translateTask(parsed, failing)).rejects.toThrow();
  });
});
