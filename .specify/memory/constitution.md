<!--
SYNC IMPACT REPORT
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: Initial ratification. The constitution moved from an unfilled
  placeholder template to a fully defined set of nine governing articles.
  Per semantic versioning this is the first stable release (MAJOR.MINOR.PATCH = 1.0.0).

Principles defined (9 articles):
  - I.   Library-First (new)
  - II.  CLI Interface Mandate (new)
  - III. Test-First Imperative — NON-NEGOTIABLE (new)
  - IV.  Integration Testing (new)
  - V.   Observability (new)
  - VI.  Versioning & Breaking Changes (new)
  - VII. Simplicity (new)
  - VIII.Anti-Abstraction (new)
  - IX.  Integration-First Testing (new)

Added sections:
  - Core Principles (Articles I–IX)
  - Additional Constraints (Technology & Quality Standards)
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none (template placeholders replaced).

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check populated with
       Phase -1 Gates (Simplicity / Anti-Abstraction / Integration-First).
  - ✅ .specify/templates/tasks-template.md — Test-First note aligned with
       Article III (TDD is mandatory, not optional).
  - ✅ .specify/templates/spec-template.md — reviewed; no change required
       (constitution governs implementation discipline, not spec structure).

Follow-up TODOs: none. RATIFICATION_DATE set to adoption date 2026-06-20.
-->

# Python Quest Generator Constitution

## Core Principles

### I. Library-First

Every feature in Python Quest Generator MUST begin its existence as a standalone library.
No feature shall be implemented directly within application code without first being
abstracted into a reusable library component.

- Every library MUST be self-contained, independently testable, and documented.
- Each library MUST declare a clear, single purpose. Organizational-only libraries
  (libraries that exist solely to group unrelated code) are PROHIBITED.
- Libraries MUST minimize dependencies and expose clear, stable boundaries.

**Rationale**: Forcing modular design from the outset produces reusable, independently
verifiable components rather than monolithic application code, and keeps generated
implementations consistent with their specifications.

### II. CLI Interface Mandate

Every library MUST expose its functionality through a command-line interface.

All CLI interfaces MUST:

- Accept text as input (via stdin, arguments, or files).
- Produce text as output (via stdout); errors MUST go to stderr.
- Support JSON for structured data exchange, in addition to human-readable output.

**Rationale**: Text-based interfaces enforce observability and testability. Functionality
cannot hide inside opaque classes—everything is accessible and verifiable through text I/O.

### III. Test-First Imperative (NON-NEGOTIABLE)

This is NON-NEGOTIABLE: all implementation MUST follow strict Test-Driven Development.
No implementation code shall be written before:

1. Unit tests are written.
2. Tests are validated and approved by the user.
3. Tests are confirmed to FAIL (Red phase).

The Red-Green-Refactor cycle MUST be strictly enforced: write a failing test, make the
minimal change to pass, then refactor while keeping the suite green.

**Rationale**: Defining behavior through approved, failing tests before implementation
inverts speculative code generation into specification-driven construction, guaranteeing
that every line of code answers to a verified expectation.

### IV. Integration Testing

Integration tests MUST be written for the areas where contracts and boundaries are most
likely to break:

- New library contract tests.
- Any change to an existing contract.
- Inter-service or inter-library communication.
- Shared schemas and data formats.

**Rationale**: Unit tests alone cannot catch boundary mismatches. Targeted integration
coverage protects the seams where independently developed libraries meet.

### V. Observability

Systems MUST be debuggable through their text-based interfaces and structured output.

- Structured logging is REQUIRED for all libraries and services.
- Text I/O (Article II) MUST be preserved so behavior can be inspected and reproduced.
- Errors MUST be reported with enough context to diagnose failures without a debugger.

**Rationale**: Observability is a design property, not an afterthought; text I/O plus
structured logging makes every component inspectable in production and in tests.

### VI. Versioning & Breaking Changes

All libraries MUST adopt a `MAJOR.MINOR.BUILD` version scheme.

- Breaking changes MUST increment MAJOR and ship with a documented migration path.
- New backward-compatible functionality increments MINOR; fixes increment BUILD.
- Consumers MUST never be silently broken by an upstream change.

**Rationale**: Explicit versioning makes compatibility contracts visible and forces
deliberate, documented handling of breaking changes.

### VII. Simplicity

Implementations MUST start simple and apply YAGNI ("You Aren't Gonna Need It") principles.

- Initial implementation MUST use a MAXIMUM of 3 projects. Additional projects REQUIRE
  documented justification in the plan's Complexity Tracking section.
- Future-proofing and speculative generality are PROHIBITED until a concrete need exists.

**Rationale**: Over-engineering is the default failure mode of generated code; a hard
project ceiling and an explicit no-future-proofing rule keep complexity earned, not assumed.

### VIII. Anti-Abstraction

Frameworks and libraries MUST be used directly rather than wrapped behind unnecessary
abstraction layers.

- Use framework features directly; do NOT introduce wrappers that merely re-expose them.
- Prefer a SINGLE model representation; do NOT maintain parallel DTO/entity/model copies
  unless a documented need justifies the duplication.

**Rationale**: Each abstraction layer adds cost and obscures behavior. Trusting the
framework keeps the code closer to the platform and easier to reason about.

### IX. Integration-First Testing

Tests MUST use realistic environments and contracts MUST be defined before implementation.

- Prefer real databases over mocks.
- Use actual service instances over stubs.
- Contract tests are MANDATORY before implementation begins.

**Rationale**: Code that passes only against mocks proves nothing about production
behavior; testing against realistic dependencies ensures implementations work in practice.

## Additional Constraints (Technology & Quality Standards)

- The primary implementation language is Python; libraries MUST target a supported,
  documented Python version declared in the implementation plan.
- Every library MUST ship with documentation describing its purpose, CLI usage, and
  supported input/output formats (including the JSON schema where applicable).
- Structured logging and machine-readable (JSON) output are REQUIRED wherever a library
  emits diagnostic or result data.
- Dependencies MUST be pinned and justified; transitive complexity counts against the
  Simplicity gate (Article VII).

## Development Workflow & Quality Gates

- All work proceeds through the Spec-Driven Development flow: specify → plan → tasks →
  implement, with the Constitution Check gate enforced in the planning phase.
- The plan template's Phase -1 Gates (Simplicity, Anti-Abstraction, Integration-First)
  MUST pass, or each violation MUST be recorded in the Complexity Tracking table with a
  justification and the rejected simpler alternative.
- Test-First (Article III) is a release gate: implementation tasks MUST NOT begin until
  the corresponding tests exist, are approved, and are observed to fail.
- All pull requests and reviews MUST verify compliance with these articles. Reviewers MUST
  block changes that introduce unjustified complexity, untested code, or wrapped frameworks.

## Governance

This constitution supersedes all other development practices. When any practice conflicts
with an article herein, the article prevails.

- **Amendments**: Changes to this constitution MUST be proposed in writing, documented with
  rationale, approved by the project maintainers, and accompanied by a migration plan for
  any affected artifacts or workflows.
- **Versioning policy**: This document follows semantic versioning. MAJOR increments cover
  backward-incompatible governance changes or principle removals/redefinitions; MINOR covers
  newly added or materially expanded principles/sections; PATCH covers clarifications and
  non-semantic refinements.
- **Compliance review**: Every plan, task set, and pull request MUST be checked against these
  articles. Complexity MUST be justified in the plan's Complexity Tracking section. Use the
  Spec Kit templates and the agent guidance file (`CLAUDE.md`) for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-20 | **Last Amended**: 2026-06-20
