// missions.js — three staged missions with objective markers, timers, rewards.
import { S, say, addHeat } from "./state.js";
import { dist, TAU } from "./math.js";
import { makeCar } from "./vehicles.js";
import { missionStory } from "./story.js";
import { saveGame } from "./save.js";
import { playPickup } from "./audio.js";

export const MISSIONS = {
  repo: {
    id: "repo", name: "REPO MAN", giver: { x: 881, y: 281 }, reward: 2500,
    stages: [
      { type: "reach", x: 1919, y: 748, r: 60, label: "Locate the red Banshee on the north kerb by Bayside Motors." },
      { type: "enterCar", carTag: "repo", label: "Steal the Banshee (press E next to it)." },
      { type: "reach", x: 2519, y: 1919, r: 70, label: "Deliver the Banshee to the docks garage, south-east." },
    ],
  },
  delivery: {
    id: "delivery", name: "SPECIAL DELIVERY", giver: { x: 281, y: 1481 }, reward: 1800,
    stages: [
      { type: "reach", x: 1481, y: 881, r: 55, label: "Pick up the package at the Palm Diner." },
      { type: "reach", x: 2519, y: 281, r: 60, time: 75, label: "Deliver it to the Sunset Motel before time runs out!" },
    ],
  },
  heat: {
    id: "heat", name: "HEAT WAVE", giver: { x: 2081, y: 1919 }, reward: 4000,
    stages: [
      { type: "reach", x: 881, y: 1481, r: 55, label: "Hit the Ocean Bank branch — the alarm WILL trip.", heatOnComplete: 45 },
      { type: "reach", x: 281, y: 281, r: 65, label: "Outrun the police and reach the safehouse, north-west." },
    ],
  },
};

export function initMissions() {
  // the repo target car exists in the world from boot
  const repo = makeCar("sports", 1919, 748, 0, { parked: true, color: "#e8564f" });
  repo.tag = "repo";
  S.cars.push(repo);
}

export function startMission(id) {
  const def = MISSIONS[id];
  S.mission = { def, stage: 0, timer: null };
  const st = def.stages[0];
  if (st.time) S.mission.timer = st.time;
  say(missionStory(id).intro, 7);
  playPickup();
}

export function updateMissions(dt) {
  const p = S.player;
  // offer missions at giver markers
  if (!S.mission) {
    for (const id in MISSIONS) {
      if (S.missionsDone.includes(id)) continue;
      const g = MISSIONS[id].giver;
      if (dist(p.x, p.y, g.x, g.y) < 42) { startMission(id); break; }
    }
    return;
  }
  const m = S.mission;
  const st = m.def.stages[m.stage];
  if (m.timer != null) {
    m.timer -= dt;
    if (m.timer <= 0) {
      say("Delivery failed. The coffee went cold. Try again.", 5);
      S.mission = null;
      return;
    }
  }
  let done = false;
  if (st.type === "reach") {
    done = dist(p.x, p.y, st.x, st.y) < st.r;
  } else if (st.type === "enterCar") {
    done = p.inCar && p.inCar.tag === st.carTag;
  }
  if (!done) return;

  if (st.heatOnComplete) {
    addHeat(st.heatOnComplete);
    say("ALARM! Every cruiser in Neon Palms is coming for you.", 5);
  }
  m.stage++;
  const story = missionStory(m.def.id);
  if (m.stage >= m.def.stages.length) {
    S.money += m.def.reward;
    S.missionsDone.push(m.def.id);
    say(`${story.outro}  +$${m.def.reward}`, 6);
    S.mission = null;
    playPickup();
    saveGame();
    return;
  }
  const next = m.def.stages[m.stage];
  if (next.time) m.timer = next.time;
  say(story.barks[Math.min(m.stage, story.barks.length - 1)], 4.5);
  playPickup();
}

export function drawMissionMarkers(ctx, tick) {
  // giver markers for available jobs
  if (!S.mission) {
    for (const id in MISSIONS) {
      if (S.missionsDone.includes(id)) continue;
      const g = MISSIONS[id].giver;
      drawMarker(ctx, g.x, g.y, tick, "#e878c8", "?");
    }
    return;
  }
  const m = S.mission;
  const st = m.def.stages[m.stage];
  let x = st.x, y = st.y;
  if (st.type === "enterCar") {
    const car = S.cars.find((c) => c.tag === st.carTag);
    if (!car) return;
    x = car.x; y = car.y;
  }
  drawMarker(ctx, x, y, tick, "#ffd23f", "!");
}

function drawMarker(ctx, x, y, tick, col, glyph) {
  const pulse = 1 + Math.sin(tick * 0.12) * 0.14;
  ctx.save();
  // ground ring
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, TAU); ctx.fill();
  // light beam rising
  const g = ctx.createLinearGradient(x, y - 90, x, y);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, col + "");
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = g;
  ctx.fillRect(x - 10, y - 90, 20, 90);
  // glyph
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(glyph, x, y - 34 + Math.sin(tick * 0.1) * 4);
  ctx.restore();
  ctx.textAlign = "left";
}
