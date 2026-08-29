export type LoadType = 'CENTRIFUGAL_PUMP' | 'COMPRESSOR' | 'CONVEYOR' | 'HEAVY_CRUSHER';
export type StartMode = 'VOLTAGE_RAMP' | 'CURRENT_LIMIT' | 'TORQUE_CONTROL';
export type WiringConnection = 'IN_LINE' | 'INSIDE_DELTA';

export interface SoftStarterParams {
  loadType: LoadType;
  startMode: StartMode;
  wiringConnection?: WiringConnection;
  lineVoltageNominal?: number; // 200V to 690V AC
  motorPowerKw?: number;        // 10kW to 500kW
  initialVoltagePct: number;    // 10 - 80%
  rampTimeSec: number;          // 1 - 60s
  softStopTimeSec?: number;     // 0 - 60s
  currentLimitPct: number;      // 100 - 500%
  kickStart: boolean;           // Boost torque pulse
  kickStartVoltagePct?: number; // 50 - 100%
  kickStartDurationSec?: number;// 0.1 - 2.0s
  loadTorquePct?: number;       // 10 - 150%
  systemLoadDemandPct?: number; // 10 - 150%, default 78%
}

export interface SoftStarterFaults {
  scrShort: boolean;
  overcurrent: boolean;
  startTimeout: boolean;
  phaseLoss: boolean;
  t1Open?: boolean;
  t1Short?: boolean;
  phaseLossL1?: boolean;
  bypassWeld?: boolean;
}

export interface SoftStarterReadouts {
  motorSpeedRPM: number;
  motorCurrentFLA: number; // % or Amps
  outputVoltagePct: number;
  firingAngleDeg?: number;  // 180 to 0 degrees
  bypassClosed: boolean;
  suctionValveOpen: boolean;
  dischargeValveOpen: boolean;
  pumpHeadMeters: number;
  pumpFlowM3H: number;
  activePowerKw?: number;
  powerFactor?: number;
  thermalCapacityPct?: number;
}
