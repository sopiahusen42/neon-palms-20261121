// combat.js — bullet integration and hit resolution against peds, cops,
// the player, cars and buildings. Crimes feed the wanted system.
import { S, addHeat, stars } from "./state.js";
import { pointInBuilding } from "./world.js";
import { addSparks, addSmoke, addExplosion } from "./effects.js";
import { addShake } from "./camera.js";
import { playHit, playExplosion } from "./audio.js";

export function updateCombat(dt) {
  const bs = S.bullets;
  for (let i = bs.length - 1; i >= 0; i--) {
    const b = bs[i];
    b.life -= dt;
    const steps = 2; // substep so fast bullets don't tunnel
    let dead = b.life <= 0;
    for (let s = 0; s < steps && !dead; s++) {
      b.x += b.vx * dt / steps;
      b.y += b.vy * dt / steps;
      dead = hitTest(b);
    }
    if (dead) bs.splice(i, 1);
  }
}

function hitTest(b) {
  if (pointInBuilding(S.city.buildings, b.x, b.y)) {
    addSparks(b.x, b.y, 3, Math.atan2(-b.vy, -b.vx));
    return true;
  }
  if (b.team === "player") {
    // pedestrians
    for (let i = S.peds.length - 1; i >= 0; i--) {
      const p = S.peds[i];
      if (Math.hypot(p.x - b.x, p.y - b.y) < 11) {
        p.health -= b.dmg;
        addSparks(b.x, b.y, 4);
        addHeat(p.health <= 0 ? 26 : 14);
        if (p.health <= 0) {
          addSmoke(p.x, p.y, 0, -8, 8, 0.6);
          S.peds.splice(i, 1);
          S.money += 0; // no reward for cruelty — heat is the price
        } else {
          p.panic = 4;
        }
        playHit();
        return true;
      }
    }
    // officers
    for (let i = S.cops.length - 1; i >= 0; i--) {
      const c = S.cops[i];
      if (Math.hypot(c.x - b.x, c.y - b.y) < 12) {
        c.health -= b.dmg;
        addSparks(b.x, b.y, 4);
        addHeat(16);
        if (c.health <= 0) {
          S.cops.splice(i, 1);
          addHeat(14);
        }
        playHit();
        return true;
      }
    }
  } else {
    // police bullets vs player (on foot only; cars soak small arms)
    const p = S.player;
    if (!p.inCar && Math.hypot(p.x - b.x, p.y - b.y) < 12) {
      damagePlayer(b.dmg);
      addSparks(b.x, b.y, 3);
      return true;
    }
  }
  // cars (both teams)
  for (const car of S.cars) {
    if (car.driver === "player" && b.team === "player") continue;
    const dx = b.x - car.x, dy = b.y - car.y;
    if (Math.abs(dx) > car.l / 2 + 4 || Math.abs(dy) > car.l / 2 + 4) continue;
    // rotate into car space
    const ca = Math.cos(-car.angle), sa = Math.sin(-car.angle);
    const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
    if (Math.abs(lx) < car.l / 2 && Math.abs(ly) < car.w / 2) {
      car.hp -= b.dmg * 0.8;
      addSparks(b.x, b.y, 3);
      if (b.team === "player") addHeat(car.isPolice ? 18 : 5);
      if (car.hp <= 0 && !car.wrecked) {
        car.wrecked = true;
        const wasPlayer = car.driver === "player";
        car.driver = null;
        car.color = "#3a3d42";
        addExplosion(car.x, car.y);
        playExplosion();
        addShake(8);
        if (wasPlayer) {
          S.player.inCar = null;
          damagePlayer(40);
        }
      }
      return true;
    }
  }
  return false;
}

export function damagePlayer(dmg) {
  const p = S.player;
  if (p.inCar) { p.inCar.hp -= dmg * 0.5; return; }
  const soaked = Math.min(p.armor, dmg * 0.65);
  p.armor -= soaked;
  p.health -= dmg - soaked;
  addShake(2.5);
  if (p.health <= 0) {
    p.health = 0;
    if (S.mode === "play" && !S.staged) respawn();
  }
}

function respawn() {
  const p = S.player;
  p.health = 60; p.armor = 0;
  p.x = 881; p.y = 281;
  p.inCar = null;
  S.heat = 0;
  S.money = Math.max(0, S.money - 500);
  S.cops.length = 0;
  for (const c of S.cars) if (c.isPolice) c.despawn = true;
}
