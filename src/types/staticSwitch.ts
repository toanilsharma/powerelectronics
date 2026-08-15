export type STSTransferMode = 'MAKE_BEFORE_BREAK' | 'BREAK_BEFORE_MAKE';
export type ActiveSource = 'A' | 'B' | 'NONE' | 'BOTH';

export interface STSFaults {
  sourceALoss: boolean;
  phaseReversalB: boolean;
  scrShortBridgeAT2: boolean;
  lossOfSync: boolean;
}

export interface STSSourceParams {
  voltageA: number; // nominal 230V 1Φ + N
  freqA: number;    // nominal 50.00Hz
  phaseA: number;   // 0 deg

  voltageBOffset: number; // -10% to +10%
  freqBOffset: number;    // -0.5Hz to +0.5Hz
  phaseBOffset: number;   // -30deg to +30deg
}

export interface BumplessConditionItem {
  id: string;
  category: string;
  name: string;
  standardLimit: string;
  currentValue: string;
  isMet: boolean;
  importance: 'CRITICAL' | 'RECOMMENDED' | 'SAFETY_INTERLOCK';
  description: string;
}

export interface BumplessMatrixState {
  voltageMatchOk: boolean;
  freqMatchOk: boolean;
  phaseMatchOk: boolean;
  phaseSequenceOk: boolean;
  synchrocheckLockOk: boolean;
  scrBridgeHealthOk: boolean;
  targetSourceAvailable: boolean;
  noDownstreamFault: boolean;
  fastCommutationOk: boolean;
  noLockout: boolean;
  isBumplessQualified: boolean;
}

export interface STSState {
  qaClosed: boolean;
  qbClosed: boolean;
  q3BypassClosed: boolean;
  activeBridge: ActiveSource;
  transferMode: STSTransferMode;
  autoTransferEnabled: boolean;
  sourceAPowerStopped: boolean;
  sourceBPowerStopped: boolean;
  transferring: boolean;
  lastTransferTimeMs: number | null;
  lastTransferReason: string;
}
