// make.fun bounty gta6-01 — hand-in program for NEON PALMS. Runtime: Node 22.
// Run with: node main.ts   (Node >= 22.6 strips types natively)
// Copies game/ and screenshots/ from beside this file to the output directory
// (/output under the grader, MAKEFUN_OUTPUT_DIR elsewhere), writes dossier.json
// with the vendored make.fun library, prints a summary, and exits. No server,
// no sockets, no timers — nothing keeps the event loop alive.
// To play-test locally instead, run: node serve.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error(`This entry selects Node 22; found ${process.versions.node}. Please run with Node 22.`);
  process.exit(1);
}

// Repository root, independent of the working directory.
const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(out, { recursive: true });
cpSync(join(here, "game"), join(out, "game"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(join(here, "screenshots"))) {
  cpSync(join(here, "screenshots"), join(out, "screenshots"), { recursive: true });
}

// Count regular files under a directory, recursively.
function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(p);
    else if (entry.isFile()) n += 1;
  }
  return n;
}

// The scorer's own caps (reference/gate.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, "dossier.json"), dossier);

const gameFiles = countFiles(join(out, "game"));
const shotFiles = countFiles(join(out, "screenshots"));
console.log(`NEON PALMS (gta6-01) handed in on Node ${process.versions.node}`);
console.log(`output: ${out}`);
console.log(`game files: ${gameFiles}`);
console.log(`screenshots: ${shotFiles}`);
console.log(`dossier.json: ${statSync(join(out, "dossier.json")).size} bytes`);
