// vehicles.js — vehicle archetypes, spawning and top-down car rendering.
import { rand, pick, roundRect, TAU } from "./math.js";
import { S } from "./state.js";

export const CAR_TYPES = {
  sedan:       { l: 46, w: 22, accel: 250, top: 360, grip: 7.5, steer: 2.5 },
  sports:      { l: 48, w: 21, accel: 360, top: 470, grip: 6.2, steer: 2.9 },
  convertible: { l: 46, w: 22, accel: 310, top: 430, grip: 6.6, steer: 2.7 },
  cruiser:     { l: 50, w: 23, accel: 320, top: 415, grip: 7.2, steer: 2.7 },
  taxi:        { l: 46, w: 22, accel: 240, top: 340, grip: 7.5, steer: 2.5 },
  van:         { l: 54, w: 25, accel: 190, top: 290, grip: 8.0, steer: 2.1 },
};

const TRAFFIC_COLS = ["#c8544f", "#4f7fc8", "#58a06a", "#c8a44f", "#8a6fc8", "#d0d3d8", "#5b6270", "#c87f4f", "#4fb8c8", "#a85f8f"];

export function makeCar(type, x, y, angle, opts = {}) {
  const t = CAR_TYPES[type];
  return {
    type, x, y, angle,
    vx: 0, vy: 0, speed: 0,
    l: t.l, w: t.w,
    color: opts.color ?? (type === "taxi" ? "#e8c33f" : pick(TRAFFIC_COLS)),
    hp: opts.hp ?? 100,
    driver: opts.driver ?? null,      // 'player' | 'traffic' | 'police' | null(parked)
    isPolice: type === "cruiser",
    lightPhase: rand() * TAU,
    dir: opts.dir ?? 0,
    roadAxis: opts.roadAxis ?? null,  // 'h' | 'v'
    roadCoord: opts.roadCoord ?? 0,
    targetSpeed: opts.targetSpeed ?? 150,
    turnCooldown: 0,
    siren: opts.siren ?? false,
    parked: opts.parked ?? false,
    blocking: opts.blocking ?? false, // roadblock cruiser
    ...opts.extra,
  };
}

export function spawnTrafficCar(x, y, dir, axis, coord) {
  const type = pick(["sedan", "sedan", "sedan", "taxi", "van", "sports", "convertible"]);
  const c = makeCar(type, x, y, dir * Math.PI / 2, {
    driver: "traffic", dir, roadAxis: axis, roadCoord: coord,
    targetSpeed: 120 + rand() * 90,
  });
  c.vx = Math.cos(c.angle) * c.targetSpeed;
  c.vy = Math.sin(c.angle) * c.targetSpeed;
  S.cars.push(c);
  return c;
}

export function drawCar(ctx, car, tick, night) {
  const { l, w } = car;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // shadow
  ctx.fillStyle = "rgba(15,17,24,0.35)";
  roundRect(ctx, -l / 2 + 3, -w / 2 + 4, l, w, 6); ctx.fill();

  // tyres
  ctx.fillStyle = "#181a1f";
  for (const sx of [-l * 0.30, l * 0.30]) {
    ctx.fillRect(sx - 5, -w / 2 - 2, 10, 4);
    ctx.fillRect(sx - 5, w / 2 - 2, 10, 4);
  }

  // body
  const grad = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
  grad.addColorStop(0, car.color);
  grad.addColorStop(1, shade(car.color, -28));
  ctx.fillStyle = grad;
  roundRect(ctx, -l / 2, -w / 2, l, w, car.type === "sports" ? 9 : 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(10,12,16,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (car.isPolice) {
    // black & white livery
    ctx.fillStyle = "#1c2026";
    ctx.fillRect(-l / 2 + 4, -w / 2 + 2, l * 0.28, w - 4);
    ctx.fillRect(l / 2 - 4 - l * 0.28, -w / 2 + 2, l * 0.28, w - 4);
    ctx.fillStyle = "#e8eaee";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("POLICE", 0, w / 2 - 4);
    // lightbar
    const phase = Math.floor(tick / 6 + car.lightPhase) % 2;
    ctx.fillStyle = "#22262c";
    ctx.fillRect(-6, -w / 2 + 3, 12, w - 6);
    ctx.fillStyle = phase ? "#ff3b30" : "#3b6cff";
    ctx.fillRect(-5, -w / 2 + 4, 5, w - 8);
    ctx.fillStyle = phase ? "#3b6cff" : "#ff3b30";
    ctx.fillRect(0, -w / 2 + 4, 5, w - 8);
  } else if (car.type === "convertible") {
    // open top: cabin floor + two seats + driver head
    ctx.fillStyle = shade(car.color, -45);
    roundRect(ctx, -l * 0.18, -w / 2 + 3, l * 0.42, w - 6, 4); ctx.fill();
    ctx.fillStyle = "#3a3f47";
    ctx.fillRect(-l * 0.10, -w / 2 + 4, 7, 6);
    ctx.fillRect(-l * 0.10, w / 2 - 10, 7, 6);
    if (car.driver) {
      ctx.fillStyle = "#e0b48c";
      ctx.beginPath(); ctx.arc(-l * 0.06, -w / 2 + 7, 3.4, 0, TAU); ctx.fill();
    }
    // windscreen bar
    ctx.fillStyle = "#9fc4d8";
    ctx.fillRect(l * 0.24, -w / 2 + 3, 3.5, w - 6);
  } else {
    // cabin + glass
    ctx.fillStyle = shade(car.color, -35);
    roundRect(ctx, -l * 0.22, -w / 2 + 3, l * 0.46, w - 6, 4); ctx.fill();
    ctx.fillStyle = "#8fb6cc";
    ctx.fillRect(l * 0.16, -w / 2 + 4, 4, w - 8);   // windscreen
    ctx.fillRect(-l * 0.24, -w / 2 + 4, 3.5, w - 8); // rear glass
    if (car.type === "sports") {
      ctx.fillStyle = shade(car.color, -50);
      ctx.fillRect(-l / 2 + 2, -w / 2 + 2, 4, w - 4); // rear spoiler
    }
    if (car.type === "taxi") {
      ctx.fillStyle = "#f5f0d8";
      ctx.fillRect(-4, -3, 8, 6);
    }
  }

  // headlights / taillights
  ctx.fillStyle = night > 0.25 ? "#fff6c8" : "#d8d2b0";
  ctx.fillRect(l / 2 - 3, -w / 2 + 2, 3, 4);
  ctx.fillRect(l / 2 - 3, w / 2 - 6, 3, 4);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-l / 2, -w / 2 + 2, 2.5, 4);
  ctx.fillRect(-l / 2, w / 2 - 6, 2.5, 4);

  ctx.restore();

  // lightbar glow (additive) — visible day or night
  if (car.isPolice && car.siren) {
    const phase = Math.floor(tick / 6 + car.lightPhase) % 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const col = phase ? "255,60,50" : "60,110,255";
    const g = ctx.createRadialGradient(car.x, car.y, 2, car.x, car.y, 46);
    g.addColorStop(0, `rgba(${col},${0.40 + night * 0.25})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(car.x, car.y, 46, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // headlight cones at night
  if (night > 0.25 && car.driver && !car.parked) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const g = ctx.createLinearGradient(l / 2, 0, l / 2 + 130, 0);
    g.addColorStop(0, `rgba(255,240,190,${0.20 * night})`);
    g.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(l / 2, -w / 2 + 2);
    ctx.lineTo(l / 2 + 130, -w - 16);
    ctx.lineTo(l / 2 + 130, w + 16);
    ctx.lineTo(l / 2, w / 2 - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// lighten/darken a #rrggbb colour
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
