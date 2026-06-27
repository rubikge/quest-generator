# Feature Specification: ACMP Task Catalog & Difficulty-Tiered Selection

**Feature Branch**: `002-acmp-task-catalog`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Tasks are stored in a database whose structure can fully hold tasks ported from https://acmp.ru/index.asp?main=alltasks, and the porting is executed. A task has a difficulty; when a learner chooses beginner / intermediate / expert, all available tasks are sorted by difficulty and split into three parts, and three tasks are chosen at random from the first / second / third part to embed into the quest. The UI displays a task completely — with illustrations if any (illustrations may need to be stored), input/output examples, and input/output data requirements. In the final stage the README must contain links to the original tasks (e.g., https://acmp.ru/index.asp?main=task&id_task=1)."

## Clarifications

### Session 2026-06-21

- Q: When a learner plays a coding mission, what is their submitted output graded against? → A: All ≥30 generated test inputs — the submission is correct only if the learner's output is correct for every generated test case.
- Q: How is the language for displaying task content determined, and what is supported? → A: Auto-detect from the language the learner wrote their theme/request in (fall back to English when detection is not confident).
- Q: How should the learner's submitted output be compared to the expected output? → A: Whitespace-tolerant — trim trailing whitespace per line and at the end; otherwise exact.
- Q: Before an imported task is marked ready, how is the stored reference solution's correctness validated? → A: It must reproduce ACMP's published worked example(s) AND be confirmed by a curator before the task goes live.

### Session 2026-06-21 (post-analysis)

- Q: Is this a "Python" product? → A: No. The platform and the tasks are language-agnostic — coding tasks may be solved in any language. The word "Python" is removed from the project and the constitution (the constitution's language mandate was removed in v1.1.0).
- Q: How are each task's solution algorithm and test-generation algorithm stored? → A: Both are stored as code **in the database** (per task) and executed in an isolated sandbox, so the catalog scales by adding rows. The platform still never executes the *learner's* code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Populate the task catalog from the ACMP source (Priority: P1)

A curator runs the catalog import so the application has a database of real coding tasks ported
from the ACMP problem set. The first import brings in a starter set of ten simple problems, some
of which include illustrative images. For each imported task the catalog stores everything needed
to present and grade it later: the problem statement (stored canonically in English), the input
and output format requirements, the worked input/output examples, any illustrations, the original
source link, the task's difficulty, plus the means to (A) determine the correct answer for any
valid input and (B) generate a battery of at least thirty varied test cases — including edge
cases — for that task. The database structure is designed so the *entire* ACMP catalog could be
ported into it later, not just the starter set.

**Why this priority**: Nothing downstream — selection, display, grading, or winning — can happen
without a populated, well-structured catalog. This is the foundational slice and the precondition
for every other story.

**Independent Test**: Run the import against the ACMP source and verify the catalog contains ten
tasks, each with an English statement, input/output format requirements, at least one worked
example, a recorded difficulty, and the original source link; verify the tasks that are supposed
to carry illustrations have their images stored and retrievable; verify each task can produce a
correct answer for a given input and can generate at least thirty distinct test cases covering
normal and edge conditions.

**Acceptance Scenarios**:

1. **Given** the import has not been run, **When** the curator executes the catalog import,
   **Then** ten simple tasks are stored in the database with all required fields populated.
2. **Given** a source task includes illustrations, **When** that task is imported, **Then** its
   images are stored and can be retrieved and displayed alongside the task.
3. **Given** a source task is written in Russian on ACMP, **When** it is imported, **Then** its
   canonical stored statement, format requirements, and examples are in English.
4. **Given** an imported task, **When** the catalog requests its tests, **Then** at least thirty
   distinct test cases are produced, covering typical inputs and edge cases.
5. **Given** an imported task and any valid input, **When** the catalog computes the expected
   answer, **Then** it returns the single correct output for that input.
6. **Given** an imported task, **When** the catalog is inspected, **Then** it records the task's
   ACMP difficulty value and the original task URL (e.g.,
   `https://acmp.ru/index.asp?main=task&id_task=1`).
7. **Given** a source task that cannot be fully parsed or translated, **When** the import runs,
   **Then** that task is skipped or flagged without corrupting the rest of the catalog.

---

### User Story 2 - Select tasks by chosen difficulty tier (Priority: P2)

When a learner chooses a level — beginner, intermediate, or expert — the application ranks all
available tasks by difficulty, divides them into three contiguous tiers (lowest, middle, and highest
third — as equal in size as possible), and chooses three tasks at random from the tier that matches
the chosen level.
Those three tasks are the coding content embedded into the learner's quest.

**Why this priority**: This turns the static catalog into a personalized, level-appropriate quest.
It depends on US1 (a populated catalog) and is what connects the catalog to the quest experience.

**Independent Test**: With the catalog populated, choose each level in turn and verify that three
tasks are selected, that all three come from the correct difficulty third for that level, and that
repeated selections at the same level can yield different combinations.

**Acceptance Scenarios**:

1. **Given** a populated catalog, **When** the learner chooses "beginner", **Then** three tasks
   are selected at random from the lowest-difficulty third of all available tasks.
2. **Given** a populated catalog, **When** the learner chooses "intermediate", **Then** three
   tasks are selected at random from the middle-difficulty third.
3. **Given** a populated catalog, **When** the learner chooses "expert", **Then** three tasks are
   selected at random from the highest-difficulty third.
4. **Given** the same level is chosen on two separate playthroughs, **When** selection runs,
   **Then** the chosen set of three tasks may differ between runs.
5. **Given** a difficulty third does not contain at least three tasks, **When** selection runs,
   **Then** the system reports that there are not enough tasks for that level rather than
   producing an incomplete quest.

---

### User Story 3 - Display a task completely in the learner's language (Priority: P3)

When the learner views a mission, the application presents the full task: the problem statement,
any illustrations, the worked input/output examples, and the explicit requirements for the input
data and the output data. The displayed content is presented in the language of the learner's
request (the canonical English source is rewritten/translated into that language as part of quest
generation), wrapped in the quest's themed narrative.

**Why this priority**: A learner can only solve a task they can fully read and understand. Complete,
correctly localized presentation — including images and exact I/O rules — is what makes the embedded
tasks playable.

**Independent Test**: Open a mission whose task has illustrations and examples, in a request made in
a non-English language, and verify the statement, illustrations, input/output examples, and
input/output requirements all render and are presented in the request's language.

**Acceptance Scenarios**:

1. **Given** a mission backed by an imported task, **When** the learner views it, **Then** the
   full statement, input/output examples, and input/output data requirements are shown.
2. **Given** the task has one or more illustrations, **When** the learner views the mission,
   **Then** the illustrations are displayed inline with the task.
3. **Given** the task has no illustrations, **When** the learner views the mission, **Then** the
   task displays cleanly without broken or empty image placeholders.
4. **Given** the learner's request was made in a particular language, **When** the task is shown,
   **Then** the statement, examples, and requirements are presented in that language.

---

### User Story 4 - Link to original tasks in the winning README (Priority: P4)

At the final stage of the quest, the deployment instructions require the learner's repository README
to contain links to the original source pages of the quest's tasks (for example
`https://acmp.ru/index.asp?main=task&id_task=1`). Verification of the winning README accounts for
these links.

**Why this priority**: Attribution back to the original problems closes the loop and reinforces the
"real tasks" promise, but it only matters once tasks can be imported, selected, and played.

**Independent Test**: Complete a quest, inspect the final-stage instructions, and verify they direct
the learner to include links to the exact original source pages of the quest's three tasks; provide
a README that includes those links and confirm it satisfies the requirement, and one that omits them
and confirm it does not.

**Acceptance Scenarios**:

1. **Given** the learner reaches the final stage, **When** they read the deployment instructions,
   **Then** the instructions reference links to the original source pages of the quest's tasks.
2. **Given** a README that contains links to all of the quest's original task pages, **When**
   verification runs, **Then** the link requirement is satisfied.
3. **Given** a README missing one or more of the original task links, **When** verification runs,
   **Then** the learner is told specifically which original-task links are missing.

---

### Edge Cases

- What happens when a source task cannot be parsed, translated, or its images cannot be fetched
  during import? The task is skipped or flagged and the rest of the import still succeeds.
- How are tier boundaries handled when the total number of tasks is not divisible by three? The
  split is defined deterministically so every task belongs to exactly one tier and no task is lost.
- What happens when a chosen difficulty tier has fewer than three tasks? The learner is informed
  there are not enough tasks for that level instead of receiving an incomplete quest.
- What happens when a task's generated test battery cannot reach thirty distinct cases? The task is
  flagged as not ready for use rather than being offered with too-weak validation.
- What happens when a stored solution or test-generation algorithm errors, loops, or exceeds its
  sandbox time/resource limits? Execution is aborted by the sandbox and the task is flagged not
  ready (during import) or the grading attempt fails safely with a clear message (at play time),
  never affecting other tasks, learners, or the platform.
- How does the system handle an illustration that is referenced but missing or corrupt? The task
  still displays its text content and the missing illustration is reported, not shown broken.
- What happens when translation into the learner's request language is unavailable? The learner
  still receives a readable task (falling back to the canonical English) rather than an error.
- How does the system avoid re-creating duplicate catalog entries when the import is run more than
  once? Re-importing the same source task updates or skips it rather than duplicating it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store coding tasks in a database whose structure can fully represent
  any task from the ACMP source listing (`https://acmp.ru/index.asp?main=alltasks`), so the entire
  catalog could be ported into it.
- **FR-002**: The system MUST execute an import that ports tasks from the ACMP source into the
  database; the first import MUST bring in a starter set of ten simple tasks, of which at least one
  includes illustrations.
- **FR-003**: For each imported task the system MUST store: a title, the problem statement, the
  input data requirements, the output data requirements, at least one worked input/output example,
  the task's difficulty, the original source URL, and any illustrations.
- **FR-004**: The system MUST store each task's canonical text content (statement, format
  requirements, examples) in English, translating from the source language during import.
- **FR-005**: The system MUST store and retrieve task illustrations so they can be displayed
  alongside the task; tasks without illustrations MUST be fully usable.
- **FR-006**: For each imported task the system MUST store, **in the database**, the reference
  solution algorithm as code that maps any valid input to the correct output. A task MUST be marked
  ready for use only after its stored reference solution reproduces the task's published worked
  example(s) AND a curator confirms it; tasks failing either check are flagged not ready, not
  offered in quests.
- **FR-007**: For each imported task the system MUST store, **in the database**, the
  test-generation algorithm as code that produces at least thirty distinct test cases covering
  positive, negative, and edge conditions (each case labeled by category).
- **FR-007a**: The system MUST execute the stored reference solution and test-generation algorithms
  in an isolated sandbox with time and resource limits, such that a task's code cannot affect other
  tasks, other learners, or the platform. An algorithm that fails to execute or exceeds its limits
  causes the task to be flagged not ready. (This concerns curated, stored task code only; the
  learner's own code is still never executed — output comparison only.)
- **FR-007b**: Storing tasks (including their solution and test-generation code) MUST be a pure data
  operation, so that adding arbitrarily many tasks requires no code deployment, and a stored task's
  solution and tests MUST be retrievable for execution at selection/grading time.
- **FR-008**: The system MUST record each task's **ACMP complexity score** (its difficulty value;
  "complexity" is the canonical term used throughout) and use it as the ranking key for
  difficulty-tier selection.
- **FR-009**: When a learner chooses a level, the system MUST rank all available tasks by difficulty
  and divide them into three contiguous tiers (lowest, middle, highest third — as equal in size as
  possible) deterministically, with every task assigned to exactly one tier.
- **FR-010**: The system MUST map beginner → lowest third, intermediate → middle third, and
  expert → highest third.
- **FR-011**: The system MUST select three tasks at random from the tier matching the chosen level
  to embed into the quest, and repeated selections at the same level MAY differ.
- **FR-012**: The system MUST inform the learner when the matching difficulty tier contains fewer
  than three tasks, rather than producing an incomplete quest.
- **FR-013**: The system MUST display a task completely: its statement, any illustrations, its
  input/output examples, and its input and output data requirements.
- **FR-014**: The system MUST present the displayed task content in a language auto-detected from
  the language the learner wrote their theme/request in, rewriting/translating the canonical English
  content as part of quest generation while preserving meaning and the exact input/output rules.
  When the request language cannot be confidently detected, the system MUST fall back to English.
- **FR-015**: The final-stage deployment instructions MUST direct the learner to include, in their
  repository README, links to the original source pages of the quest's tasks.
- **FR-016**: The system MUST verify that the winning README contains links to the original source
  pages of all of the quest's tasks, and MUST report specifically which links are missing when it
  does not.
- **FR-017**: The import MUST be safe to run more than once: re-importing a source task updates or
  skips it rather than creating duplicates.
- **FR-018**: The import MUST skip or flag any source task it cannot fully parse, translate, or
  whose required test battery or illustrations cannot be produced, without corrupting the rest of
  the catalog.
- **FR-019**: The system MUST provide the learner the task's full set of generated test inputs and
  MUST grade a submission as correct only when the learner's output is correct for every one of the
  task's ≥30 generated test cases; if any case is wrong, the submission is rejected.
- **FR-020**: When comparing a learner's output to the expected output, the system MUST be
  whitespace-tolerant — trimming trailing whitespace on each line and at the end of the output —
  while otherwise requiring an exact match.

### Key Entities *(include if feature involves data)*

- **Task (catalog entry)**: A real coding problem ported from ACMP. Holds the canonical English
  title and statement, input/output data requirements, worked input/output examples, illustrations
  (zero or more), the ACMP complexity score, the original source URL, a readiness flag, and — stored
  as code in the database — the reference solution algorithm and the test-generation algorithm
  (producing ≥30 labeled positive/negative/edge tests). Source of truth for quest content; both
  stored algorithms are executed only inside an isolated sandbox.
- **Illustration (image asset)**: A stored image belonging to a task, retrievable for display
  alongside the task's text.
- **Test Case**: A single (input, expected-output) pair produced by a task's test-generation
  algorithm; a task has at least thirty, spanning typical and edge conditions.
- **Difficulty Tier**: The classification (lowest / middle / highest third) derived by ranking all
  available tasks by their ACMP complexity and splitting into three contiguous tiers (as equal in
  size as possible); maps to the beginner / intermediate / expert levels.
- **Quest Task Selection**: The set of three tasks chosen at random from the tier matching the
  learner's chosen level, embedded into a quest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the first import, the catalog contains ten tasks, each with a complete set of
  required fields (statement, input/output requirements, ≥1 example, difficulty, source URL),
  100% of the time.
- **SC-002**: At least one imported task carries one or more illustrations that can be retrieved
  and displayed.
- **SC-003**: Every imported task can produce at least thirty distinct test cases covering typical
  and edge inputs, and returns the correct output for each test input, 100% of the time.
- **SC-004**: For each level chosen, selection returns exactly three tasks, all from the correct
  difficulty third, 100% of the time when the tier has enough tasks.
- **SC-005**: When a tier has fewer than three tasks, the learner is informed and no incomplete
  quest is produced, 100% of the time.
- **SC-006**: When a learner views a task, the statement, available illustrations, input/output
  examples, and input/output requirements are all present and shown in the request's language.
- **SC-007**: A winning README is accepted only when it links to the original source pages of all
  of the quest's tasks; missing links are reported specifically, 100% of the time.
- **SC-008**: Running the import twice does not create duplicate catalog entries.

## Assumptions

- This feature extends the existing themed quest experience (feature `001-themed-quest-generation`),
  in which a quest comprises three graded coding missions plus a final GitHub deployment mission;
  the three coding missions are the tasks selected here. README verification already requires the
  quest's task identifiers; this feature adds the original-source links to that final stage.
- The starter import is intentionally limited to ten simple tasks (some with illustrations) so that
  a correct reference solution and a robust test battery can be authored/validated per task; the
  database structure, however, is built to hold the full ACMP catalog for later porting.
- Tasks are stored canonically in English (translated from the ACMP source during import). At quest
  generation, the task content is rewritten into the language auto-detected from the learner's
  theme/request (English fallback) and wrapped in the chosen theme; identical wording across runs is
  not required.
- Grading runs the task's database-stored reference solution (in an isolated sandbox) to compute the
  correct outputs for the task's ≥30 generated test cases; the learner is provided those inputs and
  is graded correct only if their output matches for all of them (whitespace-tolerant comparison per
  FR-020). The platform still does not execute the learner's own code (output comparison only),
  consistent with feature 001 — only curated, stored task algorithms run, and only sandboxed.
- The catalog is data-driven: a task — including its solution and test-generation code — is added by
  writing a database record, requiring no code deployment, so the catalog scales to arbitrarily many
  tasks (this supersedes any earlier notion of code-resident, per-task solver functions).
- Difficulty ranking uses ACMP's own per-task complexity value; ties are broken deterministically so
  the three-way split is stable and every task lands in exactly one tier.
- The three-way split is recomputed over all available tasks at selection time, so adding tasks later
  re-balances the tiers automatically.
- Illustrations are stored by the application (not hot-linked from the source at display time) so the
  quest remains self-contained and resilient to source changes.
- The original source URL pattern is `https://acmp.ru/index.asp?main=task&id_task=<id>`; these are the
  links required in the winning README.
