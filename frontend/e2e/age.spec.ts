/** Exercise real login-to-age journeys and privacy on desktop and mobile preview. */
import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

interface BrowserEvidence {
  consoleMessages: string[];
  pageErrors: string[];
  requests: Array<{ url: string; method: string; kind: string; body: string | null }>;
  interactionRequests: string[];
  interacting: boolean;
}

const evidence = new WeakMap<Page, BrowserEvidence>();

test.beforeEach(async ({ page }) => {
  const captured: BrowserEvidence = {
    consoleMessages: [], pageErrors: [], requests: [], interactionRequests: [], interacting: false,
  };
  evidence.set(page, captured);
  // Install hooks before initial navigation, not after the login journey.
  page.on('console', (message) => captured.consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on('pageerror', (error) => captured.pageErrors.push(error.message));
  page.on('request', (request) => {
    captured.requests.push({
      url: request.url(), method: request.method(), kind: request.resourceType(), body: request.postData(),
    });
    if (captured.interacting) captured.interactionRequests.push(request.url());
  });
});

test.afterEach(async ({ page, baseURL, context }) => {
  const stored = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
    databases: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
    serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
  }));
  expect.soft(stored).toEqual({ local: 0, session: 0, cookies: '', databases: 0, caches: 0, serviceWorkers: 0 });
  expect.soft(await context.cookies()).toEqual([]);
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const captured = evidence.get(page)!;
  for (const request of captured.requests) {
    const url = new URL(request.url);
    expect.soft(url.origin).toBe(new URL(baseURL!).origin);
    expect.soft(url.search).toBe('');
    expect.soft(url.hash).toBe('');
    expect.soft(url.pathname === '/' || url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg').toBe(true);
    expect.soft(request.method).toBe('GET');
    expect.soft(request.body).toBeNull();
    expect.soft(['document', 'script', 'stylesheet', 'image', 'font', 'other']).toContain(request.kind);
    expect.soft(decodeURIComponent(request.url)).not.toContain('demo@example.com');
    expect.soft(decodeURIComponent(request.url)).not.toContain('Demo123!');
  }
  // No requests of any kind are permitted while credentials or ages are entered.
  expect.soft(captured.interactionRequests, 'inputs must not initiate requests').toEqual([]);
  expect.soft(captured.consoleMessages, 'browser console must remain clean').toEqual([]);
  expect.soft(captured.pageErrors, 'uncaught page errors must remain absent').toEqual([]);
});

/**
 * Enter through the initial route and use the public login UI without stubs.
 *
 * Args:
 *   page: Fresh browser page with evidence hooks already installed.
 */
async function enterAgeView(page: Page) {
  await page.goto('/');
  await expect(page.getByLabel('Age', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check Age' })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  evidence.get(page)!.interacting = true;
  await page.getByLabel('Email', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Demo123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Enter your age' })).toBeFocused();
  await expect(page.getByLabel('Age', { exact: true })).toHaveValue('');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByText(/completed years/)).toContainText('18 as its threshold');
  await expect(page.getByText(/not legal advice/)).toContainText('Nothing is sent or saved.');
}

/**
 * Capture meaningful state evidence for human review in each viewport project.
 *
 * Args:
 *   page: Rendered state to inspect without altering its controls.
 *   testInfo: Per-test attachment and output destination.
 *   name: State name used for attachments.
 */
async function captureState(page: Page, testInfo: TestInfo, name: string) {
  const tree = await page.accessibility.snapshot();
  expect(tree).not.toBeNull();
  const styles = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#demo-age')!;
    const button = document.querySelector('button')!;
    const main = document.querySelector('main')!;
    const status = document.querySelector('[role="status"]')!;
    const bodyStyle = getComputedStyle(document.body);
    const inputStyle = getComputedStyle(input);
    const buttonStyle = getComputedStyle(button);
    const mainStyle = getComputedStyle(main);
    const statusStyle = getComputedStyle(status);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      body: { font: bodyStyle.fontFamily, background: bodyStyle.backgroundColor, color: bodyStyle.color },
      main: { width: mainStyle.width, margin: mainStyle.margin },
      input: { height: inputStyle.height, font: inputStyle.fontSize, border: inputStyle.borderColor, outline: inputStyle.outline },
      button: { height: buttonStyle.height, background: buttonStyle.backgroundColor, color: buttonStyle.color },
      status: { font: statusStyle.fontSize, border: statusStyle.borderTop },
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

for (const [raw, label] of [['0', 'Minor'], ['17', 'Minor'], ['18', 'Major'], ['19', 'Major']]) {
  test(`age ${raw} produces ${label} with the submitted age and demo rule`, async ({ page }, testInfo) => {
    await enterAgeView(page);
    await page.getByLabel('Age', { exact: true }).fill(raw);
    await page.getByRole('button', { name: 'Check Age' }).click();
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(`Submitted age: ${raw}.`);
    await expect(page.getByRole('status')).toContainText(label === 'Major'
      ? 'In this demo, ages 18 or above are Major.' : 'In this demo, ages below 18 are Minor.');
    await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    await expect(page.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await captureState(page, testInfo, `age-${raw}-${label.toLowerCase()}`);
  });
}

for (const [name, raw] of [
  ['empty', ''], ['negative', '-1'], ['decimal', '17.5'], ['text', 'abc'],
  ['exponent', '1e2'], ['unsafe', '9007199254740993'], ['hostile', '<script>alert(1)</script>'],
]) {
  test(`rejects ${name} input, preserves raw text and permits correction`, async ({ page }, testInfo) => {
    await enterAgeView(page);
    const age = page.getByLabel('Age', { exact: true });
    await age.fill(raw);
    await page.getByRole('button', { name: 'Check Age' }).click();
    await expect(age).toHaveValue(raw);
    await expect(age).toBeFocused();
    await expect(age).toHaveAttribute('aria-invalid', 'true');
    await expect(age).toHaveAttribute('aria-describedby', 'age-rule age-error');
    await expect(page.getByRole('alert')).toHaveAttribute('id', 'age-error');
    await expect(page.getByRole('alert')).toContainText(name === 'unsafe'
      ? 'can be represented exactly' : 'non-negative whole-number age using digits only');
    await expect(page.getByRole('alert')).not.toContainText('<script>');
    await expect(page.locator('main script')).toHaveCount(0);
    await expect(page.getByRole('status')).toBeEmpty();
    await expect(page.getByRole('heading', { name: /^(Major|Minor)$/ })).toHaveCount(0);
    if (name === 'empty' || name === 'unsafe') await captureState(page, testInfo, `age-error-${name}`);
    await age.fill('18');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(age).toHaveAttribute('aria-invalid', 'false');
    await expect(age).toHaveAttribute('aria-describedby', 'age-rule');
    await age.press('Enter');
    await expect(page.getByRole('status')).toContainText('Submitted age: 18.');
    await expect(page.getByRole('heading', { name: 'Major', exact: true })).toBeVisible();
  });
}

test('trim, stale clearing, invalid correction, repeat and reload keep only current memory state', async ({ page }, testInfo) => {
  await enterAgeView(page);
  await captureState(page, testInfo, 'age-empty');
  const age = page.getByLabel('Age', { exact: true });
  await expect(age).toHaveAttribute('type', 'text');
  await expect(age).toHaveAttribute('inputmode', 'numeric');
  await age.fill(' 0018 ');
  await age.press('Enter');
  await expect(age).toHaveValue(' 0018 ');
  await expect(page.getByRole('status')).toContainText('Submitted age: 18.');
  await age.fill('17.5');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Major', exact: true })).toHaveCount(0);
  await age.press('Enter');
  await expect(page.getByRole('alert')).toBeVisible();
  await age.fill('17');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await age.press('Enter');
  await expect(page.getByRole('status')).toContainText('Submitted age: 17.');
  await age.press('Enter');
  await expect(page.getByRole('heading', { name: 'Minor', exact: true })).toBeVisible();
  await age.fill('19');
  await expect(page.getByRole('status')).toBeEmpty();
  await age.press('Enter');
  await expect(page.getByRole('status')).toContainText('Submitted age: 19.');
  await captureState(page, testInfo, 'age-repeated-major');
  // Reload is the intentional reset, not navigation to bypass UI sequencing.
  evidence.get(page)!.interacting = false;
  await page.reload();
  await page.waitForLoadState('networkidle');
  evidence.get(page)!.interacting = true;
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.getByLabel('Age', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await page.getByLabel('Email', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Demo123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByLabel('Age', { exact: true })).toHaveValue('');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('keyboard-only login, age error, correction and repeated checks preserve focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  evidence.get(page)!.interacting = true;
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.keyboard.type('demo@example.com');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.keyboard.type('Demo123!');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Enter your age' })).toBeFocused();
  await page.keyboard.press('Tab');
  const age = page.getByLabel('Age', { exact: true });
  await expect(age).toBeFocused();
  expect(await age.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Check Age' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(age).toBeFocused();
  await expect(page.getByRole('alert')).toBeVisible();
  await captureState(page, testInfo, 'age-keyboard-error');
  await page.keyboard.type('17');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Minor', exact: true })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('18');
  await expect(page.getByRole('status')).toBeEmpty();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Check Age' })).toBeFocused();
  expect(await page.getByRole('button', { name: 'Check Age' }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Submitted age: 18.');
  await captureState(page, testInfo, 'age-keyboard-major');
});
