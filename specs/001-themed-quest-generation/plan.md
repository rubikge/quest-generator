# Implementation Plan: Themed Python Quest Generation

**Branch**: `001-themed-quest-generation` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-themed-quest-generation/spec.md`

## Summary

Build a web application that turns a learner's chosen theme/universe and Python level into a
four-mission coding quest with a single AI-woven storyline. The four missions are selected
from a database of real, pre-authored coding tasks (ACMP-style problems), wrapped in a themed
narrative generated via Genkit (Gemini), played in sequence with output-comparison grading
for the first three, and capped by a final mission requiring the learner to deploy their work
to a public GitHub repository whose README must list the quest's task identifiers to win.

The technical approach generalizes the existing `kodolom/` prototype ("Invasion Codebreaker"):
a Next.js (App Router) + React app deployed on Firebase App Hosting (Google Cloud), with Cloud
Firestore as the task/quest store, Genkit flows for narrative weaving, and Next.js server
actions for deterministic grading and GitHub verification.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (the *application* language). Python is the
*subject domain* the learner writes; the platform never executes learner Python (output
comparison only).

**Primary Dependencies**: Next.js (App Router, React 19), Genkit ^1.28 with
`@genkit-ai/google-genai` (model `googleai/gemini-2.5-flash`), Firebase ^11 (App Hosting +
Cloud Firestore), Zod (schema/validation), Tailwind CSS + shadcn/Radix UI.

**Storage**: Cloud Firestore — task database (real coding tasks + metadata), generated quests,
and per-session progress. No relational DB.

**Testing**: Vitest for unit tests of the domain libraries (task selection, output comparison,
GitHub-README verification, quest assembly); Genkit flow tests for narrative generation against
a schema; Firestore emulator for integration; Playwright for one end-to-end happy-path.

**Target Platform**: Modern desktop and mobile web browsers; server runtime on Firebase App
Hosting (Cloud Run) in Google Cloud.

**Project Type**: Web application — single Next.js project with internal domain libraries.

**Performance Goals**: Full quest generation (theme+level → playable quest) under 60s (SC-001),
target p95 < 15s; mission verification feedback under 2s p95; README win check under 5s p95.

**Constraints**: Google Cloud + Firebase infrastructure is mandatory; AI narrative generation
MUST go through Genkit; v1 is anonymous and session-only (no login, no cross-device
persistence); generated narrative must stay appropriate for a learning context.

**Scale/Scope**: Educational / classroom scale — tens to low-hundreds of concurrent learners;
task database in the order of dozens to a few hundred curated problems across levels.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 — nine articles. Initial gate evaluation:

### Phase -1: Pre-Implementation Gates

#### Library-First Gate (Article I)

- [x] Feature is structured as one or more standalone, independently testable libraries?
  → Core domain logic is extracted into framework-agnostic libraries under `src/lib/quest/`
    (`task-selection`, `grading`, `github-verify`, `narrative` orchestration). The Next.js UI
    and server actions are thin adapters over these libraries.
- [x] No feature logic implemented directly in application code without a library?
  → UI/server-action layers only marshal input/output; all decisions live in libraries.

#### CLI Interface Gate (Article II)

- [⚠] Each library exposes its functionality via a CLI (text in / text out, errors to stderr)?
  → **PARTIAL** — see Complexity Tracking C1. The domain libraries (selection, grading,
    github-verify) ship thin CLI entrypoints supporting JSON I/O for observability and testing.
    The presentation layer (React UI) inherently cannot be a CLI.
- [x] JSON output supported for structured data exchange?
  → Library CLIs and Genkit flows use JSON I/O; quest/task records are JSON-serializable.

#### Test-First Gate (Article III — NON-NEGOTIABLE)

- [x] Tests are written, user-approved, and confirmed to FAIL before any implementation?
  → tasks.md will order test tasks before implementation per library; Red-Green-Refactor.
- [x] Red-Green-Refactor cycle planned for every implementation task?

#### Simplicity Gate (Article VII)

- [x] Using ≤3 projects?
  → One project (the Next.js app) containing internal libraries. No additional projects.
- [x] No future-proofing?
  → No auth, no multi-DB, no plugin systems in v1; only what the spec's three stories require.

#### Anti-Abstraction Gate (Article VIII)

- [x] Using framework directly?
  → Genkit, Firebase SDK, and Next.js are used directly — no wrapper layers re-exposing them.
- [x] Single model representation?
  → One representation per entity (Task, Quest, Mission, Progress) shared across layers via
    Zod schemas; no parallel DTO/entity copies.

#### Integration-First Gate (Articles IV & IX)

- [x] Contracts defined?
  → See `contracts/` — Genkit narrative flow schema, server-action contracts, Firestore
    document schemas.
- [x] Contract tests written?
  → Planned in tasks.md before implementation (contract tests precede flow/action code).
- [⚠] Realistic environments used (real databases/services over mocks/stubs)?
  → **PARTIAL** — see Complexity Tracking C2. Firestore via the official emulator and a real
    GitHub raw-content fetch in integration tests; the Gemini model is stubbed in CI to keep
    tests deterministic/offline, with a thin live smoke test gated separately.

**Result**: PASS with two documented exceptions (C1, C2). No unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-themed-quest-generation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── narrative-flow.md       # Genkit weave-quest flow contract
│   ├── server-actions.md       # generateQuest / verifySolution / verifyDeployment
│   └── firestore-schema.md     # tasks / quests / sessions collections
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

The delivered app supersedes the `kodolom/` prototype. New source lives under `app/` at the
repository root (the prototype remains as reference until cutover).

```text
app/
├── src/
│   ├── app/                      # Next.js App Router (pages, layout, server actions)
│   │   ├── page.tsx              # Startup: theme + level selection
│   │   ├── quest/                # Quest play view
│   │   └── actions.ts            # Server actions (thin adapters → lib/quest)
│   ├── ai/
│   │   ├── genkit.ts             # Genkit + googleAI config (Gemini 2.5 Flash)
│   │   └── flows/
│   │       └── weave-quest.ts    # Narrative-weaving flow (typed I/O)
│   ├── components/               # React UI (presentation only)
│   └── lib/
│       └── quest/                # FRAMEWORK-AGNOSTIC DOMAIN LIBRARIES
│           ├── task-selection/   # pick 4 tasks for a level (+ CLI)
│           ├── grading/          # output comparison (+ CLI)
│           ├── github-verify/    # README task-id verification (+ CLI)
│           ├── tasks/            # task registry: input generators + reference solvers
│           └── model/            # Zod schemas: Task, Quest, Mission, Progress
└── tests/
    ├── unit/                     # Vitest unit tests for lib/quest/*
    ├── integration/              # Firestore emulator + GitHub fetch + flow-schema tests
    └── e2e/                      # Playwright happy-path
```

**Structure Decision**: Single Next.js project (Simplicity Gate). Business logic is isolated in
`src/lib/quest/` framework-agnostic libraries with thin CLI entrypoints (Library-First + CLI
gates); the App Router UI, server actions, and Genkit flow are adapters. This keeps the testable
core independent of Next.js/Firebase while honoring the mandated GCP/Firebase/Genkit stack.

## Complexity Tracking

> Constitution Check raised two partial-compliance items. Both are justified below.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **C1 — CLI Interface Gate (Article II) partial**: the React presentation layer is not exposed via a CLI. | The spec mandates a *web application* with an interactive themed UI; a browser UI cannot be a text-in/text-out CLI. Domain libraries (selection, grading, github-verify) DO ship JSON-capable CLIs to preserve observability/testability. | Forcing the UI itself behind a CLI would contradict the core product requirement (an interactive web quest) and deliver no user value. Article II's intent — verifiable, non-opaque behavior — is met by giving every *domain library* a CLI and JSON I/O. |
| **C2 — Integration-First Gate (Articles IX) partial**: the Gemini model is stubbed in automated CI rather than always called live. | Live LLM calls are non-deterministic, networked, rate-limited, and cost-bearing; using them in every CI run makes tests flaky and slow, violating the spirit of fast, reliable verification. Firestore (emulator) and GitHub (real raw fetch) ARE exercised for real. | Always-live model calls would make the suite non-deterministic and break offline/CI runs. Instead: contract-test the flow against its Zod schema with a stubbed model, plus a separately-gated live smoke test for the real Gemini path. |

## Phase 0 — Research

See [research.md](./research.md). Resolves: Genkit structured-output narrative weaving, how
"real tasks" map into a Firestore-backed registry while keeping deterministic grading without
executing learner code, level taxonomy, and session-only persistence approach.

## Phase 1 — Design & Contracts

Artifacts: [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Phase 2 — Task Planning (handled by `/speckit-tasks`)

Not executed here. `/speckit-tasks` will derive dependency-ordered, test-first tasks grouped by
the three user stories, with library tests preceding implementation per Article III.
