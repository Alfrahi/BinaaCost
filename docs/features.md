# Application Features & Functional Reference

This document provides a comprehensive inventory of the features implemented in BinaaCost, mapped directly to their source code locations and backend integrations.

---

## 1. Feature Map

| Feature | Primary UI / Route | Source Directory | Backend Integration |
| :--- | :--- | :--- | :--- |
| **Authentication** | `/login` | `src/features/auth/` | PocketBase `users` collection |
| **Dashboard** | `/` | `src/pages/dashboard/` | `projects` collection |
| **Project Details & Tabs** | `/projects/:id` | `src/features/projects/project-core/` | `projects`, `comments`, `project_groups` |
| **Project Costing** | `/projects/:id?tab=costs` | `src/features/projects/project-costs/` | `materials`, `labor_items`, `equipment_items`, `additional_costs` |
| **Risk Management** | `/projects/:id?tab=risks` | `src/features/projects/project-costs/` | `risks` collection |
| **Profit & Pricing** | `/projects/:id?tab=profit-pricing` | `src/features/projects/project-core/` | `projects.financial_settings`, `editor_permissions.pb.js` |
| **Scenario Simulation** | `/projects/:id?tab=scenario-analysis`, `/analytics` | `src/features/projects/project-analytics/` | `simulate.pb.js` (`POST /api/projects/{id}/simulate`) |
| **Reports & Proposals** | `/projects/:id?tab=reports` | `src/features/projects/project-reports/` | Client-side proposal engine, `react-to-pdf` |
| **Project Versions** | `/projects/:id?tab=versions` | `src/features/projects/project-versions/` | `project_versions` collection, `versions.pb.js` |
| **Project Sharing** | Project Detail header | `src/features/projects/project-sharing/` | `project_shares`, `shared_project_links`, `public_share.pb.js` |
| **Cost Library** | `/cost-library` | `src/features/cost-library/` | `cost_databases`, `cost_database_items`, `cost_assemblies`, `library_*` |
| **Administration** | `/admin/*` | `src/pages/admin/`, `src/features/admin/` | `admin_users.pb.js`, `audit_logs`, `dropdown_settings`, `app_settings` |
| **User Settings** | `/settings` | `src/pages/settings/`, `src/features/settings/` | Profile update, password change, company financial defaults |

---

## 2. Authentication & Account Management

- **Implementation**: [src/features/auth/](../src/features/auth/)
- **Features**:
  - Email and password login via PocketBase auth collection.
  - Optional self-signup enabled or disabled via `app_settings.user_signup`.
  - Automatic session restoration and reactive auth observer via `pb.authStore.onChange`.
  - Offline queue initialization on login and clean reset on logout.
  - Role gating: [ProtectedRoute.tsx](../src/app/router/ProtectedRoute.tsx) for authenticated access, [AdminRoute.tsx](../src/app/router/AdminRoute.tsx) for `super_admin`.

---

## 3. Projects & Work Breakdown Structure

- **Implementation**: [src/features/projects/project-core/](../src/features/projects/project-core/)
- **Features**:
  - Project creation, editing, soft-deletion (`deleted_at`), and restoration.
  - Project duplication/cloning ([useCloneProject.ts](../src/features/projects/project-core/hooks/useCloneProject.ts)), copying the project and all child line items.
  - Project groups: Work breakdown structure (WBS) grouping for line items.
  - Collaborative item comments ([CommentsDrawer.tsx](../src/features/projects/project-core/components/CommentsDrawer.tsx)), allowing users to comment on specific materials, labor, equipment, or risk items.

---

## 4. Project Costing

- **Implementation**: [src/features/projects/project-costs/](../src/features/projects/project-costs/)
- **Features**:
  - **Materials**: Name, quantity, unit, unit price, supplier notes.
  - **Labor**: Worker trade, number of workers, daily rate, total days, auto-calculated total cost.
  - **Equipment**: Rental vs purchase toggle, quantity, period cost, period unit, usage duration, maintenance and fuel costs.
  - **Additional Costs**: Category dropdown (Permits, Insurance, Transport, Utilities, etc.) with custom amounts.
  - **Quick Add Row**: Rapid inline item creation without opening dialogs.
  - **Cost Database Picker**: Search and import items directly from master CSI cost databases.
  - **Assembly Integration**: Import pre-built multi-trade assemblies into the project with scaling multipliers.
  - **CSV Import**: Import project items via CSV with field mapping and validation against Zod schemas.

---

## 5. Risk Register & Contingency Planning

- **Implementation**: [src/features/projects/project-costs/hooks/useProjectRisks.ts](../src/features/projects/project-costs/hooks/useProjectRisks.ts), [RiskManagementTable.tsx](../src/features/projects/project-core/components/RiskManagementTable.tsx)
- **Features**:
  - Risk item identification: Description, probability (Low/Medium/High), impact amount, mitigation plan, contingency amount.
  - Expected monetary value calculation (`impact_amount * probability_weight`).
  - Integration with financial settings: Contingency basis can be selected as `flat`, `risk_register`, or `combined`.

---

## 6. Financial Loading & Pricing

- **Implementation**: [src/shared/logic/financials.ts](../src/shared/logic/financials.ts), [ProfitPricingSummaryCard.tsx](../src/features/projects/project-core/components/ProfitPricingSummaryCard.tsx)
- **Features**:
  - Direct cost rollup across all four categories.
  - Location factor adjustment with city multiplier and label.
  - Overhead percentage loading.
  - Contingency calculation (Flat, Risk-based, or Combined).
  - Markup percentage loading to determine pre-tax Bid Price.
  - Tax percentage loading to determine final Grand Total.
  - Gross Margin % calculation against Bid Price.
  - Financial settings confirmation lock (`financial_settings_confirmed`).
  - Role protection: Server hook [editor_permissions.pb.js](../pocketbase/pb_hooks/editor_permissions.pb.js) prevents editors from altering financial loading percentages.

---

## 7. Scenario Simulation & Sensitivity Analysis

- **Implementation**: [src/features/projects/project-analytics/](../src/features/projects/project-analytics/)
- **Features**:
  - Server-side simulation engine via [simulate.pb.js](../pocketbase/pb_hooks/simulate.pb.js).
  - Impact rules:
    - Materials: Percentage or fixed increase on unit price, filtered by item name.
    - Labor: Rate increase or schedule extension (total days increase).
    - Equipment: Period cost increase or usage duration extension.
    - Additional Costs: Category-specific adjustments.
    - Risk Realization: Realize a risk from the register as an active additional cost.
    - Financial Settings: Adjust location factor, overhead %, contingency %, markup %, or tax %.
  - Side-by-side original vs simulated cost breakdown and ECharts visualizations.

---

## 8. Reports & Proposals

- **Implementation**: [src/features/projects/project-reports/](../src/features/projects/project-reports/)
- **Features**:
  - **Client Proposal**: Formats estimate into a formal client presentation with executive summary, scope of work, financial breakdown, terms, and acceptance signature blocks.
  - **Internal Breakdown**: Detailed cost breakdown showing materials, labor, equipment, overheads, and contingencies.
  - **Quality Control / Incomplete Items Warning**: Identifies line items with missing or zero unit prices, zero quantities, or unassigned groups before report generation.
  - **PDF Export**: Client-side high-resolution PDF generation using `react-to-pdf` with automatic light theme forcing for print clarity.

---

## 9. Project Versioning & Conflict Resolution

- **Implementation**: [src/features/projects/project-versions/](../src/features/projects/project-versions/)
- **Features**:
  - Snapshot creation capturing all line items, groups, project settings, and pre-calculated financials.
  - Side-by-side version comparison with category-by-category delta calculations.
  - Three-way visual diffing between current project state and target version snapshot.
  - Category-by-category conflict resolver allowing users to selectively choose whether to keep current items or restore snapshot items.
  - Transactional version restore with automatic rollback snapshot capture.
  - Finalized versions: Versions can be locked as "Final" (`is_final: true`). Finalized versions cannot be modified, deleted, or restored.

---

## 10. Sharing & Collaboration

- **Implementation**: [src/features/projects/project-sharing/](../src/features/projects/project-sharing/)
- **Features**:
  - **Internal Team Sharing**: Invite registered users by email with `viewer` (read-only) or `editor` (can edit items, cannot alter financial settings) roles.
  - **External Share Links**: Generate secure public links with 48-character tokens, required expiration dates, and optional passwords.
  - **Public Share View** (`/public-share/:accessToken`): Clean, branded read-only estimate viewer with server-calculated financials and redacted internal risk registers.

---

## 11. Cost Library

- **Implementation**: [src/features/cost-library/](../src/features/cost-library/)
- **Features**:
  - **Cost Databases**: Master databases supporting CSI MasterFormat classifications, city location multipliers, and bulk CSV import.
  - **Assemblies**: Pre-assembled parametric templates containing combinations of materials, labor, equipment, and additional costs.
  - **User Libraries**: Personal libraries of standard materials, labor rates, and equipment costs with deduplicated upsert synchronization.

---

## 12. Administration Console

- **Implementation**: [src/pages/admin/](../src/pages/admin/), [src/features/admin/](../src/features/admin/)
- **Features**:
  - **User Management**: Create, edit, inspect, and delete users; toggle `user` vs `super_admin` roles.
  - **Project Management**: View active and soft-deleted projects across the platform, restore deleted projects, or permanently delete records.
  - **Ownership Transfer**: Transfer ownership of any project from one user to another; cascades ownership to all child line items and links.
  - **Dropdown Settings**: Manage customizable dropdown options for project types, units, categories, and risk probabilities with English and Arabic translations.
  - **App Settings**: Toggle platform-wide settings (e.g. self-registration enabled/disabled).
  - **Audit Logs**: Filterable audit trail viewer with search, action filtering (CREATE/UPDATE/DELETE), and expandable JSON diffs.
