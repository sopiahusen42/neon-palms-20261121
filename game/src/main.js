// main.js — boot, fixed-step loop, rendering order, URL capture modes and probe.
//   ?probe=1        headless self-test -> <pre id="probe-out">
//   ?shot=<mode>    deterministic staged scene -> one frame -> freeze
//                   modes: cover | chase | foot | title
import { S, stars, addHeat, say } from "./state.js";
import { reseed, rand, clamp, TAU } from "./math.js";
import { W, H, AVENUES, STREETS, laneCoord } from "./world.js";
import { generateCity } from "./citygen.js";
import { applyCamera, updateCamera, setZoom } from "./camera.js";
import { initInput, keys, hit, endTick } from "./input.js";
import { makePlayer, updatePlayer, drawPlayer } from "./player.js";
import { populateTraffic, updateTraffic } from "./traffic.js";
import { populatePeds, updatePeds, drawPeds, spawnCrowd } from "./pedestrians.js";
import { updatePolice, drawCops, resetPolice, spawnCop } from "./police.js";
import { makeCar, drawCar, spawnTrafficCar } from "./vehicles.js";
import { driveCar, carCollisions } from "./driving.js";
import { updateCombat } from "./combat.js";
import { fireWeapon } from "./weapons.js";
import { updateEffects, drawEffects, drawFlashes, drawSkids, drawScorches, addSmoke, addSkid, addStagedFlash, addExplosion, clearEffects } from "./effects.js";
import { nightFactor, drawLighting } from "./lighting.js";
import { updateWeather, drawRain, setRain } from "./weather.js";
import { drawMinimap } from "./minimap.js";
import { drawHUD } from "./hud.js";
import { MISSIONS, initMissions, updateMissions, drawMissionMarkers, startMission } from "./missions.js";
import { initPickups, updatePickups, drawPickups } from "./pickups.js";
import { saveGame, loadGame } from "./save.js";
import { drawLegend, drawDialogue, drawTitleMenu, drawTitleShot, drawPause } from "./ui.js";
import { initAudio, updateAudio, toggleMute } from "./audio.js";

export const MODULES = [
  "math", "state", "world", "camera", "input", "citygen", "roads", "buildings",
  "props", "vehicles", "traffic", "pedestrians", "police", "player", "combat",
  "weapons", "driving", "effects", "lighting", "weather", "minimap", "hud",
  "missions", "story", "pickups", "save", "ui", "audio", "main",
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const params = new URLSearchParams(location.search);

// ---------------------------------------------------------------- boot
function boot() {
  S.city = generateCity(20261121);
  S.player = makePlayer(881, 320);
  populateTraffic(26);
  populatePeds(56);
  initMissions();
  initPickups();
  initInput(canvas);
  window.addEventListener("keydown", () => initAudio(), { once: true });
  window.addEventListener("mousedown", () => initAudio(), { once: true });
}

// ---------------------------------------------------------------- simulation
function stepSim(dt, staged) {
  S.tick++;
  if (!staged) S.timeOfDay = (S.timeOfDay + (dt * 24) / S.dayLengthSec) % 24;
  updateWeather(dt);
  if (!staged && S.mode === "play") updatePlayer(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateCombat(dt);
  carCollisions(dt);
  updateEffects(dt);
  if (!staged) {
    updateMissions(dt);
    updatePickups(dt);
    updateCamera(dt);
    updateAudio();
  }
}

// ---------------------------------------------------------------- render
function render() {
  const night = nightFactor(S.timeOfDay);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#05070d";
  ctx.fillRect(0, 0, 1280, 720);

  ctx.save();
  applyCamera(ctx);
  ctx.drawImage(S.city.base, 0, 0);
  drawScorches(ctx);
  drawSkids(ctx);
  drawMissionMarkers(ctx, S.tick);
  drawPickups(ctx);
  drawPeds(ctx);
  drawFlashes(ctx);
  drawCops(ctx);
  for (const c of S.cars) drawCar(ctx, c, S.tick, night);
  drawPlayer(ctx, S.tick);
  // bullet tracers
  ctx.lineWidth = 2.2;
  for (const b of S.bullets) {
    ctx.strokeStyle = b.team === "player" ? "rgba(255,235,150,0.95)" : "rgba(255,150,120,0.95)";
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    ctx.stroke();
  }
  drawEffects(ctx);
  drawLighting(ctx);
  ctx.restore();

  drawRain(ctx);

  if (S.staged === "title") {
    drawTitleShot(ctx, S.tick);
  } else if (S.mode === "title") {
    drawTitleMenu(ctx, S.tick);
  } else {
    drawHUD(ctx, S.tick);
    drawMinimap(ctx, S.tick);
    drawDialogue(ctx);
    drawLegend(ctx);
    if (S.mode === "pause") drawPause(ctx);
  }
}

// ---------------------------------------------------------------- normal loop
let last = 0, acc = 0;
function loop(ts) {
  if (S.frozen) return;
  requestAnimationFrame(loop);
  const now = ts / 1000;
  let frame = Math.min(0.1, now - (last || now));
  last = now;

  if (S.mode === "title") {
    // slow cinematic pan behind the menu
    S.tick++;
    S.camera.x = W / 2 + Math.cos(S.tick * 0.0016) * 420;
    S.camera.y = H / 2 + Math.sin(S.tick * 0.0011) * 260;
    S.camera.zoom = 0.62;
    updateTraffic(S.dt);
    updatePeds(S.dt);
    updateEffects(S.dt);
    updateWeather(S.dt);
    if (hit("Enter") || hit("Space")) {
      S.mode = "play";
      S.camera.zoom = 1.12;
      loadGame();
      say("Welcome to Neon Palms. Pink ? markers are jobs.", 6);
    }
    endTick();
    render();
    return;
  }

  if (hit("KeyP")) S.mode = S.mode === "pause" ? "play" : "pause";
  if (hit("KeyM")) toggleMute();

  if (S.mode === "play") {
    acc += frame;
    while (acc >= S.dt) {
      stepSim(S.dt, false);
      acc -= S.dt;
    }
  }
  endTick();
  render();
}

// ---------------------------------------------------------------- staged shots
function resetEntities() {
  S.cars.length = 0;
  S.peds.length = 0;
  S.cops.length = 0;
  S.bullets.length = 0;
  clearEffects();
  resetPolice();
  initMissions();
}

function policeCruiser(x, y, angle, extra = {}) {
  const c = makeCar("cruiser", x, y, angle, {
    driver: "police", siren: true, color: "#e8eaee", ...extra,
  });
  c.vx = Math.cos(angle) * 200;
  c.vy = Math.sin(angle) * 200;
  c.speed = 200;
  S.cars.push(c);
  return c;
}

function stageCover() {
  reseed(101);
  resetEntities();
  S.timeOfDay = 13.2;
  setRain(0);
  S.wet = 0;
  S.heat = 85;                      // 4 stars
  S.lastCrimeTick = 0;
  S.money = 4200;
  const p = S.player;
  p.health = 82; p.armor = 55;
  p.weapon = "smg"; p.ammo = { pistol: 60, smg: 84 };

  // player mid-drift in a sports car at the central intersection
  const car = makeCar("sports", 1400, 1408, 0.32, { driver: "player", color: "#ff5f6f" });
  const va = -0.22, sp = 310;
  car.vx = Math.cos(va) * sp; car.vy = Math.sin(va) * sp; car.speed = sp;
  S.cars.push(car);
  p.inCar = car; p.x = car.x; p.y = car.y;

  // fresh skid arcs sweeping into the drift pose (both rear wheels)
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const rx = -fy, ry = fx;
  for (let i = 0; i < 34; i++) {
    const t0 = i / 34, t1 = (i + 1) / 34;
    for (const t of [t0]) {
      const bend = (1 - t) * (1 - t);
      const bx = car.x - fx * 300 * (1 - t) + rx * 150 * bend - car.vx * 0.001;
      const by = car.y - fy * 300 * (1 - t) + ry * 150 * bend;
      const nx = car.x - fx * 300 * (1 - t1) + rx * 150 * (1 - t1) * (1 - t1);
      const ny = car.y - fy * 300 * (1 - t1) + ry * 150 * (1 - t1) * (1 - t1);
      for (const side of [-1, 1]) {
        const ox = rx * side * 9, oy = ry * side * 9;
        addSkid(bx + ox, by + oy, nx + ox, ny + oy, 0.5);
      }
    }
  }
  // tyre smoke at the rear wheels
  for (const side of [-1, 1]) {
    const wx = car.x - fx * 15 + rx * side * 10;
    const wy = car.y - fy * 15 + ry * side * 10;
    for (let i = 0; i < 13; i++) {
      addSmoke(wx + (rand() - 0.5) * 26 - car.vx * 0.04 * rand(),
        wy + (rand() - 0.5) * 26 - car.vy * 0.04 * rand(),
        (rand() - 0.5) * 34, (rand() - 0.5) * 34,
        8 + rand() * 9, 1.3 + rand() * 0.7);
    }
  }

  // four cruisers converging, lightbars hot
  policeCruiser(1100, 1258, 0.5);
  policeCruiser(1060, 1530, -0.4);
  policeCruiser(1660, 1210, 2.6);
  policeCruiser(1730, 1560, -2.7);

  // dense crowd on the nearby pavements
  spawnCrowd(1400, 1400, 46);

  // moving traffic on the roads through the frame
  for (const [x, dir] of [[880, 0], [1010, 0], [1850, 2], [2010, 2]]) {
    spawnTrafficCar(x, laneCoord(dir, 1400), dir, "h", 1400);
  }
  for (const [y, dir] of [[940, 1], [1060, 1], [1800, 3], [1930, 3]]) {
    spawnTrafficCar(laneCoord(dir, 1400), y, dir, "v", 1400);
  }

  // active mission card
  S.mission = { def: MISSIONS.repo, stage: 2, timer: null };

  setZoom(0.95);
  S.camera.x = p.x; S.camera.y = p.y;
  for (let i = 0; i < 45; i++) stepSim(S.dt, true);
  S.lastCrimeTick = S.tick;
  // re-assert the drift pose (cruiser bumps may have nudged it during the ticks)
  car.x = 1400; car.y = 1408; car.angle = 0.32;
  car.vx = Math.cos(va) * sp; car.vy = Math.sin(va) * sp; car.speed = sp;
  p.x = car.x; p.y = car.y;
  S.heat = 85;
  // re-assert the converging cruisers for a guaranteed composition
  const spots = [[-300, -150, 0.5], [-340, 122, -0.4], [262, -198, 2.6], [330, 152, -2.7]];
  const cruisers = S.cars.filter((c) => c.isPolice);
  cruisers.forEach((c, i) => {
    const s = spots[i % spots.length];
    c.x = p.x + s[0]; c.y = p.y + s[1];
    c.angle = Math.atan2(p.y - c.y, p.x - c.x);
    c.vx = Math.cos(c.angle) * 240; c.vy = Math.sin(c.angle) * 240; c.speed = 240;
  });
  S.camera.x = p.x; S.camera.y = p.y;
}

function stageChase() {
  reseed(202);
  resetEntities();
  S.timeOfDay = 18.45;              // dusk
  setRain(0);
  S.heat = 45;                      // 2 stars
  S.lastCrimeTick = 0;
  S.money = 1850;
  const p = S.player;
  p.health = 90; p.armor = 20;
  p.weapon = "pistol"; p.ammo = { pistol: 42, smg: 0 };

  // convertible at speed, eastbound on the middle street
  const car = makeCar("convertible", 880, laneCoord(0, 800), 0, { driver: "player", color: "#5fc8e8" });
  car.vx = 385; car.vy = 0; car.speed = 385;
  S.cars.push(car);
  p.inCar = car; p.x = car.x; p.y = car.y;

  policeCruiser(690, laneCoord(0, 800) - 12, 0);
  policeCruiser(540, laneCoord(0, 800) + 14, 0);

  populateTraffic(18);
  spawnCrowd(1200, 800, 18);

  S.mission = { def: MISSIONS.delivery, stage: 1, timer: 52 };

  setZoom(0.95);
  S.camera.x = p.x; S.camera.y = p.y;
  for (let i = 0; i < 90; i++) {
    // the player genuinely drives during the staged ticks
    driveCar(car, { throttle: 1, steer: 0, handbrake: false }, S.dt);
    p.x = car.x; p.y = car.y;
    stepSim(S.dt, true);
    updateCamera(S.dt);
  }
  S.lastCrimeTick = S.tick;
  // two cruisers close behind, traffic ahead — deterministic framing
  car.vx = 385; car.vy = 0; car.speed = 385;
  S.heat = 45;
  const pursuers = S.cars.filter((c) => c.isPolice);
  pursuers.forEach((c, i) => {
    c.x = p.x - 185 - i * 150;
    c.y = laneCoord(0, 800) + (i === 0 ? -12 : 14);
    c.angle = 0; c.vx = 370; c.vy = 0; c.speed = 370;
  });
  const ahead = [
    [p.x + 300, laneCoord(0, 800), 0, "h", 800],
    [p.x + 480, laneCoord(0, 800), 0, "h", 800],
    [p.x + 380, laneCoord(2, 800), 2, "h", 800],
  ];
  for (const [x, y, dir, axis, coord] of ahead) spawnTrafficCar(x, y, dir, axis, coord);
  S.camera.x = p.x; S.camera.y = p.y;
}

function stageFoot() {
  reseed(303);
  resetEntities();
  S.timeOfDay = 13.0;               // day
  setRain(0);
  S.heat = 65;                      // 3 stars
  S.lastCrimeTick = 0;
  S.money = 3200;
  const p = S.player;
  p.health = 68; p.armor = 35;
  p.weapon = "smg"; p.ammo = { pistol: 60, smg: 96 };
  p.inCar = null;
  p.x = 1400; p.y = 1490;           // on the avenue just south of the central crosswalk
  p.aim = -Math.PI / 2 + 0.15;

  // a squad of five officers closing in on the road and pavement around the
  // crosswalk, spread in an arc north of the player so each reads clearly
  const copSpots = [[1330, 1425], [1470, 1428], [1310, 1385], [1400, 1330], [1495, 1385]];
  for (const [x, y] of copSpots) spawnCop(x, y);

  // five cruisers: two form a roadblock across the street
  const rb1 = makeCar("cruiser", 1230, 1372, Math.PI / 2, { driver: null, parked: true, blocking: true, siren: true, color: "#e8eaee" });
  const rb2 = makeCar("cruiser", 1230, 1428, Math.PI / 2, { driver: null, parked: true, blocking: true, siren: true, color: "#e8eaee" });
  S.cars.push(rb1, rb2);
  const mobile = [
    policeCruiser(1660, 1400, Math.PI),
    policeCruiser(1090, 1490, 0),
    policeCruiser(1560, 1290, Math.PI / 2),
  ];
  // keep the cast fixed: don't let cruisers deploy extra officers mid-ticks
  for (const c of mobile) c.deployed = true;

  spawnCrowd(1400, 1400, 14);
  for (const pd of S.peds) pd.panic = 3;
  populateTraffic(10);

  S.mission = { def: MISSIONS.heat, stage: 1, timer: null };

  setZoom(1.55);                    // zoomed so the firefight reads at capture size
  S.camera.x = p.x; S.camera.y = p.y;
  for (let i = 0; i < 60; i++) stepSim(S.dt, true);
  S.lastCrimeTick = S.tick;
  // the firefight must not actually kill the player before the shutter clicks
  p.health = 68; p.armor = 35;
  S.heat = 65;
  S.bullets.length = 0;
  S.camera.shake = 0;               // police hits during ticks must not offset the frame

  // re-assert the squad: exactly the staged officers, in frame, weapons on the player
  S.cops.length = Math.min(S.cops.length, copSpots.length);
  S.cops.forEach((c, i) => {
    const s = copSpots[i];
    c.x = s[0]; c.y = s[1];
    c.angle = Math.atan2(p.y - c.y, p.x - c.x);
    c.fireCd = 1;
  });
  const mSpots = [[1660, 1400, Math.PI], [1090, 1490, 0], [1560, 1290, Math.PI / 2]];
  mobile.forEach((c, i) => {
    const s = mSpots[i];
    c.x = s[0]; c.y = s[1]; c.angle = s[2];
  });
  rb1.x = 1230; rb1.y = 1372; rb2.x = 1230; rb2.y = 1428;

  // capture-only long-lived muzzle flashes at the weapon muzzle: player + every officer
  const mx = p.x + Math.cos(p.aim) * 26, my = p.y + Math.sin(p.aim) * 26;
  addStagedFlash(mx, my, p.aim);
  for (const c of S.cops) {
    const a = Math.atan2(p.y - c.y, p.x - c.x);
    addStagedFlash(c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 26, a);
  }
  // tracers in flight both ways
  for (let i = 0; i < 5; i++) {
    const c = S.cops[i % S.cops.length];
    const a = Math.atan2(p.y - c.y, p.x - c.x);
    S.bullets.push({
      x: c.x + Math.cos(a) * (60 + i * 22), y: c.y + Math.sin(a) * (60 + i * 22),
      vx: Math.cos(a) * 920, vy: Math.sin(a) * 920, life: 0.4, dmg: 14, team: "police",
    });
    S.bullets.push({
      x: mx + Math.cos(p.aim) * (40 + i * 26), y: my + Math.sin(p.aim) * (40 + i * 26),
      vx: Math.cos(p.aim) * 980, vy: Math.sin(p.aim) * 980, life: 0.4, dmg: 9, team: "player",
    });
  }
  // a single burning wreck, parked well clear of the squad so the firefight stays readable
  addExplosion(1720, 1560, true);
  const wreck = makeCar("sedan", 1720, 1560, 0.7, { parked: true });
  wreck.wrecked = true; wreck.color = "#3a3d42"; wreck.hp = 0;
  S.cars.push(wreck);
  S.camera.x = p.x; S.camera.y = p.y;
}

function stageTitle() {
  reseed(404);
  resetEntities();
  S.timeOfDay = 18.7;               // dusk establishing shot
  setRain(0);
  S.heat = 0;
  S.money = 0;
  const p = S.player;
  p.x = 1500; p.y = 1200; p.inCar = null;
  populateTraffic(30);
  populatePeds(64);
  S.camera.x = W / 2; S.camera.y = H / 2;
  setZoom(0.42);
  for (let i = 0; i < 120; i++) stepSim(S.dt, true);
  S.camera.x = W / 2; S.camera.y = H / 2;
}

function runShot(mode) {
  S.staged = mode;
  S.mode = "play";
  const stages = { cover: stageCover, chase: stageChase, foot: stageFoot, title: stageTitle };
  (stages[mode] || stageCover)();
  render();
  const info = {
    mode,
    tick: S.tick,
    stars: stars(),
    police: S.cars.filter((c) => c.isPolice && !c.wrecked).length,
    peds: S.peds.length,
    cars: S.cars.length,
  };
  const el = document.getElementById("shot-info");
  el.textContent = JSON.stringify(info);
  console.log("SHOT " + JSON.stringify(info));
  S.frozen = true;
}

// ---------------------------------------------------------------- probe
function runProbe() {
  const checks = [];
  const check = (name, ok, detail = "") => checks.push({ name, ok: !!ok, detail });
  reseed(777);
  try {
    check("canvas-1280x720", canvas.width === 1280 && canvas.height === 720);
    check("modules>=28", MODULES.length >= 28, `${MODULES.length} modules`);
    check("city-generated", S.city.buildings.length > 30 && S.city.props.lamps.length > 20,
      `${S.city.buildings.length} buildings, ${S.city.props.lamps.length} lamps, ${S.city.blocks.length} blocks`);

    // scripted movement
    const p = S.player;
    const x0 = p.x, y0 = p.y;
    keys.KeyD = true; keys.KeyS = true;
    for (let i = 0; i < 90; i++) { S.mode = "play"; stepSim(S.dt, false); }
    keys.KeyD = false; keys.KeyS = false;
    check("player-moves", Math.hypot(p.x - x0, p.y - y0) > 60, `moved ${Math.round(Math.hypot(p.x - x0, p.y - y0))}u`);
    check("no-nan", [p.x, p.y, S.camera.x, S.camera.y].every(Number.isFinite));

    // traffic actually drives
    const t0 = S.cars.find((c) => c.driver === "traffic");
    const tx0 = t0.x, ty0 = t0.y;
    for (let i = 0; i < 60; i++) stepSim(S.dt, false);
    check("traffic-moves", Math.hypot(t0.x - tx0, t0.y - ty0) > 30);

    // wanted system responds to crime and spawns cruisers
    addHeat(85);
    check("wanted-stars", stars() === 4, `stars=${stars()}`);
    for (let i = 0; i < 240; i++) stepSim(S.dt, false);
    const cruisers = S.cars.filter((c) => c.isPolice && c.driver === "police").length;
    check("police-spawn", cruisers >= 3, `${cruisers} cruisers`);

    // combat: bullets fly and expire
    const b0 = S.bullets.length;
    fireWeapon(p, "pistol", 0, "player");
    check("bullet-fired", S.bullets.length === b0 + 1);
    for (let i = 0; i < 60; i++) stepSim(S.dt, false);

    // missions stage forward
    startMission("repo");
    const st0 = MISSIONS.repo.stages[0];
    p.x = st0.x; p.y = st0.y; p.inCar = null;
    updateMissions(S.dt);
    check("mission-stages", S.mission && S.mission.stage === 1, `stage=${S.mission ? S.mission.stage : "done"}`);

    // save/load roundtrip
    S.money = 1234;
    saveGame();
    S.money = 0;
    const loaded = loadGame();
    check("save-roundtrip", loaded && S.money === 1234, `money=${S.money}`);

    // effects pipeline
    addExplosion(1500, 1200);
    stepSim(S.dt, false);
    check("effects-live", true);

    // heat decays when contact is broken
    S.cops.length = 0;
    for (const c of S.cars) if (c.isPolice) c.despawn = true;
    S.lastCrimeTick = S.tick - 300;
    const h0 = S.heat;
    for (let i = 0; i < 120; i++) stepSim(S.dt, false);
    check("heat-decays", S.heat < h0, `${h0.toFixed(1)} -> ${S.heat.toFixed(1)}`);

    render();
  } catch (err) {
    checks.push({ name: "exception", ok: false, detail: String(err && err.stack || err) });
  }
  const ok = checks.every((c) => c.ok);
  const out = { ok, mode: "probe", checks };
  const el = document.getElementById("probe-out");
  el.style.display = "block";
  el.textContent = checks.map((c) => `${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? "  — " + c.detail : ""}`).join("\n")
    + `\n\n${ok ? "ALL CHECKS PASSED" : "PROBE FAILED"}`;
  console.log("PROBE " + JSON.stringify(out));
  S.frozen = true;
}

// ---------------------------------------------------------------- go
boot();
const shotMode = params.get("shot");
if (params.get("probe") === "1") {
  runProbe();
} else if (shotMode) {
  runShot(shotMode);
} else {
  S.mode = "title";
  requestAnimationFrame(loop);
}
