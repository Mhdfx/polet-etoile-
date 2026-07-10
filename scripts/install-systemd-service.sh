#!/bin/bash
# Installe le service systemd qui relance la stack au boot du VPS.
# Usage (sur le VPS, en root) :
#   sudo ./scripts/install-systemd-service.sh
#   sudo ./scripts/install-systemd-service.sh /opt/apps/poulet-etoile docker-compose.ip.yml

set -euo pipefail

WORK_DIR="${1:-/opt/apps/poulet-etoile}"
COMPOSE_FILE="${2:-docker-compose.ip.yml}"
SERVICE_NAME="poulet-etoile"
TEMPLATE="${WORK_DIR}/deploy/poulet-etoile.service.template"
TARGET="/etc/systemd/system/${SERVICE_NAME}.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "Executer en root : sudo $0 [WORK_DIR] [COMPOSE_FILE]" >&2
  exit 1
fi

if [ ! -f "$TEMPLATE" ]; then
  echo "Template introuvable : $TEMPLATE" >&2
  exit 1
fi

if [ ! -f "${WORK_DIR}/${COMPOSE_FILE}" ]; then
  echo "Compose introuvable : ${WORK_DIR}/${COMPOSE_FILE}" >&2
  exit 1
fi

echo "Activation de Docker au demarrage..."
systemctl enable docker.service

sed \
  -e "s|@WORK_DIR@|${WORK_DIR}|g" \
  -e "s|@COMPOSE_FILE@|${COMPOSE_FILE}|g" \
  "$TEMPLATE" > "$TARGET"

chmod 644 "$TARGET"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl restart "${SERVICE_NAME}.service"

echo ""
echo "Service installe : ${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}.service" --no-pager || true
echo ""
echo "Verifier apres reboot : sudo ${WORK_DIR}/scripts/verify-stack.sh"
