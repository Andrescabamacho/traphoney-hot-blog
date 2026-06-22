# Mi Música 🎵

Reproductor MP3 **offline** en forma de PWA (app web instalable). Tu música se
guarda dentro del móvil, suena **sin internet** y **con la pantalla apagada**
(bloqueada con un toque al botón de encendido).

## Qué hace

- Añades tus archivos (`mp3`, `m4a`, `aac`, `ogg`, `wav`, `flac`, `opus`).
- Se guardan en el móvil con **IndexedDB** → no necesitas internet nunca más.
- Suena con la **pantalla bloqueada** gracias a la **Media Session API**, y verás
  los controles (play/pausa/siguiente/anterior) en tu pantalla de bloqueo.
- Estética minimalista, oscura y súper sencilla: lista de canciones + reproductor.

## Cómo subirla a internet (elige una)

Es una carpeta de archivos estáticos, no necesita servidor ni backend.

> ⚠️ Para que funcione lo de la pantalla apagada y la instalación, **debe servirse
> por HTTPS** (todos los de abajo lo dan gratis). Abrirla con doble clic
> (`file://`) NO sirve.

### Opción A — Netlify Drop (lo más fácil, 30 segundos)
1. Entra en <https://app.netlify.com/drop>.
2. Arrastra la carpeta `mp3-player` entera.
3. Te da una URL `https://...netlify.app`. Listo.

### Opción B — GitHub Pages
1. Sube esta carpeta a un repositorio.
2. Settings → Pages → Branch: `main`, carpeta `/mp3-player` (o muévela a la raíz).
3. Abre la URL `https://tu-usuario.github.io/...`.

### Opción C — Vercel / Cloudflare Pages
Subir la carpeta como proyecto estático. Sin configuración de build.

## Cómo instalarla en el móvil (importante para que suene bloqueado)

### Android (Chrome)
1. Abre la URL.
2. Menú ⋮ → **Añadir a pantalla de inicio** / **Instalar app**.
3. Ábrela desde el icono. Añade tu música con **+**.

### iPhone (Safari)
1. Abre la URL **en Safari**.
2. Botón compartir → **Añadir a pantalla de inicio**.
3. Ábrela desde el icono (no desde Safari). Añade tu música con **+**.

Una vez instalada y con la música añadida: pon una canción, bloquea el móvil con
el botón de encendido → sigue sonando y controlas desde la pantalla de bloqueo. ✅

## Notas técnicas

- **Sin internet:** un Service Worker (`sw.js`) cachea la app; la música vive en
  IndexedDB. Tras la primera carga, funciona en modo avión.
- **Pantalla apagada:** se usa `<audio>` + `navigator.mediaSession`. En iOS
  requiere Safari 16.4+ y tenerla instalada en pantalla de inicio para máxima
  fiabilidad.
- **Privado:** todo es local en tu dispositivo. Nada se sube a ningún servidor.

## Desarrollo local

```bash
# Servir por HTTP local (el SW y la PWA necesitan http/https, no file://)
cd mp3-player
python3 -m http.server 8080
# abre http://localhost:8080
```

Regenerar los iconos: `node scripts/gen-icons.js`
