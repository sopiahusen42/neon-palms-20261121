// world.js — world geometry constants, road queries and building collision.
export const W = 3000;
export const H = 2400;
export const AVENUES = [200, 800, 1400, 2000, 2600];   // vertical roads (x)
export const STREETS = [200, 800, 1400, 2000];         // horizontal roads (y)
export const ROAD_HALF = 60;                            // half road width
export const LANE_OFF = 28;                             // lane centre offset from road centre
export const SIDEWALK = 42;                             // sidewalk band width

export function isRoad(x, y) {
  for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_HALF) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_HALF) return true;
  return false;
}

export function onSidewalk(x, y) {
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d > ROAD_HALF && d <= ROAD_HALF + SIDEWALK) return true;
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d > ROAD_HALF && d <= ROAD_HALF + SIDEWALK) return true;
  }
  return false;
}

// Blocks are the buildable rectangles between roads.
export function makeBlocks() {
  const blocks = [];
  for (let i = 0; i < AVENUES.length - 1; i++) {
    for (let j = 0; j < STREETS.length - 1; j++) {
      const x0 = AVENUES[i] + ROAD_HALF, x1 = AVENUES[i + 1] - ROAD_HALF;
      const y0 = STREETS[j] + ROAD_HALF, y1 = STREETS[j + 1] - ROAD_HALF;
      blocks.push({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, i, j });
    }
  }
  return blocks;
}

// Right-hand-traffic lane coordinate for a direction on a given road.
// dir: 0=E(+x) 1=S(+y) 2=W(-x) 3=N(-y)
export function laneCoord(dir, roadCentre) {
  if (dir === 0) return roadCentre + LANE_OFF;       // eastbound: south side
  if (dir === 2) return roadCentre - LANE_OFF;       // westbound: north side
  if (dir === 1) return roadCentre - LANE_OFF;       // southbound: west side
  return roadCentre + LANE_OFF;                       // northbound: east side
}

export const DIR_VEC = [
  { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 },
];

// Resolve a circle against building AABBs; returns corrected position + hit flag.
export function collideBuildings(buildings, x, y, r) {
  let hit = false;
  for (const b of buildings) {
    if (x + r < b.x || x - r > b.x + b.w || y + r < b.y || y - r > b.y + b.h) continue;
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    let dx = x - cx, dy = y - cy;
    let d = Math.hypot(dx, dy);
    if (d >= r) continue;
    hit = true;
    if (d < 0.001) { dx = 1; dy = 0; d = 1; }
    const push = (r - d) / d;
    x += dx * push; y += dy * push;
  }
  // world bounds
  if (x < r) { x = r; hit = true; }
  if (y < r) { y = r; hit = true; }
  if (x > W - r) { x = W - r; hit = true; }
  if (y > H - r) { y = H - r; hit = true; }
  return { x, y, hit };
}

export function pointInBuilding(buildings, x, y) {
  for (const b of buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}
