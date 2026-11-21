// pickups.js — floating health/armour/ammo/cash pickups with respawn timers.
import { S, say } from "./state.js";
import { dist, TAU } from "./math.js";
import { giveWeapon } from "./weapons.js";
import { playPickup } from "./audio.js";
import { saveGame } from "./save.js";

const SPOTS = [
  { kind: "health", x: 1120, y: 881 },
  { kind: "health", x: 2320, y: 281 },
  { kind: "armor", x: 2081, y: 881 },
  { kind: "ammo", x: 881, y: 1919 },
  { kind: "ammo", x: 2519, y: 1481 },
  { kind: "cash", x: 281, y: 881 },
  { kind: "cash", x: 1720, y: 1481 },
];

export function initPickups() {
  S.pickups = SPOTS.map((s) => ({ ...s, cd: 0, bob: Math.random() * TAU }));
}

export function updatePickups(dt) {
  const p = S.player;
  for (const pk of S.pickups) {
    pk.bob += dt * 3;
    if (pk.cd > 0) { pk.cd -= dt; continue; }
    if (dist(p.x, p.y, pk.x, pk.y) > 24) continue;
    pk.cd = 30;
    playPickup();
    if (pk.kind === "health") { p.health = Math.min(100, p.health + 35); say("Health +35", 2); }
    if (pk.kind === "armor") { p.armor = Math.min(100, p.armor + 50); say("Armour +50", 2); }
    if (pk.kind === "ammo") { giveWeapon("smg", 60); say("SMG ammo +60", 2); }
    if (pk.kind === "cash") { S.money += 350; say("+$350", 2); saveGame(); }
  }
}

export function drawPickups(ctx) {
  for (const pk of S.pickups) {
    if (pk.cd > 0) continue;
    const yo = Math.sin(pk.bob) * 3;
    const x = pk.x, y = pk.y + yo;
    ctx.save();
    ctx.fillStyle = "rgba(15,17,24,0.25)";
    ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 8, 9, 4, 0, 0, TAU); ctx.fill();
    ctx.translate(x, y);
    if (pk.kind === "health") {
      ctx.fillStyle = "#f2f5f8";
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = "#e8453f";
      ctx.fillRect(-6, -2.5, 12, 5);
      ctx.fillRect(-2.5, -6, 5, 12);
    } else if (pk.kind === "armor") {
      ctx.fillStyle = "#4f8fe8";
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(9, -6); ctx.lineTo(9, 2);
      ctx.quadraticCurveTo(9, 9, 0, 12);
      ctx.quadraticCurveTo(-9, 9, -9, 2); ctx.lineTo(-9, -6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#a8ccf5";
      ctx.fillRect(-2, -6, 4, 12);
    } else if (pk.kind === "ammo") {
      ctx.fillStyle = "#c8a43f";
      ctx.fillRect(-9, -7, 18, 14);
      ctx.fillStyle = "#8a6a20";
      ctx.fillRect(-9, -7, 18, 4);
      ctx.fillStyle = "#f5e8b0";
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 5 - 1.2, -1, 2.4, 6);
    } else {
      ctx.fillStyle = "#4fc86f";
      ctx.fillRect(-10, -6, 20, 12);
      ctx.strokeStyle = "#2a7a42";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-10, -6, 20, 12);
      ctx.fillStyle = "#eafff0";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 4);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }
}
