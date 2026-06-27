<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/002-acmp-task-catalog/plan.md`

Active feature: ACMP Task Catalog & Difficulty-Tiered Selection (branch `002-acmp-task-catalog`).
Stack: Next.js (App Router) + React 19 + TypeScript, Genkit (Gemini 2.5 Flash, used for narrative
weaving + translation), Firebase App Hosting + Cloud Firestore, `isolated-vm` sandbox, Tailwind/shadcn.
Domain logic lives in framework-agnostic libraries under `app/src/lib/quest/` with thin CLIs. The
product is LANGUAGE-AGNOSTIC ("Python" is removed from the project; tasks may be solved in any
language; constitution v1.1.0 dropped the Python mandate). This feature ports real tasks from ACMP
into the catalog (English-canonical statement, I/O format, examples, illustrations as static assets
under `app/public/tasks/<id>/`, ACMP complexity, sourceUrl, `ready` gate). Each task stores its
reference solution AND its ≥30-case (labeled positive/negative/edge) test generator AS CODE in the
DB (`solverSource`/`testGenSource`/`runtime`); these run ONLY in an in-process V8 isolate sandbox
(`lib/quest/sandbox`) with time/memory limits — the catalog is data-driven (add a task = add a row).
Selection ranks ready tasks by complexity, splits into thirds, randomly picks 3 (beginner→lowest,
intermediate→middle, expert→highest). Grading runs the task's sandboxed solver over the full battery;
whole-output, whitespace-tolerant comparison (the LEARNER's code is never executed). Display is
localized to the theme's auto-detected language (English fallback). Win = GitHub README lists task
ids AND links each original ACMP page. Background: feature `001-themed-quest-generation` established
the quest/flow/store/UI this extends.
<!-- SPECKIT END -->
