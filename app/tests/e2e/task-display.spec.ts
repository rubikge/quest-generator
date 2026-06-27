import { test, expect, type BrowserContext } from '@playwright/test';
import { createStore } from '../../src/lib/quest/store';
import { runSolver } from '../../src/lib/quest/sandbox/index';

// US3 — verify a coding mission renders the FULL task (statement, illustrations when present, the
// input/output requirements, and the worked example table) and that the genuine battery grading
// loop accepts the correct output. The display prose is localized by the weave flow; examples/images
// come from the catalog. (Runs under QUEST_E2E_STUB=1 so narrative is deterministic — see config.)

/** Compute the correct combined output for a mission by running the task's stored solver in-sandbox. */
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

test('coding mission displays the full task and grades the battery output', async ({ page, context }) => {
  await page.goto('/');

  await page.getByTestId('theme-input').fill('alien invasion');
  await page.getByTestId('level-select').selectOption('beginner');
  await page.getByTestId('generate').click();

  await expect(page.getByTestId('quest-intro')).toBeVisible();

  // Mission 1: the complete task presentation must be visible.
  await expect(page.getByTestId('mission-title')).toBeVisible();
  await expect(page.getByTestId('mission-statement')).toBeVisible();
  await expect(page.getByTestId('mission-input-format')).toBeVisible();
  await expect(page.getByTestId('mission-output-format')).toBeVisible();
  await expect(page.getByTestId('mission-examples')).toBeVisible();
  await expect(page.getByTestId('example-0')).toBeVisible();
  // The generated test-battery input is shown (submit enabled once it loads).
  await expect(page.getByTestId('submit-solution')).toBeEnabled();

  // Solve all three coding missions with the genuinely-computed correct output.
  for (const order of [1, 2, 3] as const) {
    await expect(page.getByTestId('submit-solution')).toBeEnabled();
    const answer = await correctAnswerFor(context, order);
    await page.getByTestId('solution-input').fill(answer);
    await page.getByTestId('submit-solution').click();
    await expect(page.getByTestId(`step-${order}`)).toHaveClass(/done/);
  }

  // Final deployment mission (stubbed README contains the task ids in e2e mode).
  await expect(page.getByTestId('repo-input')).toBeVisible();
  await page.getByTestId('repo-input').fill('https://github.com/learner/my-quest');
  await page.getByTestId('submit-deploy').click();
  await expect(page.getByTestId('win')).toBeVisible();
});

test('a wrong output is rejected with whitespace-tolerant feedback', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('theme-input').fill('alien invasion');
  await page.getByTestId('level-select').selectOption('beginner');
  await page.getByTestId('generate').click();

  await expect(page.getByTestId('submit-solution')).toBeEnabled();
  await expect(page.getByTestId('solution-hint')).toBeVisible();
  await page.getByTestId('solution-input').fill('definitely-wrong-output');
  await page.getByTestId('submit-solution').click();
  const msg = page.getByTestId('mission-msg');
  await expect(msg).toBeVisible();
  await expect(msg).toHaveClass(/msg-err/);
});
