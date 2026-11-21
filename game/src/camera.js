// camera.js — smooth follow camera with per-mode zoom and trauma shake.
import { S } from "./state.js";
import { clamp, lerp, rand } from "./math.js";
import { W, H } from "./world.js";

export function setZoom(z) { S.camera.zoom = z; }

export function addShake(amount) {
  S.camera.shake = Math.min(14, S.camera.shake + amount);
}

export function updateCamera(dt) {
  const p = S.player;
  if (!p) return;
  const c = S.camera;
  const tx = p.x, ty = p.y;
  const k = 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing
  c.x = lerp(c.x, tx, k);
  c.y = lerp(c.y, ty, k);
  c.shake = Math.max(0, c.shake - dt * 22);
  // keep the view inside the world when zoomed out far (title shot)
  const hw = 640 / c.zoom, hh = 360 / c.zoom;
  if (hw * 2 >= W) c.x = W / 2; else c.x = clamp(c.x, hw, W - hw);
  if (hh * 2 >= H) c.y = H / 2; else c.y = clamp(c.y, hh, H - hh);
}

export function applyCamera(ctx) {
  const c = S.camera;
  let sx = 0, sy = 0;
  if (c.shake > 0.1) {
    sx = (rand() - 0.5) * c.shake;
    sy = (rand() - 0.5) * c.shake;
  }
  ctx.translate(640 + sx, 360 + sy);
  ctx.scale(c.zoom, c.zoom);
  ctx.translate(-c.x, -c.y);
}

// world -> screen (for HUD arrows)
export function worldToScreen(x, y) {
  const c = S.camera;
  return { x: (x - c.x) * c.zoom + 640, y: (y - c.y) * c.zoom + 360 };
}
