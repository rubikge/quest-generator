import { QuestSchema, type Level, type Mission, type Quest, type Task } from './model/index';
import { CODING_MISSION_COUNT } from './task-selection/index';

/** Localized display prose for one coding mission (model output; presentation only, never grading). */
export interface MissionLocalization {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
}

/**
 * Narrative produced by the weaveQuest flow: the auto-detected language, an overall themed intro,
 * per-mission story framings, and (US3) the per-coding-mission localized display prose. The
 * localized prose is OPTIONAL — when absent, assembly falls back to the catalog's canonical English
 * task fields (so a framing-only narrative still produces a valid, English quest).
 */
export interface QuestNarrative {
  /** BCP-47-ish language auto-detected from the theme; 'en' fallback. */
  detectedLanguage?: string;
  questIntro: string;
  framings: Record<1 | 2 | 3 | 4, string>;
  /** Localized title/statement/inputFormat/outputFormat per coding mission order (1..3). */
  localized?: Partial<Record<1 | 2 | 3, MissionLocalization>>;
}

export interface AssembleQuestArgs {
  id: string;
  theme: string;
  level: Level;
  createdAt: string; // ISO timestamp, injected (no Date.now in pure logic)
  codingTasks: Task[]; // exactly CODING_MISSION_COUNT, in order
  narrative: QuestNarrative;
}

/**
 * Human-readable objective for the final deployment mission (FR-013/FR-015). The README must list
 * the solved task ids AND link each task's original ACMP source page.
 */
export function buildDeploymentStatement(tasks: Array<{ taskId: string; sourceUrl: string }>): string {
  const ids = tasks.map((t) => t.taskId).join(', ');
  const links = tasks.map((t) => t.sourceUrl).join('\n');
  return (
    'Deploy your completed work to a public GitHub repository, then update its README.md to ' +
    `include your solved task ids: ${ids}, and a link to each task's original page:\n${links}\n` +
    'Submit the repository link to finish.'
  );
}

/**
 * Compose a validated Quest from selected coding tasks (authoritative) and the woven
 * narrative (framing only). The model never alters task content — task statements, examples,
 * images, ids, and source URLs come straight from the catalog; only `questIntro`/`storyFraming`
 * come from the flow.
 */
export function assembleQuest(args: AssembleQuestArgs): Quest {
  if (args.codingTasks.length !== CODING_MISSION_COUNT) {
    throw new Error(`assembleQuest requires exactly ${CODING_MISSION_COUNT} coding tasks`);
  }

  const codingMissions: Mission[] = args.codingTasks.map((task, i) => {
    const order = (i + 1) as 1 | 2 | 3;
    // Localized display prose (US3) overrides the canonical English ONLY for presentation; the
    // catalog remains authoritative for examples/images/sourceUrl/taskId and for grading.
    const loc = args.narrative.localized?.[order];
    return {
      order,
      kind: 'coding',
      taskId: task.taskId,
      sourceUrl: task.sourceUrl,
      title: loc?.title ?? task.title,
      statement: loc?.statement ?? task.statement,
      inputFormat: loc?.inputFormat ?? task.inputFormat,
      outputFormat: loc?.outputFormat ?? task.outputFormat,
      examples: task.examples,
      images: task.images,
      storyFraming: args.narrative.framings[order],
    };
  });

  const deploymentMission: Mission = {
    order: 4,
    kind: 'deployment',
    taskId: null,
    sourceUrl: null,
    title: 'Final report',
    statement: buildDeploymentStatement(args.codingTasks.map((t) => ({ taskId: t.taskId, sourceUrl: t.sourceUrl }))),
    inputFormat: null,
    outputFormat: null,
    examples: null,
    images: [],
    storyFraming: args.narrative.framings[4],
  };

  const quest: Quest = {
    id: args.id,
    theme: args.theme,
    level: args.level,
    questIntro: args.narrative.questIntro,
    missions: [...codingMissions, deploymentMission],
    createdAt: args.createdAt,
  };

  return QuestSchema.parse(quest);
}
