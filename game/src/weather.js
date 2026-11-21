// weather.js — rain intensity state machine + screen-space rain streaks.
import { S } from "./state.js";
import { rand, clamp } from "./math.js";

let target = 0, changeCd = 12;

export function setRain(v) { target = v; S.rain = v; S.wet = Math.max(S.wet, v * 0.8); }

export function updateWeather(dt) {
  if (!S.staged) {
    changeCd -= dt;
    if (changeCd <= 0) {
      changeCd = 18 + rand() * 24;
      target = rand() < 0.42 ? 0.35 + rand() * 0.65 : 0;
    }
  }
  S.rain += clamp(target - S.rain, -0.25 * dt, 0.25 * dt);
  // wetness lags: roads stay slick after the rain stops
  S.wet += clamp(S.rain - S.wet, -0.045 * dt, 0.3 * dt);
}

export function drawRain(ctx) {
  if (S.rain < 0.03) return;
  const n = Math.floor(S.rain * 230);
  ctx.save();
  ctx.strokeStyle = `rgba(185,205,235,${0.16 + S.rain * 0.2})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = rand() * 1320 - 20;
    const y = rand() * 760 - 20;
    const l = 13 + S.rain * 12;
    ctx.moveTo(x, y);
    ctx.lineTo(x - l * 0.32, y + l);
  }
  ctx.stroke();
  // a few ground splashes
  ctx.fillStyle = `rgba(200,215,240,${S.rain * 0.22})`;
  for (let i = 0; i < n / 8; i++) {
    const x = rand() * 1280, y = rand() * 720;
    ctx.beginPath(); ctx.ellipse(x, y, 3.2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
