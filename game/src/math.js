// math.js — vector/scalar helpers and a seedable PRNG so staged shots are deterministic.
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const len = (x, y) => Math.hypot(x, y);

export function norm(x, y) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

// Shortest-path angle interpolation.
export function angLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// mulberry32 — small, fast, good enough for layout + staging.
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng = mulberry32(0xC0FFEE);
export function reseed(seed) { rng = mulberry32(seed); }
export const rand = () => rng();
export const randRange = (a, b) => a + rng() * (b - a);
export const randInt = (a, b) => Math.floor(randRange(a, b + 1));
export const pick = (arr) => arr[Math.floor(rng() * arr.length)];
export const chance = (p) => rng() < p;

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const fmtMoney = (n) => "$" + String(Math.max(0, Math.floor(n))).padStart(6, "0");
