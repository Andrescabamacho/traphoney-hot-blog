#!/usr/bin/env bash
# setup-vps.sh — One-time VPS bootstrap (run once on a fresh Hostinger VPS)
# Installs Node 20, PM2, Nginx, Certbot, then deploys the app.
set -e

DOMAIN="app.andrescabamacho.com"

echo "==> Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing PM2 globally..."
sudo npm install -g pm2

echo "==> Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo "==> Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

echo "==> Cloning / pulling repository..."
if [ -d "/opt/profitlab-repo" ]; then
  cd /opt/profitlab-repo && git pull
else
  git clone https://github.com/andrescabamacho/traphoney-hot-blog.git /opt/profitlab-repo
fi

echo "==> Running deploy script..."
bash /opt/profitlab-repo/profitlab/deploy.sh

echo ""
echo "==> VPS setup complete!"
echo ""
echo "NEXT STEPS:"
echo "  1. Edit /var/www/profitlab/backend/.env — add your ANTHROPIC_API_KEY"
echo "  2. Run: sudo certbot --nginx -d $DOMAIN"
echo "  3. Run: pm2 startup  (follow the printed command to enable autostart)"
echo "  4. Run: pm2 save"
echo "  5. Visit https://$DOMAIN"
