// buildings.js — generates building lots per block, paints roofs, window grids
// and storefront signs; keeps the AABB list used for collision.
import { rand, randInt, pick, chance, roundRect } from "./math.js";
import { SIDEWALK } from "./world.js";

export const SHOP_NAMES = [
  "PALM DINER", "NEON LIQUORS", "OCEAN BANK", "SUNSET MOTEL", "CRAB SHACK",
  "VINYL RECORDS", "TIDE LAUNDRY", "TACO TIDE", "HOTEL AZUL", "SURF & SUN",
  "GOLD PAWN", "CINEMA 7", "FLAMINGO CLUB", "BAYSIDE MOTORS", "DONUT KING",
  "MARLIN MART", "CASINO ROYALE", "PIER 9 FISH", "SALSA NIGHTS", "EL GATO CAFE",
];

const ROOF_COLS = ["#b8a88f", "#a89a86", "#c2b49a", "#98a3a8", "#b0a494", "#8f9aa3", "#c7b8a0", "#a3947e"];
const WALL_TRIM = ["#e8788a", "#5ec8c0", "#e8b84f", "#8f7fd8", "#67b7e8", "#e89a5f"];
const SIGN_BG = ["#12303a", "#3a1230", "#123a1e", "#302a12", "#1a1a3e"];

export function genBuildings(blocks) {
  const buildings = [];
  let nameIdx = 0;
  for (const blk of blocks) {
    const x0 = blk.x0 + SIDEWALK, y0 = blk.y0 + SIDEWALK;
    const bw = blk.x1 - blk.x0 - SIDEWALK * 2, bh = blk.y1 - blk.y0 - SIDEWALK * 2;
    // 2x2 lots with an alley cross
    const alley = 26;
    const lw = (bw - alley) / 2, lh = (bh - alley) / 2;
    for (let lx = 0; lx < 2; lx++) {
      for (let ly = 0; ly < 2; ly++) {
        if (chance(0.08)) continue; // occasional vacant lot
        const inset = randInt(4, 14);
        const x = x0 + lx * (lw + alley) + inset;
        const y = y0 + ly * (lh + alley) + inset;
        const w = lw - inset * 2, h = lh - inset * 2;
        const floors = randInt(2, 6);
        const b = {
          x, y, w, h, floors,
          roof: pick(ROOF_COLS),
          trim: pick(WALL_TRIM),
          sign: SHOP_NAMES[nameIdx++ % SHOP_NAMES.length],
          signBg: pick(SIGN_BG),
          // which side faces a road: pick the side nearest the block edge
          signSide: ly === 0 ? "n" : "s",
          windows: [],
          litSeed: randInt(1, 1e9),
          ac: chance(0.6),
        };
        // window grid on the roof face (top-down stylised facade strip)
        const cols = Math.max(2, Math.floor(w / 26));
        const rows = Math.max(2, Math.floor(h / 30));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = x + 12 + c * ((w - 24) / Math.max(1, cols - 1)) - 5;
            const wy = y + 14 + r * ((h - 28) / Math.max(1, rows - 1)) - 6;
            if (cols === 1) continue;
            b.windows.push({ x: wx, y: wy, lit: ((b.litSeed >> ((r * cols + c) % 29)) & 1) === 1 });
          }
        }
        buildings.push(b);
      }
    }
  }
  return buildings;
}

export function drawBuildings(ctx, buildings) {
  for (const b of buildings) {
    // drop shadow
    ctx.fillStyle = "rgba(20,22,30,0.30)";
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    // walls / roof
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // trim border
    ctx.strokeStyle = b.trim;
    ctx.lineWidth = 4;
    ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    ctx.strokeStyle = "rgba(30,30,35,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // roof detail: AC units
    if (b.ac) {
      ctx.fillStyle = "#7d858e";
      ctx.fillRect(b.x + b.w * 0.62, b.y + b.h * 0.58, 22, 16);
      ctx.fillStyle = "#656d76";
      ctx.fillRect(b.x + b.w * 0.62 + 3, b.y + b.h * 0.58 + 3, 16, 10);
    }
    // window grid (dark glass by day)
    for (const w of b.windows) {
      ctx.fillStyle = "rgba(38,50,66,0.9)";
      ctx.fillRect(w.x, w.y, 11, 13);
      ctx.fillStyle = "rgba(120,150,180,0.25)";
      ctx.fillRect(w.x, w.y, 11, 4);
    }
    // storefront sign band on the road-facing edge
    const sh = 20;
    const sy = b.signSide === "n" ? b.y - sh / 2 : b.y + b.h - sh / 2;
    ctx.fillStyle = b.signBg;
    roundRect(ctx, b.x + 8, sy, b.w - 16, sh, 4);
    ctx.fill();
    ctx.strokeStyle = b.trim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#f3ecd8";
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.sign, b.x + b.w / 2, sy + sh / 2 + 1, b.w - 26);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Lit windows + neon signs go on the night-lights canvas.
export function drawBuildingLights(ctx, buildings) {
  for (const b of buildings) {
    for (const w of b.windows) {
      if (!w.lit) continue;
      ctx.fillStyle = "rgba(255,214,120,0.92)";
      ctx.fillRect(w.x, w.y, 11, 13);
    }
    const sh = 20;
    const sy = b.signSide === "n" ? b.y - sh / 2 : b.y + b.h - sh / 2;
    ctx.save();
    ctx.shadowColor = b.trim;
    ctx.shadowBlur = 16;
    ctx.fillStyle = b.trim;
    roundRect(ctx, b.x + 8, sy, b.w - 16, sh, 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fffbe8";
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.sign, b.x + b.w / 2, sy + sh / 2 + 1, b.w - 26);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
