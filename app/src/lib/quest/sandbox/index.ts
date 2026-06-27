import ivm from 'isolated-vm';

/**
 * Executes DB-stored task algorithms (`solverSource`, `testGenSource`) in an isolated V8 isolate
 * with hard time/memory limits and no host/network/filesystem access. This is the safety mechanism
 * that makes storing solution/test-generation code in the database acceptable (research R2/R9).
 *
 * A fresh isolate is created per call, so no state leaks between tasks or invocations. Faults in the
 * sandboxed code are returned as typed results — they never throw to the caller.
 */

export type SandboxErrorKind = 'timeout' | 'memory' | 'throw' | 'invalid';

export interface SandboxOptions {
  /** Wall-clock budget for the script, in milliseconds (default 1000). */
  timeoutMs?: number;
  /** Memory cap for the isolate, in MiB (default 32). */
  memoryMb?: number;
}

export type RunSolverResult =
  | { ok: true; output: string }
  | { ok: false; error: SandboxErrorKind; message: string };

export interface TestCase {
  input: string;
  kind: 'positive' | 'negative' | 'edge';
}

export type RunGeneratorResult =
  | { ok: true; cases: TestCase[] }
  | { ok: false; error: SandboxErrorKind; message: string };

const DEFAULT_TIMEOUT_MS = 1000;
const DEFAULT_MEMORY_MB = 32;
/** Guard against runaway output bloating memory / the document. */
const MAX_OUTPUT_CHARS = 1_000_000;

const TEST_KINDS = new Set(['positive', 'negative', 'edge']);

/** Classify an error thrown by isolated-vm into a stable error kind. */
function classifyError(err: unknown): { error: SandboxErrorKind; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (/timed out|timeout/i.test(message)) return { error: 'timeout', message };
  if (/memory|disposed|allocation failed|array buffer/i.test(message)) return { error: 'memory', message };
  return { error: 'throw', message };
}

/**
 * Run a fragment that defines a function and returns its result as a string. The fragment is
 * evaluated in a fresh isolate; `inputJson` (already JSON-encoded) is injected as a global so the
 * source cannot be broken by string interpolation.
 */
function runInIsolate(
  source: string,
  callExpression: string,
  inputJson: string | null,
  opts: SandboxOptions,
): { value: string; threw: false } | { threw: true; error: SandboxErrorKind; message: string } {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const memoryLimit = opts.memoryMb ?? DEFAULT_MEMORY_MB;
  const isolate = new ivm.Isolate({ memoryLimit });
  try {
    const context = isolate.createContextSync();
    if (inputJson !== null) {
      context.global.setSync('__inputJson__', inputJson);
    }
    // `source` defines the function; `callExpression` invokes it and yields a string the host copies out.
    const script = `${source}\n;(function(){ ${callExpression} })();`;
    const value = context.evalSync(script, { timeout, copy: true }) as unknown;
    if (typeof value !== 'string') {
      return { threw: true, error: 'invalid', message: 'sandboxed code did not return a string' };
    }
    return { value, threw: false };
  } catch (err) {
    const { error, message } = classifyError(err);
    return { threw: true, error, message };
  } finally {
    // After an out-of-memory abort isolated-vm disposes the isolate itself; calling dispose()
    // again throws. Guard so the classified result is preserved.
    try {
      isolate.dispose();
    } catch {
      /* already disposed (e.g. memory-limit abort) */
    }
  }
}

/**
 * Run a reference solver: `source` must define `solve(input: string): string`. Returns the solver's
 * output, or a typed error if it faults, times out, exceeds memory, or returns a non-string.
 */
export function runSolver(source: string, input: string, opts: SandboxOptions = {}): RunSolverResult {
  // Return the raw result (no String() coercion) so a non-string return is caught as `invalid`
  // by runInIsolate's typeof guard.
  const call = 'if (typeof solve !== "function") throw new __INVALID__("no solve()"); return solve(JSON.parse(__inputJson__));';
  const prelude = 'function __INVALID__(m){ this.message=m; this.__invalid=true; }';
  const res = runInIsolate(`${prelude}\n${source}`, call, JSON.stringify(input), opts);
  if (res.threw) {
    // A missing solve() surfaces as our marker — normalize to 'invalid'.
    if (/no solve\(\)/.test(res.message)) return { ok: false, error: 'invalid', message: 'source does not define solve()' };
    return { ok: false, error: res.error, message: res.message };
  }
  if (res.value.length > MAX_OUTPUT_CHARS) {
    return { ok: false, error: 'invalid', message: `output exceeds ${MAX_OUTPUT_CHARS} chars` };
  }
  return { ok: true, output: res.value };
}

/**
 * Run a test generator: `source` must define `generateTests(): TestCase[]`. Returns the validated
 * cases (each `{ input: string, kind: positive|negative|edge }`), or a typed error.
 */
export function runGenerator(source: string, opts: SandboxOptions = {}): RunGeneratorResult {
  const call = 'if (typeof generateTests !== "function") throw new Error("no generateTests()"); return JSON.stringify(generateTests());';
  const res = runInIsolate(source, call, null, opts);
  if (res.threw) {
    if (/no generateTests\(\)/.test(res.message)) return { ok: false, error: 'invalid', message: 'source does not define generateTests()' };
    return { ok: false, error: res.error, message: res.message };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.value);
  } catch {
    return { ok: false, error: 'invalid', message: 'generateTests() did not return JSON-serializable cases' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'invalid', message: 'generateTests() must return an array' };
  }
  const cases: TestCase[] = [];
  for (const c of parsed) {
    if (
      !c ||
      typeof c !== 'object' ||
      typeof (c as TestCase).input !== 'string' ||
      !TEST_KINDS.has((c as TestCase).kind)
    ) {
      return { ok: false, error: 'invalid', message: 'each case must be { input: string, kind: positive|negative|edge }' };
    }
    cases.push({ input: (c as TestCase).input, kind: (c as TestCase).kind });
  }
  return { ok: true, cases };
}
