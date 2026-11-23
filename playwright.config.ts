import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against production builds:
 *  - :4173 offline build (no Supabase configured)
 *  - :4174 online build (Supabase URL mocked inside the tests)
 * WebGL runs through SwiftShader in headless Chromium, so tests use low quality.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 150_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 960, height: 540 },
    trace: 'off',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 960, height: 540 } } }],
  webServer: [
    {
      command: 'npx vite build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npx vite build --mode e2e --outDir dist-online && npx vite preview --mode e2e --outDir dist-online --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
