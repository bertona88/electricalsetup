# Electricalsetup

[Electricalsetup](https://electricalsetup.com/) is a causal electrical laboratory for the browser. Users place physical bodies, grow typed connections, measure the live response, enter authored component interiors, turn the apparatus into time, phase, or probability, and share the exact experiment through its URL.

This repository now contains the greenfield laboratory application. The former Setup Universe mockup remains under `prototype/` as an immutable provenance snapshot; it is not used by the production deployment.

## First specimen

The bundled experiment recovers a weak, modulated photon stream from a photomultiplier with a lock-in detector. It is assembled through the same public actions available in the blank lab:

- six ordinary Matter placements;
- ten typed tethers, including returns and a reference;
- a loaded voltage probe;
- deterministic photon injection;
- PMT semantic dive and statistical bloom;
- time, phase, voltage, current, and noise views;
- a reproducible `es1` URL capsule.

The model is reduced-order and intended for intuition and experiment design. It is not a hardware sign-off, safety, EMC, or component-rating tool.

## Architecture

| Layer | Responsibility |
|---|---|
| Rust/Wasm reference kernel | Deterministic `f64` PMT, loading, noise, and lock-in calculations |
| Worker boundary | Unit conversion and isolated physics snapshots |
| Raw WebGPU/WGSL | Scientific field substrate with a Canvas fallback |
| Minimal TypeScript | Pointer/touch input, apparatus actions, views, inspector, and URL codec |
| GitHub Pages | Static production deployment at the custom domain |

The production bootstrap Wasm is compiled from checked-in WAT that mirrors the Rust reference. Direct Rust-to-Wasm compilation is the next kernel hardening step.

## Develop

```sh
npm install
npm test
npm run serve
```

Then open `http://127.0.0.1:4173/`.

## Contracts

Read [VISION.md](./VISION.md), [ELECTRICAL_MODEL_CONTRACT.md](./ELECTRICAL_MODEL_CONTRACT.md), [INTERFACE_CONTRACT.md](./INTERFACE_CONTRACT.md), [CLAIMS_AND_VALIDATION.md](./CLAIMS_AND_VALIDATION.md), and [ACCEPTANCE_TESTS.md](./ACCEPTANCE_TESTS.md) before changing product or model boundaries.
