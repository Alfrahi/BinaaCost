# Construction Cost Estimator

[![License: GPL](https://img.shields.io/badge/License-GPL-yellow.svg)](https://opensource.org/licenses/GPL)
[![Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://reactjs.org/)
[![PocketBase](https://img.shields.io/badge/Backend-PocketBase-4285F4.svg)](https://pocketbase.io/)

A web application for estimating construction project costs. Built with React and PocketBase, it allows users to manage projects, calculate costs for materials, labor, equipment, and risks, and generate financial summaries. Supports multilingual interfaces, offline capabilities via PWA, and secure sharing.

## Features

- **Project Management**: Create, edit, and manage construction projects with details like type, size, location, duration, and client requirements.
- **Cost Estimation**: Break down costs into categories:
  - Materials: Quantity, unit price, total cost.
  - Labor: Workers, daily rates, total days.
  - Equipment: Rental costs, maintenance, fuel.
  - Additional Costs: Custom expenses.
  - Risks: Probability-based contingency planning.
- **Financial Calculations**: Automatic computation of direct costs, overhead, contingency, markup, tax, and grand total.
- **Scenario Simulation**: Simulate cost impacts (e.g., price increases) via Edge Functions.
- **Sharing & Collaboration**: Generate secure share links with passwords and expiration; Internal sharing options.
- **Reporting**: Generate PDF reports for proposals and cost breakdowns.
- **Internationalization (i18n)**: Support for multiple languages (e.g., English, Arabic) with RTL/LTR handling.
- **PWA Support**: Installable as a Progressive Web App for offline access.
- **Analytics & Charts**: Visualize costs with ECharts (bar/pie charts).
- **Authentication**: Secure user auth via PocketBase, with role-based access.
- **Admin Tools**: Manage users, subscriptions, and dropdown options.
- **Import/Export**: CSV import for cost items; Currency conversion.
- **Responsive Design**: Mobile-friendly with Tailwind CSS and Radix UI components.

## Demo

RTL Screenshots:

![Dashboard](screenshots/AR-Dashboard.png)
![Project](screenshots/AR-Project.png)
![Resource Library](screenshots/AR-Resources.png)
![Cost Database](screenshots/AR-Cost-Database.png)
![Analytics](screenshots/AR-Analytics.png)

LTR Screenshots:

![Dashboard](screenshots/EN-Dashboard.png)
![Project](screenshots/EN-Project.png)
![Resource Library](screenshots/EN-Resources.png)
![Cost Database](screenshots/EN-Cost-Database.png)
![Analytics](screenshots/EN-Analytics.png)

## Getting Started (Development)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Start PocketBase backend
```bash
cd pocketbase
./pocketbase serve --dev
```
- Migrations in `pocketbase/pb_migrations/` apply automatically on first run.
- Admin UI: http://127.0.0.1:8090/_/
- API base: http://127.0.0.1:8090

### 3. Configure environment
Copy `.env.example` to `.env` and set:
```bash
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```
(Optional) Create an initial super_admin via:
```bash
PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret ./pocketbase serve
```

### 4. Start frontend dev server
```bash
pnpm dev
```

### 5. Run tests
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e  # needs ./pocketbase serve on :8090 and `pnpm dev` on :8080 already running
```
