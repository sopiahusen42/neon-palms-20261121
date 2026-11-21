// input.js — keyboard + mouse state, polled by player/driving/ui each tick.
export const keys = Object.create(null);
export const mouse = { x: 640, y: 360, down: false, clicked: false };
const pressed = Object.create(null); // edge-triggered, consumed once per tick

let canvas = null;

export function initInput(cv) {
  canvas = cv;
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; mouse.down = false; });
  cv.addEventListener("mousemove", (e) => {
    const r = cv.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 1280;
    mouse.y = ((e.clientY - r.top) / r.height) * 720;
  });
  cv.addEventListener("mousedown", (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  window.addEventListener("mouseup", (e) => { if (e.button === 0) mouse.down = false; });
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
}

export const down = (code) => !!keys[code];
export const hit = (code) => !!pressed[code];

export function endTick() {
  for (const k in pressed) delete pressed[k];
  mouse.clicked = false;
}

// Movement axes from WASD + arrows.
export function moveAxes() {
  let x = 0, y = 0;
  if (down("KeyA") || down("ArrowLeft")) x -= 1;
  if (down("KeyD") || down("ArrowRight")) x += 1;
  if (down("KeyW") || down("ArrowUp")) y -= 1;
  if (down("KeyS") || down("ArrowDown")) y += 1;
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}
