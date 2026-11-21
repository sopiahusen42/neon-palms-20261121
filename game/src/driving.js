// driving.js — arcade car physics: throttle, steering, handbrake drift,
// skid detection, building & car collisions. Used by the player AND police AI.
import { clamp, rand } from "./math.js";
import { S } from "./state.js";
import { CAR_TYPES } from "./vehicles.js";
import { collideBuildings } from "./world.js";
import { addSkid, addSmoke } from "./effects.js";
import { addShake } from "./camera.js";
import { addHeat } from "./state.js";

// controls: {throttle:-1..1, steer:-1..1, handbrake:bool}
export function driveCar(car, controls, dt) {
  const t = CAR_TYPES[car.type];
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const rx = -fy, ry = fx;

  let forward = car.vx * fx + car.vy * fy;
  let lateral = car.vx * rx + car.vy * ry;

  // engine / brakes
  if (controls.throttle > 0) forward += t.accel * controls.throttle * dt;
  else if (controls.throttle < 0) {
    if (forward > 30) forward -= 420 * dt;            // braking
    else forward += t.accel * 0.55 * controls.throttle * dt; // reverse
  }
  // drag + rolling resistance
  forward -= forward * 0.55 * dt;
  forward -= Math.sign(forward) * Math.min(Math.abs(forward), 26 * dt);
  forward = clamp(forward, -t.top * 0.4, t.top);

  // lateral grip: handbrake turns the rear loose
  const grip = controls.handbrake ? 1.35 : t.grip;
  lateral -= lateral * Math.min(1, grip * dt);
  if (controls.handbrake) forward -= forward * 0.35 * dt;

  // steering (speed-sensitive, flips in reverse)
  const steerEff = clamp(Math.abs(forward) / 130, 0, 1) * Math.sign(forward || 1);
  const steerRate = t.steer * (controls.handbrake ? 1.55 : 1);
  car.angle += controls.steer * steerRate * steerEff * dt;

  // recompose velocity with the NEW heading -> drift emerges naturally
  const nfx = Math.cos(car.angle), nfy = Math.sin(car.angle);
  const nrx = -nfy, nry = nfx;
  car.vx = nfx * forward + nrx * lateral;
  car.vy = nfy * forward + nry * lateral;
  car.speed = Math.hypot(car.vx, car.vy);

  // integrate
  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // skids + tyre smoke when sliding
  const slip = Math.abs(lateral);
  if ((slip > 55 || (controls.handbrake && car.speed > 90)) && car.speed > 60) {
    const back = -car.l * 0.30;
    for (const side of [-1, 1]) {
      const wx = car.x + nfx * back + nrx * side * car.w * 0.42;
      const wy = car.y + nfy * back + nry * side * car.w * 0.42;
      const px = wx - car.vx * dt, py = wy - car.vy * dt;
      addSkid(px, py, wx, wy, clamp(slip / 220, 0.25, 0.6));
      if (rand() < 0.55) {
        addSmoke(wx, wy, -car.vx * 0.06 + (rand() - 0.5) * 22,
          -car.vy * 0.06 + (rand() - 0.5) * 22, 7 + rand() * 7, 0.7 + rand() * 0.6);
      }
    }
  }

  // building collision
  const res = collideBuildings(S.city.buildings, car.x, car.y, car.w * 0.62);
  if (res.hit) {
    const impact = car.speed;
    car.x = res.x; car.y = res.y;
    car.vx *= -0.25; car.vy *= -0.25;
    if (impact > 150) {
      car.hp -= impact * 0.03;
      if (car.driver === "player") {
        addShake(impact * 0.02);
        S.player.health -= impact * 0.008;
      }
    }
  }
  return slip;
}

// cheap circle push-apart between cars; returns impact speed if they touched
export function carCollisions(dt) {
  const cars = S.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (a.l + b.l) * 0.36;
      if (d > min || d < 0.001) continue;
      const nx = dx / d, ny = dy / d;
      const push = (min - d) / 2;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) {
        const imp = rel * 0.55;
        a.vx -= nx * imp; a.vy -= ny * imp;
        b.vx += nx * imp; b.vy += ny * imp;
        if (rel > 130) {
          a.hp -= rel * 0.02; b.hp -= rel * 0.02;
          const playerInvolved = a.driver === "player" || b.driver === "player";
          if (playerInvolved && !S.staged) {
            addHeat(6);
            addShake(4);
          }
        }
      }
    }
  }
}

export const mph = (speed) => Math.round(speed * 0.32);
