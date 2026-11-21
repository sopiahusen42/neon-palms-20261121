// Minimal ambient declarations so main.ts type-checks without installing @types/node.
// Node 22 provides all of these at runtime; this file only describes the shapes we use.
declare module "node:http" {
  export function createServer(handler: (req: any, res: any) => void): {
    listen(port: number, cb?: () => void): void;
  };
}
declare module "node:fs/promises" {
  export function readFile(path: string): Promise<Uint8Array>;
  export function stat(path: string): Promise<{ isDirectory(): boolean }>;
}
declare module "node:path" {
  export function extname(p: string): string;
  export function join(...parts: string[]): string;
  export function normalize(p: string): string;
  export function resolve(...parts: string[]): string;
}
declare const process: {
  env: Record<string, string | undefined>;
  versions: { node: string };
  exit(code?: number): never;
};
interface ImportMeta { dirname?: string; }
