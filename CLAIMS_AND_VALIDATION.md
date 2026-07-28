# Claims and validation

## Claims this release makes

- Users can assemble, connect, parameterize, inspect, and share an electrical detector-chain experiment in a browser.
- The PMT specimen is assembled through the same public actions available in the blank lab.
- Identical sealed URLs reproduce identical apparatus state and deterministic event visuals.
- The browser uses a worker-isolated Wasm numerical boundary and WebGPU when available, with a scientific canvas fallback.
- Measurement loading, return paths, phase, noise, and model status are visible rather than silently omitted.

## Claims this release does not make

- It is not SPICE, field solving, PCB verification, vendor-model simulation, or a safety tool.
- Its numerical values are not calibrated to a particular instrument.
- Its PMT particles are weighted causal visualizations, not literal electron trajectories.
- Its noise model is illustrative and not a prediction of a real detector chain.
- Opticalsetup interoperability is a future interface, not a deployed capability.

## Validation layers

1. TypeScript compilation validates the browser integration boundary.
2. WAT validation and compilation validate the production bootstrap Wasm.
3. Static smoke tests assert the public action, URL, worker, touch, and WebGPU paths.
4. Browser testing validates placement, tethering, parameter changes, dimensional turns, URL replay, and responsive layout.
5. Public deployment testing validates GitHub Pages, HTTPS, assets, Wasm MIME delivery, and the custom domain.

Advancing model status requires comparison with analytical fixtures and measured data, with provenance and validity ranges recorded.
