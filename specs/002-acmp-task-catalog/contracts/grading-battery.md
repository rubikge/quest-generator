# Contract: Test Battery & Grading (`lib/quest/grading` + `lib/quest/sandbox`)

Learner submissions are graded against the **full ≥30-case battery** (FR-019) with whitespace-
tolerant comparison (FR-020). The solver and test generator are the task's **DB-stored code**, run
only via the sandbox (research R2/R5/R9). Learner code is never executed.

## Function contracts

```text
# the task's stored code (data), executed via sandbox-runner.md:
#   solverSource    -> solve(input: string): string
#   testGenSource   -> generateTests(): TestCase[]   TestCase = { input, kind: positive|negative|edge }

buildBattery(testGenSource, sandbox) -> { inputBlock: string, cases: TestCase[] }
  # runGenerator(testGenSource) -> cases (>=30, all kinds); inputBlock = cases concatenated

# grading
normalizeOutput(s) -> string
  # split into lines; rstrip trailing whitespace on each line; drop trailing blank lines; rejoin
gradeOutput({ expected, submitted }) -> { correct: boolean }     # normalizeOutput equality
gradeMission({ solverSource, input, submitted }, sandbox) -> { correct } | { error }
  # expected = runSolver(solverSource, input); correct = gradeOutput({expected, submitted})
  # returns { error } (not a throw) if the sandboxed solver faults (timeout/throw/memory)
```

## Play loop (server action, thin adapter)

1. On mission start, load the task by `mission.taskId`; `buildBattery(task.testGenSource, sandbox)`;
   persist `inputBlock` on `session.missionInputs[order]`.
2. Display that input block to the learner (with statement/examples/format/images).
3. On submit, `gradeMission({ solverSource: task.solverSource, input: session.missionInputs[order], submitted }, sandbox)`.
4. Correct only if the whole battery output matches; else reject and allow retry (carryover FR-011).

## Rules

- `generateTests()` MUST yield **≥30 distinct labeled cases** including ≥1 each of positive, negative,
  and edge — not purely random.
- Grading recomputes expected against the **persisted** input via the sandboxed solver (no cached
  expected output trusted).
- Comparison trims trailing whitespace per line and trailing blank lines; interior content must match
  exactly (no token reordering / numeric tolerance unless a task documents it).
- A sandboxed solver fault surfaces a safe error to the learner; it never crashes the request (FR-007a).

## Contract tests (write first, MUST FAIL)

- `buildBattery` over a sample `testGenSource` returns ≥30 cases incl. each `kind`; `inputBlock`
  concatenates them.
- For each imported task, the sandboxed `solve(inputBlock)` reproduces every parsed ACMP `example`
  (readiness gate, R7).
- `gradeOutput` accepts outputs differing only by trailing spaces / a trailing newline; rejects a
  single wrong line (FR-019/FR-020).
- `gradeMission` returns `{ error }` (not a throw) when the solver source times out/throws.
- A submission correct for 29/30 cases is graded **incorrect** (all-or-nothing, FR-019).
