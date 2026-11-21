// pedestrians.js — pavement walkers on sidewalk rings around each block,
// panic behaviour near gunfire, and run-over detection.
import { S, addHeat } from "./state.js";
import { rand, pick, TAU } from "./math.js";
import { addSparks, addSmoke } from "./effects.js";

const SHIRTS = ["#d8b84f", "#5f9fd8", "#d87f5f", "#7fc86f", "#c86f9f", "#9f7fd8", "#e0e3e8", "#5fc8c0", "#d85f5f", "#8fb84f"];
const SKINS = ["#e0b48c", "#c89468", "#8c5f3f", "#f0c8a0", "#a87850"];

function ringOf(blk) {
  return { x0: blk.x0 + 21, y0: blk.y0 + 21, x1: blk.x1 - 21, y1: blk.y1 - 21 };
}
const CORNERS = (r) => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];

export function makePed(x, y, blk) {
  const r = ringOf(blk);
  return {
    x, y, angle: 0, speed: 46 + rand() * 30,
    shirt: pick(SHIRTS), skin: pick(SKINS),
    phase: rand() * TAU, health: 30,
    ring: r, ci: Math.floor(rand() * 4), cd: rand() < 0.5 ? 1 : 3,
    panic: 0,
  };
}

export function populatePeds(count = 56) {
  const blocks = S.city.blocks;
  for (let i = 0; i < count; i++) {
    const blk = pick(blocks);
    const r = ringOf(blk);
    const cs = CORNERS(r);
    const ci = Math.floor(rand() * 4);
    const [x, y] = cs[ci];
    const p = makePed(x + (rand() - 0.5) * 30, y + (rand() - 0.5) * 30, blk);
    p.ci = ci;
    S.peds.push(p);
  }
}

// staged crowds: dense pedestrians on the rings nearest a point
export function spawnCrowd(cx, cy, count) {
  const blocks = [...S.city.blocks].sort(
    (a, b) => Math.hypot(a.cx - cx, a.cy - cy) - Math.hypot(b.cx - cx, b.cy - cy)
  ).slice(0, 3);
  for (let i = 0; i < count; i++) {
    const blk = blocks[i % blocks.length];
    const r = ringOf(blk);
    const cs = CORNERS(r);
    const ci = Math.floor(rand() * 4);
    const [x, y] = cs[ci];
    // scatter along the ring edges, not just corners
    const t = rand();
    const ni = (ci + 1) % 4;
    const px = x + (cs[ni][0] - x) * t;
    const py = y + (cs[ni][1] - y) * t;
    const p = makePed(px, py, blk);
    p.ci = ci;
    S.peds.push(p);
  }
}

export function updatePeds(dt) {
  const p0 = S.player;
  for (let i = S.peds.length - 1; i >= 0; i--) {
    const p = S.peds[i];
    p.panic = Math.max(0, p.panic - dt);
    p.phase += dt * 8;

    // run over by fast cars
    let killed = false;
    for (const c of S.cars) {
      if (c.speed < 95 || c.wrecked) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < 17) {
        addSparks(p.x, p.y, 6);
        addSmoke(p.x, p.y, 0, -10, 9, 0.7);
        S.peds.splice(i, 1);
        if (c.driver === "player" && !S.staged) addHeat(24);
        killed = true;
        break;
      }
      // near miss -> panic
      if (c.driver === "player" && c.speed > 150 && Math.hypot(c.x - p.x, c.y - p.y) < 70) p.panic = 2;
    }
    if (killed) continue;

    let tx, ty, sp = p.speed;
    if (p.panic > 0) {
      // flee away from the player
      const dx = p.x - p0.x, dy = p.y - p0.y;
      const d = Math.hypot(dx, dy) || 1;
      tx = p.x + (dx / d) * 120; ty = p.y + (dy / d) * 120;
      sp = 210;
    } else {
      const cs = CORNERS(p.ring);
      [tx, ty] = cs[p.ci];
      if (Math.hypot(tx - p.x, ty - p.y) < 8) {
        p.ci = (p.ci + p.cd) % 4;
        [tx, ty] = cs[p.ci];
      }
    }
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.angle = Math.atan2(dy, dx);
    p.x += (dx / d) * sp * dt;
    p.y += (dy / d) * sp * dt;
  }
}

export function drawPeds(ctx) {
  for (const p of S.peds) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(15,17,24,0.25)";
    ctx.beginPath(); ctx.ellipse(1.5, 2.5, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.rotate(p.angle);
    const step = Math.sin(p.phase) * 2.4;
    ctx.fillStyle = "#333a45";
    ctx.fillRect(-3 + step * 0.4, -4.5, 5, 3);
    ctx.fillRect(-3 - step * 0.4, 1.5, 5, 3);
    ctx.fillStyle = p.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, TAU); ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(1, 0, 3.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
