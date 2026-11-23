import { expect, test } from '@playwright/test';
import { openGame, reactWhenClose, seedProgress, startRun, state, waitFor, waitState, withEngine } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedProgress(page, {});
});

test('countdown, auto-run, HUD updates and keyboard controls', async ({ page }) => {
  await openGame(page);
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('countdown')).toBeVisible();
  await waitState(page, 'running');
  await expect(page.getByTestId('hud')).toBeVisible();
  await waitFor(page, 'st.distance > 5');
  await expect(page.getByTestId('hud-distance')).not.toHaveText(/^0 m/);

  await page.keyboard.press('ArrowLeft');
  await waitFor(page, 'st.lane === -1 && Math.abs(st.x + 2.6) < 0.01');
  await page.keyboard.press('KeyD');
  await page.keyboard.press('ArrowRight');
  await waitFor(page, 'st.lane === 1');
  await page.keyboard.press('Space');
  await waitFor(page, 'st.y > 0.5');
  await waitFor(page, 'st.grounded');
  await page.keyboard.press('KeyS');
  await waitFor(page, 'st.sliding');
  await page.keyboard.press('ArrowUp');
  await waitFor(page, '!st.sliding && st.y > 0.3');
  const s = await state(page);
  expect(s.stats.jumps).toBe(2);
  expect(s.stats.slides).toBe(1);
  expect(s.stats.laneChanges).toBe(3);
  expect(s.score).toBeGreaterThan(0);
});

test('hitting an obstacle head-on ends the run and shows game over', async ({ page }) => {
  await openGame(page);
  await startRun(page);
  await withEngine(page, "engine.debugSpawnObstacle('roadblock', 0, 12)");
  await waitState(page, 'gameover');
  await expect(page.getByTestId('game-over')).toBeVisible();
  await expect(page.getByTestId('go-final-score')).not.toHaveText('');
  await expect(page.getByTestId('submit-status')).toContainText('Offline build');
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('citydash-progress-v1') ?? '{}').state.bestScore);
  expect(best).toBeGreaterThan(0);
  // Retry starts a fresh run.
  await page.getByTestId('retry-button').click();
  await waitState(page, 'running');
  expect((await state(page)).distance).toBeLessThan(20);
});

test('jumping clears a low barrier, sliding passes under an overhead sign', async ({ page }) => {
  await openGame(page);
  await startRun(page);
  await withEngine(page, "engine.debugDisableGeneration(); engine.debugSpawnObstacle('roadblock', 0, 14)");
  await reactWhenClose(page, 'jump', 5);
  await waitFor(page, 'st.stats.dodged >= 1');
  expect((await state(page)).state).toBe('running');

  await withEngine(page, "engine.debugSpawnObstacle('overhead', 0, 14)");
  await reactWhenClose(page, 'slide', 6);
  await waitFor(page, 'st.stats.dodged >= 2');
  expect((await state(page)).state).toBe('running');

  // Standing still under an overhead sign is a crash.
  await withEngine(page, "engine.debugSpawnObstacle('overhead', 0, 12)");
  await waitState(page, ['dying', 'gameover']);
});

test('changing lane avoids a full block; two side-hits in a row end the run', async ({ page }) => {
  await openGame(page);
  await startRun(page);
  await withEngine(page, "engine.debugDisableGeneration(); engine.debugSpawnObstacle('crateStack', 0, 16)");
  await reactWhenClose(page, 'right', 9);
  await waitFor(page, 'st.stats.dodged >= 1');
  expect((await state(page)).lane).toBe(1);

  // A long train beside us: steering into its side makes us stumble and bounce back.
  await withEngine(page, "engine.obstacles.spawnAt('train', 0, engine.player.s - 2, 0, 3)");
  await page.keyboard.press('ArrowLeft');
  await waitFor(page, 'st.lane === 1 && st.x > 2.5');
  expect((await state(page)).state).toBe('running');
  await page.keyboard.press('ArrowLeft');
  await waitState(page, ['dying', 'gameover']);
});

test('coins are collected and counted; magnet pulls coins from other lanes', async ({ page }) => {
  await openGame(page);
  await startRun(page);
  await withEngine(page, 'engine.debugDisableGeneration(); engine.coins.clear(); engine.debugSpawnCoins(0, 6, 5)');
  await waitFor(page, 'st.coins >= 5');
  await expect(page.getByTestId('hud-coins')).toContainText('5');
  await withEngine(page, "engine.debugSpawnPowerUp('magnet', 0, 5)");
  await waitFor(page, "st.powerUps.includes('magnet')");
  await expect(page.getByTestId('powerup-magnet')).toBeVisible();
  await withEngine(page, 'engine.debugSpawnCoins(1, 10, 4); engine.debugSpawnCoins(-1, 10, 4)');
  await waitFor(page, 'st.coins >= 13');
  expect((await state(page)).lane).toBe(0);
});

test('shield absorbs a crash; multiplier doubles score; jetpack flies', async ({ page }) => {
  await openGame(page);
  await startRun(page);
  await withEngine(page, "engine.debugDisableGeneration(); engine.debugSpawnPowerUp('shield', 0, 5); engine.debugSpawnObstacle('crateStack', 0, 24)");
  await waitFor(page, 'st.stats.shieldsBroken === 1');
  expect((await state(page)).state).toBe('running');
  expect((await state(page)).powerUps).not.toContain('shield');

  await withEngine(page, "engine.debugSpawnPowerUp('multiplier', 0, 5)");
  await waitFor(page, 'st.multiplier === 2');
  await expect(page.getByTestId('hud-multiplier')).toHaveText('x2');

  await withEngine(page, "engine.debugSpawnPowerUp('jetpack', 0, 5)");
  await waitFor(page, 'st.jetpack && st.y > 5');
  expect((await state(page)).stats.jetpacks).toBe(1);
});

test('pause menu: resume, restart and main menu all work (Escape and button)', async ({ page }) => {
  await openGame(page);
  await startRun(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const s1 = (await state(page)).s;
  await page.waitForTimeout(500);
  expect((await state(page)).s).toBe(s1); // frozen while paused
  await page.getByTestId('resume-button').click();
  await waitState(page, 'running');
  await page.getByTestId('pause-button').click();
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('restart-button').click();
  await waitState(page, 'running');
  await page.getByTestId('pause-button').click();
  await page.getByTestId('menu-button').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
});

test('procedural generation spawns obstacles ahead and recycles them', async ({ page }) => {
  await openGame(page, '');
  await page.getByTestId('play-button').click();
  await waitState(page, ['running']);
  const st = await state(page);
  expect(st.obstacles).toBeGreaterThan(3);
  expect(st.coinCount).toBeGreaterThan(20);
  // Invincible bot run: obstacles keep coming and old ones are recycled.
  await withEngine(page, 'engine.invincible = true');
  await waitFor(page, 'st.distance > 260', 120_000);
  const later = await state(page);
  expect(later.obstacles).toBeGreaterThan(3);
  expect(later.obstacles).toBeLessThan(60);
});
