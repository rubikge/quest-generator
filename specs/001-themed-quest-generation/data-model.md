# Phase 1 Data Model: Themed Python Quest Generation

**Feature**: 001-themed-quest-generation | **Date**: 2026-06-20

Single representation per entity (Anti-Abstraction Gate). Each entity is defined once as a Zod
schema in `src/lib/quest/model/` and reused across the UI, server actions, Genkit flow, and
Firestore access. Types below are descriptive; Zod schemas are the source of truth.

---

## Entity: Task (catalog entry)

A real, pre-authored coding problem. Authored/curated outside the primary flow; read-only here.

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `id` | string | Firestore document id (internal). |
| `taskId` | string | Public identifier used in the README win check (e.g., ACMP id `"892"`). Non-empty. |
| `title` | string | Short mission title. Non-empty. |
| `statement` | string | Problem description shown to the learner. Non-empty. |
| `level` | enum | One of `beginner` \| `intermediate` \| `advanced`. |
| `sourceUrl` | string (url) | Reference to the original problem (e.g., ACMP URL). Optional. |
| `solverKey` | string | Key into the code-resident registry of `{ generateInput, solve }`. Must resolve. |

**Rules**: `taskId` unique within the catalog. A task is selectable only if `solverKey` resolves
to a registered solver. Grading and input generation are NOT stored in the document (see R2).

---

## Entity: Theme/Universe

The learner's chosen setting; drives narrative tone.

| Field | Type | Notes |
|-------|------|-------|
| `value` | string | Learner-chosen theme label (e.g., "alien invasion", "fantasy heist"). Non-empty, length-bounded. |

**Rules**: Sanitized/length-limited before being passed to the Genkit flow; must remain
appropriate for a learning context (flow prompt enforces tone).

---

## Entity: Quest

A generated playthrough binding exactly four tasks and one storyline.

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `id` | string | Quest id. |
| `theme` | string | The chosen theme. |
| `level` | enum | The chosen level. |
| `questIntro` | string | Overall storyline introduction (model-generated). |
| `missions` | Mission[4] | Exactly four, ordered; mission 4 is the GitHub deployment. |
| `createdAt` | timestamp | Generation time. |

**Rules**: `missions.length === 4` (FR-003). Missions 1–3 are graded tasks; mission 4 is the
deployment mission. All non-final missions reference tasks of the quest's `level` (FR-005).

---

## Entity: Mission

One step of a quest: a task wrapped in narrative framing.

| Field | Type | Notes |
|-------|------|-------|
| `order` | int | 1–4. |
| `kind` | enum | `coding` (missions 1–3) \| `deployment` (mission 4). |
| `taskId` | string \| null | Public task id for coding missions; null for deployment. |
| `solverKey` | string \| null | For coding missions; used to compute correct output. Null for deployment. |
| `title` | string | Mission title. |
| `statement` | string | Problem/objective text. |
| `storyFraming` | string | Model-generated narrative for this mission. |

**Rules**: Exactly one `deployment` mission (order 4). Coding missions carry a resolvable
`solverKey`. The deployment mission's objective references the quest's task ids for the README.

---

## Entity: Progress (within a Session)

The learner's state in a quest.

| Field | Type | Notes |
|-------|------|-------|
| `currentMission` | int | 1–4. |
| `solvedMissions` | int[] | Orders of solved missions. |
| `won` | bool | True once the deployment mission verifies. |

**State transitions**:

```text
mission N unsolved --(correct submission)--> mission N solved --> currentMission = N+1
mission N unsolved --(incorrect submission)--> mission N unsolved (retry, unlimited; FR-011)
mission 4 (deployment) verified --> won = true, quest concluded (FR-015)
```

**Rules**: A mission unlocks only after the previous one is solved (FR-010). `won` requires all
four missions solved, the fourth being the verified GitHub deployment.

---

## Entity: Session (persistence root)

Anonymous, session-scoped container (R4). Firestore `sessions/{sessionId}`.

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | string | Client-generated id (cookie/localStorage). |
| `quest` | Quest \| null | The active generated quest, if any. |
| `progress` | Progress | Progress against the active quest. |
| `updatedAt` | timestamp | Last activity. |

**Rules**: No user identity/auth (clarified scope). Survives refresh, not cross-device.

---

## Firestore collections

```text
tasks/{taskDocId}        # Task catalog (read-only at runtime)
sessions/{sessionId}     # { quest, progress, updatedAt } — anonymous session state
```

Generated quests live embedded in the session document (one active quest per session); a separate
`quests/` collection is intentionally omitted for v1 (Simplicity Gate).

---

## Relationships

```text
Theme  ─┐
        ├─(generate)─> Quest ──contains 4──> Mission ──(coding)──> Task (by taskId/solverKey)
Level  ─┘                 │
                          └── tracked by ──> Progress  ⊂  Session
```
