# ElectricalSetup

> **Preliminary Setup Universe wrapper.** The current demo is temporary; the full simulator is expected to be redesigned and rebuilt substantially from scratch.

- **Live prototype:** https://electricalsetup.com/
- **Prototype release verified:** 2026-07-26 (`20260726T002235Z-478235af2650`); check the URL for current availability
- **Field:** Electrical and control systems
- **Status:** Greenfield planning wrapper with a preserved prototype snapshot

## Vision

The intended ElectricalSetup product is a circuit, instrumentation, signal-chain, and control-systems simulator where users can build and probe real interconnected electrical experiments.

ElectricalSetup is part of the **Setup Universe**: independently deployed scientific and systems workbenches intended to become interoperable. Over time, setups should be able to orchestrate or interface with one another through explicit, versioned, unit-aware ports without transferring ownership or copying private implementation state.

**First accepted end-to-end slice:** Build one source–controller–plant–sensor loop on a connectable schematic, with unit-bearing signals and clearly observable stable, unstable, delayed, saturated, and noisy responses.

**Model boundary:** ElectricalSetup owns circuit and control-plant dynamics; ComputationSetup owns program and algorithm execution; their interface is an explicit signal, event, or control protocol.

**Claim gate:** No hardware-safety, EMC, regulatory, component-rating, or design-signoff claim is allowed without calibrated device models and the relevant engineering review.

## Important starting point

Read [AGENTS.md](./AGENTS.md) before planning or implementing work.

The present browser demo should not constrain the next architecture. Before substantial implementation, this repository expects `VISION.md`, `ELECTRICAL_MODEL_CONTRACT.md`, `INTERFACE_CONTRACT.md`, `CLAIMS_AND_VALIDATION.md`, and `ACCEPTANCE_TESTS.md`.

## Prototype model boundary

The following describes only the current reference prototype, not the intended simulator.

**Exact current scope:** A deterministic lumped model couples a delayed digital PID controller to a saturating second-order optical plant with sensor noise and slow thermal droop.

**Known limits:**

- Blocks are behavioral transfer models, not transistor-, HDL-, or PCB-level simulation.
- Timing is represented as a fixed sample delay; clock-domain crossings and quantization spurs are omitted.
- The optical plant is normalized and does not predict absolute irradiance, device lifetime, or safety.

## Current prototype snapshot

`prototype/` preserves the exact shared browser-prototype source associated with production release `20260726T002235Z-478235af2650`. Its recorded deployed-source SHA-256 is `478235af26508aa70aa2af5f0196c9868b92ded1bed88106a9aa1a1cd86f8ba5`.

The snapshot contains all current Setup Universe demos because that release uses one shared, host-routed runtime. It is immutable, reference-only prior art: do not build the new architecture inside it. Moving, archiving, or removing it requires explicit user authorization after an accepted successor and preserved provenance.

To run the snapshot locally:

```sh
npm run prototype:test
npm run prototype:check
npm run prototype:serve
```

Then open http://127.0.0.1:4173/?setup=electrical.

These commands validate only the legacy prototype. This wrapper intentionally has no future-product test suite until the greenfield implementation begins.

## Setup Universe

[PicSetup](https://github.com/bertona88/picsetup) · [BiologicalSetup](https://github.com/bertona88/biologicalsetup) · [GravitySetup](https://github.com/bertona88/gravitysetup) · [TwoPhotonLithography](https://github.com/bertona88/twophotonlithography) · [EgoSetup](https://github.com/bertona88/egosetup) · [QuantumSetup](https://github.com/bertona88/quantumsetup) · [NoeticSetup](https://github.com/bertona88/noeticsetup) · [ComputationSetup](https://github.com/bertona88/computationsetup) · [LogisticSetup](https://github.com/bertona88/logisticsetup) · [MolecularSetup](https://github.com/bertona88/molecularsetup)

OpticalSetup remains in [LucaGenchi/optics-sketch](https://github.com/LucaGenchi/optics-sketch).

## License

No open-source license has been selected yet.
