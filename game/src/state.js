// state.js — the single mutable game state container every module reads/writes.
export const S = {
  mode: "boot",          // boot | title | play | pause
  staged: null,          // null in normal play; 'cover'|'chase'|'foot'|'title' in capture modes
  frozen: false,         // staged shots freeze after their single rendered frame
  tick: 0,
  dt: 1 / 60,
  timeOfDay: 13.0,       // hours 0..24
  dayLengthSec: 300,     // real seconds per full day
  rain: 0,               // 0..1 intensity
  wet: 0,                // road wetness (lags rain)
  money: 0,
  heat: 0,               // 0..100 -> wanted stars = floor(heat/20)
  lastCrimeTick: -9999,
  cars: [],              // traffic + parked + police cruisers
  peds: [],
  cops: [],              // officers on foot
  bullets: [],
  pickups: [],
  player: null,
  camera: { x: 1500, y: 1200, zoom: 1, shake: 0 },
  city: null,
  mission: null,         // active mission runtime object
  missionsDone: [],
  dialogue: null,        // {text, until}
  muted: false,
  stats: { shots: 0, crimes: 0, distance: 0 },
};

export const stars = () => Math.min(5, Math.floor(S.heat / 20));

export function addHeat(amount) {
  S.heat = Math.min(100, S.heat + amount);
  S.lastCrimeTick = S.tick;
  S.stats.crimes++;
}

export function say(text, seconds = 5) {
  S.dialogue = { text, until: S.tick + seconds * 60 };
}
