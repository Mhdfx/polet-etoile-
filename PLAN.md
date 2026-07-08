# PLAN.md — Plan de réalisation pas à pas (Poulet Étoilé / Naomedia)

> Plan opérationnel dérivé de `CLAUDE.md` (règles), `HANDOFF.md` (état/intentions) et
> `AGENTS.md`/`COLLABORATION.md` (protocole multi-agents). **Plusieurs modèles/agents
> travailleront sur ce projet** : chaque étape indique son propriétaire, ses
> dépendances, et les portes de synchronisation (« GATE ») où Mehdi valide avant de
> continuer.
>
> Discipline : cocher les cases au fil du build, committer souvent, mettre à jour
> `HANDOFF.md` §9 quand une phase change d'état. Ne JAMAIS sauter une GATE.

**Légende propriétaires** : `[CC]` Claude Code (lead/architecte/design) · `[CX]` Codex
(constructeur suiveur) · `[M]` Mehdi (humain, arbitre/schéma) · `[CC+CX]` revue croisée.

---

## Entrées manquantes (à fournir par Mehdi — bloquantes par phase)

| Entrée | Bloque | Détail |
|---|---|---|
| `CDC_Freelance_Technique_Gestion_Commerciale.pdf` dans le repo (ou extraits) | Phase 1 (seed catalogue §14), Phase 7 (formules KPI §7.4), Phase 8 (recette §16.2) | Le CDC est référencé partout mais absent du dossier. |
| Réponse client Q1 : n° + date d'échéance pour chèque/traite ? | Phase 5 (modèle paiement) | Hypothèse actuelle : `reference` optionnel, pas de `date_echeance`. |
| Réponse client Q2 : paiement par commande ou solde global client ? | Phase 5 | Hypothèse actuelle : par commande. |
| Réponse client Q3 : « RELIQUAT PAYEMENT » inclus dans les KPI ? | Phase 7 | Hypothèse actuelle : produit normal inclus. |
| URL du dépôt Git Naomedia | Phase 0.1 (remote) / livraison | Peut démarrer en local en attendant. |

---

## Phase 0 — Socle technique (séquentiel, un seul agent : [CC], supervision [M])

Objectif : projet qui build, base qui tourne, outillage agents en place. **Aucun
parallélisme avant la fin de la Phase 3.**

- [ ] **0.1 Git** `[CC]`
  - [ ] `git init`, branche `main`, `.gitignore` (node, `.env*`, `graphify-out/`, `.next/`)
  - [ ] Premier commit : les 5 fichiers `.md` (docs = mémoire partagée)
  - [ ] Brancher le remote Naomedia quand l'URL est connue
- [ ] **0.2 Init Next.js 15** `[CC]`
  - [ ] `create-next-app` : App Router, TypeScript, Tailwind, `src/` non (suivre défaut), ESLint
  - [ ] `tsconfig.json` : vérifier `strict: true` (non négociable)
  - [ ] Vérifier `npm run build` vert à vide
- [ ] **0.3 Dépendances** `[CC]`
  - [ ] Data : `prisma`, `@prisma/client`, `decimal.js`, `zod`
  - [ ] Auth : `better-auth`
  - [ ] UI : `shadcn/ui` (init + composants de base), `@tanstack/react-table`, `@tremor/react` (ou recharts)
  - [ ] Sorties : `@react-pdf/renderer`, `exceljs`
  - [ ] Dates : `luxon` + `@types/luxon`
  - [ ] Tests : `vitest` (+ config, script `npm run test`)
- [ ] **0.4 PostgreSQL local** `[CC]`
  - [ ] `docker-compose.yml` : service `postgres` (volume, port, credentials via `.env`)
  - [ ] `.env` + `.env.example` (`DATABASE_URL`, secrets Better Auth)
  - [ ] Vérifier connexion (`prisma db pull` sur base vide ou `psql`)
- [ ] **0.5 Arborescence & conventions** `[CC]`
  - [ ] `app/(auth)/`, `app/(commercial)/`, `app/(admin)/` — groupes de routes par espace
  - [ ] `lib/` (db, auth, decimal, dates, format), `components/ui/`, `modules/` métier si retenu
  - [ ] Documenter l'arborescence choisie dans `HANDOFF.md` §10
- [ ] **0.6 Outillage agents** `[CC]`
  - [ ] Installer graphify + hooks git `post-commit`/`post-checkout` (⚠ pinner l'interpréteur
        Python `_PINNED` — username Windows avec espaces)
  - [ ] Installer les skills `.claude/skills/` référencés par `COLLABORATION.md` §4
        (`ui-ux-pro-max`, `impeccable`, `minimalist-ui`…) — signaler à [M] s'ils sont absents
  - [ ] `README.md` squelette (installation, env, seed — complété au fil de l'eau)

**GATE G0 `[M]`** : `npm run build` vert · `docker compose up` OK · commit initial poussé.

---

## Phase 1 — Schéma Prisma + migrations + seeders (⚠ LA phase la plus importante)

Objectif : figer LA source de vérité. Propriétaire : `[CC]` rédige, `[M]` valide et fige.
Après la GATE G1, **plus aucun agent ne touche au schéma** (évolutions via Mehdi uniquement).

- [ ] **1.1 Rédiger `prisma/schema.prisma` complet** `[CC]` — noms 100 % français, d'après `HANDOFF.md` §4 :
  - [ ] `users` (nom_utilisateur unique, mot_de_passe hashé, role enum admin|commercial, actif, derniere_connexion_at, soft delete)
  - [ ] `objectifs` (utilisateur_id, mois AAAA-MM, montant_objectif Decimal(10,2), created_by)
  - [ ] `produits` (nom, categorie, unite kg, prix_reference Decimal(10,2), actif, ordre_affichage, soft delete)
  - [ ] `historique_prix` (produit_id, ancien_prix, nouveau_prix, utilisateur_id, date)
  - [ ] `clients` + `clients_externes` (nom, region_ville, telephone, commercial_id, soft delete)
  - [ ] `commandes` (numero_bl unique, client_id / client_externe_id nullable, utilisateur_id, date_commande, type_commande enum, soft delete — PAS de colonne statut_paiement : calculé)
  - [ ] `lignes_commande` (commande_id, produit_id, quantite Decimal(10,3), prix_unitaire figé Decimal(10,2), prix_net Decimal(10,2) — PAS de remise, soft delete)
  - [ ] `paiements` (commande_id, montant Decimal(10,2), mode_paiement enum espèces|chèque|traite|autre, date_paiement, reference nullable, encaisse_par, created_at)
  - [ ] `retours` (produit_id, quantite_kg Decimal(10,3), commentaire, utilisateur_id, created_at — immuable)
  - [ ] `parametres_systeme` (cle unique, valeur, updated_by, updated_at)
  - [ ] `audit_log` (utilisateur_id, action, entite, entite_id, donnees_avant/apres JSON, ip_address, created_at)
  - [ ] Index : recherches fréquentes (commandes par utilisateur+date, clients par commercial, paiements par commande)
- [ ] **1.2 Séquence PostgreSQL `numero_bl`** `[CC]`
  - [ ] `CREATE SEQUENCE` dans une migration SQL custom (jamais `max+1` applicatif)
  - [ ] Helper serveur unique `attribuerNumeroBL(tx)` qui tire `nextval` DANS la transaction de création
  - [ ] Préfixe lu depuis `parametres_systeme` au moment du formatage (jamais stocké dans la séquence)
- [ ] **1.3 Migration initiale** `[CC]` : `prisma migrate dev`, vérifier SQL généré (types Decimal corrects)
- [ ] **1.4 Seeders** `[CC]` (`prisma/seed.ts`) :
  - [ ] Catalogue avicole complet (**CDC section 14 — entrée manquante**, y c. « RELIQUAT PAYEMENT »)
  - [ ] Liste des villes Maroc (région client prédéfinie)
  - [ ] `parametres_systeme` : raison sociale, ICE, RC, préfixe BL, fuseau Africa/Casablanca, taux TVA (non appliqué)
  - [ ] 1 admin + 2 commerciaux de test
  - [ ] Jeu de cas limites (CDC §15) : client sans commande, produit désactivé, commande payée en totalité, commande partiellement payée
- [ ] **1.5 Lib de base liée au modèle** `[CC]`
  - [ ] `lib/decimal.ts` : helpers decimal.js (calcul prix_net, sommes, arrondis 2 déc.)
  - [ ] `lib/format.ts` : `formatMontant` (« 60 037,00 DH »), `formatDate` (JJ/MM/AAAA)
  - [ ] `lib/dates.ts` : Luxon, bornes de filtre inclusives (`>= début 00:00` et `< fin+1j 00:00` heure locale Casablanca)
  - [ ] Tests Vitest sur ces trois libs (arrondis, milliers, bornes de dates)

**GATE G1 `[M]`** : Mehdi relit et **fige le schéma**. Migration appliquée, seed OK,
tests libs verts, commit `feat: schema prisma fige + seed`. → Le schéma devient loi commune.

---

## Phase 2 — Auth, rôles, paramétrage (`[CC]`, séquentiel)

- [ ] **2.1 Better Auth** : sessions en base, credentials nom_utilisateur/mot de passe, hash sûr
- [ ] **2.2 Page de connexion** (français, mobile-first, erreurs claires, anti double-soumission)
- [ ] **2.3 Garde serveur** : helpers `requireSession()`, `requireAdmin()`, `requireCommercial()` —
      utilisés dans CHAQUE server action / page ; redirections par rôle
- [ ] **2.4 Pages 403 / 404 / 500 dédiées** (le 403 ne révèle pas l'existence de la ressource)
- [ ] **2.5 `derniere_connexion_at`** mis à jour au login ; base des « sessions actives » (UI en Phase 7)
- [ ] **2.6 Écran admin Paramétrage** : CRUD `parametres_systeme` (raison sociale, ICE, RC, logo, préfixe BL…) + audit des modifications
- [ ] **2.7 Tests** : accès commercial → route admin = 403 ; session expirée → redirection login

**GATE G2 `[M]`** : login fonctionne pour les 2 rôles, 403 vérifié serveur, build + tests verts.

---

## Phase 3 — Fondations front / design system (`[CC]` SEUL — Codex ne touche à rien ici)

Esthétique : app de gestion terrain sobre (cf. `COLLABORATION.md` §4) — lisibilité mobile,
densité, une couleur d'accent + couleurs fonctionnelles (vert = payé, rouge/orange = non réglé).

- [ ] **3.1 Thème Tailwind** : tokens couleurs/typo/espacements ; consulter `ui-ux-pro-max` et `minimalist-ui`
- [ ] **3.2 `AppLayout`** : nav mobile-first (bottom bar/burger) côté commercial, sidebar côté admin, en-tête avec user + déconnexion
- [ ] **3.3 Kit de composants `components/ui/`** :
  - [ ] `Button` (états loading/disabled), `Input`, `Select`, `Textarea` + affichage erreurs Zod au champ
  - [ ] `CardKPI` (valeur + libellé + variation, état « — » sans données)
  - [ ] `DataTable` (wrapper TanStack : **pagination serveur**, tri, état vide explicite, skeleton)
  - [ ] `BadgeStatut` (payé/en attente), `Modal`/`ConfirmDialog`, `ChampMontant` / `ChampQuantite` (saisie décimale virgule)
  - [ ] Filtre de période (dates JJ/MM/AAAA, bornes inclusives via `lib/dates.ts`)
- [ ] **3.4 Deux écrans de référence** (la « bible visuelle » que Codex imitera) :
  - [ ] Un tableau de bord (shell + CardKPI + graphe placeholder)
  - [ ] Un formulaire complet (validation, chargement, erreurs, succès)
- [ ] **3.5 QA design** : `/impeccable init` + audit sur les 2 écrans ; `prefers-reduced-motion` respecté

**GATE G3 `[M]`** : design validé. **À partir d'ici le parallélisme est ouvert** :
Codex peut consommer `components/ui/` (sans jamais les modifier).

---

## Phase 4 — CRUD admin (PARALLÈLE : zones étanches)

Chaque module suit la même check-list micro-steps : schéma Zod partagé → server actions
(permissions + audit + soft delete) → liste paginée serveur (état vide) → formulaire
(validation champ, anti double-soumission) → tests Vitest → commit + `HANDOFF.md`.

- [ ] **4A Produits & prix** `[CC]` *(sensible : argent + historique)*
  - [ ] CRUD produit (soft delete = disparaît des listes de sélection, reste dans l'historique)
  - [ ] Changement de prix ⇒ écrit `historique_prix` dans la MÊME transaction
  - [ ] MàJ prix en masse = transaction atomique ; écran historique des prix
  - [ ] Test : changer un prix ne modifie AUCUNE commande passée
- [ ] **4B Utilisateurs & objectifs** `[CC]`
  - [ ] CRUD users (rôles, actif/inactif, reset mot de passe), soft delete
  - [ ] Objectifs mensuels en DH par commercial (mois AAAA-MM), created_by
- [ ] **4C Clients & clients externes** `[CX]` *(premier module Codex : suivre l'écran de référence)*
  - [ ] CRUD clients (ville = select liste prédéfinie, rattachement commercial_id), soft delete
  - [ ] CRUD clients externes (admin uniquement, invisibles côté commercial)
  - [ ] Côté commercial : voir/gérer uniquement SES clients (403 sinon — testé)
  - [ ] Fusion de clients (si retenue) : transaction atomique multi-tables + audit

**GATE G4 `[M]`** : les 3 CRUD finis selon la check-list `AGENTS.md` ; cohérence visuelle
du module Codex vérifiée contre les écrans de référence.

---

## Phase 5 — ⭐ Commande + Paiement (`[CC]` construit, `[CX]` revue croisée obligatoire)

⚠ Avant de finaliser le paiement : réponses client Q1 & Q2 (voir tableau des entrées).
Le cœur peut se construire avec les hypothèses actuelles.

- [ ] **5.1 Contrat de données figé d'abord** : schémas Zod `creerCommandeSchema`,
      `ajouterPaiementSchema` + types partagés (noms de champs = ceux du schéma Prisma)
- [ ] **5.2 Server action `creerCommande`** :
  - [ ] Recalcule TOUT côté serveur : relit `prix_reference` en base, fige `prix_unitaire`, calcule `prix_net = quantite × prix_unitaire` en decimal.js — rejette toute incohérence avec les totaux clients
  - [ ] Transaction atomique : commande + lignes + `nextval` séquence BL + audit — tout ou rien
  - [ ] Permissions : commercial ⇒ uniquement pour SES clients ; admin ⇒ sélecteur de commercial (tracé audit)
  - [ ] Garantie anti double-soumission côté serveur (idempotence/contrainte)
- [ ] **5.3 Formulaire commande commercial** (mobile-first, l'écran le plus utilisé) :
  - [ ] Sélection client (ses clients actifs) → lignes produits (produits actifs, quantité kg à virgule) → prix affiché non éditable → total live (affichage seulement)
  - [ ] États : chargement, erreurs au champ, succès → écran récap avec numéro BL
- [ ] **5.4 Formulaire commande admin** : idem + sélecteur commercial + choix client externe (type_commande externe)
- [ ] **5.5 Détail commande** : lignes, totaux, montant payé, **reste dû**, badge statut calculé
- [ ] **5.6 Paiements (admin uniquement)** :
  - [ ] `ajouterPaiement` : montant ≤ reste dû, mode enum, reference optionnelle, encaisse_par, audit
  - [ ] Statut calculé partout : `payé` si reste_dû = 0 sinon `en attente` — jamais stocké
  - [ ] (Selon Q1 : ajouter `date_echeance` ⇒ évolution schéma via [M])
- [ ] **5.7 Suppression commande** : admin seul, soft delete + audit (les paiements restent visibles dans l'historique)
- [ ] **5.8 Tests Vitest (obligatoires)** :
  - [ ] Calculs decimal (arrondis, quantités 3 déc., totaux)
  - [ ] Concurrence : 2 créations simultanées ⇒ 2 numéros BL distincts, sans trou
  - [ ] Totaux client falsifiés ⇒ rejet ; commercial → commande d'un collègue ⇒ 403
  - [ ] Paiement > reste dû ⇒ rejet ; Σ paiements = total ⇒ statut payé
- [ ] **5.9 REVUE CROISÉE `[CX]`** : bugs, Decimal/arrondis, permissions, concurrence BL, compléter les tests

**GATE G5 `[M]`** : module critique validé après revue croisée. Rien d'autre ne dépend
autant du reste — ne pas passer outre.

---

## Phase 6 — Listes, retours, PDF, Excel (`[CX]` majoritaire, en parallèle possible avec Phase 7A)

- [ ] **6.1 Liste commandes commercial** `[CX]` : SES commandes, pagination serveur (2 200+ lignes), filtre période inclusif, recherche client, état vide explicite
- [ ] **6.2 Liste commandes admin** `[CX]` : toutes + filtres (commercial, client, type, statut paiement calculé, période)
- [ ] **6.3 Retours magasin** `[CX]` : saisie commercial (produit, quantité kg, commentaire), horodaté + lié au compte automatiquement, **non modifiable** après création (aucune action d'édition, garanti serveur), liste consultable
- [ ] **6.4 PDF Bon de livraison** `[CX]` construit, `[CC]` relit *(sortie d'argent)* :
  - [ ] Template @react-pdf alimenté par `parametres_systeme` (raison sociale, ICE, RC, logo, préfixe) — **rien en dur**
  - [ ] Montants via les MÊMES helpers `lib/format.ts`/`lib/decimal.ts` que l'écran — identité écran/PDF = critère de recette
- [ ] **6.5 Export Excel** `[CX]` : exceljs, commandes filtrées, mêmes montants/formats, colonnes françaises
- [ ] **6.6 Tests** : cohérence montants écran/PDF/Excel sur une commande de référence ; filtres de dates aux bornes (commande à 23h59 heure Casablanca incluse)

**GATE G6 `[M]`** : parcours complet commercial (commande → liste → PDF) démontré sur mobile.

---

## Phase 7 — KPI + pilotage (parallèle : 7A `[CC]` / 7B `[CX]`)

⚠ Nécessite : formules KPI du CDC §7.4 (entrée manquante) + réponse client Q3 (RELIQUAT PAYEMENT).

- [ ] **7A KPI** `[CC]` :
  - [ ] Module `kpi` centralisé : toutes les formules calculées depuis les commandes/paiements (jamais de totaux stockés), période inclusive, decimal.js
  - [ ] Dashboard commercial : CA période, nb commandes, jauge objectif mensuel (DH), top clients/produits — états « 0,00 DH » / « — », jamais NaN
  - [ ] Dashboard admin consolidé : CA global, par commercial, **« Non réglé » = Σ restes dus**, graphes Tremor, tops
  - [ ] Tests : formules, périodes vides, exclusion des soft-deleted, (in)clusion RELIQUAT selon Q3
  - [ ] **Revue croisée `[CX]`** (3ᵉ module critique)
- [ ] **7B Audit & sessions** `[CX]` :
  - [ ] Journal d'audit admin : lecture seule, pagination serveur, filtres (utilisateur, entité, action, période), diff avant/après lisible
  - [ ] Vérifier que TOUTES les actions sensibles écrivent bien l'audit (revue transversale — signaler les manques, ne pas patcher hors de sa zone)
  - [ ] Sessions actives : liste (user, dernière activité, IP) + **déconnexion forcée** par l'admin (invalidation serveur immédiate)

**GATE G7 `[M]`** : chiffres KPI vérifiés à la main contre le seed ; revue croisée KPI faite.

---

## Phase 8 — Durcissement, recette, déploiement (`[CC+CX]`, assignation par [M])

- [ ] **8.1 Recette CDC §16.2** (entrée manquante) : dérouler chaque cas de recette, corriger, ajouter un test Vitest par cas
- [ ] **8.2 Passe sécurité** : re-tester chaque route/action en commercial ET en anonyme (403/redirect systématiques) ; aucune stack trace exposée ; rate-limit sur le login
- [ ] **8.3 Passe concurrence** : créations simultanées (BL), paiements simultanés sur la même commande (reste dû jamais négatif)
- [ ] **8.4 Passe cas limites UI** : chaque écran vidé/surchargé, mobile réel, `impeccable audit` global
- [ ] **8.5 Déploiement** : Dockerfile prod multi-stage, Coolify sur VPS, migrations au déploiement, seed de recette, sauvegardes Postgres
- [ ] **8.6 Livrables CDC §15** : README final (installation, env, seed), doc courte des choix techniques (dont : pas de remise, table paiements, statut calculé), historique Git propre poussé chez Naomedia
- [ ] **8.7 `HANDOFF.md` final** : statut « livré », questions résolues, procédure d'exploitation

**GATE G8 `[M]`** : recette complète verte sur l'environnement de recette → livraison Naomedia.

---

## Matrice de parallélisme (qui peut travailler quand)

| Après GATE | Claude Code | Codex |
|---|---|---|
| G0→G3 | Tout (socle, schéma, auth, design) | **Rien** (attend les fondations) |
| G3 | 4A Produits, 4B Users | 4C Clients |
| G4 | 5 Commande+Paiement | (relecture 5 en fin de phase ; peut préparer 6.3 Retours si zone étanche) |
| G5 | 7A KPI | 6.1–6.5 Listes/PDF/Excel |
| G6/G7 | Revue 6.4 PDF ; corrections | 7B Audit/Sessions ; revue 7A |
| G7 | 8 durcissement (assignation par module, zones étanches) | 8 durcissement |

Rappels absolus (détail dans `AGENTS.md`) : un seul agent par fichier/dossier ·
schéma Prisma modifiable par Mehdi seulement · Codex ne touche jamais `lib/`,
`components/ui/`, le thème, le layout · tout module « terminé » = check-list
`AGENTS.md` cochée (build vert, tests verts, états vides/erreurs/403, français partout,
commit + `HANDOFF.md` à jour).
