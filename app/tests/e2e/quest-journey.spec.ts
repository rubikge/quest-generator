import { test, expect, type BrowserContext } from '@playwright/test';
import { createStore } from '../../src/lib/quest/store';
import { runSolver } from '../../src/lib/quest/sandbox/index';

// T036 — full happy path. For each coding mission, read the generated battery input from the
// session (same emulator the app uses), compute the correct combined output by running the task's
// STORED solver in the sandbox (the learner's code is never executed), and submit it — exercising
// the genuine grading loop, not a canned answer.
//
// NOTE: the final deployment step depends on the app's e2e README stub in src/app/actions.ts. That
// stub currently returns ids only (no ACMP source links), while the link-aware verifyDeployment now
// requires each task's source link too — so the win step cannot pass headlessly until that src stub
// is updated to emit the seeded tasks' source links. The coding-mission loop below is the migrated,
// API-correct portion; the deployment assertions are kept (and will pass once the stub links match).
async function correctAnswerFor(context: BrowserContext, order: 1 | 2 | 3): Promise<string> {
  const cookies = await context.cookies();
  const qsid = cookies.find((c) => c.name === 'qsid')?.value;
  expect(qsid, 'session cookie should be set').toBeTruthy();
  const session = await createStore().getSession(qsid!);
  const mission = session?.quest?.missions.find((m) => m.order === order);
  const input = session?.missionInputs?.[String(order)];
  expect(mission?.taskId, 'mission has a taskId').toBeTruthy();
  expect(input, 'mission input persisted').toBeTruthy();
  const task = await createStore().getTask(mission!.taskId!);
  expect(task, 'task loadable from the catalog').toBeTruthy();
  const res = runSolver(task!.solverSource, input!);
  expect(res.ok, 'sandboxed solver produced output').toBe(true);
  return res.ok ? res.output : '';
}

test('full quest journey: generate → solve 3 missions → deploy → win', async ({ page, context }) => {
  await page.goto('/');

  await page.getByTestId('theme-input').fill('alien invasion');
  await page.getByTestId('level-select').selectOption('beginner');
  await page.getByTestId('generate').click();

  await expect(page.getByTestId('quest-intro')).toBeVisible();

  for (const order of [1, 2, 3] as const) {
    // Wait until the mission input has loaded (submit becomes enabled).
    await expect(page.getByTestId('submit-solution')).toBeEnabled();
    const answer = await correctAnswerFor(context, order);
    await page.getByTestId('solution-input').fill(answer);
    await page.getByTestId('submit-solution').click();
    // Mission marked solved in the progress tracker.
    await expect(page.getByTestId(`step-${order}`)).toHaveClass(/done/);
  }

  // Final deployment mission (the e2e README stub must contain both the task ids and source links).
  await expect(page.getByTestId('repo-input')).toBeVisible();
  await page.getByTestId('repo-input').fill('https://github.com/learner/my-quest');
  await page.getByTestId('submit-deploy').click();

  await expect(page.getByTestId('win')).toBeVisible();
  await expect(page.getByTestId('step-4')).toHaveClass(/done/);
});
