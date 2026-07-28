"use strict";
let kernel = null;
async function boot() {
    try {
        const response = await fetch("./physics/kernel.wasm");
        const bytes = await response.arrayBuffer();
        const instance = await WebAssembly.instantiate(bytes, { env: { cos: Math.cos } });
        kernel = instance.instance.exports;
        postMessage({ type: "ready", engine: "wasm-f64" });
    }
    catch (error) {
        postMessage({ type: "ready", engine: "js-reference", detail: String(error) });
    }
}
function call(name, args, fallback) {
    const fn = kernel?.[name];
    return fn ? fn(...args) : fallback();
}
self.onmessage = (event) => {
    if (event.data.type !== "simulate")
        return;
    const a = event.data.apparatus;
    const hv = Math.abs(a.voltage);
    const gain = call("pmt_gain", [hv, a.stages], () => {
        const perStage = 1.5 + hv / Math.max(1, a.stages) / 35;
        return Math.pow(perStage, a.stages);
    });
    const pulseMv = call("pulse_mv", [a.quantumEfficiency, gain, a.terminationOhms], () => (a.quantumEfficiency / 100) * gain * 1.602176634e-19 / 6e-9 * a.terminationOhms * 1000);
    const probeLoading = 1 / Math.sqrt(1 + Math.pow(2 * Math.PI * 80e6 * a.probePf * 1e-12 * a.terminationOhms, 2));
    const signal = pulseMv * probeLoading * a.completeness;
    const noiseMv = Math.max(.001, Math.sqrt(a.darkCps / 5000 + a.rippleMv * a.rippleMv * .001 + a.photonRateKhz * .0004));
    const phaseRad = a.phaseDeg * Math.PI / 180;
    const snr = call("lockin_snr", [signal, noiseMv, a.timeConstantMs / 1000, a.modulationHz, phaseRad], () => signal * Math.abs(Math.cos(phaseRad)) / noiseMv * Math.sqrt(Math.max(.001, a.timeConstantMs / 1000 * a.modulationHz / 2)));
    const settlingMs = a.timeConstantMs * (a.filterOrder + .5);
    const detectedRate = a.photonRateKhz * 1000 * a.quantumEfficiency / 100;
    const chargePc = gain * 1.602176634e-7;
    postMessage({
        type: "snapshot",
        revision: event.data.revision,
        metrics: { gain, pulseMv: signal, rawPulseMv: pulseMv, snr, settlingMs, detectedRate, chargePc, probeLoading, noiseMv },
    });
};
boot();
