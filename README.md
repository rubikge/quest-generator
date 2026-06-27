# Coding Quest Generator

Turn a chosen **universe/theme** and **skill level** into a four-mission coding quest, woven
into a single AI-generated storyline. Solve the missions, deploy your work to GitHub, and win.
Tasks are language-agnostic — solve them in any language.

Built with Spec-Driven Development (see [`specs/`](./specs) and the project
[constitution](./.specify/memory/constitution.md)). The interactive prototype that inspired it
lives in `kodolom/` (local reference only, not part of this repo).

## How it works

1. **Choose** a theme (e.g. _"alien invasion"_, _"cyberpunk heist"_) and a skill level
   (beginner / intermediate / expert).
2. The app **selects four tasks** — three real coding problems from a Firestore catalog of tasks
   ported from [ACMP](https://acmp.ru/index.asp?main=alltasks), plus a final deployment mission.
   Selection ranks all *ready* tasks by their ACMP **complexity**, splits them into three contiguous
   tiers (thirds), and picks three at random from the tier matching your level
   (beginner → lowest third, intermediate → middle third, expert → highest third).
3. **Genkit (Gemini 2.5 Flash)** translates the canonical English task into the language
   auto-detected from your theme (English fallback) and weaves the four tasks into one coherent
   storyline. The model only writes narrative framing + localization; it never alters the task's
   input/output rules or grading.
4. You **solve** each coding mission: the app shows generated input, you run your own code (in any
   language) and submit the output. Grading runs the task's stored reference solver over its full
   ≥30-case battery and compares your output whole-output, whitespace-tolerant. Your code is never
   executed — only your output is compared.
5. The final mission is to **deploy to a public GitHub repository** whose README lists the
   quest's task ids **and links each original ACMP task page**. When verified, you win.

Sessions are anonymous and persist for the browser session (no login).

### Language-agnostic by design

The platform and its tasks are **language-agnostic** — coding tasks may be solved in *any*
programming language. The platform never runs the learner's code; it grades by comparing the
submitted output against the expected output.

### Data-driven catalog (tasks as data)

Each catalog task is a Firestore row that stores everything needed to present and grade it,
**including its reference solution and ≥30-case test generator as code** (`solverSource`,
`testGenSource`, `runtime`). That curated, stored task code runs **only** inside an in-process V8
isolate sandbox (`isolated-vm`, under `app/src/lib/quest/sandbox/`) with time/memory limits — so a
task's code cannot affect other tasks, learners, or the platform. Adding a task is a pure data
operation (add a row); no code deployment is required.

## Tech stack

| Concern | Choice |
|---|---|
| App framework | Next.js (App Router) + React 19 + TypeScript |
| AI generation | Genkit with `@genkit-ai/google-genai` (`googleai/gemini-2.5-flash`) |
| Data / persistence | Cloud Firestore (via `firebase-admin`) |
| Hosting | Firebase App Hosting (Google Cloud) |
| Validation | Zod (single shared schema per entity) |
| Tests | Vitest (unit + integration), Playwright (e2e), Firestore emulator |

Domain logic lives in framework-agnostic libraries under `app/src/lib/quest/`, each with a JSON
CLI; the Next.js UI and `'use server'` actions are thin adapters over them.

## Repository layout

```text
app/                         # the application
├── src/
│   ├── app/                 # Next.js routes + server actions (actions.ts)
│   ├── components/          # React UI (setup, mission, deployment, win, progress)
│   ├── ai/                  # genkit.ts + flows/weave-quest.ts
│   └── lib/quest/           # framework-agnostic domain core
│       ├── model/           # Zod schemas (Task, Quest, Mission, Progress, Session)
│       ├── acmp-import/     # ACMP fetch/parse/translate/validate/upsert pipeline (+ CLI)
│       ├── sandbox/         # isolated-vm (V8 isolate) runner for stored solver/test-gen code (+ CLI)
│       ├── task-selection/  # rank ready tasks by complexity → thirds → pick 3 for a level (+ CLI)
│       ├── grading/         # output-comparison grading (+ CLI)
│       ├── github-verify/   # README task-id + ACMP-link verification (+ CLI)
│       ├── assemble.ts      # compose tasks + narrative into a Quest
│       ├── service.ts       # generate / verify services (the action logic)
│       └── store.ts         # Firestore access
└── tests/{unit,integration,e2e}/
specs/001-themed-quest-generation/   # spec, plan, research, data-model, contracts, tasks
specs/002-acmp-task-catalog/         # ACMP catalog + difficulty-tiered selection
```

## Prerequisites

- Node.js 20+
- A Google AI (Gemini) API key
- Firebase CLI + Java (for the Firestore emulator) — for local data and tests

## Setup

```bash
cd app
npm install
cp .env.example .env          # then set GEMINI_API_KEY=...
```

Relevant `.env` values:

```ini
GEMINI_API_KEY=your-key-here
FIRESTORE_EMULATOR_HOST=localhost:8080   # targets the local emulator
```

## Run locally

The app needs Firestore (use the emulator) and the Gemini key (auto-loaded from `.env`).

```bash
cd app

# 1) Start the Firestore emulator (separate terminal)
firebase emulators:start --only firestore --project demo-quest-generator

# 2) Import the curated ACMP tasks into the emulator (see "Importing ACMP tasks" below)
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --ids 892,757,907,<7 more>

# 3) Start the app
npm run dev
```

Open http://localhost:3001, pick a theme + level, and generate your quest.

## Importing ACMP tasks

The catalog is populated from [ACMP](https://acmp.ru/index.asp?main=alltasks) via an idempotent
import pipeline (fetch → parse → translate to English → validate solver/test-gen in the sandbox →
upsert), run with `npm run import:acmp`:

```bash
cd app

# Dry run: fetch + parse + translate one task, print JSON, write nothing
npm run import:acmp -- --ids 892 --dry-run --json

# Import the curated set (writes tasks/{id} with ready:false; downloads images to public/tasks/<id>/)
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --ids 892,757,907,<7 more>

# After review (the stored solver reproduces ACMP's worked examples and yields ≥30 cases),
# a curator marks the task ready — only ready tasks are offered in quests
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --mark-ready 892
```

Re-running the import for the same id updates (does not duplicate) the row. Each imported task
stores its English statement, I/O format, ≥1 worked example, ACMP `complexity`, `sourceUrl`,
illustrations, and its `solverSource` / `testGenSource` (executed only in the sandbox).

## Testing

```bash
cd app
npm test          # unit tests (domain core) — fast, no services needed
npm run test:int  # integration: Firestore emulator + flow contract + live Gemini smoke
npm run test:e2e  # Playwright happy-path in a real browser (deterministic, stubbed model)
npm run typecheck # type-check the domain core
```

- The integration suite includes a **live Gemini** smoke test that runs only when
  `GEMINI_API_KEY` is set (otherwise skipped), keeping default runs deterministic and offline.
- The e2e run boots the emulator, seeds tasks, starts the dev server with `QUEST_E2E_STUB=1`
  (stubbed narrative + deployment check), and drives the full journey:
  generate → solve 3 missions → deploy → win.

- A separately-gated **live smoke** test (`tests/integration/live-smoke.test.ts`) exercises the
  real Gemini translate + weave path; it runs only when `GEMINI_API_KEY` is set, and is skipped
  otherwise.

## Library CLIs

Each domain library exposes a JSON CLI (text in → JSON out):

```bash
echo '{"expected":"YES","submitted":"YES"}' | npm run -s grade
echo '{"level":"beginner","tasks":[...]}'    | npm run -s select
npm run -s github-verify https://github.com/user/repo 892 757 907
npm run -s sandbox:run                          # run stored solver/test-gen code in the isolate
npm run -s import:acmp -- --ids 892 --dry-run   # ACMP import pipeline
```

**Win condition:** the final deployment mission requires the learner's repository README to list
the quest's task ids **and** link each original ACMP task page
(`https://acmp.ru/index.asp?main=task&id_task=<id>`). `github-verify` reports specifically which
ids or links are missing.

## Deploy (Firebase App Hosting)

```bash
cd app
firebase deploy
```

`apphosting.yaml` configures the runtime and wires `GEMINI_API_KEY` from Secret Manager.
Firestore access uses the runtime's default credentials (no client SDK init needed).

## Status

Feature `001-themed-quest-generation` (the themed quest/flow/store/UI) is implemented. The active
feature, `002-acmp-task-catalog`, adds the language-agnostic ACMP catalog: data-driven tasks with
DB-stored solver/test-gen code executed in the `isolated-vm` sandbox, complexity-tiered selection,
localized task display, and the ACMP-link win condition. See
[`specs/002-acmp-task-catalog/`](./specs/002-acmp-task-catalog/).
