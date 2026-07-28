import { createFieldRenderer } from "./gpu-field.js";
const $ = (selector) => document.querySelector(selector);
const canvas = $("#lab-canvas");
const fieldCanvas = $("#field-canvas");
const lab = $("#lab-shell");
const ctx = canvas.getContext("2d");
const DEFINITIONS = {
    "photon-source": {
        label: "Photon source", short: "γ", family: "OPTICAL STIMULUS", color: "#69e7dc",
        description: "A modulated, Poisson-distributed optical boundary.",
        ports: [
            { id: "light", label: "LIGHT", type: "light", side: "right" },
            { id: "sync", label: "SYNC", type: "reference", side: "bottom" },
        ],
        params: {
            rateKhz: { label: "Photon rate", min: .1, max: 20, step: .1, value: 4, unit: "kHz" },
            modulationHz: { label: "Modulation", min: 10, max: 1000, step: 1, value: 137, unit: "Hz" },
            depth: { label: "Modulation depth", min: 0, max: 100, step: 1, value: 65, unit: "%" },
            wavelengthNm: { label: "Wavelength", min: 280, max: 900, step: 1, value: 420, unit: "nm" },
        },
        dive: "A versioned OpticalStimulus boundary. The source owns photon timing and wavelength; this lab owns the detector response.",
    },
    photomultiplier: {
        label: "Photomultiplier", short: "PM", family: "DETECTOR", color: "#c7ff5d",
        description: "A stochastic photon-to-charge cascade with an authored interior.",
        ports: [
            { id: "window", label: "WINDOW", type: "light", side: "left" },
            { id: "hv", label: "HV", type: "hv", side: "bottom" },
            { id: "anode", label: "ANODE", type: "signal", side: "right" },
            { id: "return", label: "RETURN", type: "return", side: "bottom" },
        ],
        params: {
            qe: { label: "Quantum efficiency", min: 5, max: 45, step: 1, value: 28, unit: "%" },
            stages: { label: "Dynode stages", min: 5, max: 14, step: 1, value: 10, unit: "" },
            darkCps: { label: "Dark events", min: 0, max: 1000, step: 5, value: 80, unit: "cps" },
            transitNs: { label: "Transit time", min: 5, max: 80, step: 1, value: 22, unit: "ns" },
        },
        dive: "The interior exposes the causal cascade: photoemission, focusing, secondary emission, transit spread, and anode collection.",
    },
    "hv-supply": {
        label: "High-voltage supply", short: "HV", family: "SOURCE", color: "#ff9d61",
        description: "A current-limited bias source with explicit ripple and return.",
        ports: [
            { id: "hv-out", label: "−HV", type: "hv", side: "right" },
            { id: "return", label: "RETURN", type: "return", side: "right" },
        ],
        params: {
            voltage: { label: "Bias", min: -1200, max: -300, step: 10, value: -850, unit: "V" },
            rippleMv: { label: "Ripple", min: 0, max: 50, step: .5, value: 8, unit: "mV" },
            limitUa: { label: "Current limit", min: 10, max: 500, step: 10, value: 250, unit: "µA" },
        },
    },
    termination: {
        label: "Termination", short: "Ω", family: "PASSIVE", color: "#e9efec",
        description: "A real signal load that defines the pulse voltage.",
        ports: [
            { id: "signal", label: "SIGNAL", type: "signal", side: "left" },
            { id: "return", label: "RETURN", type: "return", side: "bottom" },
        ],
        params: {
            ohms: { label: "Resistance", min: 10, max: 10000, step: 10, value: 50, unit: "Ω" },
        },
    },
    probe: {
        label: "Loaded probe", short: "↧", family: "INSTRUMENT", color: "#b69cff",
        description: "A measurement body whose resistance and capacitance alter the apparatus.",
        ports: [
            { id: "tip", label: "TIP", type: "signal", side: "left" },
            { id: "clip", label: "CLIP", type: "return", side: "bottom" },
        ],
        params: {
            capacitancePf: { label: "Tip capacitance", min: .5, max: 100, step: .5, value: 9, unit: "pF" },
            resistanceMohm: { label: "Tip resistance", min: .1, max: 20, step: .1, value: 10, unit: "MΩ" },
        },
        dive: "The probe is part of the circuit. Its capacitance rounds fast edges; its input resistance changes the DC load.",
    },
    "lock-in": {
        label: "Lock-in detector", short: "LI", family: "INSTRUMENT", color: "#69e7dc",
        description: "Phase-sensitive recovery of a reference-coherent signal.",
        ports: [
            { id: "signal", label: "SIGNAL", type: "signal", side: "left" },
            { id: "reference", label: "REFERENCE", type: "reference", side: "top" },
            { id: "return", label: "RETURN", type: "return", side: "bottom" },
        ],
        params: {
            phaseDeg: { label: "Reference phase", min: -180, max: 180, step: 1, value: 0, unit: "°" },
            timeConstantMs: { label: "Memory", min: 10, max: 2000, step: 10, value: 700, unit: "ms" },
            filterOrder: { label: "Filter order", min: 1, max: 4, step: 1, value: 2, unit: "" },
        },
        dive: "The input is multiplied by an in-phase and quadrature reference. Coherent signal stands still; uncorrelated components circulate and average away.",
    },
};
const PORT_COLORS = {
    light: "#69e7dc", hv: "#ff9d61", signal: "#c7ff5d", reference: "#b69cff", return: "#8e9895",
};
const BODY_W = 126;
const BODY_H = 72;
let state = {
    schema: 1, title: "Untitled causal experiment", seed: 174219, logicalTime: 0,
    event: 0, view: "space", lens: "voltage", bodies: [], tethers: [], selectedBodyId: null,
};
let history = [];
let actionLog = [];
let metrics = null;
let field;
let workerRevision = 0;
let engineReady = false;
let camera = { x: 0, y: 0, scale: 1 };
let hover = { bodyId: null, portId: null };
let gesture = null;
let catalogDrag = null;
let animationTime = 0;
let toastTimer = 0;
const pointers = new Map();
let pinchStart = null;
const worker = new Worker("./physics-worker.js", { type: "module" });
worker.onmessage = (event) => {
    if (event.data.type === "ready") {
        engineReady = true;
        const badge = $("#engine-badge");
        badge.classList.add("ready");
        badge.innerHTML = `<i></i> ${event.data.engine === "wasm-f64" ? "WASM F64 KERNEL" : "REFERENCE KERNEL"}`;
        simulate();
    }
    if (event.data.type === "snapshot" && event.data.revision === workerRevision) {
        metrics = event.data.metrics;
        updateMetrics();
    }
};
function cloneState() {
    return structuredClone(state);
}
function mutate(label, operation, record = true) {
    if (record)
        history.push(cloneState());
    operation();
    actionLog.unshift(label);
    actionLog = actionLog.slice(0, 10);
    state.logicalTime += .00000002;
    workerRevision++;
    renderUi();
    simulate();
}
function addBody(kind, x, y, record = true) {
    const def = DEFINITIONS[kind];
    if (!def)
        return null;
    const number = state.bodies.filter((body) => body.kind === kind).length + 1;
    const body = {
        id: `${kind}-${number}`, kind, x, y,
        parameters: Object.fromEntries(Object.entries(def.params).map(([key, param]) => [key, param.value])),
    };
    mutate(`Placed ${def.label}`, () => {
        state.bodies.push(body);
        state.selectedBodyId = body.id;
    }, record);
    return body.id;
}
function connect(fromBodyId, fromPortId, toBodyId, toPortId, record = true) {
    if (fromBodyId === toBodyId && fromPortId === toPortId)
        return false;
    const fromBody = getBody(fromBodyId), toBody = getBody(toBodyId);
    if (!fromBody || !toBody)
        return false;
    const fromPort = getPort(fromBody, fromPortId), toPort = getPort(toBody, toPortId);
    if (!fromPort || !toPort || fromPort.type !== toPort.type) {
        showToast("Those ports carry different physical quantities");
        return false;
    }
    if (state.tethers.some((t) => (t.from.bodyId === fromBodyId && t.from.portId === fromPortId && t.to.bodyId === toBodyId && t.to.portId === toPortId) ||
        (t.to.bodyId === fromBodyId && t.to.portId === fromPortId && t.from.bodyId === toBodyId && t.from.portId === toPortId)))
        return false;
    const dx = toBody.x - fromBody.x, dy = toBody.y - fromBody.y;
    const tether = {
        id: `tether-${state.tethers.length + 1}`,
        from: { bodyId: fromBodyId, portId: fromPortId },
        to: { bodyId: toBodyId, portId: toPortId },
        lengthM: Math.max(.03, Math.hypot(dx, dy) / 420),
        type: fromPort.type,
    };
    mutate(`Grew ${fromPort.type} tether`, () => state.tethers.push(tether), record);
    return true;
}
function removeSelected() {
    const id = state.selectedBodyId;
    if (!id)
        return;
    const body = getBody(id);
    mutate(`Removed ${DEFINITIONS[body.kind].label}`, () => {
        state.bodies = state.bodies.filter((item) => item.id !== id);
        state.tethers = state.tethers.filter((t) => t.from.bodyId !== id && t.to.bodyId !== id);
        state.selectedBodyId = null;
    });
}
function clearLab(record = true) {
    mutate("Cleared apparatus", () => {
        state.bodies = [];
        state.tethers = [];
        state.selectedBodyId = null;
        state.event = 0;
        state.title = "Untitled causal experiment";
    }, record);
}
async function buildExample() {
    clearLab(state.bodies.length > 0);
    actionLog = [];
    state.title = "The photon that should have been invisible";
    $("#experiment-title").setAttribute("value", state.title);
    const placements = [
        ["photon-source", 135, 190], ["photomultiplier", 390, 220], ["hv-supply", 350, 430],
        ["termination", 650, 195], ["probe", 620, 72], ["lock-in", 730, 410],
    ];
    const ids = {};
    for (const [kind, x, y] of placements) {
        ids[kind] = addBody(kind, x, y, false);
        await wait(45);
    }
    const connections = [
        ["photon-source", "light", "photomultiplier", "window"],
        ["hv-supply", "hv-out", "photomultiplier", "hv"],
        ["hv-supply", "return", "photomultiplier", "return"],
        ["photomultiplier", "anode", "termination", "signal"],
        ["termination", "return", "photomultiplier", "return"],
        ["photomultiplier", "anode", "probe", "tip"],
        ["probe", "clip", "photomultiplier", "return"],
        ["photomultiplier", "anode", "lock-in", "signal"],
        ["photon-source", "sync", "lock-in", "reference"],
        ["lock-in", "return", "photomultiplier", "return"],
    ];
    for (const [a, ap, b, bp] of connections) {
        connect(ids[a], ap, ids[b], bp, false);
        await wait(35);
    }
    state.selectedBodyId = ids.photomultiplier;
    state.event = 1;
    camera = { x: 0, y: 0, scale: 1 };
    mutate("Injected deterministic photon", () => { }, false);
    showToast("Specimen assembled through 16 public lab actions");
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function getBody(id) { return state.bodies.find((body) => body.id === id); }
function getPort(body, id) { return DEFINITIONS[body.kind].ports.find((port) => port.id === id); }
function portPosition(body, portId) {
    const port = getPort(body, portId);
    const offsets = {
        left: { x: -BODY_W / 2, y: 0 }, right: { x: BODY_W / 2, y: 0 },
        top: { x: 0, y: -BODY_H / 2 }, bottom: { x: 0, y: BODY_H / 2 },
    };
    let offset = offsets[port.side];
    const siblings = DEFINITIONS[body.kind].ports.filter((item) => item.side === port.side);
    const index = siblings.findIndex((item) => item.id === portId);
    const spread = (index - (siblings.length - 1) / 2) * 26;
    if (port.side === "left" || port.side === "right")
        offset = { x: offset.x, y: spread };
    else
        offset = { x: spread, y: offset.y };
    return { x: body.x + offset.x, y: body.y + offset.y };
}
function worldToScreen(x, y) {
    return { x: (x + camera.x) * camera.scale, y: (y + camera.y) * camera.scale };
}
function screenToWorld(x, y) {
    return { x: x / camera.scale - camera.x, y: y / camera.scale - camera.y };
}
function fitCanvas() {
    const dpr = Math.min(devicePixelRatio, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function draw() {
    fitCanvas();
    const width = canvas.clientWidth, height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);
    drawTethers();
    drawEvent();
    for (const body of state.bodies)
        drawBody(body);
    if (gesture?.kind === "wire" && gesture.from) {
        const body = getBody(gesture.from.bodyId);
        const start = worldToScreen(portPosition(body, gesture.from.portId).x, portPosition(body, gesture.from.portId).y);
        const pointer = pointers.get(gesture.pointerId);
        if (pointer)
            drawWire(start.x, start.y, pointer.x, pointer.y, getPort(body, gesture.from.portId).type, true);
    }
    if (state.view === "time")
        drawTimeView(width, height);
    if (state.view === "phase")
        drawPhaseView(width, height);
    if (state.view === "probability")
        drawProbabilityView(width, height);
    animationTime += .016;
    requestAnimationFrame(draw);
}
function drawTethers() {
    for (const tether of state.tethers) {
        const aBody = getBody(tether.from.bodyId), bBody = getBody(tether.to.bodyId);
        if (!aBody || !bBody)
            continue;
        const aw = portPosition(aBody, tether.from.portId), bw = portPosition(bBody, tether.to.portId);
        const a = worldToScreen(aw.x, aw.y), b = worldToScreen(bw.x, bw.y);
        drawWire(a.x, a.y, b.x, b.y, tether.type, false);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.font = "8px 'DM Mono'";
        ctx.fillStyle = "rgba(220,232,228,.4)";
        ctx.fillText(`${tether.lengthM.toFixed(2)} m`, mx + 4, my - 5);
    }
}
function drawWire(ax, ay, bx, by, type, loose) {
    const dx = bx - ax;
    const bend = Math.max(28, Math.abs(dx) * .42);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(ax + Math.sign(dx || 1) * bend, ay, bx - Math.sign(dx || 1) * bend, by, bx, by);
    ctx.strokeStyle = loose ? PORT_COLORS[type] : colorWithAlpha(PORT_COLORS[type], .54);
    ctx.lineWidth = loose ? 2 : type === "light" ? 3 : 1.5;
    if (type === "return")
        ctx.setLineDash([4, 5]);
    else
        ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.event > 0 && (type === "light" || type === "signal" || type === "reference")) {
        const p = (animationTime * (type === "light" ? .32 : .18)) % 1;
        const point = cubicPoint(ax, ay, ax + Math.sign(dx || 1) * bend, ay, bx - Math.sign(dx || 1) * bend, by, bx, by, p);
        ctx.beginPath();
        ctx.arc(point.x, point.y, type === "light" ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = PORT_COLORS[type];
        ctx.shadowBlur = 12;
        ctx.shadowColor = PORT_COLORS[type];
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
function cubicPoint(x0, y0, x1, y1, x2, y2, x3, y3, t) {
    const u = 1 - t;
    return { x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3 };
}
function drawBody(body) {
    const def = DEFINITIONS[body.kind];
    const p = worldToScreen(body.x, body.y);
    const w = BODY_W * camera.scale, h = BODY_H * camera.scale;
    const selected = body.id === state.selectedBodyId;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (selected) {
        ctx.strokeStyle = colorWithAlpha(def.color, .7);
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14);
    }
    const live = completenessForBody(body.id) > .5;
    const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gradient.addColorStop(0, colorWithAlpha(def.color, live ? .17 : .07));
    gradient.addColorStop(1, "rgba(13,17,18,.94)");
    ctx.fillStyle = gradient;
    roundRect(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = selected ? def.color : "rgba(218,233,228,.18)";
    ctx.lineWidth = 1;
    roundRect(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-w / 2 + 22 * camera.scale, 0, 13 * camera.scale, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(def.color, .55);
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.font = `${Math.max(8, 10 * camera.scale)}px 'DM Mono'`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.short, -w / 2 + 22 * camera.scale, 0);
    ctx.textAlign = "left";
    ctx.fillStyle = "#e9efec";
    ctx.font = `500 ${Math.max(8, 10 * camera.scale)}px Inter`;
    ctx.fillText(def.label, -w / 2 + 44 * camera.scale, -6 * camera.scale);
    ctx.fillStyle = "rgba(197,208,204,.48)";
    ctx.font = `${Math.max(6, 7 * camera.scale)}px 'DM Mono'`;
    ctx.fillText(def.family, -w / 2 + 44 * camera.scale, 9 * camera.scale);
    ctx.restore();
    for (const port of def.ports) {
        const world = portPosition(body, port.id), pos = worldToScreen(world.x, world.y);
        const isHover = hover.bodyId === body.id && hover.portId === port.id;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isHover ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = "#0a0d0e";
        ctx.fill();
        ctx.strokeStyle = PORT_COLORS[port.type];
        ctx.lineWidth = isHover ? 2 : 1;
        ctx.stroke();
        if (isHover || selected) {
            ctx.fillStyle = colorWithAlpha(PORT_COLORS[port.type], .7);
            ctx.font = "7px 'DM Mono'";
            ctx.textAlign = "center";
            const oy = port.side === "bottom" ? 15 : port.side === "top" ? -11 : -10;
            ctx.fillText(port.label, pos.x, pos.y + oy);
        }
    }
}
function drawEvent() {
    if (!state.event)
        return;
    const pmt = state.bodies.find((body) => body.kind === "photomultiplier");
    if (!pmt)
        return;
    const pos = worldToScreen(pmt.x, pmt.y);
    const ring = 48 + (animationTime * 18) % 22;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ring * camera.scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(199,255,93,${.18 - ((ring - 48) / 22) * .16})`;
    ctx.stroke();
}
function drawTimeView(width, height) {
    const panelH = 150, y0 = height - 210;
    ctx.fillStyle = "rgba(7,9,10,.86)";
    ctx.fillRect(14, y0, width - 28, panelH);
    ctx.strokeStyle = "rgba(210,230,225,.12)";
    ctx.strokeRect(14, y0, width - 28, panelH);
    ctx.font = "8px 'DM Mono'";
    ctx.fillStyle = "rgba(220,230,226,.45)";
    ctx.fillText("ANODE VOLTAGE · 20 ns/div", 26, y0 + 18);
    ctx.beginPath();
    const pulse = Math.max(8, Math.min(60, (metrics?.pulseMv || 0) * 20));
    for (let x = 24; x < width - 24; x++) {
        const t = (x - width * .46) / 16;
        const signal = t < 0 ? 0 : -pulse * (Math.exp(-t / 3) - Math.exp(-t / .28));
        const noise = seededNoise(Math.floor(x + state.event * 17)) * Math.min(6, metrics?.noiseMv || 1);
        const y = y0 + 75 + signal + noise;
        if (x === 24)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#c7ff5d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(182,156,255,.45)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(24, y0 + 75 - pulse * 1.12);
    ctx.lineTo(width - 24, y0 + 75 - pulse * 1.12);
    ctx.stroke();
    ctx.setLineDash([]);
}
function drawPhaseView(width, height) {
    const cx = width / 2, cy = height / 2, r = Math.min(width, height) * .25;
    ctx.fillStyle = "rgba(7,9,10,.74)";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(210,230,225,.13)";
    for (const f of [.33, .66, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - r - 12, cy);
    ctx.lineTo(cx + r + 12, cy);
    ctx.moveTo(cx, cy - r - 12);
    ctx.lineTo(cx, cy + r + 12);
    ctx.stroke();
    for (let i = 0; i < 42; i++) {
        const a = seededNoise(i + state.seed) * Math.PI * 2 + animationTime * (.3 + ((i % 7) / 9));
        const rr = r * (.25 + .72 * Math.abs(seededNoise(i * 3 + 7)));
        ctx.fillStyle = "rgba(105,231,220,.24)";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    const lock = state.bodies.find((b) => b.kind === "lock-in");
    const phase = ((lock?.parameters.phaseDeg || 0) * Math.PI / 180);
    const strength = r * Math.min(.92, .25 + (metrics?.snr || 0) / 12);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(phase) * strength, cy - Math.sin(phase) * strength);
    ctx.strokeStyle = "#c7ff5d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + Math.cos(phase) * strength, cy - Math.sin(phase) * strength, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#c7ff5d";
    ctx.fill();
    ctx.font = "8px 'DM Mono'";
    ctx.fillStyle = "rgba(220,230,226,.55)";
    ctx.fillText("IN PHASE", cx + r + 16, cy + 3);
    ctx.fillText("QUADRATURE", cx + 7, cy - r - 17);
}
function drawProbabilityView(width, height) {
    const x0 = width * .18, y0 = height * .72, w = width * .64, h = height * .44;
    ctx.fillStyle = "rgba(7,9,10,.82)";
    ctx.fillRect(x0 - 24, y0 - h - 25, w + 48, h + 50);
    ctx.strokeStyle = "rgba(210,230,225,.13)";
    ctx.strokeRect(x0 - 24, y0 - h - 25, w + 48, h + 50);
    const mean = Math.log10(Math.max(10, metrics?.gain || 1000));
    for (let i = 0; i < 48; i++) {
        const z = (i / 47 * 6 - 3);
        const density = Math.exp(-.5 * Math.pow(z - (mean - 5) * .45, 2));
        const barH = density * h * .82 * (.82 + .18 * seededNoise(i + 90));
        ctx.fillStyle = colorWithAlpha("#c7ff5d", .18 + .35 * density);
        ctx.fillRect(x0 + i * w / 48, y0 - barH, w / 50, barH);
    }
    ctx.font = "8px 'DM Mono'";
    ctx.fillStyle = "rgba(220,230,226,.52)";
    ctx.fillText("10³", x0, y0 + 16);
    ctx.fillText("10⁴", x0 + w * .33, y0 + 16);
    ctx.fillText("10⁵", x0 + w * .66, y0 + 16);
    ctx.fillText("10⁶ e⁻", x0 + w - 25, y0 + 16);
    ctx.fillText("GAIN ENSEMBLE · SAME APPARATUS · 1,000 EVENTS", x0, y0 - h);
}
function seededNoise(index) {
    let x = (index + state.seed) | 0;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967295) * 2 - 1;
}
function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.roundRect(x, y, w, h, r);
}
function hitTest(screenX, screenY) {
    const world = screenToWorld(screenX, screenY);
    for (const body of [...state.bodies].reverse()) {
        for (const port of DEFINITIONS[body.kind].ports) {
            const pos = portPosition(body, port.id);
            if (Math.hypot(world.x - pos.x, world.y - pos.y) < 13 / camera.scale)
                return { body, port };
        }
        if (Math.abs(world.x - body.x) < BODY_W / 2 && Math.abs(world.y - body.y) < BODY_H / 2)
            return { body, port: null };
    }
    return null;
}
canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: camera.scale };
        return;
    }
    const hit = hitTest(point.x, point.y);
    if (hit?.port) {
        gesture = { kind: "wire", pointerId: event.pointerId, startX: point.x, startY: point.y, from: { bodyId: hit.body.id, portId: hit.port.id } };
    }
    else if (hit?.body) {
        state.selectedBodyId = hit.body.id;
        renderUi();
        gesture = { kind: "body", pointerId: event.pointerId, startX: point.x, startY: point.y, bodyId: hit.body.id, originX: hit.body.x, originY: hit.body.y };
    }
    else {
        state.selectedBodyId = null;
        renderUi();
        gesture = { kind: "pan", pointerId: event.pointerId, startX: point.x, startY: point.y, originX: camera.x, originY: camera.y };
    }
});
canvas.addEventListener("pointermove", (event) => {
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    if (pinchStart && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        camera.scale = clamp(pinchStart.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.distance, .45, 2.5);
        return;
    }
    const hit = hitTest(point.x, point.y);
    hover = { bodyId: hit?.body.id || null, portId: hit?.port?.id || null };
    if (!gesture || gesture.pointerId !== event.pointerId)
        return;
    const dx = (point.x - gesture.startX) / camera.scale, dy = (point.y - gesture.startY) / camera.scale;
    if (gesture.kind === "body") {
        const body = getBody(gesture.bodyId);
        if (body) {
            body.x = gesture.originX + dx;
            body.y = gesture.originY + dy;
        }
    }
    if (gesture.kind === "pan") {
        camera.x = gesture.originX + dx;
        camera.y = gesture.originY + dy;
    }
    const w = screenToWorld(point.x, point.y);
    $("#coordinate-readout").textContent = `${(w.x / 400).toFixed(2)} m · ${(w.y / 400).toFixed(2)} m`;
});
canvas.addEventListener("pointerup", (event) => {
    const point = localPoint(event);
    const hit = hitTest(point.x, point.y);
    if (gesture?.kind === "wire" && gesture.from && hit?.port) {
        connect(gesture.from.bodyId, gesture.from.portId, hit.body.id, hit.port.id);
    }
    if (gesture?.kind === "body" && Math.hypot(point.x - gesture.startX, point.y - gesture.startY) > 3) {
        actionLog.unshift(`Moved ${DEFINITIONS[getBody(gesture.bodyId).kind].label}`);
        renderUi();
    }
    pointers.delete(event.pointerId);
    gesture = null;
    pinchStart = null;
});
canvas.addEventListener("pointercancel", (event) => { pointers.delete(event.pointerId); gesture = null; pinchStart = null; });
canvas.addEventListener("dblclick", (event) => { const p = localPoint(event), hit = hitTest(p.x, p.y); if (hit?.body)
    openDive(hit.body); });
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const p = localPoint(event);
    const before = screenToWorld(p.x, p.y);
    camera.scale = clamp(camera.scale * Math.exp(-event.deltaY * .0012), .45, 2.5);
    const after = screenToWorld(p.x, p.y);
    camera.x += after.x - before.x;
    camera.y += after.y - before.y;
}, { passive: false });
function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function buildCatalog() {
    const catalog = $("#catalog");
    for (const [kind, def] of Object.entries(DEFINITIONS)) {
        const button = document.createElement("button");
        button.className = "catalog-item";
        button.style.setProperty("--kind-color", def.color);
        button.innerHTML = `<span class="catalog-glyph">${def.short}</span><span><strong>${def.label}</strong><small>${def.family}</small></span><span class="port-count">${def.ports.length} PORT${def.ports.length > 1 ? "S" : ""}</span>`;
        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            catalogDrag = { kind, pointerId: event.pointerId };
            const label = $("#drag-label");
            label.hidden = false;
            label.textContent = `Place ${def.label}`;
            moveDragLabel(event.clientX, event.clientY);
            button.setPointerCapture(event.pointerId);
        });
        button.addEventListener("pointermove", (event) => { if (catalogDrag?.pointerId === event.pointerId)
            moveDragLabel(event.clientX, event.clientY); });
        button.addEventListener("pointerup", (event) => {
            if (catalogDrag?.pointerId !== event.pointerId)
                return;
            const rect = lab.getBoundingClientRect();
            if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
                const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
                addBody(kind, world.x, world.y);
            }
            else
                showToast("Drop the body inside the field");
            catalogDrag = null;
            $("#drag-label").hidden = true;
        });
        catalog.append(button);
    }
}
function moveDragLabel(x, y) { const label = $("#drag-label"); label.style.left = `${x + 12}px`; label.style.top = `${y + 12}px`; }
function completeness() {
    const kinds = new Set(state.bodies.map((b) => b.kind));
    const required = ["photon-source", "photomultiplier", "hv-supply", "termination", "lock-in"];
    const bodyScore = required.filter((k) => kinds.has(k)).length / required.length;
    const requiredTypes = ["light", "hv", "signal", "reference", "return"];
    const wireScore = requiredTypes.filter((type) => state.tethers.some((t) => t.type === type)).length / requiredTypes.length;
    return bodyScore * .45 + wireScore * .55;
}
function completenessForBody(id) { return state.tethers.filter((t) => t.from.bodyId === id || t.to.bodyId === id).length > 0 ? 1 : 0; }
function bodyOf(kind) { return state.bodies.find((body) => body.kind === kind); }
function param(kind, key, fallback) { return bodyOf(kind)?.parameters[key] ?? fallback; }
function simulate() {
    if (!engineReady)
        return;
    worker.postMessage({ type: "simulate", revision: workerRevision, apparatus: {
            photonRateKhz: param("photon-source", "rateKhz", 0), modulationHz: param("photon-source", "modulationHz", 137),
            quantumEfficiency: param("photomultiplier", "qe", 0), stages: param("photomultiplier", "stages", 10),
            darkCps: param("photomultiplier", "darkCps", 80), voltage: param("hv-supply", "voltage", 0),
            rippleMv: param("hv-supply", "rippleMv", 8), terminationOhms: param("termination", "ohms", 50),
            probePf: param("probe", "capacitancePf", 0), probeMohm: param("probe", "resistanceMohm", 10),
            phaseDeg: param("lock-in", "phaseDeg", 0), timeConstantMs: param("lock-in", "timeConstantMs", 10),
            filterOrder: param("lock-in", "filterOrder", 1), completeness: completeness(), event: state.event,
        } });
}
function updateMetrics() {
    const f = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "—";
    $("#metric-pulse").textContent = metrics && state.event ? `${f(metrics.pulseMv, 3)} mV` : "—";
    $("#metric-gain").textContent = metrics && bodyOf("photomultiplier") ? `${metrics.gain.toExponential(2)}` : "—";
    $("#metric-snr").textContent = metrics && bodyOf("lock-in") ? f(metrics.snr, 1) : "—";
    $("#metric-settling").textContent = metrics && bodyOf("lock-in") ? `${f(metrics.settlingMs / 1000, 2)} s` : "—";
    const solved = !!metrics && metrics.snr >= 6 && Math.abs(param("hv-supply", "voltage", 0)) <= 900 && completeness() > .92;
    const card = $("#challenge");
    card.classList.toggle("solved", solved);
    card.innerHTML = solved ? `<span class="challenge-mark">◆</span><span><small>RECOVERY CONDITION MET</small><strong>${f(metrics.snr, 1)} SNR at ${param("hv-supply", "voltage", 0)} V</strong></span>` :
        `<span class="challenge-mark">◇</span><span><small>RECOVERY CONDITION</small><strong>SNR ≥ 6 · |HV| ≤ 900 V</strong></span>`;
    field?.setEnergy(state.event ? Math.min(1, (metrics?.snr || 0) / 8) : 0);
}
function renderUi() {
    $("#empty-state").classList.toggle("hidden", state.bodies.length > 0);
    $("#experiment-title").setAttribute("value", state.title);
    $("#experiment-title").value = state.title;
    $("#time-readout").textContent = `t = ${(state.logicalTime * 1e6).toFixed(3)} µs · seed ${state.seed}`;
    document.querySelectorAll("[data-view]").forEach((el) => el.classList.toggle("active", el.dataset.view === state.view));
    document.querySelectorAll("[data-lens]").forEach((el) => el.classList.toggle("active", el.dataset.lens === state.lens));
    const selected = state.selectedBodyId ? getBody(state.selectedBodyId) : null;
    $("#inspector-empty").hidden = !!selected;
    $("#inspector-content").hidden = !selected;
    if (selected)
        renderInspector(selected);
    else {
        $("#inspector-title").textContent = "No body selected";
        $("#selection-index").textContent = "—";
    }
    const list = $("#history-list");
    list.innerHTML = actionLog.length ? actionLog.map((item, index) => `<li>${index === 0 ? "NOW · " : ""}${escapeHtml(item)}</li>`).join("") : `<li class="muted">No interventions yet.</li>`;
    updateMetrics();
}
function renderInspector(body) {
    const def = DEFINITIONS[body.kind];
    $("#inspector-title").textContent = def.label;
    $("#selection-index").textContent = body.id.toUpperCase();
    $("#body-status").innerHTML = `<span>${def.family}</span><span class="${completenessForBody(body.id) ? "live" : ""}">${completenessForBody(body.id) ? "COUPLED" : "ISOLATED"}</span>`;
    const list = $("#parameter-list");
    list.innerHTML = "";
    for (const [key, spec] of Object.entries(def.params)) {
        const row = document.createElement("div");
        row.className = "parameter";
        row.innerHTML = `<div class="parameter-head"><label>${spec.label}</label><output>${formatParameter(body.parameters[key], spec.unit)}</output></div><input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${body.parameters[key]}" aria-label="${spec.label}">`;
        const input = row.querySelector("input");
        const output = row.querySelector("output");
        input.addEventListener("input", () => { body.parameters[key] = Number(input.value); output.textContent = formatParameter(body.parameters[key], spec.unit); workerRevision++; simulate(); updateMetrics(); });
        input.addEventListener("change", () => { actionLog.unshift(`Set ${spec.label} to ${formatParameter(body.parameters[key], spec.unit)}`); renderUi(); });
        list.append(row);
    }
    const diveButton = $("#dive-button");
    diveButton.disabled = !def.dive;
    diveButton.textContent = def.dive ? "Enter body" : "No authored interior";
}
function formatParameter(value, unit) { return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ""}`; }
function escapeHtml(text) { const d = document.createElement("div"); d.textContent = text; return d.innerHTML; }
function openDive(body) {
    const def = DEFINITIONS[body.kind];
    if (!def.dive) {
        showToast("This body has no authored interior yet");
        return;
    }
    state.selectedBodyId = body.id;
    $("#dive-title").textContent = `Inside ${def.label}`;
    $("#dive-copy").textContent = def.dive;
    const dialog = $("#dive-dialog");
    dialog.showModal();
    drawDive(body);
}
function drawDive(body) {
    const dive = $("#dive-canvas");
    const dctx = dive.getContext("2d");
    const w = dive.width, h = dive.height;
    dctx.clearRect(0, 0, w, h);
    dctx.fillStyle = "#07090a";
    dctx.fillRect(0, 0, w, h);
    if (body.kind === "photomultiplier") {
        const gradient = dctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, "rgba(105,231,220,.12)");
        gradient.addColorStop(.6, "rgba(199,255,93,.07)");
        gradient.addColorStop(1, "transparent");
        dctx.fillStyle = gradient;
        dctx.fillRect(0, 0, w, h);
        dctx.strokeStyle = "rgba(220,235,230,.25)";
        dctx.lineWidth = 2;
        dctx.beginPath();
        dctx.moveTo(80, 110);
        dctx.bezierCurveTo(10, 310, 40, 500, 185, 525);
        dctx.lineTo(1050, 525);
        dctx.bezierCurveTo(1160, 510, 1165, 150, 1050, 110);
        dctx.closePath();
        dctx.stroke();
        dctx.fillStyle = "rgba(105,231,220,.18)";
        dctx.fillRect(105, 125, 18, 360);
        dctx.fillStyle = "#69e7dc";
        dctx.font = "13px 'DM Mono'";
        dctx.fillText("PHOTOCATHODE", 55, 90);
        const stages = Math.round(body.parameters.stages);
        const startX = 210, spacing = 720 / Math.max(1, stages - 1);
        for (let i = 0; i < stages; i++) {
            const x = startX + i * spacing, y = 210 + (i % 2) * 165;
            dctx.save();
            dctx.translate(x, y);
            dctx.rotate(i % 2 ? .32 : -.32);
            dctx.fillStyle = "rgba(199,255,93,.14)";
            dctx.strokeStyle = "rgba(199,255,93,.55)";
            dctx.fillRect(-22, -42, 44, 84);
            dctx.strokeRect(-22, -42, 44, 84);
            dctx.restore();
            dctx.fillStyle = "rgba(220,235,230,.45)";
            dctx.font = "10px 'DM Mono'";
            dctx.fillText(`D${i + 1}`, x - 10, y + (i % 2 ? -62 : 67));
        }
        const event = Math.max(1, state.event);
        let px = 120, py = 305;
        for (let i = 0; i <= stages; i++) {
            const nx = i < stages ? startX + i * spacing : 1010, ny = i < stages ? 210 + (i % 2) * 165 : 305;
            const count = Math.min(22, 1 + Math.floor(i * i * .22));
            for (let n = 0; n < count; n++) {
                const t = ((performance.now() / 1100 + n * .077 + event * .13) % 1);
                const x = px + (nx - px) * t, y = py + (ny - py) * t + seededNoise(i * 90 + n) * 10;
                dctx.beginPath();
                dctx.arc(x, y, 2.2, 0, Math.PI * 2);
                dctx.fillStyle = "#c7ff5d";
                dctx.fill();
            }
            px = nx;
            py = ny;
        }
        dctx.fillStyle = "#c7ff5d";
        dctx.font = "11px 'DM Mono'";
        dctx.fillText(`${metrics?.gain.toExponential(2) || "—"} ELECTRONS / DETECTED PHOTON`, 820, 82);
    }
    else if (body.kind === "lock-in") {
        const cx = w / 2, cy = h / 2, r = 210;
        dctx.strokeStyle = "rgba(220,235,230,.13)";
        for (const f of [.25, .5, .75, 1]) {
            dctx.beginPath();
            dctx.arc(cx, cy, r * f, 0, Math.PI * 2);
            dctx.stroke();
        }
        dctx.beginPath();
        dctx.moveTo(cx - r - 40, cy);
        dctx.lineTo(cx + r + 40, cy);
        dctx.moveTo(cx, cy - r - 40);
        dctx.lineTo(cx, cy + r + 40);
        dctx.stroke();
        const angle = -body.parameters.phaseDeg * Math.PI / 180;
        dctx.strokeStyle = "#c7ff5d";
        dctx.lineWidth = 5;
        dctx.beginPath();
        dctx.moveTo(cx, cy);
        dctx.lineTo(cx + Math.cos(angle) * r * .82, cy + Math.sin(angle) * r * .82);
        dctx.stroke();
        dctx.fillStyle = "#c7ff5d";
        dctx.font = "12px 'DM Mono'";
        dctx.fillText("REFERENCE-COHERENT COMPONENT", cx + Math.cos(angle) * r * .5, cy + Math.sin(angle) * r * .5 - 14);
        dctx.fillStyle = "rgba(220,235,230,.45)";
        dctx.fillText("I", cx + r + 30, cy + 4);
        dctx.fillText("Q", cx + 5, cy - r - 26);
    }
    else {
        dctx.fillStyle = "rgba(220,235,230,.5)";
        dctx.font = "18px 'DM Mono'";
        dctx.textAlign = "center";
        dctx.fillText(definitionInterior(body.kind), w / 2, h / 2);
    }
}
function definitionInterior(kind) { return kind === "probe" ? "REAL INPUT IMPEDANCE · NOT AN IDEAL OBSERVER" : kind === "photon-source" ? "VERSIONED OPTICAL STIMULUS BOUNDARY" : "AUTHORED PHYSICAL INTERIOR"; }
function seal() {
    const capsule = { ...state, selectedBodyId: null };
    const json = JSON.stringify(capsule);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    location.hash = `es1.${encoded}`;
    navigator.clipboard?.writeText(location.href).then(() => showToast("Exact apparatus URL copied")).catch(() => showToast("Apparatus sealed into this URL"));
}
function restore() {
    if (!location.hash.startsWith("#es1."))
        return false;
    try {
        let encoded = location.hash.slice(5).replace(/-/g, "+").replace(/_/g, "/");
        encoded += "=".repeat((4 - encoded.length % 4) % 4);
        const binary = atob(encoded);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const value = JSON.parse(new TextDecoder().decode(bytes));
        if (value.schema !== 1 || !Array.isArray(value.bodies) || !Array.isArray(value.tethers) || value.bodies.length > 60 || value.tethers.length > 180)
            throw new Error("Invalid capsule");
        for (const body of value.bodies)
            if (!DEFINITIONS[body.kind] || !Number.isFinite(body.x) || !Number.isFinite(body.y))
                throw new Error("Invalid body");
        state = value;
        actionLog = [`Replayed sealed apparatus · ${state.bodies.length} bodies · ${state.tethers.length} tethers`];
        workerRevision++;
        renderUi();
        simulate();
        return true;
    }
    catch {
        window.history.replaceState(null, "", location.pathname);
        showToast("That apparatus capsule could not be verified");
        return false;
    }
}
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200); }
function fitApparatus() {
    if (!state.bodies.length) {
        camera = { x: 0, y: 0, scale: 1 };
        return;
    }
    const xs = state.bodies.map((b) => b.x), ys = state.bodies.map((b) => b.y);
    const minX = Math.min(...xs) - 100, maxX = Math.max(...xs) + 100, minY = Math.min(...ys) - 100, maxY = Math.max(...ys) + 100;
    const scale = Math.min(canvas.clientWidth / (maxX - minX), canvas.clientHeight / (maxY - minY), 1.35);
    camera.scale = clamp(scale, .45, 2);
    camera.x = canvas.clientWidth / (2 * camera.scale) - (minX + maxX) / 2;
    camera.y = canvas.clientHeight / (2 * camera.scale) - (minY + maxY) / 2;
}
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { state.view = button.dataset.view; field.setMode(["space", "time", "phase", "probability"].indexOf(state.view)); renderUi(); }));
document.querySelectorAll("[data-lens]").forEach((button) => button.addEventListener("click", () => { state.lens = button.dataset.lens; renderUi(); }));
$("#experiment-title").addEventListener("change", (event) => { state.title = event.target.value.trim() || "Untitled causal experiment"; renderUi(); });
$("#example-button").addEventListener("click", buildExample);
$("#share-button").addEventListener("click", seal);
$("#clear-button").addEventListener("click", () => clearLab());
$("#remove-button").addEventListener("click", removeSelected);
$("#photon-button").addEventListener("click", () => mutate(`Injected photon event ${state.event + 1}`, () => state.event++));
$("#dive-button").addEventListener("click", () => { const body = state.selectedBodyId ? getBody(state.selectedBodyId) : null; if (body)
    openDive(body); });
$("#close-dive").addEventListener("click", () => $("#dive-dialog").close());
$("#bloom-button").addEventListener("click", () => { $("#dive-dialog").close(); state.view = "probability"; field.setMode(3); renderUi(); showToast("One event expanded into 1,000 deterministic trials"); });
$("#undo-button").addEventListener("click", () => { const previous = history.pop(); if (previous) {
    state = previous;
    actionLog.unshift("Undid last intervention");
    workerRevision++;
    renderUi();
    simulate();
} });
$("#zoom-in").addEventListener("click", () => camera.scale = clamp(camera.scale * 1.2, .45, 2.5));
$("#zoom-out").addEventListener("click", () => camera.scale = clamp(camera.scale / 1.2, .45, 2.5));
$("#zoom-fit").addEventListener("click", fitApparatus);
window.addEventListener("hashchange", restore);
window.addEventListener("resize", () => field?.resize());
window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z")
        $("#undo-button").click();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        seal();
    }
    if (event.key === "Escape" && $("#dive-dialog").open)
        $("#dive-dialog").close();
});
async function boot() {
    buildCatalog();
    field = await createFieldRenderer(fieldCanvas);
    restore();
    renderUi();
    requestAnimationFrame(draw);
}
boot();
