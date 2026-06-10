// Almacén local de vídeos en IndexedDB. Aquí viven los vídeos descargados
// (el Blob mp4 entero) para que se reproduzcan sin internet.
const DB = (() => {
  const NAME = 'offline-tube'
  const STORE = 'videos'
  let dbp = null

  function open() {
    if (dbp) return dbp
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return dbp
  }

  async function tx(mode) {
    const db = await open()
    return db.transaction(STORE, mode).objectStore(STORE)
  }

  return {
    async put(record) {
      const store = await tx('readwrite')
      return new Promise((res, rej) => {
        const r = store.put(record)
        r.onsuccess = () => res()
        r.onerror = () => rej(r.error)
      })
    },
    async all() {
      const store = await tx('readonly')
      return new Promise((res, rej) => {
        const r = store.getAll()
        r.onsuccess = () => res(r.result.sort((a, b) => b.savedAt - a.savedAt))
        r.onerror = () => rej(r.error)
      })
    },
    async get(id) {
      const store = await tx('readonly')
      return new Promise((res, rej) => {
        const r = store.get(id)
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
    },
    async remove(id) {
      const store = await tx('readwrite')
      return new Promise((res, rej) => {
        const r = store.delete(id)
        r.onsuccess = () => res()
        r.onerror = () => rej(r.error)
      })
    },
  }
})()
