# Age Status Demo

A compact, browser-only Vite + React + TypeScript demonstration: log in with public credentials, enter an age, and see **Major** (18 or above) or **Minor** (below 18).

## Try it locally

Requires Node 20.19+ and npm. From the repository root:

```sh
cd frontend
npm ci --no-bin-links
npm run dev
```

Open the local URL printed by Vite (default port 5173).

Public demonstration credentials:
- Email: `demo@example.com`
- Password: `Demo123!`

**Do not enter a real password.** Login is a client-side simulation, not secure authentication or proof of identity. Classification is a demo rule, not verified age or jurisdiction-specific legal advice.

## Behavior and privacy

- Email is trimmed; password is compared exactly, including case and whitespace.
- Age accepts trimmed ASCII digits, including zero and leading zeros. Negative numbers, decimals, exponent notation, empty/text input and integers above JavaScript's safe-integer limit (9007199254740991) are rejected rather than rounded. This is a representation limit, not a maximum human age.
- Editing age clears the old result. Correct and repeat checks without logging in again.
- Session, input and result stay in React memory. Reload returns to a clean login.
- No backend, database, API calls, browser persistence, analytics, or remote fonts. Static files are downloaded, but credentials and age are neither transmitted nor saved by the app.
- Native labeled controls, associated validation, polite status feedback, keyboard focus and responsive layout are included.

## Commands

Run from `frontend/`:

```sh
npm test
npm run test:coverage
npm run typecheck
npm run test:e2e:install
npm run test:e2e
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Scripts invoke Node package entries directly, so they work where npm bin symlinks are disabled. Playwright starts, checks and stops its own production-preview server; do not start another server on its configured port. Desktop Chromium and Pixel 5 Chromium projects run sequentially. Screenshots and accessibility/style/HTML attachments appear in `test-results/` and the HTML report in `playwright-report/`.

If your shell supplies `NODE_ENV=development`, set it to `production` before building. POSIX example: `NODE_ENV=production npm run build`. PowerShell: `$env:NODE_ENV='production'; npm run build`. Browser test configuration sets this explicitly for its preview build.

Optional tooling overrides are documented in `frontend/.env.example`; copy to ignored `.env.local` or set process variables. No secrets or runtime API configuration are needed. Keep `PLAYWRIGHT_PORT` and `PLAYWRIGHT_BASE_URL` consistent. Vite's static output is `frontend/dist/`; changing tooling env does not alter already-built assets.

## Static deployment

Serve `frontend/dist/` from a static host. Use an index.html fallback for unknown paths. No Node process or backend is required in production.

The included two-stage Dockerfile builds with Node and serves with nginx:

```sh
docker build -t age-status-demo frontend
docker run --rm -p 8080:80 age-status-demo
```

Open port 8080. nginx listens on container port 80, serves `/`, provides `/healthz`, and falls back to index.html. No phantom backend proxy or compose stack is present. Build context is `frontend/`.

## Verification performed

- Login feature: 58 unit/component cases passed before its commit.
- Age feature and shared gate: 77 cases passed before its commit (shared App cases overlap with login).
- Final distinct suite: **122 tests across 6 files**, with **100% statements, branches, functions and lines** for the six behavioral modules. Bootstrap/config files are not included in that coverage claim.
- Read-only test critic: PASS, score 1.00, zero high failures.
- Preflight: 8 desktop/mobile cases passed; accessibility tree, computed styles and HTML reviewed; screenshots saved.
- Full browser suite: **62 tests passed**, no skipped/flaky cases; actual login-to-age journeys, invalid inputs, repeat/reload, keyboard, no overflow, no browser console messages/errors, no input requests or storage.
- Strict TypeScript and production Vite build passed.
- Docker image build, nginx configuration/startup, `/healthz`, and unknown-route fallback passed.

API, database and backend-integration tests do not apply. Cross-feature wiring is tested through App component tests and real browser journeys. Testing covered Chromium desktop/mobile emulation, not Safari, Firefox or physical devices.

### Known tooling advisories

`npm audit --omit=dev` reports **zero runtime dependency advisories**. The full audit reports **8 development/test-tooling advisories** (2 moderate, 3 high, 3 critical) involving pinned Vite/esbuild, Vitest/coverage/mocker/tinypool and Playwright. These tools are absent from the nginx runtime image. Do not expose development or test servers publicly or run untrusted test code. Review and upgrade the tooling before expanding beyond this controlled demo; rerun coverage and browser tests after upgrades. This is a disclosed limitation, not a clean full dependency audit.

## Source layout

- `frontend/src/features/login/` — credential validator, login view and tests.
- `frontend/src/features/age/` — exact age validator, entry/result components and tests.
- `frontend/src/App.tsx` — memory-only workflow gate.
- `frontend/e2e/` — per-feature browser journeys.
- `frontend/*config.ts` — strict build and test configuration.
- `graphify-out/graph.json` — code graph for downstream specification synthesis.

The canonical discovery PRD was the source of truth; HLD and LLD were absent. TypeScript, module layout and visual choices were inferred and documented in the pipeline development plan. Registration, real accounts, persistence and legal eligibility are deliberately out of scope.
