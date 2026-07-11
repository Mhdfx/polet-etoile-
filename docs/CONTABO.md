# Deploiement Contabo VPS — Coq Plus

Guide pas a pas pour un VPS Contabo Ubuntu 22.04/24.04 avec Docker, MySQL,
HTTPS automatique (Caddy) et l'application Next.js de ce depot.

## Ce dont vous avez besoin

| Element | Exemple |
|---|---|
| VPS Contabo | Ubuntu 22.04 ou 24.04, 4 vCPU / 8 Go RAM recommande |
| IP publique | fournie par Contabo |
| Nom de domaine | `app.votredomaine.ma` pointant vers l'IP du VPS |
| Acces SSH | mot de passe root ou cle SSH (panel Contabo) |

Sans domaine : vous pouvez tester en HTTP sur le port 80 en mettant l'IP dans
`APP_DOMAIN` (pas de HTTPS Let's Encrypt sur IP seule).

Image applicative preconstruite :

- `APP_IMAGE=ghcr.io/mhdfx/coq-plus:latest`
- L'image est construite par GitHub Actions a chaque push sur `main`.
- Si le package GHCR est prive, connecter Docker une seule fois sur le VPS :
  ```bash
  echo VOTRE_GITHUB_TOKEN | docker login ghcr.io -u Mhdfx --password-stdin
  ```
- Attendre que l'action GitHub "Build Docker image" soit verte avant de lancer
  `docker compose ... pull app`.

---

## Etape 1 — Premier acces SSH

Depuis votre PC (PowerShell) :

```powershell
ssh root@VOTRE_IP_CONTABO
```

Changez le mot de passe root si Contabo le demande.

---

## Etape 2 — Securiser le serveur (15 min)

```bash
apt update && apt upgrade -y
timedatectl set-timezone Africa/Casablanca

# Utilisateur deploy (ne pas rester root)
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true

# Pare-feu
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Reconnectez-vous en `deploy` :

```bash
ssh deploy@VOTRE_IP_CONTABO
```

---

## Etape 3 — Installer Docker

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker deploy
newgrp docker
docker --version
```

---

## Etape 4 — DNS du domaine

Chez votre registrar (ou Cloudflare) :

| Type | Nom | Valeur |
|---|---|---|
| A | `app` (ou `@`) | IP du VPS Contabo |

Attendre 5–30 min, puis verifier :

```bash
dig +short app.votredomaine.ma
```

---

## Etape 5 — Cloner le projet sur le VPS

```bash
sudo mkdir -p /opt/coq-plus
sudo chown deploy:deploy /opt/coq-plus
cd /opt/coq-plus

git clone https://github.com/VOTRE_ORG/coq-plus.git .
# ou : scp/rsync depuis votre machine locale si depot prive
```

---

## Etape 6 — Fichier `.env` production

```bash
cp .env.production.example .env
nano .env
```

Remplir **obligatoirement** :

- `APP_DOMAIN` — ex. `app.coq-plus.ma`
- `APP_EMAIL` — email pour Let's Encrypt
- `BETTER_AUTH_URL` et `NEXT_PUBLIC_APP_URL` — `https://APP_DOMAIN`
- `BETTER_AUTH_SECRET` — generer avec :
  ```bash
  openssl rand -base64 32
  ```
- `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` — mots de passe forts uniques

`DATABASE_URL` est construit automatiquement par docker-compose a partir des
variables `MYSQL_*` — ne pas le definir dans `.env`.

---

## Etape 7 — Lancer la stack

```bash
cd /opt/coq-plus
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
```

Suivre les logs :

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Au premier demarrage le conteneur `app` :

1. applique `prisma migrate deploy`
2. demarre Next.js sur le port 3000 (interne)
3. Caddy expose HTTPS sur 443

---

## Etape 8 — Seed recette (optionnel)

**Recette / demo uniquement** — pas en production client final.

Le conteneur tourne en `NODE_ENV=production` : le seed **exige** des mots de
passe forts via `.env` (12 caracteres minimum), sinon il refuse de s'executer :

```bash
# Dans .env : SEED_ADMIN_PASSWORD=... et SEED_COMMERCIAL_PASSWORD=...
docker compose -f docker-compose.prod.yml exec app npm run seed
```

Comptes seed : `admin`, `commercial.nord`, `commercial.sud` avec les mots de
passe definis dans `.env` (jamais les valeurs de demo locales).

---

## Etape 9 — Smoke test

1. Ouvrir `https://app.votredomaine.ma/connexion`
2. Connexion admin, puis commercial
3. Creer une commande, telecharger PDF BL
4. Verifier `/admin/parametres`, `/admin/kpi`

---

## Commandes utiles

```bash
# Etat des conteneurs
docker compose -f docker-compose.prod.yml ps

# Redemarrer l'app apres un git pull
git pull
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d app

# Logs
docker compose -f docker-compose.prod.yml logs -f caddy app mysql

# Sauvegarde MySQL (le mot de passe est lu DANS le conteneur mysql,
# d'ou les quotes simples autour de la commande)
docker compose -f docker-compose.prod.yml exec -T mysql \
  sh -c 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction "$MYSQL_DATABASE"' \
  > backup-$(date +%F).sql

# Sauvegarde quotidienne a 2h du matin (mkdir -p /opt/coq-plus/backups
# une fois, puis crontab -e sous l'utilisateur deploy)
# 0 2 * * * cd /opt/coq-plus && docker compose -f docker-compose.prod.yml exec -T mysql sh -c 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction "$MYSQL_DATABASE"' > /opt/coq-plus/backups/backup-$(date +\%F).sql

# Arret complet
docker compose -f docker-compose.prod.yml down
```

---

## Contabo — reglages panel

Dans le panel Contabo (VPS control) :

- Desactiver le pare-feu Contabo **ou** autoriser ports 22, 80, 443 (sinon conflit avec UFW)
- Activer les snapshots avant mise en production
- Choisir un datacenter proche du Maroc si possible (latence)

---

## Depannage

| Symptome | Cause probable | Action |
|---|---|---|
| 502 / site inaccessible | App pas demarree | `docker compose logs app` |
| Certificat SSL echoue | DNS pas propage, mauvais `APP_DOMAIN` | `dig`, verifier Caddy logs |
| Erreur DB au demarrage | MySQL pas pret | attendre healthcheck, relancer `app` |
| Connexion OK mais deconnexion | `BETTER_AUTH_URL` != URL reelle | aligner sur HTTPS exact |
| Upload logo perdu | volume non monte | verifier volume `uploads_data` (`/app/public/uploads`) |
| Export Excel perdu apres redemarrage | volume non monte | verifier volume `exports_data` (`/app/exports-prive`) |
| Conteneur app refuse de demarrer avec « ERREUR : ... » | variable `.env` manquante ou placeholder | completer `.env` (secret, URLs, DATABASE_URL) |
| Site down apres reboot VPS | Docker ou stack non relancee | voir section **Redemarrage / downtime** ci-dessous |

---

## Redemarrage / downtime (reboot VPS)

Objectif : apres un arret ou un reboot du VPS, l'application repart seule sans
intervention manuelle.

### Ce qui est deja en place (dans le depot)

| Mecanisme | Role |
|---|---|
| `restart: unless-stopped` | Chaque conteneur redemarre si Docker tourne |
| Healthcheck MySQL (`start_period: 120s`) | Laisse InnoDB recuperer apres crash |
| Healthcheck app (Node fetch `/connexion`) | Confirme que Next.js repond |
| `depends_on: mysql: service_healthy` | L'app attend MySQL avant de demarrer |
| `scripts/docker-entrypoint.sh` | Attente TCP MySQL + reessais `migrate deploy` |
| Service systemd (optionnel) | `docker compose up -d` au boot du VPS |

### Installation du service systemd (une fois sur le VPS)

Adapter le chemin si le projet n'est pas dans `/opt/apps/coq-plus` :

```bash
cd /opt/apps/coq-plus
git pull
chmod +x scripts/install-systemd-service.sh scripts/verify-stack.sh
sudo ./scripts/install-systemd-service.sh /opt/apps/coq-plus docker-compose.ip.yml
# Avec domaine + HTTPS :
# sudo ./scripts/install-systemd-service.sh /opt/coq-plus docker-compose.prod.yml
```

Puis recuperer l'image app preconstruite :

```bash
docker compose -f docker-compose.ip.yml pull app
docker compose -f docker-compose.ip.yml up -d app
```

### Verifier apres un reboot

```bash
sudo reboot
# reconnecter SSH, puis :
cd /opt/apps/coq-plus
./scripts/verify-stack.sh
docker compose -f docker-compose.ip.yml ps
```

Attendu : `mysql` et `app` **healthy**, `/connexion` repond en moins de 5 min.

### Test manuel sans reboot

```bash
docker compose -f docker-compose.ip.yml restart app
./scripts/verify-stack.sh
```

### Ordre de demarrage

1. Docker daemon (`systemctl enable docker`)
2. MySQL (volume `mysql_data` persiste les donnees)
3. App : attente TCP → migrations Prisma → `next start`
4. Caddy (prod uniquement) : apres app healthy

### Si l'app boucle au demarrage

```bash
docker compose -f docker-compose.ip.yml logs -f app
docker compose -f docker-compose.ip.yml logs mysql
```

Causes frequentes : `.env` incomplet, MySQL encore en recovery (attendre 2–3 min),
mot de passe MySQL change sans mettre a jour `.env`.

---

## Alternative : Coolify

Si vous preferez une UI de deploiement (deja mentionnee dans `docs/DEPLOYMENT.md`) :

1. Installer Coolify sur le VPS : https://coolify.io/docs
2. Nouvelle app → Dockerfile, port 3000
3. MySQL 8 comme service Coolify
4. Variables d'environnement identiques a `.env.production.example`
5. Commande pre-deploy : `npx prisma migrate deploy`

---

## Checklist avant ouverture aux utilisateurs

- [ ] `BETTER_AUTH_SECRET` unique et long
- [ ] Mots de passe MySQL forts
- [ ] Mot de passe admin change (pas `password`)
- [ ] HTTPS actif
- [ ] Sauvegarde MySQL planifiee (cron quotidien)
- [ ] Seed desactive en production si base vierge voulue

Voir aussi `docs/DEPLOYMENT.md`.
