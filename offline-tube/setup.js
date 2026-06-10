// Descarga el binario de yt-dlp a ./bin si no está en el sistema.
// Así no dependes de tener yt-dlp instalado globalmente (útil en Replit).

import { mkdirSync, existsSync, chmodSync, createWriteStream } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const binDir = join(__dirname, 'bin')
const isWin = process.platform === 'win32'
const target = join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp')

const asset = isWin
  ? 'yt-dlp.exe'
  : process.platform === 'darwin'
    ? 'yt-dlp_macos'
    : 'yt-dlp' // linux: binario autocontenido

const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`

function download(from, to, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Demasiados redirects'))
    https
      .get(from, { headers: { 'User-Agent': 'offline-tube-setup' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return resolve(download(res.headers.location, to, redirects + 1))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} al bajar yt-dlp`))
        }
        const file = createWriteStream(to)
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
        file.on('error', reject)
      })
      .on('error', reject)
  })
}

async function main() {
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true })
  if (existsSync(target)) {
    console.log('yt-dlp ya está en', target)
    return
  }
  console.log('Descargando yt-dlp ->', target)
  await download(url, target)
  if (!isWin) chmodSync(target, 0o755)
  console.log('Listo. yt-dlp instalado en', target)
  console.log('Nota: yt-dlp necesita Python 3 instalado en el sistema.')
}

main().catch((e) => {
  console.error('Fallo en setup:', e.message)
  console.error('Alternativa: instala yt-dlp manualmente (pip install yt-dlp) y arranca con npm start.')
  process.exit(1)
})
