# Developer Workflow & Setup Guide

This document describes how to configure your local development environment, start the PocketBase backend and Vite frontend, execute build and quality commands, and adhere to project engineering conventions.

---

## 1. Prerequisites

Ensure your development environment meets the following requirements:
- **Node.js**: `v20.x` or higher (`v20.19.x+` recommended).
- **pnpm**: `v9.x` or higher (`pnpm` is the required package manager; do not use `npm` or `yarn`).
- **PocketBase**: Pre-compiled binary is located at `pocketbase/pocketbase` (Linux x86_64). For other platforms, download PocketBase v0.28.0 from [pocketbase.io](https://pocketbase.io).
- **Operating System**: Linux / macOS recommended.

---

## 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Scope | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_POCKETBASE_URL` | Client (Vite) | **Yes** | `http://127.0.0.1:8090` | Base URL of the PocketBase backend instance. Throws an error on startup if unset. |
| `PB_ADMIN_EMAIL` | Server (Seed) | Optional | `admin@local.dev` | Email address used by migration `1700000001_seed.js` to seed a default `super_admin` user on initial database creation. |
| `PB_ADMIN_PASSWORD` | Server (Seed) | Optional | `localdev123` | Password for the initial `super_admin` user seeded during migration. |
| `CI` | Test (Playwright) | Optional | `true` (in CI) | Configures Playwright workers (1) and retries (2) when running inside automated CI pipelines. |
| `NODE_ENV` | Build / Test | Automatic | `development` / `production` | Standard Node environment variable. Controls debug logging in currency converter, i18n, and toasts. |

> [!WARNING]
> Never prefix administrative credentials (`PB_ADMIN_*`) with `VITE_`. Variables prefixed with `VITE_` are compiled into the client-side JavaScript bundle and exposed to all visitors.

---

## 3. Starting the Local Environment

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Start PocketBase Backend
In your first terminal:
```bash
cd pocketbase
./pocketbase serve --dev
```
- Migrations in `pb_migrations/` apply automatically on startup.
- The server listens on `http://127.0.0.1:8090`.
- PocketBase Admin UI: `http://127.0.0.1:8090/_/`.

*(Optional)* If you wish to bootstrap an initial super-admin account on first run:
```bash
PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret123 ./pocketbase serve --dev
```

### Step 3: Start Vite Frontend Server
In a second terminal:
```bash
pnpm dev
```
- Vite starts on `http://127.0.0.1:8080`.
- Hot module replacement (HMR) is enabled.

---

## 4. Available Package Scripts

The following commands are defined in [package.json](../package.json):

```bash
# Start local development server on http://127.0.0.1:8080
pnpm dev

# Typecheck and build the production bundle into dist/
pnpm build

# Preview the production build locally
pnpm preview

# Run TypeScript compiler check across all project files
pnpm typecheck

# Run ESLint across all files with zero warning tolerance
pnpm lint

# Run ESLint with automatic fixes
pnpm lint:fix

# Run Vitest unit and integration test suite
pnpm test

# Run Vitest test suite with code coverage report
pnpm coverage

# Run Playwright End-to-End tests across browsers
pnpm e2e
```

---

## 5. Engineering & Coding Conventions

### 1. Money Math & Rounding
- **Client**: Always use `decimal.js` ([src/shared/lib/math.ts](../src/shared/lib/math.ts)) for financial math. Never perform floating-point arithmetic on currency amounts. Round every intermediate loading half-up to two decimal places via `.toDecimalPlaces(2)`.
- **Server**: Server hooks in `pocketbase/pb_hooks/` use integer-cents math and round-half-up formulas (`Math.round((n + Number.EPSILON) * 100) / 100`).
- Both sides must produce identical cent-exact numbers for identical inputs.

### 2. Forms & Validation
- Use `react-hook-form` paired with `@hookform/resolvers/zod`.
- Co-locate Zod schemas with their feature modules.
- Ensure all numeric inputs enforce non-negative constraints (`z.number().min(0)`).

### 3. Data Fetching & Mutations
- Use TanStack React Query for all server state.
- Co-locate entity hooks under `src/features/<feature>/hooks/`.
- For mutations requiring offline support, use [useOfflinePb](../src/integrations/pocketbase/hooks/useOfflinePb.ts) or repository methods.

### 4. Internationalization & RTL
- Every user-visible string must use `useTranslation()` from `react-i18next`.
- Test layout in both LTR (English) and RTL (Arabic).
- Use Tailwind CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) instead of directional properties (`ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`).
- Maintain EN/AR parity in `public/locales/` (enforced by Vitest test).

### 5. Security & Sanitization
- User-supplied text strings rendered as HTML must be sanitized using `DOMPurify` via [src/shared/lib/sanitizeText.ts](../src/shared/lib/sanitizeText.ts).
- CSV export cells starting with `=`, `+`, `-`, or `@` must be escaped via `escapeCsvCell()` to prevent spreadsheet formula injection.
