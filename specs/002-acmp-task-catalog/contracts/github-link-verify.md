# Contract: README Original-Source Link Verification (`lib/quest/github-verify`)

Extends the feature-001 win check. The winning README must contain both the quest's task ids
**and** links to each task's original ACMP source page (US4 / FR-015 / FR-016).

## Function contract

```text
verifyReadme({ readme: string, missions: Mission[] }) ->
    { ok: true }
  | { ok: false, missingTaskIds: string[], missingLinks: string[] }

# For each coding mission:
#   - its taskId must appear in the README (carryover), AND
#   - its sourceUrl (https://acmp.ru/index.asp?main=task&id_task=<taskId>) must appear as a link.
# Link match is tolerant to http/https and a trailing slash; reports each specific miss.
```

The deployment mission's `statement` MUST instruct the learner to include these links (FR-015).

## Rules

- Win requires ALL task ids present AND ALL source links present.
- A README missing one or more links fails with the specific `missingLinks` (FR-016/SC-007).
- Verification fetches the README via the existing real raw-content path (integration test uses a
  real fetch; unit tests pass README text directly).

## Contract tests (write first, must FAIL)

- A README listing all task ids AND all source links → `{ ok: true }`.
- A README with all ids but a missing source link → `ok:false` with that link in `missingLinks`.
- A README missing a task id → `ok:false` with it in `missingTaskIds`.
- Link match tolerates `http`↔`https` and a trailing slash; an unrelated ACMP link does not satisfy a
  required `id_task` link.
- The composed deployment mission statement contains each task's source URL (FR-015).
