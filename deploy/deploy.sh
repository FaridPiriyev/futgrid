#!/usr/bin/env bash
set -euo pipefail

DIR=/opt/futgrid
COMPOSE_FILE="$DIR/deploy/docker-compose.prod.yml"
ENV_FILE="$DIR/deploy/.env"
BRANCH_FILE=/etc/futgrid/deploy-branch
STATE_FILE=/var/lib/futgrid/deployed-revision
LOCK_FILE=/run/lock/futgrid-deploy.lock

if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: $0 <40-character commit SHA>" >&2
  exit 2
fi

revision=$1
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another FutGrid deployment is already running." >&2
  exit 1
fi

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
if ! git -C "$DIR" merge-base --is-ancestor "$revision" FETCH_HEAD; then
  echo "Commit $revision is not on the current origin/$branch branch." >&2
  exit 1
fi

previous=$(cat "$STATE_FILE")
if [ "$previous" = "$revision" ]; then
  echo "Commit $revision is already deployed."
  exit 0
fi

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

api_container=$(compose ps -q api)
if [ -z "$api_container" ]; then
  echo "Cannot record deployment status: the API container is not running." >&2
  exit 1
fi

storage_dir=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/storage"}}{{.Source}}{{end}}{{end}}' "$api_container")
if [ -z "$storage_dir" ] || [ ! -d "$storage_dir" ]; then
  echo "Cannot locate the persistent API storage volume for deployment history." >&2
  exit 1
fi

HISTORY_FILE="$storage_dir/deployments.jsonl"
touch "$HISTORY_FILE"
chmod 644 "$HISTORY_FILE"
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DEPLOYMENT_ID="${revision}-$(date +%s)"

record_status() {
  local status=$1
  local error_message=${2:-}
  local rollback_status=${3:-}
  local updated_at
  local finished_at=null
  local error_json=null
  local rollback_json=null

  updated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if [ "$status" = "succeeded" ] || [ "$status" = "failed" ]; then
    finished_at="\"$updated_at\""
  fi
  if [ -n "$error_message" ]; then
    error_json="\"$error_message\""
  fi
  if [ -n "$rollback_status" ]; then
    rollback_json="\"$rollback_status\""
  fi

  printf '{"id":"%s","commit":"%s","branch":"main","status":"%s","startedAt":"%s","updatedAt":"%s","finishedAt":%s,"error":%s,"rollbackStatus":%s}\n' \
    "$DEPLOYMENT_ID" "$revision" "$status" "$STARTED_AT" "$updated_at" \
    "$finished_at" "$error_json" "$rollback_json" >> "$HISTORY_FILE"
}

build_revision() {
  local commit=$1
  local build_dir="/opt/futgrid-build-$commit"
  local override_file

  if [ -e "$build_dir" ]; then
    echo "Build directory already exists: $build_dir" >&2
    return 1
  fi

  override_file=$(mktemp /run/futgrid-compose.XXXXXX.yml)
  cat > "$override_file" <<EOF
services:
  api:
    build:
      context: $build_dir
  web:
    build:
      context: $build_dir
EOF

  if ! git -C "$DIR" worktree add --detach "$build_dir" "$commit"; then
    rm -f "$override_file"
    return 1
  fi

  if compose -f "$override_file" build api web; then
    git -C "$DIR" worktree remove --force "$build_dir"
    rm -f "$override_file"
    return 0
  fi

  git -C "$DIR" worktree remove --force "$build_dir" || true
  rm -f "$override_file"
  return 1
}

check_health() {
  compose exec -T api node -e \
    'fetch("http://127.0.0.1:3000/health").then(async r => { if (!r.ok) process.exit(1); await r.arrayBuffer(); }).catch(() => process.exit(1))' &&
    compose exec -T web nginx -t &&
    compose exec -T web wget -q -O /dev/null http://127.0.0.1/
}

rollback() {
  local reason=$1
  local rollback_status=failed

  echo "Deployment failed; restoring previous application revision $previous." >&2
  if build_revision "$previous" && compose up -d --no-build --remove-orphans && check_health; then
    echo "Previous revision restored successfully." >&2
    rollback_status=succeeded
  else
    echo "Rollback did not pass health checks; inspect the FutGrid containers immediately." >&2
    compose ps >&2 || true
    compose logs --tail=100 api web >&2 || true
  fi
  record_status failed "$reason" "$rollback_status"
  exit 1
}

record_status building
if ! compose config --quiet || ! build_revision "$revision"; then
  rollback "Image build or Compose validation failed. See deployment logs."
fi

record_status deploying
if ! compose up -d --no-build --remove-orphans; then
  rollback "Compose could not update the application services. See deployment logs."
fi

record_status health_check
healthy=0
for attempt in $(seq 1 36); do
  if check_health >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 5
done

if [ "$healthy" -ne 1 ]; then
  echo "New revision did not pass API and web health checks." >&2
  compose ps >&2 || true
  compose logs --tail=100 api web >&2 || true
  rollback "Post-deployment health checks failed. See deployment logs."
fi

state_tmp="${STATE_FILE}.tmp.$$"
printf '%s\n' "$revision" > "$state_tmp"
mv -f "$state_tmp" "$STATE_FILE"
record_status succeeded
echo "Deployment completed successfully: $revision"
