# Contract: Firestore Document Schemas

Two collections. Documents are JSON and validate against the Zod schemas in `lib/quest/model`.

---

## `tasks/{taskDocId}` — catalog (read-only at runtime)

```json
{
  "taskId": "892",
  "title": "Season analysis",
  "statement": "Given month numbers 1..12, print the season per line; 'Error' otherwise.",
  "level": "beginner",
  "sourceUrl": "https://acmp.ru/index.asp?main=task&id_task=892",
  "solverKey": "season-analysis"
}
```

**Constraints**: `taskId` unique; `level` ∈ {beginner, intermediate, advanced}; `solverKey` MUST
resolve in the code-resident solver registry. No executable code stored.

**Contract tests (first, must FAIL)**:
- Reading a task validates against the `Task` schema.
- A document whose `solverKey` does not resolve is excluded from selection.

---

## `sessions/{sessionId}` — anonymous session state

```json
{
  "sessionId": "c1b2...",
  "quest": {
    "id": "q_001",
    "theme": "alien invasion",
    "level": "beginner",
    "questIntro": "…",
    "missions": [
      { "order": 1, "kind": "coding", "taskId": "892", "solverKey": "season-analysis", "title": "…", "statement": "…", "storyFraming": "…" },
      { "order": 2, "kind": "coding", "taskId": "757", "solverKey": "molecule-calc", "title": "…", "statement": "…", "storyFraming": "…" },
      { "order": 3, "kind": "coding", "taskId": "907", "solverKey": "mouse-rug", "title": "…", "statement": "…", "storyFraming": "…" },
      { "order": 4, "kind": "deployment", "taskId": null, "solverKey": null, "title": "Final report", "statement": "Deploy to GitHub; README must list 892, 757, 907.", "storyFraming": "…" }
    ],
    "createdAt": "2026-06-20T12:00:00Z"
  },
  "progress": { "currentMission": 1, "solvedMissions": [], "won": false },
  "updatedAt": "2026-06-20T12:00:00Z"
}
```

**Constraints**: `missions.length === 4`; exactly one `kind: "deployment"` at `order: 4`; coding
missions carry resolvable `solverKey`; `progress.currentMission` ∈ 1..4.

**Contract tests (first, must FAIL)**:
- A written-then-read session round-trips and validates against the `Session` schema.
- A quest with ≠ 4 missions fails validation before persistence.
- `won` cannot be true unless mission 4 is in `solvedMissions`.

---

## Integration environment (C2)

Run these schema/round-trip tests against the **Firestore emulator** (not mocks). The Gemini model
is stubbed for the `weaveQuest` path in CI; a separately-gated smoke test exercises the live model.
