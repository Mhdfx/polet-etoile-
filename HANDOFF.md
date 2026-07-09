# HANDOFF - Application de gestion commerciale (Poulet Etoile / Naomedia)

Document de reprise canonique. A lire avant toute nouvelle session avec
`CLAUDE.md`, `AGENTS.md` et `PLAN.md`.

Derniere mise a jour : 09/07/2026.  
Statut : **code CDC pret pour tests locaux hors deploiement - schema a valider par Mehdi (G1), decisions RELIQUAT/date echeance/paiement global a confirmer**.

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
- `lib/villes.ts` : liste des villes Maroc depuis `parametres_systeme`
  (`villes_maroc`) avec fallback local si le parametre est absent ou invalide.
- `lib/commandes.ts` : calcul Decimal des lignes de commande, total, types de
  detail/liste et erreurs metier (produit introuvable ou duplique).
- `lib/kpi.ts` : calcul Decimal centralise des KPI commandes (CA, nombre,
  impayes, top clients, top produits).
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
- **Module Utilisateurs/Objectifs (Phase 4B) livre** :
  - Ecrans : `/admin/utilisateurs` (liste paginee, recherche, creation,
    activation/desactivation, reset mot de passe, suppression logique),
    `/admin/utilisateurs/[id]/objectifs` (objectif mensuel commercial).
  - Actions serveur : `creerUtilisateur`, `reinitialiserMotDePasse`,
    `definirActivationUtilisateur`, `supprimerUtilisateur`, `definirObjectif`.
    Toutes exigent `requireAdmin`, valident via Zod, ecrivent l'audit et
    suppriment les sessions quand un compte est desactive/supprime ou qu'un mot
    de passe est reinitialise.
  - Protections metier : impossible de desactiver/supprimer son propre compte ;
    impossible de supprimer/desactiver le dernier admin actif ; nom utilisateur
    reserve meme si le compte est soft-delete.
  - Helpers de validation communs ajoutes : `lib/validations/commun.ts`,
    `lib/validations/utilisateur.ts`. `lib/validations/produit.ts` reutilise
    maintenant `champMontantPositif` et `erreursParChamp`.
  - Smoke verifie sur `:3107` : admin charge `/admin/utilisateurs` et la page
    objectifs ; commercial redirige vers `/403`.
- **Module Clients / Clients externes (Phase 4C) livre** :
  - Ecrans : `/admin/clients` (clients standards + clients externes, recherche,
    pagination serveur, creation, edition, suppression logique) et
    `/commercial/clients` (portefeuille du commercial connecte uniquement).
  - Actions serveur admin : `creerClientAdmin`, `modifierClientAdmin`,
    `supprimerClientAdmin`, `creerClientExterne`, `modifierClientExterne`,
    `supprimerClientExterne`. Toutes exigent `requireAdmin`, valident via Zod,
    ecrivent l'audit et utilisent `deleted_at` + `actif = false` pour supprimer.
  - Actions serveur commercial : `creerClientCommercial`,
    `modifierClientCommercial`, `supprimerClientCommercial`. Toutes exigent
    `requireCommercial`; modification/suppression d'un client appartenant a un
    autre commercial redirige vers `/403`.
  - Ville selectionnee depuis la liste `villes_maroc` en base via `lib/villes.ts`.
  - Navigation active : `Clients` admin et `Mes clients` commercial pointent vers
    les nouveaux modules.
  - Tests ajoutes : CRUD admin, clients externes, portefeuille commercial, doublons,
    soft-delete et protection `/403`.
- **Creation de commandes (Phase 5A/5B) livree** :
  - Contrats : `lib/validations/commande.ts` contient les schemas Zod de creation
    commande commercial/admin et le schema d'ajout paiement (sans echeance, schema
    courant uniquement).
  - Calculs : `lib/commandes.ts` calcule `prix_net = quantite x prix_unitaire`,
    arrondi Decimal, total commande, detection produit duplique/inactif.
  - Actions serveur : `app/commandes/actions.ts` expose
    `creerCommandeCommercial` et `creerCommandeAdmin`.
  - Garanties : permissions serveur (`requireCommercial`/`requireAdmin`), client
    standard rattache au commercial, client externe admin, produits relus depuis la
    base avec `actif = true` et `deleted_at = null`, prix unitaires figes,
    total client facultatif rejete s'il ne correspond pas au total serveur,
    commande + lignes + BL + audit dans la meme transaction.
  - Ecrans : `/commercial/commandes/nouvelle` et `/admin/commandes/nouvelle`
    avec formulaire basique, anti double-clic et affichage du numero BL cree.
  - Navigation : `Nouvelle commande` commercial et `Commandes` admin pointent vers
    les nouveaux formulaires.
  - Tests ajoutes : calculs Decimal, produit inactif, produit duplique, client d'un
    autre commercial, total falsifie, commande externe admin.
- **Detail commandes, paiements, listes, retours, PDF, Excel (Phase 5C/5D + Phase 6) livres** :
  - Ecrans commandes : `/admin/commandes`, `/admin/commandes/[id]`,
    `/commercial/commandes`, `/commercial/commandes/[id]`.
  - Paiements admin : formulaire sur le detail admin, modes `ESPECES`, `CHEQUE`,
    `TRAITE`, `AUTRE`, reference optionnelle. La commande est verrouillee
    (`SELECT ... FOR UPDATE`) avant calcul du reste du ; paiement > reste refuse.
  - Suppression commande : admin uniquement, soft delete de `commandes` +
    `lignes_commande`, audit `commande.suppression`.
  - Listes commandes : pagination serveur, filtres periode Casablanca inclusive,
    recherche client/BL, commercial/type/statut cote admin, statut cote commercial.
  - PDF BL : routes `/admin/commandes/[id]/pdf` et
    `/commercial/commandes/[id]/pdf`, permission cote serveur, identite societe lue
    depuis `parametres_systeme`, montants venant des lignes figees.
  - Excel : routes `/admin/commandes/export` et `/commercial/commandes/export`,
    colonnes francaises, filtres respectes, permission cote serveur.
  - Retours : `/commercial/retours` avec creation non modifiable et
    `/admin/retours` en lecture admin. Action `creerRetour` rattache le retour au
    commercial connecte et ecrit l'audit.
  - Tests ajoutes : paiement trop eleve, paiement audite, suppression logique
    commande/lignes, retour commercial, compteur BL verrouille.
- **KPI, Audit, Sessions (Phase 7) livres** :
  - KPI : `/admin/kpi` et `/commercial/kpi`, filtre periode Casablanca inclusif,
    objectif mensuel, chiffre d'affaires, nombre de commandes, impayes, tops
    clients/produits. Calculs purs dans `lib/kpi.ts` avec tests.
  - Audit : `/admin/audit`, pagination serveur, filtres utilisateur/action/entite/
    periode, apercu avant/apres en JSON lisible.
  - Sessions : `/admin/sessions`, liste sessions Better Auth actives, utilisateur,
    role, IP, derniere activite, expiration, user-agent. Action admin
    `supprimerSession` supprime immediatement la session en base et audite.
  - Navigation active : `KPI`, `Audit`, `Sessions` admin et `Mes KPI` commercial.
  - Tests ajoutes : formules KPI, periode vide, suppression session + audit.
  - Limite connue : regle KPI de `RELIQUAT PAYEMENT` toujours non confirmee ; le
    calcul actuel traite toutes les lignes produit comme chiffre d'affaires.
- **Hardening (Phase 8) passe code + smoke livre** :
  - Permission audit smoke : anonyme -> `/connexion`, mauvais role -> `/403`,
    admin/commercial sur leurs espaces -> 200.
  - 403/404 smoke verifies ; 500/error boundary compile dans le build.
  - Empty states verifies par filtres impossibles sur commandes admin,
    commandes commercial et audit.
  - Tests de verrouillage : BL via `FOR UPDATE` dans `attribuerNumeroBL`, paiement
    via verrou commande `FOR UPDATE` avant validation du reste du.
  - Erreurs serveur : session force logout alignee sur le pattern generique
    `(ref. xxxx)` sans fuite de stack.
  - Verification complete : Prisma validate/generate, TypeScript, Vitest, lint,
    build.
  - Restent hors code ou non verifies visuellement : CDC section 16.2 non fourni,
    QA mobile visuelle, QA grands volumes admin.
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
3. Confirmer et appliquer la regle KPI `RELIQUAT PAYEMENT`.
4. Faire la QA mobile visuelle et le test grand volume admin.
5. Lancer la recette CDC 16.2 des que le document est disponible.
6. Phase 9 : deployment et livraison.

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
| Module utilisateurs/objectifs | `app/admin/utilisateurs/` |
| Module clients admin | `app/admin/clients/` |
| Module clients commercial | `app/commercial/clients/` |
| Creation commandes | `app/commandes/actions.ts`, `app/commandes/commande-form.tsx`, `app/admin/commandes/nouvelle/`, `app/commercial/commandes/nouvelle/` |
| Listes/detail commandes | `app/admin/commandes/`, `app/commercial/commandes/` |
| Paiements commandes | `app/admin/paiements/`, `app/commandes/actions.ts`, `app/commandes/paiement-form.tsx` |
| PDF BL | `app/commandes/bon-livraison-pdf.tsx`, `app/commandes/document-data.ts`, routes `*/commandes/[id]/pdf` |
| Exports Excel | `app/admin/exports/`, `app/admin/commandes/export/route.ts`, `app/commercial/commandes/export/route.ts` |
| Retours | `app/retours/`, `app/admin/retours/`, `app/commercial/retours/` |
| KPI | `lib/kpi.ts`, `app/admin/kpi/`, `app/commercial/kpi/` |
| Audit | `app/admin/audit/` |
| Sessions actives | `app/admin/sessions/` |
| Validations produit (Zod partage) | `lib/validations/produit.ts` |
| Validations utilisateur/objectifs | `lib/validations/utilisateur.ts` |
| Validations clients | `lib/validations/client.ts` |
| Validations commandes/paiements | `lib/validations/commande.ts` |
| Validations retours | `lib/validations/retour.ts` |
| Validations communes actions | `lib/validations/commun.ts` |
| Liste villes Maroc | `lib/villes.ts`, parametre `villes_maroc` |
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
## Mise a jour Codex - reconciliation whatsleft - 09/07/2026

`whatsleft.md` a ete nettoye/reconcilie : les anciennes sections non cochees
etaient obsoletes par rapport au code livre. Le fichier indique maintenant phase
par phase les modules termines et les preuves fichier. Packaging livraison ajoute :
`Dockerfile`, `.dockerignore`, `docs/DEPLOYMENT.md`, `docs/CDC_DEVIATIONS.md`,
README mis a jour.

Restes explicites dans `whatsleft.md` = validation externe/decision metier :
QA mobile, QA volume, schema freeze Mehdi, RELIQUAT/date echeance/paiement global,
deploiement recette.

## Mise a jour Codex - finition whatsleft - 09/07/2026

Ajouts de finition :

- Upload logo binaire admin : `app/admin/parametres/actions.ts`,
  `app/admin/parametres/parametres-form.tsx`, stockage `public/uploads/logos`.
- Creation client inline dans la commande : `app/commandes/commande-form.tsx`
  utilise les actions clients admin/commercial et `router.refresh()`.
- Registre categories sans migration : `lib/categories.ts` +
  `parametres_systeme.categories_produits`; page categories peut creer/reordonner
  des categories vides et les expose aux formulaires produits.
- Exports volumineux : `lib/export-jobs.ts`, routes `app/exports/jobs/[id]` et
  `app/admin/exports/jobs/[id]`; exports commandes admin/commercial et audit
  basculent en job au-dessus de 5 000 lignes.

Verification finale :

- `npx tsc --noEmit` OK
- `npm run lint` OK
- `npm run build` OK
- `npm run test` OK (102/102)

Restes hors code/freeze : QA mobile reelle, QA volume chronometree, decisions
RELIQUAT/date echeance/paiement global, schema freeze Mehdi, deploiement recette.

## Mise a jour Codex - 09/07/2026

Passe CDC code effectuee apres analyse de `whatsleft.md` :

- Ajoute `/admin/parametres`, `/commercial/commandes/externes`, fiches clients
  admin/commercial, fusion clients, categories produits, exports audit/global.
- KPI admin et commercial etendus (filtres client, cartes periode/cumul, graphiques,
  tableaux commerciaux, top clients/produits, clients non regles, evolution 3 mois).
- Listes commandes enrichies (KPI, region, date reglement, taille page 10/25/50/100,
  premiere/derniere page, bouton BL direct).
- Sessions : fermeture de toutes les sessions par utilisateur.
- Seed : catalogue CDC complet 26 produits + 1 000 commandes volume idempotentes.
  Seed local execute : 26 produits, 1 003 commandes actives, 1 000 commandes volume.

Verification de cette passe :

- `npx tsc --noEmit` OK
- `npm run test` OK (102/102)
- `npm run lint` OK
- `npm run build` OK

Runtime local :

- Script production `build` repasse sur `next build` stable. Turbopack buildait
  mais `next start` servait un 500 sous Windows a cause d'un chunk SSR manquant.
- Smoke `npx next start -p 3111` OK : `/connexion`, `/admin/paiements`,
  `/admin/exports`, `/admin`, `/commercial`, et commandes admin avec periode
  invalide retournent une page 200.
- `npm run seed` OK

Restes connus apres cette passe : QA mobile/volume navigateur, decisions
RELIQUAT/date echeance/paiement global et schema freeze explicite.

## Mise a jour Codex - code readiness locale CDC - 09/07/2026

Scope utilisateur courant : oublier le deploiement pour le moment ; finir le code
pour qu'il soit testable localement contre `cdc.md`.

Ajouts code de cette passe :

- `/admin/paiements` : vraie page paiements admin, avec commandes a encaisser,
  KPI, historique recent, recherche et liens vers le detail commande pour encaisser.
- `/admin/exports` : page exports avec boutons vers export global, audit et
  commandes, plus mention interface que les exports ne remplacent pas la
  sauvegarde MySQL infrastructure Naomedia.
- Audit auth : `auth.connexion` lors de la creation de session Better Auth et
  `auth.deconnexion` avant `signOut`.
- Objectifs commerciaux : `definirObjectif` refuse cote serveur tout mois deja clos.
- Filtres dates : commandes admin, commandes commercial et audit affichent
  maintenant une erreur claire si `Date fin < Date debut`.
- Nouvelle commande : brouillon `localStorage` pour limiter la perte de saisie
  apres reload/session expiree ; message et submit bloque si le navigateur est
  hors ligne.

Restes non-code pour valider la livraison client : QA navigateur/mobile reelle,
QA volume chronometree, schema freeze explicite, decisions metier ouvertes.

Verification de cette passe :

- `npm run prisma:validate` OK
- `npx tsc --noEmit` OK
- `npm run test` OK (102/102)
- `npm run lint` OK
- `npm run build` OK
