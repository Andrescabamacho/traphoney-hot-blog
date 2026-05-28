#!/usr/bin/env bash
# deploy.sh — Run this on the VPS to deploy / update Profit Lab
# Usage: bash deploy.sh
set -e

APP_DIR="/var/www/profitlab"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Deploying Profit Lab to $APP_DIR"

# ── 1. Create target directory ──────────────────────────────────
sudo mkdir -p "$APP_DIR/backend"
sudo mkdir -p "$APP_DIR/frontend/dist"

# ── 2. Deploy backend ───────────────────────────────────────────
echo "==> Installing backend dependencies..."
sudo cp -r "$REPO_DIR/backend/." "$APP_DIR/backend/"
cd "$APP_DIR/backend"
sudo npm install --omit=dev

# Create .env if it doesn't exist yet
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "==> Creating .env from example — fill in your keys!"
  sudo cp "$REPO_DIR/backend/.env.example" "$APP_DIR/backend/.env"
fi

# ── 3. Build frontend ───────────────────────────────────────────
echo "==> Building frontend..."
cd "$REPO_DIR/frontend"
npm install
npm run build

echo "==> Copying frontend dist..."
sudo cp -r "$REPO_DIR/frontend/dist/." "$APP_DIR/frontend/dist/"

# ── 4. Nginx config ─────────────────────────────────────────────
echo "==> Installing Nginx config..."
sudo cp "$REPO_DIR/nginx.conf" /etc/nginx/sites-available/profitlab
sudo ln -sf /etc/nginx/sites-available/profitlab /etc/nginx/sites-enabled/profitlab
sudo nginx -t && sudo systemctl reload nginx

# ── 5. PM2 (re)start ────────────────────────────────────────────
echo "==> Starting / restarting PM2 process..."
cd "$APP_DIR/backend"
if pm2 list | grep -q "profitlab"; then
  pm2 restart profitlab
else
  pm2 start index.js --name profitlab --env production
fi
pm2 save

echo ""
echo "==> Deploy complete!"
echo "    App: https://app.andrescabamacho.com"
echo "    Health: https://app.andrescabamacho.com/api/health"
echo ""
echo "    If this is the first deploy, run SSL setup next:"
echo "    sudo certbot --nginx -d app.andrescabamacho.com"
