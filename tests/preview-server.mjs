import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const host = valueAfter("--host", "0.0.0.0");
const port = Number(valueAfter("--port", "4173"));
const root = join(process.cwd(), "app");
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
};

createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://preview.local").pathname;
  const relative = pathname === "/" ? "index.html" : normalize(pathname).replace(/^[/\\]+/, "");
  const file = join(root, relative);
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host);
