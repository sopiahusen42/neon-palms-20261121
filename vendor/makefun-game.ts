// Minimal, honest descriptor module expected by the make.fun harness.
// It describes this entry; it performs no I/O and has no side effects.
export interface MakefunGameDescriptor {
  id: string;
  program: string;
  title: string;
  runtime: "node22";
  launcher: string;
  entry: string;
  license: string;
}

export const makefunGame: MakefunGameDescriptor = {
  id: "gta6-01",
  program: "program/v1",
  title: "NEON PALMS",
  runtime: "node22",
  launcher: "main.ts",
  entry: "game/index.html",
  license: "MIT",
};

export default makefunGame;
