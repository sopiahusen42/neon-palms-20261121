// minimap.js — pre-rendered road atlas + live blips, compass rose, frame.
import { S, stars } from "./state.js";
import { AVENUES, STREETS, ROAD_HALF, W, H } from "./world.js";
import { TAU } from "./math.js";

export const MM = { x: 1280 - 208, y: 720 - 178, w: 190, h: 152 };
let atlas = null;

function buildAtlas() {
  atlas = document.createElement("canvas");
  atlas.width = MM.w; atlas.height = MM.h;
  const c = atlas.getContext("2d");
  const sx = MM.w / W, sy = MM.h / H;
  c.fillStyle = "#101820";
  c.fillRect(0, 0, MM.w, MM.h);
  c.fillStyle = "#2c3a4a";
  for (const ax of AVENUES) c.fillRect((ax - ROAD_HALF) * sx, 0, ROAD_HALF * 2 * sx, MM.h);
  for (const st of STREETS) c.fillRect(0, (st - ROAD_HALF) * sy, MM.w, ROAD_HALF * 2 * sy);
  c.fillStyle = "#1d2a38";
  for (const b of S.city.blocks) {
    c.fillRect(b.x0 * sx, b.y0 * sy, (b.x1 - b.x0) * sx, (b.y1 - b.y0) * sy);
  }
}

const mx = (x) => MM.x + (x / W) * MM.w;
const my = (y) => MM.y + (y / H) * MM.h;

export function drawMinimap(ctx, tick) {
  if (!atlas) buildAtlas();
  ctx.save();
  // frame
  ctx.fillStyle = "rgba(8,12,18,0.85)";
  ctx.fillRect(MM.x - 4, MM.y - 4, MM.w + 8, MM.h + 8);
  ctx.strokeStyle = "rgba(120,200,220,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(MM.x - 4, MM.y - 4, MM.w + 8, MM.h + 8);
  ctx.drawImage(atlas, MM.x, MM.y);

  // clip blips to the map
  ctx.beginPath();
  ctx.rect(MM.x, MM.y, MM.w, MM.h);
  ctx.clip();

  // traffic: faint grey dots
  ctx.fillStyle = "rgba(160,170,185,0.5)";
  for (const c of S.cars) {
    if (c.isPolice || c.driver === "player") continue;
    ctx.fillRect(mx(c.x) - 1, my(c.y) - 1, 2, 2);
  }
  // mission marker: pulsing yellow
  const obj = S.mission && missionObjectivePos();
  if (obj) {
    const r = 3.4 + Math.sin(tick * 0.15) * 1.2;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.arc(mx(obj.x), my(obj.y), r, 0, TAU); ctx.fill();
  }
  // police: flashing red/blue
  const phase = Math.floor(tick / 8) % 2;
  for (const c of S.cars) {
    if (!c.isPolice || !c.siren) continue;
    ctx.fillStyle = phase ? "#ff4438" : "#4477ff";
    ctx.beginPath(); ctx.arc(mx(c.x), my(c.y), 2.6, 0, TAU); ctx.fill();
  }
  for (const c of S.cops) {
    ctx.fillStyle = "#5f8fff";
    ctx.fillRect(mx(c.x) - 1.5, my(c.y) - 1.5, 3, 3);
  }
  // player: white arrow pointing along aim/heading
  const p = S.player;
  const a = p.inCar ? p.inCar.angle : p.aim;
  ctx.save();
  ctx.translate(mx(p.x), my(p.y));
  ctx.rotate(a);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(5.5, 0); ctx.lineTo(-4, -3.6); ctx.lineTo(-2, 0); ctx.lineTo(-4, 3.6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();

  // compass rose (camera never rotates, so N is up; needle shows heading)
  const cx = MM.x + MM.w - 16, cy = MM.y + 16;
  ctx.save();
  ctx.fillStyle = "rgba(8,12,18,0.8)";
  ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(120,200,220,0.6)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - 4.5);
  const p2 = S.player;
  const ha = p2.inCar ? p2.inCar.angle : p2.aim;
  ctx.translate(cx, cy + 2);
  ctx.rotate(ha + Math.PI / 2);
  ctx.fillStyle = "#e8eef5";
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2.4, 4); ctx.lineTo(-2.4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.textAlign = "left";
}

function missionObjectivePos() {
  const m = S.mission;
  if (!m) return null;
  const st = m.def.stages[m.stage];
  if (!st) return null;
  if (st.type === "enterCar") {
    const car = S.cars.find((c) => c.tag === st.carTag);
    return car ? { x: car.x, y: car.y } : null;
  }
  return { x: st.x, y: st.y };
}
