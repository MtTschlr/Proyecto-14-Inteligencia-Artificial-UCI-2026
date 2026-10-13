import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(root, { recursive: true });

const N = 32;
const PAL = {
  o: '#2b0b10',
  R: '#8c1423',
  r: '#c8222f',
  l: '#e8454a',
  h: '#ffd9d2',
  b: '#6a3e1d',
  G: '#2e6b3a',
  g: '#5fa24a',
  L: '#9bd05a',
  Y: '#e09b14',
  y: '#ffd24a',
  w: '#fff6c2',
  a: '#8a5a00',
};

const grid = Array.from({ length: N }, () => Array(N).fill('.'));
const put = (x, y, c) => {
  if (x >= 0 && y >= 0 && x < N && y < N) grid[y][x] = c;
};

const heart = (x, y) => {
  const u = (x + 0.5 - 16) / 9.8;
  const v = -(y + 0.5 - 19.6) / 9.2 + 0.08;
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
};

const body = [];
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (heart(x, y)) body.push([x, y]);
  }
}
const inBody = new Set(body.map(([x, y]) => `${x},${y}`));
const isBody = (x, y) => inBody.has(`${x},${y}`);

for (let x = 0; x < N; x++) {
  for (let y = 0; y < N; y++) {
    if (isBody(x, y)) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isBody(x + dx, y + dy));
    if (near) put(x, y, 'o');
  }
}

for (const [x, y] of body) {
  const d = Math.hypot(x - 10.5, y - 15);
  let c = 'r';
  if (d < 1.6) c = 'h';
  else if (d < 4.4) c = 'l';
  else if (d > 15.5) c = 'R';
  else if (d > 13.2 && (x + y) % 2 === 0) c = 'R';
  put(x, y, c);
}
put(12, 12, 'h');
put(11, 11, 'h');

[[16, 9], [16, 8], [16, 7], [16, 6]].forEach(([x, y]) => put(x, y, 'b'));
[[15, 8], [15, 9], [17, 8], [17, 9]].forEach(([x, y]) => put(x, y, 'o'));
[[18, 7], [19, 7], [20, 7], [21, 7], [22, 8], [23, 8], [19, 8], [20, 8], [21, 8], [22, 9]].forEach(([x, y]) => put(x, y, 'g'));
[[19, 7], [20, 7], [21, 7]].forEach(([x, y]) => put(x, y, 'L'));
[[18, 8], [18, 9], [19, 9], [20, 9], [21, 9], [23, 9], [24, 8], [22, 6], [23, 7]].forEach(([x, y]) => put(x, y, 'G'));

const ring = [
  [10, 0, 21, 'a'],
  [9, 1, 22, 'a'],
  [8, 2, 23, 'a'],
  [8, 3, 23, 'a'],
  [9, 4, 22, 'a'],
  [10, 5, 21, 'a'],
];
ring.forEach(([x0, y, x1, c]) => { for (let x = x0; x <= x1; x++) put(x, y, c); });
for (let x = 10; x <= 21; x++) put(x, 1, 'w');
for (let x = 9; x <= 22; x++) put(x, 2, 'y');
for (let x = 9; x <= 22; x++) put(x, 3, 'Y');
for (let x = 10; x <= 21; x++) put(x, 4, 'Y');
for (let x = 11; x <= 20; x++) put(x, 2, '.');
for (let x = 11; x <= 20; x++) put(x, 3, '.');
for (let x = 11; x <= 20; x++) put(x, 4, 'Y');
for (let x = 11; x <= 20; x++) put(x, 3, '.');
for (let x = 10; x <= 21; x++) put(x, 5, 'a');
put(9, 3, 'Y'); put(22, 3, 'Y');
put(8, 2, 'a'); put(23, 2, 'a');
put(10, 3, 'Y'); put(21, 3, 'Y');
put(10, 2, 'y'); put(21, 2, 'y');

const spark = (cx, cy) => {
  put(cx, cy, 'w');
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => put(cx + dx, cy + dy, 'y'));
};
spark(4, 9);
spark(28, 14);
spark(3, 21);
spark(28, 25);
put(6, 3, 'y');
put(26, 4, 'y');

const hex = (c) => {
  const v = parseInt(PAL[c].slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

const rowsToRects = () => {
  const out = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      const c = grid[y][x];
      if (c === '.') { x++; continue; }
      let w = 1;
      while (x + w < N && grid[y][x + w] === c) w++;
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${PAL[c]}"/>`);
      x += w;
    }
  }
  return out.join('');
};

const BG = '#16301f';
const BG_GLOW = '#1f4a2e';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64" shape-rendering="crispEdges"><rect width="32" height="32" rx="7" fill="${BG}"/>${rowsToRects()}</svg>\n`;
writeFileSync(resolve(root, 'favicon.svg'), svg);

const render = (size, { bg, pad }) => {
  const png = new PNG({ width: size, height: size });
  const inner = Math.floor(size * (1 - pad * 2));
  const scale = Math.floor(inner / N);
  const spriteSize = scale * N;
  const off = Math.floor((size - spriteSize) / 2);
  const bgc = bg ? hex2(bg) : null;
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    let col = bgc ? [...bgc, 255] : [0, 0, 0, 0];
    if (bgc) {
      const d = Math.hypot(x - size / 2, y - size * 0.55) / (size * 0.5);
      if (d < 1) {
        const k = (1 - d) * 0.9;
        const g = hex2(BG_GLOW);
        col = [0, 1, 2].map((n) => Math.round(bgc[n] + (g[n] - bgc[n]) * k)).concat(255);
      }
    }
    const sx = Math.floor((x - off) / scale);
    const sy = Math.floor((y - off) / scale);
    if (sx >= 0 && sy >= 0 && sx < N && sy < N && grid[sy][sx] !== '.') col = [...hex(grid[sy][sx]), 255];
    png.data.set(col, i * 4);
  }
  return PNG.sync.write(png);
};
const hex2 = (h) => {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

writeFileSync(resolve(root, 'sacred-apple.png'), render(512, { bg: BG, pad: 0.1 }));
writeFileSync(resolve(root, 'sacred-apple-192.png'), render(192, { bg: BG, pad: 0.1 }));
writeFileSync(resolve(root, 'favicon.png'), render(64, { bg: BG, pad: 0 }));

if (process.argv.includes('--ascii')) {
  console.log(grid.map((r) => r.join('')).join('\n'));
}
