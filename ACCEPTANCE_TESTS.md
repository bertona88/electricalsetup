# Acceptance tests

## Default laboratory

- The custom domain opens the complete, fitted PMT specimen directly on a canvas-first workbench, not a dashboard or the legacy Setup Universe mockup.
- Six generic body definitions appear in a horizontally scrollable bottom tray.
- The workbench does not reserve permanent columns for component settings or evidence.
- Selecting a body opens its inspector; closing it, tapping empty space, removing the body, or resetting closes the inspector.
- Measurements appear only when both probe tip and return clip are connected. A missing or one-lead probe neither loads the model nor exposes readings.
- Run/Pause freezes and resumes both causal-event and field animation while inspection and editing remain available.
- Reset reconstructs the exact reference PMT setup, clears the URL fragment, closes contextual UI, and resumes the simulation.
- Experiments, advanced views, zoom, guide, model contract, Setup Universe, and history live in one menu.
- Mouse, pen, and touch can place and move bodies.
- Tapping or pressing Enter on a tray item adds it near the workbench center; dragging places it precisely without blocking horizontal tray scroll.
- Pulling between matching ports creates a tether; mismatched physical types are rejected.
- Removing a body removes its dependent tethers.

## PMT dogfood specimen

- “Build the photon specimen” invokes the same add/connect actions as direct user construction.
- The resulting state contains six bodies and ten typed tethers, including explicit returns.
- Injecting a photon changes the deterministic event index and causal readout.
- Changing HV, termination, probe capacitance, lock-in phase, or memory changes the worker snapshot.
- Entering the PMT exposes the authored dynode cascade.
- Time, phase, and probability turns show distinct views of the same apparatus.
- Advanced measurement views are unavailable until a probe is fully connected.

## Reproducibility and safety

- Sealing writes an `es1` capsule to the URL fragment.
- Opening the sealed URL reconstructs title, seed, event, view, bodies, parameters, and tethers.
- Invalid, oversized, unknown-version, and unknown-body capsules are rejected.
- The UI labels the model reduced-order and disclaims hardware sign-off.
- Sharing preserves the user's local selection while encoding a selection-free replay URL.

## Production

- `npm test` passes.
- GitHub Pages publishes the contents of `app/`.
- `/main.js`, `/physics-worker.js`, and `/physics/kernel.wasm` return successfully over HTTPS.
- `https://electricalsetup.com/` serves the new lab title and not “Setup Universe”.
