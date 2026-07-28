import { readFile, writeFile, mkdir } from "node:fs/promises";
import wabtFactory from "wabt";

const wabt = await wabtFactory();
const source = await readFile(new URL("../physics/kernel.wat", import.meta.url), "utf8");
const module = wabt.parseWat("kernel.wat", source, { multi_value: true });
module.resolveNames();
module.validate();
const { buffer } = module.toBinary({ canonicalize_lebs: true, write_debug_names: false });
await mkdir(new URL("../app/physics/", import.meta.url), { recursive: true });
await writeFile(new URL("../app/physics/kernel.wasm", import.meta.url), buffer);
console.log(`built app/physics/kernel.wasm (${buffer.byteLength} bytes)`);
