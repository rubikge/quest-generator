# Feature Specification: Themed Python Quest Generation

**Feature Branch**: `001-themed-quest-generation`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Build a web application where, at startup, a user chooses a universe/theme and their Python level. The application then generates four tasks and unites them with a common plot. It selects these four tasks from a database of real tasks, weaves them into a single storyline, and creates a quest. At the end of the quest, the user must deploy everything to GitHub to win. Infrastructure: Google Cloud and Firebase. Generation via Genkit."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a themed, level-appropriate quest (Priority: P1)

A learner opens the application and is asked to choose a universe/theme (e.g., an alien
invasion, a fantasy realm, a heist) and to declare their Python skill level. After
confirming these choices, the application assembles a quest of four coding tasks pulled
from its task database, matched to the chosen level, and weaves them into a single
continuous storyline framed by the chosen theme. The learner sees the quest introduction
and the first mission.

**Why this priority**: This is the core value proposition and the entry point to every
other interaction. Without theme + level selection producing a coherent four-task quest,
nothing else in the product can happen. It is the minimum viable slice that delivers a
playable, personalized experience.

**Independent Test**: Select any theme and any level, confirm, and verify that a quest is
produced containing exactly four tasks, a unifying narrative introduction, and per-task
story framing — and that the tasks correspond to real entries from the task database at
the selected difficulty.

**Acceptance Scenarios**:

1. **Given** the learner is on the startup screen, **When** they choose a theme and a
   Python level and confirm, **Then** the system produces a quest containing exactly four
   tasks tied together by one storyline themed to their selection.
2. **Given** a learner selected "Beginner", **When** the quest is generated, **Then** all
   four tasks are drawn from the database at a difficulty appropriate to "Beginner".
3. **Given** the quest has been generated, **When** the learner views it, **Then** they see
   a narrative introduction and the first mission's story framing, description, and inputs.
4. **Given** the same theme and level are selected again, **When** a new quest is generated,
   **Then** the learner can receive a fresh storyline (generation is not required to be
   identical to a prior run).

---

### User Story 2 - Solve tasks and advance through the storyline (Priority: P2)

The learner reads the current mission's narrative framing, problem description, and its
generated input data, works out the solution, and submits their answer. The application
verifies the submission; on success it advances the storyline to the next mission, and on
failure it explains that the answer was rejected and lets the learner retry. Progress
through the four missions is visible at all times.

**Why this priority**: Solving and progressing is what makes the quest a game rather than a
static page. It depends on US1 (a quest must exist) but delivers the main loop of engagement.

**Independent Test**: With a generated quest, submit a correct answer to mission 1 and
confirm the storyline advances to mission 2; submit an incorrect answer and confirm a clear
rejection message with the ability to retry.

**Acceptance Scenarios**:

1. **Given** the learner is on a mission with generated input, **When** they submit a
   correct answer, **Then** the system confirms success and unlocks the next mission.
2. **Given** the learner is on a mission, **When** they submit an incorrect answer, **Then**
   the system rejects it with an understandable message and allows another attempt.
3. **Given** the learner has completed some missions, **When** they view the quest, **Then**
   a progress indicator reflects how many of the four missions are solved.
4. **Given** the learner is on a mission, **When** they request the task input, **Then** the
   system provides input data for that task.

---

### User Story 3 - Win by deploying the completed work to GitHub (Priority: P3)

After solving the first three missions, the learner reaches a final mission whose objective
is to deploy their completed work to a public GitHub repository. The learner submits a link
to their repository, and the application verifies that the deployment meets the win
condition. When verification passes, the learner is declared the winner and the storyline
concludes; otherwise the learner receives guidance on what is missing.

**Why this priority**: The GitHub deployment is the defined "win" and the capstone of the
experience, but it only matters once the earlier missions can be played end to end. It is
the final increment that completes the full journey.

**Independent Test**: Provide a public GitHub repository link that satisfies the win
condition and confirm the learner is declared the winner; provide a link that does not
satisfy it and confirm a clear, actionable failure message.

**Acceptance Scenarios**:

1. **Given** the learner has reached the final mission, **When** they submit a valid public
   GitHub repository link that meets the win condition, **Then** the system declares the
   quest complete and the learner the winner.
2. **Given** the learner submits a malformed or non-GitHub link, **When** verification runs,
   **Then** the system rejects it with a message explaining the expected format.
3. **Given** the learner submits a repository that does not yet meet the win condition,
   **When** verification runs, **Then** the system explains specifically what is missing.

---

### Edge Cases

- What happens when the task database lacks enough tasks at the selected level to fill four
  missions? The system MUST inform the learner rather than producing an incomplete quest.
- How does the system handle quest generation failing or timing out? The learner MUST get a
  clear error and the ability to retry without losing their theme/level choices.
- What happens when a referenced GitHub repository is private, deleted, or unreachable
  during final verification? The system MUST report that it could not access the repository.
- How does the system handle a learner refreshing or returning later mid-quest? Their
  progress and generated quest SHOULD be preserved for the session.
- What happens when a learner submits an empty answer or an answer in an unexpected format?
  The system MUST reject it gracefully without crashing.
- How does the system behave if the chosen theme is unusual or potentially inappropriate?
  The generated narrative MUST remain usable and appropriate for a learning context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a learner choose a universe/theme at startup before a quest is
  generated.
- **FR-002**: System MUST let a learner select their Python skill level at startup before a
  quest is generated.
- **FR-003**: System MUST generate a quest consisting of exactly four tasks per playthrough.
- **FR-004**: System MUST select the quest's tasks from a database of real, pre-authored
  coding tasks rather than inventing task logic at runtime.
- **FR-005**: System MUST match the selected tasks to the learner's chosen Python level.
- **FR-006**: System MUST weave the four selected tasks into a single, coherent storyline
  framed by the chosen theme, including an overall narrative and per-task story framing.
- **FR-007**: System MUST present each mission's story framing, problem description, and the
  data needed to attempt it.
- **FR-008**: System MUST provide generated input data for each task so the learner can run
  their own solution against it and produce an output to submit.
- **FR-009**: System MUST verify a learner's submission for each of the first three missions
  by comparing the learner's submitted output to the known-correct output for that task's
  generated input, indicating success or failure. The system does not execute learner code.
- **FR-010**: System MUST advance the storyline to the next mission only after the current
  mission is solved.
- **FR-011**: System MUST allow unlimited retries on a mission after an incorrect submission.
- **FR-012**: System MUST display the learner's progress through the four missions.
- **FR-013**: System MUST present a final mission whose objective is deploying the completed
  work to a public GitHub repository.
- **FR-014**: System MUST verify the learner's public GitHub repository by confirming its
  README contains the task identifiers of the quest's missions; this is the win condition.
- **FR-015**: System MUST declare the learner the winner and conclude the storyline when the
  final verification passes.
- **FR-016**: System MUST provide clear, actionable feedback when any submission or
  verification fails (wrong answer, malformed link, unreachable repository, missing content).
- **FR-017**: System MUST preserve a learner's quest and progress for the duration of their
  browser session (surviving refresh) without requiring a login. Cross-device persistence and
  authenticated accounts are out of scope for the first version.
- **FR-018**: System MUST handle insufficient task availability for a chosen level by
  informing the learner instead of generating an incomplete quest.

### Key Entities *(include if feature involves data)*

- **Theme/Universe**: A thematic setting the learner chooses; drives the tone and framing of
  the generated narrative.
- **Python Level**: The learner's declared skill level; constrains which tasks are eligible
  for the quest.
- **Task (Database Entry)**: A real, pre-authored coding task with a title, problem
  description, a difficulty/level tag, a way to produce its input data, and a way to
  determine a correct outcome. The source of truth for quest content.
- **Quest**: A generated playthrough binding exactly four tasks, an overarching storyline,
  per-task narrative framing, the chosen theme, and the chosen level.
- **Mission**: A single step within a quest — one task wrapped in its story framing and
  presented to the learner in sequence (the fourth being the GitHub deployment).
- **Submission**: A learner's attempt at a mission, evaluated as success or failure.
- **Progress**: The learner's state within a quest (which missions are solved, current
  mission, win status).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can go from opening the application to viewing a fully generated,
  themed four-task quest in under 60 seconds.
- **SC-002**: Every generated quest contains exactly four tasks, all drawn from the task
  database and all matching the selected level, 100% of the time.
- **SC-003**: Every generated quest presents one coherent storyline connecting all four
  missions (verified by review) in at least 95% of generations.
- **SC-004**: A learner who solves all four missions, including the GitHub deployment, is
  correctly declared the winner 100% of the time the win condition is genuinely met.
- **SC-005**: At least 90% of learners who start a quest understand, without external help,
  what each mission asks and how to submit their answer (measured via task-completion and
  drop-off rates).
- **SC-006**: When a submission or verification fails, the learner receives a specific reason
  100% of the time (no generic or silent failures).

## Assumptions

- The application is a web application targeting modern desktop and mobile browsers.
- A reference prototype exists in the `kodolom/` folder ("Invasion Codebreaker"): a
  single-theme, four-mission experience where missions 1–3 compare a submitted answer to a
  computed correct output and mission 4 verifies a GitHub repository's README. This feature
  generalizes that prototype to support theme and level selection plus dynamic narrative
  generation; the prototype's mechanics inform reasonable defaults.
- The required infrastructure is Google Cloud and Firebase, and AI-driven narrative
  generation is performed via Genkit. These are fixed delivery constraints from the
  requester (implementation detail; not a user-facing requirement).
- A baseline set of Python levels is assumed to be a small discrete scale (e.g., Beginner /
  Intermediate / Advanced) unless specified otherwise.
- Quest narrative generation may produce different storylines on repeated runs with the same
  theme and level; identical reproducibility is not required.
- Tasks in the database are authored and maintained outside this feature's primary flow;
  curating the task database is assumed to be an existing/adjacent capability.
- Learners play anonymously within a browser session (no login); progress survives refresh
  but not a new device/browser. Durable cross-device accounts are out of scope for v1.
  *(Resolved via clarification.)*
- Mission solutions are graded by output comparison: the app supplies generated input, the
  learner runs their own Python, and submits the resulting output for comparison against the
  known-correct output. The platform does not execute learner code. *(Resolved via clarification.)*
- The GitHub win condition is satisfied when the learner's public repository's README
  contains the task identifiers for the quest's missions. *(Resolved via clarification.)*
