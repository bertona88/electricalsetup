(module
  (import "env" "cos" (func $cos (param f64) (result f64)))

  (func (export "pmt_gain") (param $hv f64) (param $stages i32) (result f64)
    (local $i i32)
    (local $gain f64)
    (local $per_stage f64)
    local.get $hv
    local.get $stages
    f64.convert_i32_s
    f64.div
    f64.const 35
    f64.div
    f64.const 1.5
    f64.add
    local.set $per_stage
    f64.const 1
    local.set $gain
    i32.const 0
    local.set $i
    block $done
      loop $repeat
        local.get $i
        local.get $stages
        i32.ge_s
        br_if $done
        local.get $gain
        local.get $per_stage
        f64.mul
        local.set $gain
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $repeat
      end
    end
    local.get $gain)

  (func (export "pulse_mv") (param $qe f64) (param $gain f64) (param $ohms f64) (result f64)
    local.get $qe
    f64.const 100
    f64.div
    local.get $gain
    f64.mul
    f64.const 0.0000000000000000001602176634
    f64.mul
    f64.const 0.000000006
    f64.div
    local.get $ohms
    f64.mul
    f64.const 1000
    f64.mul)

  (func (export "lockin_snr")
    (param $signal f64) (param $noise f64) (param $tau f64)
    (param $frequency f64) (param $phase f64) (result f64)
    local.get $signal
    local.get $phase
    call $cos
    f64.abs
    f64.mul
    local.get $noise
    f64.div
    local.get $tau
    local.get $frequency
    f64.mul
    f64.const 2
    f64.div
    f64.sqrt
    f64.mul))
