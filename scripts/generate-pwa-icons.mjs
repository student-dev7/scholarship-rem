/**
 * PWA / Apple Touch / 通知アイコン
 *
 * 任意の画像にする方法（どちらか）:
 * 1) public/icons/custom/icon-192x192.png と icon-512x512.png を置く → npm run icons:apply
 * 2) public/icons/custom/source.png（正方形・512px 以上推奨）を置く → npm run icons:apply
 *
 * 既に public/icons/icon-*.png がある場合は上書きしない（postinstall 時）。
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "../public/icons");
const customDir = path.join(iconsDir, "custom");
const out192 = path.join(iconsDir, "icon-192x192.png");
const out512 = path.join(iconsDir, "icon-512x512.png");

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
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function resizeFromSource(sourcePath) {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn(
      "[icons] sharp が未インストールです。192/512 を個別に public/icons/custom/ に置くか: npm i -D sharp"
    );
    return false;
  }
  await sharp(sourcePath)
    .resize(192, 192, { fit: "cover" })
    .png()
    .toFile(out192);
  await sharp(sourcePath)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(out512);
  return true;
}

function findCustomIcon(size) {
  const base = `icon-${size}x${size}`;
  const names = [
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
    `${base}.png.jpg`,
    `${base}.png.jpeg`,
    "source.png",
    "source.jpg",
    "source.jpeg",
    "source.webp",
  ];
  for (const name of names) {
    const p = path.join(customDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function writeIconFromFile(srcPath, destPath, size) {
  if (srcPath.toLowerCase().endsWith(".png") && !size) {
    fs.copyFileSync(srcPath, destPath);
    return;
  }
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    fs.copyFileSync(srcPath, destPath);
    return;
  }
  await sharp(srcPath)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(destPath);
}

async function applyCustomIcons({ force = false } = {}) {
  fs.mkdirSync(customDir, { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });

  const custom192 = findCustomIcon(192);
  const custom512 = findCustomIcon(512);
  const sourceOnly =
    !custom192 &&
    !custom512 &&
    ["source.png", "source.jpg", "source.jpeg", "source.webp"]
      .map((n) => path.join(customDir, n))
      .find((p) => fs.existsSync(p));

  if (custom192 && custom512) {
    if (force || !fs.existsSync(out192) || !fs.existsSync(out512)) {
      await writeIconFromFile(custom192, out192, 192);
      await writeIconFromFile(custom512, out512, 512);
    }
    console.log("[icons] applied custom icons → public/icons/icon-*.png");
    return true;
  }

  if (sourceOnly) {
    if (force || !fs.existsSync(out192) || !fs.existsSync(out512)) {
      const ok = await resizeFromSource(sourceOnly);
      if (ok) console.log("[icons] generated 192 & 512 from custom/source.*");
      return ok;
    }
    return true;
  }

  return false;
}

function writeDefaultsIfMissing() {
  if (fs.existsSync(out192) && fs.existsSync(out512)) {
    return false;
  }
  const rgb = [0x3b, 0x82, 0xf6];
  if (!fs.existsSync(out192)) {
    fs.writeFileSync(out192, makeSolidPng(192, 192, ...rgb));
  }
  if (!fs.existsSync(out512)) {
    fs.writeFileSync(out512, makeSolidPng(512, 512, ...rgb));
  }
  console.log("[icons] default blue placeholders written (replace via public/icons/custom/)");
  return true;
}

const force = process.argv.includes("--force");
const mode = process.env.PWA_ICONS_MODE || "postinstall";

async function main() {
  const applied = await applyCustomIcons({ force });
  if (!applied && (mode === "apply" || force)) {
    console.log(
      "[icons] no custom files in public/icons/custom/ — add icon-192x192.png & icon-512x512.png or source.png"
    );
  }
  if (!applied && !force) {
    writeDefaultsIfMissing();
  } else if (!applied && force) {
    writeDefaultsIfMissing();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
