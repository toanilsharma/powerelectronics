import React, { useState, useEffect } from 'react';
import {
  DualBatteryChargerState,
  DualBatteryChargerReadouts,
  DualChargerFaults,
} from '../types/dualBatteryCharger';
import { DualBatteryChargerSLD } from './DualBatteryChargerSLD';
import { DualBatteryChargerControlsAndSOP } from './DualBatteryChargerControlsAndSOP';
import { DualBatteryChargerFaultPanel } from './DualBatteryChargerFaultPanel';
import { DualBatteryChargerWaveforms } from './DualBatteryChargerWaveforms';
import { AlarmEntry, AlarmLevel } from '../types/batteryCharger';
import { playAlarmSound } from '../utils/audioAlerts';
import { 
  AlertCircle, 
  Bell, 
  Shield, 
  ShieldCheck,
  Zap, 
  Gauge, 
  Sliders, 
  SlidersHorizontal, 
  Play, 
  CheckCircle2, 
  ShieldAlert, 
  Maximize2, 
  Minimize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw, 
  Activity, 
  Layers, 
  Pause, 
  Info,
  X
} from 'lucide-react';
import { AlarmsAndAlertsModal } from './AlarmsAndAlertsModal';

interface DualBatteryChargerContainerProps {
  voltageIn: number; // AC input voltage from main slider (nom 415V)
  isRunning: boolean;
  onBlackoutChange?: (isBlackout: boolean) => void;
}

export const DualBatteryChargerContainer: React.FC<DualBatteryChargerContainerProps> = ({
  voltageIn,
  isRunning,
  onBlackoutChange,
}) => {
  // WORKBENCH & PANEL COLLAPSE STATES
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showWaveformsModal, setShowWaveformsModal] = useState<boolean>(false);

  // STATE DEFINITION
  const [mobileTab, setMobileTab] = useState<'controls' | 'sld' | 'waveforms' | 'results'>('sld');
  const [state, setState] = useState<DualBatteryChargerState>({
    acSupplyAOnline: true,
    acSupplyBOnline: true,
    voltageA: 415,
    voltageB: 415,

    mcbModule1A: true,
    mcbModule2A: true,
    mcbModule3A: true,
    mcbModule4A: true,
    mcbSpareA: false,
    modeA: 'FLOAT',
    mccbChargerA: true,
    blockingDiodeAHealthy: true,

    mcbModule1B: true,
    mcbModule2B: true,
    mcbModule3B: true,
    mcbModule4B: true,
    mcbSpareB: false,
    modeB: 'FLOAT',
    mccbChargerB: true,
    blockingDiodeBHealthy: true,

    mcbTieA: true,
    mccbBusTie: false, // Normally OFF / Open
    mcbTieB: true,
    dcdbBusCoupler: false, // Normally OFF / Open

    mccbBattery1_125A: true,
    mccbBattery1_160A: true,
    shuntTrip1Tripped: false,
    soc1: 94,
    ahAcc1: 94,

    mccbBattery2_125A: true,
    mccbBattery2_160A: true,
    shuntTrip2Tripped: false,
    soc2: 95,
    ahAcc2: 95,

    loadKw1: 5.5,
    mccbDcdb1: true,
    loadKw2: 5.5,
    mccbDcdb2: true,

    dcdb1Feeder1: true,
    dcdb1Feeder2: true,
    dcdb1Feeder3: true,

    dcdb2Feeder1: true,
    dcdb2Feeder2: true,
    dcdb2Feeder3: true,
  });

  const [faults, setFaults] = useState<DualChargerFaults>({
    acOutageA: false,
    acOutageB: false,
    moduleFailA: false,
    moduleFailB: false,
    groundFaultBus1: false,
    groundFaultBus2: false,
    diodeAOpen: false,
    diodeBOpen: false,
    load1Trip: false,
    load2Trip: false,
  });

  const [showAlarmsModal, setShowAlarmsModal] = useState<boolean>(false);
  const [alarmLog, setAlarmLog] = useState<AlarmEntry[]>([
    {
      id: 'dual-init-1',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Dual Charger Scheme Initialized. Substation 220VDC Bus A & B Nominal.',
    },
  ]);

  const addAlarm = (level: AlarmLevel, message: string) => {
    const time = new Date().toLocaleTimeString();
    const entry: AlarmEntry = {
      id: `dual-alm-${Date.now()}-${Math.random()}`,
      time,
      level,
      message,
    };
    setAlarmLog((prev) => [entry, ...prev.slice(0, 15)]);
    if (level === 'TRIP' || level === 'WARNING') {
      playAlarmSound(level);
    }
  };

  // PHYSICS COMPUTATION ENGINE
  const computePhysics = (): DualBatteryChargerReadouts => {
    const vAcBusA = state.acSupplyAOnline && !faults.acOutageA ? voltageIn : 0;
    const vAcBusB = state.acSupplyBOnline && !faults.acOutageB ? voltageIn : 0;

    // Active modules count
    let activeModulesA =
      (state.mcbModule1A ? 1 : 0) +
      (state.mcbModule2A ? 1 : 0) +
      (state.mcbModule3A ? 1 : 0) +
      (state.mcbModule4A ? 1 : 0) +
      (state.mcbSpareA ? 1 : 0);
    if (faults.moduleFailA) activeModulesA = Math.max(0, activeModulesA - 2);

    let activeModulesB =
      (state.mcbModule1B ? 1 : 0) +
      (state.mcbModule2B ? 1 : 0) +
      (state.mcbModule3B ? 1 : 0) +
      (state.mcbModule4B ? 1 : 0) +
      (state.mcbSpareB ? 1 : 0);
    if (faults.moduleFailB) activeModulesB = Math.max(0, activeModulesB - 2);

    // Target Charger Output Voltages
    let vChargerA = 0;
    if (vAcBusA > 0 && state.mccbChargerA && state.blockingDiodeAHealthy && !faults.diodeAOpen && activeModulesA > 0) {
      if (state.modeA === 'FLOAT') vChargerA = 234.15;
      else if (state.modeA === 'BOOST') vChargerA = 246.75;
    }

    let vChargerB = 0;
    if (vAcBusB > 0 && state.mccbChargerB && state.blockingDiodeBHealthy && !faults.diodeBOpen && activeModulesB > 0) {
      if (state.modeB === 'FLOAT') vChargerB = 234.15;
      else if (state.modeB === 'BOOST') vChargerB = 246.75;
    }

    // Battery Voltages
    const isBat1Connected = state.mccbBattery1_125A && state.mccbBattery1_160A && !state.shuntTrip1Tripped;
    const isBat2Connected = state.mccbBattery2_125A && state.mccbBattery2_160A && !state.shuntTrip2Tripped;

    const vBatt1Nom = 189 + (state.soc1 / 100) * 31; // 189V to 220V open circuit
    const vBatt2Nom = 189 + (state.soc2 / 100) * 31;

    // Bus Tie / Coupler status
    const isBusTieEnergized = state.mcbTieA && state.mccbBusTie && state.mcbTieB;
    const isDcdbCouplerEnergized = state.dcdbBusCoupler;
    const isInterconnected = isBusTieEnergized || isDcdbCouplerEnergized;

    // Bus Voltages
    let vDcBus1 = 0;
    let vDcBus2 = 0;

    if (!isInterconnected) {
      vDcBus1 = vChargerA > 0 ? vChargerA : isBat1Connected ? vBatt1Nom : 0;
      vDcBus2 = vChargerB > 0 ? vChargerB : isBat2Connected ? vBatt2Nom : 0;
    } else {
      const vMax = Math.max(vChargerA, vChargerB, isBat1Connected ? vBatt1Nom : 0, isBat2Connected ? vBatt2Nom : 0);
      vDcBus1 = vMax;
      vDcBus2 = vMax;
    }

    // Load Currents (derived from active downstream feeders and trip status)
    const activeFeeders1 = (state.dcdb1Feeder1 ? 2.5 : 0) + (state.dcdb1Feeder2 ? 1.8 : 0) + (state.dcdb1Feeder3 ? 1.2 : 0);
    const effectiveKw1 = faults.load1Trip ? 0 : activeFeeders1;
    const iDcBus1 = state.mccbDcdb1 && !faults.load1Trip && vDcBus1 > 50 ? (effectiveKw1 * 1000) / vDcBus1 : 0;

    const activeFeeders2 = (state.dcdb2Feeder1 ? 2.8 : 0) + (state.dcdb2Feeder2 ? 1.7 : 0) + (state.dcdb2Feeder3 ? 1.0 : 0);
    const effectiveKw2 = faults.load2Trip ? 0 : activeFeeders2;
    const iDcBus2 = state.mccbDcdb2 && !faults.load2Trip && vDcBus2 > 50 ? (effectiveKw2 * 1000) / vDcBus2 : 0;

    // Charger & Battery Currents
    let iChargerA = 0;
    let iChargerB = 0;
    let iBatt1 = 0;
    let iBatt2 = 0;
    let iBusTie = 0;

    if (!isInterconnected) {
      // Independent operation
      if (vChargerA > 0) {
        iChargerA = Math.min(activeModulesA * 20, iDcBus1 + (state.soc1 < 100 && isBat1Connected ? 12 : 0));
        if (isBat1Connected) iBatt1 = iChargerA - iDcBus1;
      } else if (isBat1Connected) {
        iBatt1 = -iDcBus1; // Battery discharging
      }

      if (vChargerB > 0) {
        iChargerB = Math.min(activeModulesB * 20, iDcBus2 + (state.soc2 < 100 && isBat2Connected ? 12 : 0));
        if (isBat2Connected) iBatt2 = iChargerB - iDcBus2;
      } else if (isBat2Connected) {
        iBatt2 = -iDcBus2; // Battery discharging
      }
    } else {
      // Interconnected via Bus Tie
      const totalLoad = iDcBus1 + iDcBus2;
      const totalCapacityA = activeModulesA * 20;
      const totalCapacityB = activeModulesB * 20;

      if (vChargerA > 0 && vChargerB > 0) {
        iChargerA = Math.min(totalCapacityA, totalLoad * 0.5 + 6);
        iChargerB = Math.min(totalCapacityB, totalLoad * 0.5 + 6);
        iBusTie = iChargerA - iDcBus1;
      } else if (vChargerA > 0) {
        iChargerA = Math.min(totalCapacityA, totalLoad + 12);
        iBusTie = iChargerA - iDcBus1; // Power flows from Bus 1 to Bus 2
        if (iChargerA < totalLoad) {
          // Batteries assist in discharge
          if (isBat1Connected) iBatt1 = (iChargerA - iDcBus1 - iDcBus2) / 2;
          if (isBat2Connected) iBatt2 = (iChargerA - iDcBus1 - iDcBus2) / 2;
        }
      } else if (vChargerB > 0) {
        iChargerB = Math.min(totalCapacityB, totalLoad + 12);
        iBusTie = -(iChargerB - iDcBus2); // Power flows from Bus 2 to Bus 1
        if (iChargerB < totalLoad) {
          if (isBat1Connected) iBatt1 = (iChargerB - iDcBus1 - iDcBus2) / 2;
          if (isBat2Connected) iBatt2 = (iChargerB - iDcBus2 - iDcBus1) / 2;
        }
      } else {
        // Both chargers off - Batteries supply loads
        if (isBat1Connected && isBat2Connected) {
          iBatt1 = -totalLoad / 2;
          iBatt2 = -totalLoad / 2;
          iBusTie = -iDcBus1 + totalLoad / 2;
        } else if (isBat1Connected) {
          iBatt1 = -totalLoad;
          iBusTie = -iDcBus2;
        } else if (isBat2Connected) {
          iBatt2 = -totalLoad;
          iBusTie = iDcBus1;
        }
      }
    }

    return {
      vAcBusA,
      vAcBusB,
      vChargerA,
      iChargerA,
      activeModulesA,
      vChargerB,
      iChargerB,
      activeModulesB,
      vBatt1: vDcBus1,
      iBatt1,
      statusBatt1: !isBat1Connected ? 'ISOLATED' : iBatt1 > 0.5 ? 'CHARGING' : iBatt1 < -0.5 ? 'DISCHARGING' : 'FLOAT',
      vBatt2: vDcBus2,
      iBatt2,
      statusBatt2: !isBat2Connected ? 'ISOLATED' : iBatt2 > 0.5 ? 'CHARGING' : iBatt2 < -0.5 ? 'DISCHARGING' : 'FLOAT',
      vDcBus1,
      iDcBus1,
      vDcBus2,
      iDcBus2,
      vBusTie: isInterconnected ? vDcBus1 : 0,
      iBusTie,
      isBusTieEnergized,
      isDcdbCouplerEnergized,
      scadaConnectedA: true,
      scadaConnectedB: true,
    };
  };

  const readouts = computePhysics();

  // REAL-TIME BATTERY SOC ACCUMULATION ENGINE
  useEffect(() => {
    let timer: number;
    if (isRunning) {
      timer = window.setInterval(() => {
        setState((prev) => {
          let nextSoc1 = prev.soc1;
          let nextSoc2 = prev.soc2;

          if (readouts.iBatt1 > 0.5) nextSoc1 = Math.min(100, nextSoc1 + 0.05);
          else if (readouts.iBatt1 < -0.5) nextSoc1 = Math.max(0, nextSoc1 - 0.1);

          if (readouts.iBatt2 > 0.5) nextSoc2 = Math.min(100, nextSoc2 + 0.05);
          else if (readouts.iBatt2 < -0.5) nextSoc2 = Math.max(0, nextSoc2 - 0.1);

          return { ...prev, soc1: nextSoc1, soc2: nextSoc2 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, readouts.iBatt1, readouts.iBatt2]);

  // REAL-TIME BLACKOUT ALARM MONITORING ENGINE
  useEffect(() => {
    if (readouts.vDcBus1 < 50 && readouts.vDcBus2 < 50) {
      const exists = alarmLog.some((a) => a.message.includes('TOTAL DC BUS BLACKOUT'));
      if (!exists) {
        addAlarm('TRIP', '🚨 CRITICAL: TOTAL DC BUS BLACKOUT! BOTH DC BUS 1 & DC BUS 2 DE-ENERGIZED (0V)! ALL AC SUPPLIES AND BATTERIES ARE DISCONNECTED/OFF!');
      }
    } else if (readouts.vDcBus1 < 50) {
      const exists = alarmLog.some((a) => a.message.includes('DC BUS 1 BLACKOUT'));
      if (!exists) {
        addAlarm('TRIP', '🚨 CRITICAL: DC BUS 1 BLACKOUT! DC BUS 1 DE-ENERGIZED (0V)! AC INCOMER A & BATTERY 1 ISOLATED/OFF!');
      }
    } else if (readouts.vDcBus2 < 50) {
      const exists = alarmLog.some((a) => a.message.includes('DC BUS 2 BLACKOUT'));
      if (!exists) {
        addAlarm('TRIP', '🚨 CRITICAL: DC BUS 2 BLACKOUT! DC BUS 2 DE-ENERGIZED (0V)! AC INCOMER B & BATTERY 2 ISOLATED/OFF!');
      }
    }
  }, [readouts.vDcBus1, readouts.vDcBus2]);

  // HANDLERS
  const handleToggleBreaker = (key: keyof DualBatteryChargerState) => {
    setState((prev) => {
      const nextVal = !prev[key];
      addAlarm('INFO', `Switch/Breaker [${String(key)}] state toggled to ${nextVal ? 'CLOSED / ON' : 'OPEN / OFF'}`);
      return { ...prev, [key]: nextVal };
    });
  };

  const handleToggleFault = (key: keyof DualChargerFaults) => {
    setFaults((prev) => {
      const nextVal = !prev[key];
      addAlarm(nextVal ? 'TRIP' : 'INFO', `Fault Injection [${String(key)}] ${nextVal ? 'ACTIVATED' : 'CLEARED'}`);
      return { ...prev, [key]: nextVal };
    });
  };

  const handleResetAll = () => {
    setState({
      acSupplyAOnline: true,
      acSupplyBOnline: true,
      voltageA: 415,
      voltageB: 415,
      mcbModule1A: true,
      mcbModule2A: true,
      mcbModule3A: true,
      mcbModule4A: true,
      mcbSpareA: false,
      modeA: 'FLOAT',
      mccbChargerA: true,
      blockingDiodeAHealthy: true,
      mcbModule1B: true,
      mcbModule2B: true,
      mcbModule3B: true,
      mcbModule4B: true,
      mcbSpareB: false,
      modeB: 'FLOAT',
      mccbChargerB: true,
      blockingDiodeBHealthy: true,
      mcbTieA: true,
      mccbBusTie: false,
      mcbTieB: true,
      dcdbBusCoupler: false,
      mccbBattery1_125A: true,
      mccbBattery1_160A: true,
      shuntTrip1Tripped: false,
      soc1: 94,
      ahAcc1: 94,
      mccbBattery2_125A: true,
      mccbBattery2_160A: true,
      shuntTrip2Tripped: false,
      soc2: 95,
      ahAcc2: 95,
      loadKw1: 5.5,
      mccbDcdb1: true,
      loadKw2: 5.5,
      mccbDcdb2: true,
      dcdb1Feeder1: true,
      dcdb1Feeder2: true,
      dcdb1Feeder3: true,
      dcdb2Feeder1: true,
      dcdb2Feeder2: true,
      dcdb2Feeder3: true,
    });
    setFaults({
      acOutageA: false,
      acOutageB: false,
      moduleFailA: false,
      moduleFailB: false,
      groundFaultBus1: false,
      groundFaultBus2: false,
      diodeAOpen: false,
      diodeBOpen: false,
      load1Trip: false,
      load2Trip: false,
    });
    addAlarm('INFO', 'System reset to default nominal state.');
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#070b14] text-slate-100 font-sans relative select-none">
      <div className="w-full bg-[#0d1424]/95 border-b border-[#1e293b] backdrop-blur-md px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-lg h-[44px]">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-xs text-white font-mono flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            DUAL REDUNDANT CHARGER SCHEME
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden md:inline-block">IEEE 1188 / IEC 62485-2 / IEEE 946</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">BUS 1:</span>
            <span className={`font-black text-xs ${readouts.vDcBus1 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>{readouts.vDcBus1.toFixed(1)}V</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">BUS 2:</span>
            <span className={`font-black text-xs ${readouts.vDcBus2 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>{readouts.vDcBus2.toFixed(1)}V</span>
          </div>
          <button onClick={() => setShowAlarmsModal(true)} className="px-2 py-1 rounded bg-[#1e293b] hover:bg-[#2b3a5a] text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer">
            <span>🔔 ({alarmLog.length})</span>
          </button>
        </div>
      </div>
      <AlarmsAndAlertsModal isOpen={showAlarmsModal} onClose={() => setShowAlarmsModal(false)} alarmLog={alarmLog} onClearLog={() => setAlarmLog([])} moduleName="Dual Battery Charger Scheme" />
      <div className="flex-1 w-full overflow-hidden p-2 relative font-sans">
        <div className="hidden lg:grid gap-2.5 w-full h-full transition-all duration-300" style={{ gridTemplateColumns: `${leftPanelCollapsed ? '42px' : '270px'} 1fr ${rightPanelCollapsed ? '42px' : '300px'}` }}>
          {leftPanelCollapsed ? (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl select-none">
              <button onClick={() => setLeftPanelCollapsed(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"><ChevronRight className="w-5 h-5 text-blue-400" /></button>
            </div>
          ) : (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
                <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono"><Sliders className="w-4 h-4 text-blue-400" />Control Parameters</span>
                <button onClick={() => setLeftPanelCollapsed(true)} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-col gap-2.5 bg-[#070b14] border border-[#1e293b] p-2.5 rounded-xl">
                <input type="range" min="1" max="15" step="0.5" value={state.loadKw1} onChange={(e) => setState((prev) => ({ ...prev, loadKw1: Number(e.target.value) }))} className="w-full h-2 bg-slate-800 rounded-lg accent-blue-500 min-h-[32px]" />
                <input type="range" min="1" max="15" step="0.5" value={state.loadKw2} onChange={(e) => setState((prev) => ({ ...prev, loadKw2: Number(e.target.value) }))} className="w-full h-2 bg-slate-800 rounded-lg accent-blue-500 min-h-[32px]" />
              </div>
            </div>
          )}
          <div className="bg-[#060911] border border-[#1e293b] rounded-2xl flex flex-col h-full relative overflow-hidden shadow-2xl">
            <div className="w-full bg-[#0d1424]/90 border-b border-[#1e293b] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md z-20">
              <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5"><Layers className="w-4 h-4 text-blue-400" />DUAL SLD SCHEMATIC WORKBENCH</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowWaveformsModal(true)} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white border border-blue-400 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /><span>📊 Waveforms</span></button>
                <button onClick={() => setIsFullScreen(true)} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white border border-emerald-400 flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /><span>🖥️ Full Screen</span></button>
              </div>
            </div>
            <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-2">
              <DualBatteryChargerSLD state={state} readouts={readouts} faults={faults} onToggleBreaker={handleToggleBreaker} onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))} onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))} onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))} onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))} />
            </div>
          </div>
          {rightPanelCollapsed ? (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl select-none">
              <button onClick={() => setRightPanelCollapsed(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"><ChevronLeft className="w-5 h-5 text-emerald-400" /></button>
            </div>
          ) : (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto shadow-xl">
              <button onClick={() => setRightPanelCollapsed(true)} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              <div className="flex-1 overflow-y-auto"><DualBatteryChargerWaveforms state={state} readouts={readouts} compact={true} /></div>
            </div>
          )}
        </div>
        {isFullScreen && (
          <div className="fixed inset-0 z-50 bg-[#060911] flex flex-col p-3 gap-2.5 select-none">
            <div className="bg-[#0d1424] border border-[#1e293b] p-2.5 rounded-xl flex items-center justify-between shadow-lg">
              <h2 className="font-extrabold text-sm text-white font-mono">FULL-SCREEN WORKBENCH</h2>
              <button onClick={() => setIsFullScreen(false)} className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5"><Minimize2 className="w-4 h-4" />Exit</button>
            </div>
            <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 min-h-0">
              <div className="bg-[#060911] border border-[#1e293b] rounded-2xl flex items-center justify-center p-2"><DualBatteryChargerSLD state={state} readouts={readouts} faults={faults} onToggleBreaker={handleToggleBreaker} onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))} onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))} onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))} onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))} /></div>
              <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3"><DualBatteryChargerWaveforms state={state} readouts={readouts} compact={true} /></div>
            </div>
          </div>
        )}
        {showWaveformsModal && (
          <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none">
            <div className="bg-[#0d1424] border border-[#1e293b] p-3 rounded-xl flex items-center justify-between"><h2 className="font-extrabold text-sm text-white font-mono">OSCILLOSCOPE</h2><button onClick={() => setShowWaveformsModal(false)} className="p-1.5 bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-y-auto bg-[#0d1424] border border-[#1e293b] p-4 rounded-xl"><DualBatteryChargerWaveforms state={state} readouts={readouts} compact={false} /></div>
          </div>
        )}
      </div>
    </div>
  );
};
