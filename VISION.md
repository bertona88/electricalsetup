# Electricalsetup product vision

Electricalsetup is a causal electrical laboratory, not an interactive schematic. A user assembles a live apparatus from physical bodies, grows typed connections between ports, introduces disturbances, measures the response, enters authored interiors, and shares the exact scientific moment in the URL.

The first public specimen is a weak, modulated photon stream detected by a photomultiplier and recovered with a lock-in detector. The specimen is not a special screen: it is assembled through the same `add body`, `connect`, `measure`, `change parameter`, `inject event`, and `turn view` actions exposed to every user.

## Product laws

- The apparatus opens alive. Run/Pause freezes and resumes visual time without blocking inspection or edits.
- Every visual change must correspond to modeled state, measurement, or uncertainty.
- Connections carry an explicit physical type and include return paths.
- Instruments load the apparatus.
- Replaying a sealed URL reconstructs topology, values, view, seed, and logical time.
- Educational and professional use share one surface; deeper evidence is reached by semantic dive.
- Qualitative or reduced-order models are labeled and never presented as sign-off predictions.

## First release boundary

The browser release proves the reusable laboratory grammar with six bodies: optical stimulus, PMT, HV source, termination, probe, and lock-in. A fresh URL opens the fitted PMT specimen directly on a canvas-first workbench. Components live in a compact bottom tray; settings appear only after selection; measurements appear only after both probe leads are connected; advanced views, experiments, model notes, and history live in one menu.

The release includes touch placement, direct manipulation, typed tethers, parameter scrubbing, deterministic events, time/phase/probability turns, a PMT interior, causal metrics, pause/resume, reset, undo, and URL replay. The blank laboratory remains available by clearing the workbench.

General PCB layout, vendor SPICE models, calibrated safety analysis, and live Opticalsetup co-simulation are intentionally outside this release.
