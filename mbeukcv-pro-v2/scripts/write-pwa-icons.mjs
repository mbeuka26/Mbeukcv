/**
 * Icônes PWA réelles (PNG), couleurs du produit : fond #0a0a0f, papier, filet or.
 * Régénère public/icon-192.png, public/icon-512.png et public/icon-512-maskable.png.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const BG = [10, 10, 15, 255];
const PAPER = [244, 241, 234, 255];
const GOLD = [212, 168, 67, 255];
const INK = [26, 58, 92, 255];
const FOLD = [196, 184, 160, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function png(size, pixel) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function documentIcon(size, maskable) {
  const margin = Math.round(size * (maskable ? 0.22 : 0.14));
  const docX = margin;
  const docY = margin;
  const docW = size - margin * 2;
  const docH = size - margin * 2;
  const fold = Math.round(docW * 0.16);
  const headerH = Math.max(4, Math.round(docH * 0.1));
  const lineH = Math.max(2, Math.round(size * 0.028));
  const lineGap = Math.round(lineH * 2.1);
  const lineX = docX + Math.round(docW * 0.14);
  const lineTop = docY + headerH + Math.round(docH * 0.14);

  return (x, y) => {
    if (x < docX || y < docY || x >= docX + docW || y >= docY + docH) return BG;
    const localX = x - (docX + docW - fold);
    const localY = y - docY;
    if (localX >= 0 && localY >= 0 && localX + localY < fold) return FOLD;
    if (y < docY + headerH) return GOLD;
    for (let i = 0; i < 4; i += 1) {
      const ly = lineTop + i * lineGap;
      const width = Math.round(docW * (i === 3 ? 0.34 : 0.58));
      if (x >= lineX && x < lineX + width && y >= ly && y < ly + lineH) return INK;
    }
    return PAPER;
  };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
fs.mkdirSync(publicDir, { recursive: true });

const files = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
];

for (const [name, size, maskable] of files) {
  const target = path.join(publicDir, name);
  fs.writeFileSync(target, png(size, documentIcon(size, maskable)));
  console.log(target);
}
