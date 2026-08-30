import {
  calculateBuck,
  calculateBoost,
  calculateBuckBoost,
  calculateSEPIC,
  calculateEfficiencyMap,
} from '../src/engine/DCDCPhysics.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('Running DC-DC Physics Analytical Unit Tests...\n');

// Test 1: Buck Converter CCM 48V/40%/50kHz/180uH/470uF Benchmark
console.log('1. Buck Converter Benchmark Case (48V, D=40%, f=50kHz, L=180µH, C=470µF, R=10Ω, ESR=10mΩ):');
const buck = calculateBuck({ Vin: 48, D: 0.40, f: 50000, L: 180e-6, C: 470e-6, R: 10, ESR: 0.01 });

assert(Math.abs(buck.Vout - 19.2) < 0.01, `Vout ideal = 19.2V (got ${buck.Vout.toFixed(2)}V)`);
assert(Math.abs(buck.deltaIL - 1.28) < 0.001, `Inductor Ripple ΔIL = 1.28A (got ${buck.deltaIL.toFixed(4)}A)`);
assert(Math.abs(buck.Iout_crit - 0.64) < 0.001, `Critical Current Iout_crit = 0.64A (got ${buck.Iout_crit.toFixed(4)}A)`);
assert(buck.mode === 'CCM', `Conduction Mode = CCM (got ${buck.mode})`);
assert(Math.abs(buck.deltaVout_cap * 1000 - 6.8085) < 0.01, `Capacitive Ripple = 6.81mV (got ${(buck.deltaVout_cap * 1000).toFixed(4)}mV)`);
assert(Math.abs(buck.deltaVout_esr * 1000 - 12.80) < 0.01, `ESR Ripple = 12.80mV (got ${(buck.deltaVout_esr * 1000).toFixed(4)}mV)`);
assert(Math.abs(buck.deltaVout * 1000 - 19.6085) < 0.1, `Total Output Ripple ΔVout ≈ 19.61mV (got ${(buck.deltaVout * 1000).toFixed(4)}mV)`);

// Test 2: DCM Boundary Flagging
console.log('\n2. DCM Mode Boundary Detection (R = 100Ω):');
const buckDcm = calculateBuck({ Vin: 48, D: 0.40, f: 50000, L: 180e-6, C: 470e-6, R: 100 });
assert(buckDcm.mode === 'DCM', `Conduction Mode = DCM (got ${buckDcm.mode})`);
assert(buckDcm.Iout < buckDcm.Iout_crit, `Iout (${buckDcm.Iout.toFixed(2)}A) < Iout_crit (${buckDcm.Iout_crit.toFixed(2)}A)`);

// Test 3: Boost Topology
console.log('\n3. Boost Converter Topology Ratio (24V, D=50%):');
const boost = calculateBoost({ Vin: 24, D: 0.50, f: 50000, L: 180e-6, C: 470e-6, R: 20 });
assert(Math.abs(boost.Vout - 48) < 0.01, `Boost Vout = 48V (got ${boost.Vout.toFixed(2)}V)`);
assert(Math.abs(boost.deltaIL - 1.3333) < 0.01, `Boost ΔIL = 1.33A (got ${boost.deltaIL.toFixed(4)}A)`);

// Test 4: Buck-Boost Topology
console.log('\n4. Buck-Boost Inverting Ratio (24V, D=50%):');
const buckBoost = calculateBuckBoost({ Vin: 24, D: 0.50, f: 50000, L: 180e-6, C: 470e-6, R: 20 });
assert(Math.abs(buckBoost.Vout - (-24)) < 0.01, `Buck-Boost Vout = -24V (got ${buckBoost.Vout.toFixed(2)}V)`);

// Test 5: SEPIC Topology
console.log('\n5. SEPIC Converter Ratio (48V, D=40%):');
const sepic = calculateSEPIC({ Vin: 48, D: 0.40, f: 50000, L: 180e-6, C: 470e-6, R: 10 });
assert(Math.abs(sepic.Vout - 32) < 0.01, `SEPIC Vout = 32V (got ${sepic.Vout.toFixed(2)}V)`);

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
