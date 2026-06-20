# Contract: Server Actions (thin adapters over `lib/quest`)

All actions are Next.js server actions. They marshal input/output only; decisions live in the
domain libraries. All return JSON-serializable results. Errors return a structured failure with a
user-facing `message` (FR-016) rather than throwing to the UI.

---

## `generateQuest(input)` — US1

**Input**: `{ theme: string, level: 'beginner'|'intermediate'|'advanced', sessionId: string }`

**Behavior**:
1. Select 4 tasks for `level` via `lib/quest/task-selection` (3 coding + 1 deployment slot).
2. If fewer than 3 eligible coding tasks exist → return `{ ok: false, code: 'INSUFFICIENT_TASKS', message }` (FR-018).
3. Call `weaveQuest` flow to produce narrative; compose authoritative `Quest`.
4. Persist `Quest` + reset `Progress` to `sessions/{sessionId}`.

**Output (success)**: `{ ok: true, quest: Quest }` (quest contains exactly 4 missions, FR-003).

**Contract tests (first, must FAIL)**:
- Returns a 4-mission quest at the requested level for a populated catalog.
- Returns `INSUFFICIENT_TASKS` when the level pool has < 3 coding tasks.
- Persisted session reflects the new quest with `progress.currentMission === 1`.

---

## `verifySolution(input)` — US2

**Input**: `{ sessionId: string, missionOrder: 1|2|3, output: string }`

**Behavior**:
1. Load session + active mission; reject if mission is not the current unlocked mission.
2. Regenerate/Recall the mission input, compute correct output via keyed solver, compare
   (trimmed) using `lib/quest/grading`.
3. On match → mark mission solved, advance `currentMission` (FR-010); on mismatch → leave state,
   allow retry (FR-011).

**Output**: `{ ok: true, correct: boolean, message: string, progress: Progress }`
Empty/malformed output → `{ ok: true, correct: false, message }` (graceful, FR-016 edge case).

**Contract tests (first, must FAIL)**:
- Correct output advances `currentMission`; returns `correct: true`.
- Incorrect output keeps state; `correct: false` with a clear message; retry allowed.
- Submitting for a locked/future mission is rejected.

---

## `verifyDeployment(input)` — US3

**Input**: `{ sessionId: string, repoUrl: string }`

**Behavior**:
1. Validate `repoUrl` is a well-formed public GitHub repo URL (else `code: 'BAD_URL'`).
2. Via `lib/quest/github-verify`: fetch raw README across `main`/`master` + `README.md`/`readme.md`.
3. If unreachable/private → `code: 'UNREACHABLE'`. If reachable but missing any quest task id →
   `code: 'MISSING_IDS'` listing what's absent.
4. If all quest task ids present → mark deployment mission solved, set `won = true` (FR-015).

**Output**: `{ ok: true, won: boolean, message: string, progress: Progress }` or
`{ ok: false, code, message }`.

**Contract tests (first, must FAIL)**:
- Repo whose README contains all quest task ids → `won: true`.
- Malformed/non-GitHub URL → `BAD_URL` with format guidance.
- Reachable repo missing an id → `MISSING_IDS` naming the missing id(s).
- Unreachable/private repo → `UNREACHABLE`.
