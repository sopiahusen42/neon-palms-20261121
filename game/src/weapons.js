// weapons.js — weapon catalogue and firing logic (bullets + flash + sound hook).
import { S } from "./state.js";
import { addFlash } from "./effects.js";
import { playShot } from "./audio.js";

export const WEAPONS = {
  pistol: { name: "PISTOL", dmg: 14, rate: 0.26, speed: 920, spread: 0.035, mag: Infinity, auto: false },
  smg:    { name: "SMG",    dmg: 9,  rate: 0.085, speed: 980, spread: 0.085, mag: Infinity, auto: true },
};

export function giveWeapon(id, ammo) {
  S.player.weapon = id;
  S.player.ammo[id] = (S.player.ammo[id] ?? 0) + ammo;
}

// shooter: {x,y,angle}; team: 'player' | 'police'
export function fireWeapon(shooter, weaponId, angle, team) {
  const w = WEAPONS[weaponId];
  if (team === "player") {
    if (S.player.ammo[weaponId] <= 0) return false;
    S.player.ammo[weaponId]--;
    S.stats.shots++;
  }
  const a = angle + (Math.random() - 0.5) * w.spread * 2;
  const mx = shooter.x + Math.cos(angle) * 16;
  const my = shooter.y + Math.sin(angle) * 16;
  S.bullets.push({
    x: mx, y: my,
    vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
    life: 0.62, dmg: w.dmg, team,
  });
  addFlash(mx, my, angle, 13, 0.06);
  playShot(team === "player" ? 0.5 : 0.22);
  return true;
}
