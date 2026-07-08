# AGENTS.md — Règles agent + protocole parallèle (projet Poulet Étoilé / Naomedia)

> Fichier chargé par **Codex** (et lu par Claude Code). Le contenu métier est
> **identique à `CLAUDE.md`** — se référer à `CLAUDE.md` §0 à §7 pour :
> le résumé projet, la stack, les 14 règles non négociables, les réponses client
> tranchées, la définition de « terminé », l'ordre de build et les interdits.
>
> **Ce fichier ajoute ce qui est spécifique au travail à DEUX agents en parallèle.**
> Avant d'écrire une ligne : lire `CLAUDE.md` + `HANDOFF.md` + ce protocole.

---

## Répartition des rôles

- **Claude Code = lead / architecte + design.**
  - Construit le cœur métier : commande, paiement, KPI.
  - Pose l'architecture et le **design system** : `AppLayout`, composants
    réutilisables (`Button`, `Input`, `Card KPI`, `Table`, `Badge statut`, `Modal`),
    thème Tailwind, 1–2 écrans de référence.
- **Codex = constructeur suiveur.**
  - Construit les modules périphériques une fois les fondations posées : retours,
    clients, exports, écrans de liste.
  - Sur le front, **réutilise les composants existants** de `components/`. N'invente
    pas de nouveaux styles, ne modifie pas le thème Tailwind, suit `AppLayout`.
  - Regarde un écran de référence déjà fait avant d'en construire un nouveau.

Les deux sont capables d'architecture et de bon code ; la hiérarchie ici sert la
**cohérence**, pas la compétence.

---

## Protocole parallèle (les règles anti-collision)

1. **Le schéma Prisma est la loi commune, figé en premier.** Aucun agent ne le modifie
   de sa propre initiative. Toute évolution passe par Mehdi, qui met à jour le schéma
   puis prévient les deux agents. Un agent qui pense qu'un champ manque le **signale**,
   il ne l'ajoute pas seul.
2. **Un seul agent par zone à un instant donné.** Ne jamais avoir deux agents en train
   d'écrire le même fichier ou le même dossier. Le parallélisme se fait sur des
   **modules étanches** (ex. Claude Code sur `commande/`, Codex sur `retours/`).
3. **Zones de propriété (par défaut) :**
   - Fondations (`lib/`, `components/ui/`, `app/layout`, thème, schéma Prisma) →
     **Claude Code uniquement**. Codex les **consomme**, ne les modifie pas.
   - Modules cœur (`commande`, `paiement`, `kpi`) → **Claude Code**.
   - Modules périphériques (`retours`, `clients`, `exports`, `audit`, `sessions`) →
     assignables à **Codex**.
4. **Contrat de données avant de coder un écran partagé.** Front et back communiquent
   via des types partagés (Zod/Prisma). Avant qu'un agent code un écran, la **forme des
   données** (types d'entrée/sortie) est définie et figée dans le code (schéma Zod +
   type Prisma). L'autre agent s'y conforme. Pas d'invention de noms de champs dans son
   coin (`prixNet` d'un côté, `prix_net` de l'autre = casse silencieuse).
5. **Commits fréquents = mémoire partagée.** Chaque agent commit dès qu'un morceau
   cohérent est fini, avec un message clair. C'est ainsi que l'autre agent (et la
   session suivante) sait ce qui existe déjà. Une branche par fonctionnalité.
6. **Reprise de session : relire les sources de vérité.** Un agent qui reprend n'a
   aucune mémoire de la session précédente. Il se fie **uniquement** à : le code
   committé, le schéma Prisma, `CLAUDE.md`/`AGENTS.md`, et `HANDOFF.md`. Jamais à un
   souvenir supposé.
7. **Synchronisation via Mehdi.** C'est Mehdi le point de synchro : il assigne les
   modules, tient le schéma et les contrats à jour, et vérifie la cohérence à chaque
   merge. Les agents ne se parlent pas entre eux — ils passent par le code et les docs.

---

## Revue croisée (qualité)

Sur les **3 modules critiques** — commande, paiement, KPI — le module construit par un
agent est **relu par l'autre** avant d'être considéré comme fini : recherche de bugs,
vérification des calculs (Decimal, arrondis), des permissions (403), de la concurrence
(numérotation BL), et écriture/complétion des tests Vitest. Sur le boilerplate (CRUD
simple, écrans de liste), un seul agent suffit — pas de revue croisée nécessaire.

---

## Checklist avant de dire « module terminé »

- [ ] `npm run build` passe sans erreur.
- [ ] Tests Vitest verts sur le module (calculs / cas limites concernés).
- [ ] États vides, chargement, erreurs de validation, 403/404/500 couverts.
- [ ] Permissions vérifiées **côté serveur** (test d'accès non autorisé → 403).
- [ ] Montants cohérents écran / PDF / Excel (si le module produit un de ces sorties).
- [ ] Aucun `number` sur un montant, aucun `max+1` de BL, aucun total client non
      recalculé.
- [ ] Français partout (tables, colonnes, UI).
- [ ] Commit clair + `HANDOFF.md` mis à jour si l'état du projet a changé.

---

## Rappel : où trouver quoi

- **Les règles métier + la stack + les interdits** → `CLAUDE.md`.
- **L'état du projet, les décisions, où vit quoi, la to-do, les questions ouvertes** →
  `HANDOFF.md` (à lire en premier à chaque reprise, à tenir à jour à chaque session).
- **Le modèle de données** → le schéma Prisma (`prisma/schema.prisma`), source de vérité.
