// ui.js — title menu, pause overlay, dialogue subtitles, control legend.
// The legend is NEVER drawn in staged capture modes.
import { S } from "./state.js";
import { STORY } from "./story.js";
import { roundRect } from "./math.js";

export function drawLegend(ctx) {
  if (S.staged || S.mode !== "play") return;
  const text = "WASD move · MOUSE aim · CLICK fire · E car · SPACE handbrake · 1/2 weapon · P pause";
  ctx.save();
  ctx.font = "11px 'Courier New', monospace";
  const w = ctx.measureText(text).width + 28;
  ctx.fillStyle = "rgba(8,12,20,0.66)";
  roundRect(ctx, 640 - w / 2, 720 - 26, w, 20, 6);
  ctx.fill();
  ctx.fillStyle = "#9fb0c0";
  ctx.textAlign = "center";
  ctx.fillText(text, 640, 720 - 12);
  ctx.restore();
  ctx.textAlign = "left";
}

export function drawDialogue(ctx) {
  if (!S.dialogue || S.tick > S.dialogue.until) return;
  const text = S.dialogue.text;
  ctx.save();
  ctx.font = "14px 'Courier New', monospace";
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > 620 && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const h = lines.length * 18 + 16;
  const y = 720 - 190 - h;
  ctx.fillStyle = "rgba(8,12,20,0.8)";
  roundRect(ctx, 640 - 330, y, 660, h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,120,138,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#f3ecd8";
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, 640, y + 22 + i * 18));
  ctx.restore();
  ctx.textAlign = "left";
}

export function drawTitleMenu(ctx, tick) {
  ctx.save();
  ctx.fillStyle = "rgba(5,8,14,0.55)";
  ctx.fillRect(0, 0, 1280, 720);
  drawBigTitle(ctx, tick);
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8eef5";
  ctx.font = "15px 'Courier New', monospace";
  ctx.fillText(STORY.lore, 640, 420, 900);
  const blink = Math.sin(tick * 0.09) > -0.3;
  if (blink) {
    ctx.fillStyle = "#ffd23f";
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillText("PRESS ENTER TO START", 640, 480);
  }
  ctx.fillStyle = "#9fb0c0";
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText("WASD move · MOUSE aim · CLICK fire · E enter car · SPACE handbrake · P pause", 640, 540);
  ctx.fillText("Find the pink ? markers to start jobs. Crime raises your wanted level.", 640, 564);
  ctx.restore();
  ctx.textAlign = "left";
}

// staged 'title' capture: establishing shot + logo, no debug furniture
export function drawTitleShot(ctx, tick) {
  ctx.save();
  // cinematic letterbox
  ctx.fillStyle = "rgba(3,5,10,0.85)";
  ctx.fillRect(0, 0, 1280, 54);
  ctx.fillRect(0, 666, 1280, 54);
  drawBigTitle(ctx, tick);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillText(STORY.tagline.toUpperCase(), 640, 372);
  const blink = Math.sin(tick * 0.09) > -0.3;
  if (blink) {
    ctx.fillStyle = "#e8eef5";
    ctx.font = "14px 'Courier New', monospace";
    ctx.fillText("PRESS ENTER TO START", 640, 640);
  }
  ctx.restore();
  ctx.textAlign = "left";
}

function drawBigTitle(ctx, tick) {
  ctx.save();
  ctx.textAlign = "center";
  // glow
  ctx.shadowColor = "#ff5f8f";
  ctx.shadowBlur = 34;
  const g = ctx.createLinearGradient(0, 220, 0, 330);
  g.addColorStop(0, "#ffd23f");
  g.addColorStop(0.5, "#ff8f5f");
  g.addColorStop(1, "#ff5f8f");
  ctx.fillStyle = g;
  ctx.font = "bold 92px 'Courier New', monospace";
  ctx.fillText("NEON PALMS", 640, 300);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(20,10,30,0.8)";
  ctx.lineWidth = 2;
  ctx.strokeText("NEON PALMS", 640, 300);
  ctx.fillStyle = "#8fd8e8";
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillText("— VI —", 640, 332);
  ctx.restore();
  ctx.textAlign = "left";
}

export function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(5,8,14,0.6)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#e8eef5";
  ctx.font = "bold 46px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", 640, 340);
  ctx.font = "15px 'Courier New', monospace";
  ctx.fillStyle = "#9fb0c0";
  ctx.fillText("P to resume · M to mute", 640, 380);
  ctx.restore();
  ctx.textAlign = "left";
}
