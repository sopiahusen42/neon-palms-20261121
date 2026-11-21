// traffic.js — AI cars that follow lanes, turn at intersections, queue behind
// slower cars, plus parked cars available for stealing.
import { S } from "./state.js";
import { rand, randInt, pick, clamp, angDiff } from "./math.js";
import { AVENUES, STREETS, ROAD_HALF, laneCoord, DIR_VEC, W, H } from "./world.js";
import { spawnTrafficCar, makeCar } from "./vehicles.js";

export function populateTraffic(count = 26) {
  for (let i = 0; i < count; i++) {
    const horizontal = rand() < 0.5;
    if (horizontal) {
      const sy = pick(STREETS);
      const dir = rand() < 0.5 ? 0 : 2;
      const y = laneCoord(dir, sy);
      spawnTrafficCar(rand() * W, y, dir, "h", sy);
    } else {
      const ax = pick(AVENUES);
      const dir = rand() < 0.5 ? 1 : 3;
      const x = laneCoord(dir, ax);
      spawnTrafficCar(x, rand() * H, dir, "v", ax);
    }
  }
  // parked cars along kerbs (stealable)
  const spots = [
    [520, STREETS[0] + ROAD_HALF - 12, 0], [1120, STREETS[1] - ROAD_HALF + 12, Math.PI],
    [1720, STREETS[2] + ROAD_HALF - 12, 0], [2320, STREETS[3] - ROAD_HALF + 12, Math.PI],
    [AVENUES[0] + ROAD_HALF - 12, 520, Math.PI / 2], [AVENUES[2] - ROAD_HALF + 12, 1120, -Math.PI / 2],
    [AVENUES[3] + ROAD_HALF - 12, 1720, Math.PI / 2], [AVENUES[4] - ROAD_HALF + 12, 920, -Math.PI / 2],
    [920, STREETS[2] + ROAD_HALF - 12, 0], [2120, STREETS[0] - ROAD_HALF + 12, Math.PI],
  ];
  for (const [x, y, a] of spots) {
    const c = makeCar(pick(["sedan", "sports", "convertible", "van", "taxi"]), x, y, a, { parked: true });
    S.cars.push(c);
  }
}

export function updateTraffic(dt) {
  for (let i = S.cars.length - 1; i >= 0; i--) {
    const c = S.cars[i];
    if (c.despawn) { S.cars.splice(i, 1); continue; }
    if (c.driver !== "traffic") continue;
    c.turnCooldown = Math.max(0, c.turnCooldown - dt);

    const dv = DIR_VEC[c.dir];
    // lane keeping: ease perpendicular coordinate toward the lane centre
    if (c.roadAxis === "h") {
      const targetY = laneCoord(c.dir, c.roadCoord);
      c.y += (targetY - c.y) * Math.min(1, 4 * dt);
      c.angle = c.dir === 0 ? 0 : Math.PI;
    } else {
      const targetX = laneCoord(c.dir, c.roadCoord);
      c.x += (targetX - c.x) * Math.min(1, 4 * dt);
      c.angle = c.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    // follow speed with car-ahead avoidance
    let target = c.targetSpeed;
    for (const o of S.cars) {
      if (o === c || o.wrecked) continue;
      const dx = o.x - c.x, dy = o.y - c.y;
      const ahead = dx * dv.x + dy * dv.y;
      const side = Math.abs(-dx * dv.y + dy * dv.x);
      if (ahead > 0 && ahead < 85 && side < 24) {
        target = Math.min(target, Math.max(0, Math.hypot(o.vx, o.vy) * 0.85));
        if (ahead < 46) target = 0;
      }
    }
    // ease speed
    const sp = Math.hypot(c.vx, c.vy);
    const ns = sp + clamp(target - sp, -260 * dt, 170 * dt);
    c.vx = dv.x * ns; c.vy = dv.y * ns;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.speed = ns;

    // intersection turning
    if (c.turnCooldown <= 0) {
      if (c.roadAxis === "h") {
        for (const ax of AVENUES) {
          if (Math.abs(c.x - ax) < 7) { maybeTurn(c, ax, c.roadCoord, "v"); break; }
        }
      } else {
        for (const sy of STREETS) {
          if (Math.abs(c.y - sy) < 7) { maybeTurn(c, c.roadCoord, sy, "h"); break; }
        }
      }
    }

    // wrap around world edges
    if (c.x < -70 || c.x > W + 70 || c.y < -70 || c.y > H + 70) {
      S.cars.splice(i, 1);
      const horizontal = rand() < 0.5;
      if (horizontal) {
        const sy = pick(STREETS);
        const dir = rand() < 0.5 ? 0 : 2;
        spawnTrafficCar(dir === 0 ? -50 : W + 50, laneCoord(dir, sy), dir, "h", sy);
      } else {
        const ax = pick(AVENUES);
        const dir = rand() < 0.5 ? 1 : 3;
        spawnTrafficCar(laneCoord(dir, ax), dir === 1 ? -50 : H + 50, dir, "v", ax);
      }
    }
  }
}

function maybeTurn(c, ax, sy, newAxis) {
  if (rand() > 0.38) { c.turnCooldown = 1.2; return; }
  const turn = rand() < 0.5 ? 1 : 3;
  const newDir = (c.dir + turn) % 4;
  // don't turn into a road that doesn't exist at this edge
  if (newAxis === "v" && !AVENUES.includes(ax)) return;
  if (newAxis === "h" && !STREETS.includes(sy)) return;
  c.dir = newDir;
  c.roadAxis = newAxis;
  c.roadCoord = newAxis === "v" ? ax : sy;
  // snap onto the correct lane of the new road
  if (newAxis === "v") c.x = laneCoord(newDir, ax);
  else c.y = laneCoord(newDir, sy);
  c.angle = newDir * Math.PI / 2;
  const dv = DIR_VEC[newDir];
  const sp = Math.hypot(c.vx, c.vy) * 0.7;
  c.vx = dv.x * sp; c.vy = dv.y * sp;
  c.turnCooldown = 1.6;
}
