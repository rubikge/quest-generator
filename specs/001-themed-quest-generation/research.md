# Phase 0 Research: Themed Python Quest Generation

**Feature**: 001-themed-quest-generation | **Date**: 2026-06-20

This document resolves the open technical questions from the plan's Technical Context. The
infrastructure (Google Cloud, Firebase, Genkit) and the three clarified product decisions
(output-comparison grading, README-task-id win condition, anonymous session-only) are fixed
inputs and are not re-litigated here.

---

## R1 — Narrative weaving via Genkit (structured output)

**Decision**: Use a single Genkit flow `weaveQuest` built on `ai.defineFlow` with the existing
`googleai/gemini-2.5-flash` model, taking `{ theme, level, tasks[4] }` as typed input and
returning a Zod-validated object `{ questIntro, missions[4]{ storyFraming } }`. The four task
*problem statements and grading remain authoritative from the database*; the model only produces
narrative framing around them.

**Rationale**: Genkit's typed flows with Zod input/output schemas make the model's contribution
testable against a schema (Article IX contract testing) and prevent the model from altering task
logic. Reusing the prototype's existing `genkit.ts` config avoids new abstractions (Article VIII).

**Alternatives considered**:
- Free-form prompt returning markdown — rejected: unparseable, untestable, lets the model invent
  or corrupt task content.
- Per-mission separate model calls — rejected for v1: four round-trips risk the 60s budget (SC-001)
  and lose cross-mission story coherence; a single structured call keeps one consistent arc.

---

## R2 — "Database of real tasks" + deterministic grading without executing learner code

**Decision**: Model each task as a Firestore document holding presentation/metadata (title,
statement, level, source reference such as the ACMP URL, and `taskId` used in the README win
check) plus a `solverKey`. The deterministic input generator and reference solver functions live
in application code in `src/lib/quest/tasks/` and are looked up by `solverKey`. To grade: the app
generates input for the active mission, computes the correct output via the keyed reference
solver, and compares it to the learner's submitted output (trimmed string compare), exactly as
the prototype does.

**Rationale**: Firestore cannot safely store executable code, and the clarified scope forbids
executing *learner* code. Keeping deterministic generators/solvers as versioned, unit-tested
application functions (keyed from DB records) preserves the prototype's proven mechanic, keeps
grading fast and offline, and makes each solver independently testable (Article I/III). The
"database" supplies the catalog, level tagging, and selection pool; code supplies the math.

**Alternatives considered**:
- Store precomputed (input, expected-output) fixtures in the DB — rejected: inputs are randomized
  per playthrough for variety (prototype behavior), so static fixtures defeat the purpose.
- Execute a stored Python reference solution server-side — rejected for v1: requires a sandboxed
  execution service (added project + security surface), violating the Simplicity Gate, and is
  unnecessary because reference solvers are simple and already exist in TS in the prototype.

---

## R3 — Level taxonomy

**Decision**: Three discrete levels — `beginner`, `intermediate`, `advanced` — stored as a
`level` enum on each task document. Quest generation filters the candidate pool by the selected
level and requires at least four eligible tasks (else FR-018 error path).

**Rationale**: A small fixed enum is the simplest model that satisfies FR-002/FR-005, is easy to
tag during curation, and maps cleanly to a selection filter. Matches the spec's stated assumption.

**Alternatives considered**:
- Numeric difficulty scores / ranges — rejected as future-proofing (Simplicity Gate) with no
  current requirement; an enum can be migrated to scores later if needed.

---

## R4 — Session-only persistence (anonymous)

**Decision**: Persist the generated quest and progress in a Firestore `sessions` document keyed by
a client-generated session id stored in the browser (e.g., a cookie / localStorage value). No
Firebase Auth in v1. The session document survives refresh; it is not linked across devices.

**Rationale**: Satisfies FR-017 (resume within a session, survive refresh) with the least
machinery and no login (clarified scope). Firestore is already mandated, so reusing it for session
state avoids a second store (Anti-Abstraction / Simplicity).

**Alternatives considered**:
- Firebase Anonymous Auth — rejected for v1: adds an auth dependency and identity lifecycle not
  required by the clarified "no login" decision; can be added later for durable device identity.
- Server memory / in-process cache — rejected: lost on Cloud Run instance recycle, breaking resume.

---

## R5 — GitHub README win verification

**Decision**: Reuse the prototype's approach: given a submitted public repo URL, fetch raw README
across `main`/`master` and `README.md`/`readme.md`, and confirm the quest's task identifiers are
all present. Encapsulate in `src/lib/quest/github-verify/` with a CLI and unit tests; the failing
paths (bad URL, unreachable/private repo, missing ids) map to FR-016 messages.

**Rationale**: Proven in the prototype, needs no GitHub auth, and keeps the win check a pure,
testable function over fetched text. Library isolation lets it be tested with recorded fixtures
plus a real-fetch integration test.

**Alternatives considered**:
- GitHub REST/GraphQL API with a token — rejected for v1: adds credential management and rate-limit
  handling for no added value over public raw fetch.
- Requiring solution files present in the repo — rejected: out of the clarified win condition
  (README task ids only); avoids scope creep.

---

## Resolved unknowns summary

| Topic | Resolution |
|-------|------------|
| Narrative generation | Single typed Genkit `weaveQuest` flow, Zod-validated, model frames only |
| Real-task DB + grading | Firestore catalog + `solverKey` → code-resident generators/solvers, output compare |
| Levels | `beginner` / `intermediate` / `advanced` enum, selection filter, ≥4 required |
| Persistence | Firestore `sessions` doc keyed by client session id, no auth |
| GitHub win | Public raw-README fetch, all task ids present, isolated CLI library |

All Technical Context unknowns are resolved; no NEEDS CLARIFICATION remain. Ready for Phase 1.
