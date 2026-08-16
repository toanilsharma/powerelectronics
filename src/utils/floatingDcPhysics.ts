/**
 * IEEE 946 / IEC 60364-7-710 / IS 1255 Standard Floating (Ungrounded) DC Power System Physics Engine
 * 
 * In an ungrounded DC system (110V DC or 220V DC), neither pole (+ or -) is solidly earthed.
 * Under healthy conditions (symmetrical insulation resistance R_iso+ = R_iso- ≈ 100kΩ):
 *   - Positive to Earth potential: V_L+ = +V_DC / 2 (e.g. +55V for 110V bus, +110V for 220V bus)
 *   - Negative to Earth potential: V_L- = -V_DC / 2 (e.g. -55V for 110V bus, -110V for 220V bus)
 *   - Leakage Current to Earth: I_g ≈ 0 mA
 * 
 * Under First Earth Fault (+VE Ground Fault R_g+ → 0Ω):
 *   - V_L+ collapses to 0V
 *   - V_L- shifts to -V_DC (-110V or -220V)
 *   - Total DC bus voltage V_DC = V_L+ - V_L- = 220V is maintained across loads (no outage!)
 *   - Earth Fault Monitoring Relay (ANSI 64 / 89G) detects voltage asymmetry & triggers alarm.
 * 
 * Under Negative Earth Fault (-VE Ground Fault R_g- → 0Ω):
 *   - V_L- collapses to 0V
 *   - V_L+ shifts to +V_DC (+110V or +220V)
 *   - ANSI 64 / 89G relay detects negative rail earth fault & triggers alarm.
 */

export interface FloatingDCEarthPhysics {
  vDcTotal: number;
  vPosToEarth: number; // V_L+ (e.g. +110V in 220V system under normal)
  vNegToEarth: number; // V_L- (e.g. -110V in 220V system under normal)
  leakageCurrentMa: number; // I_g in mA
  insulationKohm: number; // R_iso in kOhm
  faultState: 'NORMAL' | 'FAULT_POS' | 'FAULT_NEG' | 'DOUBLE_FAULT_TRIP';
  statusText: string;
}

export function computeFloatingDCEarthPhysics(
  vDc: number,
  isPosFault: boolean = false,
  isNegFault: boolean = false,
  rFaultKohm: number = 0
): FloatingDCEarthPhysics {
  if (vDc <= 5) {
    return {
      vDcTotal: 0,
      vPosToEarth: 0,
      vNegToEarth: 0,
      leakageCurrentMa: 0,
      insulationKohm: 999,
      faultState: 'NORMAL',
      statusText: 'DE-ENERGIZED (0V)',
    };
  }

  const rNormalKohm = 100; // Normal healthy insulation to earth per pole (100 kOhm)

  if (isPosFault && isNegFault) {
    // Double Earth Fault: Bolted short circuit across bus via ground!
    const rFaultPos = Math.max(0.01, rFaultKohm);
    const rFaultNeg = Math.max(0.01, rFaultKohm);
    const totalR = rFaultPos + rFaultNeg;
    const leakageMa = (vDc / totalR);

    return {
      vDcTotal: vDc,
      vPosToEarth: Number((vDc * (rFaultPos / totalR)).toFixed(1)),
      vNegToEarth: Number((-vDc * (rFaultNeg / totalR)).toFixed(1)),
      leakageCurrentMa: Number(leakageMa.toFixed(1)),
      insulationKohm: Number(totalR.toFixed(1)),
      faultState: 'DOUBLE_FAULT_TRIP',
      statusText: '🔥 DOUBLE EARTH FAULT TRIP (SHORT CIRCUIT)',
    };
  }

  if (isPosFault) {
    // Positive Rail Earth Fault
    const rPos = Math.max(0.01, rFaultKohm);
    const rNeg = rNormalKohm;
    const totalR = rPos + rNeg;

    const vPos = vDc * (rPos / totalR);
    const vNeg = -vDc * (rNeg / totalR);
    const leakageMa = (vDc / totalR);

    return {
      vDcTotal: vDc,
      vPosToEarth: Number(vPos.toFixed(1)),
      vNegToEarth: Number(vNeg.toFixed(1)),
      leakageCurrentMa: Number(leakageMa.toFixed(1)),
      insulationKohm: Number(rPos.toFixed(1)),
      faultState: 'FAULT_POS',
      statusText: `🚨 POSITIVE (+VE) EARTH FAULT (R_iso=${rPos.toFixed(1)}kΩ)`,
    };
  }

  if (isNegFault) {
    // Negative Rail Earth Fault
    const rPos = rNormalKohm;
    const rNeg = Math.max(0.01, rFaultKohm);
    const totalR = rPos + rNeg;

    const vPos = vDc * (rPos / totalR);
    const vNeg = -vDc * (rNeg / totalR);
    const leakageMa = (vDc / totalR);

    return {
      vDcTotal: vDc,
      vPosToEarth: Number(vPos.toFixed(1)),
      vNegToEarth: Number(vNeg.toFixed(1)),
      leakageCurrentMa: Number(leakageMa.toFixed(1)),
      insulationKohm: Number(rNeg.toFixed(1)),
      faultState: 'FAULT_NEG',
      statusText: `🚨 NEGATIVE (-VE) EARTH FAULT (R_iso=${rNeg.toFixed(1)}kΩ)`,
    };
  }

  // Normal Healthy Floating DC System
  const vPos = vDc / 2;
  const vNeg = -vDc / 2;

  return {
    vDcTotal: vDc,
    vPosToEarth: Number(vPos.toFixed(1)),
    vNegToEarth: Number(vNeg.toFixed(1)),
    leakageCurrentMa: 0.0,
    insulationKohm: 100.0,
    faultState: 'NORMAL',
    statusText: 'FLOATING DC NOMINAL (SYMMETRICAL INSULATION)',
  };
}
