/**
 * Seed the Firestore `tasks` catalog with curated coding problems (idempotent: keyed by
 * taskId). Run against the emulator or a real project:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 npm run seed
 *
 * At least 3 coding tasks per level are required to generate a quest at that level (FR-018).
 */
import { getDb } from '../src/lib/quest/store.js';
import { TaskSchema, type Task } from '../src/lib/quest/model/index.js';

export const SEED_TASKS: Task[] = [
  {
    taskId: '892',
    title: 'Анализ временных циклов',
    statement:
      'По списку номеров месяцев (1–12) выведите время года: Winter/Spring/Summer/Autumn, иначе Error. Каждый результат с новой строки.',
    level: 'beginner',
    sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=892',
    solverKey: 'season-analysis',
  },
  {
    taskId: '757',
    title: 'Анализ топливных ресурсов',
    statement:
      'Для каждой строки с числом атомов C, H, O вычислите максимальное число молекул спирта (C2H5OH).',
    level: 'beginner',
    sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=757',
    solverKey: 'molecule-calc',
  },
  {
    taskId: '907',
    title: 'Маскировка объекта',
    statement:
      'Для каждой строки с шириной W, высотой H и радиусом R определите, поместится ли круг под прямоугольником: YES/NO.',
    level: 'beginner',
    sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=907',
    solverKey: 'mouse-rug',
  },
];

export async function seedTasks(): Promise<number> {
  const db = getDb();
  const batch = db.batch();
  for (const task of SEED_TASKS) {
    const validated = TaskSchema.parse(task);
    batch.set(db.collection('tasks').doc(validated.taskId), validated);
  }
  await batch.commit();
  return SEED_TASKS.length;
}

// Execute when run directly (tsx scripts/seed-tasks.ts).
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTasks()
    .then((n) => {
      process.stdout.write(`Seeded ${n} tasks.\n`);
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`seed error: ${(err as Error).message}\n`);
      process.exit(1);
    });
}
