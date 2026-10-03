// Generates PWA icons + favicon as PNGs — pure Node (zlib built-in), no image deps.
// Logo: two architectural blocks forming a subtle "C" on a black rounded square.
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function inRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r;
  if (x >= w - r && y < r) return (x - (w - r)) ** 2 + (y - r) ** 2 <= r * r;
  if (x < r && y >= h - r) return (x - r) ** 2 + (y - (h - r)) ** 2 <= r * r;
  if (x >= w - r && y >= h - r) return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r * r;
  return true;
}

function drawLogo(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = size / 32; // design on a 32px grid
  const set = (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
  };
  const dark = [10, 10, 10];
  const white = [255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // background: rounded square (28px radius on 32 grid)
      const inBg = inRoundedRect(x / s, y / s, 32, 32, 7.2);
      if (!inBg) { set(x, y, 0, 0, 0, 0); continue; }
      set(x, y, ...dark);

      // blocks (design coords): top rect 9,9 14x5.5 r1.2; bottom 9,17.5 14x5.5; spine 9,12.6 4.6x6.8
      const dx = x / s, dy = y / s;
      const inRect = (rx, ry, rw, rh, rr) =>
        dx >= rx && dx <= rx + rw && dy >= ry && dy <= ry + rh &&
        inRoundedRect(dx - rx, dy - ry, rw, rh, rr);

      const inTop = inRect(9, 9, 14, 5.5, 1.2);
      const inBottom = inRect(9, 17.5, 14, 5.5, 1.2);
      const inSpine = inRect(9, 12.6, 4.6, 6.8, 0);
      if (inTop || inBottom || inSpine) set(x, y, ...white);
    }
  }
  return encodePNG(size, size, rgba);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, drawLogo(size));
  console.log(`icon-${size}.png written`);
}
writeFileSync("public/icon-512-maskable.png", drawLogo(512));
console.log("maskable written");
// favicon-ish sizes in root for app icon + apple icon
writeFileSync("app/icon.png", drawLogo(64));
writeFileSync("app/apple-icon.png", drawLogo(180));
console.log("app icons written");
