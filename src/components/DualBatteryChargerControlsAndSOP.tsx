import React, { useState } from 'react';
import { DualBatteryChargerReadouts, DualBatteryChargerState, DualChargerFaults } from '../types/dualBatteryCharger';
import {
  Sliders,
  RefreshCw,
  Zap,
  AlertTriangle,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity,
  Shield,
  ShieldAlert,
  Gauge,
  Layers,
  Settings2,
  CheckCircle2,
  XCircle,
  Radio
} from 'lucide-react';
import { InteractiveSOPWizard, SOPStepItem } from './InteractiveSOPWizard';
import { DualChargerFaultLearningPanel } from './DualChargerFaultLearningPanel';
import { InteractiveSOPDrillManager } from './InteractiveSOPDrillManager';

interface DualBatteryChargerControlsAndSOPProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  faults?: DualChargerFaults;
  onToggleBreaker: (key: keyof DualBatteryChargerState) => void;
  onToggleModeA: () => void;
  onToggleModeB: () => void;
  onSetModeA?: (mode: 'FLOAT' | 'BOOST' | 'OFF') => void;
  onSetModeB?: (mode: 'FLOAT' | 'BOOST' | 'OFF') => void;
  onSetLoad1?: (kw: number) => void;
  onSetLoad2?: (kw: number) => void;
  onTripShunt1: () => void;
  onTripShunt2: () => void;
  onToggleFault?: (key: keyof DualChargerFaults) => void;
  onResetAll?: () => void;
  onSetTargetHighlight?: (key: string | undefined) => void;
}

interface SOPStep {
  id: number;
  category: 'STARTUP' | 'EMERGENCY' | 'BOOST' | 'TEST';
  title: string;
  description: string;
}

const DUAL_SOP_STEPS: SOPStep[] = [
  {
    id: 1,
    category: 'STARTUP',
    title: '1. Verify AC Supply A & B Phase Voltages (415V ±10%)',
    description: 'Ensure incoming AC supplies A and B are healthy before energizing 80A MCCB incomers.',
  },
  {
    id: 2,
    category: 'STARTUP',
    title: '2. Energize Charger 1A & 1B Rectifier Module MCBs (16A)',
    description: 'Close MCBs 1A..4A and 1B..4B. Confirm controllers MTM070K boot up in FLOAT mode (234.15V).',
  },
  {
    id: 3,
    category: 'STARTUP',
    title: '3. Close Charger Output MCCBs (100A) & Verify Diode Polarity',
    description: 'Confirm blocking diodes MR 150A prevent backfeeding. Verify DC Bus-1 and Bus-2 at 234.15V.',
  },
  {
    id: 4,
    category: 'STARTUP',
    title: '4. Connect Battery Banks 1 & 2 (125A MCCB & 160A Shunt Box)',
    description: 'Verify charging current IBATT < 0.1C (10A for 100AH VRLA bank). Confirm DCDB 1 & 2 energized.',
  },
  {
    id: 5,
    category: 'EMERGENCY',
    title: '5. Single Charger Backup Transfer via Bus Tie Coupler (MCCB 125A)',
    description: 'If AC Supply A or Charger 1A fails, close Bus Tie MCCB 125A so Charger 1B feeds BOTH DCDB 1 & 2.',
  },
  {
    id: 6,
    category: 'BOOST',
    title: '6. Boost / Equalizing Charge on Battery Bank 1 (246.75V)',
    description: 'Set Charger 1A to BOOST. Ensure blocking diode keeps DCDB 1 within limits while equalizing cells.',
  },
  {
    id: 7,
    category: 'TEST',
    title: '7. Battery Room Emergency Shunt Trip Test (MCCB 160A)',
    description: 'Simulate thermal runaway / hydrogen detection trip on Battery MCCB Box outside battery room.',
  },
];

export const DualBatteryChargerControlsAndSOP: React.FC<DualBatteryChargerControlsAndSOPProps> = ({
  state,
  readouts,
  faults,
  onToggleBreaker,
  onToggleModeA,
  onToggleModeB,
  onSetModeA,
  onSetModeB,
  onSetLoad1,
  onSetLoad2,
  onTripShunt1,
  onTripShunt2,
  onToggleFault,
  onResetAll,
  onSetTargetHighlight,
}) => {
  type SmartControlTab = 'operations' | 'faults' | 'sop' | 'diagnostics';
  const [activeTab, setActiveTab] = useState<SmartControlTab>('operations');

  const activeFaultsCount = faults ? Object.values(faults).filter(Boolean).length : 0;
  const isBlackout = readouts.vDcBus1 < 50 && readouts.vDcBus2 < 50;

  return (
    <div className="flex flex-col gap-2 font-mono text-xs text-slate-100 select-none h-full">
      
      {/* SCADA HMI HEADER PANEL */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-blue-400">
            <Radio className="w-3 h-3 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-[11px] text-white tracking-wider leading-none">
              SCADA CONTROL CONSOLE
            </h3>
            <p className="text-[8.5px] text-slate-400 font-sans mt-0.5">
              IEEE 946 / IEC 62485 220VDC Workstation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
              isBlackout
                ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                : 'bg-emerald-950 text-emerald-400 border-emerald-800'
            }`}
          >
            {isBlackout ? '🚨 BLACKOUT' : '⚡ HEALTHY'}
          </span>
          {onResetAll && (
            <button
              onClick={onResetAll}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
              title="Reset System to Nominal State"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* SMART COMPACT 4-TAB NAVIGATION SELECTOR */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#0b101c] border border-[#1e293b] rounded-lg shrink-0 text-[10.5px] font-bold">
        <button
          onClick={() => setActiveTab('operations')}
          className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
            activeTab === 'operations'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Core Operations & Breakers"
        >
          <Zap className="w-3 h-3 shrink-0" />
          <span className="truncate">Operate</span>
        </button>

        <button
          onClick={() => setActiveTab('faults')}
          className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer truncate relative ${
            activeTab === 'faults'
              ? 'bg-rose-700 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Fault Matrix & Protection Response"
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="truncate">Faults</span>
          {activeFaultsCount > 0 && (
            <span className="px-1 rounded-full text-[8.5px] bg-rose-500 text-white font-black animate-pulse">
              {activeFaultsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sop')}
          className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
            activeTab === 'sop'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="SOP Training Drills"
        >
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate">SOP</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`py-1.5 px-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
            activeTab === 'diagnostics'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="System Diagnostics & Rectifiers"
        >
          <Gauge className="w-3 h-3 shrink-0" />
          <span className="truncate">Diag</span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: CORE OPERATIONS (BREAKER SWITCHING & LOADS)
          ============================================================ */}
      {activeTab === 'operations' && (
        <div className="flex flex-col gap-1.5 flex-1">
          {/* COMPACT TELEMETRY STRIP */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#0b101c] p-1.5 rounded-lg border border-[#1e293b]">
            <div className="bg-[#070b14] px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
              <span className="text-[9.5px] text-slate-400">BUS 1:</span>
              <span className={`text-[11.5px] font-black ${readouts.vDcBus1 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {readouts.vDcBus1.toFixed(1)}V <span className="text-[9px] font-normal text-slate-400">({readouts.iDcBus1.toFixed(0)}A)</span>
              </span>
            </div>

            <div className="bg-[#070b14] px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
              <span className="text-[9.5px] text-slate-400">BUS 2:</span>
              <span className={`text-[11.5px] font-black ${readouts.vDcBus2 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {readouts.vDcBus2.toFixed(1)}V <span className="text-[9px] font-normal text-slate-400">({readouts.iDcBus2.toFixed(0)}A)</span>
              </span>
            </div>

            <div className="bg-[#070b14] px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
              <span className="text-[9.5px] text-slate-400">BATT 1:</span>
              <span className="text-[11px] font-bold text-amber-400">
                {Math.round(state.soc1)}% <span className="text-[9px] font-normal text-slate-400">({readouts.iBatt1 >= 0 ? `+${readouts.iBatt1.toFixed(1)}` : readouts.iBatt1.toFixed(1)}A)</span>
              </span>
            </div>

            <div className="bg-[#070b14] px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
              <span className="text-[9.5px] text-slate-400">BATT 2:</span>
              <span className="text-[11px] font-bold text-amber-400">
                {Math.round(state.soc2)}% <span className="text-[9px] font-normal text-slate-400">({readouts.iBatt2 >= 0 ? `+${readouts.iBatt2.toFixed(1)}` : readouts.iBatt2.toFixed(1)}A)</span>
              </span>
            </div>
          </div>

          {/* CHARGER 1A & CHARGER 1B PARALLEL CARDS */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* CHARGER 1A */}
            <div className="bg-[#0d1424] p-2 rounded-lg border border-sky-900/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-extrabold text-[10.5px] text-sky-300">⚡ CHG 1A (80A)</span>
                <span className={`px-1 py-0.2 rounded text-[8.5px] font-bold ${readouts.vChargerA > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                  {readouts.vChargerA > 0 ? state.modeA : 'OFF'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onToggleBreaker('acSupplyAOnline')}
                  className={`w-full py-1 rounded font-bold text-[10px] border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                    state.acSupplyAOnline ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-rose-950 border-rose-600 text-rose-300'
                  }`}
                  title="Toggle AC Supply A (415V)"
                >
                  AC: {state.acSupplyAOnline ? '⚡ 415V ON' : '🔴 OFF'}
                </button>

                <button
                  onClick={() => onToggleBreaker('mccbChargerA')}
                  className={`w-full py-1 rounded font-bold text-[10px] border cursor-pointer transition-all ${
                    state.mccbChargerA ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Output MCCB 100A"
                >
                  MCCB: {state.mccbChargerA ? 'CLOSED' : 'OPEN'}
                </button>
              </div>

              <div className="flex items-center gap-1 pt-0.5">
                {(['FLOAT', 'BOOST'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onSetModeA ? onSetModeA(m) : onToggleModeA()}
                    className={`flex-1 py-0.5 rounded text-[9px] font-bold border cursor-pointer transition-all ${
                      state.modeA === m ? 'bg-sky-600 border-sky-400 text-white shadow-sm' : 'bg-[#161f32] border-slate-700 text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* CHARGER 1B */}
            <div className="bg-[#0d1424] p-2 rounded-lg border border-cyan-900/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-extrabold text-[10.5px] text-cyan-300">⚡ CHG 1B (80A)</span>
                <span className={`px-1 py-0.2 rounded text-[8.5px] font-bold ${readouts.vChargerB > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                  {readouts.vChargerB > 0 ? state.modeB : 'OFF'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onToggleBreaker('acSupplyBOnline')}
                  className={`w-full py-1 rounded font-bold text-[10px] border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                    state.acSupplyBOnline ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-rose-950 border-rose-600 text-rose-300'
                  }`}
                  title="Toggle AC Supply B (415V)"
                >
                  AC: {state.acSupplyBOnline ? '⚡ 415V ON' : '🔴 OFF'}
                </button>

                <button
                  onClick={() => onToggleBreaker('mccbChargerB')}
                  className={`w-full py-1 rounded font-bold text-[10px] border cursor-pointer transition-all ${
                    state.mccbChargerB ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Output MCCB 100A"
                >
                  MCCB: {state.mccbChargerB ? 'CLOSED' : 'OPEN'}
                </button>
              </div>

              <div className="flex items-center gap-1 pt-0.5">
                {(['FLOAT', 'BOOST'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onSetModeB ? onSetModeB(m) : onToggleModeB()}
                    className={`flex-1 py-0.5 rounded text-[9px] font-bold border cursor-pointer transition-all ${
                      state.modeB === m ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm' : 'bg-[#161f32] border-slate-700 text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DC BUS TIE & COUPLER INTERCONNECT */}
          <div className="bg-amber-950/25 border border-amber-500/40 p-2 rounded-lg flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-200 text-[10.5px] flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-amber-400" />
                BUS TIE MCCB (125A):
              </span>
              <button
                onClick={() => onToggleBreaker('mccbBusTie')}
                className={`px-2.5 py-1 rounded text-[10px] font-black border transition-all cursor-pointer ${
                  state.mccbBusTie
                    ? 'bg-amber-600 border-amber-400 text-white shadow-sm animate-pulse'
                    : 'bg-[#161f32] border-slate-700 text-slate-400 hover:border-amber-500'
                }`}
              >
                {state.mccbBusTie ? '🔒 CLOSED (TIED)' : '🔓 NORMALLY OPEN'}
              </button>
            </div>

            <div className="flex items-center justify-between text-[9.5px] text-amber-300/90 pt-1 border-t border-amber-900/40">
              <span>DCDB COUPLER SWITCH:</span>
              <button
                onClick={() => onToggleBreaker('dcdbBusCoupler')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer transition-all ${
                  state.dcdbBusCoupler
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-[#161f32] border-slate-700 text-slate-400'
                }`}
              >
                {state.dcdbBusCoupler ? 'CLOSED' : 'OPEN'}
              </button>
            </div>
          </div>

          {/* BATTERY STRINGS (PARALLEL 2 COLUMNS) */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#0d1424] p-2 rounded-lg border border-slate-800 flex flex-col gap-1">
              <span className="font-extrabold text-slate-300 text-[9.5px]">🔋 BATT 1 (100AH)</span>
              <button
                onClick={() => onToggleBreaker('mccbBattery1_160A')}
                className={`py-1 rounded font-bold text-[9.5px] border cursor-pointer ${
                  state.mccbBattery1_160A ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {state.mccbBattery1_160A ? '⚡ MCCB CLOSED' : 'OFFLINE'}
              </button>
              <button
                onClick={onTripShunt1}
                className="py-0.5 rounded font-bold text-[8.5px] bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 cursor-pointer"
              >
                {state.shuntTrip1Tripped ? '🔄 Reset Shunt' : '🚨 Trip Shunt'}
              </button>
            </div>

            <div className="bg-[#0d1424] p-2 rounded-lg border border-slate-800 flex flex-col gap-1">
              <span className="font-extrabold text-slate-300 text-[9.5px]">🔋 BATT 2 (100AH)</span>
              <button
                onClick={() => onToggleBreaker('mccbBattery2_160A')}
                className={`py-1 rounded font-bold text-[9.5px] border cursor-pointer ${
                  state.mccbBattery2_160A ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {state.mccbBattery2_160A ? '⚡ MCCB CLOSED' : 'OFFLINE'}
              </button>
              <button
                onClick={onTripShunt2}
                className="py-0.5 rounded font-bold text-[8.5px] bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 cursor-pointer"
              >
                {state.shuntTrip2Tripped ? '🔄 Reset Shunt' : '🚨 Trip Shunt'}
              </button>
            </div>
          </div>

          {/* DCDB STATION LOADS */}
          <div className="bg-[#0d1424] p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5">
            <div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                <span>DCDB 1 Load:</span>
                <span className="text-emerald-400 font-bold">{state.loadKw1.toFixed(1)} kW</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={state.loadKw1}
                onChange={(e) => onSetLoad1 ? onSetLoad1(parseFloat(e.target.value)) : onToggleBreaker('loadKw1' as any)}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#161f32] rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                <span>DCDB 2 Load:</span>
                <span className="text-cyan-400 font-bold">{state.loadKw2.toFixed(1)} kW</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={state.loadKw2}
                onChange={(e) => onSetLoad2 ? onSetLoad2(parseFloat(e.target.value)) : onToggleBreaker('loadKw2' as any)}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-[#161f32] rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: FAULT SIMULATION & PROTECTION MATRIX
          ============================================================ */}
      {activeTab === 'faults' && faults && onToggleFault && (
        <div className="flex-1 flex flex-col">
          <DualChargerFaultLearningPanel
            state={state}
            readouts={readouts}
            faults={faults}
            onToggleFault={onToggleFault}
            onResetFaults={onResetAll || (() => {})}
          />
        </div>
      )}

      {/* ============================================================
          TAB 3: SUBSTATION OPERATING PROCEDURES (SOP DRILLS)
          ============================================================ */}
      {activeTab === 'sop' && (
        <div className="flex-1 flex flex-col">
          <InteractiveSOPDrillManager
            state={state}
            readouts={readouts}
            onToggleBreaker={onToggleBreaker}
            onSetTargetHighlight={onSetTargetHighlight}
          />
        </div>
      )}

      {/* ============================================================
          TAB 4: ADVANCED DIAGNOSTICS & SYSTEM METRICS
          ============================================================ */}
      {activeTab === 'diagnostics' && (
        <div className="flex flex-col gap-2 flex-1 text-[10px] font-mono text-slate-300">
          <div className="bg-[#0b101c] p-2.5 rounded-lg border border-[#1e293b] flex flex-col gap-2">
            <span className="font-extrabold text-[11px] text-emerald-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              SYSTEM MODULE HEALTH &amp; TELEMETRY
            </span>
            <div className="bg-[#070b14] p-2 rounded border border-slate-800 flex justify-between items-center">
              <span>Charger 1A Rectifiers:</span>
              <strong className="text-emerald-400">{readouts.activeModulesA} / 4 Active (N+1)</strong>
            </div>
            <div className="bg-[#070b14] p-2 rounded border border-slate-800 flex justify-between items-center">
              <span>Charger 1B Rectifiers:</span>
              <strong className="text-emerald-400">{readouts.activeModulesB} / 4 Active (N+1)</strong>
            </div>
            <div className="bg-[#070b14] p-2 rounded border border-slate-800 flex justify-between items-center">
              <span>SCADA Modbus RTU:</span>
              <strong className="text-emerald-400">ONLINE (Node 0x0A &amp; 0x0B)</strong>
            </div>
            <div className="bg-[#070b14] p-2 rounded border border-slate-800 flex justify-between items-center">
              <span>DC Ground Symmetry:</span>
              <strong className={readouts.vDcBus1 > 200 ? 'text-emerald-400' : 'text-amber-400'}>
                {readouts.vDcBus1 > 200 ? 'BALANCED (±110V to GND)' : 'ASYMMETRIC'}
              </strong>
            </div>
          </div>

          <div className="bg-[#0d1424] p-2.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-sans leading-relaxed">
            <strong className="text-slate-200 font-mono">IEEE 946 / IEC 62485 Specification:</strong>
            <p className="mt-1">
              The station 220VDC ungrounded floating DC system ensures total immunity to single pole-to-ground faults. Dual chargers operate in Float mode at 234.15V DC with auto-boost equalizing capability.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
