# Contributing to BinaaCost

Thank you for your interest in contributing to BinaaCost! This document provides complete instructions for setting up your development environment, adhering to coding conventions, writing migrations and server hooks, running tests, and submitting contributions.

---

## 1. Development Principles

1. **The Codebase is the Authority**: Documentation, tests, and configuration must always reflect the actual working implementation. Never document speculative or planned functionality as implemented.
2. **Deterministic Calculations**: All monetary math must be cent-exact. Use `decimal.js` on the client with `.toDecimalPlaces(2)` and integer-cents / round-half-up math in server hooks.
3. **Offline Resilience**: Features that modify project data must handle transient network disconnects gracefully using the offline queue.
4. **Bilingual Parity**: Any new UI text must include translations for both English (`en`) and Arabic (`ar`), and must render properly in both LTR and RTL directions.

---

## 2. Environment Setup

### Prerequisites
- **Node.js**: `v20.x` or higher (`v20.19.x+` recommended)
- **pnpm**: `v9.x` or higher (`pnpm` is strictly required; do not use `npm` or `yarn`)
- **PocketBase**: Binary provided at `pocketbase/pocketbase` (Linux x86_64) or downloaded from [pocketbase.io](https://pocketbase.io) (v0.28.0)

### Getting Started Walkthrough
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd BinaaCost
   ```
2. **Install frontend dependencies**:
   ```bash
   pnpm install
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Verify that `VITE_POCKETBASE_URL` is set to `http://127.0.0.1:8090`.
4. **Start the PocketBase server**:
   In your first terminal:
   ```bash
   cd pocketbase
   ./pocketbase serve --dev
   ```
   Migrations in `pb_migrations/` will automatically apply.
5. **Start the frontend development server**:
   In a second terminal:
   ```bash
   pnpm dev
   ```
   Open `http://127.0.0.1:8080` in your browser.

---

## 3. Contributor Workflow & Commands

Before submitting code, always run the validation suite:

```bash
# 1. Typecheck the codebase
pnpm typecheck

# 2. Run linter (must pass with zero warnings)
pnpm lint

# 3. Run unit and integration tests
pnpm test run

# 4. (Optional) Run Playwright E2E tests
pnpm e2e
```

### Helpful Development Commands
- `pnpm lint:fix`: Automatically formats and fixes autofixable ESLint issues.
- `pnpm coverage`: Generates a Vitest code coverage report in `coverage/`.
- `pnpm build`: Performs a production build into `dist/`.
- `pnpm preview`: Serves the production build locally.

---

## 4. Code Architecture & Rules

### Module Boundaries
- Place feature-specific code in `src/features/<feature-name>/`.
- Place cross-cutting logic in `src/shared/` **only if used across 3 or more features**.
- Types must be co-located with their relevant feature or shared module; do not create generic global types files.

### Styling & RTL Rules
- Use Tailwind CSS with design tokens defined in [src/globals.css](src/globals.css).
- Always use logical utilities for padding, margins, and borders:
  - `ms-*` / `me-*` instead of `ml-*` / `mr-*`
  - `ps-*` / `pe-*` instead of `pl-*` / `pr-*`
  - `text-start` / `text-end` instead of `text-left` / `text-right`
- Test every new screen in both English (LTR) and Arabic (RTL).

### Adding Translations
1. When adding a key `myKey` in namespace `my_namespace`:
   - Add the English translation to `public/locales/en/my_namespace.json`.
   - Add the Arabic translation to `public/locales/ar/my_namespace.json`.
2. Run the locale parity regression test:
   ```bash
   pnpm test src/shared/lib/__tests__/locale-parity.test.ts
   ```

---

## 5. Working with PocketBase

### Writing Database Migrations
Migrations reside in `pocketbase/pb_migrations/`.
- Name your migration with a chronological timestamp or sequential prefix:
  `pocketbase/pb_migrations/1700000033_add_new_feature.js`
- Wrap schema modifications in `migrate((app) => { ... }, (app) => { ... })`.
- Ensure migrations are idempotent and specify `cascadeDelete: false` on foreign keys referencing `users`.
- Ensure numeric rate/quantity fields enforce `min: 0`.

### Writing JSVM Server Hooks
Server hooks reside in `pocketbase/pb_hooks/`.
- Keep handler functions self-contained (declare local helper functions inside the handler body to avoid Goja runtime closure scoping limitations).
- Protect sensitive data: strip credentials and sensitive settings from responses.
- Respect optimistic concurrency control (OCC) by passing `updated` timestamps.

---

## 6. Pull Request Guidelines

1. **Clear Scope**: Keep PRs focused on a single responsibility or bug fix.
2. **Tests Included**: Add unit or integration tests for new business calculations, components, or API endpoints.
3. **No Unused Imports**: ESLint is configured with `--max-warnings 0` and strict unused import detection.
4. **Documentation**: If your change modifies an API endpoint, calculation formula, or user workflow, update the corresponding documentation under `docs/`.

## 7. CI/CD Pipeline

When you submit a Pull Request, GitHub Actions will automatically run the following validation:

1. **Validation Workflow (`ci.yml`)**:
   - Install dependencies.
   - Run typecheck (`pnpm typecheck`).
   - Run linter (`pnpm lint`).
   - Run unit and integration tests with coverage (`pnpm coverage`).
   - Run the frontend build (`pnpm build`).
   - Verify PocketBase migrations (`./pocketbase migrate up`).

2. **End-to-End Tests (`e2e.yml`)**:
   - Starts a fresh PocketBase instance in the background.
   - Runs the Playwright test suite against Chromium (`pnpm e2e`).

If CI fails:
- Check the Actions tab for the specific job that failed.
- You can reproduce CI errors locally by running `pnpm check` (which runs typecheck, lint, and unit tests) or `pnpm e2e`.
- For Playwright failures, download the `playwright-report` artifact from the Actions page to view traces and screenshots of the failure.

## 8. Git Hooks

To maintain code quality and prevent pushing failing code, this repository uses Git hooks managed by **Husky**:

- **Pre-commit**: Runs `lint-staged` to automatically format and fix ESLint issues on your staged files.
- **Pre-push**: Runs `pnpm check` (typecheck, lint, and unit tests) before you can push your branch to GitHub.

If you ever need to bypass these hooks (e.g., to push a draft work-in-progress branch), you can append `--no-verify` to your git command:
```bash
git commit -m "wip" --no-verify
git push origin my-branch --no-verify
```
