# Construction Cost Estimator

[![License: GPL](https://img.shields.io/badge/License-GPL-yellow.svg)](https://opensource.org/licenses/GPL)
[![Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E.svg)](https://supabase.com/)

A web application for estimating construction project costs. Built with React and Supabase, it allows users to manage projects, calculate costs for materials, labor, equipment, and risks, and generate financial summaries. Supports multilingual interfaces, offline capabilities via PWA, and secure sharing.

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
- **Authentication**: Secure user auth via Supabase, with role-based access.
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
