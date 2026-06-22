# Mi Música — Servidor de descarga 🎧

Pequeño servidor que recibe un enlace de YouTube y devuelve el audio en MP3,
para usarlo desde la app **Mi Música**. Usa `yt-dlp` + `ffmpeg`.

> ⚠️ **Aviso legal:** descargar contenido con copyright de YouTube va contra sus
> Términos de Servicio y puede infringir derechos de autor. Úsalo solo con
> contenido propio, con licencia libre (Creative Commons) o sobre el que tengas
> derechos.

## Desplegar gratis en Render (recomendado)

1. Sube este proyecto a un repositorio de GitHub (la carpeta `mp3-player-server`
   debe estar dentro).
2. Entra en <https://render.com> y crea una cuenta (gratis).
3. **New + → Web Service** y conecta tu repositorio.
   - Si te pregunta, elige **Runtime: Docker**.
   - **Root Directory:** `mp3-player-server`
   - **Plan:** Free
   - (Render detecta el `Dockerfile` automáticamente; no hay que configurar build.)
4. Pulsa **Create Web Service** y espera a que termine de construir (unos minutos).
5. Te dará una URL del tipo `https://mi-musica-server.onrender.com`.
   **Esa es la dirección que pondrás en la app** (botón YouTube → ⚙️ Configurar
   servidor).

> 💡 Alternativa con un clic: el archivo `render.yaml` permite usar
> **New + → Blueprint**. Si lo usas, ajusta `dockerfilePath`/`dockerContext`
> según dónde quede la carpeta en tu repo.

### Nota sobre el plan gratuito de Render
El plan Free "se duerme" tras un rato sin uso. La **primera** descarga después de
un parón puede tardar ~30–50 s en despertar el servidor; las siguientes van
rápidas. Es normal.

## Probar en local

```bash
# Requiere yt-dlp y ffmpeg instalados en el sistema
cd mp3-player-server
node server.js            # arranca en http://localhost:3000
```

Comprobación rápida:

```bash
curl http://localhost:3000/health
```

## Variables de entorno (opcionales)

| Variable          | Por defecto | Para qué |
|-------------------|-------------|----------|
| `PORT`            | `3000`      | Puerto (Render lo asigna solo). |
| `ALLOWED_ORIGIN`  | `*`         | Limitar qué webs pueden usar el servidor (p. ej. tu URL de Netlify). |
| `MAX_FILESIZE`    | `100M`      | Tamaño máximo del audio. |

## Endpoints

- `GET /health` → estado del servicio.
- `POST /api/download` con `{"url": "https://www.youtube.com/watch?v=..."}`
  → responde el MP3 (cabeceras `X-Title` y `X-Artist` con los metadatos).
