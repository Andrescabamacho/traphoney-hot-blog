# OfflineTube — YouTube sin internet ✈️

Descarga vídeos de YouTube **cuando tienes internet** y míralos **sin conexión**
(avión, metro, sitios sin cobertura). Es una **PWA**: se instala como una app en
el móvil y guarda los vídeos dentro del propio dispositivo.

## ¿Por qué hace falta esto?

YouTube no deja "streamear" sin internet. El truco real es **descargar antes** y
**reproducir después** desde tu propio almacenamiento. Eso es justo lo que hace
esta app:

1. **Con internet** → pegas un enlace de YouTube → el servidor lo baja con
   `yt-dlp` y te lo manda al navegador.
2. El vídeo se guarda en **IndexedDB** (dentro de tu navegador/móvil).
3. **Sin internet** → abres la app (cargada gracias al Service Worker) y los
   vídeos se reproducen desde tu dispositivo. Cero datos.

El servidor **solo hace falta para descargar**. Una vez guardado, todo es offline.

## Cómo arrancarlo

Requisitos: Node 18+ y Python 3 (lo necesita yt-dlp).

```bash
cd offline-tube
npm install        # instala express
npm run setup      # baja el binario de yt-dlp a ./bin
npm start          # arranca en http://localhost:3000
```

Abre `http://localhost:3000`, pega enlaces de YouTube con internet, y luego
añade la página a tu pantalla de inicio ("Instalar app"). En el avión, ábrela
desde el icono: tu biblioteca estará ahí.

## Desplegar en Replit

1. Crea un Repl de tipo **Node.js** e importa esta carpeta `offline-tube`.
2. En el panel **Shell**: `npm install && npm run setup`.
3. Botón **Run** (usa `npm start`, ver `.replit`).
4. Abre la URL pública del Repl en el móvil → "Añadir a pantalla de inicio".

> Nota: para que los vídeos sobrevivan offline tienen que estar **descargados**
> en el dispositivo desde el que vas a verlos (se guardan en ese navegador).

## Calidad / tamaño

Por defecto baja **mp4 progresivo hasta 720p** (un único archivo, sin necesidad
de ffmpeg). Puedes elegir 360/480/720/1080p en el desplegable. A menor calidad,
más vídeos te caben en el móvil.

## Aviso legal

Descarga solo contenido sobre el que tengas derechos o que la licencia permita.
Respeta los Términos de Servicio de YouTube y el copyright de cada vídeo.
