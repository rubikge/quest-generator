# Quickstart: ACMP Task Catalog & Difficulty-Tiered Selection

**Feature**: 002-acmp-task-catalog | **Date**: 2026-06-21

Prereqs: Node 20+, repo installed (`cd app && npm install`), Firebase emulator available, a Gemini
API key for live translation/weave (`GOOGLE_GENAI_API_KEY` / project env). All commands run from `app/`.

## 1. Port the curated ACMP tasks (US1)

```bash
# Dry run: fetch + parse + translate one task, print JSON, write nothing
npm run import:acmp -- --ids 892 --dry-run --json

# Import the curated 10 (writes tasks/{id} with ready:false; downloads images to public/tasks/<id>/)
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --ids 892,757,907,<7 more>

# After reviewing each task (solver reproduces ACMP examples), curator marks it ready
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run import:acmp -- --mark-ready 892
```

Verify: ≥10 tasks stored, each with English statement + I/O format + ≥1 example + complexity +
sourceUrl; ≥1 task has a non-empty `images[]`; each task's stored `solverSource`/`testGenSource`
runs in the sandbox to reproduce the parsed examples and yield ≥30 labeled
positive/negative/edge cases before `--mark-ready` flips `ready:true` (SC-001..SC-003).

## 2. Tiered selection (US2)

```bash
# CLI over the catalog: pick 3 from the tier matching the level
npm run select -- --level beginner --json     # lowest-complexity third
npm run select -- --level expert --json        # highest-complexity third
```

Expect exactly 3 ready tasks from the correct third; `INSUFFICIENT_TASKS` if a tier has < 3 (SC-004/005).

## 3. Play a quest with complete, localized display (US3)

```bash
npm run dev     # http://localhost:3001
```

- Enter a theme in any language + pick a level → quest generates (theme language auto-detected).
- Each mission shows the full statement, illustrations, input/output examples, and I/O requirements,
  localized to the detected language (English fallback) (SC-006).
- Submit the output for the shown ≥30-case input; correct only if every case matches, whitespace-
  tolerant (FR-019/020).

## 4. Win by deploying with original-task links (US4)

- Final mission instructs: README must list the task ids AND link each original ACMP page.
- Submit a public repo whose README contains all ids + all `id_task` links → win; missing links are
  reported specifically (SC-007).

```bash
npm run github-verify -- --repo <url> --tasks 892,757,907 --json
```

## 5. Run the test suites

```bash
npm test            # unit: parser (HTML fixtures), sandbox (real isolated-vm), tiers, battery≥30, grading, readiness, link-verify
npm run test:int    # integration: emulator upsert/selection/store round-trip; real README fetch
npm run test:e2e    # e2e: display task w/ image + examples in a non-English theme
```

CI stubs the Gemini model (translate + weave); a separately-gated smoke test exercises the live model.
