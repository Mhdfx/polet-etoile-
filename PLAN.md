# PLAN.md - Full App Delivery Plan (Coq Plus / Naomedia)

> Operational roadmap for the full application. This file is the planning board.
> `HANDOFF.md` is the recovery/status document. `CLAUDE.md` and `AGENTS.md` are the
> rules. Keep all three aligned after each meaningful change.

Current date: 13/07/2026
Current status: **code fonctionnel + corrections post-QA navigateur terminees, incluant selection auto du client cree dans une commande ; QA appareil, comparaison PDF/XLSX et deploiement restent separes**
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
- [x] Work committed in logical commits (foundation, auth, shell, docs, tests, design system).
- [x] Vitest permission tests for auth guards (anonymous, wrong role, owner-or-admin, inactive/soft-deleted user).
- [x] shadcn/ui initialized (Nova preset, Tailwind 4) with base primitives in `components/ui/`.
- [x] Brand design tokens in `app/globals.css` (blue sidebar, light workspace, KPI red/blue/green).
- [x] Reusable kit: `Bouton`, `Champ`, `ChampMontant`, `ChampQuantite`, `CarteKPI`, `BadgeStatut`, `DataTable`, `DialogueConfirmation`, `FiltrePeriode` + `lib/saisie.ts` (tested).
- [x] Admin reference screen `/admin/produits`: read-only list, server pagination, search, empty/loading states, reference form dialog with Zod field errors.
- [x] Smoke verified `/admin/produits`: admin 200 with data + formatted prices, search, empty state; commercial -> `/403`; anonymous -> `/connexion`.
- [x] Admin users/objectives module added: list, create user, activate/deactivate, soft delete, password reset, monthly objective upsert.
- [x] User-management validation extracted to shared helpers (`lib/validations/commun.ts`, `lib/validations/utilisateur.ts`).
- [x] Smoke verified `/admin/utilisateurs`: admin 200, objectives page 200, commercial -> `/403`.
- [x] Admin clients/external clients module added: lists, search, create/update, soft delete, city select, commercial assignment, audit.
- [x] Commercial clients module added: own-client list, search, create/update, soft delete, ownership guard.
- [x] Tests added for client admin CRUD, external client CRUD, commercial ownership and `/403` protection.
- [x] Shared order contracts/calculations added: Decimal-safe line totals, payment input schema, order detail/list types.
- [x] Order creation added for commercial and admin: active product/client selection, external admin orders, server-side price freezing, BL transaction, audit, falsified-total rejection.
- [x] Order detail, admin soft-delete and admin payments added.
- [x] Order lists, returns, PDF BL and Excel exports added for admin/commercial.

### Not Done

- [x] MySQL container running.
- [x] Migration applied to real MySQL.
- [x] Seed executed against real MySQL.
- [ ] Schema reviewed and frozen by Mehdi.
- [x] Auth implemented.
- [x] App layout/design system implemented (visual validation by Mehdi pending — gate G3).
- [x] Admin/commercial business workflows implemented through Phase 6 (products, users, clients, orders, payments, returns, PDF, Excel).
- [x] KPI/audit/sessions implemented.
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
- [x] Commit the foundation once DB verification passes.

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
- [x] Add server auth helpers:
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
- [x] Add tests for unauthorized access.
- [x] Add tests for commercial blocked from admin routes.

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

- [x] Establish Tailwind tokens for app UI (`app/globals.css`, shadcn Nova preset + brand palette).
- [x] Create first-pass `AppShell`.
- [x] Create admin sidebar navigation.
- [x] Create commercial responsive navigation.
- [x] Create reusable UI components:
  - [x] `Button` with loading/disabled states (`components/bouton.tsx`).
  - [x] `Input`, `Select`, `Textarea` (shadcn, `components/ui/`).
  - [x] Field error display (`components/champ.tsx`).
  - [x] `CardKPI` (`components/carte-kpi.tsx`).
  - [x] `DataTable` using TanStack Table with server pagination (`components/data-table.tsx`).
  - [x] `BadgeStatut` (`components/badge-statut.tsx`).
  - [x] `Modal` / `ConfirmDialog` (`components/dialogue-confirmation.tsx` — not yet exercised on a screen).
  - [x] `ChampMontant` (`components/champ-montant.tsx` + `lib/saisie.ts` tested).
  - [x] `ChampQuantite` (`components/champ-quantite.tsx` — not yet exercised on a screen).
  - [x] Date period filter (`components/filtre-periode.tsx` — not yet exercised on a screen).
- [x] Create commercial dashboard reference screen.
- [x] Create admin dashboard reference screen.
- [x] Create admin list/form reference screen (`/admin/produits`, read-only until schema freeze).
- [x] Ensure empty/loading/error states are visually defined (empty + skeleton in DataTable, field errors in reference form, dedicated 403/404/500).
- [ ] Verify mobile layout.

Gate G3:
- [ ] Mehdi validates visual direction.
- [x] Codex can start peripheral modules using existing UI components.
- [x] Build passes.
- [x] `HANDOFF.md` updated.

---

## 6. Phase 4 - Admin CRUD Foundation

Goal: admin can manage master data safely.

### 4A Products And Prices `[CC]`

- [x] Product list with server pagination.
- [x] Create product (duplicate active name rejected server-side).
- [x] Update product (name/category; price via dedicated action).
- [x] Soft-delete/deactivate product.
- [x] Price update writes `historique_prix` in the same transaction (row locked `FOR UPDATE`).
- [x] Bulk price update as one transaction (`/admin/produits/prix`, all-or-nothing verified on MySQL).
- [x] Product price history screen (`/admin/produits/[id]/historique`).
- [x] Prevent inactive products from appearing in new order selection.
- [x] Test: changing reference price does not modify old order lines (unit + verified against real DB: order line kept `23,50` after price change).

### 4B Users And Objectives `[CC]`

- [x] User list.
- [x] Create admin/commercial user.
- [x] Activate/deactivate user.
- [x] Soft-delete user.
- [x] Reset password flow.
- [x] Monthly objective CRUD.
- [x] Tests for role restrictions.

### 4C Clients And External Clients `[CX]`

- [x] Admin client list.
- [x] Commercial client list limited to own clients.
- [x] Create/update client.
- [x] Soft-delete client.
- [x] City select from predefined Morocco city list.
- [x] External clients CRUD for admin.
- [x] Server-side 403 if commercial accesses another commercial's client.
- [ ] Optional client merge only if confirmed.

Gate G4:
- [x] Products/users/clients workflows pass (products/users/clients done; optional merge not requested).
- [x] Audit entries written for sensitive changes.
- [x] Build/tests pass.
- [x] `HANDOFF.md` updated.

---

## 7. Phase 5 - Orders And Payments

Goal: complete the critical commercial workflow.

### 5A Shared Contracts

- [x] Zod schema for creating an order.
- [x] Zod schema for adding payment.
- [x] Shared return types for order detail/list rows.
- [x] Decimal-safe total calculation helpers.

### 5B Order Creation `[CC]`

- [x] Commercial order form.
- [x] Admin order form with commercial selector.
- [x] External order support for admin.
- [x] Server action `creerCommande`.
- [x] Server reloads product prices and freezes `prix_unitaire`.
- [x] Server calculates `prix_net`.
- [x] Server ignores/rejects client-sent total mismatches.
- [x] Transaction: BL counter lock + order + lines + audit.
- [x] Anti double-submit UI.
- [x] Server uniqueness protection through locked BL counter and unique BL fields.
- [x] Success screen with BL number.

### 5C Order Detail And Deletion

- [x] Order detail page.
- [x] Show lines, totals, paid amount, remaining amount.
- [x] Calculated payment badge: `paye` or `en attente`.
- [x] No edit screen.
- [x] Admin-only soft delete.
- [x] Audit deletion.

### 5D Payments `[CC]`

- [x] Admin payment form.
- [x] Validate payment amount <= remaining balance.
- [x] Support modes: especes, cheque, traite, autre.
- [x] Optional `reference`.
- [ ] Add due date only if schema decision says yes.
- [x] Recompute remaining amount after payment.
- [x] Handle concurrent payments safely with command row lock.
- [x] Audit payment creation.

### 5E Critical Tests

- [x] Decimal totals and rounding.
- [x] Quantity precision to 3 decimals.
- [x] Locked BL counter covered at helper level.
- [x] No `max+1` usage.
- [x] Commercial cannot order for another commercial's client.
- [x] Falsified totals rejected.
- [x] Payment greater than remaining amount rejected.
- [x] Fully paid order displays `paye`.

Gate G5:
- [ ] Cross-review by Codex.
- [x] Build/tests pass.
- [x] `HANDOFF.md` updated.

---

## 8. Phase 6 - Lists, Returns, PDF, Excel

Goal: complete operational views and outputs.

### 6A Order Lists `[CX]`

- [x] Commercial sees only own orders.
- [x] Admin sees all orders.
- [x] Server pagination.
- [x] Filters: period, commercial/search client, external/standard, payment status.
- [x] Inclusive Casablanca date filtering.
- [x] Empty/loading/error states.

### 6B Returns `[CX]`

- [x] Commercial return form.
- [x] Product select.
- [x] Quantity in kg.
- [x] Comment field.
- [x] Return linked automatically to logged-in user.
- [x] No edit action.
- [x] Server prevents update after creation by exposing no update action.
- [x] Admin/Commercial return lists as required.

### 6C PDF Delivery Note `[CX]`, Review `[CC]`

- [x] PDF template with `@react-pdf/renderer`.
- [x] Company facts read from `parametres_systeme`.
- [x] BL prefix from params.
- [x] Same formatting helpers as screen.
- [x] No hardcoded company identity.
- [x] Verify amounts match screen exactly.

### 6D Excel Export `[CX]`

- [x] Excel export for filtered orders.
- [x] French column names.
- [x] Same amount/date formatting rules.
- [x] Export respects permissions.

Gate G6:
- [x] Commercial path works: create order -> list -> PDF.
- [x] Export verified.
- [x] Build/tests pass.
- [x] `HANDOFF.md` updated.

---

## 9. Phase 7 - KPI, Audit, Sessions

Goal: management visibility and admin control.

### 7A KPI `[CC]`

- [x] Central KPI module.
- [x] Sales amount by period.
- [x] Number of orders.
- [x] Monthly objective gauge.
- [x] Top clients.
- [x] Top products.
- [x] Admin consolidated dashboard.
- [x] KPI per commercial.
- [x] Unpaid amount = sum of remaining balances.
- [x] Empty period shows `0,00 DH` or `-`, never NaN.
- [ ] Decide and implement RELIQUAT rule.
- [x] Tests for formulas and empty periods.

### 7B Audit `[CX]`

- [x] Audit list for admin.
- [x] Server pagination.
- [x] Filters: user, entity, action, period.
- [x] Readable before/after diff.
- [x] Verify all sensitive actions write audit entries at module level.

### 7C Sessions `[CX]`

- [x] Active sessions screen.
- [x] Display user, last activity, IP.
- [x] Admin force logout.
- [x] Server invalidates session immediately.

Gate G7:
- [x] KPI checked manually against seed via smoke route.
- [ ] Cross-review by Codex.
- [x] Build/tests pass.
- [x] `HANDOFF.md` updated.

---

## 10. Phase 8 - Hardening And Acceptance

Goal: make the app reliable outside the happy path.

- [x] Full permission audit: anonymous, commercial, admin.
- [x] Race-condition lock tests:
  - [x] BL assignment uses locked counter (`FOR UPDATE`) and unique BL fields.
  - [x] Payments lock the command row before balance validation (`FOR UPDATE`).
- [x] Validation messages in French.
- [x] Server errors hide stack traces.
- [x] Dedicated 403/404/500 present; 403/404 smoke verified.
- [x] Empty states on key lists.
- [x] Loading states on async forms/actions.
- [x] Anti double-submit on mutations.
- [x] Security audit of auth, authorization, validation, files, exports and dependencies.
- [x] Same-origin guard on all mutating Better Auth API methods.
- [x] Production auth config hardened: origin allowlist, 32-char secret, 12-hour sessions.
- [x] Async exports isolated by owner/admin scope, validated and expired after 24 hours.
- [x] Logo upload restricted to signature-checked PNG/JPG; runtime serving confined to generated logo paths.
- [x] Security headers and private no-store headers on PDF/Excel responses.
- [x] Forwarded audit IP validation and production seed-password gate.
- [x] Security regression tests and `docs/SECURITY.md` added.
- [ ] Mobile visual QA for commercial workflow.
- [ ] Admin table QA with large row counts.
- [ ] Run CDC section 16.2 acceptance tests once CDC is available.
- [ ] Add missing tests discovered during acceptance.

Gate G8:
- [x] Code acceptance checklist green for local delivery scope.
- [ ] Browser/device acceptance checklist green (manual QA on local browser/mobile).
- [x] Build/tests pass.
- [x] `HANDOFF.md` updated.

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
- 08/07/2026 - All pending work committed in logical commits (foundation, auth, shell, docs). Working tree was previously fully uncommitted.
- 08/07/2026 - Vitest permission tests added for `lib/session.ts` guards: 17 tests (anonymous, wrong role, owner-or-admin, inactive and soft-deleted users).
- 08/07/2026 - shadcn/ui initialized (Nova preset, radix base) with button/input/textarea/select/label/badge/dialog/alert-dialog/table/skeleton/card. Brand tokens set in `globals.css`; `AppShell` migrated from hardcoded hex to tokens; sidebar nav items are now real links (inactive modules disabled with "Module à venir").
- 08/07/2026 - Reusable kit built: Bouton, Champ, ChampMontant, ChampQuantite, CarteKPI, BadgeStatut, DataTable (server pagination), DialogueConfirmation, FiltrePeriode. `lib/saisie.ts` (French decimal input normalization) added with tests. DialogueConfirmation/ChampQuantite/FiltrePeriode compile but are not yet used on a screen.
- 08/07/2026 - Reference screen `/admin/produits` added: read-only server-paginated product list with search, empty/loading states, and a reference "Nouveau produit" dialog (Zod field errors; real creation deferred to Phase 4 after schema freeze).
- 08/07/2026 - Smoke verified on `:3107`: admin sees products with `XX,XX DH` formatting, search + empty state work, commercial gets `/403`, anonymous gets `/connexion`. Note: stale server on port 3107 had to be killed; corrupted `.next` rebuilt.
- 08/07/2026 - Phase 4A products CRUD: server actions (create/edit/price change/bulk prices/activate/soft-delete) with `requireAdmin`, Zod French errors, audit written in the same transaction, price rows locked `FOR UPDATE`. New screens: actions column + dialogs on `/admin/produits`, price history page, bulk price page. `lib/audit.ts` + `lib/validations/produit.ts` added.
- 08/07/2026 - Phase 4A verified end-to-end on `:3107` by invoking the real server actions over HTTP: price change ok + French validation error + commercial blocked (303 to /403); DB checked — `prix_reference` updated, `historique_prix` rows correct, audit entries written, existing `lignes_commande` price untouched; bulk update applied 2 products atomically and a batch containing a missing product rolled back completely. Seed prices restored. 51 Vitest tests green.
- 08/07/2026 - Phase 4B users/objectives added: `/admin/utilisateurs`, create user with credential account, password reset with forced session deletion, activate/deactivate, soft delete, monthly objectives page. Validation helpers shared in `lib/validations/commun.ts`; 65 Vitest tests green.
- 08/07/2026 - User module smoke verified on `:3107`: admin loads `/admin/utilisateurs`, objective page returns 200, commercial is redirected to `/403`.
- 09/07/2026 - Phase 4C clients/external clients added: `/admin/clients` (standard clients + external clients), `/commercial/clients` (own portfolio only), shared client validation, Morocco city helper from `parametres_systeme`, audit on all mutations, commercial ownership `/403`; 75 Vitest tests green.
- 09/07/2026 - Phase 5A/5B order creation added: shared Zod contracts and Decimal order calculations, `/commercial/commandes/nouvelle`, `/admin/commandes/nouvelle`, server actions `creerCommandeCommercial`/`creerCommandeAdmin`, active-product reload and frozen prices, total mismatch rejection, BL via `attribuerNumeroBL`, audit. Smoke: both new pages 200, commercial admin page redirects to `/403`; 86 Vitest tests green.
- 09/07/2026 - Phase 5C/5D and Phase 6 added: order detail pages, admin payment form with locked balance validation, admin soft-delete, order lists with filters/status, commercial/admin returns, PDF BL routes, Excel exports. Smoke on `:3107`: admin/commercial lists 200, PDF 200 `application/pdf`, Excel 200 `.xlsx`, commercial wrong-role admin route -> `/403`; 93 Vitest tests green.
- 09/07/2026 - Phase 7 added: central KPI calculator, `/admin/kpi`, `/commercial/kpi`, `/admin/audit`, `/admin/sessions`, session force logout action with audit. Smoke on `:3107`: admin KPI/audit/sessions 200, commercial KPI 200, commercial admin audit -> `/403`; 97 Vitest tests green.
- 09/07/2026 - Phase 8 hardening pass: generic session server errors, lock assertions for BL/payment `FOR UPDATE`, route permission smoke (anonymous -> `/connexion`, wrong role -> `/403`, missing route -> 404), empty-state smoke for order/audit lists, full verification green with 98 Vitest tests. Remaining: CDC 16.2 unavailable, mobile visual QA and large-data table QA.
- 10/07/2026 - Security review completed: auth origin/session hardening, explicit login-CSRF guard, export owner/admin isolation with 24h retention, PNG/JPG signature validation, restricted runtime upload serving, audit IP validation, security/no-cache headers, production seed credential gate, dependency review and 110 Vitest tests. Residual risks documented in `docs/SECURITY.md`.
- 10/07/2026 - Coq Plus delivery reset completed: visible app/package/service branding changed to Coq Plus, default BL prefix changed to `CP`, Morocco city fallback expanded to 450 entries, missing-client commande validation clarified to "Choisir un client", `reset:delivery-data` added to clear business/demo data while preserving users/accounts, seed made delivery-clean by default (`SEED_DEMO_DATA=true` required for demo volume).
- 10/07/2026 - Browser-tested `/commercial/commandes/nouvelle` on production build `localhost:3107`: login `com1`, create inline client with city `Oualidia`, select `POULET ENTIER`, enter `12,750 kg`, submit order `CP-000001`, verify database line total `299.63`. Temporary browser-test data was reset afterward.
- 10/07/2026 - Final local delivery state verified: 9 user rows preserved (3 active seed users), 0 sessions, 0 clients, 0 commandes, 0 paiements, 0 retours, 0 audits, 0 objectifs, 26 products, counters `numero_bl=0` and `numero_bc=0`, params `raison_sociale=Coq Plus`, `prefixe_bl=CP`, `villes_maroc=450 villes`.
- 10/07/2026 - Verification after delivery reset: `npm run prisma:validate`, `npx tsc --noEmit`, `npm run lint`, `npm run test` (126/126), `npm run build` all PASS.
## Mise a jour Codex - reconciliation whatsleft - 09/07/2026

- [x] `whatsleft.md` remplace par un etat final propre : toutes les phases code
  CDC y sont marquees faites avec references de fichiers.
- [x] Ajout packaging livraison : `Dockerfile`, `.dockerignore`,
  `docs/DEPLOYMENT.md`, `docs/CDC_DEVIATIONS.md`, README mis a jour.
- [x] Les seuls restes dans `whatsleft.md` sont des validations externes ou
  decisions metier, pas des sections code a implementer.

## Mise a jour Codex - finition whatsleft - 09/07/2026

- [x] Upload binaire logo systeme (PNG/JPG/SVG, 2 Mo, audit, chemin public)
- [x] Creation client inline dans l'ecran commande admin/commercial
- [x] Categories vides + reordonnancement via `parametres_systeme.categories_produits`
- [x] Jobs d'export volumineux > 5 000 lignes pour commandes admin/commercial et audit
- [x] Verification finale : TypeScript, lint, build, tests 102/102

Restes avant livraison finale : QA mobile, QA volume navigateur, decisions metier
ouvertes, schema freeze Mehdi, deploiement recette.

## Mise a jour Codex - code readiness locale CDC - 09/07/2026

- [x] Deploiement sorti du scope immediat : objectif courant = code production-ready pour test local.
- [x] Page admin dediee `/admin/paiements` ajoutee : commandes a encaisser, KPI, historique paiements, liens vers encaissement.
- [x] Page admin `/admin/exports` ajoutee avec mention claire que les exports ne remplacent pas les sauvegardes infra Naomedia.
- [x] Audit minimal CDC connexion/deconnexion : `auth.connexion` et `auth.deconnexion`.
- [x] Objectifs commerciaux : blocage serveur des mois deja clos.
- [x] Filtres dates invalides : message utilisateur explicite sur commandes admin, commandes commercial et audit.
- [x] Nouvelle commande : brouillon local restaure apres reload/session expiree + message de perte reseau.
- [x] Verification finale relancee apres cette passe.
- [x] `npm run prisma:validate`
- [x] `npx tsc --noEmit`
- [x] `npm run test` (102/102)
- [x] `npm run lint`
- [x] `npm run build`
- [x] Build production passe par `next build` stable, pas Turbopack, pour eviter le chunk SSR manquant sur Windows.
- [x] Runtime smoke `npx next start -p 3111` : `/connexion`, `/admin/paiements`, `/admin/exports`, `/admin`, `/commercial`, filtre date invalide commandes admin.

## Mise a jour Codex - 09/07/2026

Phase whatsleft CDC code avancee :

- [x] `/admin/parametres`
- [x] `/commercial/commandes/externes`
- [x] fiches clients admin/commercial
- [x] KPI avances admin/commercial avec graphiques
- [x] fusion clients
- [x] exports audit/global
- [x] seed catalogue CDC + 1 000 commandes
- [x] listes commandes enrichies
- [x] categories produits + prix par pourcentage
- [x] fermeture de toutes les sessions utilisateur

Verification :

- [x] `npx tsc --noEmit`
- [x] `npm run test` (102/102)
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run seed`

Restes non clos : upload binaire logo, creation client inline, export async > 5 000,
QA mobile/volume navigateur, decisions RELIQUAT/date echeance/paiement global,
schema freeze explicite par Mehdi et deploiement.

## Mise a jour client - historique admins et catalogue complet - 10/07/2026

- [x] Ajouter `/admin/historique-admins` dans la navigation et les raccourcis admin.
- [x] Reutiliser le journal d'audit existant sans dupliquer les donnees.
- [x] Filtrer cote base les traces dont l'auteur a le role `ADMIN`.
- [x] Conserver filtres utilisateur/action/entite/periode et pagination.
- [x] Appliquer le meme filtre admin-only a l'export Excel.
- [x] Refuser la page au commercial (403) et a l'anonyme (connexion).
- [x] Charger tous les produits filtres sur `/admin/produits` en une page.
- [x] Retirer les controles Precedent/Suivant du catalogue uniquement.
- [x] Conserver recherche, CRUD, historique prix et prix en masse.
- [x] Corriger les overflows mobiles detectes sur produits, commandes,
  paiements, clients et utilisateurs.
- [x] Tester 16 routes admin et 7 routes commercial a 375 px.
- [x] TypeScript, lint, build production et 113/113 tests Vitest verts.
- [x] Verification navigateur production sur `http://localhost:3107`.

## Mise a jour client - BL modifiables, tarifs PDF, corbeille - 12/07/2026

- [x] Remplacer le cachet PDF par `cachetnobg.png` via `public/cachet.png`.
- [x] Ajouter la modification admin des BL par commande, avec recalcul serveur,
  audit, conservation du numero BL et blocage si un bon de charge actif existe.
- [x] Conserver la suppression logique de commande comme suppression BL.
- [x] Permettre les commandes admin rattachees a un responsable admin.
- [x] Ajouter `/admin/produits/tarifs` et le PDF `/admin/produits/tarifs/pdf`.
- [x] Faire tenir la liste des prix active sur une seule page A4 avec cachet,
  note et footer.
- [x] Ajouter `/admin/corbeille` dans la navigation admin pour consulter les
  elements supprimes et traces de suppression/fusion.
- [x] Stabiliser les dates BL modifiees pour eviter les decalages timezone.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

- [x] Verification navigateur build production `http://localhost:3114` :
  creation commande admin + client Oualidia, modification BL, blocage BL avec BC,
  PDF tarifs 1 page, PDF BL avec cachet, corbeille sans erreur console.

## Mise a jour client - ranking dashboard et adresses clients - 12/07/2026

- [x] Ajouter des classements au dashboard admin : commerciaux, produits vendus,
  villes, clients et clients a encaisser.
- [x] Calculer les rankings depuis les commandes reelles de la periode filtree,
  avec chiffres d'affaires, quantites, nombre de BL et restes dus.
- [x] Ajouter `adresse` aux clients standards et clients externes dans Prisma,
  validations Zod, actions admin/commercial, listes, fiches detail et dialogues.
- [x] Ajouter l'adresse au client rapide dans la creation de commande
  admin/commercial.
- [x] Aligner les clients seed/demo avec des adresses pour eviter de recreer
  des donnees incompletes.
- [x] Afficher l'adresse client dans le PDF BL et le site de livraison.
- [x] Afficher l'adresse de livraison dans le PDF bon de charge lie a une
  commande.
- [x] Verification : `npx prisma generate`, `npx prisma migrate deploy`,
  `npx tsc --noEmit`, `npm run lint`, `npm run test` (133/133),
  `npm run build`.
- [x] Verification navigateur build production `http://localhost:3115` :
  dashboard avec rankings, creation client rapide avec adresse, creation
  commande, detail BL, PDF BL avec adresse, creation bon de charge et lien PDF,
  clients admin avec colonne adresse.

## Mise a jour UI - style sidebar - 12/07/2026

- [x] Refaire le style de la sidebar desktop : largeur plus confortable,
  gradient bleu, logo plus propre, et ombre laterale discrete.
- [x] Ameliorer les entrees de navigation : icones dans pastilles, active state
  blanc plus lisible, hover/focus plus nets, texte tronque proprement.
- [x] Remplacer le gros scrollbar natif par un scrollbar fin et discret.
- [x] Aligner le squelette de chargement avec la nouvelle largeur sidebar.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [x] Verification navigateur `http://localhost:3115/admin` : desktop sidebar
  visible sans erreur console, mobile garde la sidebar masquee.

## Mise a jour donnees - villes CTM Maroc - 12/07/2026

- [x] Remplacer la liste Maroc existante par la liste CTM fournie par le client
  dans `lib/villes.ts`.
- [x] Rendre cette liste canonique pour les dropdowns client/commande afin
  qu'une ancienne valeur `villes_maroc` en base ne rajoute plus d'anciennes
  villes.
- [x] Ajouter une migration MySQL qui met a jour `parametres_systeme.villes_maroc`
  avec la liste CTM pendant le deploiement.
- [x] Verification liste : 122 entrees uniques chargees, avec `Oualidia`,
  `Taroudant`, `Agdez`, `Tetouan`, `M'Hamid El Ghizlane` et
  `Centre 44 ouled dlim`.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

## Mise a jour client - bon de charge livraison et villes locales - 13/07/2026

- [x] Afficher sur le detail admin d'un bon de charge lie a une commande :
  client de livraison, ville et adresse de livraison.
- [x] Confirmer que le PDF bon de charge conserve le client, la ville et
  l'adresse via `app/charges/document-data.ts` et
  `app/charges/bon-charge-pdf.tsx`.
- [x] Verifier les villes demandees : `Benslimane` et `Bouznika` existaient
  deja ; ajout de `Sale`, `Temara`, `Beni yakhlef`, `Tamaris`,
  `Dar bouazza`, `Sidi rahal` et `Errahma`.
- [x] Ajouter la migration MySQL
  `20260713100000_villes_livraison_coq_plus` pour mettre a jour
  `parametres_systeme.villes_maroc` en production.
- [x] Verification liste : 129 entrees uniques et les 9 villes demandees
  presentes.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

## Correction QA - selection auto client commande - 13/07/2026

- [x] Corriger le flux "Nouveau client" dans `/admin/commandes/nouvelle` :
  apres creation rapide, le client cree est selectionne automatiquement dans
  la commande.
- [x] Appliquer la meme structure au flux commercial
  `/commercial/commandes/nouvelle`.
- [x] Server action clients : retour typé du client cree + cookie court de
  handoff pour selection fiable apres rafraichissement RSC.
- [x] Formulaire commande : consomme `clientSelectionInitiale`, nettoie le
  cookie, met a jour le brouillon et garde l'option locale si la continuation
  client repond directement.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.
- [x] Retest navigateur local production `http://localhost:3118` :
  client `QA FIX AutoSelect CLEAN ...` cree depuis la commande admin, selection
  automatique confirmee, aucun message `Choisir un client standard`.

## Correction production - liste clients commande admin - 13/07/2026

- [x] Reproduire sur production `http://212.47.68.171/admin/commandes/nouvelle` :
  responsable par defaut `Administrateur (admin) - Admin`, dropdown client avec
  seulement 2 clients car la liste etait filtree par responsable courant.
- [x] Confirmer que les autres clients existent en changeant de responsable :
  `Commercial 1` affiche 4 clients, donc le probleme etait UI/filtre, pas une
  perte de donnees.
- [x] Corriger `app/commandes/commande-form.tsx` : en mode admin, afficher tous
  les clients standards dans le select client.
- [x] Quand l'admin choisit un client appartenant a un autre responsable,
  basculer automatiquement le champ `Responsable` vers ce proprietaire pour
  garder la validation serveur stricte.
- [x] Ajouter le responsable dans le libelle des options client admin pour eviter
  les doublons ambigus.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

## Correction UI - liste admin commandes - 13/07/2026

- [x] Retirer la colonne `Date reglement` de `/admin/commandes`.
- [x] Limiter visuellement le nom client avec troncature et titre au survol pour
  garder une largeur de type nom/prenom.
- [x] Ajouter une colonne `Facture` a cote de `BL`; pour l'instant elle genere
  le meme PDF que le BL.
- [x] Passer la table en layout fixe, avec largeurs compactes, pour eviter le
  scroll horizontal sur la page admin commandes.
- [x] Verification navigateur local `http://localhost:3107/admin/commandes` :
  `Date reglement` absent, `Facture` present, BL et Facture pointent tous deux
  vers `/pdf`, largeur document `1265` pour viewport `1280`.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

## Correction PDF - liste des prix Coq Plus - 13/07/2026

- [x] Refaire le PDF `/admin/produits/tarifs/pdf` dans le style rouge fourni :
  logo/wordmark Coq Plus, pill date, titre `LISTE DES PRIX`, table rouge,
  numerotation des articles, watermark leger et footer contact rouge.
- [x] Conserver la meme route et les memes donnees catalogue actives.
- [x] Garder le document sur une seule page A4 avec 26 produits.
- [x] Eviter les glyphes PDF non supportes en utilisant des marqueurs ASCII
  propres dans la note et le footer.
- [x] Verification PDF : telechargement local authentifie, rendu PNG via
  Poppler, `pdfinfo` confirme `Pages: 1`, inspection visuelle OK.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

## Ajustement PDF tarifs - logo facture et performance - 13/07/2026

- [x] Remplacer le logo dessine propre au PDF tarifs par le meme bloc logo que
  les documents BL/facture : image societe si disponible, fallback `COQ PLUS`
  identique dans l'esprit documentaire.
- [x] Garder le style rouge valide par le client : date, titre, table, watermark
  leger et footer.
- [x] Reduire les elements decoratifs couteux du PDF tarifs pour accelerer la
  generation : suppression de la grille de points et watermark reduit.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`, rendu PDF local mesure a environ 397 ms,
  `pdfinfo` confirme une seule page A4 et inspection PNG OK.

## Corrections QA production `prob.md` - 14/07/2026

- [x] PDF tarifs : supprimer la limite silencieuse a 26 produits et paginer le
  document pour inclure tous les produits actifs.
- [x] Liste clients commerciaux : afficher tous les clients actifs de la base
  pour les commerciaux et admins ; garder les actions modifier/supprimer en
  lecture seule pour les clients rattaches a un autre responsable.
- [x] Commande admin : initialiser explicitement le responsable sur l'admin
  connecte, eviter qu'un brouillon vide impose un ancien commercial, et rediriger
  vers le detail de commande apres creation.
- [x] Paiement : supprimer le double refresh et corriger le message de
  depassement du reste du avec format DH francais.
- [x] Concurrence : verrouiller la commande dans la transaction de modification
  BL pour eviter une course avec l'ajout de paiement.
- [x] Commandes : ajouter des labels accessibles aux boutons PDF/BL/facture/BC
  et creer une route `/admin/commandes/[id]/facture` dediee.
- [x] KPI/listes : retirer les caps silencieux `take: 5000`, utiliser Decimal
  pour les sommes de cartes de listes et exclure les admins du ranking
  commerciaux.
- [x] Commercial : afficher `Non defini` sur KPI objectif quand aucun objectif
  n'est configure et uniformiser 403/404 sur les ressources commerciales
  protegees.
- [x] Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  (133/133), `npm run build`.

## Correction locale `prob.md` - crash hydration et tarifs - 14/07/2026

- [x] Verifier au navigateur que `/admin/commandes/nouvelle` sur `localhost:3107`
  plantait avec `Erreur 500` apres hydratation.
- [x] Diagnostiquer le `ChunkLoadError` comme un serveur Next.js local demarre
  sur un ancien build.
- [x] Redemarrer `next start -p 3107` apres `npm run build`.
- [x] Corriger l'environnement local : `.env` pointe maintenant vers le MySQL
  Docker expose sur `localhost:3307`.
- [x] Verifier au navigateur que les pages commandes admin et commercial ne
  plantent plus apres hydratation.
- [x] Exclure les pseudo-produits non suivis en stock de la liste des prix :
  `RELIQUAT PAYEMENT` ne doit plus apparaitre dans les tarifs.
- [x] Verification finale : `npx tsc --noEmit`, `npm run lint`,
  `npm run test` (133/133), `npm run build` et retest navigateur apres rebuild.
