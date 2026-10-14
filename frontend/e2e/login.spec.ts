/** Exercise the actual demo UI against production preview, without age stubs. */
import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

interface BrowserEvidence {
  consoleMessages: string[];
  pageErrors: string[];
  requests: Array<{ url: string; method: string; kind: string; body: string | null }>;
}

const evidence = new WeakMap<Page, BrowserEvidence>();

test.beforeEach(async ({ page }) => {
  // Register before any test can navigate, including the initial page load.
  const captured: BrowserEvidence = { consoleMessages: [], pageErrors: [], requests: [] };
  evidence.set(page, captured);
  page.on('console', (message) => captured.consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on('pageerror', (error) => captured.pageErrors.push(error.message));
  page.on('request', (request) => captured.requests.push({
    url: request.url(),
    method: request.method(),
    kind: request.resourceType(),
    body: request.postData(),
  }));
});

test.afterEach(async ({ page, baseURL }, testInfo) => {
  await testInfo.attach('final-state', {
    body: await page.screenshot({ path: testInfo.outputPath('final-state.png'), fullPage: true }),
    contentType: 'image/png',
  });
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const captured = evidence.get(page)!;
  const origin = new URL(baseURL!).origin;
  for (const request of captured.requests) {
    expect.soft(new URL(request.url).origin).toBe(origin);
    expect.soft(request.method).toBe('GET');
    expect.soft(request.body).toBeNull();
    expect.soft(['fetch', 'xhr', 'websocket'].includes(request.kind)).toBe(false);
    expect.soft(decodeURIComponent(request.url)).not.toContain('demo@example.com');
    expect.soft(decodeURIComponent(request.url)).not.toContain('Demo123!');
  }
  // Assert after all interactions and evidence capture, not just after navigation.
  expect.soft(captured.consoleMessages, 'browser console must remain clean').toEqual([]);
  expect.soft(captured.pageErrors, 'uncaught page errors must remain absent').toEqual([]);
});

/**
 * Fill visible native controls and submit through the real Login button.
 *
 * Args:
 *   page: Browser page with the login view mounted.
 *   email: Untrusted text to enter, including optional surrounding whitespace.
 *   password: Exact text for the masked control.
 */
async function login(page: Page, email = 'demo@example.com', password = 'Demo123!') {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}

/** Assert that the signed-out UI exposes no age feature or confirmation. */
async function expectGate(page: Page) {
  await expect(page.getByRole('heading', { name: 'Try the demo.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Enter your age' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check Age' })).toHaveCount(0);
  await expect(page.getByLabel(/^Age$/i)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
}

/**
 * Attach text-based visual preflight evidence alongside a full-page screenshot.
 *
 * Args:
 *   page: Current representative UI state.
 *   testInfo: Isolated per-test artifact destination.
 *   name: State label reused in the desktop and mobile project outputs.
 */
async function captureState(page: Page, testInfo: TestInfo, name: string) {
  const tree = await page.accessibility.snapshot();
  expect(tree).not.toBeNull();
  const styles = await page.evaluate(() => {
    const main = document.querySelector('main')!;
    const heading = document.querySelector('h1')!;
    const bodyStyle = getComputedStyle(document.body);
    const mainStyle = getComputedStyle(main);
    const headingStyle = getComputedStyle(heading);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      body: { font: bodyStyle.fontFamily, background: bodyStyle.backgroundColor, color: bodyStyle.color },
      main: { width: mainStyle.width, margin: mainStyle.margin },
      heading: { size: headingStyle.fontSize, weight: headingStyle.fontWeight, lineHeight: headingStyle.lineHeight },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(styles.horizontalOverflow).toBe(false);
  await testInfo.attach(`${name}-accessibility`, { body: JSON.stringify(tree, null, 2), contentType: 'application/json' });
  await testInfo.attach(`${name}-styles`, { body: JSON.stringify(styles, null, 2), contentType: 'application/json' });
  await testInfo.attach(`${name}-html`, { body: await page.content(), contentType: 'text/html' });
  await testInfo.attach(`${name}-screenshot`, {
    body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true }),
    contentType: 'image/png',
  });
}

test('fresh load presents the public fixture, warnings and a closed gate', async ({ page }, testInfo) => {
  await page.goto('/');
  await expectGate(page);
  await expect(page).toHaveTitle('Age Status Demo');
  await expect(page.getByRole('heading', { name: 'Public demonstration credentials' })).toBeVisible();
  await expect(page.locator('code').filter({ hasText: 'demo@example.com' })).toHaveText('demo@example.com');
  await expect(page.locator('code').filter({ hasText: 'Demo123!' })).toHaveText('Demo123!');
  await expect(page.getByText(/Simulated login only/)).toContainText('Do not enter a real password.');
  await expect(page.getByText(/Simulated login only/)).toContainText('not suitable for real accounts');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await captureState(page, testInfo, 'login');
});

for (const scenario of [
  { name: 'both empty', email: '', password: '', invalid: ['Email', 'Password'] },
  { name: 'email empty', email: '', password: 'Demo123!', invalid: ['Email'] },
  { name: 'email whitespace', email: '   ', password: 'Demo123!', invalid: ['Email'] },
  { name: 'password empty', email: 'demo@example.com', password: '', invalid: ['Password'] },
  { name: 'unknown email', email: 'other@example.com', password: 'Demo123!', invalid: ['Email'] },
  { name: 'case-changed email', email: 'Demo@example.com', password: 'Demo123!', invalid: ['Email'] },
  { name: 'wrong password', email: 'demo@example.com', password: 'wrong', invalid: ['Password'] },
  { name: 'lowercase password', email: 'demo@example.com', password: 'demo123!', invalid: ['Password'] },
  { name: 'uppercase password', email: 'demo@example.com', password: 'DEMO123!', invalid: ['Password'] },
  { name: 'leading password space', email: 'demo@example.com', password: ' Demo123!', invalid: ['Password'] },
  { name: 'trailing password space', email: 'demo@example.com', password: 'Demo123! ', invalid: ['Password'] },
  { name: 'whitespace password', email: 'demo@example.com', password: ' ', invalid: ['Password'] },
  { name: 'hostile email', email: '<script>alert(1)</script>', password: 'Demo123!', invalid: ['Email'] },
  { name: 'hostile password', email: 'demo@example.com', password: "' OR 1=1 --", invalid: ['Password'] },
]) {
  test(`rejects ${scenario.name} and stays gated`, async ({ page }) => {
    await page.goto('/');
    await login(page, scenario.email, scenario.password);
    await expectGate(page);
    await expect(page.getByRole('alert')).toHaveCount(scenario.invalid.length);
    for (const label of ['Email', 'Password']) {
      const input = page.getByLabel(label, { exact: true });
      const invalid = scenario.invalid.includes(label);
      await expect(input).toHaveAttribute('aria-invalid', String(invalid));
      if (invalid) {
        const errorId = `${label.toLowerCase()}-error`;
        await expect(input).toHaveAttribute('aria-describedby', errorId);
        await expect(page.locator(`#${errorId}`)).toHaveAttribute('role', 'alert');
        await expect(page.locator(`#${errorId}`)).toBeVisible();
      }
    }
    await expect(page.getByLabel(scenario.invalid[0], { exact: true })).toBeFocused();
    await expect(page.locator('main script')).toHaveCount(0);
    for (const text of await page.getByRole('alert').allTextContents()) {
      expect(text).not.toContain('<script>');
      expect(text).not.toContain("' OR 1=1 --");
    }
  });
}

test('valid UI login trims email, unlocks confirmation, and reload resets', async ({ page }, testInfo) => {
  await page.goto('/');
  await login(page, '  demo@example.com  ');
  await expect(page.getByRole('heading', { name: 'Enter your age' })).toBeFocused();
  await expect(page.getByText(/Demo login successful/)).toBeVisible();
  await expect(page.getByLabel('Age', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Age', { exact: true })).toHaveAttribute('type', 'text');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check Age' })).toBeVisible();
  await captureState(page, testInfo, 'signed-in');
  await page.reload();
  await expectGate(page);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
});

test('keyboard-only errors, correction and successful login preserve usable focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  expect(await page.getByLabel('Email', { exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await expectGate(page);
  await captureState(page, testInfo, 'errors');
  await page.keyboard.type('demo@example.com');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Demo123!');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Enter your age' })).toBeFocused();
  await expect(page.getByText(/Demo login successful/)).toContainText('signed in');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Age', { exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Check Age' })).toBeVisible();
});

test('invalid and valid interactions leave storage empty and make no input requests', async ({ page }) => {
  await page.goto('/');
  await login(page, 'demo@example.com', 'wrong');
  await expectGate(page);
  await login(page);
  await expect(page.getByLabel('Age', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Check Age' })).toBeVisible();
  await expect(page.getByRole('status')).toBeEmpty();
  const stored = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
    databases: (await indexedDB.databases()).length,
  }));
  expect(stored).toEqual({ local: 0, session: 0, cookies: '', databases: 0 });
  await page.reload();
  await expectGate(page);
  // The common afterEach hook checks every request, including both page loads.
});
