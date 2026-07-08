# HANDOFF — Application de gestion commerciale (Poulet Étoilé / Naomedia)

> Document de reprise canonique. **À lire en premier** par tout agent ou développeur
> qui reprend le projet. Il explique ce qu'est l'app, comment elle est construite, où
> vit chaque donnée, ce qui reste à faire. **À tenir à jour à chaque session.**
>
> Les **règles** de développement sont dans `CLAUDE.md` / `AGENTS.md` — ce fichier
> décrit **l'état et les intentions**, pas les règles.

Dernière mise à jour : 08/07/2026 · Statut : **socle non démarré — schéma à figer**.

> **Plan d'exécution détaillé** (phases, micro-étapes, GATEs, répartition
> Claude Code / Codex) : voir `PLAN.md`. La to-do du §9 ci-dessous en est le
> résumé ; `PLAN.md` fait foi pour l'ordre et les cases à cocher.

---

## 1. Ce qu'est le projet

Application web de **gestion commerciale** pour une entreprise de **distribution
avicole** (poulet et dérivés) vendant à des commerces (bouchers, restaurateurs,
traiteurs, distributeurs). Mission **freelance pour l'agence Naomedia** (Casablanca) ;
client final réf. « Poulet Étoilé ». Interface 100 % en français.

Deux espaces :

- **Commercial** (mobile-first, usage terrain sur smartphone) : passer une commande,
  voir ses commandes, ses clients, ses KPI, saisir des retours magasin.
- **Administrateur** : pilotage consolidé — produits/prix, utilisateurs, paramétrage,
  toutes les commandes, **paiements**, KPI globaux, journal d'audit, sessions actives.

**Idée centrale** : la **commande** est la source de vérité unique. L'admin fixe les
prix, le commercial vend à ces prix (sans remise), l'admin encaisse les paiements (en
plusieurs fois possible). Tout le reste (KPI, PDF, exports) est une projection des
commandes.

Origine : `CDC_Freelance_Technique_Gestion_Commerciale.pdf` (cahier des charges v1.1,
en français). **Ce fichier prime sur le CDC pour l'état courant** ; le CDC reste la
référence pour la substance fonctionnelle.

---

## 2. Stack

Dérogation à la stack imposée par le CDC (Laravel/Vue/MySQL), **acceptée par Naomedia**.

| Couche | Choix |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Langage | TypeScript strict |
| BDD | PostgreSQL |
| ORM | Prisma (`Decimal` pour l'argent) + `decimal.js` pour les calculs |
| Validation | Zod |
| Auth / sessions | Better Auth (sessions en base) |
| UI | shadcn/ui + Tailwind |
| Tables | TanStack Table (pagination serveur) |
| Graphes | Tremor (ou Recharts) |
| PDF | @react-pdf/renderer |
| Excel | exceljs |
| Dates | Luxon (fuseau Africa/Casablanca, stockage UTC) |
| Tests | Vitest |
| Déploiement | VPS + Docker + Coolify |

---

## 3. LA règle la plus importante : source de vérité unique

Le **modèle de données** (`prisma/schema.prisma`) est la source de vérité. Il est **figé
en premier**, avant tout écran. Aucun agent ne le modifie seul — toute évolution passe
par Mehdi. Le paramétrage société (raison sociale, ICE, RC, logo, préfixe BL, fuseau,
taux TVA) vit en base dans la table `parametres_systeme` — **jamais codé en dur** dans
un template PDF ou un composant.

---

## 4. Modèle de données (résumé — voir le schéma Prisma pour le détail)

Tables (noms en français) :

- `users` — id, nom_utilisateur (unique), mot_de_passe (hashé), role (admin|commercial),
  actif, derniere_connexion_at, soft delete.
- `objectifs` — utilisateur_id, mois (AAAA-MM), montant_objectif, created_by.
- `produits` — nom, categorie, unite (**kg** en V1), prix_reference (Decimal 10,2),
  actif, ordre_affichage, soft delete.
- `historique_prix` — produit_id, ancien_prix, nouveau_prix, utilisateur_id, date.
- `clients` — nom, region_ville (liste prédéfinie), telephone, commercial_id, soft delete.
- `clients_externes` — même modèle que clients (clients gérés par l'admin, non affichés
  côté commercial).
- `commandes` — numero_bl (**séquence Postgres**, unique, sans trou), client_id,
  client_externe_id (nullable), utilisateur_id, date_commande, type_commande
  (standard|externe), + statut de paiement **calculé** (voir §5).
- `lignes_commande` — commande_id, produit_id, quantite (Decimal 10,3), prix_unitaire
  (**figé** à la saisie), prix_net (= quantite × prix_unitaire ; **pas de remise**).
- `paiements` — commande_id, montant (Decimal 10,2), mode_paiement
  (espèces|chèque|traite|autre), date_paiement, reference (nullable),
  encaisse_par (admin), created_at. **(voir §5)**
- `retours` — produit_id, quantite_kg (Decimal 10,3), commentaire, utilisateur_id,
  created_at. Non modifiable après saisie.
- `parametres_systeme` — cle (unique), valeur, updated_by, updated_at.
- `audit_log` — utilisateur_id, action, entite, entite_id, donnees_avant (JSON),
  donnees_apres (JSON), ip_address, created_at. Lecture seule, conservé indéfiniment.

Différences volontaires vs le CDC (à documenter dans le README) :
- **Pas de colonne remise** dans `lignes_commande` (remise supprimée à la demande client).
- **Table `paiements`** ajoutée (le CDC prévoyait un statut binaire ; le client veut le
  règlement partiel multi-modes).
- `statut_paiement` n'est plus une colonne enum figée mais un **statut calculé**.

---

## 5. Comportements clés à connaître avant de modifier quoi que ce soit

- **Prix figé** : `prix_unitaire` est copié depuis `produits.prix_reference` au moment de
  la saisie. Changer un prix produit plus tard n'affecte pas les commandes passées.
- **Pas de remise/majoration** : retiré à la demande du client. `prix_net = quantité ×
  prix_unitaire`. Total à payer = Σ prix_net.
- **HT sans TVA** : poulet exonéré, HT = TTC. Taux TVA en base mais non appliqué en V1.
- **Numérotation BL** : séquence PostgreSQL, préfixée (paramétrage). Jamais `max+1`.
- **Recalcul serveur** : à l'enregistrement, le serveur recalcule tous les totaux depuis
  les lignes reçues et rejette toute incohérence. Transaction atomique (commande + lignes).
- **Paiements** : gérés par l'admin. Une commande peut recevoir plusieurs paiements
  (modes : espèces / chèque / traite / autre). Le **statut est calculé** :
  - `reste_dû = total_commande − Σ paiements`
  - `payé` si `reste_dû = 0`, sinon `en attente` (que rien ne soit payé ou une partie).
  - Le montant payé et le reste à payer sont affichés.
  - KPI « Non réglé » = **somme des restes dus**, pas un filtre de statut binaire.
- **Commande figée** après création : pas d'édition ; seul l'admin supprime (soft delete,
  audité).
- **Admin peut commander au nom d'un commercial** : le formulaire admin a un sélecteur
  de commercial ; l'action est tracée dans l'audit.
- **Retours magasin** : horodatés + liés au compte automatiquement, non modifiables.
- **Permissions serveur** : un commercial ne voit que ses données ; accès à une ressource
  d'autrui → 403.

---

## 6. Réponses client (tranchées)

| Question | Réponse |
|---|---|
| Migration des anciennes données | **Non — base vierge** |
| Remise / majoration | **Supprimée** |
| Prix HT ou TTC | **HT**, poulet exonéré (HT = TTC), pas de TVA |
| Règlement partiel | **Oui** — paiements multiples, gérés par l'admin, statut calculé |
| Modes de paiement | Espèces, chèque, traite, autre |
| Qui encaisse / marque payé | **Admin uniquement** |
| Région client | **Liste de villes prédéfinies** (liste standard Maroc au seed) |
| Admin commande pour un commercial | **Oui** (sélecteur + audit) |
| Retours modifiables | **Non** |
| Objectif mensuel | En **DH**, jauge visible côté commercial |
| Journal d'audit | Conservé **indéfiniment** |
| Mode hors connexion | **Non** (V1) |
| Fuseau horaire | **Africa/Casablanca** |
| Commande modifiable après création | **Non — figée** |
| Suppression de commande | **Admin uniquement**, soft delete |

---

## 7. Questions encore ouvertes (non bloquantes pour le socle)

À confirmer avec le client **avant le module paiement / KPI** :

1. Pour un **chèque** ou une **traite** : faut-il enregistrer le **numéro** et surtout la
   **date d'échéance** ? (Hypothèse actuelle : champ `reference` optionnel ; ajouter
   `date_echeance` si oui.)
2. Un paiement s'applique-t-il **à une commande** précise, ou peut-il couvrir un **solde
   global** sur plusieurs commandes d'un même client ? (Hypothèse : **par commande**.)
3. La ligne catalogue **« RELIQUAT PAYEMENT »** : compte-t-elle dans les KPI (CA, top
   produits) ou est-elle exclue ? Et est-elle encore utile maintenant que le règlement
   partiel existe ? (Hypothèse : produit normal inclus, à confirmer.)

Rappel non technique : **sign-off Naomedia sur la suppression de la remise** — le client
a confirmé ; à valider aussi côté Naomedia par écrit (leur CDC l'imposait).

---

## 8. Livrables attendus (CDC section 15)

- Code source sur le dépôt Git Naomedia, historique de commits clair.
- `README.md` : installation locale, variables d'environnement, commande de seed.
- Schéma + migrations Prisma pour tout le modèle.
- Seeders : catalogue avicole (section 14 du CDC) + villes + clients/commandes fictifs
  couvrant des cas limites (client sans commande, produit désactivé, commande
  totalement payée, commande partiellement payée).
- Suite de tests (Vitest) sur les calculs et les cas limites de la recette 16.2.
- Application déployée sur l'environnement de recette.
- Doc courte des choix techniques non couverts par le CDC.

---

## 9. État & to-do

**Fait :**
- Analyse du CDC, clarifications client obtenues, stack validée avec Naomedia.
- _(à compléter au fil du build)_

**À faire — dans l'ordre :**
1. [ ] Init projet Next.js + Docker + Coolify de base.
2. [ ] **Figer le schéma Prisma complet** (source de vérité) + migrations.
3. [ ] Seeders : catalogue avicole + liste villes + jeu de test avec cas limites.
4. [ ] Auth + rôles (Better Auth, sessions DB) + paramétrage système.
5. [ ] Fondations front (AppLayout, composants ui, thème Tailwind, 2 écrans de réf) —
       Claude Code.
6. [ ] CRUD admin : produits/prix + historique, utilisateurs, clients.
7. [ ] Commande + paiement (module critique — revue croisée).
8. [ ] Listes + externes + pagination serveur, retours, PDF BL, export Excel.
9. [ ] KPI commercial + consolidé admin, graphes, tops, objectifs, audit, sessions.
10. [ ] Durcissement + recette 16.2 (buffer).

**Bloqué sur info client :** les 3 questions ouvertes du §7 (avant le module paiement/KPI).

---

## 10. « Où je change X ? »

| Changement | Endroit |
|---|---|
| Modèle de données (tables, champs) | `prisma/schema.prisma` (via Mehdi uniquement) |
| Règles métier / interdits | `CLAUDE.md` / `AGENTS.md` |
| Facts société (nom, ICE, logo, préfixe BL, fuseau) | table `parametres_systeme` (jamais en dur) |
| Catalogue produits initial / villes | seeders |
| Design tokens (couleurs, polices) | thème Tailwind (Claude Code) |
| Composants réutilisables | `components/ui/` (Claude Code) |
| Formules KPI | module `kpi` — voir CDC section 7.4 |
| Contenu PDF du BL | template @react-pdf/renderer (alimenté par `parametres_systeme`) |
