#!/bin/sh
set -e

# Garde-fous production : refuser de demarrer avec une config incomplete.
if [ -z "$DATABASE_URL" ]; then
  echo "ERREUR : DATABASE_URL manquant (voir .env.production.example)." >&2
  exit 1
fi

if [ -z "$BETTER_AUTH_SECRET" ]; then
  echo "ERREUR : BETTER_AUTH_SECRET manquant. Generer avec : openssl rand -base64 32" >&2
  exit 1
fi

if [ "${#BETTER_AUTH_SECRET}" -lt 32 ]; then
  echo "ERREUR : BETTER_AUTH_SECRET doit contenir au moins 32 caracteres." >&2
  exit 1
fi

case "$BETTER_AUTH_SECRET" in
  *REMPLACER*|*changeme*|*secret*)
    echo "ERREUR : BETTER_AUTH_SECRET est encore un placeholder. Generer avec : openssl rand -base64 32" >&2
    exit 1
    ;;
esac

if [ -z "$BETTER_AUTH_URL" ]; then
  echo "ERREUR : BETTER_AUTH_URL manquant (URL publique exacte, ex. https://app.domaine.ma)." >&2
  exit 1
fi

# Attendre MySQL (TCP) puis appliquer les migrations avec reessais.
# Apres un reboot VPS, InnoDB peut mettre 1–2 min a recuperer avant d'accepter
# les connexions malgre un healthcheck Docker deja « healthy ».
MIGRATE_MAX_ATTEMPTS="${MIGRATE_MAX_ATTEMPTS:-36}"
MIGRATE_RETRY_DELAY_SEC="${MIGRATE_RETRY_DELAY_SEC:-5}"

echo "Attente de MySQL (host extrait de DATABASE_URL)..."
node <<'NODE'
const net = require("net");
const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const port = Number(url.port || 3306);
const maxAttempts = Number(process.env.MIGRATE_MAX_ATTEMPTS || 36);
const delayMs = Number(process.env.MIGRATE_RETRY_DELAY_SEC || 5) * 1000;

function tryConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(3000);
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

(async () => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await tryConnect()) {
      console.log(`MySQL joignable (${host}:${port}).`);
      process.exit(0);
    }
    console.log(
      `MySQL indisponible, tentative ${attempt}/${maxAttempts} (nouvel essai dans ${delayMs / 1000}s)...`,
    );
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error("ERREUR : MySQL injoignable apres toutes les tentatives.");
  process.exit(1);
})();
NODE

echo "Application des migrations Prisma (avec reessais)..."
attempt=0
while [ "$attempt" -lt "$MIGRATE_MAX_ATTEMPTS" ]; do
  attempt=$((attempt + 1))
  if npx prisma migrate deploy; then
    echo "Migrations appliquees avec succes."
    break
  fi
  if [ "$attempt" -ge "$MIGRATE_MAX_ATTEMPTS" ]; then
    echo "ERREUR : prisma migrate deploy a echoue apres ${MIGRATE_MAX_ATTEMPTS} tentatives." >&2
    exit 1
  fi
  echo "Migration echouee, nouvelle tentative (${attempt}/${MIGRATE_MAX_ATTEMPTS}) dans ${MIGRATE_RETRY_DELAY_SEC}s..."
  sleep "$MIGRATE_RETRY_DELAY_SEC"
done

echo "Demarrage Next.js..."
exec npm run start
