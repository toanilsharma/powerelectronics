export type LoadType = 'CENTRIFUGAL_PUMP' | 'COMPRESSOR' | 'CONVEYOR';
export type StartMode = 'VOLTAGE_RAMP' | 'CURRENT_LIMIT' | 'TORQUE_CONTROL';

export interface SoftStarterParams {
  loadType: LoadType;
  startMode: StartMode;
  initialVoltagePct: number; // 20 - 80%
  rampTimeSec: number;        // 1 - 60s
  currentLimitPct: number;    // 100 - 500%
  kickStart: boolean;         // 70% for 2s
}

export interface SoftStarterFaults {
  scrShort: boolean;
  overcurrent: boolean;
  startTimeout: boolean;
  phaseLoss: boolean;
}

export interface SoftStarterReadouts {
  motorSpeedRPM: number;
  motorCurrentFLA: number; // % or Amps
  outputVoltagePct: number;
  bypassClosed: boolean;
  suctionValveOpen: boolean;
  dischargeValveOpen: boolean;
  pumpHeadMeters: number;
  pumpFlowM3H: number;
}
