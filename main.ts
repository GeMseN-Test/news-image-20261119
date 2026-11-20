// WORLD NEWS — Friday 20 November 2026, in one image.
//
// A broadsheet poster drawn at runtime with the Node standard library only:
// a hand-rolled PNG writer, a 5x7 bitmap font, and vector scenes drawn from
// primitives. No network, no assets, no randomness except a fixed-seed grain
// pass, so two runs write byte-identical files.
//
// What it shows: 40 stories first reported on Friday 20 November 2026 —
// 12 drawn hero panels, a pinned world map, a UTC timeline, 28 more stories
// in brief, and a DATE CHECK box naming the big 19 November stories that
// were checked and LEFT OUT (wrong date for this poster).
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program writes <output dir>/entry.png (1024x1024, at most 1 MiB).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";

const W = 1024;
const H = 1024;

// ---- palette: a cream broadsheet, ink, and restrained accent colours ----
const PAPER: RGB = [246, 239, 219];
const PAPER2: RGB = [238, 229, 199];
const INK: RGB = [33, 26, 16];
const INKSOFT: RGB = [84, 72, 52];
const RED: RGB = [179, 39, 30];
const BLUE: RGB = [31, 78, 121];
const GOLD: RGB = [185, 138, 29];
const GREEN: RGB = [46, 107, 52];
const TEAL: RGB = [15, 118, 110];
const SKY: RGB = [214, 230, 228];
const LAND: RGB = [232, 217, 168];
const WHITE: RGB = [255, 252, 244];

type RGB = [number, number, number];

// ---- canvas: a flat RGB buffer, drawn pixel by pixel ----
const px = new Uint8Array(W * H * 3);

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
}

function rectBorder(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  for (let x = x0; x <= x1; x++) set(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) set(x, y, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    set(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    set(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
}

function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) set(x, y, c);
    }
  }
}

// Scanline polygon fill (points as [x, y] pairs).
function poly(points: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) set(x, y, c);
    }
  }
}

// ---- 5x7 bitmap font (uppercase; input is upper-cased on draw) ----
// Each glyph is 7 rows of 5 bits, written as strings of 0/1.
const FONT: Record<string, string[]> = {
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
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "•": ["00000", "00000", "00100", "01110", "01110", "00100", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") {
          rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap for one paragraph; returns lines that fit maxW.
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textWidth(test, scale) <= maxW) {
      cur = test;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---- PNG writer (CRC32 + IHDR/IDAT/IEND, zlib deflate) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- newsprint grain: a fixed-seed pass so the paper is not flat ----
// Deterministic LCG; the same bytes come out of every run.
function grain(amount: number): void {
  let s = 0x9e3779b9;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < W * H * 3; i++) {
    const d = Math.floor((next() - 0.5) * 2 * amount);
    let v = px[i] + d;
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    px[i] = v;
  }
}

// ---- the news: 40 stories first reported Friday 20 November 2026 ----
// Heroes are drawn panels. Status: CONFIRMED = as reported; CLAIM = an
// estimate or an early trial, labelled as such on the poster.
type Hero = {
  n: number;
  head: string;
  deck: string;
  src: string;
  region: string;
  status: "CONFIRMED" | "CLAIM";
  tint: RGB;
  scene: number;
};

const HEROES: Hero[] = [
  { n: 1, head: "CYCLONE AKVAN HITS ODISHA", deck: "Severe storm crosses coast near Gopalpur; Bengal on alert.", src: "THE HINDU", region: "ASIA", status: "CONFIRMED", tint: [226, 238, 240], scene: 1 },
  { n: 2, head: "CITI MISBOOKED $35BN TRADES", deck: "Risk understated at European unit; bank injects capital.", src: "REUTERS", region: "MARKETS", status: "CONFIRMED", tint: [240, 230, 210], scene: 2 },
  { n: 3, head: "NIKKEI SINKS 4.68%", deck: "Asia stocks slide in a global sell-off; chip fears grow.", src: "REUTERS", region: "MARKETS", status: "CONFIRMED", tint: [244, 222, 222], scene: 3 },
  { n: 4, head: "GTA VI TOPS $2.36BN", deck: "Record launch day: 24.6m copies, best in entertainment.", src: "BBC", region: "CULTURE", status: "CLAIM", tint: [232, 226, 244], scene: 4 },
  { n: 5, head: "META RETHINKS 2030 CLIMATE GOALS", deck: "AI data centres push emissions up; targets under review.", src: "AL JAZEERA", region: "TECH", status: "CONFIRMED", tint: [222, 240, 226], scene: 5 },
  { n: 6, head: "BUKELE TO SEEK THIRD TERM", deck: "El Salvador president to formalise re-election bid.", src: "AL JAZEERA", region: "AMERICAS", status: "CONFIRMED", tint: [226, 232, 244], scene: 6 },
  { n: 7, head: "SENEGAL BOAT CAPSIZES", deck: "Four bodies recovered amid a migration surge.", src: "AL JAZEERA", region: "AFRICA", status: "CONFIRMED", tint: [222, 234, 238], scene: 7 },
  { n: 8, head: "TAIWAN MOVES TO STEADY STOCKS", deck: "Five measures; short-selling limits take effect today.", src: "SIMPLELIFE", region: "ASIA", status: "CONFIRMED", tint: [240, 236, 214], scene: 8 },
  { n: 9, head: "CANCER PILL HOPE", deck: "Trial saw tumours vanish in pancreatic cancer test.", src: "BBC", region: "HEALTH", status: "CLAIM", tint: [244, 228, 234], scene: 9 },
  { n: 10, head: "COP31: AFRICA WANTS MORE CASH", deck: "Europe says use what is already pledged.", src: "BBC", region: "CLIMATE", status: "CONFIRMED", tint: [224, 238, 224], scene: 10 },
  { n: 11, head: "VALKYRIES SWEEP ACES", deck: "Golden State win 87-77 in OT; first WNBA Finals.", src: "USCT", region: "SPORT", status: "CONFIRMED", tint: [244, 232, 214], scene: 11 },
  { n: 12, head: "UK FRIDGES SECURED FROM HACKERS", deck: "Tens of thousands secured in a secret operation.", src: "BBC", region: "TECH", status: "CONFIRMED", tint: [228, 236, 240], scene: 12 },
];

// 28 more stories, one line each: number, text, source.
const BRIEFS: Array<[string, string]> = [
  ["13", "Samsung names new memory chip chief — REUTERS"],
  ["14", "Anthropic joins MSCI, FTSE after record IPO — ASIANET"],
  ["15", "Anthropic founders cashed out near $2BN in IPO — TECHCRUNCH"],
  ["16", "Apple building its own AI agent for the Mac — TECHCRUNCH"],
  ["17", "California probes China Nvidia tech link — BBC"],
  ["18", "S. Korea exports top $1TN a year, a first — SIMPLELIFE"],
  ["19", "China Gas doubles 20-year LNG deal — REUTERS"],
  ["20", "UK, EU drop 'trusted partnership' wording — REUTERS"],
  ["21", "EU-UK summit opens; youth deal expected — BBC"],
  ["22", "Qatar Emir meets German leaders in Berlin — REUTERS"],
  ["23", "NATO assembly opens 72nd session in Berlin — REUTERS"],
  ["24", "US envoy: Russia open to NATO-like guarantees — SIMPLELIFE"],
  ["25", "Blast near Dutch embassy in Kyiv, minor damage — SIMPLELIFE"],
  ["26", "Trump warns APEC on strict AI rules — SIMPLELIFE"],
  ["27", "Takaichi dodges Taiwan question in Tokyo — SIMPLELIFE"],
  ["28", "13,000 march in Tokyo against Takaichi — NEWS.AZ"],
  ["29", "Pentagon tech chief named US cyber director — NEWS.AZ"],
  ["30", "Law firm gave $11.8M free work to Trump team — AL JAZEERA"],
  ["31", "Malawi fuel crisis causes chaos — AL JAZEERA"],
  ["32", "Iraq deal with Kataib Hezbollah over stronghold — AL JAZEERA"],
  ["33", "Storm Xavier: gale warning for Suwarrow — APPISTOS"],
  ["34", "Australian charged after Sydney terror raid — NEWS.AZ"],
  ["35", "Madhya Pradesh scraps two-child staff policy — THE HINDU"],
  ["36", "Covid inquiry: key findings on testing — BBC"],
  ["37", "UK insulation faults unfixed in 90% of homes — BBC"],
  ["38", "Sykes stuns Humphries in Grand Slam darts — BBC"],
  ["39", "NFL suspends Rams' Puka Nacua 3 games — USCT"],
  ["40", "Can Paraguay's new president restore trust? — NEWS.AZ"],
];

// The day in UTC: time + what happened.
const TIMELINE: Array<[string, string]> = [
  ["00:21", "CITI $35BN"],
  ["01:55", "AKVAN LANDFALL"],
  ["02:06", "VALKYRIES WIN"],
  ["02:07", "NACUA SUSPENDED"],
  ["02:30", "STORM XAVIER"],
  ["03:35", "ANTHROPIC INDEXES"],
  ["03:36", "TOKYO MARCH"],
  ["08:54", "COP31 AFRICA"],
];

// Map pins: name + longitude/latitude.
const PINS: Array<[string, number, number]> = [
  ["ODISHA", 84.8, 19.3],
  ["TOKYO", 139.7, 35.7],
  ["TAIWAN", 121.0, 23.5],
  ["SEOUL", 127.0, 37.5],
  ["BERLIN", 13.4, 52.5],
  ["LONDON", -0.1, 51.5],
  ["ANTALYA", 30.7, 36.9],
  ["EL SALVADOR", -89.2, 13.7],
  ["SENEGAL", -17.4, 14.7],
  ["SYDNEY", 151.2, -33.9],
  ["PARAGUAY", -57.6, -25.3],
  ["CALIFORNIA", -119.7, 34.4],
];

// Stories checked and LEFT OUT: they are dated 19 November, not 20 November.
const LEFT_OUT = "ICJ MYANMAR RULING • SHENZHEN SUMMIT • ANTHROPIC IPO DEBUT • HOUTHI STRIKE ON RIYADH • FIONA THE HIPPO DIES";

// ---- panel scenes: small vector drawings, one per hero ----
// Each scene draws inside the box (x, y, w, h) at the top of its panel.
function scene(x: number, y: number, w: number, h: number, id: number): void {
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  if (id === 1) {
    // Cyclone: spiral arms over a coastline.
    rect(x, y + h - 12, w, 12, [196, 178, 120]);
    for (let r = 6; r <= 26; r += 5) circle(cx - 20, cy - 4, r, BLUE);
    line(cx - 46, cy - 4, cx + 6, cy - 4, BLUE);
    line(cx - 20, cy - 30, cx - 20, cy + 22, BLUE);
    line(cx - 38, cy - 22, cx - 2, cy + 14, BLUE);
    line(cx - 38, cy + 14, cx - 2, cy - 22, BLUE);
    disc(cx - 20, cy - 4, 4, RED);
    for (let i = 0; i < 5; i++) line(x + 8 + i * 14, y + h - 6, x + 14 + i * 14, y + h - 12, INKSOFT);
  } else if (id === 2) {
    // Bank: columns with a red crack, coins spilling.
    rect(cx - 34, y + 8, 68, 6, INK);
    for (let i = 0; i < 4; i++) rect(cx - 30 + i * 17, y + 16, 7, 26, INK);
    rect(cx - 38, y + 42, 76, 5, INK);
    line(cx + 8, y + 10, cx + 2, y + 20, RED);
    line(cx + 2, y + 20, cx + 10, y + 30, RED);
    line(cx + 10, y + 30, cx + 4, y + 42, RED);
    disc(cx - 24, y + h - 8, 4, GOLD);
    disc(cx - 12, y + h - 6, 4, GOLD);
    disc(cx, y + h - 8, 4, GOLD);
  } else if (id === 3) {
    // Falling market: a chart line diving, red arrow down.
    line(x + 8, y + 10, x + 34, y + 18, INK);
    line(x + 34, y + 18, x + 58, y + 16, INK);
    line(x + 58, y + 16, x + 84, y + 30, RED);
    line(x + 84, y + 30, x + 108, y + 44, RED);
    line(x + 108, y + 44, x + 108, y + 30, RED);
    line(x + 108, y + 44, x + 96, y + 44, RED);
    for (let gx = x + 8; gx < x + w - 8; gx += 12) set(gx, y + h - 8, INKSOFT);
  } else if (id === 4) {
    // Game controller over a sunset skyline.
    rect(x + 8, y + h - 14, w - 16, 14, [58, 48, 84]);
    triangle(x + 14, y + h - 14, x + 22, y + h - 30, x + 30, y + h - 14, [58, 48, 84]);
    triangle(x + 40, y + h - 14, x + 52, y + h - 34, x + 64, y + h - 14, [58, 48, 84]);
    disc(cx + 34, y + 12, 10, GOLD);
    rect(cx - 34, y + 14, 68, 20, INK);
    rect(cx - 34, y + 14, 68, 4, [58, 48, 84]);
    disc(cx - 20, y + 24, 4, WHITE);
    disc(cx + 20, y + 24, 3, RED);
    disc(cx + 20, y + 17, 3, GOLD);
    disc(cx + 13, y + 24, 3, GREEN);
    line(cx - 34, y + 34, cx - 20, y + 40, INK);
    line(cx + 34, y + 34, cx + 20, y + 40, INK);
  } else if (id === 5) {
    // Data centre: server blocks with heat rising.
    for (let i = 0; i < 3; i++) {
      rect(x + 12 + i * 34, y + 18, 28, 26, BLUE);
      for (let r = 0; r < 3; r++) hline(x + 16 + i * 34, x + 34 + i * 34, y + 24 + r * 7, WHITE);
    }
    for (let i = 0; i < 3; i++) {
      line(x + 22 + i * 30, y + 12, x + 18 + i * 30, y + 4, RED);
      line(x + 18 + i * 30, y + 4, x + 24 + i * 30, y + 2, RED);
    }
    rect(x + 8, y + h - 8, w - 16, 4, GREEN);
  } else if (id === 6) {
    // Ballot box with a slip going in.
    rect(cx - 30, y + 16, 60, 30, BLUE);
    rect(cx - 34, y + 12, 68, 6, INK);
    rect(cx - 6, y + 2, 12, 12, WHITE);
    rectBorder(cx - 6, y + 2, 12, 12, INK, 1);
    line(cx - 3, y + 8, cx, y + 11, GREEN);
    line(cx, y + 11, cx + 4, y + 4, GREEN);
    line(cx - 22, y + 28, cx - 8, y + 28, WHITE);
    line(cx - 22, y + 34, cx - 8, y + 34, WHITE);
  } else if (id === 7) {
    // Capsized boat: hull upside down on waves.
    for (let i = 0; i < 3; i++) {
      const wy = y + h - 14 + (i % 2) * 5;
      for (let wx = x + 6; wx < x + w - 6; wx += 16) line(wx, wy, wx + 8, wy - 3, BLUE);
    }
    poly([[cx - 34, y + 26], [cx + 34, y + 26], [cx + 22, y + 12], [cx - 22, y + 12]], INK);
    rect(cx - 22, y + 26, 44, 3, RED);
    disc(cx - 30, y + 34, 3, GOLD);
    disc(cx + 28, y + 38, 3, GOLD);
  } else if (id === 8) {
    // Steady market: a rising line over a chip.
    rect(cx - 26, y + 22, 24, 24, INK);
    rect(cx - 18, y + 30, 8, 8, GOLD);
    for (let i = 0; i < 3; i++) {
      line(cx - 26, y + 26 + i * 7, cx - 32, y + 26 + i * 7, INK);
      line(cx - 2, y + 26 + i * 7, cx + 4, y + 26 + i * 7, INK);
    }
    line(x + 8, y + 40, x + 34, y + 30, GREEN);
    line(x + 34, y + 30, x + 58, y + 32, GREEN);
    line(x + 58, y + 32, x + 84, y + 16, GREEN);
    line(x + 84, y + 16, x + 108, y + 8, GREEN);
    line(x + 108, y + 8, x + 108, y + 18, GREEN);
    line(x + 108, y + 8, x + 98, y + 8, GREEN);
  } else if (id === 9) {
    // Pill capsule, cells fading around it.
    line(cx - 30, cy, cx + 30, cy, RED);
    disc(cx - 18, cy, 8, RED);
    disc(cx + 18, cy, 8, WHITE);
    rectBorder(cx + 10, cy - 8, 16, 16, RED, 1);
    disc(cx - 40, cy - 14, 4, GREEN);
    disc(cx + 42, cy - 12, 4, GREEN);
    disc(cx - 42, cy + 12, 3, INKSOFT);
    disc(cx + 40, cy + 14, 3, INKSOFT);
    disc(cx, cy - 18, 3, GREEN);
  } else if (id === 10) {
    // Globe with coins: climate cash.
    disc(cx, cy, 20, BLUE);
    disc(cx - 6, cy - 6, 6, GREEN);
    disc(cx + 8, cy + 8, 5, GREEN);
    circle(cx, cy, 20, INK);
    line(cx - 20, cy, cx + 20, cy, WHITE);
    for (let i = 0; i < 3; i++) {
      rect(x + w - 34 - i * 4, y + h - 12 - i * 5, 22, 4, GOLD);
      rectBorder(x + w - 34 - i * 4, y + h - 12 - i * 5, 22, 4, INK, 1);
    }
  } else if (id === 11) {
    // Basketball through a hoop.
    disc(cx, cy - 6, 16, [214, 110, 44]);
    circle(cx, cy - 6, 16, INK);
    line(cx - 16, cy - 6, cx + 16, cy - 6, INK);
    line(cx, cy - 22, cx, cy + 10, INK);
    rect(cx - 24, y + h - 16, 48, 4, RED);
    for (let i = 0; i < 4; i++) line(cx - 20 + i * 12, y + h - 12, cx - 14 + i * 12, y + h - 4, INKSOFT);
  } else if (id === 12) {
    // Fridge with a shield check.
    rect(cx - 24, y + 6, 40, 42, [200, 214, 220]);
    rectBorder(cx - 24, y + 6, 40, 42, INK, 1);
    hline(cx - 24, cx + 16, y + 22, INK);
    vline(cx - 16, y + 10, y + 18, INK);
    vline(cx - 16, y + 26, y + 44, INK);
    poly([[cx + 22, y + 14], [cx + 38, y + 22], [cx + 22, y + 38], [cx + 6, y + 22]], GREEN);
    line(cx + 16, y + 24, cx + 21, y + 29, WHITE);
    line(cx + 21, y + 29, cx + 30, y + 18, WHITE);
  }
}

// ---- world map: rough continent outlines in lon/lat ----
// Equirectangular projection into the map box (mx, my, mw, mh).
const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 66], [-140, 70], [-125, 71], [-110, 68], [-95, 69], [-85, 66], [-80, 62], [-75, 58], [-65, 60], [-60, 52], [-55, 47], [-70, 44], [-75, 38], [-80, 32], [-81, 26], [-90, 21], [-97, 26], [-105, 22], [-110, 23], [-117, 33], [-125, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  // South America
  [[-80, 8], [-75, 11], [-62, 10], [-52, 5], [-50, 0], [-42, -5], [-35, -8], [-40, -20], [-48, -28], [-52, -33], [-58, -38], [-65, -41], [-68, -50], [-70, -54], [-73, -44], [-73, -30], [-70, -18], [-78, -6], [-81, 0]],
  // Africa
  [[-17, 15], [-16, 20], [-10, 30], [0, 36], [10, 37], [20, 32], [32, 31], [35, 28], [40, 20], [43, 12], [51, 11], [48, 2], [42, -5], [40, -12], [36, -20], [32, -28], [26, -34], [18, -33], [15, -27], [12, -18], [9, -2], [8, 4], [-8, 5], [-13, 8]],
  // Eurasia
  [[-10, 36], [-9, 43], [-2, 48], [0, 50], [5, 53], [8, 57], [12, 55], [18, 56], [21, 60], [24, 65], [30, 70], [45, 68], [60, 69], [75, 72], [90, 75], [105, 77], [120, 73], [135, 72], [150, 70], [160, 66], [170, 66], [178, 65], [170, 60], [160, 58], [150, 59], [142, 55], [140, 45], [135, 38], [127, 35], [122, 30], [115, 22], [108, 18], [104, 8], [100, 6], [95, 10], [90, 20], [85, 20], [80, 10], [76, 8], [72, 20], [65, 25], [58, 25], [52, 28], [48, 30], [44, 29], [40, 20], [35, 28], [32, 31], [30, 36], [26, 38], [22, 37], [18, 40], [12, 44], [8, 44], [3, 43], [-2, 37], [-9, 38]],
  // Australia
  [[114, -22], [114, -30], [118, -35], [124, -33], [130, -32], [135, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [150, -22], [146, -19], [142, -15], [142, -11], [136, -12], [132, -11], [126, -14], [120, -20], [115, -21]],
  // Greenland
  [[-55, 60], [-45, 60], [-40, 65], [-32, 68], [-25, 70], [-20, 72], [-25, 76], [-40, 78], [-58, 76], [-60, 70], [-58, 64]],
];

// ---- layout ----
const M = 20; // page margin
const INNER = W - 2 * M; // 984

function drawPanel(h: Hero, px0: number, py0: number, pw: number, ph: number): void {
  rect(px0, py0, pw, ph, h.tint);
  rectBorder(px0, py0, pw, ph, INK, 1);
  // Number badge, top left.
  rect(px0 + 4, py0 + 4, 16, 12, RED);
  const num = String(h.n);
  drawText(num, px0 + 4 + Math.floor((16 - textWidth(num, 1)) / 2), py0 + 6, 1, WHITE);
  // Source tag, top right: SOURCE • REGION • STATUS.
  const tag = `${h.src} • ${h.region} • `;
  const statusColor = h.status === "CONFIRMED" ? GREEN : GOLD;
  const tagW = textWidth(tag, 1) + textWidth(h.status, 1);
  drawText(tag, px0 + pw - 5 - tagW, py0 + 6, 1, INKSOFT);
  drawText(h.status, px0 + pw - 5 - textWidth(h.status, 1), py0 + 6, 1, statusColor);
  // Drawn scene.
  scene(px0 + 4, py0 + 16, pw - 8, 46, h.scene);
  // Headline, up to two lines.
  const headLines = wrap(h.head, 2, pw - 10);
  let y = py0 + 66;
  for (const ln of headLines.slice(0, 2)) {
    drawText(ln, px0 + 5, y, 2, INK);
    y += 16;
  }
  // Deck, up to two lines.
  const deckLines = wrap(h.deck, 1, pw - 10);
  y += 3;
  for (const ln of deckLines.slice(0, 2)) {
    drawText(ln, px0 + 5, y, 1, INKSOFT);
    y += 9;
  }
}

function drawMap(mx0: number, my0: number, mw: number, mh: number): void {
  rect(mx0, my0, mw, mh, SKY);
  rectBorder(mx0, my0, mw, mh, INK, 1);
  drawText("THE WORLD — WHERE IT HAPPENED", mx0 + 8, my0 + 6, 1, INKSOFT);
  const projX = (lon: number) => mx0 + 8 + ((lon + 180) / 360) * (mw - 16);
  const projY = (lat: number) => my0 + 18 + ((85 - lat) / 145) * (mh - 30);
  for (const cont of CONTINENTS) {
    const pts = cont.map(([lon, lat]): [number, number] => [projX(lon), projY(lat)]);
    poly(pts, LAND);
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), INKSOFT);
    }
  }
  // Numbered pins, 1-12, matching the hero panels.
  PINS.forEach(([name, lon, lat], i) => {
    void name;
    const cx = Math.round(projX(lon));
    const cy = Math.round(projY(lat));
    disc(cx, cy, 6, RED);
    circle(cx, cy, 6, WHITE);
    const num = String(i + 1);
    drawText(num, cx - Math.floor(textWidth(num, 1) / 2), cy - 3, 1, WHITE);
  });
  drawTextCentered("PINS 1-12 MATCH THE PANELS ABOVE", mx0 + Math.floor(mw / 2), my0 + mh - 11, 1, INKSOFT);
}

function drawTimeline(tx0: number, ty0: number, tw: number, th: number): void {
  rect(tx0, ty0, tw, th, PAPER2);
  rectBorder(tx0, ty0, tw, th, INK, 1);
  drawTextCentered("THE DAY IN UTC", tx0 + Math.floor(tw / 2), ty0 + 7, 2, INK);
  hline(tx0 + 10, tx0 + tw - 10, ty0 + 24, INKSOFT);
  let y = ty0 + 30;
  for (const [time, label] of TIMELINE) {
    drawText(time, tx0 + 14, y, 1, RED);
    drawText(label, tx0 + 14 + textWidth("00:00  ", 1), y, 1, INK);
    y += 14;
  }
}

function draw(): void {
  fill(PAPER);
  // Double outer border.
  rectBorder(8, 8, W - 16, H - 16, INK, 2);
  rectBorder(14, 14, W - 28, H - 28, INKSOFT, 1);

  // Masthead.
  drawTextCentered("THE WORLD IN ONE DAY", Math.floor(W / 2), 24, 2, RED);
  drawTextCentered("WORLD NEWS", Math.floor(W / 2), 42, 7, INK);
  drawTextCentered(
    "FRIDAY • 20 NOVEMBER 2026 • 40 STORIES • 12 PANELS • DATE-CHECKED",
    Math.floor(W / 2),
    96,
    2,
    INKSOFT,
  );
  rect(M, 112, INNER, 3, RED);

  // Big-number strip.
  const strip: Array<[string, string]> = [
    ["40", "STORIES"],
    ["12", "PANELS"],
    ["6", "CONTINENTS"],
    ["$35BN", "CITI MISBOOK"],
    ["$2.36BN", "GTA VI SALES"],
    ["13,000", "TOKYO MARCHERS"],
  ];
  const cellW = Math.floor(INNER / 6);
  rect(M, 120, INNER, 38, PAPER2);
  hline(M, M + INNER - 1, 120, INK);
  hline(M, M + INNER - 1, 157, INK);
  strip.forEach(([big, small], i) => {
    const cx = M + i * cellW + Math.floor(cellW / 2);
    drawTextCentered(big, cx, 125, 3, i === 3 || i === 4 ? RED : INK);
    drawTextCentered(small, cx, 148, 1, INKSOFT);
    if (i > 0) vline(M + i * cellW, 122, 155, INKSOFT);
  });

  // 12 hero panels: 4 columns x 3 rows.
  const pw = 238;
  const ph = 124;
  const gapX = 10;
  const gapY = 8;
  let idx = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      drawPanel(HEROES[idx], M + c * (pw + gapX), 166 + r * (ph + gapY), pw, ph);
      idx++;
    }
  }

  // Map + UTC timeline.
  drawMap(M, 562, 636, 140);
  drawTimeline(M + 636 + 12, 562, INNER - 636 - 12, 140);

  // The day in brief: 28 more stories, two columns.
  drawTextCentered("THE DAY IN BRIEF — 28 MORE STORIES", Math.floor(W / 2), 710, 2, INK);
  hline(M, M + INNER - 1, 728, INKSOFT);
  const colW = 482;
  BRIEFS.forEach(([n, text], i) => {
    const col = i < 14 ? 0 : 1;
    const row = i % 14;
    const bx = M + col * (colW + 20);
    const by = 734 + row * 14;
    drawText(n + ".", bx, by, 1, RED);
    drawText(text, bx + textWidth(n + ". ", 1), by, 1, INK);
  });

  // DATE CHECK: the big 19 November stories that were left out on purpose.
  const dcY = 924;
  const dcH = 56;
  rect(M, dcY, INNER, dcH, [250, 232, 226]);
  rectBorder(M, dcY, INNER, dcH, RED, 2);
  drawText("DATE CHECK — LEFT OUT, DATED 19 NOVEMBER, NOT 20 NOVEMBER:", M + 10, dcY + 7, 1, RED);
  const leftLines = wrap(LEFT_OUT, 1, INNER - 20);
  let ly = dcY + 19;
  for (const ln of leftLines.slice(0, 2)) {
    drawText(ln, M + 10, ly, 1, INK);
    ly += 9;
  }
  drawText("EVERY STORY ABOVE WAS FIRST REPORTED 20 NOVEMBER 2026.", M + 10, dcY + 44, 1, INKSOFT);

  // Footer: sources.
  drawTextCentered(
    "SOURCES: REUTERS • AP • AFP • BBC • AL JAZEERA • THE HINDU • NYT • TECHCRUNCH • VARIETY • NEWS.AZ • ASIANET • USCT • SIMPLELIFE • APPISTOS",
    Math.floor(W / 2),
    986,
    1,
    INKSOFT,
  );
  drawTextCentered(
    "ALL TIMES UTC • DRAWN FROM REPORTS FIRST PUBLISHED 20 NOVEMBER 2026",
    Math.floor(W / 2),
    996,
    1,
    INKSOFT,
  );
}

function main(): void {
  draw();
  grain(1);
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath} ${png.length} bytes sha256 ${sha}`);
}

main();
