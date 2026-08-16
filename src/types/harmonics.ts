export type HarmonicSourceType =
  | '6_PULSE_SCR'
  | '12_PULSE'
  | '18_PULSE'
  | 'VFD_LOAD'
  | 'SMPS_LOAD'
  | 'ARC_FURNACE'
  | 'CUSTOM';

export type PassiveTunedFreq = 5 | 7 | 11 | 13;

export interface PassiveFilterConfig {
  enabled: boolean;
  tunedFreq: PassiveTunedFreq;
  qFactor: number; // 20 - 100
  inductanceMh?: number; // L in mH (0.1 to 50 mH)
  capacitanceUf?: number; // C in uF (10 to 1000 uF)
  resistanceOhm?: number; // R in Ohms
  tunedHarmonicOrder?: number; // hr = 1 / (2*pi*f1 * sqrt(L*C))
  parallelResonanceOrder?: number; // h_parallel
  hasResonanceAlert?: boolean; // True if parallel resonance near 5th or 7th harmonic
}

export interface ActiveFilterConfig {
  enabled: boolean;
  ratingAmps: 50 | 100 | 200 | 300;
  mode?: 'HARMONIC_ONLY' | 'HARMONIC_AND_PF' | 'REACTIVE_ONLY';
  responseSpeedMs?: number;
}

export interface HarmonicBarData {
  order: number;
  magnitude: number; // % of fundamental
  phaseAngle?: number; // degrees
  limit: number;     // % IEEE 519 limit
  isExceeding: boolean;
}

export interface IEEE519Params {
  isc: number; // Fault Current A
  il: number;  // Max Demand Load Current A
}
