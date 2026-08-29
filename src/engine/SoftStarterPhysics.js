/**
 * SoftStarterPhysics.js - IEC 60947-4-2 Compliant Thyristor Soft Starter & Motor Physics
 * 
 * Standards Reference: IEC 60947-4-2 (AC semiconductor motor controllers and starters)
 * - 3-Phase Phase-Angle Voltage Control: Vrms(α) = Vnom * sqrt((π - α + 0.5*sin(2α)) / π)
 * - Starting Current Envelope: I_start(α) = min( I_DOL * (Vrms/Vnom), I_limit )
 * - Electromagnetic Torque: Te = Te_DOL * (Vrms/Vnom)²
 * - Acceleration Voltage Ramp: V(t) = V_start + (100% - V_start) * (t / RampTime)
 * - Bypass Contactor KM1: Closes when speed >= 95% or ramp completes
 */

export const FLA_RATED_AMPS = 269; // 160kW 415V 4-Pole Motor Nominal FLA
export const DOL_INRUSH_RATIO = 8.0; // 8.0x FLA (2152A DOL peak)
export const DOL_START_TORQUE_PCT = 150; // 150% rated torque at DOL start

/**
 * 1. RMS Voltage as a function of firing angle alpha (0 to 180 degrees) per IEC 60947-4-2
 * Vrms(α) = Vnom * sqrt((π - α + 0.5 * sin(2α)) / π)
 */
export function calculateVrmsPct(alphaDeg) {
  const alphaRad = (Math.max(0, Math.min(180, alphaDeg)) * Math.PI) / 180;
  const ratio = Math.sqrt(Math.max(0, (Math.PI - alphaRad + 0.5 * Math.sin(2 * alphaRad)) / Math.PI));
  return ratio * 100;
}

/**
 * Inverse calculation: Determine SCR firing angle α (deg) for a given target RMS voltage (%)
 */
export function calculateAlphaDeg(vRmsPct) {
  const targetRatio = Math.max(0, Math.min(1, vRmsPct / 100));
  if (targetRatio >= 0.999) return 0;
  if (targetRatio <= 0.001) return 180;

  let alpha = (1.0 - targetRatio) * Math.PI;
  for (let iter = 0; iter < 12; iter++) {
    const f = Math.sqrt(Math.max(0, (Math.PI - alpha + 0.5 * Math.sin(2 * alpha)) / Math.PI)) - targetRatio;
    const df = - (1 - Math.cos(2 * alpha)) / (2 * Math.PI * Math.max(0.001, targetRatio));
    if (Math.abs(f) < 1e-5 || Math.abs(df) < 1e-6) break;
    alpha = Math.max(0, Math.min(Math.PI, alpha - f / df));
  }
  return (alpha * 180) / Math.PI;
}

/**
 * 2. Starting Current per IEC 60947-4-2:
 * I_start(α) = min( I_DOL * (Vrms / Vnom), CurrentLimitPct * FLA )
 * Example: FLA=269A, DOL=2152A (8*FLA), V_start=40% -> I_raw = 2152 * 0.40 = 860.8A (3.2x FLA).
 * Capped at e.g. 350% FLA = 941.5A, so 860.8A is drawn.
 */
export function calculateStartingCurrentAmps(vRmsPct, currentLimitPct = 350, flaAmps = FLA_RATED_AMPS) {
  const vRatio = Math.max(0, Math.min(1.0, vRmsPct / 100));
  const dolAmps = flaAmps * DOL_INRUSH_RATIO; // 2152A
  const iRaw = dolAmps * vRatio;
  const iCap = flaAmps * (currentLimitPct / 100);
  return Math.min(iRaw, iCap);
}

/**
 * 3. Electromagnetic Torque per IEC 60947-4-2:
 * Te = Te_DOL * (Vrms / Vnom)²
 * Example: If DOL torque = 150%, at V_start=40%, Te = 150% * (0.4)² = 24% rated torque.
 */
export function calculateStartingTorquePct(vRmsPct, dolTorquePct = DOL_START_TORQUE_PCT) {
  const vRatio = Math.max(0, Math.min(1.0, vRmsPct / 100));
  return dolTorquePct * Math.pow(vRatio, 2);
}

/**
 * Check Motor Stall Risk (Te < TL at initial breakaway pedestal)
 */
export function checkStallRisk(vStartPct, loadTorquePct = 20) {
  const teStartPct = calculateStartingTorquePct(vStartPct);
  const isStallRisk = teStartPct < loadTorquePct;
  return {
    isStallRisk,
    teStartPct,
    loadTorquePct,
    marginPct: teStartPct - loadTorquePct,
  };
}

/**
 * 4. Acceleration Voltage Ramp:
 * V(t) = V_start + (100% - V_start) * (t / RampTime) for 0 <= t < RampTime
 */
export function calculateRampVoltagePct(tSec, tRampSec = 15, vStartPct = 40) {
  if (tSec <= 0) return vStartPct;
  if (tSec >= tRampSec) return 100;
  return vStartPct + (100 - vStartPct) * (tSec / tRampSec);
}

/**
 * 5. Bypass Contactor KM1 Logic:
 * When speed >= 95% rated or ramp time completes, close KM1, SCRs OFF, V = 100%, alpha = 0 deg.
 */
export function checkBypassState(speedRpm, ratedRpm = 1480, tSec = 15, tRampSec = 15) {
  const speedRatio = speedRpm / ratedRpm;
  const isBypassed = speedRatio >= 0.95 || tSec >= tRampSec;
  return {
    isBypassed,
    voltagePct: isBypassed ? 100 : calculateRampVoltagePct(tSec, tRampSec),
    firingAngleDeg: isBypassed ? 0 : calculateAlphaDeg(calculateRampVoltagePct(tSec, tRampSec)),
  };
}

/**
 * 6. Preset Validation Helper for Industrial Applications (e.g. Borewell Pump)
 * Validates Borewell Pump: V_start 40%, Ramp 15s, Current Limit 300% -> I peak ~900A, Te ~24-25%
 */
export function validateBorewellPreset(vStartPct = 40, tRampSec = 15, currentLimitPct = 300) {
  const vStart = calculateRampVoltagePct(0, tRampSec, vStartPct);
  const iPeakAmps = calculateStartingCurrentAmps(vStart, currentLimitPct);
  const tePeakPct = calculateStartingTorquePct(vStart);
  const stall = checkStallRisk(vStartPct, 15);

  return {
    vStart,
    iPeakAmps, // ~860-900A
    tePeakPct, // ~24-25%
    isStallRisk: stall.isStallRisk,
    isValid: !stall.isStallRisk && iPeakAmps >= 700 && iPeakAmps <= 950,
  };
}
