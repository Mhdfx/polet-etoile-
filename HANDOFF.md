# HANDOFF - Application de gestion commerciale (Poulet Etoile / Naomedia)

Document de reprise canonique. A lire avant toute nouvelle session avec
`CLAUDE.md`, `AGENTS.md` et `PLAN.md`.

Derniere mise a jour : 08/07/2026.  
Statut : **socle Next/MySQL + auth Better Auth operationnels - schema initial a valider par Mehdi**.

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
| UI | Tailwind, futur shadcn/ui |
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

Front actuel volontairement basique. Le user a autorise un front minimal temporaire,
mais la logique/structure doit rester propre.
Direction visuelle demandee ensuite : dashboard type image WhatsApp fournie
(sidebar bleue, workspace gris clair, topbar compacte, panels blancs arrondis,
cartes KPI rouges/bleues). Premier passage implemente dans `components/app-shell.tsx`
et les pages `/admin`, `/commercial`.
Dernier correctif layout : suppression du cadre exterieur gris/vert, suppression de
la hauteur forcee du shell, suppression du `flex-1` sur le wrapper contenu, et grille
admin en deux colonnes des `md` pour eviter le grand empilement vers 931px.

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
- Verifications passees apres auth :
  - `npm run prisma:validate`
  - `npm run prisma:generate`
  - `npx tsc --noEmit`
  - `npm run test`
  - `npm run lint`
  - `npm run build`

## 6. A faire ensuite

Ordre recommande :

1. Valider/freeze le schema avec Mehdi, notamment les questions paiement/KPI.
2. Ajouter les tests automatises de permissions auth (anonyme, admin, commercial).
3. Poser le vrai AppLayout + composants UI de reference.
4. CRUD admin produits/prix/utilisateurs/clients.
5. Module commande + paiement, critique.
6. Listes, retours, PDF BL, Excel.
7. KPI, audit, sessions actives.
8. Durcissement et recette.

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
