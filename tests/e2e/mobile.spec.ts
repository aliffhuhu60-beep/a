import { expect, test } from '@playwright/test';
import { openGame, seedProgress, startRun, waitFor } from './helpers';

const swipe = (page: import('@playwright/test').Page, dx: number, dy: number) =>
  page.evaluate(
    ({ dx, dy }) => {
      const el = document.querySelector('.game-root')!;
      const x = innerWidth / 2;
      const y = innerHeight / 2;
      const ev = (type: string, cx: number, cy: number) => new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: cy, bubbles: true });
      el.dispatchEvent(ev('pointerdown', x, y));
      window.dispatchEvent(ev('pointermove', x + dx * 0.5, y + dy * 0.5));
      window.dispatchEvent(ev('pointermove', x + dx, y + dy));
      window.dispatchEvent(ev('pointerup', x + dx, y + dy));
    },
    { dx, dy },
  );

test.describe('mobile', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('landscape phone layout fits the screen', async ({ page }) => {
    await seedProgress(page, {});
    await openGame(page);
    await expect(page.getByTestId('play-button')).toBeInViewport();
    await expect(page.getByTestId('menu-profile')).toBeInViewport();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
    expect(overflow).toBe(false);
    await page.getByTestId('menu-shop').click();
    await expect(page.getByTestId('back-button')).toBeInViewport();
  });

  test('swipe controls: left, right, up (jump) and down (slide)', async ({ page }) => {
    await seedProgress(page, {});
    await openGame(page);
    await startRun(page);
    await swipe(page, -120, 0);
    await waitFor(page, 'st.lane === -1');
    await swipe(page, 120, 0);
    await waitFor(page, 'st.lane === 0');
    await swipe(page, 0, -120);
    await waitFor(page, 'st.y > 0.4');
    await waitFor(page, 'st.grounded');
    await swipe(page, 0, 120);
    await waitFor(page, 'st.sliding');
    // One long swipe changes only one lane.
    await swipe(page, 300, 0);
    await waitFor(page, 'st.lane === 1');
    await page.waitForTimeout(300);
    await waitFor(page, 'st.lane === 1');
    await swipe(page, -120, 0);
    await waitFor(page, 'st.lane === 0');
    // A tiny movement is not a swipe.
    await swipe(page, 5, 3);
    await page.waitForTimeout(300);
    await waitFor(page, 'st.lane === 0');
  });
});

test.describe('portrait phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('suggests rotating to landscape but can be dismissed', async ({ page }) => {
    await seedProgress(page, {});
    await page.goto('/?e2e&quality=low');
    await expect(page.getByTestId('rotate-hint')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Play in portrait anyway' }).click();
    await expect(page.getByTestId('rotate-hint')).toHaveCount(0);
    await expect(page.getByTestId('play-button')).toBeVisible({ timeout: 90_000 });
  });
});

test.describe('desktop mouse', () => {
  test('mouse drag also works as a swipe', async ({ page }) => {
    await seedProgress(page, {});
    await openGame(page);
    await startRun(page);
    await page.mouse.move(480, 270);
    await page.mouse.down();
    await page.mouse.move(400, 270, { steps: 3 });
    await page.mouse.up();
    await waitFor(page, 'st.lane === -1');
  });
});
