# whatsleft.md - Etat final des ecarts CDC

Derniere mise a jour : 10/07/2026.

Objectif de ce fichier : montrer clairement ce qui reste pour la livraison code
par rapport au `cdc.md`. Les anciennes sections "a faire" ont ete reconciliees
avec le code actuel.

## Synthese

Statut code : **pret cote fonctionnalites CDC principales et hardening local**.

Verification finale :

- `npm run prisma:validate` : OK
- `npx tsc --noEmit` : OK
- `npm run lint` : OK
- `npm run build` : OK
- `npm run test` : OK, 110/110 tests
- `npm run seed` : OK lors de la passe precedente

Base de demonstration locale apres seed :

- 26 produits catalogue CDC
- 1 003 commandes actives
- 1 000 commandes de volume `seed-volume-*`

## Phases whatsleft

| Phase | Statut | Code / preuve |
|---|---|---|
| 1. Dashboards reels `/admin` + `/commercial` | Fait | `app/admin/page.tsx`, `app/commercial/page.tsx`, `lib/kpi.ts` |
| 2. Parametrage systeme `/admin/parametres` | Fait | `app/admin/parametres/*`, upload logo, audit, compteur BL lecture seule |
| 3. Vue commandes externes commercial | Fait | `app/commercial/commandes/externes/page.tsx`, export filtre |
| 4. KPI consolide + graphiques | Fait | `app/admin/kpi/page.tsx`, `app/admin/kpi/kpi-charts.tsx`, Recharts |
| 5. Fiche client detaillee | Fait | `app/admin/clients/[id]`, `app/admin/clients/externes/[id]`, `app/commercial/clients/[id]` |
| 6. Fusion clients + doublons | Fait | `app/admin/clients/fusion/*`, `fusionnerClientsAdmin` |
| 7. Exports audit/global | Fait | `app/admin/audit/export`, `app/admin/exports/global`, jobs exports |
| 8. Seed catalogue + 1 000 commandes | Fait | `prisma/seed.ts` |
| 9. Finitions UX | Fait code | inline client commande, listes enrichies, categories, sessions bulk logout |
| 10. QA finale + documentation ecarts | Fait cote repo | `docs/CDC_DEVIATIONS.md`, `docs/DEPLOYMENT.md`, Dockerfile |
| 11. Hardening CDC local hors deploiement | Fait code | `/admin/paiements`, `/admin/exports`, brouillon commande, audit auth, erreurs dates |
| 12. Securite applicative | Fait code | auth/CSRF, exports prives isoles, uploads signes, headers HTTP, seed production, `docs/SECURITY.md` |

## Details par zone CDC

### Parametrage systeme

Fait :

- Route admin `/admin/parametres`
- `requireAdmin`
- Raison sociale, ICE, RC, IF, patente, adresse, telephone
- Logo upload PNG/JPG, 2 Mo max, signature binaire verifiee, SVG refuse, stockage `public/uploads/logos`
- Taux TVA
- Prefixe BL
- Compteur BL courant en lecture seule
- Fuseau horaire
- Historique audit
- Navigation sidebar

### Commandes externes

Fait :

- Route `/commercial/commandes/externes`
- Filtre client externe
- Filtre periode
- Filtre statut
- Recherche BL/client
- Message vide explicite
- Export Excel filtre
- Lien navigation commercial

### Fiches clients

Fait :

- Vue dediee depuis listes clients
- Vue dediee depuis KPI top clients / clients non regles
- BL du client avec statut, commercial, totaux
- Detail lignes produits par BL
- Totaux commande / paye / non regle
- Permission admin tout, commercial portefeuille uniquement

### KPI avances

Fait admin :

- Filtre commercial
- Filtre client
- Formules visibles
- Periode par defaut 1er janvier -> aujourd'hui
- Regle periode
- Non regle periode
- Clients distincts
- Quantite KG periode
- Prix moyen
- CA cumule
- Regle cumule
- Non regle cumule
- Graphique aire CA par jour
- Graphique donut regle / non regle
- Graphique barres CA par commercial
- Tableau KPI commercial periode avec TOTAL
- Top 10 clients CA / quantite / CA
- Top 10 produits quantite / CA / prix moyen
- KPI financiers clients non regles
- Evolution CA mois courant / M-1 / M-2

Fait commercial :

- Quantite mois
- Quantite jour
- Top produits

N/A :

- Blocs remises / majorations, car la fonctionnalite est retiree par decision projet.

### Clients avances

Fait :

- Detection simple de doublons potentiels
- Fusion admin manuelle
- Reattribution commandes vers client conserve
- Soft delete du doublon
- Audit `client.fusion`
- Transaction atomique
- Reaffectation commercial via edition client admin, auditee

### Nouvelle commande UX

Fait :

- Bouton nouveau client inline dans l'ecran commande
- Dialogue de creation client sans quitter la commande
- Indication client standard via type de commande
- Prix catalogue affiche en lecture seule dans la selection produit
- Recapitulatif temps reel total a payer
- Statut initial en attente derive automatiquement tant qu'aucun paiement ne couvre le total

N/A :

- Total ajustement/remise, car remises/majorations retirees.

### Listes commandes

Fait :

- Cartes KPI en haut admin/commercial
- Colonnes region et date reglement derivee
- Selecteur 10 / 25 / 50 / 100
- Navigation premiere / precedente / suivante / derniere
- Bouton BL direct dans chaque ligne
- Entree Paiements active vers `/admin/paiements`

### Paiements

Fait :

- Route admin dediee `/admin/paiements`
- Liste des commandes a encaisser
- Filtre BL / client / commercial
- Filtre statut paye / en attente
- Cartes KPI encaissement
- Historique des paiements recents
- Lien direct vers le detail commande pour encaissement
- Paiement lui-meme conserve dans le detail commande avec verrou serveur et controle du reste du

### Produits / categories

Fait :

- Gestion categories `/admin/produits/categories`
- Creation de categories vides via registre `parametres_systeme.categories_produits`
- Reordonnancement par liste une categorie par ligne
- Renommage categorie
- Mise a jour prix par pourcentage sur categorie
- Historique prix
- Audit

### Sessions

Fait :

- Fermeture d'une session
- Fermeture de toutes les sessions d'un utilisateur
- Audit
- Deconnexion effective cote serveur car les sessions sont supprimees en base

### Exports / sauvegarde

Fait :

- Page admin `/admin/exports`
- Export commandes admin
- Export commandes commercial
- Export audit filtre
- Export global commandes / clients / clients externes / produits
- Noms de fichiers explicites et dates
- Jobs d'export au-dessus de 5 000 lignes pour commandes et audit
- Mention interface : les exports ne remplacent pas la sauvegarde infrastructure Naomedia
- Documentation sauvegarde infra dans `docs/DEPLOYMENT.md`

### Robustesse CDC locale

Fait :

- Audit connexion via `auth.connexion`
- Audit deconnexion via `auth.deconnexion`
- Objectifs commerciaux : modification d'un mois clos refusee cote serveur
- Filtres dates invalides : message explicite sur commandes admin, commandes commercial et audit
- Nouvelle commande : brouillon navigateur restaure client/produits apres reload ou session expiree
- Nouvelle commande : message clair et blocage du submit si la connexion reseau est perdue

### Catalogue / donnees de reference

Fait :

- Catalogue CDC complet dans `prisma/seed.ts`
- Abreviations HDC conservees
- Client sans commande
- Produit desactive
- Commandes payee / partielle / externe
- 1 000 commandes volume

N/A :

- Commande fortement remisee, car remises/majorations retirees.

## Ecarts volontaires documentes

Voir `docs/CDC_DEVIATIONS.md`.

Ecarts documentes :

- Next.js au lieu de Laravel/Vue
- Pas de remise / majoration
- Paiements partiels par commande
- Date reglement derivee des paiements
- Cheque/traite sans `date_echeance`
- `RELIQUAT PAYEMENT` traite comme produit normal pour l'instant
- Categories sans table dediee
- Exports volumineux par job local

## Livraison / deploiement

Note : le deploiement est volontairement hors scope immediat. Le travail actuel vise
la readiness code pour tests locaux contre `cdc.md`.

Fait cote repo :

- `Dockerfile`
- `.dockerignore`
- `docs/DEPLOYMENT.md`
- README mis a jour
- Commandes de migration/deploiement documentees
- Politique seed recette vs production documentee
- Plan sauvegarde MySQL documente

## Restes externes avant livraison client

Ces points ne sont pas des sections code a implementer dans `whatsleft.md`; ils
doivent etre valides hors code ou sur environnement recette.

| Point | Responsable | Statut |
|---|---|---|
| QA mobile reelle Chrome/Safari | Recette | Validation externe sur navigateur/appareil |
| QA volume chronometree | Recette | Seed existe, validation externe |
| Schema freeze officiel | Mehdi | Validation explicite requise |
| RELIQUAT PAYEMENT dans KPI | Mehdi / Naomedia | Decision metier |
| `date_echeance` cheque/traite | Mehdi / Naomedia | Decision metier |
| Paiement par commande vs solde global client | Mehdi / Naomedia | Decision metier |
| Deploiement recette Naomedia | Ops / Naomedia | A executer avec `docs/DEPLOYMENT.md` |

## Conclusion

Toutes les sections code de `whatsleft.md` sont terminees dans le repo. Les seuls
restes sont des validations de recette, decisions metier, ou deploiement sur
l'infrastructure cible.

## Derniere preuve locale - 09/07/2026

Passe de finition CDC locale executee :

- `npm run prisma:validate` : OK
- `npx tsc --noEmit` : OK
- `npm run test` : OK, 102/102
- `npm run lint` : OK
- `npm run build` : OK

Code ajoute dans cette passe : `/admin/paiements`, `/admin/exports`, audit
connexion/deconnexion, blocage objectifs mois clos, messages explicites pour
filtres dates invalides, brouillon local et alerte reseau sur nouvelle commande.

Runtime local verifie apres passage du build production sur `next build` stable
(sans Turbopack, qui generait un chunk SSR manquant sous Windows) :

- `npx next start -p 3111` : demarre correctement
- `GET /connexion` : 200
- `GET /admin/paiements` : 200
- `GET /admin/exports` : 200
- `GET /admin` : 200 apres redirection/session locale
- `GET /commercial` : 200 apres redirection/session locale
- `GET /admin/commandes?debut=2026-07-10&fin=2026-07-01` : 200 avec erreur periode affichee par la page

## Passe QA finale + fiabilisation build - 09/07/2026

Analyse complete du repo contre `cdc.md` et verification de bout en bout.

Correctif reel apporte : le build production plantait de facon intermittente
(worker `exit code -1`, `pages-manifest.json` ENOENT, fichier de types manquant)
par manque de memoire du worker Next sous Windows. Corrige durablement :
`scripts.build` = `cross-env NODE_OPTIONS=--max-old-space-size=4096 next build`
(devDependency `cross-env` ajoutee). Meme commande utilisee par le `Dockerfile`.

Verification suite complete apres correctif :

- `npm run prisma:validate` : OK
- `npx tsc --noEmit` : OK
- `npm run lint` : OK
- `npm run test` : OK, 102/102
- `npm run build` : OK, 34 routes (fiable, sans nettoyage manuel de `.next`)

Smoke runtime authentifie sur `next start -p 3111` contre la base 3306 (donnees
seed reelles : 27 produits, 1003 commandes) :

- Connexion Better Auth `admin` / `password` : token + session OK
- 11 pages admin (`/admin`, commandes, kpi, paiements, clients, produits, audit,
  sessions, parametres, exports, retours) : 200
- Detail commande : 200 ; PDF BL : `application/pdf` 3.4 Ko ; Export Excel :
  `.xlsx` 46 Ko
- Permissions (CDC 16.2) : anonyme -> /connexion ; commercial -> /admin -> /403 ;
  com1 sur commande de com2 -> /403, **aucune donnee exposee**
  (0 montant DH, 0 numero BL dans le corps de reponse)
- KPI admin : montants reels formates FR (`977 755,91 DH`, `1 833 170,57 DH`,
  `33,58 DH`), aucun NaN/null
- Filtre `fin < debut` : message d'erreur affiche, pas de crash

Note config locale : `.env` pointe sur `localhost:3306` (MySQL Laragon, base
seedee complete) tandis que `.env.example` + `docker-compose.yml` exposent le
conteneur sur `3307` (seed initial 8 produits/3 commandes uniquement). Pour une
reprise sur le conteneur Docker : aligner `DATABASE_URL` sur `3307` puis relancer
`npm run seed`.

Reste : uniquement decisions metier (RELIQUAT/date echeance/paiement global),
QA mobile reelle et deploiement recette. Aucune section code en attente.

## Mise a jour Codex - Coq Plus + base livraison propre - 10/07/2026

- [x] Renommage applicatif vers **Coq Plus**.
- [x] Prefixe BL par defaut passe a `CP`.
- [x] Liste villes Maroc chargee a 450 entrees dans `villes_maroc`.
- [x] Creation client inline testee dans la nouvelle commande avec ville `Oualidia`.
- [x] Creation commande commercial testee en navigateur : `CP-000001`,
  `POULET ENTIER`, `12,750 kg`, `299,63 DH`.
- [x] Donnees de test supprimees apres recette ; base locale remise en mode
  livraison propre.
- [x] Utilisateurs/accounts conserves ; sessions nettoyees.
- [x] `npm run reset:delivery-data` ajoute pour refaire ce nettoyage.
- [x] `npm run seed` ne cree plus de donnees demo sauf `SEED_DEMO_DATA=true`.
- [x] Verification finale : Prisma validate, TypeScript, lint, tests 126/126,
  build production.

## Passe correction bugs recette navigateur - 09/07/2026

Bugs reels remontes par recette navigateur, tous corriges et verifies en runtime :

- **Compteur BL affiche a 0** : `/admin/parametres` lisait `cle: "principal"` alors
  que la numerotation utilise `numero_bl`. Corrige via constante partagee
  `CLE_COMPTEUR_BL` exportee de `lib/bl.ts`. Verifie : affiche 1003.
- **KPI dates invalides (fin < debut)** : admin ET commercial affichaient/gardaient
  des chiffres trompeuses (et le commercial pouvait meme planter en 500 car aucun
  try/catch). Corrige : `app/admin/kpi/page.tsx` et `app/commercial/kpi/page.tsx`
  n'executent plus les requetes commandes et masquent tous les blocs resultats quand
  la periode est invalide ; seul le formulaire + message d'erreur restent. Verifie :
  0 chiffre affiche + message sur periode invalide, 200 (plus de 500) cote commercial.
- **Logo absent du PDF BL** : le logo etait uploade mais jamais rendu. `document-data.ts`
  charge desormais `logo_url` et l'encode en data URI (PNG/JPG ; SVG ignore car non
  supporte par `@react-pdf`), `bon-livraison-pdf.tsx` l'affiche dans l'en-tete.
  Verifie : PDF 3418 o sans logo -> 4027 o avec logo embarque, toujours valide.
- **next dev instable sous Windows** : Turbopack retire du script `dev`
  (`next dev`), meme cause que la fiabilisation du build.
- **Categories seed "Decoupe"/"Découpe"** : tableau `produits` mort (non seede,
  `void`) supprime ; `produitsCdc` normalise en francais accentue
  (Decoupe->Découpe, Elabore->Élaboré, Reglement->Règlement). Base locale 3306
  normalisee au passage.
- **`.env.example` / ports** : commentaires ajoutes (Docker 3307 vs Laragon 3306,
  `BETTER_AUTH_URL` doit correspondre au port servi).

Fonctionnalite CDC manquante ajoutee :

- **Ecran objectifs consolide** (CDC 6.8) : `/admin/objectifs`, une ligne par
  commercial pour le mois choisi avec objectif, CA realise, taux d'atteinte, ecart,
  ligne TOTAL. Edition rapide inline pour le mois courant/futur (reutilise l'action
  testee `definirObjectif`), lecture seule + lien historique pour les mois clos.
  Nouvelle entree de navigation admin "Objectifs".

Verification : `npx tsc --noEmit`, `npm run lint`, `npm run test` (102/102),
`npm run build` (35 routes) verts ; fixes verifies en runtime sur `next start`.

Non traites (hors code / decisions) : modele paiements partiels vs statut binaire,
`date_echeance`, RELIQUAT dans KPI, epingler KPI, popup detail BL, table categories
dediee, jobs export en memoire (a basculer sur stockage partage pour le multi-instance).

## Passe P2/P3 + fermeture ecarts CDC - 09/07/2026

Tous les points code P2/P3 de la revue sont traites et verifies en runtime :

- **Listes + periode invalide (P2)** : commandes admin/commercial, externes, audit
  et retours affichent l'erreur ET une liste vide (fini les resultats non filtres
  trompeurs). Les 3 routes d'export Excel renvoient un **400** explicite au lieu
  d'exporter tout silencieusement.
- **Retours : filtre periode CDC 5.6** (manquait entierement) : Date debut/fin +
  Filtrer + Reset sur `/commercial/retours` et `/admin/retours`.
- **Jobs export (P2)** : metadonnees persistees en JSON sur disque -> survivent au
  redemarrage (mono-instance). Fichiers deplaces de `public/exports` (servis sans
  auth par Next) vers `exports-prive/` hors public — telechargement uniquement via
  les routes authentifiees. `.gitignore` complete (exports-prive, public/uploads).
- **Epingler KPI (CDC 6.5.3)** : icone epingle sur les 9 cartes de `/admin/kpi`
  (action serveur + `parametres_systeme.kpi_epingles`), section « KPI epingles »
  sur `/admin` calculee avec les memes formules (periode 01/01 -> aujourd'hui).
- **Popup detail BL (CDC 6.6)** : clic sur un n° BL dans les fiches clients
  (admin standard/externe + commercial) ouvre un dialogue avec les lignes produits,
  total, statut et lien vers le detail complet (`components/dialogue-detail-bl.tsx`).
- **Libelles CDC 7.5** : « Réglée / Non réglée » partout (badges, filtres, cartes,
  exports Excel via `libelleStatutPaiement`) ; enum technique inchangee.
- **PDF BL** : ajout du **statut de reglement** (contenu minimal CDC 9.1 complet).
- **Rate limiting CDC 12.1** : Better Auth `rateLimit` actif — 5 tentatives/min
  sur le sign-in puis 429 (verifie : 401 x5 puis 429).
- **Securite logo** : SVG refuse ; PNG/JPG verifies par signature et route runtime
  confinee aux chemins generes sous `/uploads/logos`.
- **`.env.example`** : exemple `BETTER_AUTH_URL` port 3107 pour la recette locale.

Verification complete : `tsc` OK, `lint` OK, `vitest` 102/102, `build` OK.
Runtime verifie sur `next start` : listes vides + erreurs periode, export 400,
retours filtres, libelles Réglée/Non réglée, 9 epingles rendues, dialogues BL
SSR presents, rate limit 429 au 6e essai, pagination 1003 commandes en 0,1-0,2 s
(CDC < 1 s), KPI admin 0,19 s.

**`testplan.md` cree** : plan de recette navigateur complet (24 sections, ~120
cas dont la matrice 16.2 integralement mappee).
