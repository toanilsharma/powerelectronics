/**
 * PowerQualityEngine.ts
 * 
 * High-performance, IEEE 519-2022 and ANSI C57.110 compliant Power Quality Physics & Calculation Engine.
 * Provides IEEE 519-2022 Table 2 current distortion analysis, THD vs TDD calculation,
 * ANSI C57.110 K-Factor evaluation, non-linear load Fourier waveform synthesis, and
 * Active Power Filter (APF) harmonic compensation logic.
 */

/**
 * Supported Non-Linear Load Types for Harmonic Generation
 */
export type LoadType =
  | '6-Pulse'
  | '12-Pulse'
  | 'VFD'
  | 'SMPS'
  | '6_PULSE_SCR'
  | '12_PULSE'
  | 'VFD_LOAD'
  | 'SMPS_LOAD';

/**
 * Single Harmonic Component
 */
export interface HarmonicComponent {
  /** Harmonic order h (1 = fundamental, 2, 3, 5, 7, ..., 50) */
  order: number;
  /** Magnitude of current at order h (in Amperes or per-unit) */
  magnitude: number;
  /** Phase angle in radians (default 0) */
  phase?: number;
}

/**
 * Individual Harmonic Compliance Result Detail
 */
export interface HarmonicComplianceDetail {
  order: number;
  magnitude: number;
  percentOfIL: number;
  percentOfI1: number;
  limit: number;
  isEven: boolean;
  isCompliant: boolean;
}

/**
 * Overall IEEE 519-2022 Compliance Analysis Result
 */
export interface IEEE519ComplianceResult {
  isCompliant: boolean;
  isc: number;
  il: number;
  i1: number;
  ratioIscIl: number;
  thdPercent: number;
  tddPercent: number;
  tddLimitPercent: number;
  details: HarmonicComplianceDetail[];
  failingHarmonics: number[];
  summary: string;
}

/**
 * Instantaneous Waveform Sample Point
 */
export interface WaveformPoint {
  time: number;
  angleDeg: number;
  loadCurrent: number;
  apfCurrent: number;
  sourceCurrent: number;
}

/**
 * Active Power Filter Simulation Result
 */
export interface APFSimulationResult {
  apfEnabled: boolean;
  loadCurrentRms: number;
  sourceCurrentRms: number;
  loadTHDPercent: number;
  sourceTHDPercent: number;
  loadTDDPercent: number;
  sourceTDDPercent: number;
  loadKFactor: number;
  sourceKFactor: number;
  loadCompliance: IEEE519ComplianceResult;
  sourceCompliance: IEEE519ComplianceResult;
  compensationPercent: number;
}

/**
 * IEEE 519-2022 Table 2 Limit Structure for Current Distortion
 */
interface IEEE519LimitTier {
  maxRatio: number; // Upper bound of Isc / IL
  label: string;
  tddLimit: number;
  // Odd harmonic limits (% of IL) by order band
  limits: {
    hLt11: number;       // h < 11
    h11To16: number;     // 11 <= h < 17
    h17To22: number;     // 17 <= h < 23
    h23To34: number;     // 23 <= h < 35
    h35AndAbove: number; // 35 <= h <= 50
  };
}

// Table 2: Current distortion limits for systems rated 120 V through 69 kV
const IEEE_519_2022_TABLE_2: IEEE519LimitTier[] = [
  {
    maxRatio: 20,
    label: '< 20',
    tddLimit: 5.0,
    limits: { hLt11: 4.0, h11To16: 2.0, h17To22: 1.5, h23To34: 0.6, h35AndAbove: 0.3 },
  },
  {
    maxRatio: 50,
    label: '20 < 50',
    tddLimit: 8.0,
    limits: { hLt11: 7.0, h11To16: 3.5, h17To22: 2.5, h23To34: 1.0, h35AndAbove: 0.5 },
  },
  {
    maxRatio: 100,
    label: '50 < 100',
    tddLimit: 12.0,
    limits: { hLt11: 10.0, h11To16: 4.5, h17To22: 4.0, h23To34: 1.5, h35AndAbove: 0.7 },
  },
  {
    maxRatio: 1000,
    label: '100 < 1000',
    tddLimit: 15.0,
    limits: { hLt11: 12.0, h11To16: 5.5, h17To22: 5.0, h23To34: 2.0, h35AndAbove: 1.0 },
  },
  {
    maxRatio: Infinity,
    label: '>= 1000',
    tddLimit: 20.0,
    limits: { hLt11: 15.0, h11To16: 7.0, h17To22: 6.0, h23To34: 2.5, h35AndAbove: 1.4 },
  },
];

/**
 * Dedicated Power Quality Engine Class
 */
export class PowerQualityEngine {
  private isc: number;
  private il: number;
  private frequencyHz: number;

  /**
   * Initialize Engine with system Short Circuit Current (Isc) and Max Demand Load Current (IL)
   * @param isc Short Circuit Current (Amps RMS) at PCC
   * @param il Maximum Demand Load Current (Amps RMS) at PCC
   * @param frequencyHz System fundamental frequency in Hz (default 50 Hz)
   */
  constructor(isc: number = 1000, il: number = 100, frequencyHz: number = 50) {
    this.isc = Math.max(0.1, isc);
    this.il = Math.max(0.1, il);
    this.frequencyHz = frequencyHz;
  }

  // =========================================================================
  // 1. THD & TDD CALCULATIONS
  // =========================================================================

  /**
   * Calculates Total Harmonic Distortion (THD) of current.
   * THD = sqrt(sum(Ih^2 for h=2..N)) / I1
   * 
   * @param harmonics Spectrum array of harmonic components or raw magnitude array
   * @param i1 Fundamental current magnitude (Amps). If omitted, extracted from order 1 component.
   * @returns THD expressed as a percentage (%)
   */
  public static calculateTHD(harmonics: HarmonicComponent[] | number[], i1?: number): number {
    const normalized = PowerQualityEngine.normalizeSpectrumInput(harmonics);
    const fundamental = i1 ?? normalized.get(1) ?? 0;

    if (fundamental <= 0) return 0;

    let sumSqHarmonics = 0;
    for (const [order, mag] of normalized.entries()) {
      if (order >= 2) {
        sumSqHarmonics += mag * mag;
      }
    }

    return (Math.sqrt(sumSqHarmonics) / fundamental) * 100;
  }

  /**
   * Calculates Total Demand Distortion (TDD) of current.
   * TDD = sqrt(sum(Ih^2 for h=2..N)) / IL (Max Demand Load Current)
   * 
   * @param harmonics Spectrum array of harmonic components or raw magnitude array
   * @param il Maximum Demand Load Current (Amps RMS)
   * @returns TDD expressed as a percentage (%)
   */
  public static calculateTDD(harmonics: HarmonicComponent[] | number[], il: number): number {
    if (il <= 0) return 0;

    const normalized = PowerQualityEngine.normalizeSpectrumInput(harmonics);

    let sumSqHarmonics = 0;
    for (const [order, mag] of normalized.entries()) {
      if (order >= 2) {
        sumSqHarmonics += mag * mag;
      }
    }

    return (Math.sqrt(sumSqHarmonics) / il) * 100;
  }

  // =========================================================================
  // 2. ANSI C57.110 K-FACTOR CALCULATION
  // =========================================================================

  /**
   * Calculates ANSI C57.110 K-Factor for transformer derating under non-linear loads.
   * K = sum(Ih_pu^2 * h^2) where Ih_pu = Ih / Irms_total
   * 
   * @param harmonics Spectrum array of harmonic components or raw magnitude array
   * @returns Calculated K-Factor (dimensionless, >= 1.0)
   */
  public static calculateKFactor(harmonics: HarmonicComponent[] | number[]): number {
    const normalized = PowerQualityEngine.normalizeSpectrumInput(harmonics);

    let totalSquareCurrent = 0;
    for (const mag of normalized.values()) {
      totalSquareCurrent += mag * mag;
    }

    if (totalSquareCurrent <= 0) return 1.0;

    let kSum = 0;
    for (const [order, mag] of normalized.entries()) {
      if (order >= 1) {
        const ihPu = mag / Math.sqrt(totalSquareCurrent);
        kSum += ihPu * ihPu * (order * order);
      }
    }

    return Math.max(1.0, kSum);
  }

  /**
   * Returns recommended standard Transformer K-Rating based on calculated K-Factor.
   */
  public static getRecommendedKRating(kFactor: number): 'K-1' | 'K-4' | 'K-9' | 'K-13' | 'K-20' | 'K-30' {
    if (kFactor <= 1.1) return 'K-1';
    if (kFactor <= 4.0) return 'K-4';
    if (kFactor <= 9.0) return 'K-9';
    if (kFactor <= 13.0) return 'K-13';
    if (kFactor <= 20.0) return 'K-20';
    return 'K-30';
  }

  // =========================================================================
  // 3. IEEE 519-2022 COMPLIANCE CHECK (TABLE 2)
  // =========================================================================

  /**
   * Evaluates current distortion compliance against IEEE 519-2022 Table 2 limits.
   * 
   * CRUCIAL IEEE 519 RULE:
   * - Total distortion limit checks Total Demand Distortion (TDD = sqrt(sum(Ih^2)) / IL).
   * - Individual harmonic limits are evaluated as percentage of Max Demand Load Current IL (% of IL).
   * - Even harmonics are limited to 25% of the odd harmonic limits.
   * 
   * @param isc Short Circuit Current at Point of Common Coupling (PCC) in Amps
   * @param il Maximum Demand Load Current (fundamental component under max load) in Amps
   * @param harmonics Array of harmonic components or magnitude array
   * @param i1 Fundamental current magnitude (Amps). Default derived from order 1 component or il.
   */
  public static checkIEEE519Compliance(
    isc: number,
    il: number,
    harmonics: HarmonicComponent[] | number[],
    i1?: number
  ): IEEE519ComplianceResult {
    const validIsc = Math.max(0.1, isc);
    const validIl = Math.max(0.1, il);
    const ratioIscIl = validIsc / validIl;

    // 1. Determine Tier Row in Table 2
    const tier = IEEE_519_2022_TABLE_2.find((t) => ratioIscIl < t.maxRatio) ?? IEEE_519_2022_TABLE_2[IEEE_519_2022_TABLE_2.length - 1];

    const normalized = PowerQualityEngine.normalizeSpectrumInput(harmonics);
    const fundamentalVal = i1 ?? normalized.get(1) ?? validIl;

    // 2. Calculate THD and TDD
    const thdPercent = PowerQualityEngine.calculateTHD(harmonics, fundamentalVal);
    const tddPercent = PowerQualityEngine.calculateTDD(harmonics, validIl);
    const tddLimitPercent = tier.tddLimit;

    // 3. Evaluate Individual Harmonics (h = 2 .. 50)
    const details: HarmonicComplianceDetail[] = [];
    const failingHarmonics: number[] = [];

    let isIndividualCompliant = true;

    for (const [order, mag] of normalized.entries()) {
      if (order < 2 || order > 50) continue;

      const isEven = order % 2 === 0;

      // Base odd harmonic limit (% of IL)
      let baseLimit = tier.limits.h35AndAbove;
      if (order < 11) baseLimit = tier.limits.hLt11;
      else if (order < 17) baseLimit = tier.limits.h11To16;
      else if (order < 23) baseLimit = tier.limits.h17To22;
      else if (order < 35) baseLimit = tier.limits.h23To34;

      // IEEE 519 Note 1: Even harmonics limited to 25% of odd harmonic limits
      const limit = isEven ? baseLimit * 0.25 : baseLimit;

      // Calculate % of IL and % of I1
      const percentOfIL = (mag / validIl) * 100;
      const percentOfI1 = fundamentalVal > 0 ? (mag / fundamentalVal) * 100 : 0;

      const isPass = percentOfIL <= limit + 1e-6;

      if (!isPass) {
        isIndividualCompliant = false;
        failingHarmonics.push(order);
      }

      details.push({
        order,
        magnitude: mag,
        percentOfIL: +percentOfIL.toFixed(3),
        percentOfI1: +percentOfI1.toFixed(3),
        limit: +limit.toFixed(3),
        isEven,
        isCompliant: isPass,
      });
    }

    // Sort details by harmonic order
    details.sort((a, b) => a.order - b.order);

    const isTddCompliant = tddPercent <= tddLimitPercent + 1e-6;
    const isOverallCompliant = isTddCompliant && isIndividualCompliant;

    // Construct readable summary string
    let summary = `IEEE 519-2022 Compliance Status: ${isOverallCompliant ? 'PASS' : 'FAIL'}. `;
    summary += `Isc/IL Ratio: ${ratioIscIl.toFixed(1)} (${tier.label}). `;
    summary += `TDD: ${tddPercent.toFixed(2)}% (Limit: ${tddLimitPercent.toFixed(1)}%) -> ${isTddCompliant ? 'PASS' : 'FAIL'}. `;
    if (!isIndividualCompliant) {
      summary += `Failing Harmonic Orders: [${failingHarmonics.join(', ')}].`;
    } else {
      summary += `All individual harmonic limits (% of IL) passed.`;
    }

    return {
      isCompliant: isOverallCompliant,
      isc: validIsc,
      il: validIl,
      i1: fundamentalVal,
      ratioIscIl: +ratioIscIl.toFixed(2),
      thdPercent: +thdPercent.toFixed(2),
      tddPercent: +tddPercent.toFixed(2),
      tddLimitPercent,
      details,
      failingHarmonics,
      summary,
    };
  }

  // =========================================================================
  // 4. HARMONIC SPECTRUM & WAVEFORM SYNTHESIS
  // =========================================================================

  /**
   * Generates theoretical/typical harmonic spectrum for standard non-linear load types.
   * 
   * @param loadType Load type ('6-Pulse', '12-Pulse', 'VFD', 'SMPS')
   * @param fundamentalAmp Fundamental current magnitude I1 (default 100A)
   */
  public static getHarmonicSpectrum(loadType: LoadType, fundamentalAmp: number = 100): HarmonicComponent[] {
    const canonicalType = PowerQualityEngine.normalizeLoadType(loadType);
    const spectrum: HarmonicComponent[] = [];

    // Fundamental (order 1)
    spectrum.push({ order: 1, magnitude: fundamentalAmp, phase: 0 });

    switch (canonicalType) {
      case '6-Pulse': {
        // 6-pulse characteristic harmonics: h = 6k +/- 1 (5, 7, 11, 13, 17, 19, 23, 25, 29, 31, 35, 37, 41, 43, 47, 49)
        // Theoretical magnitude = I1 / h
        for (let k = 1; k <= 8; k++) {
          const hMinus = 6 * k - 1;
          const hPlus = 6 * k + 1;

          if (hMinus <= 50) {
            // 5, 11, 17, 23... have phase pi
            spectrum.push({
              order: hMinus,
              magnitude: fundamentalAmp / hMinus,
              phase: Math.PI,
            });
          }
          if (hPlus <= 50) {
            // 7, 13, 19, 25... have phase 0
            spectrum.push({
              order: hPlus,
              magnitude: fundamentalAmp / hPlus,
              phase: 0,
            });
          }
        }
        break;
      }

      case '12-Pulse': {
        // 12-pulse characteristic harmonics: h = 12k +/- 1 (11, 13, 23, 25, 35, 37, 47, 49)
        // 5th, 7th, 17th, 19th are cancelled out by 30° transformer phase shift
        for (let k = 1; k <= 4; k++) {
          const hMinus = 12 * k - 1;
          const hPlus = 12 * k + 1;

          if (hMinus <= 50) {
            spectrum.push({
              order: hMinus,
              magnitude: fundamentalAmp / hMinus,
              phase: Math.PI,
            });
          }
          if (hPlus <= 50) {
            spectrum.push({
              order: hPlus,
              magnitude: fundamentalAmp / hPlus,
              phase: 0,
            });
          }
        }
        break;
      }

      case 'VFD': {
        // Typical AC Variable Frequency Drive (6-pulse diode front end with DC link inductor)
        const vfdProfiles: { h: number; pct: number; phase: number }[] = [
          { h: 5, pct: 38.0, phase: Math.PI },
          { h: 7, pct: 14.5, phase: 0 },
          { h: 11, pct: 8.4, phase: Math.PI },
          { h: 13, pct: 5.6, phase: 0 },
          { h: 17, pct: 3.4, phase: Math.PI },
          { h: 19, pct: 2.2, phase: 0 },
          { h: 23, pct: 1.5, phase: Math.PI },
          { h: 25, pct: 1.1, phase: 0 },
        ];

        for (const item of vfdProfiles) {
          spectrum.push({
            order: item.h,
            magnitude: (fundamentalAmp * item.pct) / 100,
            phase: item.phase,
          });
        }
        break;
      }

      case 'SMPS': {
        // Single-phase Switch-Mode Power Supply / IT Load (high triplen + odd harmonics)
        const smpsProfiles: { h: number; pct: number; phase: number }[] = [
          { h: 3, pct: 75.0, phase: Math.PI },
          { h: 5, pct: 48.0, phase: 0 },
          { h: 7, pct: 26.0, phase: Math.PI },
          { h: 9, pct: 13.0, phase: 0 },
          { h: 11, pct: 7.0, phase: Math.PI },
          { h: 13, pct: 4.0, phase: 0 },
          { h: 15, pct: 2.5, phase: Math.PI },
        ];

        for (const item of smpsProfiles) {
          spectrum.push({
            order: item.h,
            magnitude: (fundamentalAmp * item.pct) / 100,
            phase: item.phase,
          });
        }
        break;
      }
    }

    return spectrum;
  }

  /**
   * Generates instantaneous current waveform sample i(t) at time `time` (seconds)
   * using Fourier series synthesis:
   * i(t) = sum(Ih * sin(h * wt + phase_h))
   * 
   * If apfEnabled is true, subtracts all harmonic content (h >= 2) from the load current to return source current.
   * 
   * @param loadType Load type ('6-Pulse', '12-Pulse', 'VFD', 'SMPS') OR custom HarmonicComponent[] spectrum
   * @param time Time timestamp t in seconds
   * @param frequencyHz System fundamental frequency in Hz (default 50 Hz)
   * @param apfEnabled Active Power Filter flag. If true, subtracts harmonic content from load current.
   * @returns Instantaneous current i(t) in Amperes
   */
  public static generateWaveform(
    loadType: LoadType | HarmonicComponent[],
    time: number,
    frequencyHz: number = 50,
    apfEnabled: boolean = false
  ): number {
    const spectrum = typeof loadType === 'string' ? PowerQualityEngine.getHarmonicSpectrum(loadType) : loadType;
    const omega = 2 * Math.PI * frequencyHz;

    let instantaneousCurrent = 0;

    for (const comp of spectrum) {
      const h = comp.order;
      const mag = comp.magnitude;
      const phase = comp.phase ?? 0;

      // APF logic: If APF is enabled, subtract harmonic content (h >= 2)
      if (apfEnabled && h >= 2) {
        continue; // Harmonic is canceled by APF
      }

      instantaneousCurrent += mag * Math.sin(h * omega * time + phase);
    }

    return instantaneousCurrent;
  }

  /**
   * Generates time-domain waveform series over N cycles for visualization / charting.
   */
  public static generateWaveformSeries(params: {
    loadType: LoadType | HarmonicComponent[];
    cycles?: number;
    pointsPerCycle?: number;
    frequencyHz?: number;
    apfEnabled?: boolean;
  }): WaveformPoint[] {
    const {
      loadType,
      cycles = 2,
      pointsPerCycle = 100,
      frequencyHz = 50,
      apfEnabled = true,
    } = params;

    const spectrum = typeof loadType === 'string' ? PowerQualityEngine.getHarmonicSpectrum(loadType) : loadType;
    const period = 1 / frequencyHz;
    const totalPoints = cycles * pointsPerCycle;
    const dt = (cycles * period) / totalPoints;
    const omega = 2 * Math.PI * frequencyHz;

    const points: WaveformPoint[] = [];

    for (let i = 0; i <= totalPoints; i++) {
      const t = i * dt;
      const angleDeg = ((omega * t * 180) / Math.PI) % 360;

      let iLoad = 0;
      let iHarmonics = 0;

      for (const comp of spectrum) {
        const h = comp.order;
        const mag = comp.magnitude;
        const phase = comp.phase ?? 0;

        const val = mag * Math.sin(h * omega * t + phase);
        iLoad += val;

        if (h >= 2) {
          iHarmonics += val;
        }
      }

      // APF compensates for harmonics
      const iApf = apfEnabled ? -iHarmonics : 0;
      const iSource = iLoad + iApf;

      points.push({
        time: +t.toFixed(6),
        angleDeg: +angleDeg.toFixed(1),
        loadCurrent: +iLoad.toFixed(3),
        apfCurrent: +iApf.toFixed(3),
        sourceCurrent: +iSource.toFixed(3),
      });
    }

    return points;
  }

  // =========================================================================
  // 5. ACTIVE POWER FILTER (APF) SIMULATION LOGIC
  // =========================================================================

  /**
   * Simulates Active Power Filter (APF) compensation performance.
   * If apfEnabled is true, subtracts harmonic content from the load current to derive source current.
   * Calculates RMS currents, THD, TDD, K-Factor, and IEEE 519 compliance for both load and source.
   */
  public static simulateAPF(params: {
    harmonics: HarmonicComponent[] | number[];
    isc: number;
    il: number;
    apfEnabled?: boolean;
    compensationEfficiency?: number; // 0.0 to 1.0 (default 1.0 = 100% ideal subtraction)
  }): APFSimulationResult {
    const { harmonics, isc, il, apfEnabled = true, compensationEfficiency = 1.0 } = params;

    const loadSpectrum = PowerQualityEngine.toHarmonicComponents(harmonics);
    const eff = apfEnabled ? Math.max(0, Math.min(1, compensationEfficiency)) : 0;

    // Derive source spectrum by subtracting compensated harmonics
    const sourceSpectrum: HarmonicComponent[] = loadSpectrum.map((comp) => {
      if (comp.order >= 2) {
        return {
          ...comp,
          magnitude: comp.magnitude * (1 - eff),
        };
      }
      return { ...comp };
    });

    const loadCompliance = PowerQualityEngine.checkIEEE519Compliance(isc, il, loadSpectrum);
    const sourceCompliance = PowerQualityEngine.checkIEEE519Compliance(isc, il, sourceSpectrum);

    const loadKFactor = PowerQualityEngine.calculateKFactor(loadSpectrum);
    const sourceKFactor = PowerQualityEngine.calculateKFactor(sourceSpectrum);

    // Calculate total RMS current
    let loadSqSum = 0;
    let sourceSqSum = 0;
    for (const c of loadSpectrum) loadSqSum += c.magnitude * c.magnitude;
    for (const c of sourceSpectrum) sourceSqSum += c.magnitude * c.magnitude;

    const loadCurrentRms = Math.sqrt(loadSqSum);
    const sourceCurrentRms = Math.sqrt(sourceSqSum);

    return {
      apfEnabled,
      loadCurrentRms: +loadCurrentRms.toFixed(2),
      sourceCurrentRms: +sourceCurrentRms.toFixed(2),
      loadTHDPercent: loadCompliance.thdPercent,
      sourceTHDPercent: sourceCompliance.thdPercent,
      loadTDDPercent: loadCompliance.tddPercent,
      sourceTDDPercent: sourceCompliance.tddPercent,
      loadKFactor: +loadKFactor.toFixed(2),
      sourceKFactor: +sourceKFactor.toFixed(2),
      loadCompliance,
      sourceCompliance,
      compensationPercent: +(eff * 100).toFixed(1),
    };
  }

  // =========================================================================
  // INSTANCE METHOD WRAPPERS
  // =========================================================================

  /**
   * Update system Short Circuit Current (Isc) and Max Demand Load Current (IL)
   */
  public setSystemParams(isc: number, il: number, frequencyHz?: number): void {
    this.isc = Math.max(0.1, isc);
    this.il = Math.max(0.1, il);
    if (frequencyHz) this.frequencyHz = frequencyHz;
  }

  /**
   * Run full Power Quality analysis for given harmonic spectrum using instance system parameters.
   */
  public checkCompliance(harmonics: HarmonicComponent[] | number[], i1?: number): IEEE519ComplianceResult {
    return PowerQualityEngine.checkIEEE519Compliance(this.isc, this.il, harmonics, i1);
  }

  /**
   * Calculate THD for given harmonics
   */
  public calculateTHD(harmonics: HarmonicComponent[] | number[], i1?: number): number {
    return PowerQualityEngine.calculateTHD(harmonics, i1);
  }

  /**
   * Calculate TDD using instance IL
   */
  public calculateTDD(harmonics: HarmonicComponent[] | number[]): number {
    return PowerQualityEngine.calculateTDD(harmonics, this.il);
  }

  /**
   * Calculate K-Factor for given harmonics
   */
  public calculateKFactor(harmonics: HarmonicComponent[] | number[]): number {
    return PowerQualityEngine.calculateKFactor(harmonics);
  }

  /**
   * Generate instantaneous waveform value i(t) for load type or custom spectrum
   */
  public generateWaveform(
    loadType: LoadType | HarmonicComponent[],
    time: number,
    apfEnabled: boolean = false
  ): number {
    return PowerQualityEngine.generateWaveform(loadType, time, this.frequencyHz, apfEnabled);
  }

  /**
   * Run APF simulation using instance system parameters
   */
  public simulateAPF(harmonics: HarmonicComponent[] | number[], apfEnabled: boolean = true): APFSimulationResult {
    return PowerQualityEngine.simulateAPF({
      harmonics,
      isc: this.isc,
      il: this.il,
      apfEnabled,
    });
  }

  // =========================================================================
  // HELPER UTILITIES
  // =========================================================================

  /**
   * Normalizes load type string variants into canonical format ('6-Pulse', '12-Pulse', 'VFD', 'SMPS')
   */
  private static normalizeLoadType(loadType: LoadType): '6-Pulse' | '12-Pulse' | 'VFD' | 'SMPS' {
    const raw = String(loadType).toUpperCase().replace(/_/g, '-');

    if (raw.includes('6') || raw.includes('6-PULSE')) return '6-Pulse';
    if (raw.includes('12') || raw.includes('12-PULSE')) return '12-Pulse';
    if (raw.includes('VFD')) return 'VFD';
    if (raw.includes('SMPS')) return 'SMPS';

    return '6-Pulse';
  }

  /**
   * Converts harmonic spectrum input into Map<order, magnitude>
   */
  private static normalizeSpectrumInput(harmonics: HarmonicComponent[] | number[]): Map<number, number> {
    const map = new Map<number, number>();

    if (Array.isArray(harmonics)) {
      for (let i = 0; i < harmonics.length; i++) {
        const item = harmonics[i];
        if (typeof item === 'number') {
          // If simple array of numbers, index 1 = fundamental, index 2 = 2nd harmonic, etc.
          const order = i === 0 ? 1 : i;
          map.set(order, item);
        } else if (item && typeof item === 'object' && 'order' in item) {
          map.set(item.order, item.magnitude);
        }
      }
    }

    return map;
  }

  /**
   * Converts harmonic input to standard HarmonicComponent[]
   */
  private static toHarmonicComponents(harmonics: HarmonicComponent[] | number[]): HarmonicComponent[] {
    const map = PowerQualityEngine.normalizeSpectrumInput(harmonics);
    const result: HarmonicComponent[] = [];

    for (const [order, magnitude] of map.entries()) {
      result.push({ order, magnitude });
    }

    return result.sort((a, b) => a.order - b.order);
  }
}
