/**
 * DCDCPhysics.js - High-Precision Analytical DC-DC Converter Physics Engine
 * 
 * Standards Reference & Analytical Physics Models:
 * - Buck Converter (CCM & DCM)
 * - Boost Converter (CCM & DCM)
 * - Buck-Boost Converter (CCM & DCM)
 * - SEPIC Converter (CCM & DCM)
 * - Detailed Loss Model (MOSFET Rds(on), Diode Vf, Inductor DCR, Capacitor ESR, Switching, Gate Charge, Core Loss)
 * - Load-Step Closed-Loop Transient Response
 */

/**
 * Helper to normalize duty cycle input (handles both 0-1 ratio and 10-90% percentage)
 */
export function normalizeDutyCycle(D) {
  if (D > 1.0) {
    return Math.max(0.01, Math.min(0.99, D / 100));
  }
  return Math.max(0.01, Math.min(0.99, D));
}

/**
 * Calculate Buck Converter Parameters (CCM & DCM)
 */
export function calculateBuck(params) {
  const Vin = Math.max(0.1, params.Vin ?? 48);
  const D = normalizeDutyCycle(params.D ?? 0.4);
  const f = Math.max(1000, params.f ?? 50000);
  const L = Math.max(1e-7, params.L ?? 180e-6);
  const C = Math.max(1e-7, params.C ?? 470e-6);
  const Rds = params.Rds ?? 0.01;
  const ESR = params.ESR ?? 0.01;
  const RDCR = params.RDCR ?? 0.015;
  const Vf = params.Vf ?? 0.70;
  const tr = params.tr ?? 15e-9;
  const tf = params.tf ?? 15e-9;
  const Qg = params.Qg ?? 30e-9;
  const Vg = params.Vg ?? 10;
  const k = params.k ?? 1e-4;
  const alpha = params.alpha ?? 1.6;
  const beta = params.beta ?? 2.5;
  const B = params.B ?? 0.1;

  // 1. Ideal CCM Output Voltage: Vout = Vin * D
  const Vout_ccm = Vin * D;

  // 2. Inductor Peak-to-Peak Ripple Current (CCM): ΔIL = (Vin - Vout) * D / (L * f)
  const deltaIL = ((Vin - Vout_ccm) * D) / (L * f);

  // 3. Critical Load Current for Boundary: Iout_crit = ΔIL / 2
  const Iout_crit = deltaIL / 2;

  let R = params.R;
  let Iout = params.Iout;

  if (R !== undefined && R > 0 && (Iout === undefined || Iout <= 0)) {
    Iout = Vout_ccm / R;
  } else if (Iout === undefined || Iout <= 0) {
    R = 10;
    Iout = Vout_ccm / R;
  } else if (R === undefined || R <= 0) {
    R = Math.max(0.1, Vout_ccm / Math.max(0.01, Iout));
  }

  // 4. CCM vs DCM Mode Determination
  const mode = Iout < Iout_crit ? 'DCM' : 'CCM';
  let Vout = Vout_ccm;

  if (mode === 'DCM') {
    // DCM Voltage Ratio: K = 2 * L * f / R
    const K = (2 * L * f) / R;
    Vout = Vin * (2 / (1 + Math.sqrt(1 + (4 * K) / (D * D))));
    Iout = Vout / R;
  }

  const IL_avg = Iout;

  // 5. Capacitor Output Voltage Ripple: ΔVout = ΔIL / (8 * f * C) + ΔIL * ESR
  const deltaVout_cap = deltaIL / (8 * f * C);
  const deltaVout_esr = deltaIL * ESR;
  const deltaVout = deltaVout_cap + deltaVout_esr;

  // 6. Detailed Semiconductor & Passives Loss Model
  const Pcond_mos = Math.pow(Iout, 2) * Rds * D;
  const Pcond_diode = Vf * Iout * (1 - D);
  const Pcond_dcr = Math.pow(Iout, 2) * RDCR;
  const Pcond_esr = Math.pow(deltaIL / Math.sqrt(12), 2) * ESR;
  const Psw = 0.5 * Vin * Iout * (tr + tf) * f;
  const Pgate = Qg * Vg * f;
  const Pcore = k * Math.pow(f, alpha) * Math.pow(B, beta);

  const Ploss = Pcond_mos + Pcond_diode + Pcond_dcr + Pcond_esr + Psw + Pgate + Pcore;
  const Pout = Vout * Iout;
  const eta = (Pout + Ploss) > 0 ? Pout / (Pout + Ploss) : 0;

  // 7. Load-Step Closed-Loop Transient Response
  const fc = f / 10; // Control loop bandwidth (Hz)
  const deltaIstep = 0.5 * Iout; // 50% step load change
  const Vdip = deltaIstep / (C * 2 * Math.PI * fc);
  const trecovery = 3 / fc;

  return {
    Vout,
    Iout,
    IL_avg,
    deltaIL,
    Iout_crit,
    mode,
    Ploss,
    Pout,
    eta,
    etaPct: eta * 100,
    deltaVout,
    deltaVout_cap,
    deltaVout_esr,
    Pcond_mos,
    Pcond_diode,
    Pcond_dcr,
    Pcond_esr,
    Psw,
    Pgate,
    Pcore,
    Vdip,
    trecovery,
  };
}

/**
 * Calculate Boost Converter Parameters (CCM & DCM)
 */
export function calculateBoost(params) {
  const Vin = Math.max(0.1, params.Vin ?? 24);
  const D = normalizeDutyCycle(params.D ?? 0.5);
  const f = Math.max(1000, params.f ?? 50000);
  const L = Math.max(1e-7, params.L ?? 180e-6);
  const C = Math.max(1e-7, params.C ?? 470e-6);
  const Rds = params.Rds ?? 0.01;
  const ESR = params.ESR ?? 0.01;
  const RDCR = params.RDCR ?? 0.015;
  const Vf = params.Vf ?? 0.70;
  const tr = params.tr ?? 15e-9;
  const tf = params.tf ?? 15e-9;
  const Qg = params.Qg ?? 30e-9;
  const Vg = params.Vg ?? 10;
  const k = params.k ?? 1e-4;
  const alpha = params.alpha ?? 1.6;
  const beta = params.beta ?? 2.5;
  const B = params.B ?? 0.1;

  // 1. Ideal CCM Output Voltage: Vout = Vin / (1 - D)
  const Vout_ccm = Vin / (1 - D);

  // 2. Inductor Peak-to-Peak Ripple Current: ΔIL = Vin * D / (L * f)
  const deltaIL = (Vin * D) / (L * f);

  // 3. Critical Load Current for Boundary: Iout_crit = Vin * D * (1-D)^2 / (2 * L * f)
  const Iout_crit = (Vin * D * Math.pow(1 - D, 2)) / (2 * L * f);

  let R = params.R;
  let Iout = params.Iout;

  if (R !== undefined && R > 0 && (Iout === undefined || Iout <= 0)) {
    Iout = Vout_ccm / R;
  } else if (Iout === undefined || Iout <= 0) {
    R = 20;
    Iout = Vout_ccm / R;
  } else if (R === undefined || R <= 0) {
    R = Math.max(0.1, Vout_ccm / Math.max(0.01, Iout));
  }

  const mode = Iout < Iout_crit ? 'DCM' : 'CCM';
  let Vout = Vout_ccm;

  if (mode === 'DCM') {
    const K = (2 * L * f) / R;
    Vout = Vin * ((1 + Math.sqrt(1 + (4 * D * D) / K)) / 2);
    Iout = Vout / R;
  }

  const IL_avg = Iout / (1 - D);

  // Output Ripple for Boost: ΔVout = Iout * D / (C * f) + ΔIL * ESR
  const deltaVout_cap = (Iout * D) / (C * f);
  const deltaVout_esr = deltaIL * ESR;
  const deltaVout = deltaVout_cap + deltaVout_esr;

  // Detailed Losses
  const Pcond_mos = Math.pow(IL_avg, 2) * Rds * D;
  const Pcond_diode = Vf * Iout;
  const Pcond_dcr = Math.pow(IL_avg, 2) * RDCR;
  const Pcond_esr = Math.pow(deltaIL / Math.sqrt(12), 2) * ESR;
  const Psw = 0.5 * Vout * IL_avg * (tr + tf) * f;
  const Pgate = Qg * Vg * f;
  const Pcore = k * Math.pow(f, alpha) * Math.pow(B, beta);

  const Ploss = Pcond_mos + Pcond_diode + Pcond_dcr + Pcond_esr + Psw + Pgate + Pcore;
  const Pout = Vout * Iout;
  const eta = (Pout + Ploss) > 0 ? Pout / (Pout + Ploss) : 0;

  const fc = f / 10;
  const deltaIstep = 0.5 * Iout;
  const Vdip = deltaIstep / (C * 2 * Math.PI * fc);
  const trecovery = 3 / fc;

  return {
    Vout,
    Iout,
    IL_avg,
    deltaIL,
    Iout_crit,
    mode,
    Ploss,
    Pout,
    eta,
    etaPct: eta * 100,
    deltaVout,
    deltaVout_cap,
    deltaVout_esr,
    Pcond_mos,
    Pcond_diode,
    Pcond_dcr,
    Pcond_esr,
    Psw,
    Pgate,
    Pcore,
    Vdip,
    trecovery,
  };
}

/**
 * Calculate Buck-Boost Converter Parameters (CCM & DCM)
 */
export function calculateBuckBoost(params) {
  const Vin = Math.max(0.1, params.Vin ?? 24);
  const D = normalizeDutyCycle(params.D ?? 0.5);
  const f = Math.max(1000, params.f ?? 50000);
  const L = Math.max(1e-7, params.L ?? 180e-6);
  const C = Math.max(1e-7, params.C ?? 470e-6);
  const Rds = params.Rds ?? 0.01;
  const ESR = params.ESR ?? 0.01;
  const RDCR = params.RDCR ?? 0.015;
  const Vf = params.Vf ?? 0.70;
  const tr = params.tr ?? 15e-9;
  const tf = params.tf ?? 15e-9;
  const Qg = params.Qg ?? 30e-9;
  const Vg = params.Vg ?? 10;
  const k = params.k ?? 1e-4;
  const alpha = params.alpha ?? 1.6;
  const beta = params.beta ?? 2.5;
  const B = params.B ?? 0.1;

  // 1. Ideal CCM Output Voltage: Vout = -Vin * D / (1 - D)
  const Vout_ccm = (-Vin * D) / (1 - D);
  const Vout_abs_ccm = Math.abs(Vout_ccm);

  // 2. Inductor Peak-to-Peak Ripple Current: ΔIL = Vin * D / (L * f)
  const deltaIL = (Vin * D) / (L * f);

  // 3. Critical Load Current for Boundary: Iout_crit = Vin * D * (1-D) / (2 * L * f)
  const Iout_crit = (Vin * D * (1 - D)) / (2 * L * f);

  let R = params.R;
  let Iout = params.Iout;

  if (R !== undefined && R > 0 && (Iout === undefined || Iout <= 0)) {
    Iout = Vout_abs_ccm / R;
  } else if (Iout === undefined || Iout <= 0) {
    R = 20;
    Iout = Vout_abs_ccm / R;
  } else if (R === undefined || R <= 0) {
    R = Math.max(0.1, Vout_abs_ccm / Math.max(0.01, Iout));
  }

  const mode = Iout < Iout_crit ? 'DCM' : 'CCM';
  let Vout = Vout_ccm;

  if (mode === 'DCM') {
    const K = (2 * L * f) / R;
    Vout = (-Vin * D) / Math.sqrt(K);
    Iout = Math.abs(Vout) / R;
  }

  const IL_avg = Iout / (1 - D);

  const deltaVout_cap = (Iout * D) / (C * f);
  const deltaVout_esr = deltaIL * ESR;
  const deltaVout = deltaVout_cap + deltaVout_esr;

  const Pcond_mos = Math.pow(IL_avg, 2) * Rds * D;
  const Pcond_diode = Vf * Iout;
  const Pcond_dcr = Math.pow(IL_avg, 2) * RDCR;
  const Pcond_esr = Math.pow(deltaIL / Math.sqrt(12), 2) * ESR;
  const Psw = 0.5 * (Vin + Math.abs(Vout)) * IL_avg * (tr + tf) * f;
  const Pgate = Qg * Vg * f;
  const Pcore = k * Math.pow(f, alpha) * Math.pow(B, beta);

  const Ploss = Pcond_mos + Pcond_diode + Pcond_dcr + Pcond_esr + Psw + Pgate + Pcore;
  const Pout = Math.abs(Vout) * Iout;
  const eta = (Pout + Ploss) > 0 ? Pout / (Pout + Ploss) : 0;

  const fc = f / 10;
  const deltaIstep = 0.5 * Iout;
  const Vdip = deltaIstep / (C * 2 * Math.PI * fc);
  const trecovery = 3 / fc;

  return {
    Vout,
    Iout,
    IL_avg,
    deltaIL,
    Iout_crit,
    mode,
    Ploss,
    Pout,
    eta,
    etaPct: eta * 100,
    deltaVout,
    deltaVout_cap,
    deltaVout_esr,
    Pcond_mos,
    Pcond_diode,
    Pcond_dcr,
    Pcond_esr,
    Psw,
    Pgate,
    Pcore,
    Vdip,
    trecovery,
  };
}

/**
 * Calculate SEPIC Converter Parameters (CCM & DCM)
 */
export function calculateSEPIC(params) {
  const Vin = Math.max(0.1, params.Vin ?? 48);
  const D = normalizeDutyCycle(params.D ?? 0.4);
  const f = Math.max(1000, params.f ?? 50000);
  const L = Math.max(1e-7, params.L ?? 180e-6);
  const C = Math.max(1e-7, params.C ?? 470e-6);
  const Rds = params.Rds ?? 0.01;
  const ESR = params.ESR ?? 0.01;
  const RDCR = params.RDCR ?? 0.015;
  const Vf = params.Vf ?? 0.70;
  const tr = params.tr ?? 15e-9;
  const tf = params.tf ?? 15e-9;
  const Qg = params.Qg ?? 30e-9;
  const Vg = params.Vg ?? 10;
  const k = params.k ?? 1e-4;
  const alpha = params.alpha ?? 1.6;
  const beta = params.beta ?? 2.5;
  const B = params.B ?? 0.1;

  // 1. Ideal CCM Output Voltage: Vout = Vin * D / (1 - D)
  const Vout_ccm = (Vin * D) / (1 - D);

  // 2. Inductor L1 Ripple Current: ΔIL1 = Vin * D / (L * f)
  const deltaIL = (Vin * D) / (L * f);

  // 3. Critical Load Current
  const Iout_crit = (Vin * D * (1 - D)) / (2 * L * f);

  let R = params.R;
  let Iout = params.Iout;

  if (R !== undefined && R > 0 && (Iout === undefined || Iout <= 0)) {
    Iout = Vout_ccm / R;
  } else if (Iout === undefined || Iout <= 0) {
    R = 10;
    Iout = Vout_ccm / R;
  } else if (R === undefined || R <= 0) {
    R = Math.max(0.1, Vout_ccm / Math.max(0.01, Iout));
  }

  const mode = Iout < Iout_crit ? 'DCM' : 'CCM';
  let Vout = Vout_ccm;

  if (mode === 'DCM') {
    const K = (2 * L * f) / R;
    Vout = (Vin * D) / Math.sqrt(K);
    Iout = Vout / R;
  }

  const IL_avg = Iout / (1 - D);

  const deltaVout_cap = (Iout * D) / (C * f);
  const deltaVout_esr = deltaIL * ESR;
  const deltaVout = deltaVout_cap + deltaVout_esr;

  const Pcond_mos = Math.pow(IL_avg, 2) * Rds * D;
  const Pcond_diode = Vf * Iout;
  const Pcond_dcr = Math.pow(IL_avg, 2) * RDCR;
  const Pcond_esr = Math.pow(deltaIL / Math.sqrt(12), 2) * ESR;
  const Psw = 0.5 * (Vin + Vout) * IL_avg * (tr + tf) * f;
  const Pgate = Qg * Vg * f;
  const Pcore = k * Math.pow(f, alpha) * Math.pow(B, beta);

  const Ploss = Pcond_mos + Pcond_diode + Pcond_dcr + Pcond_esr + Psw + Pgate + Pcore;
  const Pout = Vout * Iout;
  const eta = (Pout + Ploss) > 0 ? Pout / (Pout + Ploss) : 0;

  const fc = f / 10;
  const deltaIstep = 0.5 * Iout;
  const Vdip = deltaIstep / (C * 2 * Math.PI * fc);
  const trecovery = 3 / fc;

  return {
    Vout,
    Iout,
    IL_avg,
    deltaIL,
    Iout_crit,
    mode,
    Ploss,
    Pout,
    eta,
    etaPct: eta * 100,
    deltaVout,
    deltaVout_cap,
    deltaVout_esr,
    Pcond_mos,
    Pcond_diode,
    Pcond_dcr,
    Pcond_esr,
    Psw,
    Pgate,
    Pcore,
    Vdip,
    trecovery,
  };
}

/**
 * Calculate Efficiency vs Load Current Curve
 */
export function calculateEfficiencyMap(topology, baseParams, minIout = 0.5, maxIout = 10, steps = 6) {
  const map = [];
  const stepSize = (maxIout - minIout) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const currentIout = Number((minIout + i * stepSize).toFixed(2));
    const calcParams = { ...baseParams, Iout: currentIout, R: undefined };

    let res;
    if (topology === 'boost') res = calculateBoost(calcParams);
    else if (topology === 'buckboost') res = calculateBuckBoost(calcParams);
    else if (topology === 'sepic') res = calculateSEPIC(calcParams);
    else res = calculateBuck(calcParams);

    map.push({
      Iout: currentIout,
      etaPct: Number(res.etaPct.toFixed(1)),
      Pout: Number(res.Pout.toFixed(1)),
      Ploss: Number(res.Ploss.toFixed(2)),
      mode: res.mode,
    });
  }

  return map;
}
