# neon-palms-20261121

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sopiahusen42/neon-palms-20261121/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sopiahusen42/neon-palms-20261121/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**NEON PALMS** is a playable top-down open-world crime game built for the
[make.fun](https://make.fun) bounty **gta6-01**. Sunshine, palm trees, bad
decisions: you step off the bus into a pastel 1986-ish postcard town with an
empty wallet and a crime problem. Steal cars, run jobs, shoot your way out of
trouble, and try to stay ahead of the police.

It is a single-screen HTML5 canvas game (1280×720) written in plain ES modules
with no runtime dependencies — everything is drawn procedurally on a 2D
context. The city, traffic, pedestrians and lighting are all generated in code.

## What's in the game

- **A generated open world.** A 3000×2400 city of avenues and streets, blocks
  of buildings with shop signage, sidewalks, palm trees and street lamps,
  built deterministically from a seed (`citygen.js`).
- **Driving and carjacking.** Walk up to any car and press `E` to take it.
  Traffic drives itself; you can drift with the handbrake and do drive-by
  shooting. A speedometer appears while you're behind the wheel.
- **Three staged missions**, offered at pink `?` markers:
  - **REPO MAN** ($2500) — steal the red Banshee and deliver it to the docks.
  - **SPECIAL DELIVERY** ($1800) — a timed package run from the Palm Diner to
    the Sunset Motel before the coffee goes cold.
  - **HEAT WAVE** ($4000) — hit the Ocean Bank, trip the alarm, and outrun
    every cruiser in the city to the safehouse.
- **A five-star wanted system.** Crime raises heat; stars = floor(heat/20).
  Police cruisers spawn and chase with predictive pursuit, set up roadblocks
  at three stars, and deploy officers on foot who close in and shoot when you
  are on foot. Break contact and heat decays.
- **Combat.** Two weapons — a semi-auto pistol and a full-auto SMG — with
  bullets, muzzle flashes, tracers, sparks and explosions. Pedestrians panic
  and flee; cars take damage and burn out.
- **Pickups.** Floating health, armour, SMG ammo and cash pickups scattered
  around town, each on a respawn timer.
- **Atmosphere.** A day/night cycle (a full day passes in about five minutes),
  dynamic lighting, rain with wet-road reflections, tyre smoke and persistent
  skid marks.
- **HUD.** Mission card with objective and timer, wanted stars, money,
  health/armour bars, weapon and ammo, a speedometer while driving, a minimap
  with police blips, and an offscreen objective arrow.
- **Saving.** Money, completed jobs, loadout and time of day persist to
  `localStorage` and reload when you start a new run.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move / drive |
| `Mouse` | Aim |
| `Click` | Fire (hold for the SMG) |
| `Shift` | Sprint on foot |
| `E` | Enter / exit a car |
| `Space` | Handbrake |
| `1` / `2` | Switch to pistol / SMG |
| `P` | Pause |
| `M` | Mute |
| `Enter` | Start from the title screen |

Find the pink `?` markers to start jobs. Crime raises your wanted level.

## How to run

The entry selects **Node 22** and ships a tiny zero-dependency launcher
(`main.ts`) that serves the `game/` directory over HTTP:

```sh
node --experimental-strip-types main.ts
# then open http://localhost:8080/
```

Set a different port with `PORT=9000 node --experimental-strip-types main.ts`.
Node ≥ 22.6 strips the TypeScript types natively, so there is nothing to
install or build.

Because the game is just static files, any static file server pointed at
`game/` works too (for example `python3 -m http.server` from inside `game/`).
Open `index.html` and press `Enter` to play.

### Self-test and staged screenshots

`main.js` exposes two URL modes used for verification and capture:

- `?probe=1` — a headless self-test that exercises movement, traffic, the
  wanted system, combat, missions, save/load and effects, and prints PASS/FAIL
  checks.
- `?shot=<mode>` — a deterministic staged scene rendered for a single frozen
  frame, where `mode` is `cover`, `chase`, `foot` or `title`. These are the
  four screenshots in `screenshots/`, captured with headless Chrome.

## Module layout

All game code lives in `game/src/` as 29 ES modules. `main.js` boots the world,
runs a fixed-step simulation loop and orders the render passes.

| Area | Modules |
| --- | --- |
| Core | `math`, `state`, `world`, `camera`, `input` |
| City | `citygen`, `roads`, `buildings`, `props` |
| Actors | `vehicles`, `traffic`, `pedestrians`, `player`, `police` |
| Action | `combat`, `weapons`, `driving`, `effects` |
| Atmosphere | `lighting`, `weather` |
| Interface | `minimap`, `hud`, `ui`, `story` |
| Game flow | `missions`, `pickups`, `save`, `audio` |
| Entry | `main` |

`state.js` holds the single mutable state object every module reads and writes;
`story.js` carries the narrative text (title lore, mission intros/outros and
stage barks).

## Screenshots

The four frames in `screenshots/` are genuine renders of the staged capture
modes: `01-cover.jpg` (night drift), `02-chase.jpg` (dusk pursuit),
`03-foot.jpg` (on-foot firefight with the police squad) and `04-title.jpg`
(dusk establishing shot).

## License

MIT — see [LICENSE](LICENSE).

---

This is an entry for the **gta6-01** bounty on [make.fun](https://make.fun) —
visit [make.fun](https://make.fun) for the competition entry page.
