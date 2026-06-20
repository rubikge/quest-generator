<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-themed-quest-generation/plan.md`

Active feature: Themed Python Quest Generation (branch `001-themed-quest-generation`).
Stack: Next.js (App Router) + React 19 + TypeScript, Genkit (Gemini 2.5 Flash),
Firebase App Hosting + Cloud Firestore, Tailwind/shadcn. Domain logic lives in
framework-agnostic libraries under `app/src/lib/quest/` with thin CLIs; grading is
output-comparison (no learner-code execution); win = GitHub README lists task ids.
<!-- SPECKIT END -->
