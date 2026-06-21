import { QuestSchema, type Level, type Mission, type Quest, type Task } from './model/index';
import { CODING_MISSION_COUNT } from './task-selection/index';

/** Narrative produced by the weaveQuest flow: an overall intro plus per-mission framings. */
export interface QuestNarrative {
  questIntro: string;
  framings: Record<1 | 2 | 3 | 4, string>;
}

export interface AssembleQuestArgs {
  id: string;
  theme: string;
  level: Level;
  createdAt: string; // ISO timestamp, injected (no Date.now in pure logic)
  codingTasks: Task[]; // exactly CODING_MISSION_COUNT, in order
  narrative: QuestNarrative;
}

/** Human-readable objective for the final deployment mission (research R5 / FR-013). */
export function buildDeploymentStatement(taskIds: string[]): string {
  return (
    'Deploy your completed work to a public GitHub repository, then update its README.md to ' +
    `include your solved task ids: ${taskIds.join(', ')}. Submit the repository link to finish.`
  );
}

/**
 * Compose a validated Quest from selected coding tasks (authoritative) and the woven
 * narrative (framing only). The model never alters task content — task statements/ids
 * come straight from the catalog; only `questIntro`/`storyFraming` come from the flow.
 */
export function assembleQuest(args: AssembleQuestArgs): Quest {
  if (args.codingTasks.length !== CODING_MISSION_COUNT) {
    throw new Error(`assembleQuest requires exactly ${CODING_MISSION_COUNT} coding tasks`);
  }

  const codingMissions: Mission[] = args.codingTasks.map((task, i) => {
    const order = (i + 1) as 1 | 2 | 3;
    return {
      order,
      kind: 'coding',
      taskId: task.taskId,
      solverKey: task.solverKey,
      title: task.title,
      statement: task.statement,
      storyFraming: args.narrative.framings[order],
    };
  });

  const deploymentMission: Mission = {
    order: 4,
    kind: 'deployment',
    taskId: null,
    solverKey: null,
    title: 'Final report',
    statement: buildDeploymentStatement(args.codingTasks.map((t) => t.taskId)),
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
