# Contract: ACMP Import Pipeline (`lib/quest/acmp-import` + CLI)

Offline curator tool that ports tasks from ACMP into the `tasks` catalog. Library functions are
pure/injectable (fetcher passed in) so parsing and upsert are tested without live network.

## Stages & function contracts

```text
fetchTaskPage(id, fetch) -> { id, html }            # HTTP GET index.asp?main=task&id_task=<id>
parseTaskPage(html, id)  -> ParsedTask              # pure; tested vs saved real HTML fixtures
translateTask(parsed, ai) -> EnglishTask            # Genkit; title/statement/io → English (R3)
downloadImages(parsed, fetch, fsRoot) -> string[]   # save to public/tasks/<id>/; return rel paths
authorAlgorithms(parsed) -> { runtime, solverSource, testGenSource }  # AI-assisted/curated code (R2)
validateTask(task, sandbox) -> { ok, reasons[] }    # run code in sandbox: solver reproduces every
                                                    #   example AND generator yields >=30 labeled cases
upsertTask(task, db) -> 'created' | 'updated'        # doc id = taskId; ready:false (idempotent, R7)
markReady(taskId, db) -> void                        # curator gate: only after validateTask ok (R7/FR-006)
```

`task` written to the DB carries `solverSource`/`testGenSource`/`runtime` as data (R2); they are
never executed except via the `sandbox` library (see `sandbox-runner.md`).

`ParsedTask` fields (pre-translation): `{ taskId, sourceUrl, titleRu, statementRu, inputFormatRu,
outputFormatRu, examples: {input,output}[], imageUrls: string[], complexity: number }`.

## CLI (Article II)

```text
npm run import:acmp -- --ids 892,757,907,...        # import specific tasks (the curated 10)
npm run import:acmp -- --ids 892 --dry-run --json   # parse+translate, print JSON, no writes
npm run import:acmp -- --mark-ready 892             # curator confirmation after review
```
Output: JSON summary `{ imported, skipped, flagged: [{taskId, reason}] }` to stdout; errors to stderr.

## Contract tests (write first, must FAIL)

- `parseTaskPage` on a saved real ACMP page extracts taskId, title, statement, input/output format,
  ≥1 example (input+output), complexity (number), and image URLs.
- A page missing a parseable examples table is **flagged**, not crashed (FR-018); other tasks proceed.
- `examples` are captured **verbatim** (no translation applied to example cells) (R3).
- `translateTask` output preserves all numbers/identifiers present in the source (guard prompt).
- `downloadImages` writes files under `public/tasks/<taskId>/` and returns matching relative paths;
  a task with no images yields `[]`.
- `upsertTask` uses `taskId` as the doc id; importing the same task twice yields one document
  (`created` then `updated`) — no duplicate (FR-017). *(emulator)*
- A task is written `ready:false`; it cannot be selected until `markReady` flips it (R7).
- `validateTask` (via the real sandbox) passes only when the stored `solverSource` reproduces every
  parsed `example` AND `testGenSource` yields ≥30 cases incl. ≥1 each of positive/negative/edge;
  `markReady` refuses if `validateTask` fails (FR-006/FR-007).
- A stored algorithm that times out / errors in the sandbox flags the task not ready (FR-007a).
- The first real run imports the curated 10, ≥1 of which has a non-empty `images[]` (FR-002/SC-002).
