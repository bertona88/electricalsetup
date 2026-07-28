# Acceptance tests

## Blank laboratory

- The custom domain opens a blank causal lab, not the legacy Setup Universe mockup.
- Six generic body definitions appear in Matter.
- Mouse, pen, and touch can place and move bodies.
- Pulling between matching ports creates a tether; mismatched physical types are rejected.
- Removing a body removes its dependent tethers.

## PMT dogfood specimen

- “Build the photon specimen” invokes the same add/connect actions as direct user construction.
- The resulting state contains six bodies and ten typed tethers, including explicit returns.
- Injecting a photon changes the deterministic event index and causal readout.
- Changing HV, termination, probe capacitance, lock-in phase, or memory changes the worker snapshot.
- Entering the PMT exposes the authored dynode cascade.
- Time, phase, and probability turns show distinct views of the same apparatus.

## Reproducibility and safety

- Sealing writes an `es1` capsule to the URL fragment.
- Opening the sealed URL reconstructs title, seed, event, view, bodies, parameters, and tethers.
- Invalid, oversized, unknown-version, and unknown-body capsules are rejected.
- The UI labels the model reduced-order and disclaims hardware sign-off.

## Production

- `npm test` passes.
- GitHub Pages publishes the contents of `app/`.
- `/main.js`, `/physics-worker.js`, and `/physics/kernel.wasm` return successfully over HTTPS.
- `https://electricalsetup.com/` serves the new lab title and not “Setup Universe”.
