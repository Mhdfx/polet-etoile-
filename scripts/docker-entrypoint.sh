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

echo "Application des migrations Prisma..."
npx prisma migrate deploy

echo "Demarrage Next.js..."
exec npm run start
