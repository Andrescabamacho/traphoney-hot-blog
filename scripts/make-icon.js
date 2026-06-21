// Genera iconos PNG para la PWA sin dependencias externas.
// Dibuja a alta resolución y reduce con promediado (antialiasing).
const fs = require('fs')
const zlib = require('zlib')

const SS = 4 // supersampling

function render(size) {
  const N = size * SS
  const buf = Buffer.alloc(N * N * 4)
  const set = (x, y, r, g, b, a) => {
    const i = (y * N + x) * 4
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
    buf[i + 3] = a
  }
  const inRounded = (x, y, rx, ry, rw, rh, rad) => {
    if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false
    const cx = Math.min(Math.max(x, rx + rad), rx + rw - rad)
    const cy = Math.min(Math.max(y, ry + rad), ry + rh - rad)
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= rad * rad
  }
  const inCircle = (x, y, cx, cy, rad) => {
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= rad * rad
  }

  const f = N // normalized to N
  // medidas relativas
  const cream = [223, 214, 209]
  const gray = [64, 64, 66]
  const gold = [202, 162, 74]

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // fondo negro
      let c = [0, 0, 0]
      // burbuja crema arriba-derecha
      if (inRounded(x, y, 0.36 * f, 0.16 * f, 0.5 * f, 0.26 * f, 0.13 * f)) c = cream
      // burbuja gris abajo-izquierda
      else if (inRounded(x, y, 0.2 * f, 0.5 * f, 0.55 * f, 0.3 * f, 0.15 * f)) c = gray
      // avatar dorado junto a la burbuja gris
      else if (inCircle(x, y, 0.16 * f, 0.74 * f, 0.075 * f)) c = gold
      set(x, y, c[0], c[1], c[2], 255)
    }
  }

  // reducir por promediado a size x size
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * N + (x * SS + sx)) * 4
          r += buf[i]
          g += buf[i + 1]
          b += buf[i + 2]
          a += buf[i + 3]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = Math.round(a / n)
    }
  }
  return out
}

// ---- Codificador PNG (RGBA) ----
const CRC_TABLE = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filtro none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const targets = { 'docs/icon-192.png': 192, 'docs/icon-512.png': 512, 'docs/apple-touch-icon.png': 180 }
fs.mkdirSync('docs', { recursive: true })
for (const [path, size] of Object.entries(targets)) {
  fs.writeFileSync(path, encodePNG(render(size), size))
  console.log('wrote', path, size + 'x' + size)
}
