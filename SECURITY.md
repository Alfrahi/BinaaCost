# Security Policy

The BinaaCost team takes the security of our application, our users, and their project cost estimates seriously.

---

## 1. Reporting a Vulnerability

If you discover a potential security vulnerability within this repository, **please do not open a public GitHub issue**.

### How to Report
Please privately report security issues to the maintainers by creating a **private security advisory** on GitHub or by contacting the project administrative team directly.

When reporting, please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step instructions or proof-of-concept code to reproduce the issue.
- The version or commit hash where the vulnerability was observed.
- Any suggested remediations or mitigations.

### Response Timeline
- We will acknowledge receipt of your vulnerability report within 48 hours.
- We will provide a status update or fix timeline within 7 days.
- Once a remediation is verified, a patch will be deployed and an advisory published.

---

## 2. Implemented Security Controls

The application enforces defense-in-depth security across both client and server layers:

### Authentication & Sessions
- User authentication is handled securely by PocketBase using industry-standard password hashing (bcrypt).
- **Session Protection (HttpOnly Cookies)**: To mitigate XSS token exfiltration, JWT session tokens are **not** stored in `localStorage`. 
  - A custom PocketBase hook (`pocketbase/pb_hooks/auth_cookie.pb.js`) issues an `HttpOnly`, `Secure` (in production), `SameSite=Strict` cookie (`pb_auth`) upon login.
  - The frontend uses a custom `CookieAuthStore` that saves only the user metadata to `localStorage` (as `pb_auth_record`) and relies on the browser to automatically transmit the secure cookie via `credentials: 'include'`.
  - A middleware hook automatically translates the cookie into an `Authorization` header for PocketBase's native auth engine.
- Authentication changes reactively clear query caches and reset offline queues to prevent cross-account session leaks.

### Content Security & XSS Mitigation
- A strict Content-Security-Policy (CSP) is enforced via `index.html` to restrict script execution, resource loading, and network connections (`connect-src`), mitigating the impact of Cross-Site Scripting (XSS).
- During production builds, `'unsafe-inline'` and `'unsafe-eval'` relaxations used for local Vite HMR should be stripped.

### Authorization & Collection Rules
- All database collections have strict access rules defined in PocketBase migrations.
- Project ownership is verified on all sensitive operations: project deletion, currency conversion, snapshot creation, and version restoration require project ownership or `super_admin` privilege.
- Financial parameters (`financial_settings` and `financial_settings_confirmed`) can only be modified by project owners or `super_admin` accounts; edits by shared collaborators are rejected with HTTP 403 ([editor_permissions.pb.js](pocketbase/pb_hooks/editor_permissions.pb.js)).

### External Share Links & Brute-Force Rate Limiting
- External share tokens are 48-character cryptographically secure random strings.
- Only the SHA-256 hash of the token (`token_hash`) is stored in the database.
- Link passwords are protected using PocketBase password hashing.
- Failed password attempts are rate-limited per token (maximum 20 failed attempts per 10-minute window tracked via `$app.store()`) to prevent brute-force attacks ([public_share.pb.js](pocketbase/pb_hooks/public_share.pb.js)).
- Public share endpoints redact raw project risk registers to prevent sensitive exposure while accurately reflecting contingency in totals.

### Offline Multi-Tenant Isolation
- Offline mutation queues and dead-letter queues in LocalForage are strictly scoped by `userId`.
- Offline idempotency indexes are compound-scoped to `(user_id, client_mutation_id)`, preventing cross-tenant denial-of-service or mutation collision attacks.

### Audit Logging
- Changes across 22 collections are automatically recorded by [audit_log.pb.js](pocketbase/pb_hooks/audit_log.pb.js).
- Credential fields (`password`, `token`, `password_hash`, etc.) are explicitly denylisted and never written to audit logs.
- Audit logs can only be read by `super_admin` accounts.

### Input Sanitization & Formula Injection Defense
- User-supplied rich text is sanitized using `DOMPurify` ([src/shared/lib/sanitizeText.ts](src/shared/lib/sanitizeText.ts)).
- CSV export values beginning with `=`, `+`, `-`, or `@` are escaped using `escapeCsvCell()` ([src/features/cost-library/utils/csv.ts](src/features/cost-library/utils/csv.ts)) to prevent spreadsheet formula injection attacks.
- Non-negative constraints (`min: 0`) are enforced on all numerical quantities, rates, and amounts at both Zod form boundaries and database schema levels.
