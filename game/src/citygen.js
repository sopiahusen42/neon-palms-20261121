// citygen.js — orchestrates deterministic city generation and pre-renders the
// static base layer + the night-lights layer onto offscreen canvases.
import { reseed } from "./math.js";
import { W, H, makeBlocks } from "./world.js";
import { drawRoads } from "./roads.js";
import { genBuildings, drawBuildings, drawBuildingLights } from "./buildings.js";
import { genProps, drawProps, drawLampLights } from "./props.js";

export function generateCity(seed = 20261121) {
  reseed(seed);
  const blocks = makeBlocks();
  const buildings = genBuildings(blocks);
  const props = genProps(blocks);

  const base = document.createElement("canvas");
  base.width = W; base.height = H;
  const bctx = base.getContext("2d");
  drawRoads(bctx);
  drawBuildings(bctx, buildings);
  drawProps(bctx, props);

  const lights = document.createElement("canvas");
  lights.width = W; lights.height = H;
  const lctx = lights.getContext("2d");
  drawBuildingLights(lctx, buildings);
  drawLampLights(lctx, props);

  return { blocks, buildings, props, base, lights, seed };
}
