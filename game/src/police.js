// police.js — five-star wanted system: heat decay on broken contact,
// cruiser spawning/chasing, roadblocks, and officers on foot who engage.
import { S, stars, addHeat } from "./state.js";
import { clamp, rand, pick, angDiff, dist } from "./math.js";
import { AVENUES, STREETS, ROAD_HALF, laneCoord, collideBuildings, W, H } from "./world.js";
import { makeCar } from "./vehicles.js";
import { driveCar } from "./driving.js";
import { fireWeapon } from "./weapons.js";

let spawnCd = 0, copCd = 0, blockCd = 0;

export function resetPolice() { spawnCd = 0; copCd = 0; blockCd = 0; }

export function updatePolice(dt) {
  const p = S.player;
  const st = stars();

  // ---- heat decay when contact is broken ----
  if (S.tick - S.lastCrimeTick > 240) {
    let nearest = Infinity;
    for (const c of S.cars) if (c.isPolice && c.siren) nearest = Math.min(nearest, dist(c.x, c.y, p.x, p.y));
    for (const c of S.cops) nearest = Math.min(nearest, dist(c.x, c.y, p.x, p.y));
    S.heat = Math.max(0, S.heat - (nearest > 420 ? 7 : 0.6) * dt);
  }

  // ---- cruisers ----
  spawnCd -= dt;
  const active = S.cars.filter((c) => c.isPolice && c.driver === "police" && !c.wrecked);
  const want = S.staged ? active.length : st * 2; // staged shots keep their cast
  if (active.length < want && spawnCd <= 0) {
    spawnCruiser(p);
    spawnCd = 1.1;
  }
  if (st === 0) {
    for (const c of active) if (dist(c.x, c.y, p.x, p.y) > 500) c.despawn = true;
  }

  for (const c of S.cars) {
    if (c.driver !== "police" || c.wrecked) continue;
    const d = dist(c.x, c.y, p.x, p.y);
    // predictive pursuit
    const lead = p.inCar ? 0.45 : 0.15;
    const tx = p.x + (p.inCar ? p.inCar.vx : 0) * lead;
    const ty = p.y + (p.inCar ? p.inCar.vy : 0) * lead;
    const wantA = Math.atan2(ty - c.y, tx - c.x);
    const diff = angDiff(c.angle, wantA);
    const controls = {
      throttle: d > (p.inCar ? 70 : 130) ? 1 : -0.4,
      steer: clamp(diff * 2.4, -1, 1),
      handbrake: Math.abs(diff) > 1.5 && c.speed > 200,
    };
    driveCar(c, controls, dt);
    // deploy officers when the player is on foot and close
    if (!p.inCar && d < 190 && !c.deployed) {
      c.deployed = true;
      spawnCop(c.x + Math.cos(c.angle + Math.PI / 2) * 26, c.y + Math.sin(c.angle + Math.PI / 2) * 26);
      if (st >= 3) spawnCop(c.x - Math.cos(c.angle + Math.PI / 2) * 26, c.y - Math.sin(c.angle + Math.PI / 2) * 26);
    }
    if (p.inCar) c.deployed = false;
  }

  // ---- roadblocks at 3+ stars ----
  blockCd -= dt;
  if (!S.staged && st >= 3 && blockCd <= 0) {
    spawnRoadblock(p);
    blockCd = 14;
  }

  // ---- officers on foot ----
  copCd -= dt;
  const wantCops = S.staged ? S.cops.length : (st >= 2 ? Math.min(7, st + 1) : 0);
  if (S.cops.length < wantCops && copCd <= 0) {
    const a = rand() * Math.PI * 2;
    const r = 260 + rand() * 160;
    spawnCop(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    copCd = 2.4;
  }
  for (let i = S.cops.length - 1; i >= 0; i--) {
    const c = S.cops[i];
    if (st === 0 && dist(c.x, c.y, p.x, p.y) > 300) { S.cops.splice(i, 1); continue; }
    updateCop(c, dt);
  }
}

function spawnCruiser(p) {
  // spawn on a road 650..950 units away
  for (let tries = 0; tries < 12; tries++) {
    const horizontal = rand() < 0.5;
    const road = horizontal ? pick(STREETS) : pick(AVENUES);
    const along = rand() * (horizontal ? W : H);
    const dir = rand() < 0.5 ? 0 : 2;
    let x, y;
    if (horizontal) { x = along; y = laneCoord(dir, road); }
    else { x = laneCoord(dir === 0 ? 1 : 3, road); y = along; }
    const d = dist(x, y, p.x, p.y);
    if (d < 620 || d > 1000) continue;
    const c = makeCar("cruiser", x, y, Math.atan2(p.y - y, p.x - x), {
      driver: "police", siren: true, color: "#e8eaee",
    });
    S.cars.push(c);
    return;
  }
}

function spawnRoadblock(p) {
  // two cruisers parked across the road ahead of the player
  const vx = p.inCar ? p.inCar.vx : Math.cos(p.angle);
  const vy = p.inCar ? p.inCar.vy : Math.sin(p.angle);
  const horizontal = Math.abs(vx) >= Math.abs(vy);
  if (horizontal) {
    const sy = STREETS.reduce((a, b) => Math.abs(b - p.y) < Math.abs(a - p.y) ? b : a);
    const bx = clamp(p.x + Math.sign(vx || 1) * 480, 120, W - 120);
    for (const off of [-26, 26]) {
      const c = makeCar("cruiser", bx, sy + off, Math.PI / 2, {
        driver: null, parked: true, blocking: true, siren: true, color: "#e8eaee",
      });
      S.cars.push(c);
    }
  } else {
    const ax = AVENUES.reduce((a, b) => Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a);
    const by = clamp(p.y + Math.sign(vy || 1) * 480, 120, H - 120);
    for (const off of [-26, 26]) {
      const c = makeCar("cruiser", ax + off, by, 0, {
        driver: null, parked: true, blocking: true, siren: true, color: "#e8eaee",
      });
      S.cars.push(c);
    }
  }
}

export function spawnCop(x, y) {
  const res = collideBuildings(S.city.buildings, x, y, 9);
  S.cops.push({
    x: res.x, y: res.y, angle: 0, health: 45,
    fireCd: 0.5 + rand(), burst: 0, phase: rand() * 6,
  });
}

function updateCop(c, dt) {
  const p = S.player;
  const d = dist(c.x, c.y, p.x, p.y);
  const wantA = Math.atan2(p.y - c.y, p.x - c.x);
  c.angle = wantA;
  c.phase += dt * 9;
  if (d > 195) {
    c.x += Math.cos(wantA) * 150 * dt;
    c.y += Math.sin(wantA) * 150 * dt;
    const res = collideBuildings(S.city.buildings, c.x, c.y, 9);
    c.x = res.x; c.y = res.y;
  } else if (d < 110) {
    c.x -= Math.cos(wantA) * 80 * dt;
    c.y -= Math.sin(wantA) * 80 * dt;
  }
  c.fireCd -= dt;
  if (d < 340 && c.fireCd <= 0) {
    fireWeapon(c, "pistol", wantA + (rand() - 0.5) * 0.14, "police");
    c.burst++;
    c.fireCd = c.burst % 4 === 0 ? 1.3 + rand() : 0.34;
  }
}

export function drawCops(ctx) {
  for (const c of S.cops) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = "rgba(15,17,24,0.3)";
    ctx.beginPath(); ctx.ellipse(2, 3, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(c.angle);
    const step = Math.sin(c.phase) * 2.6;
    ctx.fillStyle = "#1c2436";
    ctx.fillRect(-4 + step * 0.4, -6, 7, 4);
    ctx.fillRect(-4 - step * 0.4, 2, 7, 4);
    ctx.fillStyle = "#2c4a7c";
    ctx.beginPath(); ctx.arc(0, 0, 7.6, 0, Math.PI * 2); ctx.fill();
    // badge
    ctx.fillStyle = "#e8c33f";
    ctx.fillRect(2, -4, 2.4, 2.4);
    // drawn weapon
    ctx.strokeStyle = "#c89468";
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(12, -1); ctx.stroke();
    ctx.fillStyle = "#181a1f";
    ctx.fillRect(10, -2.2, 10, 3.8);
    ctx.fillStyle = "#c89468";
    ctx.beginPath(); ctx.arc(1, 0, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1c2436";
    ctx.beginPath(); ctx.arc(0.2, 0, 4.4, 1.1, Math.PI * 2 - 1.1); ctx.fill();
    ctx.restore();
  }
}
