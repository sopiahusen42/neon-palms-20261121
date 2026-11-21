// effects.js — particles, persistent skid arcs, muzzle flashes, explosions.
// Normal combat flashes live 0.06s; staged capture flashes live ~0.9s so they
// are actually visible in a frozen screenshot frame.
import { TAU, clamp } from "./math.js";

const particles = [];   // smoke / fire / spark / debris
const skids = [];       // persistent tyre marks
const flashes = [];     // muzzle flashes
const scorches = [];    // explosion scorch marks

const MAX_PARTICLES = 700;
const MAX_SKIDS = 1100;

export function addSmoke(x, y, vx, vy, size, life) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push({ kind: "smoke", x, y, vx, vy, size, life, max: life, grow: 14 });
}

export function addSparks(x, y, n, baseAngle = null) {
  for (let i = 0; i < n; i++) {
    const a = baseAngle == null ? Math.random() * TAU : baseAngle + (Math.random() - 0.5) * 1.2;
    const sp = 90 + Math.random() * 220;
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({
      kind: "spark", x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: 1.5 + Math.random() * 2, life: 0.25 + Math.random() * 0.35, max: 0.6,
    });
  }
}

export function addSkid(x1, y1, x2, y2, alpha) {
  if (skids.length >= MAX_SKIDS) skids.splice(0, 40);
  skids.push({ x1, y1, x2, y2, a: alpha });
}

// ordinary, short-lived combat flash
export function addFlash(x, y, angle, size = 13, life = 0.06) {
  flashes.push({ x, y, angle, size, life, max: life });
}

// capture-only variant: long-lived so a frozen frame still shows the shot
export function addStagedFlash(x, y, angle) {
  flashes.push({ x, y, angle, size: 30, life: 0.9, max: 0.9 });
  addSparks(x, y, 7, angle);
}

export function addExplosion(x, y, staged = false) {
  const life = staged ? 1.5 : 0.7;
  scorches.push({ x, y, r: staged ? 40 : 30 });
  const n = staged ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const sp = 30 + Math.random() * (staged ? 150 : 110);
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({
      kind: "fire", x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: (staged ? 16 : 11) + Math.random() * 12, life, max: life, grow: staged ? 26 : 18,
    });
  }
  for (let i = 0; i < (staged ? 14 : 8); i++) {
    const a = Math.random() * TAU;
    const sp = 20 + Math.random() * 70;
    particles.push({
      kind: "smoke", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: 12 + Math.random() * 10, life: life * 1.3, max: life * 1.3, grow: 22,
    });
  }
  addSparks(x, y, staged ? 22 : 12);
}

export function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - 1.6 * dt; p.vy *= 1 - 1.6 * dt;
    if (p.grow) p.size += p.grow * dt;
  }
  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i].life -= dt;
    if (flashes[i].life <= 0) flashes.splice(i, 1);
  }
}

export function drawSkids(ctx) {
  if (!skids.length) return;
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  for (const s of skids) {
    ctx.strokeStyle = `rgba(18,18,22,${s.a})`;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
}

export function drawScorches(ctx) {
  for (const s of scorches) {
    const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
    g.addColorStop(0, "rgba(15,12,10,0.75)");
    g.addColorStop(1, "rgba(15,12,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  }
}

export function drawEffects(ctx) {
  for (const p of particles) {
    const t = p.life / p.max;
    if (p.kind === "smoke") {
      ctx.fillStyle = `rgba(205,205,210,${0.34 * t})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    } else if (p.kind === "fire") {
      const r = p.size * (0.5 + 0.5 * t);
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,240,180,${0.95 * t})`);
      g.addColorStop(0.45, `rgba(255,140,40,${0.8 * t})`);
      g.addColorStop(1, "rgba(200,40,10,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    } else if (p.kind === "spark") {
      ctx.strokeStyle = `rgba(255,220,120,${clamp(t * 1.6, 0, 1)})`;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    }
  }
  // muzzle flashes: 4-point star + glow
  for (const f of flashes) {
    const t = clamp((f.life / f.max) * 1.6, 0, 1);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, f.size * 1.5);
    g.addColorStop(0, `rgba(255,235,160,${0.85 * t})`);
    g.addColorStop(1, "rgba(255,160,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, f.size * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,246,200,${t})`;
    ctx.beginPath();
    ctx.moveTo(f.size, 0);
    ctx.lineTo(f.size * 0.22, f.size * 0.20);
    ctx.lineTo(0, f.size * 0.55);
    ctx.lineTo(-f.size * 0.22, f.size * 0.20);
    ctx.lineTo(-f.size * 0.6, 0);
    ctx.lineTo(-f.size * 0.22, -f.size * 0.20);
    ctx.lineTo(0, -f.size * 0.55);
    ctx.lineTo(f.size * 0.22, -f.size * 0.20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function effectCounts() {
  return { particles: particles.length, skids: skids.length, flashes: flashes.length };
}

export function clearEffects() {
  particles.length = 0; skids.length = 0; flashes.length = 0; scorches.length = 0;
}
