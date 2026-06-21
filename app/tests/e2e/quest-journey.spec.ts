import { test, expect, type BrowserContext } from '@playwright/test';
import { createStore } from '../../src/lib/quest/store';
import { getSolver } from '../../src/lib/quest/tasks/registry';

// T036 — full happy path. For each coding mission, read the generated input from the
// session (same emulator the app uses), compute the correct output with the real solver,
// and submit it — exercising the genuine grading loop, not a canned answer.
async function correctAnswerFor(context: BrowserContext, order: 1 | 2 | 3): Promise<string> {
  const cookies = await context.cookies();
  const qsid = cookies.find((c) => c.name === 'qsid')?.value;
  expect(qsid, 'session cookie should be set').toBeTruthy();
  const session = await createStore().getSession(qsid!);
  const mission = session?.quest?.missions.find((m) => m.order === order);
  const input = session?.missionInputs?.[String(order)];
  expect(mission?.solverKey, 'mission has a solver').toBeTruthy();
  expect(input, 'mission input persisted').toBeTruthy();
  return getSolver(mission!.solverKey!)!.solve(input!);
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

  // Final deployment mission (stubbed README contains the task ids in e2e mode).
  await expect(page.getByTestId('repo-input')).toBeVisible();
  await page.getByTestId('repo-input').fill('https://github.com/learner/my-quest');
  await page.getByTestId('submit-deploy').click();

  await expect(page.getByTestId('win')).toBeVisible();
  await expect(page.getByTestId('step-4')).toHaveClass(/done/);
});
