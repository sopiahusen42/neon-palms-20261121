// make.fun bounty gta6-01 — launcher. Runtime: Node 22 (selected explicitly).
// Run with: node --experimental-strip-types main.ts   (Node >= 22.6 strips types natively)
// Serves ./game over HTTP and prints the URL. No dependencies beyond node: builtins.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error(`This entry selects Node 22; found ${process.versions.node}. Please run with Node 22.`);
  process.exit(1);
}

const ROOT = resolve(join(import.meta.dirname ?? ".", "game"));
const PORT = Number(process.env.PORT || 8080);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    const file = resolve(join(ROOT, rel));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const st = await stat(file).catch(() => null);
    const target = st?.isDirectory() ? join(file, "index.html") : file;
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": MIME[extname(target).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`NEON PALMS (gta6-01) running on Node ${process.versions.node}`);
  console.log(`http://localhost:${PORT}/`);
});
