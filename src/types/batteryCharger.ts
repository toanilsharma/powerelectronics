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
