#!/usr/bin/env bash
set -euo pipefail

DIR=/opt/futgrid
BRANCH_FILE=/etc/futgrid/deploy-branch
STATE_DIR=/var/lib/futgrid
INSTALL_DIR=/usr/local/lib/futgrid-deploy
SOURCE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root." >&2
  exit 1
fi

if [ ! -d "$DIR/.git" ]; then
  echo "FutGrid Git checkout was not found at $DIR." >&2
  exit 1
fi

DEPLOY_BRANCH=main
git -C "$DIR" check-ref-format --branch "$DEPLOY_BRANCH" >/dev/null
git -C "$DIR" fetch --quiet origin "$DEPLOY_BRANCH"
initial_revision=$(git -C "$DIR" rev-parse --verify 'FETCH_HEAD^{commit}')

install -d -o root -g root -m 755 /etc/futgrid "$STATE_DIR" "$INSTALL_DIR"
printf '%s\n' "$DEPLOY_BRANCH" > "$BRANCH_FILE"
chmod 644 "$BRANCH_FILE"
if [ ! -s "$STATE_DIR/deployed-revision" ]; then
  printf '%s\n' "$initial_revision" > "$STATE_DIR/deployed-revision"
fi
chmod 644 "$STATE_DIR/deployed-revision"

install -o root -g root -m 750 "$SOURCE_DIR/auto-deploy.sh" "$INSTALL_DIR/auto-deploy.sh"
install -o root -g root -m 750 "$SOURCE_DIR/deploy.sh" "$INSTALL_DIR/deploy.sh"
install -o root -g root -m 750 "$SOURCE_DIR/install-auto-deploy.sh" "$INSTALL_DIR/install-auto-deploy.sh"
install -o root -g root -m 644 "$SOURCE_DIR/futgrid-auto-deploy.service" \
  /etc/systemd/system/futgrid-auto-deploy.service
install -o root -g root -m 644 "$SOURCE_DIR/futgrid-auto-deploy.timer" \
  /etc/systemd/system/futgrid-auto-deploy.timer

systemctl daemon-reload
systemctl enable --now futgrid-auto-deploy.timer
systemctl status --no-pager futgrid-auto-deploy.timer
