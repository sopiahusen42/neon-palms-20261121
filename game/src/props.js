// props.js — palm trees, street lamps, benches, hydrants; static art + lamp light pools.
import { rand, randInt, pick, chance, TAU } from "./math.js";
import { AVENUES, STREETS, ROAD_HALF, SIDEWALK, W, H } from "./world.js";

export function genProps(blocks) {
  const palms = [];
  const lamps = [];
  const benches = [];
  const hydrants = [];

  // palms on the outer sand margins and in vacant corners
  for (let i = 0; i < 46; i++) {
    const edge = randInt(0, 3);
    let x, y;
    if (edge === 0) { x = rand() * W; y = 20 + rand() * 55; }
    else if (edge === 1) { x = rand() * W; y = H - 75 + rand() * 55; }
    else if (edge === 2) { x = 20 + rand() * 55; y = rand() * H; }
    else { x = W - 75 + rand() * 55; y = rand() * H; }
    palms.push({ x, y, r: 16 + rand() * 10, lean: rand() * TAU, seed: rand() });
  }
  // sidewalk palms at block corners
  for (const blk of blocks) {
    if (chance(0.75)) {
      const corners = [
        [blk.x0 + 18, blk.y0 + 18], [blk.x1 - 18, blk.y0 + 18],
        [blk.x0 + 18, blk.y1 - 18], [blk.x1 - 18, blk.y1 - 18],
      ];
      for (const [cx, cy] of corners) {
        if (chance(0.5)) palms.push({ x: cx, y: cy, r: 13 + rand() * 6, lean: rand() * TAU, seed: rand() });
      }
    }
  }

  // street lamps along every road, alternating sides, ~170u apart
  for (const ax of AVENUES) {
    let side = 1;
    for (let y = 120; y < H - 60; y += 170) {
      if (STREETS.some((sy) => Math.abs(y - sy) < ROAD_HALF + 30)) continue;
      lamps.push({ x: ax + side * (ROAD_HALF + 14), y, pool: 95 });
      side = -side;
    }
  }
  for (const sy of STREETS) {
    let side = 1;
    for (let x = 120; x < W - 60; x += 170) {
      if (AVENUES.some((ax) => Math.abs(x - ax) < ROAD_HALF + 30)) continue;
      lamps.push({ x, y: sy + side * (ROAD_HALF + 14), pool: 95 });
      side = -side;
    }
  }

  for (const blk of blocks) {
    if (chance(0.7)) benches.push({ x: blk.x0 + 60 + rand() * 80, y: blk.y0 + 16, horiz: true });
    if (chance(0.7)) benches.push({ x: blk.x1 - 16, y: blk.y0 + 60 + rand() * 80, horiz: false });
    if (chance(0.6)) hydrants.push({ x: blk.x0 + 14, y: blk.y1 - 40 - rand() * 60 });
  }
  return { palms, lamps, benches, hydrants };
}

export function drawProps(ctx, props) {
  // benches
  for (const b of props.benches) {
    ctx.fillStyle = "#7a5a3a";
    if (b.horiz) {
      ctx.fillRect(b.x, b.y, 34, 9);
      ctx.fillStyle = "#5d442c";
      ctx.fillRect(b.x + 2, b.y + 2, 30, 2);
    } else {
      ctx.fillRect(b.x, b.y, 9, 34);
      ctx.fillStyle = "#5d442c";
      ctx.fillRect(b.x + 2, b.y + 2, 2, 30);
    }
  }
  // hydrants
  for (const h of props.hydrants) {
    ctx.fillStyle = "#c8452f";
    ctx.beginPath(); ctx.arc(h.x, h.y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e8674f";
    ctx.fillRect(h.x - 6, h.y - 1.5, 12, 3);
  }
  // lamp posts (the head; the pool of light is drawn at night)
  for (const l of props.lamps) {
    ctx.fillStyle = "rgba(20,22,30,0.3)";
    ctx.beginPath(); ctx.ellipse(l.x + 3, l.y + 4, 6, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3d434c";
    ctx.beginPath(); ctx.arc(l.x, l.y, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c9cdd4";
    ctx.beginPath(); ctx.arc(l.x, l.y, 2.4, 0, TAU); ctx.fill();
  }
  // palms: shadow, trunk, fronds
  for (const p of props.palms) {
    ctx.fillStyle = "rgba(20,26,20,0.28)";
    ctx.beginPath(); ctx.ellipse(p.x + 8, p.y + 10, p.r * 0.95, p.r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.lean) * 7, p.y + Math.sin(p.lean) * 7);
    ctx.stroke();
    const fx = p.x + Math.cos(p.lean) * 7, fy = p.y + Math.sin(p.lean) * 7;
    for (let i = 0; i < 7; i++) {
      const a = p.lean + (i / 7) * TAU + p.seed;
      ctx.strokeStyle = i % 2 ? "#3f8a4a" : "#54a85e";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      const mx = fx + Math.cos(a) * p.r * 0.6, my = fy + Math.sin(a) * p.r * 0.6;
      const ex = fx + Math.cos(a + 0.35) * p.r, ey = fy + Math.sin(a + 0.35) * p.r;
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    }
    ctx.fillStyle = "#6b4f2e";
    ctx.beginPath(); ctx.arc(fx, fy, 3.4, 0, TAU); ctx.fill();
  }
}

// Warm pools under every lamp, painted once onto the lights canvas.
export function drawLampLights(ctx, props) {
  for (const l of props.lamps) {
    const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.pool);
    g.addColorStop(0, "rgba(255,222,140,0.55)");
    g.addColorStop(0.5, "rgba(255,200,110,0.22)");
    g.addColorStop(1, "rgba(255,190,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, l.pool, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,240,190,0.95)";
    ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, TAU); ctx.fill();
  }
}
