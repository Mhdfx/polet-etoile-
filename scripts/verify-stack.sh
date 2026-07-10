#!/bin/bash
# Verifie que la stack est saine apres demarrage ou reboot VPS.
# Usage :
#   ./scripts/verify-stack.sh
#   WORK_DIR=/opt/apps/poulet-etoile COMPOSE_FILE=docker-compose.ip.yml ./scripts/verify-stack.sh

set -euo pipefail

WORK_DIR="${WORK_DIR:-/opt/apps/poulet-etoile}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ip.yml}"
BASE_URL="${BASE_URL:-http://127.0.0.1}"
MAX_WAIT_SEC="${MAX_WAIT_SEC:-300}"
INTERVAL_SEC="${INTERVAL_SEC:-10}"

cd "$WORK_DIR"

echo "=== Docker daemon ==="
if ! systemctl is-active --quiet docker; then
  echo "ECHEC : service docker inactif" >&2
  exit 1
fi
echo "OK : docker actif"

echo ""
echo "=== Conteneurs (${COMPOSE_FILE}) ==="
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "=== Sante conteneurs ==="
unhealthy="$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | grep -c unhealthy || true)"
if [ "${unhealthy:-0}" -gt 0 ]; then
  echo "ATTENTION : conteneur(s) unhealthy detecte(s)" >&2
fi

echo ""
echo "=== HTTP ${BASE_URL}/connexion (max ${MAX_WAIT_SEC}s) ==="
elapsed=0
while [ "$elapsed" -lt "$MAX_WAIT_SEC" ]; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/connexion" || echo "000")"
  if echo "$code" | grep -qE '^(200|307|308)$'; then
    echo "OK : page connexion accessible (HTTP ${code})"
    exit 0
  fi
  echo "En attente... (${elapsed}s / ${MAX_WAIT_SEC}s)"
  sleep "$INTERVAL_SEC"
  elapsed=$((elapsed + INTERVAL_SEC))
done

echo "ECHEC : site inaccessible apres ${MAX_WAIT_SEC}s" >&2
echo "Logs app :" >&2
docker compose -f "$COMPOSE_FILE" logs --tail=80 app >&2 || true
exit 1
