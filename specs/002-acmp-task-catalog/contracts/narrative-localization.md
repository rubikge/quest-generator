# Contract: Narrative Weaving + Localization (`ai/flows/weave-quest`)

Extends the feature-001 `weaveQuest` Genkit flow to (a) auto-detect the theme's language and
(b) localize the task display content into that language, in addition to weaving the storyline.
One structured model call keeps cross-mission coherence and the 60s budget (R1/R5/Q2).

## Flow I/O (Zod-validated)

```text
Input:  {
  theme: string,
  level: 'beginner'|'intermediate'|'expert',
  tasks: Array<{                       # 3 coding tasks, canonical English
    taskId, sourceUrl, title, statement, inputFormat, outputFormat,
    examples: {input,output}[], images: string[]
  }>
}
Output: {
  detectedLanguage: string,            # BCP-47-ish; 'en' fallback when not confident
  questIntro: string,                  # localized + themed
  missions: Array<{                    # 3 entries, aligned to input order
    title, statement, inputFormat, outputFormat, storyFraming   # localized + themed
  }>
}
```

The flow returns localized **prose**; `examples`, `images`, `taskId`, `sourceUrl`, and the
authoritative grading all come from the catalog (and the sandboxed stored solver) — the model never
supplies them. Server code assembles the final `Mission` objects by combining the flow output with
the catalog `examples`/`images`/`sourceUrl`/`taskId` data (the grader later loads `solverSource` by
`taskId`).

## Rules

- `detectedLanguage` is inferred from `theme`; when detection is not confident, output `en` and
  produce English content (FR-014 fallback).
- Localized `statement`/`inputFormat`/`outputFormat` MUST preserve every number, identifier,
  constraint, and the exact I/O rules (grading stays solver-driven; prose is presentation only).
- Content MUST remain appropriate for a learning context (carryover guardrail).

## Contract tests (write first, must FAIL)

- Output validates against the Zod schema; `missions` length === input `tasks` length.
- A Russian-language theme yields `detectedLanguage` ≈ `ru` and non-English `statement`s (stubbed
  model in CI returns a schema-valid localized fixture; gated live smoke test for the real path).
- An ambiguous/short theme yields `detectedLanguage: 'en'` and English content.
- The flow does NOT emit `examples`/`taskId`/`sourceUrl` (those are assembled from the catalog).
