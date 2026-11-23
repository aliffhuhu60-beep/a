import { expect, test } from '@playwright/test';
import { openGame, seedProgress, startRun, waitState, withEngine } from './helpers';
import { SupabaseMock } from './supabaseMock';

const BASE = 'http://localhost:4174';

test('online flow: register, play, submit score, leaderboard, friends, logout', async ({ page }) => {
  const mock = new SupabaseMock();
  await mock.install(page);
  await seedProgress(page, { coins: 77 });
  await openGame(page, 'noObstacles', BASE);
  await expect(page.getByTestId('profile-chip')).toContainText('Guest');

  // Guest can view the global leaderboard (public read).
  await page.getByTestId('menu-leaderboard').click();
  await expect(page.getByTestId('global-leaderboard').getByTestId('leaderboard-row')).toHaveCount(2);
  await expect(page.getByTestId('global-leaderboard')).toContainText('neo_runner');
  await page.getByRole('tab', { name: 'Friends' }).click();
  await page.getByTestId('goto-signin').click();

  // Register.
  await page.getByRole('tab', { name: 'Register' }).click();
  await page.getByTestId('username-input').fill('dash_tester');
  await page.getByTestId('email-input').fill('tester@example.com');
  await page.getByTestId('password-input').fill('secret123');
  await page.getByLabel('Avatar 🐯').click();
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('profile-username')).toHaveText('dash_tester');
  // Guest progress was uploaded to the cloud save.
  await expect.poll(() => (mock.progress.values().next().value as { coins?: number } | undefined)?.coins).toBe(77);
  await page.getByTestId('back-button').click();
  await expect(page.getByTestId('profile-chip')).toContainText('dash_tester');

  // Play a run and crash -> score submitted through submit_run.
  await startRun(page);
  await page.waitForFunction(() => (window as unknown as { __cityDash: { state: () => { distance: number } } }).__cityDash.state().distance > 15);
  await withEngine(page, "engine.debugSpawnObstacle('crateStack', engine.player.lane, 10)");
  await waitState(page, 'gameover');
  await expect(page.getByTestId('submit-status')).toContainText('Submitted! Global rank #3');
  const submit = mock.calls.find((c) => c.path === 'POST /rest/v1/rpc/submit_run');
  expect(submit?.auth).toBeTruthy();
  expect(submit?.body).toMatchObject({ p_character: 'rio' });
  expect(Number((submit?.body as { p_score: number }).p_score)).toBeGreaterThan(0);

  // Leaderboard now shows us, highlighted, plus our rank.
  await page.getByTestId('gameover-leaderboard').click();
  await expect(page.getByTestId('global-leaderboard').getByTestId('leaderboard-row')).toHaveCount(3);
  await expect(page.getByTestId('global-leaderboard')).toContainText('dash_tester');
  await expect(page.getByTestId('my-rank')).toContainText('#3');

  // Friends: unknown name fails, real name works, remove works.
  await page.getByRole('tab', { name: 'Friends' }).click();
  await page.getByTestId('friend-input').fill('nobody');
  await page.getByTestId('add-friend').click();
  await expect(page.getByText('No player with that username.')).toBeVisible();
  await page.getByTestId('friend-input').fill('Skyline');
  await page.getByTestId('add-friend').click();
  await expect(page.getByTestId('friends-leaderboard').getByTestId('leaderboard-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Remove skyline' }).click();
  await expect(page.getByTestId('friends-leaderboard').getByTestId('leaderboard-row')).toHaveCount(1);

  // Logout returns to guest.
  await page.getByTestId('back-button').click();
  await page.getByTestId('menu-profile').click();
  await page.getByTestId('logout').click();
  await expect(page.getByTestId('login-form')).toBeVisible();
});

test('login with wrong password shows an error, then succeeds', async ({ page }) => {
  const mock = new SupabaseMock();
  mock.users.get([...mock.users.keys()][0])!.password = 'rightpass';
  await mock.install(page);
  await seedProgress(page, {});
  await openGame(page, 'noObstacles', BASE);
  await page.getByTestId('menu-profile').click();
  await page.getByTestId('email-input').fill('neo_runner@example.com');
  await page.getByTestId('password-input').fill('wrongpass');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('auth-message')).toContainText('Wrong email or password');
  await page.getByTestId('password-input').fill('rightpass');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('profile-username')).toHaveText('neo_runner');
  await expect(page.getByTestId('stats')).toBeVisible();
});
