/**
 * Minimal solid-color RGBA PNG for PWA / Apple touch, no extra deps.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let c = 0xffffffff;
  const t = new Uint8Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let j = 0; j < 8; j++) {
      k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
    }
    t[n] = k;
  }
  for (let i = 0; i < buf.length; i++) {
    c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, c]);
}

function makeSolidPng(w, h, r, g, b) {
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) {
      raw.push(r, g, b, 255);
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, "../public/icons");
fs.mkdirSync(out, { recursive: true });
// Tailwind blue-500 #3B82F6
const rgb = [0x3b, 0x82, 0xf6];
fs.writeFileSync(path.join(out, "icon-192x192.png"), makeSolidPng(192, 192, ...rgb));
fs.writeFileSync(path.join(out, "icon-512x512.png"), makeSolidPng(512, 512, ...rgb));
console.log("PWA icons written to public/icons/");
