# PLAN.md - Full App Delivery Plan (Poulet Etoile / Naomedia)

> Operational roadmap for the full application. This file is the planning board.
> `HANDOFF.md` is the recovery/status document. `CLAUDE.md` and `AGENTS.md` are the
> rules. Keep all three aligned after each meaningful change.

Current date: 08/07/2026  
Current status: **foundation + auth gate implemented, business app not finished**  
Database decision: **MySQL 8**, not PostgreSQL.

Legend:
- `[M]` Mehdi: product/schema decision owner.
- `[CC]` Claude Code: lead architecture, core business modules, design system.
- `[CX]` Codex: follower/builder for peripheral modules, lists, exports, audit/sessions.
- `[CC+CX]` Cross-review.

Rules for updating this plan:
- Mark an item `[x]` only when the code exists and has been verified.
- If an item is only documented or scaffolded, keep it unchecked.
- Every completed module must pass build, relevant tests, and a handoff update.
- Do not skip gates. The schema gate is especially important.

---

## 0. Missing Inputs And Blockers

| Item | Blocks | Current assumption |
|---|---|---|
| Docker Desktop running locally | Applying migration and seed to MySQL | Resolved 08/07/2026 |
| CDC PDF or extracted sections 14, 7.4, 16.2 | Exact product catalogue, KPI formulas, acceptance tests | Temporary seed and KPI assumptions only |
| Payment Q1: cheque/traite number and due date? | Payment schema and UI | Current schema has optional `reference`, no `date_echeance` |
| Payment Q2: payment per order or global client balance? | Payment model and KPI | Current model is per order |
| KPI Q3: include `RELIQUAT PAYEMENT` in KPI? | KPI formulas | Current seed treats it as a normal product |
| Naomedia Git remote URL | Push/delivery | Local repo only for now |

---

## 1. Real Status Snapshot

### Done

- [x] Next.js 15 app initialized with App Router, TypeScript strict, Tailwind 4, ESLint.
- [x] Git repo initialized.
- [x] Core dependencies installed: Prisma 7, MySQL adapter, decimal.js, Zod, Better Auth, TanStack Table, Recharts, PDF/Excel/Luxon/Vitest.
- [x] MySQL Docker compose file added.
- [x] `.env.example` added.
- [x] Prisma schema drafted for MySQL.
- [x] Initial MySQL migration SQL generated.
- [x] Prisma runtime client added in `lib/db.ts`.
- [x] Decimal/date/format helpers added.
- [x] BL formatting and transaction counter helper added.
- [x] Seed script drafted in `prisma/seed.ts`.
- [x] Better Auth schema migration added and applied.
- [x] Better Auth configured with MySQL-backed sessions.
- [x] Seed users migrated to Better Auth credential accounts.
- [x] Username/password authentication enabled via Better Auth username plugin.
- [x] Email sign-in endpoint disabled.
- [x] Basic login page, logout button, protected admin/commercial placeholders added.
- [x] Reference-style dashboard shell added for admin/commercial spaces based on the WhatsApp image.
- [x] Removed dashboard shell dead space: teal outer frame, forced shell min-height, stretched content area, and late `lg` admin grid breakpoint.
- [x] Server-side role helpers added: `requireSession`, `requireAdmin`, `requireCommercial`, `requireOwnerOrAdmin`.
- [x] Dedicated 403, 404 and 500/error pages added.
- [x] Verified: `npm run prisma:generate`.
- [x] Verified: `npx tsc --noEmit`.
- [x] Verified: `npm run test`.
- [x] Verified: `npm run lint`.
- [x] Verified: `npm run build`.
- [x] Smoke verified username auth on `http://localhost:3107`: `admin` / `password` -> `/admin`, wrong role -> `/403`, email sign-in -> 404.

### Not Done

- [x] MySQL container running.
- [x] Migration applied to real MySQL.
- [x] Seed executed against real MySQL.
- [ ] Schema reviewed and frozen by Mehdi.
- [x] Auth implemented.
- [ ] App layout/design system implemented.
- [ ] Admin/commercial business workflows implemented.
- [ ] PDF/Excel/KPI/audit/sessions implemented.
- [ ] Deployment implemented.

---

## 2. Phase 0 - Local Foundation And Database

Goal: get a reproducible local app with a real MySQL database and seeded data.

- [x] Initialize Next.js app.
- [x] Install core dependencies.
- [x] Add MySQL `docker-compose.yml`.
- [x] Add `.env.example`.
- [x] Add Prisma 7 config in `prisma.config.ts`.
- [x] Add Prisma MySQL runtime adapter in `lib/db.ts`.
- [x] Add `npm run seed`.
- [x] Start Docker Desktop.
- [x] Run `docker compose up -d mysql`.
- [x] Copy `.env.example` to `.env`.
- [x] Run `npm run prisma:migrate`.
- [x] Run `npm run seed`.
- [x] Verify seed data with Prisma Studio or a DB query.
- [ ] Commit the foundation once DB verification passes.

Gate G0:
- [x] `npm run build` passes.
- [x] `npm run test` passes.
- [x] MySQL migration applied.
- [x] Seed executed.
- [x] `HANDOFF.md` updated.

---

## 3. Phase 1 - Schema Freeze

Goal: make `prisma/schema.prisma` the locked source of truth before UI work expands.

- [x] Draft schema with French table/model mapping.
- [x] Include users, products, price history, clients, external clients, orders, order lines, payments, returns, system params, audit log.
- [x] Use Decimal for amounts and quantities.
- [x] Remove discount/markup from schema.
- [x] Add MySQL BL counter table.
- [x] Add initial migration SQL.
- [x] Draft seed data.
- [ ] Review schema field names with Mehdi.
- [ ] Decide whether `users` table name stays English because Better Auth expects it, or map to a French DB table while keeping auth compatibility.
- [ ] Decide payment Q1: add `date_echeance` for cheque/traite or keep `reference` only.
- [ ] Decide payment Q2: per-order payments or global client balance.
- [ ] Decide RELIQUAT KPI rule.
- [ ] Apply any schema changes requested by Mehdi.
- [ ] Regenerate migration if schema changes.
- [x] Apply migration to MySQL.
- [x] Run seed successfully.
- [ ] Mark schema frozen in `HANDOFF.md`.

Gate G1:
- [ ] Mehdi explicitly validates schema.
- [x] Migration and seed pass on MySQL.
- [x] `npm run prisma:validate`, `npm run test`, `npm run build` pass.
- [ ] Commit: `feat: freeze mysql prisma schema and seed`.

---

## 4. Phase 2 - Auth, Roles, Sessions

Goal: working login and server-side access control before business modules.

- [x] Configure Better Auth for MySQL-backed sessions.
- [x] Decide password hash strategy and align seed/login verification.
- [x] Implement username/password login page in French.
- [x] Implement logout.
- [ ] Add server auth helpers:
  - [x] `requireSession()`
  - [x] `requireAdmin()`
  - [x] `requireCommercial()`
  - [x] `requireOwnerOrAdmin()`
- [x] Route commercial users to commercial area.
- [x] Route admin users to admin area.
- [x] Update `derniere_connexion_at` on login.
- [x] Add dedicated 403 page.
- [x] Add dedicated 404 page.
- [x] Add dedicated 500/error boundary.
- [ ] Add tests for unauthorized access.
- [ ] Add tests for commercial blocked from admin routes.

Gate G2:
- [x] Login works with seeded admin and commercial users.
- [x] Admin seed is `admin` / `password`.
- [x] Email/password sign-in route disabled.
- [x] Server-side 403 verified.
- [x] Build/tests pass.
- [x] `HANDOFF.md` updated.

---

## 5. Phase 3 - App Shell And Design System

Goal: create the UI foundation every later module must reuse.

- [ ] Establish Tailwind tokens for app UI.
- [x] Create first-pass `AppShell`.
- [x] Create admin sidebar navigation.
- [x] Create commercial responsive navigation.
- [ ] Create reusable UI components:
  - [ ] `Button` with loading/disabled states.
  - [ ] `Input`, `Select`, `Textarea`.
  - [ ] Field error display.
  - [ ] `CardKPI`.
  - [ ] `DataTable` using TanStack Table with server pagination.
  - [ ] `BadgeStatut`.
  - [ ] `Modal` / `ConfirmDialog`.
  - [ ] `ChampMontant`.
  - [ ] `ChampQuantite`.
  - [ ] Date period filter.
- [x] Create commercial dashboard reference screen.
- [x] Create admin dashboard reference screen.
- [ ] Create admin list/form reference screen.
- [ ] Ensure empty/loading/error states are visually defined.
- [ ] Verify mobile layout.

Gate G3:
- [ ] Mehdi validates visual direction.
- [ ] Codex can start peripheral modules using existing UI components.
- [ ] Build passes.
- [ ] `HANDOFF.md` updated.

---

## 6. Phase 4 - Admin CRUD Foundation

Goal: admin can manage master data safely.

### 4A Products And Prices `[CC]`

- [ ] Product list with server pagination.
- [ ] Create product.
- [ ] Update product.
- [ ] Soft-delete/deactivate product.
- [ ] Price update writes `historique_prix` in the same transaction.
- [ ] Bulk price update as one transaction.
- [ ] Product price history screen.
- [ ] Prevent inactive products from appearing in new order selection.
- [ ] Test: changing reference price does not modify old order lines.

### 4B Users And Objectives `[CC]`

- [ ] User list.
- [ ] Create admin/commercial user.
- [ ] Activate/deactivate user.
- [ ] Soft-delete user.
- [ ] Reset password flow.
- [ ] Monthly objective CRUD.
- [ ] Tests for role restrictions.

### 4C Clients And External Clients `[CX]`

- [ ] Admin client list.
- [ ] Commercial client list limited to own clients.
- [ ] Create/update client.
- [ ] Soft-delete client.
- [ ] City select from predefined Morocco city list.
- [ ] External clients CRUD for admin.
- [ ] Server-side 403 if commercial accesses another commercial's client.
- [ ] Optional client merge only if confirmed.

Gate G4:
- [ ] Products/users/clients workflows pass.
- [ ] Audit entries written for sensitive changes.
- [ ] Build/tests pass.
- [ ] `HANDOFF.md` updated.

---

## 7. Phase 5 - Orders And Payments

Goal: complete the critical commercial workflow.

### 5A Shared Contracts

- [ ] Zod schema for creating an order.
- [ ] Zod schema for adding payment.
- [ ] Shared return types for order detail/list rows.
- [ ] Decimal-safe total calculation helpers.

### 5B Order Creation `[CC]`

- [ ] Commercial order form.
- [ ] Admin order form with commercial selector.
- [ ] External order support for admin.
- [ ] Server action `creerCommande`.
- [ ] Server reloads product prices and freezes `prix_unitaire`.
- [ ] Server calculates `prix_net`.
- [ ] Server ignores/rejects client-sent total mismatches.
- [ ] Transaction: BL counter lock + order + lines + audit.
- [ ] Anti double-submit UI.
- [ ] Server idempotency or uniqueness protection.
- [ ] Success screen with BL number.

### 5C Order Detail And Deletion

- [ ] Order detail page.
- [ ] Show lines, totals, paid amount, remaining amount.
- [ ] Calculated payment badge: `payé` or `en attente`.
- [ ] No edit screen.
- [ ] Admin-only soft delete.
- [ ] Audit deletion.

### 5D Payments `[CC]`

- [ ] Admin payment form.
- [ ] Validate payment amount <= remaining balance.
- [ ] Support modes: espèces, chèque, traite, autre.
- [ ] Optional `reference`.
- [ ] Add due date only if schema decision says yes.
- [ ] Recompute remaining amount after payment.
- [ ] Handle concurrent payments safely.
- [ ] Audit payment creation.

### 5E Critical Tests

- [ ] Decimal totals and rounding.
- [ ] Quantity precision to 3 decimals.
- [ ] Two concurrent order creations get distinct BL numbers.
- [ ] No `max+1` usage.
- [ ] Commercial cannot order for another commercial's client.
- [ ] Falsified totals rejected.
- [ ] Payment greater than remaining amount rejected.
- [ ] Fully paid order displays `payé`.

Gate G5:
- [ ] Cross-review by Codex.
- [ ] Build/tests pass.
- [ ] `HANDOFF.md` updated.

---

## 8. Phase 6 - Lists, Returns, PDF, Excel

Goal: complete operational views and outputs.

### 6A Order Lists `[CX]`

- [ ] Commercial sees only own orders.
- [ ] Admin sees all orders.
- [ ] Server pagination.
- [ ] Filters: period, commercial, client, external/standard, payment status.
- [ ] Inclusive Casablanca date filtering.
- [ ] Empty/loading/error states.

### 6B Returns `[CX]`

- [ ] Commercial return form.
- [ ] Product select.
- [ ] Quantity in kg.
- [ ] Comment field.
- [ ] Return linked automatically to logged-in user.
- [ ] No edit action.
- [ ] Server prevents update after creation.
- [ ] Admin/Commercial return lists as required.

### 6C PDF Delivery Note `[CX]`, Review `[CC]`

- [ ] PDF template with `@react-pdf/renderer`.
- [ ] Company facts read from `parametres_systeme`.
- [ ] BL prefix from params.
- [ ] Same formatting helpers as screen.
- [ ] No hardcoded company identity.
- [ ] Verify amounts match screen exactly.

### 6D Excel Export `[CX]`

- [ ] Excel export for filtered orders.
- [ ] French column names.
- [ ] Same amount/date formatting rules.
- [ ] Export respects permissions.

Gate G6:
- [ ] Commercial path works: create order -> list -> PDF.
- [ ] Export verified.
- [ ] Build/tests pass.
- [ ] `HANDOFF.md` updated.

---

## 9. Phase 7 - KPI, Audit, Sessions

Goal: management visibility and admin control.

### 7A KPI `[CC]`

- [ ] Central KPI module.
- [ ] Sales amount by period.
- [ ] Number of orders.
- [ ] Monthly objective gauge.
- [ ] Top clients.
- [ ] Top products.
- [ ] Admin consolidated dashboard.
- [ ] KPI per commercial.
- [ ] Unpaid amount = sum of remaining balances.
- [ ] Empty period shows `0,00 DH` or `-`, never NaN.
- [ ] Decide and implement RELIQUAT rule.
- [ ] Tests for formulas, empty periods, soft-deleted exclusions.

### 7B Audit `[CX]`

- [ ] Audit list for admin.
- [ ] Server pagination.
- [ ] Filters: user, entity, action, period.
- [ ] Readable before/after diff.
- [ ] Verify all sensitive actions write audit entries.

### 7C Sessions `[CX]`

- [ ] Active sessions screen.
- [ ] Display user, last activity, IP.
- [ ] Admin force logout.
- [ ] Server invalidates session immediately.

Gate G7:
- [ ] KPI checked manually against seed.
- [ ] Cross-review by Codex.
- [ ] Build/tests pass.
- [ ] `HANDOFF.md` updated.

---

## 10. Phase 8 - Hardening And Acceptance

Goal: make the app reliable outside the happy path.

- [ ] Full permission audit: anonymous, commercial, admin.
- [ ] Race-condition tests:
  - [ ] concurrent BL assignment.
  - [ ] concurrent payments.
- [ ] Validation messages in French.
- [ ] Server errors hide stack traces.
- [ ] Dedicated 403/404/500 verified.
- [ ] Empty states on every list.
- [ ] Loading states on every async action.
- [ ] Anti double-submit on every mutation.
- [ ] Mobile QA for commercial workflow.
- [ ] Admin table QA with large row counts.
- [ ] Run CDC section 16.2 acceptance tests once CDC is available.
- [ ] Add missing tests discovered during acceptance.

Gate G8:
- [ ] Acceptance checklist green.
- [ ] Build/tests pass.
- [ ] `HANDOFF.md` updated.

---

## 11. Phase 9 - Deployment And Delivery

Goal: production-ready deploy on VPS/Coolify.

- [ ] Production Dockerfile.
- [ ] Coolify configuration.
- [ ] Production env var documentation.
- [ ] Migration command for deploy.
- [ ] Seed/fixture policy for staging only.
- [ ] MySQL backup plan.
- [ ] README final.
- [ ] Technical choices document:
  - [ ] Next.js instead of Laravel/Vue.
  - [ ] MySQL decision.
  - [ ] no discount/markup.
  - [ ] payments table and calculated status.
  - [ ] BL counter strategy.
- [ ] Push to Naomedia remote.
- [ ] Final `HANDOFF.md` with operations notes.

Gate G9:
- [ ] App deployed to recipe/staging.
- [ ] Smoke tests pass on deployed URL.
- [ ] Client delivery package complete.

---

## 12. Parallel Work Matrix

| After gate | Claude Code | Codex |
|---|---|---|
| Before G3 | Foundation, schema, auth, design | Wait or review docs only |
| After G3 | Products/users, core flows | Clients/external clients |
| After G4 | Orders/payments | Prepare lists/returns, then cross-review orders |
| After G5 | KPI | Lists, returns, PDF, Excel |
| After G6 | KPI review/fixes | Audit and sessions |
| After G7 | Hardening assigned by module | Hardening assigned by module |

---

## 13. Verification Commands

Run after meaningful changes:

```bash
npm run prisma:validate
npm run prisma:generate
npx tsc --noEmit
npm run test
npm run lint
npm run build
```

When Docker Desktop is running:

```bash
docker compose up -d mysql
npm run prisma:migrate
npm run seed
```

For smoke test:

```bash
npm run start -- -p 3107
```

Then curl or open `http://localhost:3107`, and stop the server.

---

## 14. Execution Journal

- 08/07/2026 - Foundation created: Next.js, dependencies, MySQL schema draft, migration SQL, helpers, seed draft.
- 08/07/2026 - Verified locally: Prisma generate, TypeScript, tests, lint, build.
- 08/07/2026 - Docker Desktop started; MySQL container runs on host port `3307` to avoid Laragon's `3306`.
- 08/07/2026 - Migration `20260708163200_init_mysql` applied successfully to MySQL.
- 08/07/2026 - Seed executed successfully. Verified counts: 3 users, 8 products, 3 orders, 2 payments, BL counter `numero_bl = 3`.
- 08/07/2026 - Plan reset to truthful full-app roadmap after all checkboxes had been marked complete manually.
- 08/07/2026 - Better Auth schema migration applied: `sessions`, `accounts`, `verifications`, email fields on `users`, obsolete custom password hash removed.
- 08/07/2026 - Seed updated to create Better Auth credential accounts for admin and commercials.
- 08/07/2026 - Auth smoke verified on port `3107`: admin and commercial login work; wrong-role access redirects to `/403`.
- 08/07/2026 - Auth switched to username/password using Better Auth username plugin. Admin seed is `admin` / `password`; email sign-in endpoint returns 404.
- 08/07/2026 - Admin/commercial spaces restyled into a blue-sidebar dashboard shell matching the provided WhatsApp reference direction.
- 08/07/2026 - Dashboard shell spacing fixed: full-bleed light workspace, content-height shell, non-stretched content wrapper, admin two-column layout from `md`.
