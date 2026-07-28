# Electrical model contract

## State and numerical boundary

The canonical apparatus state lives in the browser application and is sent to a dedicated worker. The reference kernel uses deterministic `f64` calculations. Rendering is observational and cannot change canonical scientific state.

The first kernel is a reduced-order detector-chain model:

- PMT gain is a staged secondary-emission approximation parameterized by bias and dynode count.
- Pulse voltage is derived from detected charge, a fixed reduced pulse width, and termination impedance.
- Probe loading includes the high-frequency attenuation created by input capacitance and termination impedance.
- Noise combines a documented illustrative contribution from dark events, HV ripple, and photon rate.
- Lock-in recovery uses coherent phase projection and the square-root integration relationship.

All stochastic visuals use a deterministic seed. Baseline and counterfactual states can therefore share the same noise realization.

## Units and signs

The URL capsule stores values in the units named by each parameter: volts, millivolts, ohms, megohms, picofarads, hertz, milliseconds, nanometers, nanoseconds, counts per second, and percent. The worker converts them before calculation. HV magnitude determines modeled PMT gain; the displayed sign preserves the negative-bias convention.

## Validity domain

This model supports qualitative intuition about detector gain, termination, probe loading, coherent recovery, phase, and integration-time tradeoffs. It is not calibrated to a particular PMT, cable, supply, probe, or lock-in and must not be used for component ratings, safety, EMC, lifetime, or hardware sign-off.

The production Wasm bootstrap mirrors the checked-in Rust reference kernel. A future release must compile the production Wasm directly from Rust before the model status can advance beyond reduced-order.
