import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// World News - 19 November 2026. Draws a 1024x1024 PNG with stdlib only.
// No network, no randomness, no timestamps: two runs give identical bytes.

const W = 1024;
const H = 1024;
const BG: [number, number, number] = [14, 16, 19];
const WHITE: [number, number, number] = [255, 255, 255];
const BODY: [number, number, number] = [200, 205, 212];
const MUTED: [number, number, number] = [140, 148, 158];
const RED: [number, number, number] = [212, 61, 42];
const GOLD: [number, number, number] = [232, 182, 76];
const LINE: [number, number, number] = [52, 58, 66];

// 5x7 bitmap font. Each glyph is 7 rows of 5 chars, "#" = on, "." = off.
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: [".....", ".....", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: [".....", ".....", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: [".....", ".....", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: [".....", ".....", "01111", "10001", "10001", "01111", "00001", "01110"].slice(0, 7),
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", ".....", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", ".....", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: [".....", ".....", "11010", "10101", "10101", "10101", "10101"],
  n: [".....", ".....", "11110", "10001", "10001", "10001", "10001"],
  o: [".....", ".....", "01110", "10001", "10001", "10001", "01110"],
  p: [".....", ".....", "11110", "10001", "10001", "11110", "10000"],
  q: [".....", ".....", "01111", "10001", "10001", "01111", "00001"],
  r: [".....", ".....", "10110", "11001", "10000", "10000", "10000"],
  s: [".....", ".....", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
  u: [".....", ".....", "10001", "10001", "10001", "10011", "01101"],
  v: [".....", ".....", "10001", "10001", "10001", "01010", "00100"],
  w: [".....", ".....", "10001", "10101", "10101", "10101", "01010"],
  x: [".....", ".....", "10001", "01010", "00100", "01010", "10001"],
  y: [".....", ".....", "10001", "10001", "01111", "00001", "01110"],
  z: [".....", ".....", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": [".....", ".....", ".....", ".....", ".....", "01100", "01100"],
  ",": [".....", ".....", ".....", ".....", "01100", "00100", "01000"],
  "-": [".....", ".....", ".....", "01110", ".....", ".....", "....."],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "'": ["00100", "00100", "01000", ".....", ".....", ".....", "....."],
  '"': ["01010", "01010", ".....", ".....", ".....", ".....", "....."],
  ":": [".....", "01100", "01100", ".....", "01100", "01100", "....."],
  ";": [".....", "01100", "01100", ".....", "01100", "00100", "01000"],
  "?": ["01110", "10001", "00001", "00110", "00100", ".....", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", ".....", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": [".....", "00100", "00100", "11111", "00100", "00100", "....."],
  "=": [".....", ".....", "11111", ".....", "11111", ".....", "....."],
  "*": [".....", "10101", "01110", "11111", "01110", "10101", "....."],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};

// Fix the 'g' glyph: give it a proper descender loop so it reads as
// "g" (not "q") in words like "genocide" and "agenda".
FONT["g"] = [".....", "01111", "10001", "10001", "01111", "00001", "01110"];

const buf = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  buf[i * 3] = BG[0];
  buf[i * 3 + 1] = BG[1];
  buf[i * 3 + 2] = BG[2];
}

function setPx(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  buf[o] = c[0];
  buf[o + 1] = c[1];
  buf[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
  }
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: [number, number, number]): void {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      const row = glyph[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur === "" ? word : cur + " " + word;
    if (textWidth(next, scale) <= maxWidth) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      // A single very long word: split it by characters.
      if (textWidth(word, scale) > maxWidth) {
        let part = "";
        for (const ch of word) {
          if (textWidth(part + ch, scale) <= maxWidth) part += ch;
          else {
            lines.push(part);
            part = ch;
          }
        }
        cur = part;
      } else {
        cur = word;
      }
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// --- PNG writer (deterministic, no tIME chunk) ---
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    Buffer.from(buf.buffer, buf.byteOffset + y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Content (facts fixed by the bounty brief) ---
const STORIES = [
  {
    headline: "Xi, Trump & Putin meet in Shenzhen",
    desc: "The first-ever trilateral summit opens at APEC today, with nuclear arms, the Iran war and Ukraine on the agenda.",
  },
  {
    headline: "World court rules on Myanmar genocide",
    desc: "The ICJ delivers its judgment in The Gambia v. Myanmar over the Rohingya - the first time it could find a state guilty of genocide.",
  },
  {
    headline: "GTA VI launches worldwide",
    desc: "After a 13-year wait, Rockstar's game rolls out at midnight everywhere - near 16m pre-orders, over $1.5bn in pre-sales, Metacritic 99.",
  },
  {
    headline: "US-Iran war widens in the Gulf",
    desc: "US forces hit a missile site on Qeshm Island; Iran strikes a US base in Kuwait and again in Bahrain.",
  },
  {
    headline: "EU proposes 45bn euro Ukraine loan",
    desc: "Brussels plans a loan to cover Kyiv's budget gap, to be repaid once Russia pays war reparations.",
  },
  {
    headline: "Jeffries set to be first Black Speaker",
    desc: "Democrats nominate Hakeem Jeffries to lead the US House - a first for an African-American.",
  },
];

const ALSO =
  "Voyager 1 reaches one light-day from Earth - Nvidia chief Jensen Huang resigns - Cyclone Akvan nears India's east coast - Fed minutes point to more rate hikes.";

// --- Layout ---
const MX = 56;
const TX = 128; // text column x (after the red number)
const TW = W - TX - MX; // 840

// Header
drawText(MX, 38, "T H E   W O R L D   I N   O N E   D A Y", 2, GOLD);
drawText(MX, 66, "World News", 8, WHITE);
drawText(MX, 130, "19 November 2026", 8, WHITE);
drawText(MX, 198, "THURSDAY - TOP STORIES FROM AROUND THE GLOBE", 2, MUTED);
fillRect(MX, 226, W - 2 * MX, 5, RED);

let y = 252;
for (let i = 0; i < STORIES.length; i++) {
  const s = STORIES[i];
  drawText(MX, y, String(i + 1), 5, RED);
  const headLines = wrapText(s.headline, TW, 3);
  let hy = y;
  for (const line of headLines) {
    drawText(TX, hy, line, 3, WHITE);
    hy += 28;
  }
  const descLines = wrapText(s.desc, TW, 2);
  let dy = hy + 4;
  for (const line of descLines) {
    drawText(TX, dy, line, 2, BODY);
    dy += 20;
  }
  y = dy + 14;
  if (i < STORIES.length - 1) {
    fillRect(TX, y, TW, 1, LINE);
    y += 15;
  }
}

// Also line
fillRect(MX, y, W - 2 * MX, 1, LINE);
y += 18;
drawText(MX, y, "Also:", 2, GOLD);
const alsoLines = wrapText(ALSO, W - 2 * MX - textWidth("Also: ", 2), 2);
let ay = y;
for (const line of alsoLines) {
  drawText(MX + textWidth("Also: ", 2), ay, line, 2, BODY);
  ay += 20;
}
y = ay + 16;

// Sources footer
drawText(MX, y, "SOURCES: REUTERS - AP - AFP - BBC - AL JAZEERA", 2, MUTED);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const png = encodePng();
writeFileSync(join(outDir, "entry.png"), png);
console.log(`Wrote ${join(outDir, "entry.png")} (${png.length} bytes, ${W}x${H})`);
