# ACM — Simulador de conversaciones

App para crear conversaciones con estilo DM de Instagram y descargarlas
como imagen PNG con **fondo transparente**.

## Qué hay aquí

- **`index.html`** — La aplicación completa en **un solo archivo**. Lleva la
  foto de perfil y el logo de la firma ya incrustados; no necesita nada más.

## Cómo usarla

**Opción rápida (abrir):** doble clic en `index.html` y se abre en el navegador.

**Como app en el móvil (recomendado):**

1. Súbela a un hosting gratis (Netlify, GitHub Pages…). En Netlify basta con
   arrastrar este archivo (o la carpeta `docs/` del repo, que es la versión PWA
   con icono).
2. Abre la URL en el móvil → **Añadir a pantalla de inicio**.

## Cómo funciona

1. Elige quién habla: **Izquierda** (con foto) o **Derecha** (tú).
2. Escribe el mensaje y pulsa **Publicar**.
3. Reordena (↑ ↓) o elimina (✕) mensajes en la lista de abajo.
4. **Descargar imagen** → PNG transparente, solo la conversación y la foto.

## Versiones del proyecto

- **`/ACM/index.html`** — este archivo único, todo embebido.
- **`/docs/`** — versión PWA instalable (icono, manifest, offline) para
  GitHub Pages / Netlify.
- **`/app/simulador`** + **`/components/ConversationSimulator.tsx`** — la misma
  app integrada en el blog Next.js.
- **`/scripts/simulador-template.html`** — plantilla base de la que se generan
  las versiones anteriores.
