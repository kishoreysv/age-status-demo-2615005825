/** Exercise a freshly built, loopback-only production preview on two viewports. */
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

const frontendDirectory = fileURLToPath(new URL('.', import.meta.url));
const env = { ...loadEnv('test', frontendDirectory, ''), ...process.env };
const requestedPort = env.PLAYWRIGHT_PORT;
const baseURL = env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${requestedPort ?? '4173'}`;
const previewURL = new URL(baseURL);
const port = Number(previewURL.port || '80');

// Restrict values interpolated into webServer.command to known-safe local hosts.
if (
  previewURL.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost'].includes(previewURL.hostname) ||
  previewURL.username || previewURL.password || previewURL.search || previewURL.hash ||
  previewURL.pathname !== '/' ||
  !Number.isInteger(port) || port < 1 || port > 65535 ||
  (requestedPort !== undefined && Number(requestedPort) !== port)
) {
  throw new Error('Use a loopback HTTP PLAYWRIGHT_BASE_URL and a matching PLAYWRIGHT_PORT (1–65535).');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: './test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    cwd: frontendDirectory,
    env: { NODE_ENV: 'production' },
    command: `node node_modules/typescript/bin/tsc --noEmit && node node_modules/vite/bin/vite.js build && node node_modules/vite/bin/vite.js preview --host ${previewURL.hostname} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
