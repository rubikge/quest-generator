import { describe, it, expect } from 'vitest';
import {
  TaskSchema,
  ThemeSchema,
  QuestSchema,
  ProgressSchema,
  SessionSchema,
  LevelSchema,
  LEVELS,
  type Quest,
  type Task,
} from '../../src/lib/quest/model/index.js';

const validTask = (overrides: Partial<Task> = {}): Task => ({
  taskId: '892',
  sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=892',
  title: 'Seasonal analysis',
  statement: 'Given month numbers, print the season.',
  inputFormat: 'Each line has one integer.',
  outputFormat: 'One season per line.',
  examples: [{ input: '1', output: 'Winter' }],
  images: [],
  complexity: 12,
  runtime: 'js',
  solverSource: 'function solve(i){ return i; }',
  testGenSource: 'function generateTests(){ return [{input:"1",kind:"edge"}]; }',
  ready: true,
  ...overrides,
});

const codingMission = (order: 1 | 2 | 3) => ({
  order,
  kind: 'coding' as const,
  taskId: `id-${order}`,
  sourceUrl: `https://acmp.ru/index.asp?main=task&id_task=${order}`,
  title: `Mission ${order}`,
  statement: 'Solve it.',
  inputFormat: 'in',
  outputFormat: 'out',
  examples: [{ input: 'a', output: 'b' }],
  images: [],
  storyFraming: 'Once upon a time...',
});

const deploymentMission = () => ({
  order: 4 as const,
  kind: 'deployment' as const,
  taskId: null,
  sourceUrl: null,
  title: 'Final report',
  statement: 'Deploy to GitHub.',
  inputFormat: null,
  outputFormat: null,
  examples: null,
  images: [],
  storyFraming: 'The end is near...',
});

const validQuest = (): Quest => ({
  id: 'q1',
  theme: 'alien invasion',
  level: 'beginner',
  questIntro: 'Earth needs you.',
  missions: [codingMission(1), codingMission(2), codingMission(3), deploymentMission()],
  createdAt: '2026-06-20T12:00:00.000Z',
});

describe('LevelSchema', () => {
  it('is beginner | intermediate | expert (no "advanced")', () => {
    expect(LEVELS).toEqual(['beginner', 'intermediate', 'expert']);
    expect(LevelSchema.safeParse('expert').success).toBe(true);
    expect(LevelSchema.safeParse('advanced').success).toBe(false);
  });
});

describe('TaskSchema', () => {
  it('accepts a task with the full ACMP field set (incl. stored code)', () => {
    expect(() => TaskSchema.parse(validTask())).not.toThrow();
  });

  // FR-001 / SC-001: the structure must be able to hold the ENTIRE ACMP field set for a real,
  // fully-populated task (statement + I/O format + ≥1 example + images + complexity + stored
  // solver/test-gen code + source link + readiness), so the whole catalog could be ported into it.
  it('represents a fully-populated, real-shaped ACMP task (FR-001) with every field present', () => {
    const realTask = {
      id: '1',
      taskId: '1',
      sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=1',
      title: 'Apples',
      statement:
        'In a basket there are N apples, which must be divided equally among K schoolchildren ' +
        'so that none are left over. Each child must get a whole number of apples.',
      inputFormat: 'Two integers N and K (1 ≤ N, K ≤ 10000), each on its own line.',
      outputFormat: 'Print "YES" if the apples divide evenly, otherwise "NO".',
      examples: [
        { input: '10\n2', output: 'YES' },
        { input: '10\n3', output: 'NO' },
      ],
      images: ['/tasks/1/fig-1.png', '/tasks/1/fig-2.png'],
      complexity: 6,
      runtime: 'js' as const,
      solverSource:
        'function solve(input){const [n,k]=input.split(/\\s+/).map(Number);return n%k===0?"YES":"NO";}',
      testGenSource:
        'function generateTests(){return [{input:"10\\n2",kind:"positive"},{input:"10\\n3",kind:"negative"},{input:"1\\n1",kind:"edge"}];}',
      ready: true,
    };
    const parsed = TaskSchema.parse(realTask);
    // Every field the ACMP catalog requires round-trips intact.
    expect(parsed).toMatchObject({
      id: '1',
      taskId: '1',
      sourceUrl: realTask.sourceUrl,
      title: realTask.title,
      statement: realTask.statement,
      inputFormat: realTask.inputFormat,
      outputFormat: realTask.outputFormat,
      examples: realTask.examples,
      images: realTask.images,
      complexity: 6,
      runtime: 'js',
      solverSource: realTask.solverSource,
      testGenSource: realTask.testGenSource,
      ready: true,
    });
    expect(parsed.examples.length).toBeGreaterThanOrEqual(1);
    expect(parsed.images.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults images to [] and requires ≥1 example', () => {
    const { images: _images, ...noImages } = validTask();
    expect(TaskSchema.parse(noImages).images).toEqual([]);
    expect(TaskSchema.safeParse(validTask({ examples: [] })).success).toBe(false);
  });

  it('requires sourceUrl, solverSource, testGenSource, runtime, complexity, ready', () => {
    for (const key of ['sourceUrl', 'solverSource', 'testGenSource', 'runtime', 'complexity', 'ready'] as const) {
      const t = validTask();
      delete (t as Record<string, unknown>)[key];
      expect(TaskSchema.safeParse(t).success, key).toBe(false);
    }
  });

  it('does not surface the removed `level` / `solverKey` fields', () => {
    const parsed = TaskSchema.parse({ ...validTask(), level: 'beginner', solverKey: 'x' } as Record<string, unknown>);
    expect('level' in parsed).toBe(false);
    expect('solverKey' in parsed).toBe(false);
  });
});

describe('MissionSchema (via QuestSchema)', () => {
  it('accepts a valid 4-mission quest', () => {
    expect(() => QuestSchema.parse(validQuest())).not.toThrow();
  });

  it('rejects a coding mission missing sourceUrl', () => {
    const q = validQuest();
    (q.missions[0] as Record<string, unknown>).sourceUrl = null;
    expect(QuestSchema.safeParse(q).success).toBe(false);
  });

  it('rejects a deployment mission that carries task fields', () => {
    const q = validQuest();
    (q.missions[3] as Record<string, unknown>).taskId = '892';
    expect(QuestSchema.safeParse(q).success).toBe(false);
  });

  it('requires exactly one deployment mission at order 4', () => {
    const q = validQuest();
    q.missions = [codingMission(1), codingMission(2), codingMission(3), codingMission(3)] as unknown as Quest['missions'];
    expect(QuestSchema.safeParse(q).success).toBe(false);
  });
});

describe('SessionSchema', () => {
  it('round-trips missionInputs and detectedLanguage', () => {
    const session = {
      sessionId: 's1',
      quest: validQuest(),
      progress: { currentMission: 1 as const, solvedMissions: [], won: false },
      missionInputs: { '1': '1\n2\n3' },
      detectedLanguage: 'ru',
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    expect(() => SessionSchema.parse(session)).not.toThrow();
  });

  it('rejects won=true without mission 4 solved', () => {
    const session = {
      sessionId: 's1',
      quest: validQuest(),
      progress: { currentMission: 4 as const, solvedMissions: [1, 2, 3], won: true },
      updatedAt: '2026-06-20T12:00:00.000Z',
    };
    expect(SessionSchema.safeParse(session).success).toBe(false);
  });
});

describe('ThemeSchema / ProgressSchema', () => {
  it('bounds theme length and rejects empty', () => {
    expect(ThemeSchema.safeParse('').success).toBe(false);
    expect(ThemeSchema.safeParse('x'.repeat(200)).success).toBe(false);
  });
  it('accepts a valid progress', () => {
    expect(() => ProgressSchema.parse({ currentMission: 2, solvedMissions: [1], won: false })).not.toThrow();
  });
});
