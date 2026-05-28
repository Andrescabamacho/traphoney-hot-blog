# Instagram API — Obtener Access Token

Guía paso a paso para conseguir el token de larga duración para `/api/instagram/reels`.

---

## Requisitos previos

- Cuenta de Instagram convertida a **cuenta profesional** (Creator o Business).
- Cuenta de **Facebook** vinculada a esa cuenta de Instagram.
- Acceso a [developers.facebook.com](https://developers.facebook.com).

---

## Paso 1 — Crear una Facebook Developer App

1. Ve a [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Haz clic en **Crear app**.
3. Tipo de app: elige **Business** (o "Empresa").
4. Ponle un nombre (p. ej. "Profit Lab Stats") y pulsa **Crear app**.

---

## Paso 2 — Añadir el producto Instagram Graph API

1. Dentro de tu app, en el panel lateral ve a **Agregar productos**.
2. Busca **Instagram Graph API** y haz clic en **Configurar**.
3. Esto añade el producto a tu app.

---

## Paso 3 — Conectar tu cuenta de Instagram Business

1. Ve a **Instagram Graph API → Configuración básica**.
2. En la sección **Cuentas de Instagram**, haz clic en **Agregar cuenta de Instagram**.
3. Inicia sesión con tu cuenta de Instagram y acepta los permisos.
4. Anota el **Instagram User ID** que aparece — lo necesitas para el `.env`.

---

## Paso 4 — Generar el token de corta duración

1. Ve a **Herramientas** → **Explorador de la API Graph** (o usa [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)).
2. En la esquina superior derecha, selecciona tu app.
3. Haz clic en **Generar token de acceso**.
4. Marca los permisos:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
5. Pulsa **Generar token**. Tendrás un token de **60 minutos**.

---

## Paso 5 — Convertir a token de larga duración (60 días)

Ejecuta este comando en tu terminal (reemplaza los valores):

```bash
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=TU_APP_ID
  &client_secret=TU_APP_SECRET
  &fb_exchange_token=TOKEN_CORTA_DURACION"
```

- `TU_APP_ID` → en Configuración básica de tu app de Facebook.
- `TU_APP_SECRET` → en Configuración básica (haz clic en "Mostrar").
- `TOKEN_CORTA_DURACION` → el token del paso anterior.

La respuesta incluye `access_token` — ese es tu **token de 60 días**.

---

## Paso 6 — Renovar el token (antes de que expire)

Los tokens de larga duración duran 60 días. Para renovarlos antes de que expiren:

```bash
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=TU_APP_ID
  &client_secret=TU_APP_SECRET
  &fb_exchange_token=TOKEN_LARGA_DURACION_ACTUAL"
```

Puedes crear un cron job mensual en el VPS para automatizarlo.

---

## Paso 7 — Añadir el token al .env del servidor

```bash
ssh root@<IP-del-VPS>
nano /var/www/profitlab/backend/.env
```

Rellena:

```
INSTAGRAM_ACCESS_TOKEN=EAABs...  ← token de 60 días
INSTAGRAM_USER_ID=17841400...    ← tu Instagram User ID
```

Reinicia el backend:

```bash
pm2 restart profitlab
```

---

## Verificar que funciona

```bash
curl https://app.andrescabamacho.com/api/instagram/reels
```

Deberías ver un JSON con tus últimos reels y sus métricas.

---

## Notas

- La API de **Instagram Insights** solo devuelve métricas de cuentas **Business o Creator**.
- El campo `video_views` solo está disponible para reels y vídeos, no para fotos.
- Si la cuenta tiene menos de 100 seguidores, algunas métricas de insights pueden no estar disponibles.
