# Contract: `weaveQuest` Genkit Flow

**Type**: Genkit flow (`ai.defineFlow`) over `googleai/gemini-2.5-flash`.
**Purpose**: Wrap four authoritative tasks in a single themed storyline. The model produces
narrative ONLY; it must not alter task statements, ids, or grading.

## Input schema (Zod)

```ts
WeaveQuestInput = {
  theme: string,                  // 1..120 chars, sanitized
  level: 'beginner' | 'intermediate' | 'advanced',
  tasks: Array<{                  // exactly 4, ordered
    order: 1 | 2 | 3 | 4,
    kind: 'coding' | 'deployment',
    title: string,
    statement: string,
    taskId: string | null,
  }>,                             // length === 4; exactly one kind==='deployment' at order 4
}
```

## Output schema (Zod) — validated; flow retries on mismatch

```ts
WeaveQuestOutput = {
  questIntro: string,             // non-empty overall storyline intro
  missions: Array<{               // exactly 4, aligned to input order
    order: 1 | 2 | 3 | 4,
    storyFraming: string,         // non-empty narrative framing for this mission
  }>,
}
```

## Behavioral contract

- Output `missions.length === 4` and each `order` matches an input task `order`.
- The flow MUST NOT return or modify `statement`/`taskId`; those stay authoritative from input.
- Narrative MUST remain appropriate for a learning context regardless of `theme`.
- On model failure/timeout, the flow surfaces an error the caller maps to a retryable message.

## Contract tests (write first — must FAIL before implementation)

1. Given valid 4-task input, output validates against `WeaveQuestOutput` with 4 aligned missions.
2. Output omitting a mission, or with a 5th, fails schema validation (flow rejects/retries).
3. Model stub returning altered task statements does not propagate into authoritative task data
   (caller composes narrative with DB task content, not model-supplied content).
4. A separately-gated live smoke test (real Gemini) returns schema-valid output (not run in CI by default — C2).
