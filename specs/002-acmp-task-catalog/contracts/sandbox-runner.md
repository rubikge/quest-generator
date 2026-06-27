# Contract: Sandbox Runner (`lib/quest/sandbox`)

Executes DB-stored task algorithms (`solverSource`, `testGenSource`) in an isolated V8 isolate
(`isolated-vm`) with hard limits and no host/network/filesystem access. This is the safety mechanism
that makes storing code in the DB acceptable (research R2/R9).

## Function contracts

```text
runSolver(source: string, input: string, opts?) -> { ok: true, output: string }
                                                  | { ok: false, error: 'timeout'|'memory'|'throw'|'invalid' , message }
  # evaluates `source` (must define solve(input)->string), calls solve(input) in a fresh isolate

runGenerator(source: string, opts?) -> { ok: true, cases: TestCase[] }
                                     | { ok: false, error: 'timeout'|'memory'|'throw'|'invalid', message }
  # evaluates `source` (must define generateTests()->TestCase[]) in a fresh isolate
  # TestCase = { input: string, kind: 'positive' | 'negative' | 'edge' }

# opts (defaults): { timeoutMs: 1000, memoryMb: 32 }
```

## Rules

- A **fresh isolate per call**; no state leaks between tasks or calls.
- Enforce a wall-clock **timeout** and a **memory cap**; exceeding either returns a typed error
  (never hangs/crashes the host).
- **No** access to host globals, `require`/`import`, network, filesystem, env, timers beyond the
  budget. Only the string input goes in; only the string/array result comes out.
- Output is coerced to string; non-string/oversized output → `invalid`.
- The runner never throws to the caller for sandboxed-code faults — it returns `{ ok: false, ... }`.

## CLI (Article II)

```text
npm run sandbox:run -- --solver <file.js> --input -      # run a solver over stdin, JSON result
npm run sandbox:run -- --gen <file.js> --json            # run a generator, print cases as JSON
```

## Contract tests (write first, MUST FAIL) — against the REAL `isolated-vm`

- `runSolver` returns the correct output for a trivial solver; a wrong/non-string return → `invalid`.
- A solver with an infinite loop returns `{ ok:false, error:'timeout' }` within the budget (host unaffected).
- A solver allocating beyond the cap returns `{ ok:false, error:'memory' }`.
- Source attempting host access (`process`, `require`, network) cannot reach it (throws/`invalid` inside).
- `runGenerator` returns parsed `TestCase[]`; cases missing `kind`/`input` → `invalid`.
- Two consecutive calls share no state (no global leakage).
