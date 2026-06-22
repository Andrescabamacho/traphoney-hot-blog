/* ============================================================
   Mi Música — Servidor de descarga
   Recibe un enlace de YouTube y devuelve el audio en MP3.

   Estrategia (sin que el usuario tenga que hacer nada):
     1) Intenta sacar el audio vía instancias públicas de Piped
        (proxys que esquivan el bloqueo de "robot" de YouTube).
     2) Si todas fallan, recurre a yt-dlp (con cookies si las hay).
   Convierte siempre a MP3 con ffmpeg (compatible con iOS/Android).

   Uso personal. Respeta los derechos de autor y los Términos de
   Servicio de YouTube.
   ============================================================ */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_FILESIZE = process.env.MAX_FILESIZE || '100M';
const PLAYER_CLIENT = process.env.YT_PLAYER_CLIENT || 'android,web';

// Instancias públicas de Piped (proxys de YouTube). Se pueden cambiar con la
// variable PIPED_INSTANCES (separadas por comas) sin tocar el código.
const PIPED_INSTANCES = (process.env.PIPED_INSTANCES ||
  [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.private.coffee',
    'https://pipedapi.reallyaweso.me',
    'https://pipedapi.darkness.services',
    'https://piped-api.lunar.icu',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.phoenix.fun',
  ].join(',')
).split(',').map((s) => s.trim()).filter(Boolean);

// Cookies de YouTube (opcional, solo para el respaldo con yt-dlp).
let COOKIES_FILE = null;
try {
  const explicit = process.env.YT_COOKIES_FILE;
  const secretPath = '/etc/secrets/cookies.txt';
  if (explicit && fs.existsSync(explicit)) {
    COOKIES_FILE = explicit;
  } else if (fs.existsSync(secretPath)) {
    COOKIES_FILE = secretPath;
  } else if (process.env.YT_COOKIES && process.env.YT_COOKIES.trim()) {
    COOKIES_FILE = path.join(os.tmpdir(), 'yt-cookies.txt');
    fs.writeFileSync(COOKIES_FILE, process.env.YT_COOKIES);
  }
  if (COOKIES_FILE) console.log('Cookies de YouTube disponibles para yt-dlp.');
} catch (e) {
  console.warn('No se pudieron cargar las cookies:', e.message);
}

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

// Saca el ID del vídeo de cualquier formato de enlace de YouTube.
function extractVideoId(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'X-Title, X-Artist, Content-Disposition');
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

function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// --- Vía 1: Piped ---------------------------------------------------------
// Pregunta a cada instancia por los streams de audio del vídeo y devuelve
// { title, uploader, audioUrl } de la primera que responda bien.
async function resolveViaPiped(videoId) {
  let lastErr = null;
  for (const base of PIPED_INSTANCES) {
    try {
      const r = await fetchWithTimeout(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      }, 15000);
      if (!r.ok) { lastErr = new Error(`${base} -> HTTP ${r.status}`); continue; }
      const data = await r.json();
      const audios = (data.audioStreams || []).filter((a) => a.url);
      if (!audios.length) { lastErr = new Error(`${base} -> sin audio`); continue; }
      // El de mayor bitrate.
      audios.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      return {
        title: data.title || 'Audio',
        uploader: data.uploader || 'YouTube',
        audioUrl: audios[0].url,
        instance: base,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error('Piped no disponible: ' + (lastErr ? lastErr.message : 'sin instancias'));
}

async function downloadToFile(url, dest) {
  const r = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  }, 120000);
  if (!r.ok || !r.body) throw new Error(`Descarga falló (HTTP ${r.status}).`);
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(dest));
}

function runFfmpegToMp3(src, dest) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-i', src, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', '-y', dest,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    const t = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('ffmpeg agotó el tiempo.')); }, 120000);
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => { clearTimeout(t); reject(e); });
    child.on('close', (code) => {
      clearTimeout(t);
      if (code === 0 && fs.existsSync(dest)) resolve();
      else reject(new Error('ffmpeg falló: ' + err.slice(-300)));
    });
  });
}

// --- Vía 2 (respaldo): yt-dlp --------------------------------------------
function runYtDlp(url, outTemplate) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-playlist', '--no-warnings', '--no-progress',
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
    let out = '', err = '';
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('yt-dlp agotó el tiempo.')); }, 180000);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => { clearTimeout(timeout); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(err.trim() || `yt-dlp código ${code}`));
      const line = out.trim().split('\n').filter(Boolean).pop() || '';
      const [title, uploader, filepath] = line.split('\t');
      resolve({ title: title || 'Audio', uploader: uploader || 'YouTube', filepath });
    });
  });
}

function sendFile(res, filepath, title, uploader) {
  const stat = fs.statSync(filepath);
  cors(res);
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Length': stat.size,
    'X-Title': encodeURIComponent(title),
    'X-Artist': encodeURIComponent(uploader),
  });
  fs.createReadStream(filepath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    return sendJson(res, 200, { ok: true, service: 'mi-musica-server', ready: true, instances: PIPED_INSTANCES.length });
  }

  if (req.method === 'POST' && url.pathname === '/api/download') {
    let body;
    try { body = JSON.parse(await readBody(req) || '{}'); }
    catch { return sendJson(res, 400, { error: 'JSON inválido' }); }

    const ytUrl = (body.url || '').trim();
    if (!ytUrl) return sendJson(res, 400, { error: 'Falta el enlace (url).' });
    if (!isValidYouTubeUrl(ytUrl)) return sendJson(res, 400, { error: 'Solo se admiten enlaces de YouTube.' });

    const videoId = extractVideoId(ytUrl);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-'));
    const srcPath = path.join(tmpDir, 'src');
    const mp3Path = path.join(tmpDir, 'audio.mp3');
    const cleanup = () => fs.rm(tmpDir, { recursive: true, force: true }, () => {});

    // --- Intento 1: Piped + ffmpeg ---
    if (videoId) {
      try {
        const info = await resolveViaPiped(videoId);
        await downloadToFile(info.audioUrl, srcPath);
        await runFfmpegToMp3(srcPath, mp3Path);
        sendFile(res, mp3Path, info.title, info.uploader);
        res.on('close', cleanup);
        console.log(`OK vía Piped (${info.instance}): ${info.title}`);
        return;
      } catch (e) {
        console.warn('Piped falló, pruebo yt-dlp:', e.message);
      }
    }

    // --- Intento 2 (respaldo): yt-dlp ---
    try {
      const info = await runYtDlp(ytUrl, path.join(tmpDir, '%(id)s.%(ext)s'));
      let filepath = info.filepath;
      if (!filepath || !fs.existsSync(filepath)) {
        const found = fs.readdirSync(tmpDir).find((f) => f.endsWith('.mp3'));
        if (found) filepath = path.join(tmpDir, found);
      }
      if (!filepath || !fs.existsSync(filepath)) throw new Error('No se generó el audio.');
      sendFile(res, filepath, info.title, info.uploader);
      res.on('close', cleanup);
      console.log('OK vía yt-dlp:', info.title);
    } catch (e) {
      cleanup();
      return sendJson(res, 502, {
        error: 'No se pudo obtener el audio ahora mismo. Vuelve a intentarlo en unos segundos. (' + (e.message || 'error') + ')',
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'No encontrado' });
});

server.listen(PORT, () => {
  console.log(`Mi Música server escuchando en :${PORT} (Piped: ${PIPED_INSTANCES.length} instancias)`);
});
