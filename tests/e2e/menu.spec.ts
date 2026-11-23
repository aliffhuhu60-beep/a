import { expect, test } from '@playwright/test';
import { openGame, seedProgress } from './helpers';

test.describe('menus and navigation', () => {
  test('loads through the loading screen into the main menu without errors', async ({ page }) => {
    const errors = await openGame(page);
    await expect(page.locator('.game-canvas')).toBeVisible();
    await expect(page.getByTestId('play-button')).toBeVisible();
    await expect(page.getByText('CITY DASH').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('every main menu button opens its screen and Back returns', async ({ page }) => {
    await seedProgress(page, {});
    await openGame(page);
    const screens: [string, string][] = [
      ['menu-characters', 'characters-screen'],
      ['menu-missions', 'missions-screen'],
      ['menu-shop', 'shop-screen'],
      ['menu-leaderboard', 'leaderboard-screen'],
      ['menu-settings', 'settings-screen'],
      ['menu-profile', 'profile-screen'],
      ['profile-chip', 'profile-screen'],
    ];
    for (const [button, screen] of screens) {
      await page.getByTestId(button).click();
      await expect(page.getByTestId(screen)).toBeVisible();
      await page.getByTestId('back-button').click();
      await expect(page.getByTestId('main-menu')).toBeVisible();
    }
  });

  test('offline build shows an honest notice and local records instead of a fake leaderboard', async ({ page }) => {
    await seedProgress(page, { localRuns: [{ score: 4321, distance: 777, coins: 50, character: 'rio', date: new Date().toISOString() }], bestScore: 4321 });
    await openGame(page);
    await page.getByTestId('menu-leaderboard').click();
    await expect(page.getByTestId('offline-notice')).toBeVisible();
    await expect(page.getByTestId('local-records')).toContainText('4,321');
    await page.getByTestId('back-button').click();
    await page.getByTestId('menu-profile').click();
    await expect(page.getByText('Offline mode')).toBeVisible();
  });

  test('settings: quality, toggles and volume persist', async ({ page }) => {
    await seedProgress(page, {});
    await openGame(page);
    await page.getByTestId('menu-settings').click();
    await page.getByTestId('quality-medium').click();
    await expect(page.getByTestId('quality-medium')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('switch', { name: 'Show FPS' }).click();
    await page.getByLabel('Music volume').fill('0.3');
    await page.reload();
    await expect(page.getByTestId('main-menu')).toBeVisible({ timeout: 90_000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('citydash-settings-v1') ?? '{}').state);
    expect(saved.quality).toBe('medium');
    expect(saved.showFps).toBe(true);
    expect(saved.musicVolume).toBeCloseTo(0.3);
  });

  test('missions, daily reward and achievements', async ({ page }) => {
    await seedProgress(page, { coins: 0 });
    await openGame(page);
    await page.getByTestId('daily-reward-button').click();
    await page.getByTestId('claim-reward').click();
    await expect(page.getByTestId('coin-balance').first()).toContainText('100');
    await page.getByTestId('close-reward').click();
    await expect(page.getByTestId('daily-reward-button')).toHaveCount(0);
    await page.getByTestId('menu-missions').click();
    await expect(page.getByTestId('mission-list').locator('> div')).toHaveCount(3);
    await page.getByRole('tab', { name: /Achievements/ }).click();
    await expect(page.getByTestId('achievement-list').locator('> div')).toHaveCount(17);
  });
});

test.describe('shop and characters', () => {
  test('cannot buy without coins; can buy, select and equip with coins', async ({ page }) => {
    await seedProgress(page, { coins: 0 });
    await openGame(page);
    await page.getByTestId('menu-characters').click();
    await page.getByTestId('character-mika').click();
    await expect(page.getByTestId('buy-character')).toBeDisabled();
    await page.getByTestId('back-button').click();

    await seedProgress(page, { coins: 5000 });
    await page.reload();
    await expect(page.getByTestId('main-menu')).toBeVisible({ timeout: 90_000 });
    await page.getByTestId('menu-shop').click();
    await page.getByTestId('character-mika').click();
    await page.getByTestId('buy-character').click();
    await expect(page.getByTestId('select-character')).toHaveText('Selected');
    await expect(page.getByTestId('coin-balance').first()).toContainText('4,000');
    await page.getByRole('tab', { name: 'Skins' }).click();
    await page.getByTestId('character-mika').click();
    await page.getByRole('button', { name: /800/ }).click();
    await expect(page.getByRole('button', { name: 'Equipped' }).nth(0)).toBeVisible();
    await page.getByRole('tab', { name: 'Power-ups' }).click();
    await page.getByTestId('upgrade-magnet').click();
    await expect(page.getByTestId('coin-balance').first()).toContainText('2,700');
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('citydash-progress-v1') ?? '{}').state);
    expect(p.unlockedCharacters).toContain('mika');
    expect(p.selectedCharacter).toBe('mika');
    expect(p.unlockedSkins).toContain('mika-sunset');
    expect(p.upgrades.magnet).toBe(1);
    // The selected character is used in the next run.
    await page.getByTestId('back-button').click();
    await page.getByTestId('play-button').click();
    await page.waitForFunction(() => (window as unknown as { __cityDash: { state: () => { character: string } } }).__cityDash.state().character === 'mika');
  });
});
