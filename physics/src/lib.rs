//! Deterministic reduced-order reference kernel for the first Electricalsetup specimen.
//!
//! All public functions use SI-derived scalar inputs, f64 state, and have no hidden
//! randomness. The browser worker owns unit conversion and apparatus validation.

#[no_mangle]
pub extern "C" fn pmt_gain(hv_volts: f64, stages: i32) -> f64 {
    let stage_count = stages.max(1);
    let secondary_emission = 1.5 + hv_volts.abs() / stage_count as f64 / 35.0;
    (0..stage_count).fold(1.0, |gain, _| gain * secondary_emission)
}

#[no_mangle]
pub extern "C" fn pulse_mv(quantum_efficiency_percent: f64, gain: f64, termination_ohms: f64) -> f64 {
    const ELECTRON_CHARGE_COULOMBS: f64 = 1.602_176_634e-19;
    const PULSE_WIDTH_SECONDS: f64 = 6e-9;
    quantum_efficiency_percent / 100.0
        * gain
        * ELECTRON_CHARGE_COULOMBS
        / PULSE_WIDTH_SECONDS
        * termination_ohms
        * 1_000.0
}

#[no_mangle]
pub extern "C" fn lockin_snr(
    signal_mv: f64,
    noise_mv_rms: f64,
    time_constant_seconds: f64,
    modulation_hz: f64,
    phase_radians: f64,
) -> f64 {
    if noise_mv_rms <= 0.0 {
        return 0.0;
    }
    signal_mv
        * phase_radians.cos().abs()
        / noise_mv_rms
        * (time_constant_seconds.max(0.0) * modulation_hz.max(0.0) / 2.0).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pmt_gain_increases_with_bias() {
        assert!(pmt_gain(900.0, 10) > pmt_gain(600.0, 10));
    }

    #[test]
    fn quadrature_rejects_coherent_signal() {
        assert!(lockin_snr(1.0, 0.1, 1.0, 100.0, std::f64::consts::FRAC_PI_2) < 1e-12);
    }
}
