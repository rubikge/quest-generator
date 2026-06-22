# Implementation Plan: ACMP Task Catalog & Difficulty-Tiered Selection

**Branch**: `002-acmp-task-catalog` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-acmp-task-catalog/spec.md`

## Summary

Replace the hand-curated, hard-coded task list with a real catalog **ported from ACMP**
(`acmp.ru/index.asp?main=alltasks`) and make quest task selection **difficulty-tiered**. The first
porting run brings in a curated starter set of ten simple problems (some with illustrations); each
imported task stores its English-translated statement, input/output format requirements, worked
examples, illustrations, ACMP complexity score, and original source URL, plus a reference solution
and a ≥30-case (edge-covering) test battery used to grade learners. When a learner picks
beginner / intermediate / expert, the system ranks all *ready* tasks by ACMP complexity, splits
them into thirds, and randomly picks three from the matching third to embed into the quest. The
task is displayed completely (statement, illustrations, examples, I/O requirements) localized to
the language auto-detected from the learner's theme, and the final GitHub stage additionally
requires README links back to the original ACMP task pages.

The technical approach extends the existing feature-001 app in place (Next.js + Genkit + Firestore,
framework-agnostic libraries under `app/src/lib/quest/` with thin CLIs). The catalog is **fully
data-driven**: each task document stores — as code — its reference solution and its test-generation
algorithm, alongside all presentation/selection/attribution data. These stored algorithms are
executed in an **isolated in-process sandbox** (a V8 isolate via `isolated-vm`) with strict time and
memory limits, both at import (to validate examples and the ≥30-case battery) and at grade time (to
compute expected outputs). Adding arbitrarily many tasks requires only writing rows — no code
deployment. The platform still never executes the *learner's* code (output comparison only); only
curated, reviewed, sandboxed task code runs. A new `acmp-import` library + CLI performs the porting;
a new `sandbox` library runs stored algorithms safely; `task-selection` gains complexity-tier logic;
`grading` runs the stored solver over the ≥30-case battery; `weave-quest` gains language detection +
localization; `github-verify` gains source-link checking.

This feature also **de-scopes "Python" from the product**: the platform and the coding tasks are
language-agnostic (tasks may be solved in any language). Removing "Python" from the project name,
docs, UI copy, and code is the first task (Phase 0); the constitution's Python language mandate was
removed in v1.1.0.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (application language). The product is
language-agnostic: learners may solve coding tasks in any language; the platform never executes the
learner's code (output comparison only). Stored *reference* solution and test-generation code is
authored in JavaScript and run in a V8 isolate.

**Primary Dependencies**: Next.js (App Router, React 19), Genkit ^1.37 with
`@genkit-ai/google-genai` (`googleai/gemini-2.5-flash`) for narrative weaving **and** translation,
Firebase Admin ^14 (Cloud Firestore), Zod, Tailwind + shadcn/Radix. **New**: a lightweight HTML
parser (e.g., `node-html-parser`) for the offline ACMP import, and `isolated-vm` to execute
DB-stored solution/test-generation code in an isolated V8 isolate with time/memory limits. Both
pinned and justified (Additional Constraints).

**Storage**: Cloud Firestore — `tasks` catalog (rich: complexity, English content, I/O format,
examples, image refs, source URL, `ready`, plus **`solverSource` + `testGenSource` + `runtime`** —
the solution and test-generation algorithms stored as code) and `sessions` (active quest + progress
+ per-mission generated test battery). Task **illustrations** are downloaded at import and served as
static app assets under `app/public/tasks/<taskId>/` (referenced by relative path on the task);
Firebase Storage is the documented scale path.

**Testing**: Vitest unit tests (ACMP HTML parser against saved real-page fixtures; sandbox runner
against the **real `isolated-vm`** — limits, timeout, no host access; complexity tier-split; battery
≥30 + labeled positive/negative/edge coverage; whole-output whitespace-tolerant grading; readiness
gate; README source-link verification); Firestore emulator integration (idempotent upsert, tiered
read/selection round-trip, run stored solver/generator over a seeded task); Genkit flow schema test
for the localization+weave output (model stubbed in CI); Playwright e2e (display a task with an
illustration + examples in a non-English theme language).

**Target Platform**: Modern desktop + mobile browsers; server runtime on Firebase App Hosting
(Cloud Run). The import CLI runs offline by a curator.

**Project Type**: Web application — single Next.js project with internal domain libraries (no new
project added).

**Performance Goals**: Full quest generation (theme+level → playable quest, incl. localization)
under 60s (carryover SC-001), p95 < 15s. Tier split + selection over the full catalog < 50ms for
hundreds of tasks. Import is an offline batch job with no interactive latency budget.

**Constraints**: Google Cloud + Firebase mandatory; AI translation/narrative MUST go through
Genkit; v1 anonymous/session-only; generated/translated content MUST stay appropriate and MUST NOT
alter the authoritative I/O rules used for grading; DB-stored solution/test-generation code MUST run
only inside the sandbox with enforced time/memory limits and no host/network access; the learner's
own code is never executed.

**Scale/Scope**: Educational / classroom scale. Starter catalog = 10 ready tasks (≥3 per tier);
schema and import designed to hold the full ACMP catalog (hundreds–thousands) later.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.1.0 — nine articles (Python language mandate removed in v1.1.0).

### Phase -1: Pre-Implementation Gates

#### Library-First Gate (Article I)

- [x] Feature is structured as one or more standalone, independently testable libraries?
  → New `acmp-import` library (fetch/parse/translate/assets/upsert), new `sandbox` library (run
    DB-stored solver/generator code in a V8 isolate), extended `task-selection` (complexity tiers),
    extended `grading` (run stored solver over the ≥30-case battery), extended `github-verify`
    (source links). All under `app/src/lib/quest/`, framework-agnostic.
- [x] No feature logic implemented directly in application code without a library?
  → UI/server actions remain thin adapters; import is a CLI over the library.

#### CLI Interface Gate (Article II)

- [⚠] Each library exposes its functionality via a CLI? → **PARTIAL** (C1, carryover): the React UI
  is not a CLI. Functional domain libraries — `acmp-import` (`npm run import:acmp`), `sandbox`
  (`npm run sandbox:run`), `task-selection`, `grading`, `github-verify` — ship JSON-capable CLIs.
  Schema-only libraries (`model`) and the (now DB-driven) task data carry no behavior to expose, so
  a CLI for them is N/A (resolves analysis finding F4 by scoping the gate to behavioral libraries).
- [x] JSON output supported for structured data exchange?

#### Test-First Gate (Article III — NON-NEGOTIABLE)

- [x] Tests are written, user-approved, and confirmed to FAIL before any implementation?
  → tasks.md will order tests first (parser, tier-split, battery, grading, readiness, link-verify).
- [x] Red-Green-Refactor cycle planned for every implementation task?

#### Simplicity Gate (Article VII)

- [⚠] Using ≤3 projects? → One project; no new project. The sandbox is an **in-process** V8 isolate
  (`isolated-vm`), a dependency — not a separate service/project. Images remain static assets. The
  added sandbox component is justified in Complexity Tracking (C3).
- [x] No future-proofing? → Port only the curated 10 now; tier-split computed on demand; the sandbox
  is required now (it is how stored solver/generator code runs), not speculative.

#### Anti-Abstraction Gate (Article VIII)

- [x] Using framework directly? → Genkit (translate+weave), Firebase Admin, Next.js, and
  `isolated-vm` used directly — no wrapper layers re-exposing them.
- [x] Single model representation? → One Zod `Task`/`Mission`/`Session` representation extended in
  `lib/quest/model`; the stored `solverSource`/`testGenSource` are fields on the single `Task`, not a
  parallel model.

#### Integration-First Gate (Articles IV & IX)

- [x] Contracts defined? → See `contracts/` (import, sandbox runner, selection/tiers, grading-battery,
  firestore schema, localization flow, github link verify).
- [x] Contract tests written? → Planned in tasks.md before implementation.
- [⚠] Realistic environments used? → **PARTIAL** (C2, carryover): parser tested against **real saved
  ACMP HTML**, the sandbox against the **real `isolated-vm`**, upsert/selection against the
  **Firestore emulator**, README links against a **real raw fetch**; only the Gemini model
  (translate+weave) is stubbed in CI, with a gated live smoke test.

**Result**: PASS with carryover exceptions (C1, C2) and one justified added component (C3 — sandboxed
execution of DB-stored task code, per the explicit product decision).

## Project Structure

### Documentation (this feature)

```text
specs/002-acmp-task-catalog/
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── acmp-import.md          # Fetch → parse → translate → assets → store code → upsert (CLI)
│   ├── sandbox-runner.md       # Execute DB-stored solver/generator code in a V8 isolate (limits)
│   ├── selection-and-tiers.md  # Complexity ranking, three-way split, random pick of 3
│   ├── grading-battery.md      # ≥30-case battery (sandboxed solver) + whitespace-tolerant grading
│   ├── firestore-schema.md     # Updated tasks/{id} (solverSource/testGenSource) + sessions/{id}
│   ├── narrative-localization.md # weave-quest: detect theme language + localize task content
│   └── github-link-verify.md   # README must link original ACMP task pages
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Extends the feature-001 app under `app/`.

```text
app/
├── public/
│   └── tasks/<taskId>/           # NEW: downloaded task illustrations (served statically)
├── scripts/
│   └── seed-tasks.ts             # superseded by the import CLI for real tasks
├── src/
│   ├── app/                      # thin UI + server actions (extended for image/examples display)
│   ├── ai/
│   │   ├── genkit.ts
│   │   └── flows/
│   │       └── weave-quest.ts    # EXTENDED: detect theme language + localize task content
│   ├── components/               # EXTENDED: task view with illustrations + I/O examples/format
│   └── lib/
│       └── quest/
│           ├── acmp-import/      # NEW: fetch, parse, translate, asset-download, store code, upsert (+ CLI)
│           ├── sandbox/          # NEW: run DB-stored solver/testGen in a V8 isolate w/ limits (+ CLI)
│           ├── task-selection/   # EXTENDED: complexity tier split + random pick of 3
│           ├── grading/          # EXTENDED: run stored solver over ≥30-case battery; whitespace-tolerant
│           ├── github-verify/    # EXTENDED: original-source-link verification
│           └── model/            # EXTENDED: Task (complexity, io format, examples, images, ready,
│                                  #           solverSource, testGenSource, runtime)
│           # REMOVED: tasks/ (code-resident solver registry) — solvers/generators now live in the DB
└── tests/
    ├── unit/                     # parser/tiers/battery/grading/readiness/link-verify
    ├── integration/              # emulator upsert + tiered selection; real README fetch
    └── e2e/                      # display task w/ image + examples in detected language
```

**Structure Decision**: Single Next.js project (Simplicity Gate). The porting pipeline is a
framework-agnostic library with a CLI (Library-First + CLI gates); selection/grading/localization
extend existing libraries; the UI and server actions stay thin adapters. Illustrations are static
assets to avoid adding a storage service for a curated catalog.

## Complexity Tracking

| Violation / Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **C1 — CLI Interface Gate partial** (carryover): the React UI is not a CLI. | The product is an interactive themed web quest; a browser UI cannot be text-in/out. Every *domain* library (incl. the new `acmp-import`) ships a JSON CLI. | Forcing the UI behind a CLI contradicts the product and adds no value; Article II's intent is met by library CLIs + JSON I/O. |
| **C2 — Integration-First partial** (carryover): the Gemini model (translation + weave) is stubbed in CI. | Live LLM calls are non-deterministic, networked, rate-limited, cost-bearing → flaky/slow CI. Parser (real HTML), Firestore (emulator), and README links (real fetch) ARE exercised for real. | Always-live model calls break offline/deterministic CI. Schema-contract the flow with a stub + a separately gated live smoke test. |
| **C3 — Solver & test-generator code is stored in the DB and executed in an in-process sandbox** (explicit product decision; reverses the earlier keyed-code interpretation). | The product requires a **data-driven, infinitely scalable** catalog: adding a task = writing a row that carries its own solution + test-generation algorithm, retrievable and runnable on demand (FR-006/FR-007/FR-007b). Running stored code safely needs a sandbox; an **in-process V8 isolate** (`isolated-vm`) provides memory/time limits and no host/network access **without** adding a separate service/project, so the Simplicity ceiling (≤3 projects) holds. Curated code is still example-validated + curator-reviewed before `ready` (FR-006), and learner code is never run. | (a) Code-resident solvers keyed by id — rejected: requires a code deploy per task, defeating data-driven scale (the user's explicit goal). (b) A separate execution microservice — rejected for v1: a new project + ops surface; the in-process isolate meets the safety bar for curated code at classroom scale. (c) Storing static (input,output) fixtures only — rejected: doesn't store the *algorithm* (user intent) and loses per-play battery regeneration. |

## Phase 0 — Research

See [research.md](./research.md). Resolves: ACMP page parsing & field mapping; storing solution +
test-generation algorithms as code in the DB and executing them in a sandboxed V8 isolate (limits,
isolation, validation); translation via Genkit without corrupting I/O rules; complexity-based tier
split (ties, non-divisible counts); realizing "graded against all ≥30 tests" via the stored,
sandboxed generator; illustration storage; readiness/curator gate; the level taxonomy change
(`advanced` → `expert`); and the language-agnostic ("de-Python") reframing.

## Phase 1 — Design & Contracts

Artifacts: [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Phase 2 — Task Planning (handled by `/speckit-tasks`)

Not executed here. `/speckit-tasks` derives dependency-ordered, test-first tasks: a Phase 0
language-agnostic ("de-Python") pass and a Foundational sandbox-runner + model change, then the four
user stories (catalog import w/ DB-stored code → tiered selection → complete localized display →
README links), with library tests preceding implementation per Article III.
