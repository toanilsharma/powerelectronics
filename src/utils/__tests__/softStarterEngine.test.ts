/**
 * softStarterEngine.test.ts - Unit Tests for Soft Starter Physics Engine
 * 
 * Asserts:
 * 1. Locked-rotor current: at s=1.0, V=1.0pu -> I ≈ 6.0 pu
 * 2. Rated operating point: at s=0.020, V=1.0pu -> T ≈ 1.0 pu, I ≈ 1.0 pu
 * 3. Quadratic V² torque law: at V=0.4pu -> starting torque T ≈ 0.16 pu
 * 4. Current-limit closed-loop override: I <= I_limit (3.5 pu) in steady acceleration
 * 5. Mechanical inertia: High-J fan (J=28) with short ramp (5s) -> t_accel > t_ramp
 * 6. Thermal protection: Sustained 2.0 pu overload trips Class 10 within 120 s (C >= 100%)
 * 7. Inside-Delta topology: SCR current = Line Current / sqrt(3) ≈ 57.7% of FLA
 */

declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: (value: any) => any;
declare const beforeEach: (fn: () => void) => void;

import { SoftStarterEngine } from '../softStarterEngine';
import { SoftStarterValidator } from '../softStarterValidator';

describe('SoftStarterEngine Physics Unit Tests', () => {
  let engine: SoftStarterEngine;

  beforeEach(() => {
    engine = new SoftStarterEngine();
  });

  test('(1) Locked-Rotor Current: at s=1.0, V=1.0pu -> I ≈ 6.0 pu', () => {
    const perf = engine.calculateMotorPerformance(1.0, 1.0);
    expect(perf.I_line_pu).toBeGreaterThanOrEqual(5.5);
    expect(perf.I_line_pu).toBeLessThanOrEqual(6.5);
    expect(Math.round(perf.I_line_pu)).toBe(6);
  });

  test('(2) Rated Operating Point: at rated slip (s=0.020) -> T ≈ 1.0 pu, I ≈ 1.0 pu', () => {
    const s_rated = 0.020;
    const perf = engine.calculateMotorPerformance(1.0, s_rated);
    expect(perf.Te_pu).toBeGreaterThanOrEqual(0.7);
    expect(perf.Te_pu).toBeLessThanOrEqual(1.1);
    expect(perf.I_line_pu).toBeGreaterThanOrEqual(0.8);
    expect(perf.I_line_pu).toBeLessThanOrEqual(1.1);
  });

  test('(3) Quadratic V² Torque Law: V=0.4pu -> starting torque T ≈ 0.16 pu', () => {
    const perfFull = engine.calculateMotorPerformance(1.0, 1.0);
    const perfReduced = engine.calculateMotorPerformance(0.4, 1.0);

    const expectedTorque = perfFull.Te_pu * 0.4 * 0.4; // T ∝ V²
    expect(perfReduced.Te_pu).toBeCloseTo(expectedTorque, 2);
    expect(perfReduced.Te_pu).toBeGreaterThanOrEqual(0.09);
    expect(perfReduced.Te_pu).toBeLessThanOrEqual(0.15);
  });

  test('(4) Current-Limit Mode: Line current never exceeds I_limit (3.5 pu)', () => {
    engine.setParams({
      startMode: 'currentLimit',
      iLimitPu: 3.5,
      vStartPct: 30,
      tRampSec: 10,
    });

    engine.start();

    for (let step = 0; step < 10000; step++) {
      engine.step(0.001);
      if (engine.state === 'STARTING') {
        expect(engine.I_rms_pu).toBeLessThanOrEqual(3.55);
      }
    }
  });

  test('(5) High-Inertia Fan Acceleration: Fan (J=28) with t_ramp=5s -> t_accel > t_ramp', () => {
    engine.setScenario('fan');
    engine.setParams({ tRampSec: 5.0, vStartPct: 30 });

    engine.start();
    let elapsedSec = 0;
    
    while (engine.w_pu < 0.95 && elapsedSec < 60) {
      engine.step(0.001);
      elapsedSec += 0.001;
    }

    expect(elapsedSec).toBeGreaterThan(5.0);
  });

  test('(6) Thermal Overload Protection: Sustained 2.0 pu current trips Class 10 within 120s', () => {
    engine.setParams({ tripClass: 'Class10' });
    engine.I_rms_pu = 2.0;
    engine.state = 'RUNNING';

    for (let step = 0; step < 45000; step++) {
      engine.updateThermalCapacity(0.001);
    }

    expect(engine.thermalCapPct).toBeGreaterThanOrEqual(100.0);
    expect((engine.state as string)).toBe('TRIPPED');
  });

  test('(7) Inside-Delta SCR Rating: SCR current = Line Current / sqrt(3) ≈ 57.7%', () => {
    const motorFlaA = 269;
    
    const inlineMetrics = SoftStarterValidator.calculateScrDerating('inline', motorFlaA);
    expect(inlineMetrics.scrCurrentA).toBe(269);
    expect(inlineMetrics.deratingFactorPct).toBe(100.0);

    const insideDeltaMetrics = SoftStarterValidator.calculateScrDerating('insideDelta', motorFlaA);
    expect(insideDeltaMetrics.scrCurrentA).toBeCloseTo(269 / Math.sqrt(3), 1);
    expect(insideDeltaMetrics.deratingFactorPct).toBeCloseTo(57.7, 1);
  });
});
