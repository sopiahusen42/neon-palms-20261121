// player.js — on-foot movement, mouse aiming, firing, entering/exiting cars.
import { S, addHeat, say } from "./state.js";
import { clamp, dist } from "./math.js";
import { down, hit, mouse, moveAxes } from "./input.js";
import { collideBuildings } from "./world.js";
import { driveCar } from "./driving.js";
import { fireWeapon, WEAPONS } from "./weapons.js";
import { setZoom } from "./camera.js";
import { playEnter } from "./audio.js";

export function makePlayer(x, y) {
  return {
    x, y, angle: 0, aim: 0,
    health: 100, armor: 0,
    inCar: null,
    weapon: "pistol",
    ammo: { pistol: 60, smg: 0 },
    fireCd: 0,
    walkPhase: 0,
    sprint: false,
  };
}

export function updatePlayer(dt) {
  const p = S.player;
  p.fireCd = Math.max(0, p.fireCd - dt);

  if (p.inCar) {
    updateDriving(p, dt);
    return;
  }

  // ---- on foot ----
  const ax = moveAxes();
  p.sprint = down("ShiftLeft") || down("ShiftRight");
  const speed = p.sprint ? 245 : 168;
  p.x += ax.x * speed * dt;
  p.y += ax.y * speed * dt;
  if (ax.x || ax.y) {
    p.angle = Math.atan2(ax.y, ax.x);
    p.walkPhase += dt * (p.sprint ? 14 : 9);
    S.stats.distance += speed * dt;
  }
  const res = collideBuildings(S.city.buildings, p.x, p.y, 9);
  p.x = res.x; p.y = res.y;

  // aim at mouse (screen -> world)
  const c = S.camera;
  const wx = (mouse.x - 640) / c.zoom + c.x;
  const wy = (mouse.y - 360) / c.zoom + c.y;
  p.aim = Math.atan2(wy - p.y, wx - p.x);

  // fire
  const w = WEAPONS[p.weapon];
  const wantFire = w.auto ? mouse.down : mouse.clicked;
  if (wantFire && p.fireCd <= 0 && p.ammo[p.weapon] > 0) {
    if (fireWeapon(p, p.weapon, p.aim, "player")) {
      p.fireCd = w.rate;
      addHeat(2);
    }
  }

  // weapon switch
  if (hit("Digit1")) p.weapon = "pistol";
  if (hit("Digit2") && p.ammo.smg > 0) p.weapon = "smg";

  // enter nearest car
  if (hit("KeyE")) tryEnterCar(p);

  setZoom(1.12);
}

function updateDriving(p, dt) {
  const car = p.inCar;
  const ax = moveAxes();
  const controls = {
    throttle: (down("KeyW") || down("ArrowUp") ? 1 : 0) + (down("KeyS") || down("ArrowDown") ? -1 : 0),
    steer: (down("KeyD") || down("ArrowRight") ? 1 : 0) + (down("KeyA") || down("ArrowLeft") ? -1 : 0),
    handbrake: down("Space"),
  };
  driveCar(car, controls, dt);
  p.x = car.x; p.y = car.y;
  p.angle = car.angle;
  S.stats.distance += car.speed * dt;

  // drive-by: fire toward mouse with the current weapon
  const c = S.camera;
  const wx = (mouse.x - 640) / c.zoom + c.x;
  const wy = (mouse.y - 360) / c.zoom + c.y;
  p.aim = Math.atan2(wy - p.y, wx - p.x);
  const w = WEAPONS[p.weapon];
  const wantFire = w.auto ? mouse.down : mouse.clicked;
  if (wantFire && p.fireCd <= 0 && p.ammo[p.weapon] > 0) {
    if (fireWeapon(p, p.weapon, p.aim, "player")) {
      p.fireCd = w.rate * 1.3;
      addHeat(3);
    }
  }
  if (hit("Digit1")) p.weapon = "pistol";
  if (hit("Digit2") && p.ammo.smg > 0) p.weapon = "smg";

  if (hit("KeyE") && car.speed < 140) {
    p.inCar = null;
    car.driver = null;
    car.parked = true;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    playEnter();
  }
  setZoom(car.speed > 260 ? 0.9 : 0.98);
}

function tryEnterCar(p) {
  let best = null, bd = 62;
  for (const car of S.cars) {
    if (car.wrecked) continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bd) { bd = d; best = car; }
  }
  if (!best) return;
  const wasPolice = best.isPolice;
  const occupied = best.driver === "traffic";
  best.driver = "player";
  best.parked = false;
  best.siren = false;
  p.inCar = best;
  playEnter();
  if (wasPolice) { addHeat(30); say("Grand theft auto: police cruiser. That's bold.", 4); }
  else if (occupied) { addHeat(12); say("Carjacked! The owner is not happy.", 3.5); }
  else say("Vehicle acquired.", 2.5);
}

export function drawPlayer(ctx, tick) {
  const p = S.player;
  if (p.inCar) return; // drawn inside the car
  ctx.save();
  ctx.translate(p.x, p.y);
  // shadow
  ctx.fillStyle = "rgba(15,17,24,0.3)";
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(p.aim);
  // legs step
  const step = Math.sin(p.walkPhase) * 3;
  ctx.fillStyle = "#2c3a55";
  ctx.fillRect(-4 + step * 0.4, -6, 7, 4);
  ctx.fillRect(-4 - step * 0.4, 2, 7, 4);
  // torso (Hawaiian shirt)
  ctx.fillStyle = "#e8788a";
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f5d8a8";
  ctx.beginPath(); ctx.arc(0, 0, 8, -0.7, 0.7); ctx.fill();
  // arms + gun toward aim
  ctx.strokeStyle = "#e0b48c";
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(12, -1); ctx.stroke();
  ctx.fillStyle = "#23262c";
  ctx.fillRect(10, -2.4, p.weapon === "smg" ? 13 : 9, 4);
  // head
  ctx.fillStyle = "#e0b48c";
  ctx.beginPath(); ctx.arc(1, 0, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2f26";
  ctx.beginPath(); ctx.arc(-0.5, 0, 4.2, 1.2, Math.PI * 2 - 1.2); ctx.fill();
  ctx.restore();
}
