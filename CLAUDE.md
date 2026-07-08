# CLAUDE.md — Règles agent (projet Poulet Étoilé / Naomedia)

> Fichier chargé à chaque session par Claude Code **et** Codex (contenu identique
> dans `AGENTS.md`). Avant d'écrire une ligne, lis ce fichier + `HANDOFF.md`.
> Deux sources complémentaires : ce fichier = **les règles** ; `HANDOFF.md` = **l'état
> et les intentions** du projet.

---

## 0. Ce qu'est le projet (résumé)

Application web de **gestion commerciale** pour une entreprise de **distribution
avicole** (poulet + dérivés), livrée à l'agence **Naomedia** (client final : réf.
« Poulet Étoilé »). Deux espaces :

- **Espace Commercial** (mobile-first, terrain) : saisir des commandes, gérer ses
  clients, voir ses KPI, saisir des retours magasin.
- **Espace Administrateur** : piloter en consolidé — produits/prix, utilisateurs,
  paramétrage, toutes les commandes, **paiements**, KPI globaux, journal d'audit,
  sessions actives.

**La commande est la source de vérité unique.** KPI, PDF du bon de livraison (BL),
exports, tableaux de bord ne sont que des **projections** des commandes — jamais des
totaux stockés à part et non vérifiables.

---

## 1. Stack (validée avec Naomedia — dérogation au CDC actée)

> Le CDC imposait Laravel 11 + Vue 3/Inertia + MySQL. Naomedia a **explicitement
> accepté** une livraison sur la stack ci-dessous. La **substance** du CDC
> (section 2 ci-dessous) reste contractuelle et prime sur tout.

| Couche | Choix | Note |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Actions) | Full-stack, mutations serveur typées |
| Langage | **TypeScript strict** | `strict: true` non négociable |
| BDD | **PostgreSQL** | Séquences natives (numérotation BL), Decimal propre |
| ORM | **Prisma** | Schéma = source de vérité du modèle de données |
| Argent | **Prisma `Decimal` + `decimal.js`** | JAMAIS le type `number` sur un montant |
| Validation | **Zod** | Un schéma → validation serveur + types + form |
| Auth/sessions | **Better Auth** (sessions en base) | Rôles + déconnexion forcée |
| UI | **shadcn/ui + Tailwind** | Composants dans le repo, éditables |
| Tables | **TanStack Table** | Pagination **serveur** (2 200+ lignes) |
| Graphes | **Tremor** (ou Recharts) | Dashboards KPI admin |
| PDF | **@react-pdf/renderer** | BL en JSX |
| Excel | **exceljs** | Exports .xlsx |
| Dates | **Luxon** | Fuseau Africa/Casablanca, stockage UTC |
| Tests | **Vitest** | Calculs + cas limites |
| Déploiement | **VPS + Docker + Coolify** | |

---

## 2. Règles métier NON NÉGOCIABLES (la substance du CDC)

Ces règles priment sur toute interprétation. Une violation = bug bloquant à la recette.

1. **Prix fixé par l'admin uniquement.** À la saisie d'une ligne, `prixUnitaire` est
   **copié/figé** depuis le prix de référence du produit. Le commercial ne tape jamais
   un prix. Si l'admin change un prix produit après coup, les commandes passées ne
   bougent pas (historique figé).
2. **PAS de remise / majoration.** Fonctionnalité retirée à la demande du client.
   `prixNet = quantité × prixUnitaire`. Aucune colonne remise, aucun bloc KPI
   remise/majoration.
3. **Argent en Decimal, jamais float.** Tous les montants en `Decimal(10,2)`, calculs
   via `decimal.js`. Quantités en `Decimal(10,3)` (kg). Le même montant doit s'afficher
   **identiquement** à l'écran, dans le PDF et dans l'Excel — tout écart = bug bloquant.
4. **HT, pas de TVA.** Le poulet est exonéré → HT = TTC. Taux TVA paramétrable en base
   (pour l'avenir) mais **non appliqué** en V1.
5. **Toutes les quantités sont en KG.** Pas de mélange d'unités en V1.
6. **Numérotation BL : séquence PostgreSQL.** Numéro séquentiel, sans trou, préfixé
   selon le paramétrage. **JAMAIS** un `max(numero)+1` applicatif (condition de course).
   Deux commandes simultanées → deux numéros distincts.
7. **Recalcul serveur systématique.** Le serveur ne fait jamais confiance aux totaux
   envoyés par le client. Il recalcule tout à partir des lignes reçues avant d'écrire,
   et rejette si incohérence.
8. **Transaction atomique.** Commande + ses lignes en une seule transaction (tout ou
   rien). Idem pour toute opération multi-tables (fusion clients, MàJ prix en masse).
9. **Paiements gérés par l'admin, en plusieurs fois.** Modes : espèces, chèque, traite,
   autre. Statut **calculé** : `payé` si reste dû = 0, sinon `en attente`. On suit le
   montant payé et le reste à payer. (Voir `HANDOFF.md` pour le modèle exact.)
10. **Commande figée après création.** Pas d'écran d'édition. Seul l'admin peut
    supprimer (soft delete), action tracée dans l'audit.
11. **Soft delete partout** (produits, clients, users, commandes, lignes). Jamais de
    DELETE physique. Les entités désactivées restent dans l'historique mais
    disparaissent des listes de sélection actives.
12. **Permissions côté serveur sur CHAQUE action.** Masquer un bouton côté UI ne
    suffit jamais. Un commercial qui devine l'URL d'une commande d'un collègue reçoit
    un 403, pas les données. Un commercial ne voit que SES données.
13. **Français partout** : noms de tables, colonnes, modèles Prisma, champs. Interface
    100 % en français. Dates JJ/MM/AAAA, nombres « 60 037,00 DH » (espace milliers,
    virgule décimale).
14. **Fuseau Africa/Casablanca.** Dates stockées en UTC, converties à l'affichage et
    dans les filtres via Luxon. Filtre de dates inclusif sur toute la journée de fin :
    `>= début 00:00` ET `< (fin + 1 jour) 00:00`, en heure locale.

---

## 3. Réponses client déjà tranchées (ne pas re-demander)

- Migration : **base vierge**, aucun import de l'ancienne app.
- Région client : **liste de villes prédéfinies** (liste standard Maroc dans le seeder).
- Admin **peut** passer une commande au nom d'un commercial (avec sélecteur + audit).
- Retours magasin : **non modifiables** après saisie.
- Objectif mensuel en DH, jauge visible côté commercial.
- Journal d'audit : conservé **indéfiniment**.
- Pas de mode hors connexion en V1.

**Encore à confirmer (non bloquant pour le socle)** : n° + échéance pour chèque/traite ;
paiement par commande vs solde global client ; traitement de la ligne « RELIQUAT
PAYEMENT » dans les KPI. Voir `HANDOFF.md` §Questions ouvertes.

---

## 4. Qualité — définition de « terminé »

Un écran/module n'est PAS terminé s'il ne marche que dans le cas nominal. Chaque module
doit couvrir dès sa création :

- **États vides** : message explicite (« Aucune commande sur cette période »), jamais un
  tableau vide silencieux. KPI sans données → « 0,00 DH » ou « — », jamais NaN/null.
- **États de chargement** : spinner/skeleton, actions désactivées pendant l'attente.
- **Erreurs de validation** : au plus près du champ, en français clair (« La quantité
  doit être supérieure à 0 »), jamais un code technique.
- **Erreurs serveur** : message rassurant générique + id d'erreur ; jamais de stack
  trace exposée. Détails journalisés côté serveur.
- **Pages 403 / 404 / 500 dédiées** (pas l'écran par défaut du framework). Le 403 ne
  révèle jamais si la ressource existe.
- **Anti double-soumission** : bouton désactivé au premier clic **+** garantie serveur
  (contrainte d'unicité / transaction).

Tests **obligatoires** (Vitest) sur : les calculs (prix net, totaux, KPI), la
numérotation BL concurrente, les permissions (403), les cas limites de la recette 16.2
du CDC. Pas optionnels.

---

## 5. Workflow de développement (deux agents en parallèle)

> Détail complet du protocole parallèle dans `AGENTS.md` §Protocole parallèle.
> Résumé ici :

- **Le schéma Prisma est figé en premier** et traité comme immuable. Les deux agents
  s'y réfèrent, aucun ne le réinvente. Toute évolution du schéma passe par TOI (Mehdi),
  jamais par un agent seul.
- **Un seul agent écrit à la fois sur un fichier / dossier donné.** Parallélisme
  autorisé uniquement sur des **zones étanches** (modules séparés).
- **Claude Code = lead** : cœur métier (commande, paiement, KPI), architecture, et il
  **pose le design** (layout, composants réutilisables, thème Tailwind). Codex **suit**
  ce design, ne réinvente pas de style.
- Boucle par module : construire → tester → commit clair → `git`/handoff mis à jour →
  vider le contexte → module suivant.
- **Commits fréquents et descriptifs** : c'est la mémoire persistante des agents entre
  les sessions. Une branche par fonctionnalité (`feature/…`).
- Après tout changement : `npm run build` doit passer + tests Vitest verts sur le module
  touché.

---

## 6. Ordre de build

1. **Socle** — Docker, schéma Prisma complet + migrations, seeders (catalogue avicole
   section 14 du CDC + liste villes), auth + rôles, paramétrage système.
2. **CRUD admin** — produits/prix + historique, utilisateurs, clients.
3. **⭐ Commande + paiement** — calculs, transaction, séquence BL, table paiements,
   statut calculé. (Module le plus critique — revue croisée par l'autre agent.)
4. **Listes** — voir commandes + externes + pagination serveur, retours, PDF BL, Excel.
5. **KPI + pilotage** — KPI commercial puis consolidé admin, graphes, tops, objectifs,
   journal d'audit, sessions actives.
6. **Durcissement** (buffer) — cas limites, sécurité, tests de concurrence, recette 16.2.

---

## 7. Interdits (ne jamais faire, même si ça « marche »)

- Utiliser `number` pour un montant. → `Decimal` / `decimal.js`.
- Calculer un numéro de BL en JS (`max+1`). → séquence Postgres.
- Faire confiance à un total envoyé par le client. → recalcul serveur.
- Vérifier une permission seulement côté UI. → toujours côté serveur.
- Supprimer physiquement une ligne. → soft delete.
- Réintroduire une remise/majoration. → supprimée, définitif.
- Nommer une table/colonne en anglais. → français.
- Modifier le schéma Prisma sans passer par Mehdi.
