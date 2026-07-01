#!/usr/bin/env bash
set -euo pipefail

FRONTEND_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_APP_PATH="${PUBLIC_APP_PATH:-$(cd "$FRONTEND_PATH/../idenna/public/app" && pwd)}"

log() { printf "[deploy-idenna] %s\n" "$1"; }

log "Compilando frontend (npm run build:laravel)..."
(
  cd "$FRONTEND_PATH"
  npm run build:laravel
)

DIST_PATH="$FRONTEND_PATH/dist"
if [[ ! -f "$DIST_PATH/index.html" ]]; then
  echo "Error: no se generó dist/index.html" >&2
  exit 1
fi

log "Copiando a $PUBLIC_APP_PATH ..."
rm -rf "$PUBLIC_APP_PATH"
mkdir -p "$PUBLIC_APP_PATH"
cp -R "$DIST_PATH"/* "$PUBLIC_APP_PATH"/

log "Listo. Abre: ${APP_PREVIEW_URL:-http://idenna.test/app} (ajusta APP_PREVIEW_URL si aplica)"
