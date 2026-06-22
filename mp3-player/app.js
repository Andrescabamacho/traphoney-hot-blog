/* ============================================================
   Mi Música — Reproductor MP3 offline (PWA)
   - Guarda los archivos en IndexedDB (disponibles sin internet)
   - Usa Media Session API para sonar con la pantalla bloqueada
   ============================================================ */

(() => {
  'use strict';

  // ---------- IndexedDB ----------
  const DB_NAME = 'mi-musica';
  const DB_VERSION = 1;
  const STORE = 'tracks';
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const os = d.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('order', 'order', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function tx(mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function dbGetAll() {
    return new Promise((resolve, reject) => {
      const req = tx('readonly').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function dbPut(track) {
    return new Promise((resolve, reject) => {
      const req = tx('readwrite').put(track);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function dbDelete(id) {
    return new Promise((resolve, reject) => {
      const req = tx('readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Estado ----------
  let tracks = [];        // {id, name, title, artist, blob, order, size, type}
  let queue = [];         // ids en orden de reproducción
  let currentIndex = -1;  // índice dentro de queue
  let currentUrl = null;  // objectURL activo
  let shuffle = false;
  let repeat = 'off';     // 'off' | 'all' | 'one'

  // ---------- Elementos ----------
  const audio = document.getElementById('audio');
  const fileInput = document.getElementById('fileInput');
  const trackList = document.getElementById('trackList');
  const emptyState = document.getElementById('emptyState');
  const player = document.getElementById('player');
  const elTitle = document.getElementById('trackTitle');
  const elArtist = document.getElementById('trackArtist');
  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const seek = document.getElementById('seek');
  const curTime = document.getElementById('curTime');
  const durTime = document.getElementById('durTime');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const repeatBtn = document.getElementById('repeatBtn');
  const toast = document.getElementById('toast');

  // ---------- Utilidades ----------
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
  }

  // Deriva título/artista del nombre de archivo "Artista - Título.mp3"
  function parseName(filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    const m = base.split(' - ');
    if (m.length >= 2) {
      return { artist: m[0].trim(), title: m.slice(1).join(' - ').trim() };
    }
    return { artist: 'Desconocido', title: base.trim() };
  }

  // ---------- Render ----------
  function render() {
    if (tracks.length === 0) {
      emptyState.classList.remove('hidden');
      trackList.innerHTML = '';
      return;
    }
    emptyState.classList.add('hidden');

    const sorted = [...tracks].sort((a, b) => a.order - b.order);
    trackList.innerHTML = '';
    const playingId = currentIndex >= 0 ? queue[currentIndex] : null;

    for (const t of sorted) {
      const li = document.createElement('li');
      li.className = 'track' + (t.id === playingId ? ' active' : '');
      li.dataset.id = t.id;
      li.innerHTML = `
        <div class="track-thumb">
          <svg class="note" viewBox="0 0 24 24" width="20" height="20"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
          <div class="bars"><span></span><span></span><span></span></div>
        </div>
        <div class="track-info">
          <div class="track-title">${escapeHtml(t.title)}</div>
          <div class="track-sub">${escapeHtml(t.artist)}</div>
        </div>
        <button class="track-del" title="Eliminar" aria-label="Eliminar">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>`;

      li.addEventListener('click', (e) => {
        if (e.target.closest('.track-del')) return;
        playById(t.id);
      });
      li.querySelector('.track-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTrack(t.id);
      });
      trackList.appendChild(li);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ---------- Cola de reproducción ----------
  function buildQueue() {
    const sorted = [...tracks].sort((a, b) => a.order - b.order);
    queue = sorted.map((t) => t.id);
    if (shuffle) shuffleQueue();
  }

  function shuffleQueue() {
    const playingId = currentIndex >= 0 ? queue[currentIndex] : null;
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (playingId) {
      const idx = queue.indexOf(playingId);
      if (idx > 0) {
        queue.splice(idx, 1);
        queue.unshift(playingId);
      }
      currentIndex = 0;
    }
  }

  function trackById(id) {
    return tracks.find((t) => t.id === id);
  }

  // ---------- Reproducción ----------
  async function playById(id) {
    buildQueue();
    const idx = queue.indexOf(id);
    if (idx === -1) return;
    currentIndex = idx;
    await loadCurrent(true);
  }

  async function loadCurrent(autoplay) {
    const id = queue[currentIndex];
    const t = trackById(id);
    if (!t) return;

    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(t.blob);
    audio.src = currentUrl;

    elTitle.textContent = t.title;
    elArtist.textContent = t.artist;
    player.classList.remove('hidden');
    render();
    updateMediaSession(t);
    localStorage.setItem('lastTrack', id);

    if (autoplay) {
      try {
        await audio.play();
      } catch (err) {
        // Algunos navegadores requieren gesto; el botón sigue disponible
        console.warn('play() bloqueado:', err);
      }
    }
  }

  function togglePlay() {
    if (!audio.src) {
      // Nada cargado: empieza por la primera de la cola
      if (tracks.length) {
        buildQueue();
        currentIndex = 0;
        loadCurrent(true);
      }
      return;
    }
    if (audio.paused) audio.play(); else audio.pause();
  }

  function next(auto) {
    if (queue.length === 0) return;
    if (repeat === 'one' && auto) {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    if (currentIndex < queue.length - 1) {
      currentIndex++;
    } else {
      if (repeat === 'all' || !auto) {
        currentIndex = 0;
      } else {
        // fin de la lista
        audio.pause();
        audio.currentTime = 0;
        return;
      }
    }
    loadCurrent(true);
  }

  function prev() {
    if (queue.length === 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    currentIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    loadCurrent(true);
  }

  // ---------- Media Session (pantalla bloqueada) ----------
  function updateMediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: 'Mi Música',
      artwork: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }

  function setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler('play', () => audio.play());
      ms.setActionHandler('pause', () => audio.pause());
      ms.setActionHandler('previoustrack', () => prev());
      ms.setActionHandler('nexttrack', () => next(false));
      ms.setActionHandler('seekto', (d) => {
        if (d.fastSeek && 'fastSeek' in audio) audio.fastSeek(d.seekTime);
        else audio.currentTime = d.seekTime;
      });
      ms.setActionHandler('seekbackward', (d) => {
        audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10));
      });
      ms.setActionHandler('seekforward', (d) => {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d.seekOffset || 10));
      });
    } catch (e) { /* algunos handlers pueden no existir */ }
  }

  function updatePositionState() {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch (e) { /* ignore */ }
  }

  // ---------- Añadir / eliminar ----------
  // Guarda un blob de audio como pista nueva (devuelve la pista creada).
  async function saveTrack(blob, { title, artist, type, name, size }) {
    const maxOrder = tracks.reduce((m, t) => Math.max(m, t.order), 0);
    const track = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name || `${title}.mp3`,
      title: title || 'Audio',
      artist: artist || 'Desconocido',
      type: type || 'audio/mpeg',
      size: size || blob.size,
      order: maxOrder + 1,
      blob,
    };
    await dbPut(track);
    tracks.push(track);
    return track;
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i.test(f.name));
    if (files.length === 0) {
      showToast('No se han seleccionado audios');
      return;
    }
    for (const f of files) {
      const { artist, title } = parseName(f.name);
      await saveTrack(f, { title, artist, type: f.type || 'audio/mpeg', name: f.name, size: f.size });
    }
    render();
    showToast(files.length === 1 ? 'Canción añadida' : `${files.length} canciones añadidas`);
  }

  // ---------- Descarga desde YouTube ----------
  const ytOverlay = document.getElementById('ytOverlay');
  const ytUrl = document.getElementById('ytUrl');
  const ytStatus = document.getElementById('ytStatus');
  const ytDownload = document.getElementById('ytDownload');
  const serverUrlInput = document.getElementById('serverUrl');
  const ytSettings = document.getElementById('ytSettings');

  function getServerUrl() {
    return (localStorage.getItem('serverUrl') || '').replace(/\/+$/, '');
  }

  function openYt() {
    serverUrlInput.value = getServerUrl();
    ytStatus.textContent = '';
    ytStatus.className = 'yt-status';
    // Si no hay servidor configurado, abre los ajustes directamente.
    if (!getServerUrl()) {
      ytSettings.classList.remove('hidden');
      setYtStatus('Primero configura tu servidor abajo ⬇️', 'error');
    } else {
      ytSettings.classList.add('hidden');
    }
    ytOverlay.classList.remove('hidden');
    if (getServerUrl()) setTimeout(() => ytUrl.focus(), 150);
  }

  function closeYt() { ytOverlay.classList.add('hidden'); }

  function setYtStatus(msg, kind) {
    ytStatus.textContent = msg;
    ytStatus.className = 'yt-status' + (kind ? ' ' + kind : '');
  }

  async function downloadFromYouTube() {
    const server = getServerUrl();
    if (!server) {
      ytSettings.classList.remove('hidden');
      setYtStatus('Configura primero la dirección de tu servidor.', 'error');
      return;
    }
    const link = ytUrl.value.trim();
    if (!link) { setYtStatus('Pega un enlace de YouTube.', 'error'); return; }
    if (!/youtube\.com|youtu\.be/i.test(link)) {
      setYtStatus('Eso no parece un enlace de YouTube.', 'error');
      return;
    }

    ytDownload.disabled = true;
    setYtStatus('Descargando… esto puede tardar hasta 1 minuto ⏳', 'loading');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 190000);
    try {
      const res = await fetch(`${server}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
        signal: controller.signal,
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const title = decodeURIComponent(res.headers.get('X-Title') || 'Audio');
      const artist = decodeURIComponent(res.headers.get('X-Artist') || 'YouTube');
      const blob = await res.blob();
      await saveTrack(blob, { title, artist, type: 'audio/mpeg', name: `${title}.mp3` });
      render();
      setYtStatus('✅ Añadida a tu biblioteca', 'ok');
      ytUrl.value = '';
      showToast('Canción descargada');
      setTimeout(closeYt, 1200);
    } catch (e) {
      const msg = e.name === 'AbortError'
        ? 'Tardó demasiado. Inténtalo de nuevo.'
        : (e.message || 'No se pudo descargar.');
      setYtStatus('❌ ' + msg, 'error');
    } finally {
      clearTimeout(timer);
      ytDownload.disabled = false;
    }
  }

  document.getElementById('ytBtn').addEventListener('click', openYt);
  document.getElementById('ytClose').addEventListener('click', closeYt);
  ytOverlay.addEventListener('click', (e) => { if (e.target === ytOverlay) closeYt(); });
  ytDownload.addEventListener('click', downloadFromYouTube);
  ytUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') downloadFromYouTube(); });

  document.getElementById('ytPaste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) ytUrl.value = text.trim();
    } catch {
      setYtStatus('No se pudo leer el portapapeles. Pega manualmente.', 'error');
    }
  });

  document.getElementById('ytSettingsToggle').addEventListener('click', () => {
    ytSettings.classList.toggle('hidden');
  });
  document.getElementById('serverSave').addEventListener('click', () => {
    const v = serverUrlInput.value.trim().replace(/\/+$/, '');
    if (v && !/^https?:\/\//i.test(v)) {
      setYtStatus('La dirección debe empezar por https://', 'error');
      return;
    }
    localStorage.setItem('serverUrl', v);
    setYtStatus(v ? '✅ Servidor guardado' : 'Servidor borrado', v ? 'ok' : '');
    if (v) { ytSettings.classList.add('hidden'); setTimeout(() => ytUrl.focus(), 100); }
  });

  async function deleteTrack(id) {
    const t = trackById(id);
    if (!t) return;
    const isPlaying = currentIndex >= 0 && queue[currentIndex] === id;
    await dbDelete(id);
    tracks = tracks.filter((x) => x.id !== id);
    if (isPlaying) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      currentIndex = -1;
      if (tracks.length === 0) {
        player.classList.add('hidden');
      }
    }
    buildQueue();
    render();
    showToast('Canción eliminada');
  }

  // ---------- Eventos de audio ----------
  audio.addEventListener('play', () => {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    document.body.classList.remove('paused');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  audio.addEventListener('pause', () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    document.body.classList.add('paused');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });
  audio.addEventListener('loadedmetadata', () => {
    durTime.textContent = fmtTime(audio.duration);
    seek.max = 1000;
    updatePositionState();
  });
  audio.addEventListener('timeupdate', () => {
    curTime.textContent = fmtTime(audio.currentTime);
    if (audio.duration > 0 && !seeking) {
      seek.value = String((audio.currentTime / audio.duration) * 1000);
    }
  });
  audio.addEventListener('durationchange', updatePositionState);
  audio.addEventListener('ended', () => next(true));
  audio.addEventListener('error', () => {
    if (audio.src) showToast('No se pudo reproducir este archivo');
  });

  // ---------- Controles UI ----------
  let seeking = false;
  seek.addEventListener('input', () => { seeking = true; });
  seek.addEventListener('change', () => {
    if (audio.duration > 0) {
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    }
    seeking = false;
  });

  playBtn.addEventListener('click', togglePlay);
  document.getElementById('nextBtn').addEventListener('click', () => next(false));
  document.getElementById('prevBtn').addEventListener('click', prev);

  shuffleBtn.addEventListener('click', () => {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle('on', shuffle);
    localStorage.setItem('shuffle', shuffle ? '1' : '0');
    buildQueue();
    // recolocar índice actual
    if (currentIndex >= 0) {
      const id = localStorage.getItem('lastTrack');
      const idx = queue.indexOf(id);
      if (idx >= 0) currentIndex = idx;
    }
    showToast(shuffle ? 'Aleatorio activado' : 'Aleatorio desactivado');
  });

  repeatBtn.addEventListener('click', () => {
    repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    repeatBtn.classList.toggle('on', repeat !== 'off');
    repeatBtn.title = repeat === 'one' ? 'Repetir una' : repeat === 'all' ? 'Repetir todo' : 'Repetir';
    localStorage.setItem('repeat', repeat);
    // marca visual para "repetir una"
    repeatBtn.style.opacity = repeat === 'one' ? '1' : '';
    showToast(repeat === 'all' ? 'Repetir todo' : repeat === 'one' ? 'Repetir una' : 'Repetir desactivado');
  });

  document.getElementById('addBtn').addEventListener('click', () => fileInput.click());
  document.getElementById('addBtnEmpty').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });

  // Atajos de teclado (escritorio)
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') next(false);
    else if (e.code === 'ArrowLeft') prev();
  });

  // ---------- Arranque ----------
  async function init() {
    try {
      db = await openDB();
      tracks = await dbGetAll();
    } catch (e) {
      showToast('Error al abrir la base de datos');
      console.error(e);
    }

    // restaurar preferencias
    shuffle = localStorage.getItem('shuffle') === '1';
    shuffleBtn.classList.toggle('on', shuffle);
    repeat = localStorage.getItem('repeat') || 'off';
    repeatBtn.classList.toggle('on', repeat !== 'off');

    setupMediaSessionHandlers();
    buildQueue();
    render();

    // Pre-cargar última canción (sin reproducir, listo para play)
    const last = localStorage.getItem('lastTrack');
    if (last && trackById(last)) {
      const idx = queue.indexOf(last);
      if (idx >= 0) {
        currentIndex = idx;
        await loadCurrent(false);
      }
    }

    // actualizar posición para la pantalla de bloqueo periódicamente
    setInterval(() => { if (!audio.paused) updatePositionState(); }, 1000);
  }

  // ---------- Service Worker (offline) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW falló', e));
    });
  }

  init();
})();
