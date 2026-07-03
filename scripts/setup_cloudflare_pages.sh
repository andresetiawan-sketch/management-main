#!/usr/bin/env bash
set -euo pipefail

# Minimal automated helper to build frontend and publish to Cloudflare Pages using wrangler if available.
# Requires environment variables when running non-interactively:
# - CF_API_TOKEN (Cloudflare API token with Pages permissions)
# - CF_ACCOUNT_ID
# - CF_PAGES_PROJECT_NAME

echo "Starting Cloudflare Pages setup helper..."

if [ -z "${CF_PAGES_PROJECT_NAME:-}" ] || [ -z "${CF_ACCOUNT_ID:-}" ]; then
  echo "Required env vars not set. Please export CF_PAGES_PROJECT_NAME and CF_ACCOUNT_ID (and CF_API_TOKEN)."
  echo "Example: export CF_PAGES_PROJECT_NAME=my-pages-project"
  exit 1
fi

# Build frontend
if [ -d frontend ]; then
  echo "Building frontend..."
  (cd frontend && if [ -f package.json ]; then npm ci && npm run build --if-present; else echo 'No frontend package.json'; fi)
else
  echo "No frontend directory found; ensure build output is in ./frontend/dist"
fi

# If wrangler is installed, try to deploy via wrangler pages publish
if command -v wrangler >/dev/null 2>&1; then
  echo "wrangler found — attempting deploy using wrangler pages publish"
  DIST_DIR="frontend/dist"
  if [ ! -d "$DIST_DIR" ]; then
    echo "Build output not found at $DIST_DIR"
    exit 1
  fi
  if [ -z "${CF_API_TOKEN:-}" ]; then
    echo "CF_API_TOKEN not set. Set it to allow wrangler to authenticate."
    exit 1
  fi
  export CLOUDFLARE_API_TOKEN="${CF_API_TOKEN}"
  echo "Publishing to Pages project: $CF_PAGES_PROJECT_NAME"
  wrangler pages deploy "$DIST_DIR" --project-name "$CF_PAGES_PROJECT_NAME" --branch main
  echo "Pages deploy finished."
else
  echo "wrangler not found. To publish automatically, install wrangler: https://developers.cloudflare.com/workers/cli-wrangler/install"
  echo "Alternatively, CI workflow will deploy on push to main if you set the GitHub secrets: CF_API_TOKEN, CF_ACCOUNT_ID, CF_PAGES_PROJECT_NAME"
  echo "Local quick command (after build):"
  echo "  wrangler pages deploy frontend/dist --project-name \$CF_PAGES_PROJECT_NAME --branch main"
fi
