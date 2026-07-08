# Poulet Etoile / Naomedia

Application de gestion commerciale pour distribution avicole.

## Stack actuelle

- Next.js 15 App Router
- TypeScript strict
- MySQL 8
- Prisma 7
- Better Auth avec sessions en base
- Decimal.js pour tous les calculs de montants
- Zod, TanStack Table, Recharts
- Luxon avec fuseau `Africa/Casablanca`
- Vitest

## Installation locale

```bash
npm install
cp .env.example .env
docker compose up -d mysql
npm run prisma:migrate
npm run seed
npm run dev
```

L'application demarre sur [http://localhost:3000](http://localhost:3000).
Le MySQL Docker ecoute sur le port hote `3307` pour eviter le conflit avec Laragon
qui utilise souvent `3306`.

## Comptes seed

- Admin : `admin` / `password`
- Commercial : `commercial.nord` / `commercial123`
- Commercial : `commercial.sud` / `commercial123`

Avant production, remplacer `BETTER_AUTH_SECRET` par une valeur aleatoire longue
de 32 caracteres minimum.

## Commandes utiles

```bash
npm run build
npm run lint
npm run test
npm run prisma:validate
npm run prisma:generate
npm run seed
```

Si Prisma Migrate demande une shadow database, l'utilisateur local Docker `poulet`
dispose des privileges necessaires dans l'environnement de developpement.

## Regles a ne pas casser

- La commande est la source de verite.
- Les montants ne passent jamais par le type `number`.
- Le numero BL utilise `compteurs_bl` avec verrou transactionnel MySQL, jamais `max+1`.
- Pas de remise ni majoration.
- Interface et donnees metier en francais.
- Les permissions se verifient cote serveur sur chaque action.

Voir `CLAUDE.md`, `AGENTS.md`, `PLAN.md` et `HANDOFF.md` avant toute modification.
