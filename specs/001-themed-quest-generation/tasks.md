---
description: "Task list for Themed Python Quest Generation"
---

# Tasks: Themed Python Quest Generation

**Input**: Design documents from `/specs/001-themed-quest-generation/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Test tasks are INCLUDED and MANDATORY — the project constitution (Article III,
NON-NEGOTIABLE) requires Test-First Development. For every library/flow/action, write the test,
confirm it FAILS, then implement.

**Organization**: Tasks are grouped by user story (US1 P1 → US2 P2 → US3 P3) for independent
implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (omitted for Setup, Foundational, Polish)
- All paths are relative to the repository root; the app lives under `app/`.

## Path Conventions

- App: `app/src/` (Next.js App Router), domain libraries in `app/src/lib/quest/`
- Tests: `app/tests/{unit,integration,e2e}/`
- The `kodolom/` prototype is reference material; logic is ported into `app/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the project and tooling, generalizing the `kodolom/` prototype stack.

- [X] T001 Scaffold the Next.js (App Router) + React 19 + TypeScript project at `app/` (package.json, tsconfig.json, next.config.ts, tailwind config), porting baseline config from `kodolom/`
- [X] T002 [P] Configure Genkit with `@genkit-ai/google-genai` (model `googleai/gemini-2.5-flash`) in `app/src/ai/genkit.ts`
- [X] T003 [P] Configure Firebase: `app/apphosting.yaml` (App Hosting) and Firestore client init in `app/src/lib/firebase.ts`
- [X] T004 [P] Configure test tooling: Vitest in `app/vitest.config.ts`, Playwright in `app/playwright.config.ts`, and Firestore emulator + npm scripts (`test`, `test:int`, `test:e2e`) in `app/package.json`
- [X] T005 [P] Add `app/.env.example` with `GEMINI_API_KEY` and configure linting/formatting (ESLint + Prettier)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model, persistence, and the task solver registry that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational (write FIRST, must FAIL) ⚠️

- [X] T006 [P] Unit tests for Zod model schemas (Task, Theme, Quest, Mission, Progress, Session) asserting `missions.length === 4`, level enum, and deployment-mission rules in `app/tests/unit/model.test.ts`
- [X] T007 [P] Integration test: Session document round-trip and `Session` schema validation against the Firestore emulator in `app/tests/integration/sessions.test.ts`
- [X] T008 [P] Unit tests for the solver registry: each `solverKey` resolves to `{ generateInput, solve }`, and ported prototype solvers produce expected outputs in `app/tests/unit/solver-registry.test.ts`

### Implementation for Foundational

- [X] T009 [P] Define Zod schemas and shared types for Task, Theme, Quest, Mission, Progress, Session in `app/src/lib/quest/model/index.ts`
- [X] T010 Implement Firestore access for the `tasks` catalog (read/query by level) and `sessions` (read/write) in `app/src/lib/quest/store.ts` (depends on T009)
- [X] T011 [P] Implement the solver registry interface `{ generateInput, solve }` keyed by `solverKey` in `app/src/lib/quest/tasks/registry.ts`
- [X] T012 [P] Port the three prototype solvers (`season-analysis`, `molecule-calc`, `mouse-rug`) and the deployment meta-mission from `kodolom/src/lib/tasks.ts` into `app/src/lib/quest/tasks/solvers/` (depends on T011)
- [X] T013 Create a Firestore seed script that loads curated tasks (taskId, title, statement, level, sourceUrl, solverKey) into the `tasks` collection in `app/scripts/seed-tasks.ts` (depends on T010, T012)

**Checkpoint**: Model, persistence, and solver registry exist and pass foundational tests.

---

## Phase 3: User Story 1 - Start a themed, level-appropriate quest (Priority: P1) 🎯 MVP

**Goal**: Theme + level selection produces a coherent four-mission quest assembled from the task
database and woven into one storyline.

**Independent Test**: Select any theme and level, confirm, and verify a quest with exactly four
missions, an intro, and per-mission framing, all coding tasks matching the selected level.

### Tests for User Story 1 (write FIRST, must FAIL) ⚠️

- [X] T014 [P] [US1] Unit tests for task selection (picks 3 coding tasks at the chosen level + 1 deployment slot; surfaces `INSUFFICIENT_TASKS` when pool < 3) in `app/tests/unit/task-selection.test.ts`
- [X] T015 [P] [US1] Contract test for the `weaveQuest` Genkit flow: valid input yields schema-valid output with 4 aligned missions; malformed output is rejected (model stubbed) in `app/tests/integration/weave-quest.test.ts`
- [X] T016 [P] [US1] Contract test for the `generateQuest` server action: returns a 4-mission quest at the requested level, `INSUFFICIENT_TASKS` on a thin pool, and resets `progress.currentMission` to 1 (Firestore emulator) in `app/tests/integration/generate-quest.test.ts`

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement the task-selection library with a JSON CLI entrypoint in `app/src/lib/quest/task-selection/index.ts` and `app/src/lib/quest/task-selection/cli.ts` (depends on T010)
- [X] T018 [US1] Implement the `weaveQuest` Genkit flow (typed Zod input/output, narrative-only) in `app/src/ai/flows/weave-quest.ts` (depends on T002, T009)
- [X] T019 [US1] Implement quest composition that binds authoritative DB tasks with model narrative into a `Quest` in `app/src/lib/quest/assemble.ts` (depends on T017, T018)
- [X] T020 [US1] Implement the `generateQuest` server action (select → weave → compose → persist session) in `app/src/app/actions.ts` (depends on T019, T010)
- [X] T021 [US1] Build the startup UI (theme input + level selection + generate) in `app/src/app/page.tsx` and a selection component in `app/src/components/quest-setup.tsx` (depends on T020)
- [X] T022 [US1] Render the generated quest intro and first mission, with the `INSUFFICIENT_TASKS`/generation-error states (FR-018) in `app/src/app/quest/page.tsx` (depends on T020)

**Checkpoint**: A learner can generate and view a themed four-mission quest (MVP).

---

## Phase 4: User Story 2 - Solve tasks and advance through the storyline (Priority: P2)

**Goal**: Learner submits answers; correct answers advance the storyline, incorrect ones allow
retry, and progress is visible.

**Independent Test**: With a generated quest, a correct answer to mission 1 advances to mission 2;
an incorrect answer shows a clear message and permits retry.

### Tests for User Story 2 (write FIRST, must FAIL) ⚠️

- [X] T023 [P] [US2] Unit tests for the grading library (trimmed output comparison; empty/malformed input handled gracefully) in `app/tests/unit/grading.test.ts`
- [X] T024 [P] [US2] Contract test for the `verifySolution` server action: correct output advances `currentMission`, incorrect keeps state and allows retry, locked/future mission is rejected (Firestore emulator) in `app/tests/integration/verify-solution.test.ts`

### Implementation for User Story 2

- [X] T025 [P] [US2] Implement the grading library (output comparison) with a JSON CLI in `app/src/lib/quest/grading/index.ts` and `app/src/lib/quest/grading/cli.ts` (depends on T011)
- [X] T026 [US2] Implement the `verifySolution` server action (recall mission input, compute correct output via solver, compare, update progress per FR-010/FR-011) in `app/src/app/actions.ts` (depends on T025, T010)
- [X] T027 [P] [US2] Build the mission play UI: narrative framing, statement, generated input display, and solution submission form in `app/src/components/mission-panel.tsx` and `app/src/components/solution-form.tsx` (depends on T022)
- [X] T028 [P] [US2] Build the progress tracker UI reflecting solved missions in `app/src/components/progress-tracker.tsx` (depends on T022)
- [X] T029 [US2] Wire per-mission input generation and submission feedback (success advances, failure retries) into the quest view in `app/src/app/quest/page.tsx` (depends on T026, T027, T028)

**Checkpoint**: Learner can solve missions 1–3 and advance through the storyline.

---

## Phase 5: User Story 3 - Win by deploying to GitHub (Priority: P3)

**Goal**: The final mission verifies a public GitHub repo's README contains the quest's task ids
and declares the learner the winner.

**Independent Test**: A repo whose README lists the quest task ids → winner; a bad/unreachable/
incomplete repo → specific, actionable failure messages.

### Tests for User Story 3 (write FIRST, must FAIL) ⚠️

- [X] T030 [P] [US3] Unit tests for github-verify: README parsing across main/master + README.md/readme.md, all-ids-present pass, missing-id list, malformed URL, unreachable repo (recorded fixtures) in `app/tests/unit/github-verify.test.ts`
- [X] T031 [P] [US3] Integration test for `verifyDeployment`: real raw-README fetch for a known public repo plus the BAD_URL / MISSING_IDS / UNREACHABLE paths in `app/tests/integration/verify-deployment.test.ts`

### Implementation for User Story 3

- [X] T032 [P] [US3] Implement the github-verify library (raw README fetch + task-id presence check) with a JSON CLI in `app/src/lib/quest/github-verify/index.ts` and `app/src/lib/quest/github-verify/cli.ts`
- [X] T033 [US3] Implement the `verifyDeployment` server action (validate URL, verify README, set `won` per FR-015, map failures to FR-016 messages) in `app/src/app/actions.ts` (depends on T032, T010)
- [X] T034 [US3] Build the final (deployment) mission UI with repo-URL submission and the win screen in `app/src/components/deployment-mission.tsx` and `app/src/components/win-screen.tsx` (depends on T029)
- [X] T035 [US3] Wire the deployment mission and victory conclusion into the quest view in `app/src/app/quest/page.tsx` (depends on T033, T034)

**Checkpoint**: Full journey playable end to end — generate → solve → deploy → win.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, content, and consistency across all stories.

- [X] T036 [P] Playwright end-to-end happy-path test (theme → quest → solve 1–3 → deploy → win) in `app/tests/e2e/quest-journey.spec.ts`
- [X] T037 [P] Seed the task catalog with ≥3 coding tasks per level (beginner/intermediate/advanced) via `app/scripts/seed-tasks.ts` data files
- [X] T038 Audit and standardize user-facing error/feedback messages across all server actions for FR-016 (no generic/silent failures) in `app/src/app/actions.ts`
- [X] T039 [P] Add the separately-gated live Gemini smoke test for the `weaveQuest` flow (excluded from default CI per plan C2) in `app/tests/integration/weave-quest.live.test.ts`
- [X] T040 [P] Validate `quickstart.md` steps against the built app and update docs in `specs/001-themed-quest-generation/quickstart.md`
- [ ] T041 Cutover: retire/remove the `kodolom/` prototype once parity is confirmed, updating any references

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phases 3–5)**: All depend on Foundational. US1 → US2 → US3 by priority, but
  US2 and US3 only require Foundational + the shared quest view from US1.
- **Polish (Phase 6)**: Depends on all targeted user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. Delivers the MVP.
- **US2 (P2)**: Depends on Foundational; builds on the US1 quest view (T022).
- **US3 (P3)**: Depends on Foundational; builds on the US2 quest view (T029).

### Within Each User Story

- Tests are written and MUST FAIL before implementation (Article III).
- Models/libraries before services; services before server actions; actions before UI.
- Story complete and independently testable before moving to the next priority.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 in parallel after T001.
- Foundational tests: T006, T007, T008 in parallel; implementation T009 then T011/T012 in parallel.
- US1 tests T014, T015, T016 in parallel; US2 tests T023, T024 in parallel; US3 tests T030, T031 in parallel.
- Within stories, [P] UI components and libraries in different files run in parallel.

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests first (parallel), confirm they FAIL:
Task: "Unit tests for task selection in app/tests/unit/task-selection.test.ts"
Task: "Contract test for weaveQuest flow in app/tests/integration/weave-quest.test.ts"
Task: "Contract test for generateQuest action in app/tests/integration/generate-quest.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (CRITICAL — blocks all stories)
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: Generate a themed four-mission quest independently.

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → themed quest generation (MVP) → demo
3. US2 → solve & progress → demo
4. US3 → GitHub deploy & win → demo
5. Polish → e2e, content, message consistency, prototype cutover

---

## Notes

- [P] = different files, no dependencies.
- [Story] label maps tasks to user stories for traceability.
- Every library (task-selection, grading, github-verify) ships a JSON CLI per Constitution
  Article II (see plan Complexity Tracking C1).
- Verify tests fail before implementing (Article III); commit after each task or logical group.
- The Gemini model is stubbed in default CI; live calls are a gated smoke test (plan C2).
