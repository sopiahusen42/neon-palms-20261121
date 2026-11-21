// hud.js — mission card, money, wanted stars, health/armour bars, weapon+ammo,
// speedometer while driving, offscreen objective arrow.
import { S, stars } from "./state.js";
import { fmtMoney, clamp, TAU } from "./math.js";
import { WEAPONS } from "./weapons.js";
import { mph } from "./driving.js";
import { worldToScreen } from "./camera.js";
import { MM } from "./minimap.js";

function star(ctx, x, y, r, lit) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (lit) {
    ctx.fillStyle = "#ffd23f";
    ctx.fill();
    ctx.strokeStyle = "#8a6a10";
  } else {
    ctx.fillStyle = "rgba(20,26,34,0.6)";
    ctx.fill();
    ctx.strokeStyle = "rgba(160,170,185,0.5)";
  }
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

export function drawHUD(ctx, tick) {
  const p = S.player;
  ctx.save();
  ctx.textBaseline = "alphabetic";

  // ---- mission card (top-left) ----
  const m = S.mission;
  ctx.fillStyle = "rgba(8,12,20,0.78)";
  ctx.fillRect(16, 14, 320, m ? 86 : 46);
  ctx.strokeStyle = "rgba(255,210,63,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 14, 320, m ? 86 : 46);
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 15px 'Courier New', monospace";
  if (m) {
    const st = m.def.stages[m.stage];
    ctx.fillText(m.def.name, 28, 36);
    ctx.fillStyle = "#e8eef5";
    ctx.font = "13px 'Courier New', monospace";
    wrapText(ctx, st.label, 28, 56, 296, 15);
    ctx.fillStyle = "#8fd8e8";
    ctx.font = "bold 11px 'Courier New', monospace";
    let meta = `OBJECTIVE ${m.stage + 1}/${m.def.stages.length}`;
    if (m.timer != null) meta += `   TIME ${Math.ceil(m.timer)}s`;
    ctx.fillText(meta, 28, 92);
  } else {
    ctx.fillText("NEON PALMS", 28, 34);
    ctx.fillStyle = "#9fb0c0";
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText("Find a ? marker to start a job.", 28, 52);
  }

  // ---- wanted stars + money (top-right) ----
  const st = stars();
  for (let i = 0; i < 5; i++) {
    const lit = i < st;
    const pulse = lit && st >= 4 ? 1 + Math.sin(tick * 0.25) * 0.08 : 1;
    star(ctx, 1280 - 170 + i * 32, 32, 12 * pulse, lit);
  }
  ctx.fillStyle = "#7fe89a";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.fillText(fmtMoney(S.money), 1264, 66);
  ctx.textAlign = "left";

  // ---- health / armour / weapon (bottom-left) ----
  const by = 720 - 64;
  ctx.fillStyle = "rgba(8,12,20,0.78)";
  ctx.fillRect(16, by - 12, 250, 62);
  bar(ctx, 28, by, 160, 12, p.health / 100, "#5fd87a", "HEALTH");
  bar(ctx, 28, by + 20, 160, 12, p.armor / 100, "#5f9fe8", "ARMOUR");
  const w = WEAPONS[p.weapon];
  ctx.fillStyle = "#e8eef5";
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillText(w.name, 200, by + 10);
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(String(p.ammo[p.weapon]), 200, by + 28);

  // ---- speedometer when driving ----
  if (p.inCar) {
    const cx = MM.x - 92, cy = 720 - 72;
    const speed = mph(p.inCar.speed);
    ctx.fillStyle = "rgba(8,12,20,0.78)";
    ctx.beginPath(); ctx.arc(cx, cy, 46, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(120,200,220,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 46, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
    // ticks
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
      ctx.strokeStyle = i >= 6 ? "#ff6a5f" : "#9fb0c0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38);
      ctx.lineTo(cx + Math.cos(a) * 43, cy + Math.sin(a) * 43);
      ctx.stroke();
    }
    // needle
    const frac = clamp(speed / 160, 0, 1);
    const na = Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * 34, cy + Math.sin(na) * 34);
    ctx.stroke();
    ctx.fillStyle = "#e8eef5";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(speed), cx, cy + 26);
    ctx.font = "9px 'Courier New', monospace";
    ctx.fillStyle = "#9fb0c0";
    ctx.fillText("MPH", cx, cy + 38);
    ctx.textAlign = "left";
  }

  // ---- offscreen objective arrow ----
  if (m) {
    const stg = m.def.stages[m.stage];
    let ox = stg.x, oy = stg.y;
    if (stg.type === "enterCar") {
      const car = S.cars.find((c) => c.tag === stg.carTag);
      if (car) { ox = car.x; oy = car.y; }
    }
    if (ox != null) {
      const s = worldToScreen(ox, oy);
      if (s.x < 30 || s.x > 1250 || s.y < 30 || s.y > 690) {
        const cx = clamp(s.x, 40, 1240), cy = clamp(s.y, 40, 680);
        const a = Math.atan2(s.y - 360, s.x - 640);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, col, label) {
  ctx.fillStyle = "rgba(20,26,34,0.9)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = "rgba(200,210,225,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#0a0e14";
  ctx.font = "bold 8px 'Courier New', monospace";
  ctx.fillText(label, x + 4, y + h - 3);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "", yy = y;
  for (const wd of words) {
    const test = line ? line + " " + wd : wd;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = wd; yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
