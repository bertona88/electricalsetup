# Interface contract

## Internal apparatus actions

The public laboratory and the bundled PMT specimen use the same action boundary:

- add a body from a versioned definition;
- move a body in laboratory coordinates;
- connect two ports when their physical types match;
- remove a body and its dependent tethers;
- change a parameter within its declared range;
- inject a deterministic event;
- select a measurement lens or dimensional view;
- seal or restore an apparatus capsule.

The UI may animate a sequence of these actions, but it may not bypass them by injecting a hidden fixture.

Run/Pause controls the renderer clock and is intentionally local UI state: it does not change apparatus topology or parameter values and is not serialized. Reset rebuilds the reference PMT specimen through the same public add/connect actions.

## Typed ports

The first schema defines `light`, `hv`, `signal`, `reference`, and `return` ports. A tether is valid only when both endpoints carry the same type. Every tether stores endpoint identity, type, and geometric length.

## URL capsule

`#es1.<base64url-json>` contains schema version, title, seed, logical time, event index, view, lens, bodies, parameters, tethers, and selection. Share writes a selection-free capsule without disturbing local selection. Restoration rejects unknown body kinds, non-finite coordinates, unsupported schema versions, more than 60 bodies, or more than 180 tethers.

Waveform buffers and rendered particles are never serialized; they are reconstructed deterministically.

## Opticalsetup boundary

The current photon source is an authored `OpticalStimulus` stand-in. A future cross-site interface must version wavelength, photon-rate model, modulation/reference, timing distribution, coupling, clock, uncertainty, provenance, and source-of-truth ownership. No live coupling exists in this release.
