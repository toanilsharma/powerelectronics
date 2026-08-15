export interface ActiveFaults {
  scrT3Open: boolean;
  acPhaseLossL2: boolean;
  groundFault: boolean;
  dcOvervoltage: boolean;
  loadTrip: boolean;
  controlFuseBlown: boolean;
  filterCapOpen: boolean;
  looseTerminal: boolean;
  roomFanFail: boolean;
  equalizeForgotten: boolean;
}

export type AlarmLevel = 'INFO' | 'WARNING' | 'TRIP';

export interface AlarmEntry {
  id: string;
  time: string;
  level: AlarmLevel;
  message: string;
}

export interface ProtectionRelay {
  code: string;
  name: string;
  setting: string;
  status: 'NORMAL' | 'OPERATED';
}

export type SCRId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';

export type SCRDeviceState = 'OFF' | 'GATE_PULSE' | 'CONDUCTING' | 'COMMUTATING' | 'REVERSE_BIASED';

export interface BridgeConductionState {
  electricalAngleDeg: number;
  firingAngleDeg: number;
  overlapAngleDeg: number;
  conductingSCRs: SCRId[];
  activeGateSCRs: SCRId[];
  isCommutating: boolean;
  outgoingSCR: SCRId | null;
  incomingSCR: SCRId | null;
  scrStates: Record<SCRId, SCRDeviceState>;
  activePhaseA: 'POS' | 'NEG' | 'COMMUTATING' | 'OFF';
  activePhaseB: 'POS' | 'NEG' | 'COMMUTATING' | 'OFF';
  activePhaseC: 'POS' | 'NEG' | 'COMMUTATING' | 'OFF';
  instantaneousLineVoltageName: string;
  instantaneousVdc: number;
  statusText: string;
}
