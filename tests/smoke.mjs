import { readFile, stat } from "node:fs/promises";

const root = new URL("../app/", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const main = await readFile(new URL("main.js", root), "utf8");
const worker = await readFile(new URL("physics-worker.js", root), "utf8");
const css = await readFile(new URL("styles.css", root), "utf8");
const wasm = await readFile(new URL("physics/kernel.wasm", root));

const checks = [
  [html.includes('id="lab-canvas"'), "lab canvas"],
  [html.includes('id="catalog"'), "generic matter catalog"],
  [main.includes("buildExample"), "dogfooded example builder"],
  [main.includes("connect("), "typed connection action"],
  [main.includes("location.hash"), "URL-contained apparatus"],
  [worker.includes("WebAssembly.instantiate"), "worker-isolated Wasm"],
  [css.includes("touch-action: none"), "touch interaction boundary"],
  [wasm.byteLength > 100, "compiled Wasm kernel"],
  [(await stat(new URL("gpu-field.js", root))).size > 500, "WebGPU renderer"],
];

for (const [condition, name] of checks) {
  if (!condition) throw new Error(`smoke check failed: ${name}`);
  console.log(`ok · ${name}`);
}
