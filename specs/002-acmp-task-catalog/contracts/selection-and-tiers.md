# Contract: Complexity Tiers & Selection (`lib/quest/task-selection`)

Difficulty-tiered selection of the 3 coding tasks (FR-008..FR-012). Tiers are derived from ACMP
`complexity` at selection time over all `ready` tasks (research R4).

## Function contracts

```text
splitTiers(tasks: Task[]) -> { beginner: Task[], intermediate: Task[], expert: Task[] }
  # filter ready; sort ascending by (complexity, taskId); contiguous thirds by index:
  #   b1 = floor(n/3); b2 = floor(2n/3)
  #   beginner=[0,b1)  intermediate=[b1,b2)  expert=[b2,n)

selectQuestTasks({ tasks, level, pick? }) ->
    { ok: true, codingTasks: Task[3] }
  | { ok: false, code: 'INSUFFICIENT_TASKS', available: number }
  # tier = splitTiers(tasks)[level]; if tier.length < 3 -> INSUFFICIENT_TASKS
  # else pick 3 (default: random shuffle; injectable for deterministic tests)
```

## Rules

- Only `ready === true` tasks participate (a task becomes `ready` only after its stored solver/
  generator code passes sandbox validation, R7); non-ready tasks are excluded.
- Every ready task belongs to exactly one tier for any `n` (no loss when `n % 3 != 0`).
- Tie-break by `taskId` makes the split stable/deterministic given the same catalog.
- `beginner → lowest`, `intermediate → middle`, `expert → highest` third (FR-010).

## Contract tests (write first, must FAIL)

- `splitTiers` over 9 tasks (complexity 1..9) yields tiers of sizes 3/3/3 in ascending order.
- For `n` not divisible by 3 (e.g., 10), every task lands in exactly one tier and counts are
  contiguous by the `floor` boundaries (e.g., 3/3/4).
- Equal-complexity tasks order by `taskId` deterministically.
- `selectQuestTasks(level)` returns 3 tasks all drawn from the correct tier for each level (FR-004/010).
- A tier with < 3 ready tasks returns `INSUFFICIENT_TASKS` with `available` (FR-012/SC-005).
- With an injected non-trivial picker, repeated calls can return different triples (FR-011); with a
  fixed picker, results are reproducible.
- A `ready:false` task in the lowest-complexity slot is excluded from the beginner tier.
