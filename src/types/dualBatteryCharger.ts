export type ChargerOperationMode = 'FLOAT' | 'BOOST' | 'OFF';

export interface DualBatteryChargerState {
  // AC Supplies
  acSupplyAOnline: boolean; // MCCB 80A
  acSupplyBOnline: boolean; // MCCB 80A
  voltageA: number; // Nom 415V
  voltageB: number; // Nom 415V

  // Charger 1A (220V / 80A - 4x20A Modules)
  mcbModule1A: boolean;
  mcbModule2A: boolean;
  mcbModule3A: boolean;
  mcbModule4A: boolean;
  mcbSpareA: boolean;
  modeA: ChargerOperationMode;
  mccbChargerA: boolean; // MCCB 100A
  blockingDiodeAHealthy: boolean;

  // Charger 1B (220V / 80A - 4x20A Modules)
  mcbModule1B: boolean;
  mcbModule2B: boolean;
  mcbModule3B: boolean;
  mcbModule4B: boolean;
  mcbSpareB: boolean;
  modeB: ChargerOperationMode;
  mccbChargerB: boolean; // MCCB 100A
  blockingDiodeBHealthy: boolean;

  // Bus Tie / Coupler
  mcbTieA: boolean; // MCB 6A
  mccbBusTie: boolean; // MCCB 125A Main Bus Coupler Switch (Normally OFF)
  mcbTieB: boolean; // MCB 6A
  dcdbBusCoupler: boolean; // DCDB Inter-Bus Coupler Switch (Normally OFF)

  // Battery Bank 1 (220V/100AH VRLA)
  mccbBattery1_125A: boolean;
  mccbBattery1_160A: boolean; // Shunt trip MCCB
  shuntTrip1Tripped: boolean;
  soc1: number; // %
  ahAcc1: number; // Ah accumulated

  // Battery Bank 2 (220V/100AH VRLA)
  mccbBattery2_125A: boolean;
  mccbBattery2_160A: boolean; // Shunt trip MCCB
  shuntTrip2Tripped: boolean;
  soc2: number; // %
  ahAcc2: number; // Ah accumulated

  // Loads
  loadKw1: number; // kW
  mccbDcdb1: boolean; // MCCB 125A to DCDB 1
  loadKw2: number; // kW
  mccbDcdb2: boolean; // MCCB 125A to DCDB 2
  // DCDB 1 Downstream Load Feeders
  dcdb1Feeder1: boolean; // MCB 32A Switchgear Protection & Tripping
  dcdb1Feeder2: boolean; // MCB 32A Substation Control & Annunciator
  dcdb1Feeder3: boolean; // MCB 16A Emergency Substation Lighting

  // DCDB 2 Downstream Load Feeders
  dcdb2Feeder1: boolean; // MCB 63A Inverter System A Feed
  dcdb2Feeder2: boolean; // MCB 40A Generator Emergency Oil Pump (EOP)
  dcdb2Feeder3: boolean; // MCB 32A HV Breaker Motor Drives
}

export interface DualBatteryChargerReadouts {
  // Voltage nodes
  vAcBusA: number;
  vAcBusB: number;
  
  vChargerA: number;
  iChargerA: number;
  activeModulesA: number;
  
  vChargerB: number;
  iChargerB: number;
  activeModulesB: number;

  vBatt1: number;
  iBatt1: number; // + charging, - discharging
  statusBatt1: 'CHARGING' | 'DISCHARGING' | 'FLOAT' | 'ISOLATED';

  vBatt2: number;
  iBatt2: number; // + charging, - discharging
  statusBatt2: 'CHARGING' | 'DISCHARGING' | 'FLOAT' | 'ISOLATED';

  vDcBus1: number;
  iDcBus1: number;

  vDcBus2: number;
  iDcBus2: number;

  vBusTie: number;
  iBusTie: number; // Direction & magnitude
  isBusTieEnergized: boolean;
  isDcdbCouplerEnergized: boolean;

  scadaConnectedA: boolean;
  scadaConnectedB: boolean;
}

export interface DualChargerFaults {
  acOutageA: boolean;
  acOutageB: boolean;
  moduleFailA: boolean;
  moduleFailB: boolean;
  groundFaultBus1: boolean;
  groundFaultBus2: boolean;
  diodeAOpen: boolean;
  diodeBOpen: boolean;
  load1Trip: boolean; // DCDB 1 Downstream Load Tripped / Overload
  load2Trip: boolean; // DCDB 2 Downstream Load Tripped / Overload
}
