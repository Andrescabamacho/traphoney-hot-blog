# Deploy en Netlify — Guía paso a paso

La app se despliega como sitio estático (React) + funciones serverless (Node.js).  
No necesitas VPS ni servidor. Todo funciona en el plan gratuito de Netlify.

---

## Paso 1 — Conectar el repositorio

1. Entra en [app.netlify.com](https://app.netlify.com) y haz clic en **Add new project**.
2. Elige **Import an existing project** → **GitHub**.
3. Selecciona el repo `andrescabamacho/traphoney-hot-blog`.

---

## Paso 2 — Configurar el build

En la pantalla de configuración del sitio, rellena:

| Campo | Valor |
|-------|-------|
| **Base directory** | `profitlab` |
| **Build command** | `cd frontend && npm install && npm run build` |
| **Publish directory** | `frontend/dist` |

> Netlify leerá el `netlify.toml` automáticamente y configurará las funciones.

---

## Paso 3 — Añadir las variables de entorno

Antes de hacer el primer deploy, ve a **Site configuration → Environment variables** y añade:

| Variable | Valor |
|----------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (tu clave de Anthropic) |
| `INSTAGRAM_ACCESS_TOKEN` | (déjalo vacío por ahora, ver `INSTAGRAM_SETUP.md`) |

---

## Paso 4 — Deploy

Pulsa **Deploy site**. Netlify hará:
1. `npm install && npm run build` dentro de `profitlab/frontend`
2. Desplegará el `dist/` como sitio estático
3. Desplegará las 5 funciones serverless en `netlify/functions/`

El proceso tarda ~1-2 minutos. Al terminar tendrás una URL del tipo:  
`https://willowy-heliotrope-XXXXX.netlify.app`

---

## Paso 5 — Dominio personalizado (opcional)

Para usar `app.andrescabamacho.com`:

1. Ve a **Domain management → Add a domain**.
2. Escribe `app.andrescabamacho.com`.
3. En Hostinger (panel DNS), crea un registro CNAME:

   | Tipo  | Nombre | Valor                        |
   |-------|--------|------------------------------|
   | CNAME | app    | `tu-sitio.netlify.app`       |

4. Netlify provisionará el SSL automáticamente en ~1 minuto.

---

## Cómo actualizar la app

Cualquier push a la rama `main` del repo despliega automáticamente.  
No necesitas hacer nada más.

Si quieres desplegar manualmente desde Netlify:  
**Deploys → Trigger deploy → Deploy site**

---

## Verificar que funciona

Una vez desplegado, prueba en el navegador o con curl:

```bash
# Health check
curl https://tu-sitio.netlify.app/api/health

# Debería devolver:
# {"status":"ok","timestamp":1234567890}
```

Si el health check responde, las funciones serverless están funcionando y las llamadas a Claude también funcionarán.

---

## Estructura del proyecto en Netlify

```
profitlab/
├── netlify.toml                    ← configuración de build y redirects
├── netlify/functions/
│   ├── generate.mjs                → POST /api/generate
│   ├── chat.mjs                    → POST /api/chat
│   ├── ideas.mjs                   → POST /api/ideas
│   ├── reels.mjs                   → GET  /api/instagram/reels
│   └── health.mjs                  → GET  /api/health
└── frontend/dist/                  ← React build (generado en el deploy)
```
