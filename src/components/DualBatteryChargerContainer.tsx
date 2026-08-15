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
  X,
  FileText,
  TrendingUp,
  Radio
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

  // MOBILE NAVIGATION TABS (SLD | CONTROLS | MEASUREMENTS | WAVEFORMS | ALARMS | SOP)
  const [mobileTab, setMobileTab] = useState<'sld' | 'controls' | 'measurements' | 'waveforms' | 'alarms' | 'sop'>('sld');

  // STATE DEFINITION
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
    dcBusShort1: false,
    dcBusShort2: false,
    breakerStuckA: false,
    busTieFailure: false,
    overloadCondition: false,
  });

  const [showAlarmsModal, setShowAlarmsModal] = useState<boolean>(false);
  const [targetHighlightKey, setTargetHighlightKey] = useState<string | undefined>(undefined);
  const [alarmLog, setAlarmLog] = useState<AlarmEntry[]>([
    {
      id: 'dual-init-1',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Dual Charger Scheme Initialized. Substation 220VDC Bus A & B Nominal.',
    },
  ]);

  // FULLSCREEN HANDLER WITH HTML5 FULLSCREEN API & ESC LISTENER
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const addAlarm = (level: AlarmLevel, message: string) => {
    const time = new Date().toLocaleTimeString();
    const entry: AlarmEntry = {
      id: `dual-alm-${Date.now()}-${Math.random()}`,
      time,
      level,
      message,
    };
    setAlarmLog((prev) => [entry, ...prev.slice(0, 25)]);
    if (level === 'TRIP' || level === 'WARNING') {
      playAlarmSound(level);
    }
  };

  // PHYSICS COMPUTATION ENGINE (UNTOUCHED ELECTRICAL CALCULATIONS)
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

    if (faults.dcBusShort1) vDcBus1 = 0;
    if (faults.dcBusShort2) vDcBus2 = 0;

    // Load Currents
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
      if (vChargerA > 0) {
        iChargerA = Math.min(activeModulesA * 20, iDcBus1 + (state.soc1 < 100 && isBat1Connected ? 12 : 0));
        if (isBat1Connected) iBatt1 = iChargerA - iDcBus1;
      } else if (isBat1Connected) {
        iBatt1 = -iDcBus1;
      }

      if (vChargerB > 0) {
        iChargerB = Math.min(activeModulesB * 20, iDcBus2 + (state.soc2 < 100 && isBat2Connected ? 12 : 0));
        if (isBat2Connected) iBatt2 = iChargerB - iDcBus2;
      } else if (isBat2Connected) {
        iBatt2 = -iDcBus2;
      }
    } else {
      const totalLoad = iDcBus1 + iDcBus2;
      const totalCapacityA = activeModulesA * 20;
      const totalCapacityB = activeModulesB * 20;

      if (vChargerA > 0 && vChargerB > 0) {
        iChargerA = Math.min(totalCapacityA, totalLoad * 0.5 + 6);
        iChargerB = Math.min(totalCapacityB, totalLoad * 0.5 + 6);
        iBusTie = iChargerA - iDcBus1;
      } else if (vChargerA > 0) {
        iChargerA = Math.min(totalCapacityA, totalLoad + (isBat1Connected ? 6 : 0) + (isBat2Connected ? 6 : 0));
        iBusTie = iChargerA - iDcBus1;
        if (isBat1Connected) iBatt1 = iChargerA - totalLoad - (isBat2Connected ? 6 : 0);
        if (isBat2Connected) iBatt2 = 6;
      } else if (vChargerB > 0) {
        iChargerB = Math.min(totalCapacityB, totalLoad + (isBat1Connected ? 6 : 0) + (isBat2Connected ? 6 : 0));
        iBusTie = -(iChargerB - iDcBus2);
        if (isBat2Connected) iBatt2 = iChargerB - totalLoad - (isBat1Connected ? 6 : 0);
        if (isBat1Connected) iBatt1 = 6;
      } else {
        if (isBat1Connected && isBat2Connected) {
          iBatt1 = -totalLoad * 0.5;
          iBatt2 = -totalLoad * 0.5;
        } else if (isBat1Connected) {
          iBatt1 = -totalLoad;
        } else if (isBat2Connected) {
          iBatt2 = -totalLoad;
        }
      }
    }

    return {
      vAcBusA,
      vAcBusB,
      iAcA: (iChargerA * (vChargerA || 234)) / (vAcBusA || 415) / 1.732 / 0.9,
      iAcB: (iChargerB * (vChargerB || 234)) / (vAcBusB || 415) / 1.732 / 0.9,
      activeModulesA,
      activeModulesB,
      vChargerA,
      vChargerB,
      iChargerA,
      iChargerB,
      vDcBus1,
      vDcBus2,
      iDcBus1,
      iDcBus2,
      vBatt1: isBat1Connected ? vDcBus1 : vBatt1Nom,
      vBatt2: isBat2Connected ? vDcBus2 : vBatt2Nom,
      iBatt1,
      iBatt2,
      statusBatt1: !isBat1Connected ? 'ISOLATED' : iBatt1 > 0.5 ? 'CHARGING' : iBatt1 < -0.5 ? 'DISCHARGING' : 'FLOAT',
      statusBatt2: !isBat2Connected ? 'ISOLATED' : iBatt2 > 0.5 ? 'CHARGING' : iBatt2 < -0.5 ? 'DISCHARGING' : 'FLOAT',
      isBat1Connected,
      isBat2Connected,
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
        if (onBlackoutChange) onBlackoutChange(true);
      }
    } else {
      if (onBlackoutChange) onBlackoutChange(false);
      if (readouts.vDcBus1 < 50) {
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
    }
  }, [readouts.vDcBus1, readouts.vDcBus2]);

  // CONFIRMATION DIALOG STATE
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string;
    consequence: string;
    action: () => void;
  } | null>(null);

  const requestActionWithConfirmation = (title: string, consequence: string, action: () => void) => {
    setPendingConfirmation({ title, consequence, action });
  };

  // HANDLERS WITH CONFIRMATION & EVENT LOGGING
  const handleToggleBreaker = (key: keyof DualBatteryChargerState) => {
    const isSignificant =
      key === 'mccbBattery1_160A' ||
      key === 'mccbBattery2_160A' ||
      key === 'mccbDcdb1' ||
      key === 'mccbDcdb2' ||
      key === 'mccbBusTie' ||
      key === 'acSupplyAOnline' ||
      key === 'acSupplyBOnline';

    const executeToggle = () => {
      setState((prev) => {
        const nextVal = !prev[key];
        addAlarm(
          'INFO',
          `[OPERATOR ACTION] Device [${String(key)}] set to ${nextVal ? 'CLOSED / ON' : 'OPEN / OFF'}`
        );
        return { ...prev, [key]: nextVal };
      });
    };

    if (isSignificant) {
      const isCurrentlyOn = (state as any)[key];
      const desc = isCurrentlyOn ? `Open Breaker [${String(key)}]` : `Close Breaker [${String(key)}]`;
      const cons = isCurrentlyOn
        ? `Opening ${String(key)} will isolate this section and affect DC bus availability.`
        : `Closing ${String(key)} will energize the downstream path.`;

      requestActionWithConfirmation(desc, cons, executeToggle);
    } else {
      executeToggle();
    }
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
    <div className={`flex flex-col w-full overflow-hidden bg-[#070b14] text-slate-100 font-sans relative select-none ${isFullScreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'h-full'}`}>
      
      {/* ============================================================
          TOP COMPACT HEADER BAR (MOBILE & DESKTOP TELEMETRY)
          ============================================================ */}
      <div className="w-full bg-[#0d1424]/95 border-b border-[#1e293b] backdrop-blur-md px-3 py-2 flex items-center justify-between gap-2 shrink-0 z-30 shadow-lg min-h-[46px]">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="font-extrabold text-xs text-white font-mono flex items-center gap-1.5 shrink-0">
            <Zap className="w-4 h-4 text-emerald-400" />
            DUAL CHARGER WORKSTATION
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hidden sm:inline-block">
            IEEE 946 / IEC 62485
          </span>
        </div>

        {/* TELEMETRY READOUTS */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 bg-[#070b14] px-2 py-1 rounded-lg border border-[#1e293b]">
            <span className="text-slate-400 text-[10px]">BUS 1:</span>
            <span className={`font-black text-xs ${readouts.vDcBus1 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {readouts.vDcBus1.toFixed(1)}V
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#070b14] px-2 py-1 rounded-lg border border-[#1e293b]">
            <span className="text-slate-400 text-[10px]">BUS 2:</span>
            <span className={`font-black text-xs ${readouts.vDcBus2 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {readouts.vDcBus2.toFixed(1)}V
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[#070b14] px-2 py-1 rounded-lg border border-[#1e293b]">
            <span className="text-slate-400 text-[10px]">SOC1:</span>
            <span className="font-bold text-xs text-amber-400">{Math.round(state.soc1)}%</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[#070b14] px-2 py-1 rounded-lg border border-[#1e293b]">
            <span className="text-slate-400 text-[10px]">SOC2:</span>
            <span className="font-bold text-xs text-amber-400">{Math.round(state.soc2)}%</span>
          </div>

          <button
            onClick={() => setShowAlarmsModal(true)}
            className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#2b3a5a] text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer border border-slate-700"
          >
            <span>🔔 ({alarmLog.length})</span>
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-emerald-400 shadow-md"
            title="Toggle True Fullscreen Mode"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullScreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      <AlarmsAndAlertsModal
        isOpen={showAlarmsModal}
        onClose={() => setShowAlarmsModal(false)}
        alarmLog={alarmLog}
        onClearLog={() => setAlarmLog([])}
        moduleName="Dual Redundant Charger Scheme"
      />

      {/* ============================================================
          DESKTOP 3-PANEL LAYOUT (LEFT | CENTER SLD | RIGHT)
          ============================================================ */}
      <div className="flex-1 w-full overflow-hidden p-2 relative font-sans">
        <div
          className="hidden lg:grid gap-2.5 w-full h-full transition-all duration-300"
          style={{
            gridTemplateColumns: `${leftPanelCollapsed ? '42px' : '280px'} 1fr ${rightPanelCollapsed ? '42px' : '320px'}`,
          }}
        >
          {/* LEFT PANEL: CONTROLS & PARAMETERS */}
          {leftPanelCollapsed ? (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl select-none">
              <button
                onClick={() => setLeftPanelCollapsed(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Expand Control Parameters"
              >
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </button>
              <div className="writing-mode-vertical text-xs font-mono font-bold tracking-widest text-slate-400 uppercase rotate-180 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400 rotate-90" />
                <span>CONTROLS</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto shadow-xl scrollbar-none">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
                <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Control Parameters
                </span>
                <button
                  onClick={() => setLeftPanelCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Collapse Left Panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* DUAL CHARGER CONTROL COMPONENTS */}
              <DualBatteryChargerControlsAndSOP
                state={state}
                readouts={readouts}
                faults={faults}
                onToggleBreaker={handleToggleBreaker}
                onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onSetLoad1={(kw) => setState((prev) => ({ ...prev, loadKw1: kw }))}
                onSetLoad2={(kw) => setState((prev) => ({ ...prev, loadKw2: kw }))}
                onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))}
                onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))}
                onToggleFault={handleToggleFault}
                onResetAll={handleResetAll}
                onSetTargetHighlight={setTargetHighlightKey}
              />
            </div>
          )}

          {/* CENTER PANEL: LARGE INTERACTIVE DUAL SLD (PRIMARY FOCUS) */}
          <div className="bg-[#060911] border border-[#1e293b] rounded-2xl flex flex-col h-full relative overflow-hidden shadow-2xl">
            <div className="w-full bg-[#0d1424]/90 border-b border-[#1e293b] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md z-20">
              <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                DUAL SLD SCHEMATIC WORKBENCH
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {leftPanelCollapsed ? '▶ Show Left' : '◀ Hide Left'}
                </button>

                <button
                  onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {rightPanelCollapsed ? '◀ Show Right' : '▶ Hide Right'}
                </button>

                <button
                  onClick={() => setShowWaveformsModal(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-white" />
                  <span>📊 Waveforms</span>
                </button>

                <button
                  onClick={handleToggleFullscreen}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                  <span>🖥️ Fullscreen</span>
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-2">
              <DualBatteryChargerSLD
                state={state}
                readouts={readouts}
                faults={faults}
                targetHighlightKey={targetHighlightKey}
                onToggleBreaker={handleToggleBreaker}
                onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))}
                onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))}
                onSetLoad1={(kw) => setState((prev) => ({ ...prev, loadKw1: kw }))}
                onSetLoad2={(kw) => setState((prev) => ({ ...prev, loadKw2: kw }))}
              />
            </div>
          </div>

          {/* RIGHT PANEL: LIVE MEASUREMENTS & WAVEFORMS */}
          {rightPanelCollapsed ? (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl select-none">
              <button
                onClick={() => setRightPanelCollapsed(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Expand Measurements & Waveforms"
              >
                <ChevronLeft className="w-5 h-5 text-emerald-400" />
              </button>
              <div className="writing-mode-vertical text-xs font-mono font-bold tracking-widest text-slate-400 uppercase rotate-180 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 rotate-90" />
                <span>MEASUREMENTS</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto shadow-xl scrollbar-none">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
                <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Measurements &amp; Waveforms
                </span>
                <button
                  onClick={() => setRightPanelCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Collapse Right Panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <DualBatteryChargerWaveforms state={state} readouts={readouts} compact={true} />
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            MOBILE VIEW CONTAINERS (SWITCHED VIA MOBILE BOTTOM NAV BAR)
            ============================================================ */}
        <div className="lg:hidden w-full h-full flex flex-col overflow-hidden pb-14">
          {mobileTab === 'sld' && (
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center p-1 bg-[#060911] border border-[#1e293b] rounded-2xl">
              <DualBatteryChargerSLD
                state={state}
                readouts={readouts}
                faults={faults}
                targetHighlightKey={targetHighlightKey}
                onToggleBreaker={handleToggleBreaker}
                onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))}
                onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))}
                onSetLoad1={(kw) => setState((prev) => ({ ...prev, loadKw1: kw }))}
                onSetLoad2={(kw) => setState((prev) => ({ ...prev, loadKw2: kw }))}
              />
            </div>
          )}

          {mobileTab === 'controls' && (
            <div className="w-full h-full overflow-y-auto p-3 flex flex-col gap-4 bg-[#0d1424] border border-[#1e293b] rounded-2xl">
              <DualBatteryChargerControlsAndSOP
                state={state}
                readouts={readouts}
                faults={faults}
                onToggleBreaker={handleToggleBreaker}
                onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                onSetLoad1={(kw) => setState((prev) => ({ ...prev, loadKw1: kw }))}
                onSetLoad2={(kw) => setState((prev) => ({ ...prev, loadKw2: kw }))}
                onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))}
                onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))}
                onToggleFault={handleToggleFault}
                onResetAll={handleResetAll}
              />
            </div>
          )}

          {mobileTab === 'measurements' && (
            <div className="w-full h-full overflow-y-auto p-3 flex flex-col gap-3 bg-[#0d1424] border border-[#1e293b] rounded-2xl font-mono text-xs">
              <h3 className="text-sm font-bold text-emerald-400 border-b border-[#1e293b] pb-2">
                📊 Detailed Telemetry &amp; Measurements
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">DC BUS 1 VOLTAGE</span>
                  <span className="text-base font-bold text-emerald-400">{readouts.vDcBus1.toFixed(1)} V</span>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">DC BUS 2 VOLTAGE</span>
                  <span className="text-base font-bold text-emerald-400">{readouts.vDcBus2.toFixed(1)} V</span>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">CHARGER 1A CURRENT</span>
                  <span className="text-base font-bold text-sky-400">{readouts.iChargerA.toFixed(1)} A</span>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">CHARGER 1B CURRENT</span>
                  <span className="text-base font-bold text-sky-400">{readouts.iChargerB.toFixed(1)} A</span>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">BATTERY 1 SOC</span>
                  <span className="text-base font-bold text-amber-400">{Math.round(state.soc1)}%</span>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">BATTERY 2 SOC</span>
                  <span className="text-base font-bold text-amber-400">{Math.round(state.soc2)}%</span>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'waveforms' && (
            <div className="w-full h-full overflow-y-auto p-2 bg-[#0d1424] border border-[#1e293b] rounded-2xl">
              <DualBatteryChargerWaveforms state={state} readouts={readouts} compact={false} />
            </div>
          )}

          {mobileTab === 'alarms' && (
            <div className="w-full h-full overflow-y-auto p-3 flex flex-col gap-3 bg-[#0d1424] border border-[#1e293b] rounded-2xl font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  <Bell className="w-4 h-4" /> Active Alarms &amp; Event History ({alarmLog.length})
                </h3>
                <button
                  onClick={() => setAlarmLog([])}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
                >
                  Clear History
                </button>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto">
                {alarmLog.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
                      log.level === 'TRIP'
                        ? 'bg-rose-950/60 border-rose-600/80 text-rose-200'
                        : log.level === 'WARNING'
                        ? 'bg-amber-950/60 border-amber-600/80 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-black/40">{log.level}</span>
                      <span className="text-slate-400">{log.time}</span>
                    </div>
                    <p className="font-sans leading-relaxed">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mobileTab === 'sop' && (
            <div className="w-full h-full overflow-y-auto p-3 flex flex-col gap-3 bg-[#0d1424] border border-[#1e293b] rounded-2xl font-mono text-xs">
              <h3 className="text-sm font-bold text-sky-400 border-b border-[#1e293b] pb-2">
                📋 Standard Operating Procedures (SOP)
              </h3>
              <div className="flex flex-col gap-2.5 font-sans text-xs text-slate-300 leading-relaxed">
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <strong className="text-white font-mono">1. Dual Redundant Normal Mode:</strong>
                  <p>Charger 1A feeds DC Bus 1; Charger 1B feeds DC Bus 2. Bus Tie MCCB is OPEN. Both battery banks float charge continuously.</p>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <strong className="text-white font-mono">2. Charger 1A Maintenance Outage Mode:</strong>
                  <p>Close DC Bus Tie MCCB first, then open Charger 1A MCCB. Charger 1B supplies both DC Bus 1 and Bus 2 smoothly.</p>
                </div>
                <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <strong className="text-white font-mono">3. Battery Emergency Shunt Trip:</strong>
                  <p>In case of thermal runaway or cell outgassing, activate Shunt Trip Coil to immediately isolate battery string.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            MOBILE FIELD BOTTOM NAVIGATION BAR (FIXED 44PX MIN TOUCH TARGETS)
            ============================================================ */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[52px] z-50 bg-[#0d1424] border-t border-[#1e293b] flex items-center justify-around px-1 shadow-2xl backdrop-blur-md">
          {[
            { id: 'sld', label: 'SLD', icon: Zap, color: 'text-emerald-400' },
            { id: 'controls', label: 'CONTROLS', icon: Sliders, color: 'text-blue-400' },
            { id: 'measurements', label: 'METERS', icon: Gauge, color: 'text-amber-400' },
            { id: 'waveforms', label: 'WAVES', icon: Activity, color: 'text-sky-400' },
            { id: 'alarms', label: 'ALARMS', icon: Bell, color: 'text-rose-400' },
            { id: 'sop', label: 'SOP', icon: FileText, color: 'text-purple-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id as any)}
                className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono font-bold cursor-pointer transition-all ${
                  isActive
                    ? `${tab.color} bg-slate-800/80 border-t-2 border-current`
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* FULLSCREEN OVERLAY MODAL */}
        {isFullScreen && (
          <div className="fixed inset-0 z-50 bg-[#060911] flex flex-col p-3 gap-2.5 select-none">
            <div className="bg-[#0d1424] border border-[#1e293b] p-2.5 rounded-xl flex items-center justify-between shadow-lg">
              <h2 className="font-extrabold text-sm text-white font-mono flex items-center gap-2">
                <span>🖥️ FULL-SCREEN DUAL CHARGER SIMULATOR WORKBENCH</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  IEEE 946 / IEC 62485
                </span>
              </h2>
              <button
                onClick={handleToggleFullscreen}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Fullscreen [Esc]</span>
              </button>
            </div>
            <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 min-h-0">
              <div className="bg-[#060911] border border-[#1e293b] rounded-2xl flex items-center justify-center p-2">
                <DualBatteryChargerSLD
                  state={state}
                  readouts={readouts}
                  faults={faults}
                  onToggleBreaker={handleToggleBreaker}
                  onToggleModeA={() => setState((prev) => ({ ...prev, modeA: prev.modeA === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                  onToggleModeB={() => setState((prev) => ({ ...prev, modeB: prev.modeB === 'FLOAT' ? 'BOOST' : 'FLOAT' }))}
                  onTripShunt1={() => setState((prev) => ({ ...prev, shuntTrip1Tripped: !prev.shuntTrip1Tripped }))}
                  onTripShunt2={() => setState((prev) => ({ ...prev, shuntTrip2Tripped: !prev.shuntTrip2Tripped }))}
                  onSetLoad1={(kw) => setState((prev) => ({ ...prev, loadKw1: kw }))}
                  onSetLoad2={(kw) => setState((prev) => ({ ...prev, loadKw2: kw }))}
                />
              </div>
              <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 overflow-y-auto">
                <DualBatteryChargerWaveforms state={state} readouts={readouts} compact={true} />
              </div>
            </div>
          </div>
        )}

        {showWaveformsModal && (
          <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none">
            <div className="bg-[#0d1424] border border-[#1e293b] p-3 rounded-xl flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                OSCILLOSCOPE &amp; MULTI-CHANNEL WAVEFORM ANALYZER
              </h2>
              <button
                onClick={() => setShowWaveformsModal(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#0d1424] border border-[#1e293b] p-4 rounded-xl">
              <DualBatteryChargerWaveforms state={state} readouts={readouts} compact={false} />
            </div>
          </div>
        )}

        {/* ACTION CONFIRMATION MODAL OVERLAY */}
        {pendingConfirmation && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-amber-500 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 font-mono text-xs text-slate-200 select-none">
              <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 text-amber-400 font-bold">
                <span className="text-xl">⚠️</span>
                <h3 className="text-sm font-extrabold">CONFIRM OPERATIONAL ACTION</h3>
              </div>

              <p className="text-xs text-white font-bold">
                {pendingConfirmation.title}
              </p>

              <div className="bg-[#070b14] p-3 rounded-xl border border-amber-500/40 text-amber-300 text-[11px] font-sans leading-relaxed">
                💡 <strong>Physical Consequence:</strong> {pendingConfirmation.consequence}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]">
                <button
                  onClick={() => setPendingConfirmation(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    pendingConfirmation.action();
                    setPendingConfirmation(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer shadow-md"
                >
                  CONFIRM ACTION
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
