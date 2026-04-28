# E2E Tests

## Scope
Smoke H4.1, flows H4.2+. Vezi HANDOFF §4 (decizii LOCKED).

## Folder Structure
- `specs/` — test files (`.spec.ts`, anti-collision vitest)
- `fixtures/` — data, auth states (lazy populate H4.2)
- `helpers/` — utilities, page object models (lazy populate H4.2)

## Run Commands
- `npm run test:e2e` — rulează toate testele
- `npm run test:e2e:ui` — interactive UI mode
- `npm run test:e2e:debug` — debug cu inspector
- `npm run test:e2e:report` — show last HTML report

## Environment
`.env.local` trebuie să conțină `NEXT_PUBLIC_DEBUG_AUTH=true` pentru auth bypass DEV.
Override URL pentru preview/staging: setează `PLAYWRIGHT_BASE_URL`.
Default `http://localhost:3000` (webServer auto-pornește dev local).

## Browsers
- Chromium (Desktop Chrome)
- WebKit (Desktop Safari)
- Firefox: NU instalat (Decizia LOCKED #3)

## Future expansion (H4.2+)
- `fixtures/users/` — auth credentials (gitignored)
- `fixtures/storage-states/` — saved auth sessions (gitignored)
- `helpers/` — page object models, test utilities

## References
- [Playwright docs](https://playwright.dev)
- HANDOFF §4 (decizii LOCKED H4)
- ROADMAP §0 H4 (E2E Playwright)
