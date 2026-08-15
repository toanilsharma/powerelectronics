export type HarmonicSourceType =
  | '6_PULSE_SCR'
  | '12_PULSE'
  | '18_PULSE'
  | 'CUSTOM';

export type PassiveTunedFreq = 5 | 7 | 11 | 13;

export interface PassiveFilterConfig {
  enabled: boolean;
  tunedFreq: PassiveTunedFreq;
  qFactor: number; // 20 - 100
}

export interface ActiveFilterConfig {
  enabled: boolean;
  ratingAmps: 50 | 100 | 200;
}

export interface HarmonicBarData {
  order: number;
  magnitude: number; // % of fundamental
  limit: number;     // % IEEE 519 limit
  isExceeding: boolean;
}

export interface IEEE519Params {
  isc: number; // Fault Current A
  il: number;  // Max Demand Load Current A
}
