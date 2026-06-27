# Quickstart: Themed Python Quest Generation

**Feature**: 001-themed-quest-generation | **Date**: 2026-06-20

How to run, develop, and validate the feature locally. Builds on the `kodolom/` prototype stack.

## Prerequisites

- Node.js 20+
- A Google AI (Gemini) API key for Genkit (`GEMINI_API_KEY` / `GOOGLE_API_KEY`)
- Firebase CLI with the **Firestore emulator** for integration tests
- (Deploy only) A Firebase project with App Hosting enabled

## Environment

```bash
# from the app/ project root
cp .env.example .env.local   # set GEMINI_API_KEY=...
npm install
```

## Run locally

```bash
npm run dev            # Next.js dev server (themed quest UI)
npm run genkit:dev     # Genkit dev UI to inspect the weaveQuest flow
```

Open the app, choose a theme (e.g., "alien invasion") and a Python level, and confirm to generate
a four-mission quest.

## Test (Test-First — Article III)

```bash
npm run test           # Vitest unit tests for lib/quest/* (write these FIRST, see them FAIL)
npm run test:int       # Integration: Firestore emulator + GitHub raw fetch + flow schema
npm run test:e2e       # Playwright happy-path (theme→quest→solve→deploy→win)
```

Order of work per the constitution: write the failing test, get it approved, see it red, then
implement to green, then refactor.

## End-to-end validation (maps to user stories)

1. **US1 — generate**: pick a theme + `beginner`, confirm → a quest with exactly 4 missions, an
   intro, and per-mission framing appears; all coding tasks are beginner-level (SC-002).
2. **US2 — solve**: open mission 1, take the generated input, run your own Python, submit the
   output → correct advances to mission 2; a wrong answer shows a clear message and lets you retry.
3. **US3 — win**: at mission 4, push your work to a public GitHub repo whose README lists the
   quest's task ids, submit the repo URL → you are declared the winner (SC-004). A malformed URL,
   unreachable repo, or missing id each returns a specific message (SC-006).

## Deploy (Firebase App Hosting / Google Cloud)

```bash
firebase deploy        # App Hosting builds and runs the Next.js app on Cloud Run
```

`apphosting.yaml` controls runtime/scaling. Firestore holds the `tasks` catalog and `sessions`.

## Seeding the task catalog

Load curated tasks into `tasks/` (each with `taskId`, `level`, `solverKey` resolving to a
registered generator/solver). At least 3 coding tasks per level are required to generate a quest
(else the app returns an `INSUFFICIENT_TASKS` message — FR-018).
