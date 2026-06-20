/**
 * Deterministic input generators and reference solvers, ported verbatim (logic-wise)
 * from the kodolom prototype's `src/lib/tasks.ts`. These are pure functions: the app
 * uses them to compute the correct output for a generated input, then compares it to
 * the learner's submitted output (it never executes learner code). See research R2.
 */

export interface Solver {
  generateInput: () => string;
  solve: (input: string) => string;
}

const randomLargeIntString = (maxDigits: number): string => {
  const numDigits = Math.floor(Math.random() * maxDigits) + 1;
  if (numDigits === 1) return String(Math.floor(Math.random() * 10));
  let result = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 1; i < numDigits; i++) result += String(Math.floor(Math.random() * 10));
  return result;
};

const nonEmptyLines = (input: string): string[] => input.split('\n').filter((line) => line.trim() !== '');

/** ACMP 892 — map month numbers (1..12) to seasons; 'Error' otherwise. */
export const seasonAnalysis: Solver = {
  generateInput: () => Array.from({ length: 50 }, () => String(Math.floor(Math.random() * 17))).join('\n'),
  solve: (input) =>
    nonEmptyLines(input)
      .map((monthStr) => {
        const month = parseInt(monthStr.trim(), 10);
        if (isNaN(month) || month < 1 || month > 12) return 'Error';
        if (month === 12 || month === 1 || month === 2) return 'Winter';
        if (month >= 3 && month <= 5) return 'Spring';
        if (month >= 6 && month <= 8) return 'Summer';
        return 'Autumn';
      })
      .join('\n'),
};

/** ACMP 757 — max alcohol molecules from C, H, O atoms: min(C/2, H/6, O). */
export const moleculeCalc: Solver = {
  generateInput: () =>
    Array.from({ length: 50 }, () => `${randomLargeIntString(18)} ${randomLargeIntString(18)} ${randomLargeIntString(18)}`).join('\n'),
  solve: (input) =>
    nonEmptyLines(input)
      .map((line) => {
        const parts = line.trim().split(' ');
        if (parts.length !== 3) return 'Error';
        try {
          const C = BigInt(parts[0]!);
          const H = BigInt(parts[1]!);
          const O = BigInt(parts[2]!);
          let result = C / 2n;
          const fromH = H / 6n;
          if (fromH < result) result = fromH;
          if (O < result) result = O;
          return result.toString();
        } catch {
          return 'Error';
        }
      })
      .join('\n'),
};

/** ACMP 907 — can a circle of radius R hide under a W×H panel? (2R <= W and 2R <= H). */
export const mouseRug: Solver = {
  generateInput: () =>
    Array.from({ length: 50 }, () => `${randomLargeIntString(9)} ${randomLargeIntString(9)} ${randomLargeIntString(9)}`).join('\n'),
  solve: (input) =>
    nonEmptyLines(input)
      .map((line) => {
        const parts = line.trim().split(' ');
        if (parts.length !== 3) return 'Error';
        try {
          const W = BigInt(parts[0]!);
          const H = BigInt(parts[1]!);
          const R = BigInt(parts[2]!);
          const diameter = 2n * R;
          return diameter <= W && diameter <= H ? 'YES' : 'NO';
        } catch {
          return 'Error';
        }
      })
      .join('\n'),
};
