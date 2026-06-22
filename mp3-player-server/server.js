/* ============================================================
   Mi Música — Servidor de descarga (yt-dlp + ffmpeg)
   Recibe un enlace de YouTube y devuelve el audio en MP3.
   Uso personal. Respeta los derechos de autor y los Términos
   de Servicio de YouTube.
   ============================================================ */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
// Origen permitido para CORS. '*' por defecto (uso personal).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
// Tamaño máximo del audio (evita abusos). Por defecto 100 MB.
const MAX_FILESIZE = process.env.MAX_FILESIZE || '100M';

// Defensa anti-bloqueo de YouTube. Se puede afinar con la variable
// YT_PLAYER_CLIENT (p. ej. "android", "ios", "web,android").
const PLAYER_CLIENT = process.env.YT_PLAYER_CLIENT || 'android,web';

// Cookies de YouTube (opcional, para el caso de que YouTube pida verificación).
// Pega el contenido de un cookies.txt en la variable de entorno YT_COOKIES.
let COOKIES_FILE = null;
try {
  if (process.env.YT_COOKIES && process.env.YT_COOKIES.trim()) {
    COOKIES_FILE = path.join(os.tmpdir(), 'yt-cookies.txt');
    fs.writeFileSync(COOKIES_FILE, process.env.YT_COOKIES);
    console.log('Cookies de YouTube cargadas.');
  }
} catch (e) {
  console.warn('No se pudieron escribir las cookies:', e.message);
}

// Hosts de YouTube permitidos (evita que usen el servidor para otras cosas).
const ALLOWED_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com',
  'youtu.be', 'music.youtube.com',
]);

function isValidYouTubeUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'X-Title, X-Artist');
}

function sendJson(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) { req.destroy(); reject(new Error('body too large')); }
      data += c;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function runYtDlp(url, outTemplate) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-playlist',
      '--no-warnings',
      '--no-progress',
      '--extractor-args', `youtube:player_client=${PLAYER_CLIENT}`,
      '-f', 'bestaudio/best',
      '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '--max-filesize', MAX_FILESIZE,
      '--print', 'after_move:%(title)s\t%(uploader)s\t%(filepath)s',
      '-o', outTemplate,
    ];
    if (COOKIES_FILE) args.push('--cookies', COOKIES_FILE);
    args.push(url);
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Tiempo de descarga agotado (3 min).'));
    }, 180000);

    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => { clearTimeout(timeout); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(err.trim() || `yt-dlp salió con código ${code}`));
      }
      // La línea de --print: "título\tuploader\truta"
      const line = out.trim().split('\n').filter(Boolean).pop() || '';
      const [title, uploader, filepath] = line.split('\t');
      resolve({ title: title || 'Audio', uploader: uploader || 'YouTube', filepath });
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    return sendJson(res, 200, { ok: true, service: 'mi-musica-server', ready: true });
  }

  // Descarga
  if (req.method === 'POST' && url.pathname === '/api/download') {
    let body;
    try {
      body = JSON.parse(await readBody(req) || '{}');
    } catch {
      return sendJson(res, 400, { error: 'JSON inválido' });
    }
    const ytUrl = (body.url || '').trim();
    if (!ytUrl) return sendJson(res, 400, { error: 'Falta el enlace (url).' });
    if (!isValidYouTubeUrl(ytUrl)) {
      return sendJson(res, 400, { error: 'Solo se admiten enlaces de YouTube.' });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-'));
    const outTemplate = path.join(tmpDir, '%(id)s.%(ext)s');

    try {
      const info = await runYtDlp(ytUrl, outTemplate);
      let filepath = info.filepath;
      if (!filepath || !fs.existsSync(filepath)) {
        // respaldo: buscar el mp3 en el tmp
        const found = fs.readdirSync(tmpDir).find((f) => f.endsWith('.mp3'));
        if (found) filepath = path.join(tmpDir, found);
      }
      if (!filepath || !fs.existsSync(filepath)) {
        throw new Error('No se generó el archivo de audio.');
      }

      const stat = fs.statSync(filepath);
      cors(res);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size,
        'X-Title': encodeURIComponent(info.title),
        'X-Artist': encodeURIComponent(info.uploader),
      });
      const stream = fs.createReadStream(filepath);
      stream.pipe(res);
      const cleanup = () => fs.rm(tmpDir, { recursive: true, force: true }, () => {});
      stream.on('close', cleanup);
      stream.on('error', cleanup);
    } catch (e) {
      fs.rm(tmpDir, { recursive: true, force: true }, () => {});
      return sendJson(res, 500, { error: e.message || 'Error al descargar.' });
    }
    return;
  }

  sendJson(res, 404, { error: 'No encontrado' });
});

server.listen(PORT, () => {
  console.log(`Mi Música server escuchando en :${PORT}`);
});
