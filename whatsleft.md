# whatsleft.md — Écarts restants vs CDC (Poulet Étoilé)

> Document de suivi des fonctionnalités **manquantes ou incomplètes** par rapport au
> `cdc.md` v1.1 (CDC technique Naomedia).
>
> **Référence d'analyse :** audit code complet du 09/07/2026 — chaque affirmation
> ci-dessous a été vérifiée contre le code (routes, schéma Prisma, seed, composants).
> 98/98 tests Vitest verts (16 fichiers), build OK.
>
> **Périmètre :** fonctionnalités uniquement — la stack technique (Laravel/Vue vs
> Next.js) est ignorée, dérogation actée avec Naomedia (voir `CLAUDE.md` §1).

**Conformité CDC estimée : ~65 %**

| Zone | Couverture |
|---|---|
| Cœur métier (commande, BL, paiements, permissions) | ~85 % |
| Tableaux de bord & KPI avancés | ~30 % |
| Paramétrage & pilotage admin avancé | ~40 % |

---

## 1. Écarts volontaires (ne pas réimplémenter sans accord Mehdi)

Ces points divergent du CDC mais sont **actés** dans `CLAUDE.md` / `HANDOFF.md` :

| CDC | Décision projet actuelle | Action |
|---|---|---|
| Remise / majoration (§5.3, §7.2, §6.5, §9.1) | **Supprimées** — `prix_net = quantité × prix_unitaire`, aucun champ `remise` dans le schéma (vérifié) | Confirmer avec Naomedia si définitif |
| Paiement binaire réglée / non réglée (§7.5) | **Paiements partiels** avec reste dû calculé (modèle `Paiement`) | Question ouverte HANDOFF §6 |
| Catalogue complet §14 (~25 produits) | **7 produits actifs** (6 réels + RELIQUAT PAYEMENT) + 1 désactivé en seed | Compléter le seeder si recette CDC stricte |

---

## 2. Bloquant recette CDC — priorité 1

### 2.1 Tableaux de bord (§5.2, §6.4)

**État actuel (vérifié) :** `app/admin/page.tsx` et `app/commercial/page.tsx` sont des
**maquettes en dur** : valeurs figées (28 ventes, 146 clients, 12 commandes du jour),
panneaux « Modules admin : À construire », titres en anglais (« Summary Dashboard »,
« AR & Cash Balance »), boutons d'actions rapides sans `href`. Les vraies données
existent sur `/admin/kpi` et `/commercial/kpi` mais pas sur l'accueil.

**À faire :**

- [ ] Brancher `/admin` sur `lib/kpi.ts` + agrégation tous commerciaux
- [ ] Brancher `/commercial` sur `lib/kpi.ts` + filtre `utilisateur_id` connecté
- [ ] Cartes CDC §5.2 / §6.4 :
  - [ ] Chiffre d'affaires du mois (avec période affichée)
  - [ ] Quantité du mois (somme KG)
  - [ ] Chiffre d'affaires du jour (avec date du jour)
  - [ ] Quantité du jour
  - [ ] Chiffre non réglé (impayés, mise en évidence visuelle)
- [ ] Raccourcis navigation CDC sur le dashboard commercial (actuellement boutons
  décoratifs sans lien) :
  - [ ] Passer une commande
  - [ ] Voir les commandes
  - [ ] **Voir les commandes externes** (lien dédié — voir §2.3)
  - [ ] Retours magasin
  - [ ] Audit KPIs
- [ ] Jauge objectif mensuel branchée sur les vrais objectifs (actuellement 72 % en dur)
- [ ] Dashboard admin : sélecteur commercial + période personnalisée (§6.4)
- [ ] Dashboard admin : raccourcis vers Paramétrage, Objectifs, Audit, Sessions
- [ ] Titres/textes 100 % français (règle §13 CDC — l'accueil actuel est en anglais)

**Fichiers concernés :** `app/admin/page.tsx`, `app/commercial/page.tsx`, `lib/kpi.ts`

---

### 2.2 Paramétrage système (§6.7)

**État actuel (vérifié) :** aucune route `/admin/parametres` (→ 404), aucun lien
sidebar. Les valeurs existent en base (`parametres_systeme`, seed) et alimentent
déjà l'en-tête du PDF BL (`app/commandes/document-data.ts:64`), mais **aucune UI admin**.

**À faire :**

- [ ] Créer `/admin/parametres` (admin uniquement, `requireAdmin`)
- [ ] Formulaire identité société : raison sociale, ICE, RC, IF, patente, adresse,
  téléphone, logo (upload image — validation §12.6 : MIME PNG/JPG/SVG, 2 Mo max,
  renommage du fichier stocké)
- [ ] Paramètres fiscaux : taux TVA (pré-rempli 20 %, non appliqué en V1)
- [ ] Numérotation : préfixe BL, compteur courant **lecture seule**
- [ ] Fuseau horaire (défaut Africa/Casablanca)
- [ ] Historique des modifications en bas d'écran (via `audit_log`)
- [ ] Lien navigation sidebar admin « Paramétrage » (`components/app-shell.tsx`)
- [ ] Tests : permission 403 commercial, audit à chaque modification

**Impact :** conformité §6.7 + qualité de l'en-tête PDF BL (§9.1).

---

### 2.3 Vue commandes externes dédiée (§5.5)

**État actuel (vérifié) :** côté admin, filtre `type = EXTERNE` + export Excel sur
`/admin/commandes`. Côté commercial : **aucune mention d'externe** dans
`app/commercial/commandes/page.tsx` (pas de filtre type, pas de vue séparée).

**À faire :**

- [ ] Route commercial dédiée (ex. `/commercial/commandes/externes` ou filtre
  permanent `type_commande = EXTERNE`)
- [ ] Filtre multi-sélection clients externes (§5.5)
- [ ] Bouton export Excel du tableau filtré (la route
  `app/commercial/commandes/export/route.ts` existe — vérifier qu'elle respecte
  le filtre externe)
- [ ] Message vide explicite : « Aucune commande externe trouvée »
- [ ] Filtre période Date début / Date fin + Filtrer / Reset
- [ ] Lien depuis le dashboard commercial (§5.2)

---

### 2.4 Fiche client détaillée (§6.6)

**État actuel (vérifié) :** listes clients OK, mais aucune route `clients/[id]` ni
popup — **pas de fiche** au clic sur un nom, nulle part.

**À faire :**

- [ ] Popup ou vue dédiée accessible depuis : liste clients, top clients KPI,
  tableaux KPI financiers
- [ ] Liste des BL du client avec statut payé/en attente et commercial associé
- [ ] Clic sur numéro BL → popup détail lignes (produit, quantité, prix unitaire,
  prix net)
- [ ] Totaux : montant commandé, montant payé, montant non réglé
- [ ] Permissions : commercial ne voit que ses clients ; admin voit tout

---

### 2.5 KPI consolidé complet (§5.7, §6.5)

**État actuel (vérifié) :** `/admin/kpi` = 4 cartes (CA, commandes, impayés,
objectif) + top clients + top produits, filtres date début/fin + commercial.
`/commercial/kpi` équivalent réduit. Période par défaut = **mois courant** (le CDC
§6.4 demande 1er janvier → aujourd'hui pour l'admin). `lib/kpi.ts` n'expose que
`calculerKpiCommandes` et `formaterEntreesTop`.

**Manque par rapport au CDC §6.5 :**

#### Filtres & transparence
- [ ] Filtre Client (recherche / sélecteur) en plus du filtre commercial
- [ ] Texte explicatif des formules sous les filtres (documentation vivante §7.4)
- [ ] Période par défaut admin : 1er janvier année en cours → aujourd'hui

#### Cartes KPI période
- [ ] Réglé (période)
- [ ] Non réglé (période) — distinct de « impayés » si formule différente
- [ ] Clients (COUNT DISTINCT sur période)
- [ ] Quantité KG (période)
- [ ] Prix moyen (CA ÷ Quantité, afficher « — » si quantité = 0)

#### Cartes KPI cumulées
- [ ] CA cumulé
- [ ] Réglé cumulé
- [ ] Non réglé cumulé

#### Graphiques (Recharts ^3.9 installé, **zéro usage** dans le code — vérifié)
- [ ] Graphique aires : CA par jour sur la période
- [ ] Graphique donut : répartition Réglé vs Non réglé
- [ ] Graphique barres : CA par commercial

#### Tableaux & blocs
- [ ] Tableau « KPI Commercial — Période » (1 ligne/commercial + TOTAL)
- [ ] Top 10 Clients — CA (Client / Qté / CA) — actuellement top montant seul, sans Qté
- [ ] Top 10 Produits — Qté & CA / Prix moyen
- [ ] KPI Financiers — Clients (Non réglé) avec % non réglé
- [ ] Évolution CA (Mois en cours / M-1 / M-2) par commercial

#### Blocs remises / majorations (§6.5)
- [ ] **N/A si remise supprimée** — à valider avec Naomedia avant toute implémentation

#### Commercial (§5.7)
- [ ] Carte Quantité du mois / du jour sur `/commercial/kpi`
- [ ] Top produits côté commercial (admin l'a déjà)

**Fichiers concernés :** `app/admin/kpi/page.tsx`, `app/commercial/kpi/page.tsx`, `lib/kpi.ts`

---

## 3. Important — priorité 2

### 3.1 Gestion clients avancée (§6.3)

- [ ] Détection doublons potentiels (noms proches) avec suggestion de fusion
- [ ] Fusion manuelle validée par admin :
  - [ ] Réattribution de toutes les commandes vers le client conservé
  - [ ] Soft delete du doublon
  - [ ] Entrée `audit_log` (fusion client)
  - [ ] Transaction atomique (règle CDC §11.1 / CLAUDE.md §2.8)
- [ ] Fiche client : historique complet commandes + montants (voir §2.4)
- [ ] Réaffectation commercial (`commercial_id`) — édition existe ; vérifier audit systématique

---

### 3.2 Nouvelle commande — UX CDC (§5.3)

- [ ] Bouton « + » création client **inline** (modal) sans quitter l'écran commande
  — vérifié absent de `app/commandes/commande-form.tsx`
- [ ] Indication « Client standard » (sens tarifaire CDC) sur la sélection client
  — ⚠️ le `SelectItem "Client standard"` existant est le sélecteur de **type de
  commande** (standard/externe), pas l'indication CDC §5.3
- [ ] Affichage prix unitaire en lecture seule (prix catalogue, pas saisie libre) — partiellement fait
- [ ] Récapitulatif temps réel détaillé :
  - [ ] Total prix de base
  - [ ] Total à payer
  - Total ajustement : N/A (remise supprimée)
- [ ] Statut initial « en attente » explicite après création

**Fichier concerné :** `app/commandes/commande-form.tsx`

---

### 3.3 Listes commandes — compléments (§5.4, §6.x)

- [ ] Cartes KPI en haut des pages listes (comme CDC §5.4)
- [ ] Colonnes tableau : Région, Date règlement (si applicable)
- [ ] Sélecteur lignes par page : 10 / 25 / 50 / 100 — vérifié : `TAILLE_PAGE = 15`
  en dur (`app/admin/commandes/page.tsx:21`)
- [ ] Navigation Première / Dernière page — vérifié : Précédent / Suivant seulement
- [ ] Bouton BL directement dans le tableau listes (actuellement via page détail)
- [ ] Page paiements dédiée — vérifié : entrée nav « Paiements » **désactivée**
  (`components/app-shell.tsx:31`, item sans `href`) ; paiements accessibles
  uniquement depuis le détail commande

---

### 3.4 Produits — catégories (§6.1)

**État actuel (vérifié) :** `categorie` = champ texte libre (string en schéma),
datalist des catégories existantes. `/admin/produits/prix` = saisie manuelle
produit par produit (`prix-masse-form.tsx`).

- [ ] Écran ou module gestion catégories : créer / renommer / réordonner
- [ ] Mise à jour prix en masse par **pourcentage sur une catégorie** (ex. +5 %)
  avec écran de confirmation récapitulatif (§6.1)

---

### 3.5 Sessions (§6.10)

**État actuel (vérifié) :** `/admin/sessions` = liste (max 200) + fermeture
**une par une** (`SupprimerSessionButton`). La révocation en masse par utilisateur
existe déjà côté serveur (`app/admin/utilisateurs/actions.ts` : 3 appels
`session.deleteMany` — désactivation, reset MDP, etc., couverts par tests) ;
il manque seulement le **bouton** sur l'écran sessions.

- [ ] Action « Déconnecter toutes les sessions » d'un utilisateur sur `/admin/sessions`
  (réutiliser la logique de `utilisateurs/actions.ts`)
- [ ] Nettoyage sessions obsolètes en dev (sessions de test accumulées)
- [ ] Vérifier en recette : désactivation commercial → déconnexion effective en
  quelques secondes (code présent, à valider bout en bout en navigateur)

---

### 3.6 Exports & sauvegarde (§6.11, §6.9, §9.2)

- [ ] Export Excel du **journal d'audit** filtré — vérifié absent de
  `app/admin/audit/page.tsx`
- [ ] Export global tables principales (commandes, clients, produits) — bouton dédié admin
- [ ] Mention UI : sauvegarde infra gérée par Naomedia (pas confondre avec export app)
- [ ] Export asynchrone pour exports > 5 000 lignes (§9.2) — non implémenté ;
  noter que l'export admin actuel plafonne à `take: 5000`
- [ ] Nom de fichier explicite type `commandes_externes_AAAA-MM-JJ.xlsx` (§9.2)

---

### 3.7 Connexion — détails UX (§5.1)

Vérifié absent de `app/connexion/connexion-form.tsx` :

- [ ] Bouton afficher / masquer le mot de passe
- [ ] Mention réassurance (« Connexion chiffrée et protégée »)
- [ ] Bandeau identité post-connexion : « Connecté : {nom} · Rôle : COMMERCIAL/ADMIN »
  (le shell affiche « Hello, {nom} » — pas au format CDC, et en anglais)

---

## 4. Catalogue & données de référence (§14)

**État actuel (vérifié dans `prisma/seed.ts`) :** 6 produits réels + `RELIQUAT
PAYEMENT` + 1 produit désactivé. Le CDC §14 liste ~26 références.

**À faire :**

- [ ] Compléter `prisma/seed.ts` avec le catalogue CDC §14 (Abats, Ailes, Blanc,
  Brochettes, Carcasse, Chawarma, Coquelet, COU, Cuisses ×3, Émincé, FOIE, GESIER,
  HDC ×4, KEFTA, Pau, Petite Viande, Pilon, POULET ENTIER, RELIQUAT PAYEMENT,
  SAUCISSES, Sot-l'y-laisse)
- [ ] Conserver les abréviations métier (HDC = Haut De Cuisse, etc.)
- [ ] Cas limites seed CDC §15 :
  - [x] Client sans commande
  - [x] Produit désactivé
  - [x] Commande payée / partielle / externe
  - Commande « fortement remisée » : N/A (remise supprimée)
  - [ ] Jeu de test volume : **1 000+ commandes** pour recette pagination §16

---

## 5. Règles métier & modèle — écarts à trancher (§7, §18)

Questions ouvertes (`HANDOFF.md` §6) impactant la conformité CDC :

| Question | CDC | Projet actuel | Décision requise |
|---|---|---|---|
| Paiement par commande ou solde global client ? | §18 | Par commande | Mehdi |
| Chèque/traite : `date_echeance` en plus de `reference` ? | §18 | `reference` optionnelle seulement (vérifié schéma) | Mehdi |
| `RELIQUAT PAYEMENT` dans les KPI ? | §18 | Traité comme produit normal | Mehdi |
| Paiement partiel vs binaire réglée/non réglée | §7.5 | Partiel avec reste dû | Mehdi |
| Sens exact « commandes externes » | §4.6, §18 | `type_commande = EXTERNE` + `clients_externes` | Confirmé partiellement |

**Écarts modèle / schéma vérifiés (ne pas modifier sans Mehdi) :**

- `date_reglement` sur commande (CDC §4.4) : **absent du schéma** — le statut et la
  date de règlement sont dérivés des paiements (cohérent avec le choix « paiements
  partiels », à documenter dans les écarts CDC)
- Champ `remise` sur `lignes_commande` (CDC §4.4) : **absent** — volontaire (écart §1)
- Unité produit kg/pièce/carton (CDC §4.2) : **pas de champ unité** — V1 tout en KG
  (règle CLAUDE.md §2.5)

---

## 6. Robustesse & recette (§10, §16)

### Déjà couvert ✅ (vérifié)
- Pages 403 / 404 dédiées (`app/403/page.tsx`, `app/not-found.tsx`) + error boundary
- États vides explicites (listes, KPI : « Aucune donnée. », etc.)
- Validation Zod côté serveur + messages français (`lib/validations/*`)
- Anti double-soumission UI + garanties serveur
- Permissions serveur sur chaque action (tests Vitest dédiés)
- Recalcul serveur des totaux commande (`lib/commandes.ts`)
- BL transactionnel verrouillé (`CompteurBl` + `FOR UPDATE`, `lib/bl.ts`)
- Soft delete partout (`deleted_at` sur toutes les entités métier)
- 98/98 tests Vitest verts (16 fichiers), build OK — revérifié 09/07/2026

### Non vérifié ou manquant ❌

| Scénario CDC §16.2 | Statut |
|---|---|
| Pagination rapide avec 1 000+ commandes en base | ❌ Non testé (seed trop petit) |
| Session expirée pendant saisie longue → redirection propre + message | ⚠️ Non vérifié en navigateur |
| Message perte connexion réseau (mobile terrain) | ❌ |
| Filtre Date fin < Date début → message explicite | ⚠️ À vérifier sur tous les écrans filtrés |
| PDF BL : montants identiques écran / PDF | ✅ Logique serveur alignée ; revalider visuellement |
| Export Excel ouvre sans erreur Excel/Sheets | ✅ HTTP 200 ; revalider fichier |
| QA mobile visuelle (usage terrain smartphone) | ❌ |
| QA grands volumes admin (2 200+ lignes) | ❌ |
| Tests calcul remise/majoration §7 | N/A (fonction retirée) |
| Déploiement recette Naomedia (§15) | ❌ Phase 9 PLAN.md |

---

## 7. Livrables & documentation (§15)

- [x] Code source Git, historique de commits clair
- [x] README / `.env.example`
- [x] Migrations + seed
- [x] Tests calculs critiques
- [ ] Documentation choix techniques vs CDC (écarts remise, paiement partiel, stack)
- [ ] Application déployée environnement recette Naomedia
- [ ] Schéma Prisma validé / figé par Mehdi (G1 PLAN.md)

---

## 8. Ordre d'implémentation recommandé

Aligné sur l'impact recette CDC :

1. **Dashboards réels** (`/admin`, `/commercial`) — débloque la première impression utilisateur
2. **Paramétrage système** (`/admin/parametres`) — débloque conformité §6.7
3. **Vue commandes externes** commercial — §5.5
4. **KPI avancés + graphiques Recharts** — §6.5 (extension `lib/kpi.ts`)
5. **Fiche client popup** — §6.6
6. **Fusion clients + doublons** — §6.3
7. **Exports** (audit, global, async gros volumes) — §6.9, §6.11, §9.2
8. **Catalogue seed complet + jeu 1 000 commandes** — §14, §16
9. **Finitions UX** (connexion, pagination, listes, inline client, catégories,
   bouton « tout déconnecter ») — §5.1, §5.3, §5.4, §6.1, §6.10
10. **QA mobile + volume + déploiement** — §13, §16, Phase 9

---

## 9. Ce qui est déjà fait (ne pas refaire)

Pour éviter les doublons — modules opérationnels **vérifiés dans le code** au 09/07/2026 :

- Auth Better Auth (login/logout, rôles, sessions BDD)
- CRUD produits + historique prix + prix en masse (saisie manuelle)
- CRUD utilisateurs + objectifs mensuels + reset MDP + désactivation
  (avec révocation sessions en transaction)
- CRUD clients + clients externes (admin et commercial)
- Création commande commercial/admin + BL séquentiel transactionnel + calcul Decimal
- Détail commande + paiements admin (espèces, chèque, traite, autre) + suppression
  soft delete admin
- Listes commandes admin/commercial (filtres, pagination serveur, export Excel
  admin **et** commercial)
- PDF BL (routes serveur admin + commercial, permissions, en-tête depuis
  `parametres_systeme`)
- Retours magasin (saisie non modifiable + historique, admin + commercial)
- KPI de base admin/commercial (CA, commandes, impayés, objectif, tops)
- Audit (lecture seule, filtres)
- Sessions actives (liste + fermeture unitaire)
- Pages 403 / 404 / error boundary
- Design system (AppShell, composants UI shadcn, CarteKPI, tables…)

---

## 10. Références

| Document | Rôle |
|---|---|
| `cdc.md` | Spécification contractuelle (CDC v1.1) |
| `CLAUDE.md` / `AGENTS.md` | Règles agent + écarts actés |
| `HANDOFF.md` | État courant et questions ouvertes |
| `PLAN.md` | Phases, gates, cases à cocher |

---

*Dernière mise à jour : 09/07/2026 (audit code complet, 98/98 tests verts) — à tenir
à jour après chaque module livré.*
