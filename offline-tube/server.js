// OfflineTube — backend mínimo.
//
// Idea: YouTube no se puede "streamear" sin internet. Así que cuando SÍ tienes
// internet, este servidor usa yt-dlp para bajar el vídeo como un mp4 único
// (progresivo, sin necesidad de ffmpeg) y lo manda al navegador, que lo guarda
// en IndexedDB. Luego, en el avión / sin cobertura, el vídeo se reproduce
// directamente desde tu dispositivo. El servidor solo hace falta para DESCARGAR.

import express from 'express'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

// Resolvemos el binario de yt-dlp: variable de entorno > copia local (setup.js) > PATH.
const LOCAL_YTDLP = join(__dirname, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
const YTDLP = process.env.YTDLP_PATH || (existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : 'yt-dlp')

const app = express()
app.use(express.static(join(__dirname, 'public')))

// Valida que sea una URL de YouTube para no convertir esto en un proxy abierto.
function parseYouTubeId(raw) {
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1) || null
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/)
      if (m) return m[2]
    }
  } catch {
    /* no es URL válida */
  }
  return null
}

function runYtDlp(args) {
  return spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] })
}

// Metadatos: título, miniatura, duración, canal. Para pintar la tarjeta antes de bajar.
app.get('/api/info', async (req, res) => {
  const id = parseYouTubeId(req.query.url || '')
  if (!id) return res.status(400).json({ error: 'URL de YouTube no válida' })

  const child = runYtDlp(['-J', '--no-warnings', `https://www.youtube.com/watch?v=${id}`])
  let out = ''
  let err = ''
  child.stdout.on('data', (d) => (out += d))
  child.stderr.on('data', (d) => (err += d))
  child.on('error', (e) =>
    res.status(500).json({ error: `No se pudo ejecutar yt-dlp: ${e.message}. Ejecuta "npm run setup".` })
  )
  child.on('close', (code) => {
    if (code !== 0) return res.status(502).json({ error: err.trim() || 'yt-dlp falló al obtener info' })
    try {
      const j = JSON.parse(out)
      res.json({
        id: j.id,
        title: j.title,
        channel: j.uploader || j.channel || '',
        duration: j.duration || 0,
        thumbnail: j.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      })
    } catch {
      res.status(500).json({ error: 'No se pudo parsear la info del vídeo' })
    }
  })
})

// Descarga: yt-dlp baja un mp4 progresivo a stdout y lo pipeamos al navegador.
// Elegimos un formato de archivo único (audio+vídeo) para NO depender de ffmpeg.
app.get('/api/download', (req, res) => {
  const id = parseYouTubeId(req.query.url || '')
  if (!id) return res.status(400).json({ error: 'URL de YouTube no válida' })

  // 720p máx por defecto: equilibrio tamaño/calidad para guardar varios en el móvil.
  const max = String(req.query.max || '720').replace(/[^0-9]/g, '') || '720'
  const format =
    `best[ext=mp4][height<=${max}][acodec!=none][vcodec!=none]/` +
    `best[height<=${max}][acodec!=none][vcodec!=none]/best`

  res.setHeader('Content-Type', 'video/mp4')
  res.setHeader('Cache-Control', 'no-store')

  const child = runYtDlp([
    '-f', format,
    '--no-playlist',
    '--no-warnings',
    '-o', '-', // a stdout
    `https://www.youtube.com/watch?v=${id}`,
  ])

  let err = ''
  child.stderr.on('data', (d) => (err += d))
  child.stdout.pipe(res)
  child.on('error', (e) => {
    if (!res.headersSent) res.status(500)
    res.end()
    console.error('yt-dlp error:', e.message)
  })
  child.on('close', (code) => {
    if (code !== 0) console.error('yt-dlp salió con código', code, err.trim())
    res.end()
  })
  req.on('close', () => child.kill('SIGKILL')) // si el usuario cancela, matamos la descarga
})

app.get('/api/health', (_req, res) => res.json({ ok: true, ytdlp: YTDLP }))

app.listen(PORT, () => {
  console.log(`\n  OfflineTube en  http://localhost:${PORT}`)
  console.log(`  yt-dlp:         ${YTDLP}\n`)
})
