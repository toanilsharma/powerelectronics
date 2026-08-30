import {
  calculateInverterPhysics,
  runInverterBenchmarkSuite,
  calculateInverterEfficiencyMap,
} from '../src/engine/InverterPhysics.ts';

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

console.log('Running Single-Phase SPWM Inverter Analytical Physics Unit Tests...\n');

// Test 1: Standard 230V RMS SPWM Inverter (400V DC, ma=0.813, f1=50Hz, fc=5kHz)
console.log('1. Standard SPWM Inverter Benchmark Case (400V DC, ma=0.813, f1=50Hz, fc=5kHz, L=2mH, C=20µF, R=10Ω):');
const inv = calculateInverterPhysics({
  Vdc: 400,
  ma: 0.813,
  f1: 50,
  fc: 5000,
  inductanceMh: 2.0,
  capacitanceUf: 20,
  loadR: 10,
});

assert(Math.abs(inv.Vout_1_rms - 226.2) < 5.0, `Vout RMS ≈ 226.2V (got ${inv.Vout_1_rms}V)`);

assert(inv.mode === 'UNMODULATED_SPWM', `Modulation Mode = UNMODULATED_SPWM (got ${inv.mode})`);
assert(inv.thdPercent <= 5.0, `Voltage THD % <= 5% (got ${inv.thdPercent}%)`);
assert(inv.etaPct > 90.0, `Inverter Efficiency > 90% (got ${inv.etaPct}%)`);
assert(inv.f0_cutoff > 500 && inv.f0_cutoff < 1500, `LC Filter Cutoff f0 in valid range 500-1500Hz (got ${inv.f0_cutoff}Hz)`);

// Test 2: Overmodulation Mode
console.log('\n2. Overmodulation Mode Detection (ma = 1.40):');
const invOver = calculateInverterPhysics({
  Vdc: 400,
  ma: 1.40,
  f1: 50,
  fc: 5000,
  inductanceMh: 2.0,
  capacitanceUf: 20,
  loadR: 10,
});
assert(invOver.mode === 'OVERMODULATION', `Modulation Mode = OVERMODULATION (got ${invOver.mode})`);
assert(invOver.Vout_1_rms > inv.Vout_1_rms, `Overmodulation Vout (${invOver.Vout_1_rms}V) > Unmodulated Vout (${inv.Vout_1_rms}V)`);

// Test 3: Square Wave Mode
console.log('\n3. Pure Square Wave Mode Detection (ma = 3.0):');
const invSquare = calculateInverterPhysics({
  Vdc: 400,
  ma: 3.0,
  f1: 50,
  fc: 5000,
  inductanceMh: 2.0,
  capacitanceUf: 20,
  loadR: 10,
});
assert(invSquare.mode === 'SQUARE_WAVE', `Modulation Mode = SQUARE_WAVE (got ${invSquare.mode})`);

// Test 4: Fault Injection Handling
console.log('\n4. Fault Injection (S1 OPEN Fault):');
const invFault = calculateInverterPhysics(
  { Vdc: 400, ma: 0.8, f1: 50, fc: 5000, inductanceMh: 2.0, capacitanceUf: 20, loadR: 10 },
  'S1_OPEN'
);
assert(invFault.warnings.length > 0, `Fault Warning Emitted: ${invFault.warnings[0]}`);

// Test 5: Official Benchmark Suite
console.log('\n5. Running Official IEEE/IEC Inverter Benchmark Suite (5/5 Cases):');
const benchmarkResults = runInverterBenchmarkSuite();
benchmarkResults.forEach((bm) => {
  assert(bm.isPassed, `${bm.name} -> PASSED (Vout: ${bm.actualVout}V, Mode: ${bm.actualMode})`);
});

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
