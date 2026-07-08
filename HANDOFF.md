# HANDOFF - Application de gestion commerciale (Poulet Etoile / Naomedia)

Document de reprise canonique. A lire avant toute nouvelle session avec
`CLAUDE.md`, `AGENTS.md` et `PLAN.md`.

Derniere mise a jour : 08/07/2026 (soir).  
Statut : **socle + auth + design system + CRUD produits/prix operationnels - schema a valider par Mehdi (G1) et direction visuelle a valider (G3)**.

`PLAN.md` fait foi pour l'ordre d'execution et les cases a cocher. Ce fichier resume
l'etat courant, les decisions et les endroits ou modifier chaque sujet.

## 1. Projet

Application web de gestion commerciale pour une entreprise de distribution avicole
(Poulet Etoile), livree pour Naomedia. Interface 100 % en francais.

Deux espaces :

- Commercial : commandes terrain, clients, KPI, retours magasin.
- Administrateur : produits/prix, utilisateurs, clients, toutes les commandes,
  paiements, KPI consolides, audit, sessions actives.

La commande est la source de verite unique. Les KPI, PDF et exports sont des
projections des commandes.

## 2. Stack

| Couche | Choix |
|---|---|
| Framework | Next.js 15 App Router |
| Langage | TypeScript strict |
| BDD | MySQL 8 |
| ORM | Prisma 7 + adapter MariaDB/MySQL |
| Argent | Prisma Decimal + decimal.js |
| Validation | Zod |
| Auth | Better Auth, sessions en base |
| UI | Tailwind 4 + shadcn/ui (preset Nova, base radix) |
| Tables | TanStack Table |
| Graphes | Recharts ou Tremor |
| PDF | @react-pdf/renderer |
| Excel | exceljs |
| Dates | Luxon, fuseau Africa/Casablanca |
| Tests | Vitest |

MySQL Docker ecoute sur le port hote `3307` pour eviter le conflit avec Laragon sur
`3306`.

## 3. Modele de donnees courant

Source de verite : `prisma/schema.prisma`.

Tables metier :

- `users` : email technique, nom_utilisateur, nom_complet, role, actif,
  derniere_connexion_at, soft delete. Le login utilisateur se fait avec
  `nom_utilisateur` + mot de passe ; l'email reste un champ Better Auth requis mais
  n'est pas utilise par l'interface de connexion.
- `sessions`, `accounts`, `verifications` : tables Better Auth. Les mots de passe
  credential sont dans `accounts.password`.
- `objectifs` : objectif mensuel par commercial.
- `produits` et `historique_prix` : catalogue, prix de reference et historique.
- `clients`, `clients_externes` : clients commerciaux et clients externes admin.
- `commandes`, `lignes_commande` : BL, lignes, prix figes, Decimal.
- `paiements` : paiements multi-modes par commande.
- `retours` : retours magasin non modifiables.
- `parametres_systeme` : raison sociale, prefixe BL, fuseau, TVA, villes.
- `audit_log` : actions sensibles, conservation indefinie.
- `compteurs_bl` : compteur transactionnel pour numerotation BL.

Decisions importantes :

- MySQL, pas PostgreSQL.
- Pas de remise / majoration.
- Tous les montants en Decimal, jamais `number`.
- Numero BL via `compteurs_bl` verrouille en transaction, jamais `max+1`.
- Paiement actuellement modelise par commande, avec `reference` optionnelle.
- Schema initial non encore valide/freeze officiellement par Mehdi.

## 4. Auth

Implementation actuelle :

- `lib/auth.ts` configure Better Auth avec Prisma adapter MySQL et le plugin username.
- Sign-up public desactive.
- Sign-in email desactive : l'authentification voulue est username/password.
- Sessions stockees en base.
- Hook de creation de session : met a jour `users.derniere_connexion_at`.
- `lib/session.ts` fournit :
  - `requireSession()`
  - `requireAdmin()`
  - `requireCommercial()`
  - `requireOwnerOrAdmin()`
  - `cheminAccueilPourRole()`
- Route Better Auth : `app/api/auth/[...all]/route.ts`.
- Pages minimales : `/connexion`, `/admin`, `/commercial`, `/403`, 404 et 500.

Comptes seed :

- Admin : `admin` / `password`
- Commercial Nord : `commercial.nord` / `commercial123`
- Commercial Sud : `commercial.sud` / `commercial123`

Direction visuelle : dashboard type image WhatsApp fournie (sidebar bleue,
workspace gris clair, topbar compacte, panels blancs arrondis, cartes KPI
rouges/bleues). Implementee dans `components/app-shell.tsx` + pages `/admin`,
`/commercial`, et desormais portee par des tokens.

## 4bis. Design system (Phase 3)

- shadcn/ui initialise (preset Nova, base radix) : primitives dans
  `components/ui/` (button, input, textarea, select, label, badge, dialog,
  alert-dialog, table, skeleton, card). `components.json` a la racine.
- Tokens de marque dans `app/globals.css` : `--primary` bleu #0f66d5,
  `--background` #eef1f4, `--succes` #2aa876, `--alerte` #f05d68, tokens
  sidebar bleus. Utiliser les classes semantiques (`bg-primary`, `bg-succes`,
  `bg-alerte`, `bg-sidebar`…), plus de hex en dur dans les composants.
- Kit metier (Codex DOIT reutiliser ces composants, ne pas reinventer) :
  - `components/bouton.tsx` : `Bouton` avec prop `chargement` (anti double-clic).
  - `components/champ.tsx` : `Champ` = label + erreur/description sous le champ.
  - `components/champ-montant.tsx` / `champ-quantite.tsx` : saisie DH / kg en
    chaine, normalisation via `lib/saisie.ts` (jamais `number`).
  - `components/carte-kpi.tsx` : `CarteKPI` tonalites bleu/rouge/vert/neutre.
  - `components/badge-statut.tsx` : `BadgeStatut` (paye, en_attente, actif…).
  - `components/data-table.tsx` : `DataTable` TanStack, pagination serveur,
    etats vide + squelette de chargement integres.
  - `components/dialogue-confirmation.tsx` : `DialogueConfirmation` (AlertDialog
    avec etat en-cours). Pas encore exerce sur un ecran.
  - `components/filtre-periode.tsx` : `FiltrePeriode` (du/au inclusif). Pas
    encore exerce sur un ecran.
- Ecran de reference : `/admin/produits` = liste lecture seule paginee serveur
  + recherche + formulaire de reference (validation Zod, creation reelle
  differee en Phase 4 apres gel du schema).
- La nav sidebar est en vrais liens ; les modules non construits sont
  desactives avec l'infobulle « Module à venir ». `AppShell` prend maintenant
  une prop `cheminActif`.

## 5. Etat fait

- Projet Next.js initialise avec TypeScript strict, Tailwind 4 et ESLint.
- Dependances socle installees : Prisma 7, Better Auth, decimal.js, Zod, TanStack
  Table, Recharts, PDF/Excel, Luxon, Vitest.
- Docker MySQL ajoute et lance sur `localhost:3307`.
- `.env.example` et `.env` alignes sur MySQL local.
- Schema Prisma initial ajoute.
- Migration initiale MySQL appliquee : `20260708163200_init_mysql`.
- Migration auth appliquee : `20260708173024_better_auth_schema`.
- Seed execute et verifie : 3 users, 8 produits, 3 commandes, 2 paiements,
  compteur BL `numero_bl = 3`.
- Helpers `lib/decimal.ts`, `lib/format.ts`, `lib/dates.ts` testes.
- Helper BL `lib/bl.ts` avec `SELECT ... FOR UPDATE`.
- Better Auth operationnel avec comptes seed username/password.
- Shell dashboard reference ajoute pour les espaces admin/commercial, avec navigation
  bleue, topbar, panneaux KPI et placeholders visuels.
- Espace vide du shell corrige dans `components/app-shell.tsx` sans toucher au contenu
  dashboard de `app/admin/page.tsx`, sauf le breakpoint de grille `md`.
- Smoke auth verifie sur `http://localhost:3107` :
  - `admin` / `password` -> `/admin` 200.
  - commercial connecte -> `/commercial` 200.
  - mauvais role -> redirection `/403`.
  - endpoint email `/api/auth/sign-in/email` -> 404.
- Tests de permissions Vitest sur `lib/session.ts` (17 tests) : anonyme,
  mauvais role, owner-or-admin, utilisateur desactive/soft-delete.
- Design system Phase 3 en place (voir §4bis) ; smoke verifie sur `/admin/produits` :
  admin 200 avec prix `XX,XX DH`, recherche + etat vide OK, commercial -> `/403`,
  anonyme -> `/connexion`.
- Historique git remis au propre : tout le travail est commite en commits
  logiques (socle, auth, shell, docs, tests, design system).
- **Module Produits (Phase 4A) livre** :
  - Actions serveur dans `app/admin/produits/actions.ts` : `creerProduit`
    (doublon de nom actif refuse), `modifierProduit`, `changerPrixProduit`
    (verrou `FOR UPDATE` + `historique_prix` dans la meme transaction),
    `changerPrixEnMasse` (tout ou rien), `definirActivationProduit`,
    `supprimerProduit` (soft delete). Toutes : `requireAdmin` + audit dans la
    transaction + erreurs Zod en francais + message generique avec ref. en cas
    d'erreur serveur.
  - Ecrans : liste avec colonne actions et dialogues (`/admin/produits`),
    historique des prix (`/admin/produits/[id]/historique`), prix en masse
    (`/admin/produits/prix`).
  - Helpers : `lib/audit.ts` (`ecrireAudit` transactionnel + IP),
    `lib/validations/produit.ts` (schemas partages), `formatDateHeure`.
  - Verifie de bout en bout contre MySQL : changement de prix ne touche pas
    les `lignes_commande` existantes ; lot avec produit manquant = rollback
    complet ; commercial bloque sur les actions (303 vers /403).
- Verifications passees apres auth :
  - `npm run prisma:validate`
  - `npm run prisma:generate`
  - `npx tsc --noEmit`
  - `npm run test`
  - `npm run lint`
  - `npm run build`

## 6. A faire ensuite

Ordre recommande :

1. **Mehdi** : valider/freeze le schema (G1, questions paiement/KPI) et la
   direction visuelle sur `/admin/produits` (G3).
2. Verifier le layout mobile (dernier item Phase 3 non coche).
3. CRUD utilisateurs + objectifs (4B, Claude Code) ; clients (4C, Codex apres G3).
4. Module commande + paiement, critique (rappel : le formulaire commande ne
   doit proposer que les produits `actif = true` et non supprimes).
5. Listes, retours, PDF BL, Excel.
6. KPI, audit, sessions actives.
7. Durcissement et recette.

Questions ouvertes a confirmer avant paiement/KPI :

- Cheque/traite : faut-il `date_echeance` en plus de `reference` ?
- Paiement par commande ou solde global client ?
- `RELIQUAT PAYEMENT` compte-t-il dans les KPI ?

## 7. Ou changer X

| Changement | Endroit |
|---|---|
| Schema / tables / champs | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/*/migration.sql` |
| Base locale | `docker-compose.yml`, `.env`, `.env.example` |
| Prisma client runtime | `lib/db.ts` |
| Auth Better Auth | `lib/auth.ts` |
| Guards serveur | `lib/session.ts` |
| Route auth API | `app/api/auth/[...all]/route.ts` |
| Comptes seed username/password | `prisma/seed.ts` |
| Shell dashboard admin/commercial | `components/app-shell.tsx` |
| Pages espaces utilisateurs | `app/admin/page.tsx`, `app/commercial/page.tsx` |
| Tokens couleurs / theme | `app/globals.css` |
| Primitives shadcn | `components/ui/*`, `components.json` |
| Kit metier (Bouton, Champ, DataTable…) | `components/*.tsx` |
| Module produits (ecrans + actions) | `app/admin/produits/` |
| Validations produit (Zod partage) | `lib/validations/produit.ts` |
| Audit transactionnel | `lib/audit.ts` |
| Normalisation saisies FR | `lib/saisie.ts` |
| Decimal / format / dates | `lib/decimal.ts`, `lib/format.ts`, `lib/dates.ts` |
| Numerotation BL | `lib/bl.ts` |
| Plan projet | `PLAN.md` |
| Regles projet | `CLAUDE.md`, `AGENTS.md` |

## 8. Notes de reprise

- Ne pas modifier le schema seul si Mehdi n'a pas valide la decision.
- Ne pas introduire PostgreSQL.
- Ne pas utiliser `number` pour les montants.
- Ne pas remplacer le compteur BL transactionnel.
- Ne pas exposer de sign-up public.
- Generer un vrai `BETTER_AUTH_SECRET` long avant production.
