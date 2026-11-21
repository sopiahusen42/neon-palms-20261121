// roads.js — paints asphalt, lane markings, crosswalks, kerbs and sidewalks
// onto the pre-rendered city base canvas.
import { AVENUES, STREETS, ROAD_HALF, SIDEWALK, W, H } from "./world.js";

const ASPHALT = "#2b2e35";
const ASPHALT_EDGE = "#24272d";
const SIDEWALK_COL = "#9aa1ab";
const KERB = "#c3c9d2";
const DASH = "#d8d2be";
const CENTER = "#e0b83f";

export function drawRoads(ctx) {
  // ground base: sandy parkland outside the grid
  ctx.fillStyle = "#7fae6a";
  ctx.fillRect(0, 0, W, H);
  // subtle sand patches near edges
  ctx.fillStyle = "#d9c690";
  ctx.fillRect(0, 0, W, 90);
  ctx.fillRect(0, H - 90, W, 90);
  ctx.fillRect(0, 0, 90, H);
  ctx.fillRect(W - 90, 0, 90, H);

  // sidewalk bands first (slightly wider than road), then asphalt on top
  ctx.fillStyle = SIDEWALK_COL;
  for (const ax of AVENUES) ctx.fillRect(ax - ROAD_HALF - SIDEWALK, 0, (ROAD_HALF + SIDEWALK) * 2, H);
  for (const sy of STREETS) ctx.fillRect(0, sy - ROAD_HALF - SIDEWALK, W, (ROAD_HALF + SIDEWALK) * 2);

  // sidewalk expansion joints
  ctx.strokeStyle = "rgba(60,64,72,0.35)";
  ctx.lineWidth = 1.5;
  for (const ax of AVENUES) {
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(ax - ROAD_HALF - SIDEWALK, y); ctx.lineTo(ax - ROAD_HALF, y);
      ctx.moveTo(ax + ROAD_HALF, y); ctx.lineTo(ax + ROAD_HALF + SIDEWALK, y);
      ctx.stroke();
    }
  }
  for (const sy of STREETS) {
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, sy - ROAD_HALF - SIDEWALK); ctx.lineTo(x, sy - ROAD_HALF);
      ctx.moveTo(x, sy + ROAD_HALF); ctx.lineTo(x, sy + ROAD_HALF + SIDEWALK);
      ctx.stroke();
    }
  }

  // kerb lines
  ctx.strokeStyle = KERB;
  ctx.lineWidth = 3;
  for (const ax of AVENUES) {
    ctx.beginPath();
    ctx.moveTo(ax - ROAD_HALF, 0); ctx.lineTo(ax - ROAD_HALF, H);
    ctx.moveTo(ax + ROAD_HALF, 0); ctx.lineTo(ax + ROAD_HALF, H);
    ctx.stroke();
  }
  for (const sy of STREETS) {
    ctx.beginPath();
    ctx.moveTo(0, sy - ROAD_HALF); ctx.lineTo(W, sy - ROAD_HALF);
    ctx.moveTo(0, sy + ROAD_HALF); ctx.lineTo(W, sy + ROAD_HALF);
    ctx.stroke();
  }

  // asphalt
  ctx.fillStyle = ASPHALT;
  for (const ax of AVENUES) ctx.fillRect(ax - ROAD_HALF, 0, ROAD_HALF * 2, H);
  for (const sy of STREETS) ctx.fillRect(0, sy - ROAD_HALF, W, ROAD_HALF * 2);
  // darker asphalt edges
  ctx.fillStyle = ASPHALT_EDGE;
  for (const ax of AVENUES) {
    ctx.fillRect(ax - ROAD_HALF, 0, 6, H);
    ctx.fillRect(ax + ROAD_HALF - 6, 0, 6, H);
  }
  for (const sy of STREETS) {
    ctx.fillRect(0, sy - ROAD_HALF, W, 6);
    ctx.fillRect(0, sy + ROAD_HALF - 6, W, 6);
  }

  // lane markings (skip intersection boxes)
  const inIntersectionX = (x) => STREETS.some((sy) => Math.abs(x - sy) < ROAD_HALF + 26);
  const inIntersectionY = (y) => AVENUES.some((ax) => Math.abs(y - ax) < ROAD_HALF + 26);

  ctx.lineWidth = 3;
  for (const ax of AVENUES) {
    // double yellow centre
    ctx.strokeStyle = CENTER;
    for (const off of [-3, 3]) {
      ctx.beginPath();
      let pen = false;
      for (let y = 0; y < H; y += 8) {
        if (inIntersectionY(y)) { pen = false; continue; }
        if (!pen) { ctx.moveTo(ax + off, y); pen = true; } else ctx.lineTo(ax + off, y);
      }
      ctx.stroke();
    }
    // white dashed lane edges at +/- LANE boundary (lane separators)
    ctx.strokeStyle = DASH;
    ctx.setLineDash([26, 26]);
    for (const off of [-ROAD_HALF + 8, ROAD_HALF - 8]) {
      ctx.beginPath();
      let pen = false;
      for (let y = 0; y < H; y += 8) {
        if (inIntersectionY(y)) { pen = false; continue; }
        if (!pen) { ctx.moveTo(ax + off, y); pen = true; } else ctx.lineTo(ax + off, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const sy of STREETS) {
    ctx.strokeStyle = CENTER;
    for (const off of [-3, 3]) {
      ctx.beginPath();
      let pen = false;
      for (let x = 0; x < W; x += 8) {
        if (inIntersectionX(x)) { pen = false; continue; }
        if (!pen) { ctx.moveTo(x, sy + off); pen = true; } else ctx.lineTo(x, sy + off);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = DASH;
    ctx.setLineDash([26, 26]);
    for (const off of [-ROAD_HALF + 8, ROAD_HALF - 8]) {
      ctx.beginPath();
      let pen = false;
      for (let x = 0; x < W; x += 8) {
        if (inIntersectionX(x)) { pen = false; continue; }
        if (!pen) { ctx.moveTo(x, sy + off); pen = true; } else ctx.lineTo(x, sy + off);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // crosswalks: zebra stripes on every approach to every intersection
  ctx.fillStyle = "rgba(230,230,225,0.85)";
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      for (let i = -4; i <= 4; i++) {
        const o = i * 12;
        // north & south approaches (stripes run across the vertical road)
        ctx.fillRect(ax + o - 4, sy - ROAD_HALF - 22, 8, 16);
        ctx.fillRect(ax + o - 4, sy + ROAD_HALF + 6, 8, 16);
        // east & west approaches
        ctx.fillRect(ax - ROAD_HALF - 22, sy + o - 4, 16, 8);
        ctx.fillRect(ax + ROAD_HALF + 6, sy + o - 4, 16, 8);
      }
    }
  }
}
