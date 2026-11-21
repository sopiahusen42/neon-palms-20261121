// save.js — localStorage persistence (money, completed jobs, loadout).
import { S } from "./state.js";

const KEY = "neon-palms-save-v1";

export function saveGame() {
  try {
    const p = S.player;
    const data = {
      money: S.money,
      missionsDone: S.missionsDone,
      weapon: p.weapon,
      ammo: p.ammo,
      health: p.health,
      armor: p.armor,
      timeOfDay: S.timeOfDay,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* storage unavailable (private mode / headless) — play on */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (typeof d.money !== "number") return false;
    S.money = d.money;
    S.missionsDone = Array.isArray(d.missionsDone) ? d.missionsDone : [];
    const p = S.player;
    if (d.weapon === "smg" || d.weapon === "pistol") p.weapon = d.weapon;
    if (d.ammo) p.ammo = { pistol: d.ammo.pistol ?? 60, smg: d.ammo.smg ?? 0 };
    p.health = Math.max(20, d.health ?? 100);
    p.armor = d.armor ?? 0;
    if (typeof d.timeOfDay === "number") S.timeOfDay = d.timeOfDay % 24;
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
