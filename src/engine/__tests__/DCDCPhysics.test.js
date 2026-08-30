import {
  calculateBuck,
  calculateBoost,
  calculateBuckBoost,
  calculateSEPIC,
  calculateEfficiencyMap,
} from '../DCDCPhysics.js';

describe('DC-DC Converter Physics Engine Analytical Tests', () => {

  test('Buck Converter CCM 48V/40%/50kHz/180uH/470uF Benchmark Case', () => {
    const res = calculateBuck({
      Vin: 48,
      D: 0.40,
      f: 50000,
      L: 180e-6,
      C: 470e-6,
      R: 10, // Iout = 1.92A
      ESR: 0.01, // 10 mΩ
    });

    // 1. Vout = 48 * 0.40 = 19.2V
    expect(res.Vout).toBeCloseTo(19.2, 2);

    // 2. ΔIL = (48 - 19.2) * 0.40 / (180e-6 * 50000) = 11.52 / 9.0 = 1.28A
    expect(res.deltaIL).toBeCloseTo(1.28, 4);

    // 3. CCM Boundary Critical Current = ΔIL / 2 = 0.64A
    expect(res.Iout_crit).toBeCloseTo(0.64, 4);

    // 4. Mode should be CCM since Iout (1.92A) > Iout_crit (0.64A)
    expect(res.mode).toBe('CCM');

    // 5. ΔVout_cap = 1.28 / (8 * 50000 * 470e-6) = 6.8085 mV
    expect(res.deltaVout_cap * 1000).toBeCloseTo(6.8085, 2);

    // 6. ΔVout_esr = 1.28 * 0.01 = 12.8 mV
    expect(res.deltaVout_esr * 1000).toBeCloseTo(12.8, 2);

    // Total ΔVout ≈ 19.61 mV
    expect(res.deltaVout * 1000).toBeCloseTo(19.61, 1);
  });

  test('Buck Converter DCM Mode Detection', () => {
    const res = calculateBuck({
      Vin: 48,
      D: 0.40,
      f: 50000,
      L: 180e-6,
      C: 470e-6,
      R: 100, // Iout ~ 0.19A < Iout_crit (0.64A)
    });

    expect(res.mode).toBe('DCM');
    expect(res.Iout).toBeLessThan(res.Iout_crit);
  });

  test('Boost Converter Ideal CCM Conversion Ratio', () => {
    const res = calculateBoost({
      Vin: 24,
      D: 0.50,
      f: 50000,
      L: 180e-6,
      C: 470e-6,
      R: 20,
    });

    // Vout = Vin / (1 - D) = 24 / 0.5 = 48V
    expect(res.Vout).toBeCloseTo(48, 2);
    // ΔIL = 24 * 0.5 / (180e-6 * 50000) = 12 / 9 = 1.3333A
    expect(res.deltaIL).toBeCloseTo(1.3333, 3);
  });

  test('Buck-Boost Converter Ideal Inverting Ratio', () => {
    const res = calculateBuckBoost({
      Vin: 24,
      D: 0.50,
      f: 50000,
      L: 180e-6,
      C: 470e-6,
      R: 20,
    });

    // Vout = -Vin * D / (1 - D) = -24 * 0.5 / 0.5 = -24V
    expect(res.Vout).toBeCloseTo(-24, 2);
  });

  test('SEPIC Converter Non-Inverting Ratio', () => {
    const res = calculateSEPIC({
      Vin: 48,
      D: 0.40,
      f: 50000,
      L: 180e-6,
      C: 470e-6,
      R: 10,
    });

    // Vout = Vin * D / (1 - D) = 48 * 0.4 / 0.6 = 32V
    expect(res.Vout).toBeCloseTo(32, 2);
  });

  test('Efficiency Map Table Derivation', () => {
    const map = calculateEfficiencyMap('buck', { Vin: 48, D: 0.4, f: 50000, L: 180e-6, C: 470e-6 }, 0.5, 10, 5);
    expect(map.length).toBe(5);
    expect(map[0].Iout).toBe(0.5);
    expect(map[0].etaPct).toBeGreaterThan(50);
  });

});
