import { readFile, mkdir, writeFile, cp } from "node:fs/promises";

const paths = {
  "/": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"],
  "/site.js": ["site.js", "application/javascript"],
  "/runner.js": ["runner.js", "application/javascript"],
};
const assets = {};
for (const [route, [file, type]] of Object.entries(paths)) {
  assets[route] = { type, body: await readFile("public/" + file, "utf8") };
}
const code = await readFile("worker/index.js", "utf8");
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await writeFile("dist/server/index.js", "const assets = " + JSON.stringify(assets) + ";\n" + code);
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/drizzle", { recursive: true });
