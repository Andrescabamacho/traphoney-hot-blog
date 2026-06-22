// Genera iconos PNG (sin dependencias) para la PWA.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIcon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  // radio de esquinas: para maskable usamos cuadrado completo (safe area), si no, redondeado
  const radius = maskable ? 0 : size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  // triangulo play centrado
  const triW = size * 0.30;
  const triH = size * 0.34;
  const triLeft = cx - triW * 0.36;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // fondo gradiente diagonal (violeta -> indigo)
      const t = (x + y) / (2 * size);
      let r = Math.round(lerp(124, 79, t)); // 7c -> 4f
      let g = Math.round(lerp(58, 70, t));
      let b = Math.round(lerp(237, 229, t));
      let a = 255;
      // esquinas redondeadas
      if (radius > 0) {
        const rx = Math.min(x, size - 1 - x);
        const ry = Math.min(y, size - 1 - y);
        if (rx < radius && ry < radius) {
          const dx = radius - rx;
          const dy = radius - ry;
          if (dx * dx + dy * dy > radius * radius) a = 0;
        }
      }
      // triangulo play (blanco)
      if (a > 0) {
        const ty0 = cy - triH / 2;
        const ty1 = cy + triH / 2;
        if (y >= ty0 && y <= ty1) {
          const prog = (y - ty0) / triH;
          const half = Math.min(prog, 1 - prog);
          const right = triLeft + triW * (half * 2);
          if (x >= triLeft && x <= right) {
            r = 255;
            g = 255;
            b = 255;
          }
        }
      }
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    }
  }
  return encodePNG(size, size, buf);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: true },
  { name: 'favicon-32.png', size: 32, maskable: false },
];

for (const t of targets) {
  fs.writeFileSync(path.join(outDir, t.name), drawIcon(t.size, t.maskable));
  console.log('escrito', t.name);
}
