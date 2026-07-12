# HANDOFF - Application de gestion commerciale (Coq Plus / Naomedia)

Document de reprise canonique. A lire avant toute nouvelle session avec
`CLAUDE.md`, `AGENTS.md` et `PLAN.md`.

Derniere mise a jour : 12/07/2026.
Statut : **code CDC pret pour tests locaux, corrections post-QA navigateur appliquees et retestees - schema a valider par Mehdi (G1), decisions RELIQUAT/date echeance/paiement global a confirmer**.

`PLAN.md` fait foi pour l'ordre d'execution et les cases a cocher. Ce fichier resume
l'etat courant, les decisions et les endroits ou modifier chaque sujet.

## 1. Projet

Application web de gestion commerciale pour une entreprise de distribution avicole
(Coq Plus), livree pour Naomedia. Interface 100 % en francais.

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
- Commercial 1 : `com1` / `password`
- Commercial 2 : `com2` / `password`

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
  - `components/data-table.tsx` : `DataTable` TanStack, pagination serveur ou
    mode liste complete explicite, etats vide + squelette de chargement integres.
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
- Ecran de reference : `/admin/produits` = catalogue complet sur une seule page
  + recherche + CRUD, sans boutons de pagination (demande client 10/07/2026).
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
| Bons de charge (actions) | `app/charges/actions.ts` |
| Bons de charge (ecrans admin) | `app/admin/charges/` |
| Rapprochement de tournee | `app/admin/rapprochement/`, `lib/charge.ts` |
| Numerotation BC | `lib/bc.ts` (compteur cle `numero_bc`), param `prefixe_bc` |
| Validations bon de charge | `lib/validations/charge.ts` |
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
| Configuration et garde auth | `lib/auth.ts`, `app/api/auth/[...all]/route.ts` |
| Securite uploads logo | `lib/logo-upload.ts`, `app/uploads/[...chemin]/route.ts` |
| Jobs exports prives | `lib/export-jobs.ts`, `lib/http.ts` |
| Rapport securite | `docs/SECURITY.md` |
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

## Mise a jour Codex - securite applicative - 10/07/2026

Revue complete des frontieres de confiance et corrections appliquees :

- Auth Better Auth : origines locales conditionnelles, garde same-origin explicite
  sur les mutations API, secret production >= 32 caracteres, session 12 h et cookie
  de connexion non persistant.
- Autorisation exports : chaque job porte son createur et son niveau d'acces ; un
  commercial ne peut plus telecharger le job d'un autre utilisateur ni un export admin.
- Fichiers : jobs expires apres 24 h ; PDF/XLSX `private, no-store`; logos PNG/JPG
  verifies par signature, SVG refuse, route runtime limitee aux noms generes.
- Audit : en-tete IP valide avant insertion pour eviter usurpation grossiere et echec
  transactionnel par depassement de colonne.
- Configuration : CSP/anti-frame/nosniff/HSTS, aucun fallback `DATABASE_URL`, seed
  production sans mot de passe par defaut, minimum 12 caracteres pour nouveaux MDP.
- Verification : Prisma OK, TypeScript OK, lint OK, build OK, 110/110 tests.

Risques residuels et contraintes de deploiement : `docs/SECURITY.md`.
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

## Mise a jour Claude Code - readiness deploiement Contabo - 10/07/2026

Passe complete de preparation au deploiement VPS Contabo, avec verification
reelle de l'image Docker de production (build + stack compose + smoke HTTP).

Bugs de deploiement trouves et corriges :

- **Build Docker impossible (bloquant)** : `next build` echouait dans le
  conteneur (`DATABASE_URL est obligatoire pour initialiser Prisma` a la
  collecte des pages) car `.env` n'est pas dans l'image. Corrige : variables
  factices build-only dans l'etape `builder` du `Dockerfile` (aucune connexion
  ouverte au build, adapter MariaDB paresseux). Jamais vu en local car `.env`
  Laragon existe.
- **Logo uploade au runtime -> 404 en production (bloquant fonctionnel)** :
  `next start` ne sert que les fichiers `public/` presents AU BUILD. Corrige :
  route `app/uploads/[...chemin]/route.ts` qui sert `public/uploads/*` depuis
  le disque (confinement chemin + extensions whitelist ; durcie ensuite avec
  controle magic bytes). Verifie : 200 sur l'image de prod, traversee -> 404.
- **Volume exports errone** : compose montait `/app/public/exports` alors que
  les exports vivent dans `/app/exports-prive` depuis la passe P2/P3 ; en prod
  les jobs d'export auraient echoue (dossier root) et les fichiers perdus au
  redemarrage. Corrige dans `docker-compose.prod.yml`, `docker-compose.ip.yml`
  et `Dockerfile` (mkdir + chown `exports-prive`). Verifie : volume inscriptible
  par l'utilisateur `nextjs`.
- **CSP `upgrade-insecure-requests` retire** de `next.config.ts` : cassait le
  mode sans domaine (`docker-compose.ip.yml`, HTTP sur IP publique) en forcant
  https sur tous les assets. En mode domaine, Caddy redirige deja http->https.
- **Entrypoint durci** : refuse de demarrer si `DATABASE_URL`,
  `BETTER_AUTH_SECRET` (absent, < 32 caracteres ou placeholder) ou
  `BETTER_AUTH_URL` manquent. Verifie : exit 1 + message clair.
- **`docs/CONTABO.md`** : commande mysqldump corrigee (le mot de passe est lu
  dans le conteneur, pas sur l'hote), cron quotidien pret a coller, seed
  production exige `SEED_ADMIN_PASSWORD`/`SEED_COMMERCIAL_PASSWORD` (12+ car.).
- **`.env.production.example`** : `DATABASE_URL` retire (construit par compose
  depuis `MYSQL_*`, une seule source de verite).
- **Retours (RET-02 recette)** : `router.refresh()` apres creation pour que
  l'historique se mette a jour sans reload manuel.
- Healthchecks app ajoutes aux deux compose ; `.dockerignore` complete
  (uploads/exports locaux, env prod, compose) pour ne rien baker dans l'image.

Verification de cette passe (image `coq-plus:test` + stack compose locale
MySQL 8.4 vierge, app port 8189) :

- `docker build` OK ; `prisma migrate deploy` applique les 2 migrations sur
  base vierge au premier demarrage ; healthchecks `healthy`.
- `/connexion` 200 (~0,18 s) ; `/admin` anonyme -> redirection `/connexion`
  sans AUCUNE donnee metier dans le corps ; `/api/auth/sign-in/email` 404.
- Logo runtime 200, traversee `/uploads/../package.json` 404.
- Garde-fous entrypoint verifies (placeholder secret -> exit 1).
- Suite locale : `tsc`, `lint`, `vitest` (110/110), `next build` verts.

Deploiement : suivre `docs/CONTABO.md` (mode domaine = `docker-compose.prod.yml`
+ Caddy HTTPS ; mode IP nue = `docker-compose.ip.yml`).

## Addendum Claude Code - verification finale image production - 10/07/2026

Apres la passe securite Codex, verification complete de bout en bout sur
l'image Docker finale (`docker-compose` local : MySQL 8.4 vierge + app, port 8189).

Deux derniers bugs de conteneur trouves et corriges dans le `Dockerfile` :

- **`npm run seed` echouait dans le conteneur** (`Cannot find module '@/lib/decimal'`) :
  l'image runner n'embarquait ni `lib/` ni `tsconfig.json` (alias `@/*` de
  `prisma/seed.ts`). Copies ajoutees. Verifie : seed production OK avec
  `SEED_ADMIN_PASSWORD`/`SEED_COMMERCIAL_PASSWORD`.
- **`next.config.ts` absent du runner** : `next start` relit ce fichier au
  demarrage pour les options runtime — sans lui, `poweredByHeader: false`
  etait ignore (`X-Powered-By: Next.js` reapparaissait). Les en-tetes custom
  (CSP...) etaient eux appliques car figes au build dans le routes-manifest.
  Copie ajoutee. Verifie : X-Powered-By absent.

Smoke final complet sur l'image `coq-plus:final` (base vierge -> migrations
-> seed production -> tests HTTP) :

- Migrations auto au demarrage : OK (2/2).
- Seed production avec mots de passe env 12+ : OK.
- Sign-in cross-site (`Origin: http://evil.example`) : **403**.
- Sign-in admin legitime : 200 ; mauvais mot de passe : 401.
- Rate limit CDC 12.1 : 429 des le depassement des 5 essais/min.
- `/admin` admin connecte : 200 ; commercial connecte -> redirection `/403`,
  0 donnee metier dans le corps ; `/commercial` : 200.
- PDF BL : 200 `application/pdf` + `cache-control: private, no-store` ;
  export Excel : 200 `.xlsx`.
- Logo runtime `logo-<uuid>.png` : 200 ; nom hors pattern : 404 ; traversee
  `/uploads/../package.json` : 404.
- En-tetes : CSP sans `upgrade-insecure-requests`, HSTS, X-Frame-Options DENY,
  X-Powered-By absent.

L'application est prete pour le deploiement Contabo via `docs/CONTABO.md`.

## Addendum Codex - Coq Plus + base propre de livraison - 10/07/2026

- Branding app finalise sur **Coq Plus** : shell, login, metadata, package,
  scripts/service, seed et parametres systeme. Prefixe BL par defaut : `CP`.
- Liste villes Maroc : `lib/villes.ts` contient maintenant le fallback local
  dedoublonne de **450 villes**. Le parametre `villes_maroc` est reseede en base.
  Dans l'ecran commande, le choix de ville se trouve dans le dialogue
  **Nouveau client**.
- Seed livraison : par defaut, `npm run seed` cree/met a jour les utilisateurs
  seed, parametres, compteurs, villes et catalogue produit uniquement. Les donnees
  demo/volume ne sont creees que si `SEED_DEMO_DATA=true`.
- Reset livraison : nouveau script `npm run reset:delivery-data`, qui conserve
  `users`, `accounts`, `verifications` et les parametres, puis supprime commandes,
  lignes, clients, clients externes, paiements, bons de charge, retours, objectifs,
  audit, sessions et produits avant reseed propre.
- Validation commande commercial : absence de client affiche maintenant
  `Choisir un client` et bloque avant transaction.
- Recette navigateur production `http://localhost:3107` : login `com1`, creation
  client inline `Client test Coq Plus` a `Oualidia`, commande `POULET ENTIER`
  `12,750 kg`, BL `CP-000001`, total `299,63 DH`. Donnees de test supprimees
  ensuite via reset + seed.
- Etat final base locale apres nettoyage : 9 users conserves dont 3 actifs
  (`admin`, `com1`, `com2`), 0 sessions, 0 clients, 0 commandes, 0 paiements,
  0 retours, 0 audit, 0 objectifs, 26 produits, compteurs BL/BC a 0.
- Verification : `npm run prisma:validate`, `npx tsc --noEmit`, `npm run lint`,
  `npm run test` (126/126), `npm run build` PASS.

## Mise a jour Codex - historique admins, catalogue et QA responsive - 10/07/2026

- Nouvelle section `/admin/historique-admins` dans la navigation et le dashboard.
  Elle reutilise `audit_log` et filtre cote Prisma les auteurs de role `ADMIN`.
- Filtres, pagination et export Excel sont partages avec le journal global ;
  l'export admin-only transmet et reapplique le filtre serveur `roleAuteur=ADMIN`.
- Catalogue `/admin/produits` affiche les 26 produits filtres sur une seule page,
  sans controles Precedent/Suivant. Recherche et CRUD restent inchanges.
- Permissions verifiees en navigateur : admin 200, commercial 403 sans donnee,
  anonyme redirige vers `/connexion`.
- QA responsive a 375 px : 16 routes admin et 7 routes commercial parcourues.
  Les overflows trouves sur produits, commandes admin/commercial, paiements,
  clients admin/commercial et utilisateurs ont ete corriges. Les tableaux larges
  gardent un scroll horizontal interne.
- Verification finale : `npx tsc --noEmit`, lint, build production et 113/113
  tests Vitest verts. Serveur local actif sur `http://localhost:3107`.

## Addendum Codex - diagnostic performance local - 10/07/2026

- Symptome confirme cote environnement : plusieurs processus Next du meme projet
  tournaient en parallele (`next dev`, `next start` et `next build`) et
  partageaient `.next`. Cela a provoque un serveur `3107` indisponible puis un
  build invalide sans `.next/BUILD_ID`.
- Correction de session : arret des processus Next/npm du projet, rebuild propre,
  puis redemarrage production sur `http://localhost:3107`. Compilation passee de
  47 s a 18,2 s apres nettoyage des processus concurrents.
- Diagnostic code : `/admin/historique-admins` n'est pas le goulet local
  (requete admin-audit rechauffee ~5-13 ms ; page navigateur ~190-250 ms).
  `/admin/produits` reste volontairement sans pagination.
- Optimisation appliquee : `app/admin/produits/produits-table.tsx` ne monte plus
  deux dialogues de confirmation par ligne produit. Un seul dialogue controle est
  reutilise pour activer/desactiver/supprimer, ce qui garde le catalogue complet
  plus leger quand le nombre de produits augmente.
- Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test` (125/125),
  `npm run build` OK. Test navigateur : ouverture du dialogue "Desactiver le
  produit ?" puis annulation, sans changement de donnees.

## Addendum Codex - QA navigateur daily-use complet - 11/07/2026

Campagne navigateur production sur `http://localhost:3107`, avec `admin` /
`password` et `com1` / `password`, prefixe donnees QA
`QA-FULL-202607110135`.

Valide en navigateur :

- Authentification, erreur login, permission commercial -> admin 403.
- Creation/modification client commercial, commande standard `CP-000003`,
  paiement complet, statut `Reglee`.
- Creation produit QA + changement de prix + historique prix.
- Creation client externe + commande externe `CP-000004`.
- Creation utilisateur commercial QA + objectif mensuel.
- Creation retour commercial, bon de charge `BC-000002`, details, KPI, audit
  global, historique admins, sessions, exports directs, parametrage.
- Sweep responsive 390 px : 10 routes admin + 7 routes commercial, aucun overflow
  document detecte.

Bugs confirmes pendant cette campagne, corriges ensuite :

- Plusieurs mutations sauvegardaient bien en MySQL mais ne rafraichissaient pas la
  liste/table sans reload : retour commercial, client externe admin, utilisateur
  admin, objectif utilisateur, bon de charge. Corrige dans l'addendum post-QA
  ci-dessous.
- Select Radix/controlle : apres creation commande, certains selects gardaient
  visuellement l'ancien libelle alors que l'etat interne etait reset. Corrige
  dans l'addendum post-QA ci-dessous.
- Parametrage : vider un champ optionnel deja renseigne (teste avec `telephone`)
  affichait un succes mais ne persistait pas la valeur vide. Corrige dans
  l'addendum post-QA ci-dessous.

Verification technique de cette passe :

- `npm run prisma:validate` OK
- `npx tsc --noEmit` OK
- `npm run lint` OK
- `npm run test` OK (126/126, 22 fichiers)
- `npm run build` OK

Etat base locale apres QA : donnees de test conservees pour inspection
(`users=10`, `clients=3`, `clients externes=1`, `commandes=4`,
`paiements=2`, `bons_charge=2`, `retours=2`, `produits=27`,
`objectifs=1`, `audit=85`, compteurs `numero_bl=4`, `numero_bc=2`).
Pour remettre la base en etat livraison propre : `npm run reset:delivery-data`
puis `npm run seed`.

## Addendum Codex - corrections post-QA et retest navigateur - 11/07/2026

Les 7 bugs confirmes dans la campagne daily-use du 11/07 ont ete corriges puis
retestes dans l'in-app browser sur le build production `http://localhost:3107`.

Corrections appliquees :

- Retours commercial : `app/retours/retour-form.tsx` force maintenant le refresh
  visible apres creation ; le select produit reste controle.
- Clients externes/admin : `app/admin/clients/clients-dialogs.tsx` et
  `app/admin/clients/clients-table.tsx` rafraichissent les tables apres creation,
  edition ou action serveur.
- Utilisateurs/admin : `app/admin/utilisateurs/utilisateurs-dialogs.tsx` et
  `app/admin/utilisateurs/utilisateurs-table.tsx` rafraichissent apres creation,
  activation/desactivation ou suppression logique.
- Objectifs : `app/admin/utilisateurs/[id]/objectifs/objectif-form.tsx`
  rafraichit la page apres sauvegarde.
- Bons de charge : `app/admin/charges/charge-form.tsx` redirige de facon fiable
  vers le detail cree et garde les selects controles.
- Commandes : `app/commandes/commande-form.tsx` et
  `app/commercial/clients/clients-dialogs.tsx` corrigent les selects
  controlled/uncontrolled et les libelles obsoletes apres submit.
- Parametrage : `app/admin/parametres/parametres-form.tsx` utilise un submit
  controle et transmet explicitement les champs vides, ce qui permet de vider un
  parametre optionnel comme `telephone`.

Retest navigateur valide :

- Retour `QA-FIX2-1783735747610 Retour refresh` visible apres creation.
- Client externe `QA-FIX2-1783735747610 Client Externe Fix` visible apres
  creation.
- Utilisateur `QA-FIX2-1783735747610 Commercial Fix` visible apres creation.
- Objectif `07/2026 = 4 321,00 DH` visible apres sauvegarde.
- Bon de charge `BC-000003` cree avec detail et total `1,250 kg`.
- Commande `CP-000005` creee ; les selects client/produit reviennent aux
  placeholders apres succes.
- `telephone` peut etre remis a vide en parametrage, verifie en DB et UI.
- Smoke final sur routes admin principales : aucun overflow horizontal, aucune
  nouvelle erreur/warning console.

Verification finale de cette passe :

- `npx tsc --noEmit` OK
- `npm run lint` OK
- `npm run test` OK (126/126)
- `npm run build` OK

Donnees QA conservees pour inspection. Pour revenir a l'etat livraison propre :
`npm run reset:delivery-data` puis `npm run seed`.

## Addendum Codex - modele facture/BL client - 11/07/2026

Demande client : faire ressembler le PDF facture/BL au modele fourni dans
`image.png`, avec les informations legales presentes dans
`CamScanner 15-05-2026 13.41.pdf`.

Changements appliques :

- `app/commandes/bon-livraison-pdf.tsx` remplace l'ancien PDF simple par un
  formulaire A4 proche du modele : logo centre, bloc BL/date/code client, bloc
  client, tableau produits, montant en lettres, totaux HT/TVA/TTC, conditions de
  reglement, cachet visuel, NET A PAYER et pied de page rouge.
- `app/commandes/document-data.ts` expose les champs necessaires au document :
  RC, ICE, identifiant fiscal, patente, adresse, telephone, TVA, Total HT,
  TVA, Total TTC, code client stable et montant en lettres.
- `app/admin/parametres/page.tsx` et `prisma/seed.ts` utilisent maintenant les
  valeurs legales Coq Plus par defaut : `COQ PLUS SARL`, RC
  `39869 MOHAMMEDIA`, ICE `003931636000009`, IF `72064177`, TP `39504226`,
  adresse `RDC 1 LOT EL FARAH MOHAMMEDIA`, TVA `0`.
- La base locale a ete alignee avec ces valeurs pour tester le rendu sans
  attendre un reset/seed.

Verification :

- Rendu direct d'une commande reelle `CP-000005` vers
  `tmp/pdfs/bl-reference-style.pdf`.
- `pdfinfo` : 1 page A4.
- PNG `tmp/pdfs/bl-reference-style-1.png` inspecte visuellement : document lisible,
  sans chevauchement ni texte coupe.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` (126/126) et
  `npm run build` OK.

Note : si aucun logo n'est televerse dans le parametrage admin, le PDF affiche
un badge texte `COQ PLUS`. Un vrai logo PNG/JPG televerse remplacera ce badge
automatiquement.

## Addendum Codex - images Docker preconstruites GHCR - 11/07/2026

Objectif : eviter les builds Docker de 10-20 minutes sur le VPS Contabo.

Changements appliques :

- Ajout de `.github/workflows/docker-image.yml` : a chaque push sur `main`, GitHub
  Actions construit le `Dockerfile` et pousse l'image
  `ghcr.io/mhdfx/coq-plus:latest` plus un tag `sha-...`.
- `docker-compose.ip.yml` et `docker-compose.prod.yml` utilisent maintenant
  `image: ${APP_IMAGE:-ghcr.io/mhdfx/coq-plus:latest}` au lieu de `build:`.
- Ajout de `docker-compose.build.yml` comme override de secours si une
  reconstruction locale/serveur est vraiment necessaire.
- `.env.production.example`, `docs/DEPLOYMENT.md` et `docs/CONTABO.md` documentent
  `APP_IMAGE`, le pull GHCR et la commande de secours.

Nouveau deploy VPS standard :

```bash
git fetch origin
git reset --hard origin/main
docker compose -f docker-compose.ip.yml pull app
docker compose -f docker-compose.ip.yml up -d app
WORK_DIR=/opt/apps/poulet-etoile COMPOSE_FILE=docker-compose.ip.yml ./scripts/verify-stack.sh
```

Si le package GHCR est prive, connecter Docker une seule fois :

```bash
echo VOTRE_GITHUB_TOKEN | docker login ghcr.io -u Mhdfx --password-stdin
```

Fallback lent uniquement :

```bash
docker compose -f docker-compose.ip.yml -f docker-compose.build.yml up -d --build app
```

## Addendum Codex - runbook deployement VPS - 11/07/2026

- Nouveau fichier racine `deployement.md` ajoute avec les informations du VPS,
  l'architecture Docker Compose, le chemin `/opt/apps/poulet-etoile`, l'image
  `ghcr.io/mhdfx/coq-plus:latest`, le flux de deploiement rapide, les commandes
  de verification, les problemes connus (`GHCR denied`, `Permission denied`) et
  le fallback lent par build local.
- Etat VPS confirme par l'utilisateur : `docker compose -f docker-compose.ip.yml
  pull app` telecharge l'image preconstruite, `up -d app` redemarre l'app,
  `poulet_etoile_app` et `poulet_etoile_mysql` sont healthy, et `/connexion`
  retourne HTTP 200.
- Systemd custom reste non installe car la tentative `sudo` a echoue ; les
  conteneurs utilisent deja `restart: unless-stopped`. A refaire plus tard avec
  acces sudo/root valide.

## Addendum Codex - QA navigateur live VPS - 11/07/2026

Recette navigateur effectuee sur `http://212.47.68.171` avec `admin`/`password`
et `com1`/`password`.

Valide sur le live :

- Sweep routes admin : dashboard, produits, prix en masse, commandes, nouvelle
  commande, charges, paiements, clients, retours, KPI, rapprochement,
  utilisateurs, objectifs, audit, historique admins, sessions, parametrage,
  exports. Aucun crash ni erreur console.
- Sweep routes commercial : dashboard, clients, commandes, nouvelle commande,
  commandes externes, retours, KPI. Aucun crash ni erreur console.
- Creation produit QA, client externe admin, commande admin externe, paiement
  complet, client commercial, commande commercial, retour magasin, utilisateur
  commercial QA.
- Audit global et historique admins affichent les actions creees ; retours admin
  affiche le retour commercial ; sessions actives charge correctement.
- Permission live verifiee : commercial allant directement sur
  `/admin/produits` est redirige vers `/403`.
- Responsive 390 px : routes principales admin et commercial sans overflow
  horizontal.

Correction live appliquee pendant la QA :

- Le VPS avait encore les anciens parametres base (`prefixeBl = PE`, ICE/RC
  placeholders, champs legaux manquants). Corrige via `/admin/parametres` :
  `COQ PLUS SARL`, RC `39869 MOHAMMEDIA`, ICE `003931636000009`, IF
  `72064177`, patente `39504226`, adresse `RDC 1 LOT EL FARAH MOHAMMEDIA`,
  TVA `0`, prefixe BL `CP`.
- Verification apres correction : nouvelle commande creee en live avec le BL
  `CP-001008`.

Limites / points restants :

- L'in-app browser n'a pas emis d'evenement de telechargement pour l'export Excel
  global ; la page et les liens sont presents sans erreur console, mais le
  telechargement doit etre confirme manuellement dans un navigateur classique ou
  via requete authentifiee.
- Donnees QA laissees en base live pour inspection avec le prefixe
  `QA-LIVE-1783783909491`, plus les BL `PE-001006`, `PE-001007` et
  `CP-001008`.
- Mots de passe seed (`admin`/`password`, `com1`/`password`) toujours a changer
  avant usage client reel.

## Addendum Codex - modifications commandes / facture / bons de charge - 11/07/2026

Demande client :

- Rendre l'ajout de commande admin plus evident.
- Nettoyer la facture/BL : retirer les clones/lignes vides, faire tenir le rendu,
  ajouter le telephone `+212626184088` dans le pied.
- Depuis la liste/detail des commandes admin, permettre de generer facilement le
  bon de charge exact de la commande.
- Un bon de charge lie a une commande ne peut etre genere qu'une seule fois ; il
  reste fige et ne peut qu'etre supprime.

Changements appliques :

- `Commande` et `BonCharge` sont lies en one-to-one via `bons_charge.commande_id`
  unique, migration `20260711172000_bon_charge_commande_unique`.
- Nouvelle action serveur `creerBonChargeDepuisCommande` :
  - admin uniquement ;
  - verrouille la commande en transaction ;
  - refuse toute generation si un BC existe deja, meme supprime ;
  - reprend commercial, date et quantites physiques de la commande ;
  - ignore les produits non stock (`suivi_stock=false`) ;
  - audite `bon_charge.creation_depuis_commande`.
- UI admin commandes : bouton `Ajouter une commande` plus clair, nouvelle colonne
  `Bon de charge` avec creation, lien vers le BC existant ou etat `BC supprime`.
- Detail commande admin : meme action/lien `Bon de charge`.
- Liste/detail bons de charge : affichage de la commande source quand le BC vient
  d'une commande ; apres suppression, retour vers la commande source.
- PDF BL : suppression des lignes vides forcees et du grand bloc vide ; le pied
  inclut toujours `Tel : +212626184088` si aucun telephone n'est renseigne.

Verification locale :

- Migration appliquee localement avec `npm run prisma:migrate:deploy`.
- `npm run prisma:validate`, `npm run prisma:generate`, `npx tsc --noEmit`,
  `npm run test` (131/131), `npm run lint`, `npm run build` OK.
- Smoke navigateur local `http://localhost:3107` :
  - commande test `CP-000001` creee localement ;
  - bouton `Bon de charge` depuis `/admin/commandes` genere `BC-000001` ;
  - detail BC affiche la commande source `CP-000001`, produit et quantite ;
  - retour liste commandes affiche `BC-000001` au lieu du bouton de generation.

## Addendum Codex - PDF bon de charge - 11/07/2026

Demande client : depuis le detail d'un bon de charge, pouvoir telecharger le bon
en PDF.

Changements appliques :

- Nouvelle route admin protegee `/admin/charges/[id]/pdf`.
- Nouveau chargeur `app/charges/document-data.ts` pour centraliser les donnees
  PDF d'un bon de charge : societe, commercial, commande source, lignes, total,
  createur et commentaire.
- Nouveau rendu `app/charges/bon-charge-pdf.tsx` avec mise en page A4 :
  entete societe, numero BC, cartes de contexte, tableau des produits charges,
  commentaire, signatures depot/commercial et pied avec telephone.
- Le detail `/admin/charges/[id]` affiche maintenant un bouton
  `Telecharger PDF` a cote de la suppression.
- Le helper logo PDF existant est exporte depuis `app/commandes/document-data.ts`
  pour eviter de dupliquer la lecture securisee des logos.

Verification locale :

- `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
- Smoke navigateur local sur
  `/admin/charges/cmrgxdma400013ou9x16njhbu` : bouton `Telecharger PDF`
  present et lien unique vers `/admin/charges/cmrgxdma400013ou9x16njhbu/pdf`.
- Requete authentifiee admin sur la route PDF : HTTP 200, `application/pdf`,
  `attachment; filename="BC-000001.pdf"`, signature `%PDF-`.
- PDF rendu en PNG via `pdftoppm` et inspecte visuellement : page lisible,
  tableau aligne, signatures et pied presents.

## Addendum Codex - commandes admin rattachees aux admins - 11/07/2026

Demande client : dans la creation de commande admin, permettre de rattacher une
commande a un administrateur aussi bien qu'a un commercial, meme si le modele
metier initial parlait uniquement de commerciaux.

Changements appliques :

- `/admin/commandes/nouvelle` charge maintenant les utilisateurs actifs de role
  `ADMIN` et `COMMERCIAL` dans le select de rattachement.
- Le libelle UI admin devient `Responsable` au lieu de `Commercial` pour ce
  champ, avec distinction `Admin` / `Commercial` dans les options.
- L'action serveur de creation de commande admin accepte un responsable actif
  `ADMIN` ou `COMMERCIAL`; les commandes creees restent stockees dans
  `commandes.utilisateur_id`.
- La creation/modification admin de clients standards accepte aussi un
  responsable actif `ADMIN` ou `COMMERCIAL`, afin qu'un admin puisse creer un
  client standard rattache a lui depuis le formulaire de commande.
- L'ecran `/admin/clients` et ses dialogues utilisent la meme liste de
  responsables pour eviter de creer des clients impossibles a modifier ensuite.

Verification locale :

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (133/133),
  `npm run build` OK.
- Tests ajoutes : creation d'une commande admin rattachee a un admin, creation
  d'un client standard rattache a un admin.
- Requete authentifiee sur `/admin/commandes/nouvelle` : HTTP 200 et presence
  de `Responsable`, `Administrateur (admin) - Admin` et de la description mise a
  jour.

## Addendum Codex - pages parfois bloquees apres rebuild/deploiement - 11/07/2026

Observation utilisateur : certaines pages semblent parfois ne plus reagir apres
un clic, puis refonctionnent apres un rafraichissement manuel.

Analyse :

- Logs serveur locaux propres, aucun crash Next.js visible.
- Reproduction en onglet frais sur `/admin/commandes/nouvelle` : chargement OK,
  selecteurs/boutons OK, aucune erreur console.
- Le symptome correspond surtout au cas Next.js classique apres rebuild ou
  redeploiement : un onglet garde des references vers d'anciens chunks JS, puis
  une navigation/click client tente de charger un fichier qui n'existe plus. Le
  refresh manuel recharge le HTML et les nouveaux chunks, donc la page repart.

Correction appliquee :

- Ajout de `components/chunk-reload-guard.tsx`, monte dans `app/layout.tsx`.
- Le guard ecoute `error` et `unhandledrejection`; si l'erreur ressemble a
  `ChunkLoadError`, `Loading chunk`, `Loading CSS chunk` ou un echec d'import
  dynamique, la page se recharge automatiquement une seule fois sur une fenetre
  de 30 secondes.
- Fallback memoire si `sessionStorage` est indisponible afin que le gestionnaire
  d'erreur ne puisse pas planter lui-meme.

Verification locale :

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (133/133),
  `npm run build` OK.
- Serveur prod local redemarre sur `:3107`.
- Smoke navigateur sur `/admin/commandes/nouvelle` : page chargee, option admin
  presente, bouton `Ajouter une ligne` fonctionne, aucune erreur console.

## Addendum Codex - finitions production villes, paiements, quantites, cachet BL - 12/07/2026

Corrections appliquees apres QA live VPS :

- Liste villes Maroc : `lib/villes.ts` fusionne maintenant les villes stockees
  en base avec la liste code de reference. Une ancienne valeur production
  `villes_maroc` limitee a 15 villes ne peut donc plus masquer `Oualidia`,
  `Akchour`, `Taroudannt` et le reste du catalogue.
- Paiement commande : `app/commandes/paiement-form.tsx` force un reload court
  apres mutation reussie, pour garantir que `Paye`, `Reste`, `Statut` et la
  ligne paiement visible se reconciliant immediatement apres un seul clic.
- Quantites UI : les details commandes admin/commercial et les retours
  admin/commercial utilisent `formatQuantite`, donc affichage francais
  `2,000 kg` au lieu de `2.000 kg`.
- PDF BL : ajout de `public/cachet.png` et integration dans
  `app/commandes/bon-livraison-pdf.tsx`. Le cachet reel est affiche dans le bas
  du BL, avec fallback texte si le fichier est absent.

Verification locale build production `http://localhost:3110` :

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (133/133),
  `npm run build` OK.
- Navigateur : dialogue `Nouveau client` affiche 450 villes et contient
  `Akchour`, `Oualidia`, `Taroudannt`.
- Navigateur : detail commande affiche `2,000 kg` avec virgule.
- Navigateur : ajout paiement unique affiche apres reload `Paye : 1,00 DH`,
  `Reste : 35,00 DH` et la ligne paiement.
- PDF BL local rendu en PNG depuis `/admin/commandes/.../pdf` : cachet reel
  visible en bas, layout A4 conserve, footer present.

## Addendum Codex - BL modifiables, tarifs PDF et corbeille - 12/07/2026

Demandes client traitees :

- Cachet : `public/cachet.png` a ete remplace par l'image transparente
  `cachetnobg.png`. Les PDF BL et la liste des prix utilisent donc le cachet
  sans fond.
- BL admin : chaque detail commande admin expose maintenant `Modifier BL` vers
  `/admin/commandes/[id]/modifier`. La modification conserve le numero BL,
  recalcule les lignes/prix cote serveur, audite `commande.modification` et
  bloque la modification si un bon de charge actif existe deja. Dans ce cas,
  l'admin doit supprimer le BC avant de modifier le BL.
- Suppression BL : le bouton existant `Supprimer la commande` reste la voie de
  suppression logique. Les lignes de commande sont aussi marquees supprimees.
- Creation admin : le responsable d'une commande peut etre un `ADMIN` ou un
  `COMMERCIAL`, avec clients standards rattaches au responsable choisi.
- Liste des prix : nouvelle section admin `/admin/produits/tarifs` et PDF
  `/admin/produits/tarifs/pdf`, avec les produits actifs sur une seule page A4,
  watermark Coq Plus, cachet, note et footer societe.
- Corbeille : nouvelle section `/admin/corbeille`, visible dans la sidebar,
  listant les elements soft-delete et les traces de suppression/fusion. La
  restauration automatique est volontairement desactivee pour ne pas casser les
  liens commandes, paiements et bons.
- Date BL modifiee : stockage stabilise a midi UTC pour eviter les decalages de
  jour sur un champ date-only stocke dans une colonne DateTime MySQL.

Verification locale build production :

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (133/133),
  `npm run build` OK.
- Navigateur `http://localhost:3114` :
  - creation d'une commande admin rattachee a `Administrateur (admin) - Admin`
    avec client rapide `Oualidia`, produit, quantite et total recalcules.
  - detail BL cree : `Modifier BL`, `PDF BL`, `Bon de charge` et
    `Supprimer la commande` visibles.
  - modification BL sans BC actif : quantite `2,300 kg`, total `41,40 DH`,
    redirection detail OK, date affichee `12/07/2026`.
  - modification BL avec BC actif : blocage attendu avec message demandant de
    supprimer le bon de charge avant modification.
  - `/admin/produits/tarifs` : 26 produits actifs, lien PDF visible.
  - `/admin/produits/tarifs/pdf` : PDF rendu en navigateur, une seule page
    (`1 / 1`), cachet visible dans la miniature.
  - `/admin/commandes/[id]/pdf` : BL rendu en navigateur, cachet transparent
    visible en bas du document.
  - `/admin/corbeille` : page chargee, colonnes Type/Element/Details/Supprime
    le/Supprime par/Trace, aucune erreur console.

## Addendum Codex - ranking dashboard et adresses clients - 12/07/2026

Demandes client traitees :

- Dashboard admin : ajout de cinq panels de ranking dans `/admin` :
  commerciaux, meilleurs produits, villes les plus fortes, meilleurs clients et
  clients a encaisser.
- Les classements utilisent les commandes de la periode filtree et recalculent
  CA, quantites, nombre de BL et reste du via les helpers Decimal existants.
- Clients : ajout du champ `adresse` sur `clients` et `clients_externes`, avec
  migration MySQL `20260712171000_client_adresse`.
- Creation/modification client admin et commercial : adresse obligatoire dans
  les dialogues et auditee avec les autres champs.
- Creation commande : le dialogue client rapide demande maintenant l'adresse et
  la stocke avant d'ajouter les produits.
- Seed/demo : les clients de demonstration recoivent aussi une adresse en create
  et en update, afin de ne pas recreer de fiches incompletes.
- PDF BL : l'adresse apparait dans le cadre client et dans le site de livraison.
- PDF bon de charge : quand le bon vient d'une commande, le PDF affiche le
  client, la ville et l'adresse de livraison.

Verification locale build production :

- `npx prisma generate`, `npx prisma migrate deploy`, `npx tsc --noEmit`,
  `npm run lint`, `npm run test` (133/133), `npm run build` OK.
- Navigateur `http://localhost:3115` :
  - dashboard admin charge, KPI existants visibles, panels rankings produits et
    villes visibles, sans erreur console.
  - creation client rapide `QA Adresse ...` avec ville `Oualidia` et adresse
    `12 Rue Test Adresse, Quartier Centre`.
  - creation commande `CP-000003`, produit `Abats de poulet`, quantite
    `1,500 kg`, total `27,00 DH`.
  - detail commande : client, ville, ligne produit, total et bouton
    `Bon de charge` visibles.
  - PDF BL `CP-000003` : adresse visible dans le cadre client et dans le site de
    livraison.
  - bon de charge `BC-000002` cree depuis la commande, detail charge visible et
    lien `/admin/charges/[id]/pdf` present.
  - page clients admin filtree : colonne `Adresse` visible avec l'adresse du
    client de test.

Note QA :

- Apres une navigation directe vers un PDF bon de charge en `attachment`, le
  wrapper navigateur Codex a parfois renvoye un DOM vide sur l'onglet courant.
  Un nouvel onglet et les captures visuelles confirmaient que l'app restait
  fonctionnelle. Le endpoint bon de charge est attendu en telechargement, pas en
  preview inline.

## Addendum Codex - style sidebar - 12/07/2026

Demande client traitee :

- Sidebar desktop retravaillee dans `components/app-shell.tsx` : largeur
  `248px`, fond bleu en gradient, logo plus lisible, active state blanc,
  icones dans pastilles, hover/focus plus nets et scrollbar fin.
- `components/squelette-page.tsx` aligne le placeholder de chargement sur la
  nouvelle largeur pour eviter un saut visuel.

Verification :

- `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.
- Navigateur production local `http://localhost:3115/admin` : sidebar desktop
  visible, active state propre, scrollbar discret, aucune erreur console.
- Viewport mobile `390x844` : aside desktop masque comme attendu, navigation
  mobile conservee, aucune erreur console.
