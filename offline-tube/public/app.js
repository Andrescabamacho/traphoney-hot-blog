// OfflineTube — lógica de la interfaz.
// Descarga (con internet) -> guarda Blob en IndexedDB -> reproduce offline.

const $ = (s) => document.querySelector(s)
const urlInput = $('#url')
const qualitySel = $('#quality')
const addBtn = $('#add')
const libraryEl = $('#library')
const emptyEl = $('#empty')
const downloadsEl = $('#downloads')
const netEl = $('#net')

// --- Utilidades ---
function fmtDuration(sec) {
  sec = Math.round(sec || 0)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0')
}
function fmtSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(0) + ' MB'
}
function toast(msg) {
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2600)
}

// --- Estado de red ---
function updateNet() {
  const on = navigator.onLine
  netEl.textContent = on ? '● Online' : '● Offline'
  netEl.className = 'net ' + (on ? 'online' : 'offline')
  addBtn.disabled = !on
  $('#hint').textContent = on
    ? 'Con internet, descarga los vídeos que quieras. Luego se ven sin conexión (avión, metro…).'
    : 'Sin conexión: no se pueden descargar nuevos, pero tu biblioteca de abajo funciona perfecta.'
}
window.addEventListener('online', updateNet)
window.addEventListener('offline', updateNet)

// --- Descargar un vídeo ---
async function addVideo() {
  const url = urlInput.value.trim()
  if (!url) return
  if (!navigator.onLine) return toast('Necesitas internet para descargar')

  addBtn.disabled = true
  let info
  try {
    const r = await fetch('/api/info?url=' + encodeURIComponent(url))
    info = await r.json()
    if (!r.ok) throw new Error(info.error || 'Error obteniendo info')
  } catch (e) {
    addBtn.disabled = false
    return toast(e.message)
  }

  // ¿Ya lo tengo guardado?
  if (await DB.get(info.id)) {
    addBtn.disabled = false
    urlInput.value = ''
    return toast('Ese vídeo ya está en tu biblioteca')
  }

  urlInput.value = ''
  addBtn.disabled = false
  const max = qualitySel.value
  const card = renderDownloadCard(info)

  try {
    const resp = await fetch('/api/download?url=' + encodeURIComponent(url) + '&max=' + max, {
      signal: card.controller.signal,
    })
    if (!resp.ok) throw new Error('El servidor no pudo descargar el vídeo')

    const total = Number(resp.headers.get('Content-Length')) || 0
    const reader = resp.body.getReader()
    const chunks = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      card.progress(received, total)
    }

    const blob = new Blob(chunks, { type: 'video/mp4' })
    await DB.put({
      id: info.id,
      title: info.title,
      channel: info.channel,
      duration: info.duration,
      thumbnail: info.thumbnail,
      size: blob.size,
      blob,
      savedAt: Date.now(),
    })
    card.el.remove()
    toast('Guardado para ver offline ✓')
    renderLibrary()
  } catch (e) {
    card.el.remove()
    if (e.name !== 'AbortError') toast('Descarga fallida: ' + e.message)
  }
}

function renderDownloadCard(info) {
  const controller = new AbortController()
  const el = document.createElement('div')
  el.className = 'dl'
  el.innerHTML = `
    <img src="${info.thumbnail}" alt="" />
    <div class="info">
      <div class="t">${escapeHtml(info.title)}</div>
      <div class="s">Descargando… 0%</div>
      <div class="bar"><span></span></div>
    </div>
    <button class="x" title="Cancelar">✕</button>`
  el.querySelector('.x').onclick = () => {
    controller.abort()
    el.remove()
  }
  downloadsEl.appendChild(el)
  const bar = el.querySelector('.bar > span')
  const status = el.querySelector('.s')
  return {
    el,
    controller,
    progress(received, total) {
      if (total) {
        const pct = Math.round((received / total) * 100)
        bar.style.width = pct + '%'
        status.textContent = `Descargando… ${pct}% (${fmtSize(received)} / ${fmtSize(total)})`
      } else {
        status.textContent = `Descargando… ${fmtSize(received)}`
      }
    },
  }
}

// --- Biblioteca ---
async function renderLibrary() {
  const items = await DB.all()
  emptyEl.classList.toggle('hidden', items.length > 0)
  libraryEl.innerHTML = ''
  for (const v of items) {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${v.thumbnail}')">
        <div class="play">▶</div>
        <div class="dur">${fmtDuration(v.duration)}</div>
      </div>
      <div class="meta">
        <div class="t">${escapeHtml(v.title)}</div>
        <div class="c">
          <span>${escapeHtml(v.channel)} · ${fmtSize(v.size)}</span>
          <button class="del" title="Borrar">Borrar</button>
        </div>
      </div>`
    card.querySelector('.thumb').onclick = () => play(v.id)
    card.querySelector('.t').onclick = () => play(v.id)
    card.querySelector('.del').onclick = async (e) => {
      e.stopPropagation()
      await DB.remove(v.id)
      renderLibrary()
      toast('Borrado')
    }
    libraryEl.appendChild(card)
  }
}

// --- Reproductor ---
let currentObjectUrl = null
async function play(id) {
  const v = await DB.get(id)
  if (!v) return
  const video = $('#video')
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
  currentObjectUrl = URL.createObjectURL(v.blob)
  video.src = currentObjectUrl
  $('#playerTitle').textContent = v.title
  $('#player').classList.remove('hidden')
  video.play().catch(() => {})
}
function closePlayer() {
  const video = $('#video')
  video.pause()
  video.removeAttribute('src')
  video.load()
  $('#player').classList.add('hidden')
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// --- Eventos ---
addBtn.onclick = addVideo
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addVideo()
})
$('#closePlayer').onclick = closePlayer

// --- Init ---
updateNet()
renderLibrary()
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
