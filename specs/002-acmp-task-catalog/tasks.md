---
description: "Task list for ACMP Task Catalog & Difficulty-Tiered Selection"
---

# Tasks: ACMP Task Catalog & Difficulty-Tiered Selection

**Input**: Design documents from `/specs/002-acmp-task-catalog/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: MANDATORY per Constitution Article III (Test-First, NON-NEGOTIABLE) and the project's
TDD default. Every test task MUST be written, observed to FAIL for the right reason, and approved
before its implementation task begins.

**Organization**: Phase 0 (de-Python) → Setup → Foundational → US1–US4 → Polish.

**Path convention**: Single Next.js project rooted at `app/`. Domain libraries under
`app/src/lib/quest/`; tests under `app/tests/{unit,integration,e2e}`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4 (Phase 0, Setup, Foundational, Polish have no story label)

---

## Phase 0: De-Python (Language-Agnostic Reframing) 🔁 FIRST

**Purpose**: Remove "Python" as a product constraint (research R10 / analysis F1). The constitution's
Python mandate was already removed (v1.1.0); this phase purges it from the project itself.

- [X] T001 Remove "Python" from the project: renamed the package in `app/package.json` + `app/package-lock.json` to `quest-generator`; updated `CLAUDE.md` (SPECKIT block, done in planning), product titles (`app/src/app/layout.tsx`, `app/src/components/quest-setup.tsx`: "Coding Quest Generator", "Skill level"), the model comment (`model/index.ts`), the weave prompt (`weave-quest.ts`), and `README.md` so tasks/levels read as language-agnostic. (On-disk repo directory name left as-is to avoid breaking tooling paths; `python3` in scripts and template examples are interpreter/tooling refs, not product.)
- [X] T002 Repo-wide guard: `grep -rIn "[Pp]ython" app/src README.md app/package.json` returns NONE; `npx vitest run` = 43/43 pass; `tsc --noEmit -p tsconfig.core.json` = clean.

**Checkpoint**: Product is language-agnostic; nothing user-facing says "Python".

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T003 Added pinned deps `node-html-parser@^8.0.2` + `isolated-vm@^6.1.2` and scripts `import:acmp` + `sandbox:run` in `app/package.json` (+ lockfile). Verified both build/run in this env (isolated-vm executes + enforces timeout/memory).
- [X] T004 [P] Create scaffolding: `app/src/lib/quest/acmp-import/`, `app/src/lib/quest/sandbox/`, `app/public/tasks/.gitkeep`, and `app/tests/fixtures/acmp/`
- [X] T005 [P] Save real ACMP task pages as HTML fixtures in `app/tests/fixtures/acmp/` — `892.html`, `757.html`, `907.html`, plus one page **with** an `<img>` illustration and one **without**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared model, sandbox runner, and store changes every story depends on.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [X] T006 [P] Write model schema unit tests in `app/tests/unit/model.test.ts`: `Level` is `beginner|intermediate|expert`; `Task` round-trips `complexity`, `inputFormat`, `outputFormat`, `examples[≥1]`, `images[]`, `ready`, `runtime`, `solverSource`, `testGenSource`, required `sourceUrl`, no `level`/`solverKey`; `Mission` carries `taskId`/`sourceUrl`/io/examples/images with coding-vs-deployment null rules; `Session` carries `detectedLanguage` + `missionInputs`. (MUST FAIL)
- [X] T007 Update `app/src/lib/quest/model/index.ts` to make T006 pass: rename `advanced`→`expert`; extend `Task` (drop `level`/`solverKey`; add `complexity`, `inputFormat`, `outputFormat`, `examples`, `images`, `ready`, `runtime`, `solverSource`, `testGenSource`); extend `Mission` (drop `solverKey`; add `sourceUrl`, `inputFormat`, `outputFormat`, `examples`, `images`); extend `Session` (`detectedLanguage`)
- [X] T008 [P] Wrote sandbox runner contract tests against the **real `isolated-vm`** in `app/tests/unit/sandbox.test.ts` (10 tests: correct output; non-string/missing-fn → `invalid`; infinite loop → `timeout`; runaway alloc → `memory`; host-access denied; `runGenerator` parses/validates `TestCase[]`; no state leak). Confirmed RED before impl.
- [X] T009 Implemented the sandbox in `app/src/lib/quest/sandbox/index.ts` (`runSolver`/`runGenerator` via `isolated-vm`: fresh isolate per call, timeout, memory cap, no host access, typed `{ok:false,error}` faults) + `app/src/lib/quest/sandbox/cli.ts` — 10/10 green; full unit suite 53/53; typecheck clean
- [X] T010 [P] Write store tests in `app/tests/integration/store.test.ts` (emulator): `getReadyTasks()` returns only `ready==true` tasks; `getTask(taskId)` round-trips the full `Task` incl. code fields. (MUST FAIL)
- [X] T011 Update `app/src/lib/quest/store.ts`: replace `getTasksByLevel` with `getReadyTasks()` and add `getTask(taskId)` — make T010 pass
- [X] T012 Fix compile fallout in `app/src/lib/quest/service.ts` and `app/src/lib/quest/assemble.ts`; delete the obsolete `app/src/lib/quest/tasks/` solver registry (now DB-driven) so the project builds and existing suites run. (Leave `app/scripts/seed-tasks.ts` alone — its removal is owned by T055.)

**Checkpoint**: Model, sandbox runner, and store are ready.

---

## Phase 3: User Story 1 — Populate the catalog from ACMP (Priority: P1) 🎯 MVP

**Goal**: Execute the porting: 10 simple ACMP tasks (≥1 with illustrations) stored in English with
I/O format, examples, complexity, source URL, illustrations, and — as code in the DB — a reference
solution + a ≥30-case (labeled positive/negative/edge) test generator; each gated to `ready` only
after the sandbox validates the code reproduces ACMP examples + a curator confirms.

**Independent Test**: Run the import; verify 10 ready tasks with all fields, ≥1 with stored images,
each with stored `solverSource`/`testGenSource` that the sandbox runs to reproduce the parsed
examples and yield ≥30 labeled cases.

### Tests for User Story 1 (write first, MUST FAIL) ⚠️

- [X] T013 [P] [US1] `parseTaskPage` tests vs fixtures in `app/tests/unit/acmp-parse.test.ts`: extracts `taskId`, `title`, `statement`, `inputFormat`, `outputFormat`, ≥1 verbatim example, numeric `complexity`, image URLs; no-examples page is flagged, not thrown (FR-018)
- [X] T014 [P] [US1] `translateTask` tests (stubbed Genkit) in `app/tests/unit/acmp-translate.test.ts`: title/statement/io → English, numbers/identifiers preserved, `examples` verbatim
- [X] T015 [P] [US1] `downloadImages` tests in `app/tests/unit/acmp-assets.test.ts`: writes `public/tasks/<id>/`, returns relative paths; no-image task → `[]`
- [X] T016 [P] [US1] `validateTask` tests (real sandbox) in `app/tests/unit/acmp-validate.test.ts`: passes only when stored `solverSource` reproduces every example AND `testGenSource` yields ≥30 cases incl. ≥1 each of positive/negative/edge; a timing-out/erroring algorithm fails validation (FR-006/007/007a)
- [X] T017 [P] [US1] Upsert integration in `app/tests/integration/acmp-upsert.test.ts` (emulator): `upsertTask` keys by `taskId` (re-import → one doc), writes `ready:false`, `markReady` only after `validateTask` ok; non-ready excluded from `getReadyTasks()`

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement `fetchTaskPage(id, fetch)` in `app/src/lib/quest/acmp-import/fetch.ts` (injectable fetcher)
- [X] T019 [US1] Implement `parseTaskPage(html, id)` in `app/src/lib/quest/acmp-import/parse.ts` — make T013 pass
- [X] T020 [US1] Implement `translateTask(parsed, ai)` in `app/src/lib/quest/acmp-import/translate.ts` (Genkit, preserving prompt) — make T014 pass
- [X] T021 [US1] Implement `downloadImages(parsed, fetch, fsRoot)` in `app/src/lib/quest/acmp-import/assets.ts` — make T015 pass
- [X] T022 [US1] Author the reference solution + test-generation **code** (`solverSource`/`testGenSource`, ≥30 labeled cases) for the 10 curated tasks in `app/src/lib/quest/acmp-import/authored/` (JS sources loaded into each task document)
- [X] T023 [US1] Implement `authorAlgorithms` + `validateTask` (runs code via the sandbox) in `app/src/lib/quest/acmp-import/validate.ts` — make T016 pass
- [X] T024 [US1] Implement `upsertTask`/`markReady` in `app/src/lib/quest/acmp-import/upsert.ts` (doc id = `taskId`, `ready:false` default, `markReady` requires `validateTask` ok) — make T017 pass
- [X] T025 [US1] Implement the import orchestrator (fetch→parse→translate→assets→attach code→validate→upsert, with per-task skip/flag) in `app/src/lib/quest/acmp-import/index.ts`
- [X] T026 [US1] Implement the import CLI in `app/src/lib/quest/acmp-import/cli.ts` (`--ids`, `--dry-run --json`, `--mark-ready`; JSON summary to stdout, errors to stderr)
- [X] T027 [US1] Execute the porting: run the import for the curated 10 ids against the emulator, curator-review, `--mark-ready` each, and commit illustrations under `app/public/tasks/<id>/` (FR-002/SC-001/SC-002)

**Checkpoint**: A real, ready, data-driven ACMP catalog (solution+tests as code) exists.

---

## Phase 4: User Story 2 — Difficulty-tiered selection (Priority: P2)

**Goal**: Rank all `ready` tasks by ACMP complexity, split into thirds, randomly pick 3 from the
tier matching the chosen level; report `INSUFFICIENT_TASKS` when a tier has < 3.

**Independent Test**: Each level returns 3 tasks from the correct third; repeats can differ; tier < 3 reported.

### Tests for User Story 2 (write first, MUST FAIL) ⚠️

- [X] T028 [P] [US2] `splitTiers` tests in `app/tests/unit/tiers.test.ts`: 9 tasks → 3/3/3 ascending by `(complexity, taskId)`; n=10 → contiguous `floor` thirds (3/3/4), no task lost; ties by `taskId`; non-`ready` excluded
- [X] T029 [P] [US2] `selectQuestTasks` tests in `app/tests/unit/task-selection.test.ts`: 3 from the correct tier per level; `INSUFFICIENT_TASKS` w/ `available` when tier < 3; injected picker reproducible, random picker varies
- [X] T030 [P] [US2] Integration in `app/tests/integration/tiered-selection.test.ts` (emulator): seed ready tasks of varied complexity, then `getReadyTasks()` + `selectQuestTasks(level)` returns the correct tier

### Implementation for User Story 2

- [X] T031 [US2] Implement `splitTiers(tasks)` (filter ready, sort `(complexity, taskId)`, contiguous thirds) in `app/src/lib/quest/task-selection/index.ts` — make T028 pass
- [X] T032 [US2] Rework `selectQuestTasks({tasks, level, pick?})` to pick from `splitTiers(...)[level]` (default random) — make T029 pass
- [X] T033 [US2] Update the selection CLI in `app/src/lib/quest/task-selection/cli.ts` to take `--level` and emit tier picks as JSON
- [X] T034 [US2] Wire selection into `app/src/lib/quest/service.ts` / `assemble.ts`: use `getReadyTasks()` + chosen `level`; surface `INSUFFICIENT_TASKS` (FR-012)

**Checkpoint**: Level choice yields 3 correctly-tiered tasks end-to-end.

---

## Phase 5: User Story 3 — Complete, localized task display (Priority: P3)

**Goal**: Present each task fully (statement, illustrations, examples, I/O requirements) localized to
the theme's auto-detected language (English fallback); grade against the full ≥30-case battery
(generated + solved by the task's sandboxed stored code) with whitespace-tolerant comparison.

**Independent Test**: A non-English-theme mission shows localized statement + image + examples + I/O rules; battery grading is all-or-nothing, whitespace-tolerant.

### Tests for User Story 3 (write first, MUST FAIL) ⚠️

- [X] T035 [P] [US3] Grading tests in `app/tests/unit/grading.test.ts`: `normalizeOutput` trims trailing whitespace per line + trailing blank lines; `gradeOutput` accepts trailing diffs, rejects one wrong line; `gradeMission` runs the stored solver via sandbox, is all-or-nothing (29/30 → incorrect), and returns `{error}` (not a throw) on solver fault
- [X] T036 [P] [US3] `buildBattery` tests in `app/tests/unit/battery.test.ts`: runs `testGenSource` via sandbox → ≥30 labeled cases incl. each kind; `inputBlock` concatenates them
- [X] T037 [P] [US3] Localization flow schema test in `app/tests/integration/weave-localization.test.ts` (stubbed model): output validates; `missions.length===tasks.length`; `ru` theme → `detectedLanguage≈ru` + non-English statements; ambiguous → `'en'`; flow omits `examples`/`taskId`/`sourceUrl`
- [X] T038 [P] [US3] E2e in `app/tests/e2e/task-display.spec.ts` (Playwright): non-English theme + level → mission shows localized statement, illustration, examples, I/O requirements; no-image task renders cleanly; correct battery output advances

### Implementation for User Story 3

- [X] T039 [US3] Enhance grading in `app/src/lib/quest/grading/index.ts`: per-line/trailing-blank `normalizeOutput`; `gradeMission` computes expected by running `solverSource` over the persisted input via the sandbox — make T035 pass
- [X] T040 [US3] Implement `buildBattery(testGenSource, sandbox)` (in `grading/` or `tasks-battery/`) producing the labeled cases + `inputBlock` — make T036 pass
- [X] T041 [US3] Extend the weave flow in `app/src/ai/flows/weave-quest.ts`: add `detectedLanguage` + localized `title`/`statement`/`inputFormat`/`outputFormat`/`storyFraming` with an I/O-preserving guardrail — make T037 pass
- [X] T042 [US3] In `app/src/lib/quest/assemble.ts`, compose `Mission`s by merging flow output (prose) with catalog data (`examples`, `images`, `taskId`, `sourceUrl`); persist `detectedLanguage` on the session
- [X] T043 [US3] In `app/src/app/actions.ts`, on mission start `buildBattery` and persist `inputBlock` to `session.missionInputs[order]`; on submit grade against it via the sandboxed solver (FR-019)
- [X] T044 [P] [US3] Update `app/src/components/mission-panel.tsx` to render statement, illustrations, input/output requirements, the example I/O table, and the generated input block
- [X] T045 [P] [US3] Update `app/src/components/solution-form.tsx` for battery submit + whitespace-tolerant rejection feedback
- [X] T046 [US3] Update `app/src/app/page.tsx` so the theme drives language auto-detection (no separate language selector)

**Checkpoint**: Tasks display completely and localized; sandboxed battery grading works.

---

## Phase 6: User Story 4 — Original-task links in the winning README (Priority: P4)

**Goal**: The final stage requires, and verification checks for, README links to each task's
original ACMP page (in addition to the task ids).

**Independent Test**: README with all ids + links wins; a missing link is reported specifically.

### Tests for User Story 4 (write first, MUST FAIL) ⚠️

- [X] T047 [P] [US4] Unit tests in `app/tests/unit/github-verify.test.ts`: `verifyReadme` requires all ids AND all `sourceUrl` links; reports `missingTaskIds`/`missingLinks`; tolerant to `http`↔`https` + trailing slash; unrelated ACMP link doesn't satisfy a required `id_task` link
- [X] T048 [P] [US4] Integration in `app/tests/integration/readme-links.test.ts`: real raw README fetch with ids + links verifies; one missing link fails specifically

### Implementation for User Story 4

- [X] T049 [US4] Extend `verifyReadme` in `app/src/lib/quest/github-verify/index.ts` to require each mission's `sourceUrl` and return `missingLinks` — make T047 pass
- [X] T050 [US4] In `app/src/lib/quest/assemble.ts`, compose the deployment mission statement to instruct including each task's `sourceUrl` (FR-015)
- [X] T051 [P] [US4] Update the github-verify CLI in `app/src/lib/quest/github-verify/cli.ts` to report missing ids + links as JSON
- [X] T052 [US4] Update `app/src/components/deployment-mission.tsx` to show required original-task links + specific missing-link feedback

**Checkpoint**: Win requires ids + original-source links; all four stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T053 [P] (F9) Add a schema-completeness assertion in `app/tests/unit/model.test.ts` proving the `Task` schema can represent the full ACMP field set (so the entire catalog is portable, FR-001)
- [X] T054 [P] Add a gated live Gemini smoke test (translate+weave) in `app/tests/integration/live-smoke.test.ts` (skipped without an API key)
- [X] T055 [P] Remove residual dead code: delete `app/scripts/seed-tasks.ts` (its placeholder catalog is superseded by the import) and any remaining `getTasksByLevel` references
- [X] T056 [P] Update `app/README.md` / docs for the import workflow, sandbox execution, tier selection, the new win condition, and the language-agnostic framing
- [X] T057 Run `specs/002-acmp-task-catalog/quickstart.md` end-to-end and fix any drift
- [X] T058 [P] Verify `firestore.rules`/emulator config match the updated `tasks` (incl. code fields) / `sessions` documents

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 0 (de-Python)**: first; independent of the rest but should land before broad edits to avoid churn.
- **Setup (P1)**: after Phase 0.
- **Foundational (P2)**: after Setup; **blocks all user stories**. Order: T006→T007; T008→T009; T010→T011; T012 after T007/T009/T011.
- **US1 (P3)**: after Foundational. The MVP (needs the sandbox from T009 for validation).
- **US2 (P4)**: after Foundational; validated against US1's catalog (or seeded fixtures).
- **US3 (P5)**: after Foundational; uses US1 tasks' stored code + sandbox for battery/grading.
- **US4 (P6)**: after Foundational; uses missions from US2/US3 but independently testable with fixtures.
- **Polish (P7)**: after the desired stories.

### Within each story

- Tests (⚠️) written and FAIL before implementation. Model/interfaces → services → UI/CLI → integration.

### Parallel opportunities

- Setup: T004, T005. Foundational: T006/T008/T010 (tests, distinct files) in parallel; impl follows each.
- US1 tests T013–T017 parallel; US2 T028–T030; US3 T035–T038; US4 T047–T048.
- UI T044/T045 parallel; Polish T053–T056, T058 parallel.

---

## Parallel Example: User Story 1 tests

```bash
Task: "parseTaskPage tests in app/tests/unit/acmp-parse.test.ts"        # T013
Task: "translateTask tests in app/tests/unit/acmp-translate.test.ts"    # T014
Task: "downloadImages tests in app/tests/unit/acmp-assets.test.ts"      # T015
Task: "validateTask (sandbox) tests in app/tests/unit/acmp-validate.test.ts" # T016
Task: "upsert integration in app/tests/integration/acmp-upsert.test.ts" # T017
```

---

## Implementation Strategy

### MVP first

1. Phase 0 (de-Python) → 2. Setup → 3. Foundational (model + **sandbox** + store) → 4. US1 →
   **STOP & VALIDATE**: a real, ready, data-driven ACMP catalog (10 tasks, ≥1 with images, each
   carrying sandbox-validated solver + ≥30-case generator code, idempotent import).

### Incremental delivery

- US1 (catalog) → US2 (tiered selection) → US3 (localized display + sandboxed battery grading) →
  US4 (README source links). Each adds value without breaking the previous.

### Notes

- [P] = different files, no incomplete-task dependency.
- Verify each ⚠️ test FAILS for the right reason before implementing.
- Gemini is stubbed in CI (C2); the **real `isolated-vm`**, Firestore emulator, real ACMP HTML
  fixtures, and a real README fetch are exercised for real (Integration-First).
- Solver + test-generator code lives in the DB and runs only via the sandbox (C3, R2/R9); learner
  code is never executed.
- Commit after each task or logical group.
