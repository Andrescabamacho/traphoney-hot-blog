# Profit Lab — Deploy Guide

Herramienta personal de estrategia de contenido viral para Instagram.  
Stack: React + Vite (frontend) · Express (backend) · PM2 · Nginx · Let's Encrypt.

---

## Estructura

```
profitlab/
├── backend/          Express API proxy (port 3001)
│   ├── index.js
│   ├── package.json
│   └── .env.example
├── frontend/         React + Vite SPA
│   ├── src/App.jsx
│   ├── vite.config.js
│   └── index.html
├── nginx.conf        Nginx site config
├── deploy.sh         Update deploy (run after every push)
├── setup-vps.sh      One-time VPS bootstrap
└── INSTAGRAM_SETUP.md
```

---

## Primera vez en el VPS

### 1. Conectar por SSH

```bash
ssh root@<IP-del-VPS>
```

### 2. Clonar el repo y ejecutar el setup

```bash
git clone https://github.com/andrescabamacho/traphoney-hot-blog.git /opt/profitlab-repo
bash /opt/profitlab-repo/profitlab/setup-vps.sh
```

### 3. Poner las claves en el .env

```bash
nano /var/www/profitlab/backend/.env
```

Rellena al menos:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
NODE_ENV=production
FRONTEND_ORIGIN=https://app.andrescabamacho.com
```

Reinicia el proceso:

```bash
pm2 restart profitlab
```

### 4. SSL con Let's Encrypt

```bash
sudo certbot --nginx -d app.andrescabamacho.com
```

### 5. Autostart al reiniciar el servidor

```bash
pm2 startup          # copia y ejecuta el comando que imprime
pm2 save
```

### 6. DNS en Hostinger

En el panel de Hostinger, crea un registro A:

| Tipo | Nombre | Valor        |
|------|--------|-------------|
| A    | app    | <IP-del-VPS> |

---

## Actualizar la app (deploys futuros)

Después de hacer push a GitHub:

```bash
ssh root@<IP-del-VPS>
cd /opt/profitlab-repo && git pull
bash profitlab/deploy.sh
```

El script:
1. Copia el backend y hace `npm install`
2. Hace `npm run build` del frontend
3. Copia el dist a `/var/www/profitlab/frontend/dist`
4. Recarga Nginx
5. Reinicia PM2

---

## Comandos útiles en el VPS

```bash
pm2 logs profitlab        # ver logs en tiempo real
pm2 status                # estado del proceso
pm2 restart profitlab     # reiniciar backend
nginx -t                  # validar config de nginx
systemctl reload nginx    # recargar nginx sin downtime
curl localhost:3001/api/health   # health check directo
```

---

## Variables de entorno

| Variable               | Descripción                              | Requerida |
|------------------------|------------------------------------------|-----------|
| `ANTHROPIC_API_KEY`    | API key de Anthropic                     | Sí        |
| `INSTAGRAM_ACCESS_TOKEN` | Token de acceso Instagram              | No*       |
| `INSTAGRAM_USER_ID`    | ID de usuario de Instagram               | No*       |
| `PORT`                 | Puerto del backend (default: 3001)       | No        |
| `NODE_ENV`             | `production` en el VPS                   | No        |
| `FRONTEND_ORIGIN`      | Origen permitido para CORS               | No        |

*Necesario para que `/api/instagram/reels` funcione. Ver `INSTAGRAM_SETUP.md`.
