// Local preview: builds the site, then serves the Worker with Node's built-in
// SQLite standing in for Cloudflare D1. No installs needed (Node 22.5+).
// Usage: node scripts/dev.mjs [port]   — scores go to .local/leaderboard.db
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.argv[2]) || 8787;
execFileSync(process.execPath, ["scripts/build.mjs"], { stdio: "inherit" });

await mkdir(".local", { recursive: true });
const sqlite = new DatabaseSync(".local/leaderboard.db");
const hasTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='runner_scores'").get();
if (!hasTable) sqlite.exec(await readFile("drizzle/0000_leaderboard.sql", "utf8"));

// Minimal D1 shape used by worker/index.js: prepare(sql)[.bind(...)].all()/.run()
const DB = {
  prepare(sql) {
    const make = args => ({
      bind: (...a) => make(a),
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
      run: async () => { sqlite.prepare(sql).run(...args); return { success: true }; },
    });
    return make([]);
  },
};

// Node treats .js as CommonJS here, so load the built Worker as an ES module copy.
await writeFile(".local/worker.mjs", await readFile("dist/server/index.js", "utf8"));
const worker = (await import(pathToFileURL(".local/worker.mjs").href + "?t=" + Date.now())).default;

createServer(async (req, res) => {
  try {
    const url = "http://" + req.headers.host + req.url;
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const response = await worker.fetch(request, { DB });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500).end("Local server error");
  }
}).listen(port, () => console.log("Portfolio running at http://localhost:" + port));
