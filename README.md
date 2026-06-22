# Coding Quest Generator

Turn a chosen **universe/theme** and **skill level** into a four-mission coding quest, woven
into a single AI-generated storyline. Solve the missions, deploy your work to GitHub, and win.
Tasks are language-agnostic — solve them in any language.

Built with Spec-Driven Development (see [`specs/`](./specs) and the project
[constitution](./.specify/memory/constitution.md)). The interactive prototype that inspired it
lives in `kodolom/` (local reference only, not part of this repo).

## How it works

1. **Choose** a theme (e.g. _"alien invasion"_, _"cyberpunk heist"_) and a skill level
   (beginner / intermediate / advanced).
2. The app **selects four tasks** — three real coding problems from a Firestore catalog matched
   to your level, plus a final deployment mission.
3. **Genkit (Gemini 2.5 Flash)** weaves the four tasks into one coherent storyline. The model
   only writes narrative framing; it never alters the task statements or grading.
4. You **solve** each coding mission: the app shows generated input, you run your own code (in any
   language) and submit the output, which is compared to the correct output (no learner code is executed).
5. The final mission is to **deploy to a public GitHub repository** whose README lists the
   quest's task ids. When verified, you win.

Sessions are anonymous and persist for the browser session (no login).

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
│       ├── tasks/           # solver registry + ported ACMP solvers
│       ├── task-selection/  # pick 4 tasks for a level (+ CLI)
│       ├── grading/         # output-comparison grading (+ CLI)
│       ├── github-verify/   # README task-id verification (+ CLI)
│       ├── assemble.ts      # compose tasks + narrative into a Quest
│       ├── service.ts       # generate / verify services (the action logic)
│       └── store.ts         # Firestore access
├── scripts/seed-tasks.ts    # seed the task catalog
└── tests/{unit,integration,e2e}/
specs/001-themed-quest-generation/   # spec, plan, research, data-model, contracts, tasks
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

# 2) Seed the task catalog into the emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run seed

# 3) Start the app
npm run dev
```

Open http://localhost:3000, pick a theme + level, and generate your quest.

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

Current status: **43 unit + 15 integration + 1 e2e** passing.

## Library CLIs

Each domain library exposes a JSON CLI (text in → JSON out):

```bash
echo '{"expected":"YES","submitted":"YES"}' | npm run -s grade
echo '{"level":"beginner","tasks":[...]}'    | npm run -s select
npm run -s github-verify https://github.com/user/repo 892 757 907
```

## Deploy (Firebase App Hosting)

```bash
cd app
firebase deploy
```

`apphosting.yaml` configures the runtime and wires `GEMINI_API_KEY` from Secret Manager.
Firestore access uses the runtime's default credentials (no client SDK init needed).

## Status

The themed quest generation feature is implemented and verified (40/41 tasks). The remaining
item is retiring the `kodolom/` prototype once visual parity is decided. See
[`specs/001-themed-quest-generation/tasks.md`](./specs/001-themed-quest-generation/tasks.md).
