/**
 * Scratch Test Runner for Soft Starter Engine Assertions
 */
import { SoftStarterEngine } from '../src/utils/softStarterEngine';
import { SoftStarterValidator } from '../src/utils/softStarterValidator';

console.log('=== RUNNING SOFT STARTER ENGINE PHYSICS TESTS ===\n');

// Assertion 1: Locked Rotor Current at s=1, V=1pu -> I ≈ 6pu
{
  const engine = new SoftStarterEngine();
  const perf1 = engine.calculateMotorPerformance(1.0, 1.0);
  console.log(`[Test 1] Locked-Rotor Current at s=1.0, V=1.0pu: ${perf1.I_line_pu.toFixed(2)} pu (Expected ~6.0 pu)`);
  if (perf1.I_line_pu >= 5.5 && perf1.I_line_pu <= 6.5) {
    console.log('✅ TEST 1 PASSED\n');
  } else {
    console.error('❌ TEST 1 FAILED\n');
    process.exit(1);
  }
}

// Assertion 2: Rated Point Operating Conditions (s = 0.020, 2% slip) -> T ≈ 1pu, I ≈ 1pu
{
  const engine = new SoftStarterEngine();
  const s_rated = 0.020;
  const perf2 = engine.calculateMotorPerformance(1.0, s_rated);
  console.log(`[Test 2] Rated Point (s=${s_rated}): Te = ${perf2.Te_pu.toFixed(2)} pu, I_line = ${perf2.I_line_pu.toFixed(2)} pu`);
  if (Math.abs(perf2.Te_pu - 1.0) < 0.25 && Math.abs(perf2.I_line_pu - 1.0) < 0.25) {
    console.log('✅ TEST 2 PASSED\n');
  } else {
    console.error('❌ TEST 2 FAILED\n');
    process.exit(1);
  }
}

// Assertion 3: Quadratic V² Law at V=0.4pu -> T_start ≈ 0.16 pu
{
  const engine = new SoftStarterEngine();
  const perfFull = engine.calculateMotorPerformance(1.0, 1.0);
  const perfRed = engine.calculateMotorPerformance(0.4, 1.0);
  console.log(`[Test 3] V² Law at V=0.4pu: T_start(0.4V) = ${perfRed.Te_pu.toFixed(3)} pu (Expected 0.4² * T_full = ${(perfFull.Te_pu * 0.16).toFixed(3)} pu)`);
  if (Math.abs(perfRed.Te_pu - (perfFull.Te_pu * 0.16)) < 0.02) {
    console.log('✅ TEST 3 PASSED\n');
  } else {
    console.error('❌ TEST 3 FAILED\n');
    process.exit(1);
  }
}

// Assertion 4: Current-Limit Mode never exceeds I_limit in steady state
{
  const engine = new SoftStarterEngine();
  engine.setParams({ startMode: 'currentLimit', iLimitPu: 3.5, vStartPct: 30 });
  engine.start();
  let maxCurrentInRamp = 0;
  for (let step = 0; step < 10000; step++) {
    engine.step(0.001);
    if (engine.state === 'STARTING') {
      maxCurrentInRamp = Math.max(maxCurrentInRamp, engine.I_rms_pu);
    }
  }
  console.log(`[Test 4] Current Limit Mode (I_limit=3.5pu): Max Current Reached = ${maxCurrentInRamp.toFixed(2)} pu`);
  if (maxCurrentInRamp <= 3.55) {
    console.log('✅ TEST 4 PASSED\n');
  } else {
    console.error('❌ TEST 4 FAILED\n');
    process.exit(1);
  }
}

// Assertion 5: Fan with High J=28 and short t_ramp=5s -> accel time > ramp time
{
  const engine = new SoftStarterEngine();
  engine.setScenario('fan');
  engine.setParams({ tRampSec: 5.0, vStartPct: 30 });
  engine.start();
  let t_accel = 0;
  while (engine.w_pu < 0.95 && t_accel < 60) {
    engine.step(0.001);
    t_accel += 0.001;
  }
  console.log(`[Test 5] High Inertia Fan (J=28, t_ramp=5s): Accel Time to 95% speed = ${t_accel.toFixed(2)} s`);
  if (t_accel > 5.0) {
    console.log('✅ TEST 5 PASSED\n');
  } else {
    console.error('❌ TEST 5 FAILED\n');
    process.exit(1);
  }
}

// Assertion 6: Thermal Overload Capacity reaches 100% and trips under sustained 2pu current
{
  const engine = new SoftStarterEngine();
  engine.setParams({ tripClass: 'Class10' });
  engine.I_rms_pu = 2.0;
  engine.state = 'RUNNING';
  for (let step = 0; step < 45000; step++) {
    engine.updateThermalCapacity(0.001);
  }
  console.log(`[Test 6] Sustained 2.0pu Overload (Class 10): Thermal Cap = ${engine.thermalCapPct.toFixed(1)}%, State = ${engine.state}`);
  if (engine.thermalCapPct >= 100.0 && (engine.state as string) === 'TRIPPED') {
    console.log('✅ TEST 6 PASSED\n');
  } else {
    console.error('❌ TEST 6 FAILED\n');
    process.exit(1);
  }
}

// Assertion 7: Inside-Delta SCR Rating Derating
{
  const inlineDerating = SoftStarterValidator.calculateScrDerating('inline', 269);
  const insideDeltaDerating = SoftStarterValidator.calculateScrDerating('insideDelta', 269);
  console.log(`[Test 7] Inline SCR Rating: ${inlineDerating.scrCurrentA.toFixed(1)} A`);
  console.log(`[Test 7] Inside-Delta SCR Rating: ${insideDeltaDerating.scrCurrentA.toFixed(1)} A (${insideDeltaDerating.deratingFactorPct.toFixed(1)}%)`);
  if (Math.abs(insideDeltaDerating.scrCurrentA - (269 / Math.sqrt(3))) < 0.5) {
    console.log('✅ TEST 7 PASSED\n');
  } else {
    console.error('❌ TEST 7 FAILED\n');
    process.exit(1);
  }
}

console.log('🎉 ALL 7 SOFT STARTER ENGINE PHYSICS TESTS PASSED PERFECTLY!');
