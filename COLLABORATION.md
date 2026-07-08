# COLLABORATION.md — Comment les deux agents travaillent ensemble

> Ce fichier ne dit pas **quoi** construire (voir `CLAUDE.md` / `HANDOFF.md`) — il dit
> **comment coexister** : la mémoire partagée, l'outillage à utiliser, les skills de
> design, et la discipline qui empêche deux agents de diverger.
>
> **Claude Code** et **Codex** travaillent sur le MÊME projet, souvent en parallèle.
> Vous n'êtes pas deux personnes qui se parlent : vous communiquez **uniquement** à
> travers le code committé, le schéma Prisma, et ces fichiers `.md`. Traitez-les comme
> votre mémoire commune.

---

## 1. Vous travaillez ensemble — le modèle mental

- **Claude Code = lead / architecte + design.** Pose l'architecture, construit le cœur
  métier (commande, paiement, KPI), et **définit le design system** (layout, composants
  réutilisables, thème). C'est la référence visuelle.
- **Codex = constructeur suiveur.** Construit les modules périphériques (retours,
  clients, exports, listes, audit, sessions) et, côté front, **réutilise les composants
  et le thème posés par Claude Code** — sans réinventer de style.

Vous êtes tous les deux compétents en archi et en code. La hiérarchie sert la
**cohérence**, pas à hiérarchiser le talent.

**Règle d'or absolue :** jamais deux agents sur le même fichier au même moment.
Parallélisme uniquement sur des **modules étanches**. Voir `AGENTS.md` §Protocole
parallèle pour les zones de propriété.

---

## 2. Mémoire partagée — les sources de vérité

Aucun agent n'a de mémoire d'une session à l'autre. Votre seule mémoire fiable :

| Source | Ce qu'elle porte | Qui la met à jour |
|---|---|---|
| `prisma/schema.prisma` | Le modèle de données (LA source de vérité) | Mehdi uniquement |
| Commits Git | Ce qui existe déjà, l'historique des décisions | Chaque agent, en committant |
| `CLAUDE.md` / `AGENTS.md` | Les règles + le protocole parallèle | Mehdi |
| `HANDOFF.md` | L'état du projet, décisions, to-do, questions ouvertes | **Chaque agent, à chaque session** |
| `COLLABORATION.md` | Ce fichier — outillage & discipline commune | Mehdi |

**À chaque reprise de session :** relire `HANDOFF.md` + le schéma Prisma + les derniers
commits AVANT d'écrire quoi que ce soit. Ne jamais se fier à un « souvenir » — il n'y en
a pas.

**À chaque fin de tâche significative :** commit clair + mettre à jour `HANDOFF.md` si
l'état du projet a changé (nouveau module fini, décision prise, question résolue).

---

## 3. graphify — carte du code (à installer et utiliser)

`graphify` construit un **graphe de code** (qui importe quoi, relations d'appel, hubs) —
il évite de grep à l'aveugle et donne à chaque agent une vue de structure à jour.

**Règles d'usage (identiques au projet Chaimae Glass) :**

- Pour toute question sur la structure du code, lancer d'abord
  `graphify query "<question>"` quand `graphify-out/graph.json` existe.
  Utiliser `graphify path "<A>" "<B>"` pour les relations et
  `graphify explain "<concept>"` pour un concept ciblé.
- Utiliser `graphify-out/wiki/index.md` pour la navigation large plutôt que de parcourir
  le code brut.
- Lire `graphify-out/GRAPH_REPORT.md` seulement pour une revue d'architecture globale.
- **Vérifier la fraîcheur d'abord** : comparer `built_at_commit` dans
  `graphify-out/graph.json` à `git rev-parse HEAD`. S'ils diffèrent, lancer
  `graphify update .` avant de se fier au graphe.
- **Après avoir modifié du code**, lancer `graphify update .` (AST seulement, sans coût
  API) pour garder le graphe à jour. Idéalement via hooks git post-commit / post-checkout
  (comme sur Chaimae Glass — attention à re-pin l'interpréteur Python dans `.git/hooks/`
  si graphify est réinstallé).
- `graphify-out/` est **git-ignored** (généré, se reconstruit).

Pourquoi c'est encore plus utile ici qu'à Chaimae : deux agents en parallèle → le graphe
permet à chacun de voir ce que l'autre a déjà branché sans lire tout le repo.

---

## 4. Skills de design front — quand et comment

> **Contexte différent de Chaimae Glass.** Chaimae était un **site vitrine premium**
> (luxe éditorial, Fraunces + brass, macro-whitespace, animations). Naomedia est une
> **application de gestion terrain**, utilisée au doigt sur smartphone par des
> commerciaux : priorité à la **lisibilité, la densité d'information, la rapidité de
> saisie, les tableaux clairs**. Les skills ci-dessous s'utilisent pour la **rigueur**
> (contraste, a11y, cohérence, états), **pas** pour plaquer une esthétique de luxe.
> Avant d'utiliser un skill, lire son `SKILL.md` réel (il a pu évoluer).

**Réorientation esthétique pour CE projet :** interface sobre et fonctionnelle, forte
lisibilité mobile, composants shadcn/ui + Tailwind, une couleur d'accent + des couleurs
fonctionnelles (vert = payé/OK, rouge/orange = non réglé/alerte), tableaux denses mais
lisibles, formulaires rapides. Pas d'animations décoratives, pas de 3D, pas de
serif éditorial.

### À utiliser (adaptés au contexte gestion)

- **`ui-ux-pro-max` (recommandé pour tout travail UI/UX).** Skill path :
  `.claude/skills/ui-ux-pro-max/`. Avant d'écrire/changer de l'UI, lire son `SKILL.md` et
  lancer ses scripts au lieu de deviner le style. Utile ici pour : contraste/a11y,
  règles de layout, patterns de formulaires et de tableaux, hiérarchie visuelle.
  Sur Windows : `python` (pas `python3`). Exemple de recherche orientée gestion :
  ```
  python .claude/skills/ui-ux-pro-max/scripts/search.py "dense data table dashboard admin mobile-first business management" --design-system -p "Poulet Etoile" --stack nextjs
  ```
- **`impeccable`** — QA de design. `/impeccable init` une fois, puis `polish`, `audit`,
  `critique`. Un hook PostToolUse peut lancer son détecteur après chaque édition de
  fichier UI (comme sur Chaimae). Garde les composants propres et cohérents.
- **`design-motion-principles`** — pour les micro-interactions **fonctionnelles**
  uniquement (états de chargement, feedback de bouton, transitions de modal). Ici :
  sobriété. Pas d'animations d'entrée décoratives. Tout doit respecter
  `prefers-reduced-motion`.
- **`minimalist-ui`** — probablement le plus adapté à une app de gestion : clarté,
  hiérarchie, réduction du bruit visuel. À privilégier sur les skills « premium ».

### À utiliser avec prudence / réorientation

- **`design-taste-frontend`** — bon pour les garde-fous (bans d'em-dash, rationnement
  des « eyebrows », checklist pré-livraison, contraste). Ignorer ses inclinations
  « luxe » ; garder ses règles d'hygiène.
- **`redesign-existing-projects`** — utile seulement si on reprend/rafraîchit un écran
  existant (checklist d'audit typographie/couleur/layout/états).

### À NE PAS appliquer tel quel (esthétique inadaptée)

- **`high-end-visual-design`** — pensé pour du luxe éditorial (double-bezel, CTA à icône
  imbriquée, macro-whitespace, beziers custom). Contresens sur une app de gestion dense.
  N'y recourir que pour un principe ponctuel de qualité, jamais pour l'orientation
  globale.
- **`industrial-brutalist-ui`, `high-end`/`brandkit`/`gpt-taste`/`stitch-design-taste`,
  `image-to-code`, `imagegen-frontend-*`** — non pertinents ici ; ne pas les invoquer
  par réflexe. (Listés pour mémoire car présents dans le bundle utilisé sur Chaimae.)

> Codex : quand tu construis un écran, tu **suis les composants et le thème déjà posés
> par Claude Code**. Tu n'inventes pas un nouveau style et tu ne relances pas un skill de
> design pour « rehabiller » un module — tu réutilises. Les skills de design servent à
> Claude Code pour **poser** le système ; toi tu le **consommes**.

---

## 5. Outillage de vérification (comme sur Chaimae, adapté à la stack)

- **Boucle de vérif après chaque changement** : `npm run build` → lancer l'app →
  vérifier le rendu → tests Vitest verts sur le module touché. Ne jamais considérer un
  module fini sans build vert + tests verts.
- **impeccable hook** (optionnel) : linter de design déterministe qui tourne après
  chaque édition de fichier UI (a attrapé sur Chaimae : gradient-text, easing bounce).
- **Git** : une branche par fonctionnalité (`feature/…`), messages de commit descriptifs
  qui documentent la décision, pas juste « update ». Les commits sont votre mémoire
  partagée.

---

## 6. Fichiers de config d'agents

- `.claude/` — settings, skills, hooks pour Claude Code (graph-first, impeccable).
- `.codex/` — config équivalente pour Codex si utilisée.
- Le skill installer dépose parfois des configs miroir pour d'autres éditeurs
  (`.cursor/`, `.gemini/`, etc.) — inoffensives, supprimables si non utilisées.
- `.git/hooks/post-commit` & `post-checkout` — reconstruisent graphify automatiquement ;
  contiennent le chemin Python **épinglé** (`_PINNED`), à re-pin si graphify est
  réinstallé (piège connu : les noms d'utilisateur avec espaces cassent la sonde).

---

## 7. Résumé — la discipline en 6 points

1. **Le schéma Prisma est la loi.** Figé en premier, modifié par Mehdi seulement.
2. **Un agent par fichier.** Parallélisme sur modules étanches uniquement.
3. **Relire avant d'écrire** : `HANDOFF.md` + schéma + derniers commits à chaque session.
4. **Committer souvent et clair** : c'est la mémoire partagée entre agents et sessions.
5. **graphify pour la structure**, à jour (freshness check + `update` après édition).
6. **Design** : Claude Code pose (skills de rigueur, esthétique gestion sobre), Codex
   consomme. Jamais l'esthétique luxe de Chaimae plaquée sur une app de gestion.
