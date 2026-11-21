// lighting.js — day/night factor, dusk tint, night darkness multiply pass and
// additive lamp/window light layer; wet-road sheen when raining.
import { S } from "./state.js";
import { clamp } from "./math.js";

// 0 = full day, 1 = deep night. Sunrise ~6:30, sunset ~18:30.
export function nightFactor(t) {
  const rise = smooth(5.4, 7.4, t);        // 0->1 as morning arrives
  const set = smooth(17.2, 19.6, t);       // 0->1 as evening arrives
  if (t < 12) return 1 - rise;
  return set;
}
function smooth(a, b, x) {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}

// warm dusk/dawn tint peaks around 6.5 and 18.5
export function duskFactor(t) {
  const d1 = Math.exp(-Math.pow((t - 18.4) / 1.1, 2));
  const d2 = Math.exp(-Math.pow((t - 6.4) / 1.1, 2));
  return Math.max(d1, d2);
}

export function drawLighting(ctx) {
  const night = nightFactor(S.timeOfDay);
  const dusk = duskFactor(S.timeOfDay);

  // dusk warm wash
  if (dusk > 0.02) {
    ctx.fillStyle = `rgba(255,120,50,${dusk * 0.13})`;
    ctx.fillRect(-2000, -2000, 8000, 8000);
  }

  if (night > 0.02) {
    // darken everything
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = night * 0.85;
    ctx.fillStyle = "rgb(52,60,100)";
    ctx.fillRect(-2000, -2000, 8000, 8000);
    ctx.restore();
    // additive static lights: lit windows, neon signs, lamp pools
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = night;
    ctx.drawImage(S.city.lights, 0, 0);
    // wet roads double the reflections
    if (S.wet > 0.1) {
      ctx.globalAlpha = night * S.wet * 0.35;
      ctx.drawImage(S.city.lights, 0, 0);
    }
    ctx.restore();
  }

  // rain darkens the asphalt even by day
  if (S.wet > 0.03) {
    ctx.fillStyle = `rgba(12,16,26,${S.wet * 0.20})`;
    ctx.fillRect(-2000, -2000, 8000, 8000);
  }
}
