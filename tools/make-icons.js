/*
 * make-icons.js — generates the PWA icons. Optional, run-once tool.
 *
 * This is NOT a build step. The app itself has no build. The PNGs it writes are
 * committed to the repo; you only need to run this if you want to change the mark:
 *
 *     node tools/make-icons.js
 *
 * Uses only Node's standard library (zlib) — no npm, no image libraries.
 * Draws at 4x and box-filters down, which is where the smooth edges come from.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---- PNG ENCODER ---- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// rgba: Uint8Array of size w*h*4
function encodePng(rgba, w, h) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (None)
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- DRAWING ---- */

const PIT = [0x0f, 0x12, 0x16, 0xff];   // background
const AMP = [0xff, 0x9f, 0x1c, 0xff];   // the mark
const STEEL = [0x6c, 0x76, 0x84, 0xff]; // the bar itself, so plates read as separate

function canvas(size, bg) {
  const px = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = bg[0]; px[i * 4 + 1] = bg[1]; px[i * 4 + 2] = bg[2]; px[i * 4 + 3] = bg[3];
  }
  return px;
}

// Rounded rectangle in normalised (0..1) coordinates.
function rrect(px, size, x0, y0, x1, y1, r, colour) {
  const X0 = x0 * size, Y0 = y0 * size, X1 = x1 * size, Y1 = y1 * size, R = r * size;
  for (let y = Math.floor(Y0); y < Math.ceil(Y1); y++) {
    for (let x = Math.floor(X0); x < Math.ceil(X1); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const cx = Math.min(Math.max(x + 0.5, X0 + R), X1 - R);
      const cy = Math.min(Math.max(y + 0.5, Y0 + R), Y1 - R);
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > R * R) continue;
      const i = (y * size + x) * 4;
      px[i] = colour[0]; px[i + 1] = colour[1]; px[i + 2] = colour[2]; px[i + 3] = colour[3];
    }
  }
}

// A barbell, seen side on: bar through two plates a side. Reads at 60px.
function drawMark(px, size) {
  rrect(px, size, 0.115, 0.462, 0.885, 0.538, 0.030, STEEL);       // bar
  rrect(px, size, 0.150, 0.345, 0.238, 0.655, 0.034, AMP);         // outer plate, left
  rrect(px, size, 0.762, 0.345, 0.850, 0.655, 0.034, AMP);         // outer plate, right
  rrect(px, size, 0.268, 0.235, 0.368, 0.765, 0.040, AMP);         // inner plate, left
  rrect(px, size, 0.632, 0.235, 0.732, 0.765, 0.040, AMP);         // inner plate, right
}

// Supersample: draw big, average down. Cheap antialiasing with no dependencies.
function render(size, { bg = PIT } = {}) {
  const SS = 4;
  const big = canvas(size * SS, bg);
  drawMark(big, size * SS);
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * size * SS + (x * SS + sx)) * 4;
          r += big[i]; g += big[i + 1]; b += big[i + 2]; a += big[i + 3];
        }
      }
      const n = SS * SS, o = (y * size + x) * 4;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

/* ---- WRITE ---- */

const root = path.join(__dirname, '..');
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const target = path.join(root, file);
  fs.writeFileSync(target, encodePng(render(size), size, size));
  console.log('wrote', file, size + 'x' + size);
}
