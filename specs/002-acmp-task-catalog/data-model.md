# Phase 1 Data Model: ACMP Task Catalog & Difficulty-Tiered Selection

**Feature**: 002-acmp-task-catalog | **Date**: 2026-06-21

Single representation per entity (Anti-Abstraction Gate): each entity is one Zod schema in
`app/src/lib/quest/model/` reused across UI, server actions, the Genkit flow, import, and the store.
This feature **extends** the feature-001 entities; changes are marked **NEW**/**CHANGED**.

---

## Enum: Level (learner's choice) — CHANGED

`beginner | intermediate | expert` (was `…| advanced`; renamed per research R8). Denotes the
learner's selected difficulty, mapped to a complexity third at selection time. It is **not** stored
on a task.

---

## Entity: Task (catalog entry) — CHANGED

A real coding problem ported from ACMP. Presentation/selection/attribution data AND the executable
reference logic (solution + test-generation algorithms as code) all live on the document; the code is
run only via the sandbox (research R2/R9).

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `id` | string? | Firestore document id (internal); equals `taskId`. |
| `taskId` | string | Public ACMP id (e.g., `"892"`). Non-empty, unique (doc id). README win check. |
| `sourceUrl` | string (url) | `https://acmp.ru/index.asp?main=task&id_task=<taskId>`. Required (US4/FR-015). |
| `title` | string | English (translated). Non-empty. |
| `statement` | string | English problem statement. Non-empty. |
| `inputFormat` | string | English "input data requirements". Non-empty. **NEW** |
| `outputFormat` | string | English "output data requirements". Non-empty. **NEW** |
| `examples` | `{input:string, output:string}[]` | Verbatim worked examples (not translated). ≥1. **NEW** |
| `images` | string[] | Relative static-asset paths `tasks/<taskId>/<n>.<ext>`; may be empty. **NEW** |
| `complexity` | number | ACMP complexity score; tier ranking key (R4). Finite, ≥0. **NEW** |
| `runtime` | enum | Language of the stored algorithms; `"js"` for v1. **NEW** |
| `solverSource` | string | Reference solution **as code** — defines `solve(input)=>output`. Run only in the sandbox. Non-empty. **NEW** (replaces `solverKey`) |
| `testGenSource` | string | Test-generation algorithm **as code** — defines `generateTests()=>TestCase[]` (≥30 labeled cases). Run only in the sandbox. Non-empty. **NEW** |
| `ready` | boolean | True only after the readiness gate passes (R7/FR-006). Selection uses `ready` only. **NEW** |

**Rules**: `taskId` unique; `solverSource`/`testGenSource` MUST be non-empty and execute within the
sandbox (R9); a task is **selectable only if `ready===true`**. `level` is removed from the task (tier
is derived). The DB stores the algorithms as code (R2); no static expected-output fixtures are stored
(recomputed via the sandboxed solver, R5).

---

## Entity: Stored algorithms (DB code fields on Task, run in the sandbox) — CHANGED

The solution and test-generation algorithms are **data** (`solverSource`/`testGenSource` on the Task
document), executed only via the `sandbox` library (R9). Their executed shapes:

| Executed function | Shape | Notes |
|-------------------|-------|-------|
| `solve` | `(input: string) => string` | Reference solution: correct output for an input block. |
| `generateTests` | `() => TestCase[]` | ≥30 **labeled** cases (R5); concatenated into one input block. |

`TestCase = { input: string, kind: 'positive' | 'negative' | 'edge' }`.

**Rules**: `generateTests()` MUST yield ≥30 distinct cases including ≥1 of each `kind`; the expected
output for grading is `solve(<concatenated inputs>)`, recomputed in the sandbox. Before `ready` is
set, both must execute within sandbox limits AND `solve` must reproduce every parsed ACMP `example`.
No `solverKey`/code registry exists — solvers/generators live in the DB.

---

## Entity: Mission — CHANGED

One quest step: a task wrapped in localized narrative + full display data.

| Field | Type | Notes |
|-------|------|-------|
| `order` | 1..4 | Sequence; order 4 is deployment. |
| `kind` | `coding \| deployment` | Missions 1–3 coding; 4 deployment. |
| `taskId` | string \| null | Coding: ACMP id (the grader loads the task's `solverSource` from the DB by this id); deployment: null. |
| `sourceUrl` | string \| null | Coding: original ACMP URL (for README links); deployment: null. **NEW** |
| `title` | string | Localized + themed title. |
| `statement` | string | Localized + themed statement. |
| `inputFormat` | string \| null | Localized input requirements (coding). **NEW** |
| `outputFormat` | string \| null | Localized output requirements (coding). **NEW** |
| `examples` | `{input,output}[]` \| null | Verbatim examples for display (coding). **NEW** |
| `images` | string[] | Illustration asset paths for display; may be empty. **NEW** |
| `storyFraming` | string | Model-generated narrative for this mission. |

**Rules**: exactly one `deployment` mission at order 4 (carryover). Coding missions carry a non-null
`taskId` (used to load the DB-stored `solverSource`/`testGenSource`), a non-null `sourceUrl`, and the
display fields above. Localized prose MUST preserve the authoritative I/O rules (grading stays
solver-driven, computed by the sandboxed stored solver).

---

## Entity: Quest — unchanged shape

`{ id, theme, level, questIntro, missions[4], createdAt }`. `level` ∈ new enum. The deployment
mission's objective references both the quest's task ids **and** their `sourceUrl`s for the README
(US4).

---

## Entity: Progress — unchanged

`{ currentMission: 1..4, solvedMissions: int[], won: bool }`. `won` requires mission 4 solved.

---

## Entity: Session (persistence root) — CHANGED

`sessions/{sessionId}` — anonymous session state.

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | string | Client-generated id. |
| `quest` | Quest \| null | Active generated quest. |
| `progress` | Progress | Progress vs the active quest. |
| `missionInputs` | record<string,string>? | Per-mission generated **test battery input** (key = order). Grading recomputes expected via the solver against this exact input (R5). **CHANGED meaning** (now the ≥30-case block). |
| `detectedLanguage` | string? | Language auto-detected from the theme; English fallback (R5/Q2). **NEW** |
| `updatedAt` | string (datetime) | Last activity. |

**Rules**: no auth; survives refresh, not cross-device (carryover).

---

## Selection result (transient, not persisted)

`selectQuestTasks` returns either `{ ok: true, codingTasks: Task[3] }` or
`{ ok: false, code: 'INSUFFICIENT_TASKS', available }` (FR-012). Input: all `ready` tasks + chosen
`level` + a random picker; tiers computed per R4.

---

## Firestore collections

```text
tasks/{taskId}           # Catalog incl. solverSource/testGenSource code (read+executed via sandbox;
                         #   written by import). taskId = doc id (idempotent).
sessions/{sessionId}     # { quest, progress, missionInputs, detectedLanguage, updatedAt }
```

Illustrations are NOT in Firestore — they are static assets under `app/public/tasks/<taskId>/`
referenced by `Task.images` / `Mission.images` (research R6).

---

## Relationships

```text
ACMP page ─(import: parse+translate+assets+gate)─> Task{ready} ──ranked by complexity──┐
                                                                                        ▼
Theme ─(detect language)─┐                                            split into thirds (R4)
                         ├─(weaveQuest: localize+frame)─> Quest ─4─> Mission ─(coding)─> Task (by taskId; solverSource/sourceUrl)
Level (beginner/inter/expert) ─(pick 3 from matching third)──────────┘        │
                                                                              └─ tracked by ─> Progress ⊂ Session(missionInputs, detectedLanguage)

Grading/import ─(run solverSource/testGenSource)─> sandbox (V8 isolate, limits) ─> expected output / ≥30-case battery
```
