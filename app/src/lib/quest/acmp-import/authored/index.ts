/**
 * Authored reference algorithms for the curated ACMP starter set (T022). Each task gets a `solve`
 * and a `generateTests` written as a self-contained function, serialized to source so it can be
 * stored on the task document and executed in the sandbox (research R2). Solvers process a MULTI-CASE
 * stream (one case per line, or per line-pair for tasks whose case spans two lines) so a single
 * published example AND a ≥30-case battery both work.
 *
 * `confidence` flags how sure we are of correctness for the curator (FR-006). Examples are the parsed
 * ACMP examples used to sanity-check during authoring; the live import uses the freshly-parsed ones.
 */

type Kind = 'positive' | 'negative' | 'edge';
type GenCase = { input: string; kind: Kind };

interface Authored {
  solver: (input: string) => string;
  gen: () => GenCase[];
  confidence: 'high' | 'medium';
  note?: string;
}

// Shared line splitter used inside solvers (inlined per solver since each is serialized standalone).

// #1 A+B — sum of two integers per line.
const s1 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const p = l.trim().split(/\s+/);
    return (BigInt(p[0]!) + BigInt(p[1]!)).toString();
  }).join('\n');
const g1 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '0 0', kind: 'edge' }, { input: '1000000000 1000000000', kind: 'edge' }, { input: '2 3', kind: 'positive' }];
  for (let i = 1; i <= 30; i++) cs.push({ input: i + ' ' + i * 7, kind: 'positive' });
  return cs;
};

// #2 Сумма — sum of integers between 1 and N inclusive (N may be negative, |N|<=10^4).
const s2 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const n = BigInt(l.trim());
    const lo = n < 1n ? n : 1n;
    const hi = n < 1n ? 1n : n;
    return ((lo + hi) * (hi - lo + 1n) / 2n).toString();
  }).join('\n');
const g2 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '1', kind: 'edge' }, { input: '0', kind: 'edge' }, { input: '-10000', kind: 'edge' }, { input: '10000', kind: 'edge' }];
  for (let i = 2; i <= 20; i++) cs.push({ input: String(i), kind: 'positive' });
  for (let i = 1; i <= 12; i++) cs.push({ input: String(-i), kind: 'negative' });
  return cs;
};

// #3 Пятью пять — square of N (numbers ending in 5; works for any N via BigInt).
const s3 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const n = BigInt(l.trim());
    return (n * n).toString();
  }).join('\n');
const g3 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '5', kind: 'edge' }, { input: '99999999995', kind: 'edge' }];
  for (let i = 0; i < 31; i++) cs.push({ input: String(i * 10 + 5), kind: 'positive' });
  return cs;
};

// #4 Игра «Угадайка» — given the first digit f of |abc - cba| = 99*(d), result = 99*(f+1).
const s4 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const f = BigInt(l.trim());
    return (99n * (f + 1n)).toString();
  }).join('\n');
const g4 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '1', kind: 'edge' }, { input: '8', kind: 'edge' }];
  for (let r = 0; r < 30; r++) cs.push({ input: String((r % 8) + 1), kind: 'positive' });
  return cs;
};

// #6 Шахматы — validate a knight move "X#-Y#" (X,Y in A-H, # in 1-8): YES/NO/ERROR.
const s6 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l, i, a) => !(i === a.length - 1 && l === '')).map((line) => {
    if (!/^[A-H][1-8]-[A-H][1-8]$/.test(line)) return 'ERROR';
    const dx = Math.abs(line.charCodeAt(0) - line.charCodeAt(3));
    const dy = Math.abs(Number(line[1]) - Number(line[4]));
    return (dx === 1 && dy === 2) || (dx === 2 && dy === 1) ? 'YES' : 'NO';
  }).join('\n');
const g6 = (): GenCase[] => {
  const cs: GenCase[] = [
    { input: 'C7-D5', kind: 'positive' }, { input: 'E2-E4', kind: 'positive' },
    { input: 'BSN', kind: 'negative' }, { input: 'D9-N5', kind: 'negative' }, { input: 'A1-A1', kind: 'edge' },
  ];
  const cols = 'ABCDEFGH';
  for (let i = 0; i < 28; i++) {
    const c1 = cols[i % 8], r1 = (i % 8) + 1, c2 = cols[(i + 1) % 8], r2 = ((i + 2) % 8) + 1;
    cs.push({ input: `${c1}${r1}-${c2}${r2}`, kind: 'positive' });
  }
  return cs;
};

// #7 Золото — maximum of three non-negative integers (up to 10^100).
const s7 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const xs = l.trim().split(/\s+/).map((x) => BigInt(x));
    let m = xs[0]!;
    for (const x of xs) if (x > m) m = x;
    return m.toString();
  }).join('\n');
const g7 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '5 7 3', kind: 'positive' }, { input: '1 1 1', kind: 'edge' }, { input: '0 0 0', kind: 'edge' }, { input: '99999999999999999999 1 2', kind: 'edge' }];
  for (let i = 1; i <= 30; i++) cs.push({ input: `${i} ${i * 3} ${i * 2}`, kind: 'positive' });
  return cs;
};

// #9 Домашнее задание — per case (2 lines: N, then N ints): "sumPositive productBetweenMinAndMax".
const s9 = (input: string): string => {
  const lines = input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  const out: string[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const arr = lines[i + 1]!.trim().split(/\s+/).map((x) => BigInt(x));
    let sumPos = 0n;
    for (const x of arr) if (x > 0n) sumPos += x;
    let iMax = 0, iMin = 0;
    for (let j = 0; j < arr.length; j++) {
      if (arr[j]! > arr[iMax]!) iMax = j;
      if (arr[j]! < arr[iMin]!) iMin = j;
    }
    const lo = Math.min(iMax, iMin), hi = Math.max(iMax, iMin);
    let prod = 1n;
    for (let j = lo + 1; j < hi; j++) prod *= arr[j]!;
    out.push(sumPos.toString() + ' ' + prod.toString());
  }
  return out.join('\n');
};
const g9 = (): GenCase[] => {
  const cs: GenCase[] = [];
  for (let i = 0; i < 32; i++) {
    const maxV = 1000 + i, minV = -1000 - i;
    const a = i + 1, b = -(i + 2), c = (i % 5) + 3;
    cs.push({ input: `5\n${maxV} ${a} ${b} ${c} ${minV}`, kind: i < 2 ? 'edge' : 'positive' });
  }
  return cs;
};

// #10 Уравнение — integer roots of A x^3 + B x^2 + C x + D in [-100,100], ascending, space-separated.
const s10 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const p = l.trim().split(/\s+/).map((x) => BigInt(x));
    const A = p[0]!, B = p[1]!, C = p[2]!, D = p[3]!;
    const roots: string[] = [];
    for (let x = -100n; x <= 100n; x++) if (A * x * x * x + B * x * x + C * x + D === 0n) roots.push(x.toString());
    return roots.join(' ');
  }).join('\n');
const g10 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '1 -3 0 0', kind: 'positive' }, { input: '1 0 0 0', kind: 'edge' }, { input: '1 0 1 0', kind: 'edge' }];
  // Build cubics (x-r1)(x-r2)(x-r3) with known integer roots.
  for (let i = 0; i < 30; i++) {
    const r1 = (i % 7) - 3, r2 = (i % 5) + 1, r3 = -(i % 4) - 2;
    const B = -(r1 + r2 + r3);
    const C = r1 * r2 + r1 * r3 + r2 * r3;
    const D = -(r1 * r2 * r3);
    cs.push({ input: `1 ${B} ${C} ${D}`, kind: 'positive' });
  }
  return cs;
};

// #11 Зайчик — number of compositions of N with parts in 1..K (input "K N").
const s11 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const p = l.trim().split(/\s+/).map(Number);
    const K = p[0]!, N = p[1]!;
    const dp: bigint[] = new Array(N + 1).fill(0n);
    dp[0] = 1n;
    for (let i = 1; i <= N; i++) {
      let sum = 0n;
      for (let j = 1; j <= Math.min(K, i); j++) sum += dp[i - j]!;
      dp[i] = sum;
    }
    return dp[N]!.toString();
  }).join('\n');
const g11 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '1 3', kind: 'edge' }, { input: '2 7', kind: 'positive' }, { input: '3 10', kind: 'positive' }, { input: '5 1', kind: 'edge' }];
  for (let i = 1; i <= 29; i++) cs.push({ input: `${(i % 4) + 1} ${(i % 15) + 1}`, kind: 'positive' });
  return cs;
};

// #24 Вырубка — ways to keep m equally-spaced trees out of n in a row (input "n m").
const s24 = (input: string): string =>
  input.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '').map((l) => {
    const p = l.trim().split(/\s+/).map((x) => BigInt(x));
    const n = p[0]!, m = p[1]!;
    if (m === 1n) return n.toString();
    if (m > n) return '0';
    let total = 0n;
    for (let d = 1n; (m - 1n) * d <= n - 1n; d++) total += n - (m - 1n) * d;
    return total.toString();
  }).join('\n');
const g24 = (): GenCase[] => {
  const cs: GenCase[] = [{ input: '5 3', kind: 'positive' }, { input: '5 1', kind: 'edge' }, { input: '5 5', kind: 'edge' }, { input: '3 5', kind: 'negative' }];
  for (let i = 0; i < 30; i++) {
    const n = 10 + i, m = (i % 6) + 2;
    cs.push({ input: `${n} ${m}`, kind: 'positive' });
  }
  return cs;
};

const REGISTRY: Record<string, Authored> = {
  '1': { solver: s1, gen: g1, confidence: 'high' },
  '2': { solver: s2, gen: g2, confidence: 'high' },
  '3': { solver: s3, gen: g3, confidence: 'high' },
  '4': { solver: s4, gen: g4, confidence: 'high', note: 'derived: |abc-cba|=99·d, first digit f=d-1 ⇒ result=99·(f+1)' },
  '6': { solver: s6, gen: g6, confidence: 'medium', note: 'assumes uppercase A-H squares; any other format ⇒ ERROR' },
  '7': { solver: s7, gen: g7, confidence: 'high' },
  '9': { solver: s9, gen: g9, confidence: 'high', note: 'product is of elements strictly between the (unique) max and min positions' },
  '10': { solver: s10, gen: g10, confidence: 'high', note: 'integer roots in [-100,100], ascending' },
  '11': { solver: s11, gen: g11, confidence: 'high', note: 'input order is "K N"' },
  '24': { solver: s24, gen: g24, confidence: 'high' },
};

/**
 * Curator sign-off (FR-006). A task is eligible to be `ready` only when it is BOTH validated
 * (solver reproduces examples + ≥30-case battery) AND listed here. Approved by the curator on
 * 2026-06-22 (all 10 of the curated starter set). Recording approval as repo data makes it durable
 * and reproducible across imports (vs. a one-off markReady against an ephemeral store).
 */
const APPROVED_TASK_IDS = new Set(['1', '2', '3', '4', '6', '7', '9', '10', '11', '24']);

export interface AuthoredAlgorithms {
  runtime: 'js';
  solverSource: string;
  testGenSource: string;
  confidence: 'high' | 'medium';
  approved: boolean;
  note?: string;
}

export function getAuthoredAlgorithms(taskId: string): AuthoredAlgorithms | null {
  const a = REGISTRY[taskId];
  if (!a) return null;
  return {
    runtime: 'js',
    solverSource: 'const solve = ' + a.solver.toString(),
    testGenSource: 'const generateTests = ' + a.gen.toString(),
    confidence: a.confidence,
    approved: APPROVED_TASK_IDS.has(taskId),
    note: a.note,
  };
}

/** The curated starter set of task ids to import (T027). */
export const CURATED_TASK_IDS = ['1', '2', '3', '4', '6', '7', '9', '10', '11', '24'];
