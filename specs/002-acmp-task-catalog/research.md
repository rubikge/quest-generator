# Phase 0 Research: ACMP Task Catalog & Difficulty-Tiered Selection

**Feature**: 002-acmp-task-catalog | **Date**: 2026-06-21

Resolves the open technical questions from the plan's Technical Context. The fixed inputs
(Google Cloud/Firebase/Genkit, anonymous session-only) and the four clarifications recorded in
spec.md (grade against all ≥30 tests; language auto-detected from theme; whitespace-tolerant
comparison; reference solver must reproduce ACMP examples + curator confirm) are not re-litigated.

---

## R1 — Porting from ACMP: fetch, parse, field mapping

**Decision**: Implement an offline `acmp-import` library with stages: **fetch** (HTTP GET of the
all-tasks listing and each `index.asp?main=task&id_task=<id>` page), **parse** (HTML → structured
fields with a small `node-html-parser`), **translate** (R3), **assets** (R6), **upsert** (R7).
Parse and map these fields per task page:

| ACMP source | Catalog field |
|-------------|---------------|
| task id (`id_task`) | `taskId` (string) + `sourceUrl = https://acmp.ru/index.asp?main=task&id_task=<id>` |
| title (Russian) | `title` (→ English via R3) |
| Условие / statement body (Russian, may contain `<img>`) | `statement` (→ English) + `images[]` (R6) |
| «Входные данные» | `inputFormat` (→ English) |
| «Выходные данные» | `outputFormat` (→ English) |
| examples table («Пример(ы)») input/output cells | `examples: {input, output}[]` (verbatim — NOT translated) |
| «Сложность» (numeric) | `complexity` (number) — tier ranking key (R4) |

**Rationale**: ACMP pages are static server-rendered HTML; a tiny parser against **saved real-page
fixtures** is deterministic and unit-testable (Article IX) without hitting the network in CI. The
id→URL pattern is the exact attribution link required by US4/FR-015.

**Alternatives considered**:
- Headless browser (Playwright) scraping — rejected: heavyweight, non-deterministic, unnecessary for
  static HTML.
- A heavy DOM lib (jsdom) — rejected: larger dependency than needed for tag/table extraction.
- Hard-coding the 10 tasks by hand (no parser) — rejected: violates FR-001/FR-002 (the porting must
  be executed and the structure must hold the full catalog).

---

## R2 — Storing solution + test-generation algorithms as code in the DB (data-driven catalog)

**Decision**: Store each task's **reference solution** and **test-generation algorithm** as code
(JavaScript) in the task document — fields `solverSource`, `testGenSource`, `runtime: "js"` — and
execute them only inside a sandbox (R9). The DB is the single source of truth; adding a task is a
pure data write (FR-007b). At import, the stored code is run in the sandbox to validate it reproduces
the parsed ACMP examples and yields a ≥30-case labeled battery; at grade time, the stored solver is
run to compute expected outputs. This **replaces** the feature-001 code-resident `solverKey`
registry (`tasks/solvers/`), which is removed.

**Rationale**: The user's explicit goal is a catalog that scales to unlimited tasks where each task
carries — and exposes — its own solution and test-generation algorithm. Holding the algorithms as
data makes the catalog fully data-driven (no per-task code deploy) and directly satisfies
FR-006/FR-007/FR-007b. Safety (the usual objection to code-in-DB) is handled by the sandbox (R9):
the code is curated, example-validated, and curator-reviewed before `ready` (FR-006), and runs with
hard limits and no host access. Documented as **C3** (justified added component) in the plan.

**Alternatives considered**:
- Code-resident solvers keyed by id (the prior C3) — rejected: requires a code deploy per task,
  defeating data-driven scale.
- Declarative DSL for solution/tests — rejected for v1: too restrictive for ACMP's diverse problems
  (considered and declined by the user).
- Store only static (input, expected-output) fixtures — rejected: doesn't store the *algorithm*
  (user intent) and loses per-play battery regeneration.

---

## R3 — Translation to English without corrupting I/O rules

**Decision**: Translate `title`, `statement`, `inputFormat`, `outputFormat` to **English at import**
via a Genkit translation step (Gemini), storing English as canonical. **Example input/output cells
are stored verbatim** (never translated — they are data). A second, *separate* localization happens
at quest time (R5). Translation prompts are constrained to preserve all numbers, identifiers,
constraints, and formatting tokens; the authoritative grading never depends on translated prose.

**Rationale**: English canonical storage (clarified) decouples source language from display and lets
R5 localize to any learner language. Keeping examples verbatim and grading solver-driven means
translation can never change a correct answer. Reusing Genkit avoids a new dependency
(Anti-Abstraction).

**Alternatives considered**:
- Store Russian originals and translate only at display — rejected: contradicts the clarified
  English-canonical decision and re-translates on every play.
- A non-LLM translation API — rejected: adds a separate external dependency; Genkit is already
  mandated and present.

---

## R4 — Complexity tier split (ranking, ties, non-divisible counts)

**Decision**: At selection time, load all `ready` tasks, sort ascending by `(complexity, taskId)`
(taskId breaks ties deterministically), and split into three contiguous parts by index using
boundaries `floor(n/3)` and `floor(2n/3)`: indices `[0, b1)` = beginner (lowest third),
`[b1, b2)` = intermediate (middle third), `[b2, n)` = expert (highest third). Pick **3 at random**
from the matching part; if that part has < 3, return `INSUFFICIENT_TASKS` (FR-012).

**Rationale**: Index-based contiguous thirds guarantee every task lands in exactly one tier with no
loss for any `n` (handles non-divisible counts), and deterministic tie-breaking makes the split
stable and testable. Recomputing over all tasks at selection time auto-rebalances as the catalog
grows (spec assumption).

**Alternatives considered**:
- Fixed numeric complexity thresholds — rejected: brittle as the catalog grows; user asked for a
  dynamic three-way split of *all available* tasks.
- ACMP's named difficulty groups — considered in clarify; user chose the numeric complexity score.
- Storing a static `level` per task — rejected: tier is now derived; a stored level would drift from
  the dynamic split (the existing `level` enum is repurposed to the learner's *choice*, not a task
  attribute).

---

## R5 — "Graded against all ≥30 tests" within the existing play loop

**Decision**: The task's stored `testGenSource` (run in the sandbox, R9) returns ≥30 **labeled**
cases — `kind: 'positive' | 'negative' | 'edge'` — combining curated edge cases (boundaries,
empty/min/max, invalid-per-spec, duplicates) with randomized cases. These are concatenated into a
**single input block**; the stored `solverSource` (also sandboxed) computes the expected output for
the whole block. The learner is shown that input, runs their own program in any language, and submits
the whole output. Grading compares expected vs submitted over the entire block; correct only if
**every** case matches (FR-019). The generated input block is persisted on the session (extending
`missionInputs`) so grading recomputes the expected output against the exact input shown.

**Rationale**: One input/one output keeps the play loop simple while satisfying the all-≥30-tests
requirement and explicit positive/negative/edge coverage. Labeling cases lets the readiness gate
assert each category is present. Persisting the input keeps grading deterministic against what the
learner saw, and recomputing via the stored solver avoids trusting any cached expected output.

**Alternatives considered**:
- 30 separate inputs the learner submits one-by-one — rejected: tedious UX, 30× round-trips, no
  added rigor over one combined block.
- Grade against only the worked example — rejected: contradicts the clarified all-tests scope and
  misses edge cases.

---

## R6 — Illustration storage

**Decision**: Download each task's referenced images at import and store them as **static app
assets** under `app/public/tasks/<taskId>/<n>.<ext>`; the catalog document stores relative paths in
`images[]`. The UI renders them inline; tasks with no images render cleanly (FR-005, edge case).

**Rationale**: For a curated catalog, static assets add **no new service** (Simplicity), keep the
quest self-contained and offline-testable, and are immune to ACMP changing/removing source images.
Firebase Storage is the documented path if/when the full catalog (large image volume) is ported.

**Alternatives considered**:
- Firebase Storage now — rejected for v1: adds a service + emulator surface for ~a handful of images.
- Hot-link ACMP image URLs at display — rejected: not self-contained; breaks if source changes;
  contradicts the spec assumption to store illustrations.
- Base64 in Firestore — rejected: bloats documents, risks the 1 MiB document limit.

---

## R7 — Idempotent upsert + readiness/curator gate

**Decision**: Upsert by `taskId` (Firestore doc id = `taskId`), so re-running the import updates or
skips rather than duplicating (FR-017). A task is written with `ready: false` until it passes the
gate: its reference solver reproduces **every** parsed ACMP worked example, AND its generator yields
≥30 distinct cases, AND a curator confirms (sets `ready: true`). Only `ready` tasks enter selection
(R4). Tasks failing parse/translate/asset/battery steps are skipped or flagged, never corrupting the
rest of the import (FR-018).

**Rationale**: Doc-id-as-taskId gives idempotency for free. The example-reproduction + curator
confirmation is exactly the clarified validation gate (Q4/FR-006) and the only trustworthy substitute
for ACMP's hidden judge.

**Alternatives considered**:
- Auto-generated doc ids — rejected: breaks idempotency, risks duplicates.
- Auto-mark ready on example match only (no curator) — rejected: clarified answer requires curator
  confirmation; example I/O alone under-specifies correctness.

---

## R8 — Level taxonomy change (`advanced` → `expert`)

**Decision**: The learner-chosen level enum becomes `beginner | intermediate | expert` (FR-010),
mapping to lowest/middle/highest complexity thirds. Rename the existing `advanced` value to `expert`
across model, UI, seeds, and tests. `level` is no longer a stored *task* attribute (tier is derived,
R4); it denotes only the learner's selection.

**Rationale**: The spec explicitly names "expert"; aligning the enum avoids a display/value mismatch.
Removing `level` from the task document prevents drift from the dynamic tier split.

**Alternatives considered**:
- Keep `advanced` as the value, label it "Expert" in UI — rejected: value/label mismatch invites
  bugs and confuses contracts/tests.
- Keep a stored task `level` alongside complexity — rejected: two sources of truth for difficulty.

---

## R9 — Sandbox runtime for DB-stored algorithms

**Decision**: Execute `solverSource`/`testGenSource` in an **in-process V8 isolate** via
`isolated-vm`: a fresh isolate per execution, a hard wall-clock timeout, a memory cap, and **no**
host/network/filesystem access (only the input string in, the output string out). A small `sandbox`
library wraps this with a typed API (`runSolver(source, input)`, `runGenerator(source)`), used by
both import-time validation and grade-time computation. Curated code is also example-validated and
curator-reviewed before `ready` (defense in depth).

**Rationale**: `isolated-vm` gives real V8-level isolation with enforceable CPU/memory limits inside
the existing Node runtime — no separate service or project (Simplicity holds), used directly
(Anti-Abstraction). It is testable against the **real** library (Integration-First): timeouts,
memory limits, and host-access denial are asserted in unit tests. This is the safety mechanism that
makes R2 (code-in-DB) acceptable.

**Alternatives considered**:
- `vm`/`vm2` — rejected: `node:vm` is not a security boundary; `vm2` is deprecated with known escapes.
- A separate Cloud Run grading microservice — rejected for v1: new project + ops surface; revisit if
  untrusted/third-party task code or heavier languages are later required.
- WASM/Pyodide per-language runtimes — rejected for v1: heavyweight; JS authored solvers suffice and
  tasks are language-agnostic for the *learner*, not the reference algorithm.

---

## R10 — Language-agnostic ("de-Python") reframing

**Decision**: Remove "Python" as a product constraint. Coding tasks are language-agnostic — the
learner may solve them in any language and submit output (grading is output comparison only). Purge
"Python" from the project name/package, docs, UI copy, and code identifiers; the constitution's
Python language mandate was removed (v1.1.0). The platform's own implementation language (TypeScript)
and the stored reference-algorithm language (JavaScript) are unaffected.

**Rationale**: Grading never depended on the learner's language (it compares output), so the "Python"
framing was incidental. Dropping it widens the product and resolves analysis finding F1 (the
constitution had mandated Python while the codebase is TypeScript).

**Alternatives considered**:
- Keep "Python" branding but allow any language — rejected: misleading naming; the user asked to
  remove the word entirely.
- Per-language submission validation — rejected: out of scope; output comparison is language-neutral.
