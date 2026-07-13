# Deployement VPS - Coq Plus

Derniere mise a jour : 11/07/2026.

Ce fichier resume le deploiement reel effectue sur le VPS et la procedure a
suivre pour les prochains deploiements.

## Etat actuel

- Application : Coq Plus
- VPS : `212.47.68.171`
- URL publique actuelle : `http://212.47.68.171`
- Page de verification : `http://212.47.68.171/connexion`
- Dossier projet sur le VPS : `/opt/apps/poulet-etoile`
- Branche de deploiement : `main`
- Repo GitHub : `https://github.com/Mhdfx/polet-etoile-`
- Mode actuel : Docker Compose sur IP publique, sans domaine, port `80`
- Compose utilise : `docker-compose.ip.yml`
- Base de donnees : MySQL 8.4 en conteneur Docker
- Image app actuelle : `ghcr.io/mhdfx/coq-plus:latest`

Derniere verification VPS confirmee :

- `poulet_etoile_app` healthy
- `poulet_etoile_mysql` healthy
- `/connexion` retourne HTTP `200`
- L'app tourne avec l'image preconstruite `ghcr.io/mhdfx/coq-plus:latest`
- 11/07/2026 : base remise en etat livraison propre (voir section « Remise a zero
  production vers etat livraison propre »). Etat verifie : `26` produits, `0`
  commandes, `6` users.

## Architecture de deploiement

La stack contient deux conteneurs :

- `poulet_etoile_mysql` : MySQL 8.4, volume Docker `mysql_data`
- `poulet_etoile_app` : Next.js production, port host `80` vers port conteneur `3000`

Volumes Docker :

- `mysql_data` : donnees MySQL persistantes
- `uploads_data` : fichiers uploades dans `/app/public/uploads`
- `exports_data` : exports prives dans `/app/exports-prive`

Reseau Docker :

- `poulet`

## Variables importantes

Sur le VPS, le fichier `.env` est cree depuis `.env.production.example`.

Variables importantes :

```bash
APP_IMAGE=ghcr.io/mhdfx/coq-plus:latest

BETTER_AUTH_URL=http://212.47.68.171
NEXT_PUBLIC_APP_URL=http://212.47.68.171
BETTER_AUTH_SECRET=REMPLACER_PAR_UN_SECRET_LONG

MYSQL_DATABASE=poulet_etoile
MYSQL_USER=poulet
MYSQL_PASSWORD=REMPLACER_MOT_DE_PASSE_FORT
MYSQL_ROOT_PASSWORD=REMPLACER_ROOT_FORT
```

Ne pas definir `DATABASE_URL` dans `.env` pour ce mode compose. Elle est construite
automatiquement par `docker-compose.ip.yml` a partir des variables `MYSQL_*`.

## Deploiement standard rapide

Depuis le VPS :

```bash
cd /opt/apps/poulet-etoile

git fetch origin
git reset --hard origin/main

docker compose -f docker-compose.ip.yml pull app
docker compose -f docker-compose.ip.yml up -d app

WORK_DIR=/opt/apps/poulet-etoile COMPOSE_FILE=docker-compose.ip.yml ./scripts/verify-stack.sh
docker compose -f docker-compose.ip.yml ps
```

Ce flux est maintenant rapide parce que le VPS ne construit plus l'image. Il la
telecharge depuis GitHub Container Registry.

## Build Docker preconstruit

Le fichier `.github/workflows/docker-image.yml` construit l'image automatiquement a
chaque push sur `main`.

Image publiee :

```text
ghcr.io/mhdfx/coq-plus:latest
```

Tags publies :

- `latest`
- `sha-...`

Avant de deployer une nouvelle version, verifier que le workflow GitHub Actions
`Build Docker image` est vert.

## Premier deploiement ou redeploiement complet

Si le dossier n'existe pas encore sur le VPS :

```bash
sudo mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/Mhdfx/polet-etoile- poulet-etoile
cd /opt/apps/poulet-etoile
cp .env.production.example .env
nano .env
```

Adapter `.env` pour le mode IP :

```bash
APP_IMAGE=ghcr.io/mhdfx/coq-plus:latest
BETTER_AUTH_URL=http://212.47.68.171
NEXT_PUBLIC_APP_URL=http://212.47.68.171
```

Puis lancer :

```bash
docker compose -f docker-compose.ip.yml pull app
docker compose -f docker-compose.ip.yml up -d
WORK_DIR=/opt/apps/poulet-etoile COMPOSE_FILE=docker-compose.ip.yml ./scripts/verify-stack.sh
```

## Verification apres deploy

Commandes utiles :

```bash
cd /opt/apps/poulet-etoile

docker compose -f docker-compose.ip.yml ps
docker compose -f docker-compose.ip.yml logs --tail=80 app
docker compose -f docker-compose.ip.yml logs --tail=80 mysql

WORK_DIR=/opt/apps/poulet-etoile COMPOSE_FILE=docker-compose.ip.yml ./scripts/verify-stack.sh
curl -I http://127.0.0.1/connexion
```

La verification attendue :

- Docker actif
- MySQL healthy
- App healthy
- `http://127.0.0.1/connexion` accessible en HTTP `200`

## Migrations Prisma

Le conteneur app applique automatiquement les migrations au demarrage via
`scripts/docker-entrypoint.sh`.

Dans les logs app, on doit voir :

```text
Application des migrations Prisma
No pending migrations to apply
Demarrage Next.js
Ready
```

Il ne faut pas lancer `prisma db push` en production. Les changements schema doivent
passer par les migrations Prisma commitees.

## Synchronisation catalogue CDC (production)

Apres chaque deploiement, synchroniser le catalogue CDC section 14 **sans
ecraser les utilisateurs ni les prix deja fixes par l'admin** :

```bash
cd /opt/apps/poulet-etoile
docker compose -f docker-compose.ip.yml exec app npm run sync:catalogue
```

Ce script :

- Cree ou reactive les **26 produits CDC** (section 14 du cahier des charges)
- Enregistre `catalogue_version` (ex. `1.0.0`) et `app_version` dans les parametres
- **Conserve** tous les utilisateurs, mots de passe, commandes, clients
- **Conserve** les `prix_reference` deja en base (defaut production)

Pour forcer la reapplication des prix CDC (recette uniquement) :

```bash
docker compose -f docker-compose.ip.yml exec -e SYNC_CDC_PRICES=true app npm run sync:catalogue
```

Versions visibles dans **Admin → Parametrage** (cartes en haut de page).

**Ne pas utiliser** `npm run seed` en production avec des comptes reels : le seed
peut reinitialiser les mots de passe. Utiliser `sync:catalogue` a la place.

## Seed et base propre

Le seed de production ne doit etre lance volontairement que si necessaire.

Commandes utiles :

```bash
docker compose -f docker-compose.ip.yml exec app npm run seed
docker compose -f docker-compose.ip.yml exec app npm run reset:delivery-data
```

Notes :

- `npm run seed` cree/met a jour les utilisateurs, parametres, villes et catalogue.
- Les donnees demo/volume ne sont creees que si `SEED_DEMO_DATA=true`.
- `npm run reset:delivery-data` remet la base en etat livraison propre tout en
  conservant les utilisateurs et comptes auth.

## Remise a zero production vers etat livraison propre

Objectif : aligner la production sur l'etat local de livraison, c'est-a-dire
**utilisateurs + 26 produits CDC, tout le transactionnel vide**. Procedure realisee
le 11/07/2026.

`reset:delivery-data` supprime aussi les produits, il faut donc enchainer avec
`sync:catalogue` qui recree les 26 produits CDC avec leurs prix de reference.
Ce que reset supprime : commandes, lignes, paiements, bons de charge, retours,
historique prix, objectifs, clients, clients externes, audit, sessions, produits ;
et remet les compteurs BL/BC a 0. Ce qu'il conserve : utilisateurs, comptes auth,
parametres systeme.

```bash
cd /opt/apps/poulet-etoile

# 1. Sauvegarde d'abord (voir section Sauvegarde MySQL, garder --no-tablespaces)
docker compose -f docker-compose.ip.yml exec mysql sh -lc \
  'mysqldump --no-tablespaces --single-transaction --routines --triggers \
   -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > backup-before-reset-$(date +%F-%H%M).sql

# 2. Reset vers etat livraison propre (garde users + auth, vide le reste)
docker compose -f docker-compose.ip.yml exec app npm run reset:delivery-data

# 3. Recreer les 26 produits CDC avec prix de reference
docker compose -f docker-compose.ip.yml exec app npm run sync:catalogue
```

Verification (le client `mysql` est dans le conteneur `mysql`, pas `app`) :

```bash
docker compose -f docker-compose.ip.yml exec mysql sh -lc \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e \
   "SELECT (SELECT COUNT(*) FROM produits) AS produits, (SELECT COUNT(*) FROM commandes) AS commandes, (SELECT COUNT(*) FROM users) AS users;"'
```

Resultat attendu : `26  0  <nb_users>`. Reset 11/07/2026 verifie a `26 | 0 | 6`
(1008 commandes, 5 clients, 2 clients externes, 90 audits supprimes ; 6 users
conserves). Toutes les sessions sont effacees : les utilisateurs doivent se
reconnecter.

Avertissement : cette operation est irreversible hors sauvegarde. Verifier que le
dump de l'etape 1 n'est pas vide avant de lancer l'etape 2.

## Identifiants de test initiaux

Comptes seed connus :

```text
admin / password
com1 / password
com2 / password
```

En production client, changer ces mots de passe avant usage reel.

## Probleme GHCR denied

Si cette commande echoue :

```bash
docker compose -f docker-compose.ip.yml pull app
```

avec :

```text
Error response from daemon: denied
```

Ca veut dire que le VPS n'a pas acces a l'image GHCR.

Solutions :

1. Rendre le package GitHub Container Registry public :
   `GitHub -> profile/packages -> coq-plus -> Package settings -> Change visibility -> Public`

2. Ou connecter Docker au registre depuis le VPS avec un token GitHub qui a
   `read:packages` :

```bash
echo VOTRE_GITHUB_TOKEN | docker login ghcr.io -u Mhdfx --password-stdin
docker compose -f docker-compose.ip.yml pull app
```

## Probleme Permission denied sur les scripts

Les scripts ont ete rendus executables dans Git au commit :

```text
ae0c147 chore(deploy): rendre scripts VPS executables
```

Si le probleme revient :

```bash
cd /opt/apps/poulet-etoile
chmod +x scripts/verify-stack.sh scripts/install-systemd-service.sh
```

Puis relancer :

```bash
WORK_DIR=/opt/apps/poulet-etoile COMPOSE_FILE=docker-compose.ip.yml ./scripts/verify-stack.sh
```

## Systemd

Le script existe :

```bash
scripts/install-systemd-service.sh
```

Mais l'installation systemd n'a pas ete finalisee parce que le mot de passe `sudo`
du VPS a echoue pendant la tentative.

Etat actuel :

- L'app fonctionne sans le service systemd custom.
- Les conteneurs ont `restart: unless-stopped`, donc Docker peut les relancer.
- A faire plus tard avec acces sudo/root valide : installer le service systemd.

Commande prevue quand l'acces sudo/root sera disponible :

```bash
cd /opt/apps/poulet-etoile
sudo ./scripts/install-systemd-service.sh /opt/apps/poulet-etoile docker-compose.ip.yml
```

## Fallback lent : build sur le VPS

Utiliser seulement si GHCR est indisponible et qu'il faut deployer en urgence.

```bash
cd /opt/apps/poulet-etoile
docker compose -f docker-compose.ip.yml -f docker-compose.build.yml up -d --build app
```

Ce mode peut prendre 10 a 20 minutes sur le VPS. Le flux normal doit rester le pull
de l'image preconstruite.

## Passage futur avec domaine

Quand un domaine sera pret :

1. Pointer le DNS vers `212.47.68.171`.
2. Mettre a jour `.env` :

```bash
APP_DOMAIN=votre-domaine.com
APP_EMAIL=admin@votre-domaine.com
BETTER_AUTH_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

3. Utiliser le compose avec Caddy :

```bash
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
```

## Sauvegarde MySQL

Sauvegarde manuelle :

```bash
cd /opt/apps/poulet-etoile
docker compose -f docker-compose.ip.yml exec mysql sh -lc \
  'mysqldump --no-tablespaces --single-transaction --routines --triggers \
   -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > backup-coq-plus-$(date +%F-%H%M).sql
```

Important : garder `--no-tablespaces`. Sans cette option, `mysqldump` echoue avec
`Access denied; you need (at least one of) the PROCESS privilege(s)` car
l'utilisateur `poulet` n'a pas le privilege global `PROCESS`. Un dump lance sans
`--no-tablespaces` s'interrompt et produit un fichier vide/inutilisable.

Restaurer seulement apres avoir verifie le fichier de sauvegarde et arrete les
ecritures applicatives si necessaire.

## Checklist avant de dire que le deploy est bon

- [ ] Git sur le VPS pointe vers le dernier commit `origin/main`
- [ ] GitHub Actions `Build Docker image` est vert
- [ ] `docker compose -f docker-compose.ip.yml pull app` reussit
- [ ] `docker compose -f docker-compose.ip.yml up -d app` reussit
- [ ] `poulet_etoile_mysql` est healthy
- [ ] `poulet_etoile_app` est healthy
- [ ] `./scripts/verify-stack.sh` passe avec `WORK_DIR=/opt/apps/poulet-etoile`
- [ ] `http://212.47.68.171/connexion` s'ouvre dans le navigateur
- [ ] Connexion admin testee
- [ ] Une page metier admin testee
- [ ] Une page PDF/BL testee

