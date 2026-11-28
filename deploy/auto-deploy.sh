#!/usr/bin/env bash
set -euo pipefail

DIR=/opt/futgrid
BRANCH_FILE=/etc/futgrid/deploy-branch
STATE_FILE=/var/lib/futgrid/deployed-revision
DEPLOY_SCRIPT=/usr/local/lib/futgrid-deploy/deploy.sh

if [ ! -r "$BRANCH_FILE" ] || [ ! -r "$STATE_FILE" ]; then
  echo "Deployment branch or deployed revision is not configured." >&2
  exit 1
fi

branch=$(cat "$BRANCH_FILE")
if [ "$branch" != main ]; then
  echo "Automatic production deployments must follow the main branch." >&2
  exit 1
fi
git -C "$DIR" check-ref-format --branch "$branch" >/dev/null
git -C "$DIR" fetch --quiet origin "$branch"
target=$(git -C "$DIR" rev-parse --verify 'FETCH_HEAD^{commit}')
current=$(cat "$STATE_FILE")

if [ "$target" = "$current" ]; then
  exit 0
fi

if ! git -C "$DIR" merge-base --is-ancestor "$current" "$target"; then
  echo "Automatic deployment skipped: origin/$branch has diverged from the deployed revision."
  exit 1
fi

echo "Deploying origin/$branch commit $target"
exec /bin/bash "$DEPLOY_SCRIPT" "$target"
