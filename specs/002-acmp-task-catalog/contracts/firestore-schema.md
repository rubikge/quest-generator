# Contract: Firestore Document Schemas (updated for 002)

Two collections; documents validate against the Zod schemas in `lib/quest/model`. Illustrations are
static assets (not in Firestore). Changes vs feature 001 are marked **NEW**/**CHANGED**.

---

## `tasks/{taskId}` — catalog (doc id = `taskId`, idempotent upsert)

```json
{
  "taskId": "892",
  "sourceUrl": "https://acmp.ru/index.asp?main=task&id_task=892",
  "title": "Seasonal analysis",
  "statement": "Given month numbers 1..12, print the season per line; otherwise 'Error'.",
  "inputFormat": "Each line contains one integer (a month number).",
  "outputFormat": "For each line, print the season or 'Error'.",
  "examples": [{ "input": "1\n5\n13", "output": "Winter\nSpring\nError" }],
  "images": ["tasks/892/1.png"],
  "complexity": 12,
  "runtime": "js",
  "solverSource": "function solve(input){ /* ...reference solution... */ return out }",
  "testGenSource": "function generateTests(){ /* ... */ return [{input:'1',kind:'edge'}, ...] }",
  "ready": true
}
```

**Constraints**: `taskId` unique (doc id); `sourceUrl` required; `title/statement/inputFormat/
outputFormat` non-empty English; `examples` ≥1 (verbatim); `images` may be `[]`; `complexity`
finite ≥0; `runtime` ∈ {`js`}; `solverSource`/`testGenSource` non-empty code strings (executed only
via the sandbox); `ready` boolean. No `level` field; no `solverKey`/code registry.

**Contract tests (write first, must FAIL)**:
- A read task validates against the `Task` schema (incl. `runtime`/`solverSource`/`testGenSource`).
- A doc with `ready:false` (or whose stored code fails sandbox validation) is excluded from selection.
- Re-importing the same `taskId` yields a single document (idempotent).

---

## `sessions/{sessionId}` — anonymous session state

```json
{
  "sessionId": "c1b2...",
  "quest": {
    "id": "q_001", "theme": "alien invasion", "level": "beginner", "questIntro": "…",
    "missions": [
      { "order": 1, "kind": "coding", "taskId": "892",
        "sourceUrl": "https://acmp.ru/index.asp?main=task&id_task=892",
        "title": "…", "statement": "…", "inputFormat": "…", "outputFormat": "…",
        "examples": [{ "input": "…", "output": "…" }], "images": ["tasks/892/1.png"], "storyFraming": "…" },
      { "order": 4, "kind": "deployment", "taskId": null, "sourceUrl": null,
        "title": "Final report", "statement": "Deploy to GitHub; README must list 892/757/907 and link their original pages.",
        "inputFormat": null, "outputFormat": null, "examples": null, "images": [], "storyFraming": "…" }
    ],
    "createdAt": "2026-06-21T12:00:00Z"
  },
  "progress": { "currentMission": 1, "solvedMissions": [], "won": false },
  "missionInputs": { "1": "<≥30-case generated input block>" },
  "detectedLanguage": "ru",
  "updatedAt": "2026-06-21T12:00:00Z"
}
```

**Constraints**: `missions.length === 4`; exactly one `deployment` at order 4; coding missions carry
non-null `taskId` + non-null `sourceUrl` + display fields; `currentMission` ∈ 1..4; `won` requires
mission 4 in `solvedMissions`; `missionInputs[order]` holds the exact battery used to grade.

**Contract tests (write first, must FAIL)**:
- A written-then-read session round-trips and validates (incl. `missionInputs`, `detectedLanguage`).
- A quest with ≠4 missions or a coding mission with null `taskId`/`sourceUrl` fails validation before persist.
- Grading reads `missionInputs[order]` and recomputes expected by running the task's `solverSource` in the sandbox.

---

## Integration environment

Schema/round-trip and upsert/selection tests run against the **Firestore emulator**. The Gemini model
(translate + weave/localize) is stubbed in CI; a separately-gated smoke test exercises the live model.
