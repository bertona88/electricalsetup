export type FieldRenderer = {
  setMode(mode: number): void;
  setEnergy(energy: number): void;
  resize(): void;
  destroy(): void;
};

export async function createFieldRenderer(canvas: HTMLCanvasElement): Promise<FieldRenderer> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (!gpu) return createFallback(canvas);

  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return createFallback(canvas);
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  if (!context) return createFallback(canvas);

  const format = gpu.getPreferredCanvasFormat();
  const shader = device.createShaderModule({
    code: `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  mode: f32,
  energy: f32,
  pad: vec3f,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
  return vec4f(p[i], 0., 1.);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / max(u.resolution, vec2f(1.));
  let aspect = u.resolution.x / max(u.resolution.y, 1.);
  let q = vec2f((uv.x - .5) * aspect, uv.y - .5);
  let minor = min(abs(fract(q * 26.) - .5));
  let major = min(abs(fract(q * 5.2) - .5));
  let grid = smoothstep(.035, 0., minor) * .04 + smoothstep(.025, 0., major) * .055;
  let radial = exp(-length(q) * 2.6);
  let wave = .5 + .5 * sin(length(q) * 45. - u.time * (1. + u.energy * 2.));
  let scan = exp(-pow((uv.x - fract(u.time * .018 + .12)) * 18., 2.));
  let noise = (hash(floor(pos.xy / 3.) + floor(u.time * 2.)) - .5) * .012 * u.mode;
  var tint = vec3f(.018, .025, .027);
  if (u.mode > .5 && u.mode < 1.5) { tint += vec3f(.02, .035, .03) * wave * radial * u.energy; }
  if (u.mode > 1.5 && u.mode < 2.5) { tint += vec3f(.025, .015, .04) * radial * (.4 + wave) * u.energy; }
  if (u.mode > 2.5) { tint += vec3f(.035, .02, .012) * noise * 12.; }
  tint += vec3f(grid + scan * .012 + noise);
  return vec4f(tint, 1.);
}`,
  });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: shader, entryPoint: "vs" },
    fragment: { module: shader, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const buffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bind = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  });

  let mode = 0;
  let energy = 0;
  let running = true;
  const start = performance.now();

  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      context.configure({ device, format, alphaMode: "opaque" });
    }
  };
  const frame = () => {
    if (!running) return;
    resize();
    const values = new Float32Array([canvas.width, canvas.height, (performance.now() - start) / 1000, mode, energy, 0, 0, 0]);
    device.queue.writeBuffer(buffer, 0, values);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: .008, g: .011, b: .012, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bind);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    setMode(value) { mode = value; },
    setEnergy(value) { energy = value; },
    resize,
    destroy() { running = false; device.destroy(); },
  };
}

function createFallback(canvas: HTMLCanvasElement): FieldRenderer {
  const ctx = canvas.getContext("2d")!;
  let mode = 0;
  let energy = 0;
  let running = true;
  const start = performance.now();
  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
  };
  const frame = () => {
    if (!running) return;
    resize();
    const w = canvas.width, h = canvas.height, dpr = Math.min(devicePixelRatio, 2);
    ctx.fillStyle = "#080b0c"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(210,230,225,.035)"; ctx.lineWidth = 1;
    const step = 32 * dpr;
    for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (mode > 0 && energy > 0) {
      const t = (performance.now() - start) / 1000;
      const radius = (40 + ((t * 85) % Math.max(80, w))) * dpr;
      ctx.strokeStyle = mode === 2 ? "rgba(182,156,255,.10)" : "rgba(105,231,220,.09)";
      ctx.beginPath(); ctx.arc(w * .5, h * .5, radius, 0, Math.PI * 2); ctx.stroke();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    setMode(value) { mode = value; },
    setEnergy(value) { energy = value; },
    resize,
    destroy() { running = false; },
  };
}
