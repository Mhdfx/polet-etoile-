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
docker build -t poulet-etoile .
docker run --env-file .env -p 3000:3000 poulet-etoile
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
mysqldump --single-transaction --routines --triggers --databases poulet_etoile > backup.sql
```

Restaurer sur une base de meme version MySQL 8.

## Smoke tests recette

1. Connexion admin : `admin` / `password`, puis changer le mot de passe avant production.
2. Connexion commercial : `commercial.nord` / `commercial123`.
3. Creer une commande commercial, verifier BL, PDF, liste et KPI.
4. Ajouter un paiement admin, verifier statut et reste du.
5. Exporter commandes et audit.
6. Verifier `/admin/parametres`, `/admin/kpi`, `/admin/sessions`.

