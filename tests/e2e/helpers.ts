import { expect, type Page } from '@playwright/test';

export interface DebugState {
  state: string;
  s: number;
  x: number;
  y: number;
  lane: number;
  grounded: boolean;
  sliding: boolean;
  jetpack: boolean;
  speed: number;
  score: number;
  coins: number;
  distance: number;
  multiplier: number;
  obstacles: number;
  coinCount: number;
  powerUps: string[];
  theme: string;
  character: string;
  stats: Record<string, number | boolean>;
}

export const openGame = async (page: Page, params = 'noObstacles', base = ''): Promise<string[]> => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?e2e&quality=low&seed=1&${params}`);
  await expect(page.getByTestId('main-menu')).toBeVisible({ timeout: 90_000 });
  return errors;
};

export const state = (page: Page): Promise<DebugState> => page.evaluate(() => (window as unknown as { __cityDash: { state: () => DebugState } }).__cityDash.state());

export const waitState = async (page: Page, s: string | string[], timeout = 60_000): Promise<void> => {
  const list = Array.isArray(s) ? s : [s];
  await page.waitForFunction((l) => l.includes((window as unknown as { __cityDash: { state: () => { state: string } } }).__cityDash.state().state), list, { timeout });
};

export const startRun = async (page: Page): Promise<void> => {
  await page.getByTestId('play-button').click();
  await waitState(page, 'running');
};

/** Runs a callback inside the page with the engine (for spawning test obstacles). */
export const withEngine = <T>(page: Page, fn: string): Promise<T> =>
  page.evaluate((src) => {
    const engine = (window as unknown as { __cityDash: { engine: unknown } }).__cityDash.engine;
    return new Function('engine', src)(engine) as T;
  }, fn);

/** Waits until the given stat/predicate holds (polled inside the page every frame). */
export const waitFor = (page: Page, predicate: string, timeout = 60_000) =>
  page.waitForFunction(
    (src) => {
      const st = (window as unknown as { __cityDash: { state: () => unknown } }).__cityDash.state();
      return new Function('st', `return (${src});`)(st);
    },
    predicate,
    { timeout, polling: 'raf' },
  );

/**
 * Installs an in-page "bot" that performs `action` once the nearest obstacle in
 * the runner's lane is within `distance` metres. Reacting inside the page makes
 * the timing independent of how slowly the headless GPU renders.
 */
export const reactWhenClose = (page: Page, action: 'jump' | 'slide' | 'left' | 'right', distance: number) =>
  page.evaluate(
    ({ action, distance }) => {
      const engine = (window as unknown as { __cityDash: { engine: { player: { s: number; lane: number }; obstacles: { active: { box: { minS: number }; spec: { lane: number } }[] }; action: (a: string) => void } } }).__cityDash.engine;
      const tick = () => {
        const p = engine.player;
        const next = engine.obstacles.active.filter((o) => o.spec.lane === p.lane && o.box.minS > p.s).sort((a, b) => a.box.minS - b.box.minS)[0];
        if (next && next.box.minS - p.s < distance) {
          engine.action(action);
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    },
    { action, distance },
  );

export const seedProgress = async (page: Page, patch: Record<string, unknown>): Promise<void> => {
  await page.addInitScript((p) => {
    // Seed once per tab so reloads keep whatever the test changed afterwards.
    const key = `seeded:${JSON.stringify(p)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    localStorage.setItem('citydash-progress-v1', JSON.stringify({ state: p, version: 1 }));
    localStorage.setItem('citydash-settings-v1', JSON.stringify({ state: { tutorialSeen: true, quality: 'low', musicVolume: 0, sfxVolume: 0 }, version: 0 }));
  }, patch);
};
