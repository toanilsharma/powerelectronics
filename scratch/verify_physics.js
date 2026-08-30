import { calculateBuck, calculateBoost, calculateBuckBoost, calculateSEPIC } from '../src/engine/DCDCPhysics.js';

console.log("=== DC-DC PHYSICS VERIFICATION ===");

const buckRes = calculateBuck({
  Vin: 48,
  D: 0.40,
  f: 50000,
  L: 180e-6,
  C: 470e-6,
  R: 10,
  ESR: 0.01
});

console.log("Buck 48V D40% L180uH f50kHz:");
console.log("  Vout:", buckRes.Vout, "V (Expected: 19.2V)");
console.log("  deltaIL:", buckRes.deltaIL, "A (Expected: 1.28A)");
console.log("  Iout_crit:", buckRes.Iout_crit, "A (Expected: 0.64A)");
console.log("  mode:", buckRes.mode, "(Expected: CCM)");
console.log("  deltaVout_cap:", (buckRes.deltaVout_cap * 1000).toFixed(4), "mV (Expected: 6.8085mV)");
console.log("  deltaVout_esr:", (buckRes.deltaVout_esr * 1000).toFixed(4), "mV (Expected: 12.8mV)");
console.log("  deltaVout total:", (buckRes.deltaVout * 1000).toFixed(4), "mV (Expected: 19.6085mV)");
console.log("  etaPct:", buckRes.etaPct.toFixed(2), "%");

const boostRes = calculateBoost({ Vin: 24, D: 0.50, f: 50000, L: 180e-6, C: 470e-6, R: 20 });
console.log("\nBoost 24V D50%:");
console.log("  Vout:", boostRes.Vout, "V (Expected: 48V)");
console.log("  deltaIL:", boostRes.deltaIL.toFixed(4), "A (Expected: 1.3333A)");

const buckBoostRes = calculateBuckBoost({ Vin: 24, D: 0.50, f: 50000, L: 180e-6, C: 470e-6, R: 20 });
console.log("\nBuck-Boost 24V D50%:");
console.log("  Vout:", buckBoostRes.Vout, "V (Expected: -24V)");

const sepicRes = calculateSEPIC({ Vin: 48, D: 0.40, f: 50000, L: 180e-6, C: 470e-6, R: 10 });
console.log("\nSEPIC 48V D40%:");
console.log("  Vout:", sepicRes.Vout, "V (Expected: 32V)");
