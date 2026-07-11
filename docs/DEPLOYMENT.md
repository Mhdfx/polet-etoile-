# Deploiement recette / production

## Variables d'environnement

Requises :

- `DATABASE_URL` : URL MySQL compatible Prisma/MariaDB adapter.
- `BETTER_AUTH_SECRET` : secret aleatoire long, 32 caracteres minimum.
- `BETTER_AUTH_URL` : URL publique HTTPS de l'application.
- `NEXT_PUBLIC_APP_URL` : URL publique HTTPS de l'application.

## Commandes de deploiement

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run build
npm run start
```

Avec Docker :

```bash
docker pull ghcr.io/mhdfx/coq-plus:latest
docker run --env-file .env -p 3000:3000 ghcr.io/mhdfx/coq-plus:latest
```

## VPS Contabo (Docker Compose + Caddy)

Guide detaille : [`docs/CONTABO.md`](./CONTABO.md).

Fichiers :

- `docker-compose.ip.yml` : MySQL + app en HTTP sur IP seule
- `docker-compose.build.yml` : override de secours pour reconstruire sur serveur

- `docker-compose.prod.yml` — MySQL + app + Caddy (HTTPS)
- `.env.production.example` — variables a copier vers `.env` sur le serveur

```bash
cp .env.production.example .env
# editer .env (domaine, secrets, mots de passe MySQL)
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d app
```

Au demarrage, le conteneur applique `prisma migrate deploy` puis `npm run start`.
L'image applicative est preconstruite par GitHub Actions et publiee sur
`ghcr.io/mhdfx/coq-plus:latest`. En cas d'urgence seulement, reconstruire sur le
serveur avec :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.build.yml up -d --build app
```

## Coolify

- Type : Dockerfile.
- Port interne : `3000`.
- Base : MySQL 8 externe ou service Coolify.
- Commande de migration avant lancement : `npm run prisma:migrate`.
- Ne pas lancer `npm run seed` en production sauf environnement recette volontaire.

## Seed / fixtures

- Recette : `npm run seed` cree les comptes de test, le catalogue CDC et 1 000 commandes de volume.
- Production : utiliser seulement si Naomedia veut une base de demonstration; sinon demarrer base vierge/migree.

## Sauvegarde MySQL

Sauvegarde quotidienne recommandee cote infrastructure Naomedia :

```bash
mysqldump --single-transaction --routines --triggers --databases coq_plus > backup.sql
```

Restaurer sur une base de meme version MySQL 8.

## Smoke tests recette

1. Connexion admin : `admin` / `password`, puis changer le mot de passe avant production.
2. Connexion commercial : `commercial.nord` / `commercial123`.
3. Creer une commande commercial, verifier BL, PDF, liste et KPI.
4. Ajouter un paiement admin, verifier statut et reste du.
5. Exporter commandes et audit.
6. Verifier `/admin/parametres`, `/admin/kpi`, `/admin/sessions`.
