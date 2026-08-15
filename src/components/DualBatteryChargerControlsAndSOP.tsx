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
}) => {
  // ACCORDION COLLAPSE STATES (Essential sections open by default, Advanced hidden)
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    telemetry: true,
    chargers: true,
    bustie: true,
    batteryLoad: true,
    faults: false,
    advanced: false,
    sop: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sopWizardSteps: SOPStepItem[] = DUAL_SOP_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    actionLabel: `Confirm Step ${s.id} Executed`,
  }));

  const isBlackout = readouts.vDcBus1 < 50 && readouts.vDcBus2 < 50;

  return (
    <div className="flex flex-col gap-3 font-mono text-xs text-slate-100 select-none">
      
      {/* SCADA HMI HEADER PANEL */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
              SCADA HMI CONTROL CONSOLE
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              IEEE 946 / IEC 62485 Substation Workstation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isBlackout
                ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                : 'bg-emerald-950 text-emerald-400 border-emerald-800'
            }`}
          >
            {isBlackout ? '🚨 BLACKOUT' : '⚡ OPERATIONAL'}
          </span>
          {onResetAll && (
            <button
              onClick={onResetAll}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
              title="Reset System to Nominal State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          SECTION 1: SYSTEM OVERVIEW & TELEMETRY
          ============================================================ */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => toggleSection('telemetry')}
          className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
        >
          <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4" />
            1. SYSTEM TELEMETRY OVERVIEW
          </span>
          {openSections.telemetry ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.telemetry && (
          <div className="p-3 grid grid-cols-2 gap-2 bg-[#070b14]">
            <div className="bg-[#0d1424] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">DC BUS 1 VOLTAGE</span>
              <div className="flex items-baseline justify-between">
                <span className={`text-base font-black ${readouts.vDcBus1 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {readouts.vDcBus1.toFixed(1)} <span className="text-xs font-normal text-slate-400">V</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{readouts.iDcBus1.toFixed(0)}A Load</span>
              </div>
            </div>

            <div className="bg-[#0d1424] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">DC BUS 2 VOLTAGE</span>
              <div className="flex items-baseline justify-between">
                <span className={`text-base font-black ${readouts.vDcBus2 > 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {readouts.vDcBus2.toFixed(1)} <span className="text-xs font-normal text-slate-400">V</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{readouts.iDcBus2.toFixed(0)}A Load</span>
              </div>
            </div>

            <div className="bg-[#0d1424] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">BATTERY 1 STRING</span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-amber-400">{Math.round(state.soc1)}% SOC</span>
                <span className="text-[10px] text-slate-400">{readouts.iBatt1 > 0 ? `+${readouts.iBatt1.toFixed(1)}A` : `${readouts.iBatt1.toFixed(1)}A`}</span>
              </div>
            </div>

            <div className="bg-[#0d1424] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">BATTERY 2 STRING</span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-amber-400">{Math.round(state.soc2)}% SOC</span>
                <span className="text-[10px] text-slate-400">{readouts.iBatt2 > 0 ? `+${readouts.iBatt2.toFixed(1)}A` : `${readouts.iBatt2.toFixed(1)}A`}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 2: CHARGER CONTROLS (CHARGER A & CHARGER B)
          ============================================================ */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => toggleSection('chargers')}
          className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
        >
          <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            2. CHARGER MODULE CONTROLS (A &amp; B)
          </span>
          {openSections.chargers ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.chargers && (
          <div className="p-3 flex flex-col gap-3 bg-[#070b14]">
            
            {/* CHARGER A CONTROL CARD */}
            <div className="bg-[#0d1424] p-3 rounded-xl border border-sky-900/60 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-xs text-sky-300 flex items-center gap-1">
                  ⚡ CHARGER 1A (220V/80A)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${readouts.vChargerA > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                  {readouts.vChargerA > 0 ? `RUNNING (${state.modeA})` : 'STANDBY / OFF'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px]">AC SUPPLY A (415V):</span>
                  <button
                    onClick={() => onToggleBreaker('acSupplyAOnline')}
                    className={`w-full py-1.5 rounded-lg font-bold border cursor-pointer transition-all ${
                      state.acSupplyAOnline ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-rose-950 border-rose-600 text-rose-300'
                    }`}
                  >
                    {state.acSupplyAOnline ? '⚡ ONLINE' : '🔴 OFFLINE'}
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px]">OUTPUT MCCB (100A):</span>
                  <button
                    onClick={() => onToggleBreaker('mccbChargerA')}
                    className={`w-full py-1.5 rounded-lg font-bold border cursor-pointer transition-all ${
                      state.mccbChargerA ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {state.mccbChargerA ? 'CLOSED' : 'OPEN'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400 text-[10px]">OPERATING MODE:</span>
                <div className="flex items-center gap-1">
                  {(['FLOAT', 'BOOST'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onSetModeA ? onSetModeA(m) : onToggleModeA()}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                        state.modeA === m ? 'bg-sky-600 border-sky-400 text-white shadow' : 'bg-[#161f32] border-slate-700 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CHARGER B CONTROL CARD */}
            <div className="bg-[#0d1424] p-3 rounded-xl border border-cyan-900/60 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-xs text-cyan-300 flex items-center gap-1">
                  ⚡ CHARGER 1B (220V/80A)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${readouts.vChargerB > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                  {readouts.vChargerB > 0 ? `RUNNING (${state.modeB})` : 'STANDBY / OFF'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px]">AC SUPPLY B (415V):</span>
                  <button
                    onClick={() => onToggleBreaker('acSupplyBOnline')}
                    className={`w-full py-1.5 rounded-lg font-bold border cursor-pointer transition-all ${
                      state.acSupplyBOnline ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-rose-950 border-rose-600 text-rose-300'
                    }`}
                  >
                    {state.acSupplyBOnline ? '⚡ ONLINE' : '🔴 OFFLINE'}
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px]">OUTPUT MCCB (100A):</span>
                  <button
                    onClick={() => onToggleBreaker('mccbChargerB')}
                    className={`w-full py-1.5 rounded-lg font-bold border cursor-pointer transition-all ${
                      state.mccbChargerB ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {state.mccbChargerB ? 'CLOSED' : 'OPEN'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400 text-[10px]">OPERATING MODE:</span>
                <div className="flex items-center gap-1">
                  {(['FLOAT', 'BOOST'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onSetModeB ? onSetModeB(m) : onToggleModeB()}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                        state.modeB === m ? 'bg-cyan-600 border-cyan-400 text-white shadow' : 'bg-[#161f32] border-slate-700 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 3: BUS INTERCONNECTION & TIE CONTROL
          ============================================================ */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => toggleSection('bustie')}
          className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
        >
          <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            3. DC BUS TIE &amp; INTERCONNECTION
          </span>
          {openSections.bustie ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.bustie && (
          <div className="p-3 flex flex-col gap-3 bg-[#070b14]">
            <div className="bg-amber-950/30 border border-amber-500/50 p-3 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200 text-[11px]">DC BUS TIE MCCB 125A:</span>
                <button
                  onClick={() => onToggleBreaker('mccbBusTie')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    state.mccbBusTie
                      ? 'bg-amber-600 border-amber-400 text-white shadow-lg animate-pulse'
                      : 'bg-[#161f32] border-slate-700 text-slate-400 hover:border-amber-500'
                  }`}
                >
                  {state.mccbBusTie ? '🔒 CLOSED (INTERCONNECTED)' : '🔓 NORMALLY OPEN'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-amber-900/40 text-[10px] text-amber-300">
                <span>DCDB COUPLER SWITCH:</span>
                <button
                  onClick={() => onToggleBreaker('dcdbBusCoupler')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    state.dcdbBusCoupler
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-[#161f32] border-slate-700 text-slate-400'
                  }`}
                >
                  {state.dcdbBusCoupler ? 'CLOSED' : 'OPEN'}
                </button>
              </div>

              <p className="text-[10px] font-sans text-amber-200/80 leading-relaxed">
                Closing Bus Tie interconnects DC Bus 1 &amp; Bus 2. Allows a single active charger to supply both DC distribution boards during maintenance or utility loss.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 4: BATTERY STRINGS & LOAD DEMAND
          ============================================================ */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => toggleSection('batteryLoad')}
          className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
        >
          <span className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            4. BATTERY STRINGS &amp; LOAD DEMAND
          </span>
          {openSections.batteryLoad ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.batteryLoad && (
          <div className="p-3 flex flex-col gap-3 bg-[#070b14]">
            
            {/* BATTERY STRINGS CONTROL */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#0d1424] p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-slate-300 text-[10px]">BATTERY BANK 1</span>
                <button
                  onClick={() => onToggleBreaker('mccbBattery1_160A')}
                  className={`py-1 rounded-lg font-bold text-[10px] border cursor-pointer ${
                    state.mccbBattery1_160A ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {state.mccbBattery1_160A ? '⚡ MCCB CLOSED' : 'OFFLINE'}
                </button>
                <button
                  onClick={onTripShunt1}
                  className="py-1 rounded-lg font-bold text-[9px] bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 cursor-pointer"
                >
                  {state.shuntTrip1Tripped ? '🔄 Reset Shunt' : '🚨 Trip Shunt 1'}
                </button>
              </div>

              <div className="bg-[#0d1424] p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-slate-300 text-[10px]">BATTERY BANK 2</span>
                <button
                  onClick={() => onToggleBreaker('mccbBattery2_160A')}
                  className={`py-1 rounded-lg font-bold text-[10px] border cursor-pointer ${
                    state.mccbBattery2_160A ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {state.mccbBattery2_160A ? '⚡ MCCB CLOSED' : 'OFFLINE'}
                </button>
                <button
                  onClick={onTripShunt2}
                  className="py-1 rounded-lg font-bold text-[9px] bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 cursor-pointer"
                >
                  {state.shuntTrip2Tripped ? '🔄 Reset Shunt' : '🚨 Trip Shunt 2'}
                </button>
              </div>
            </div>

            {/* STATION LOAD SLIDERS */}
            <div className="bg-[#0d1424] p-2.5 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>DCDB 1 Station Load:</span>
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
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>DCDB 2 Station Load:</span>
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
      </div>

      {/* ============================================================
          SECTION 5: FAULT INJECTION LABORATORY (COLLAPSIBLE)
          ============================================================ */}
      {faults && onToggleFault && (
        <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
          <button
            onClick={() => toggleSection('faults')}
            className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
          >
            <span className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              5. FAULT INJECTION LABORATORY
            </span>
            {openSections.faults ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.faults && (
            <div className="p-3 grid grid-cols-2 gap-2 bg-[#070b14]">
              {[
                { key: 'acOutageA', name: 'AC Outage A' },
                { key: 'acOutageB', name: 'AC Outage B' },
                { key: 'moduleFailA', name: 'Module Fail A' },
                { key: 'moduleFailB', name: 'Module Fail B' },
                { key: 'groundFaultBus1', name: '64G Earth 1' },
                { key: 'groundFaultBus2', name: '64G Earth 2' },
                { key: 'diodeAOpen', name: 'Diode Open A' },
                { key: 'diodeBOpen', name: 'Diode Open B' },
              ].map((f) => {
                const isActive = (faults as any)[f.key];
                return (
                  <button
                    key={f.key}
                    onClick={() => onToggleFault(f.key as any)}
                    className={`p-2 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                      isActive ? 'bg-rose-950 border-rose-600 text-rose-300 shadow-md' : 'bg-[#0d1424] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isActive ? '🚨 ' : '⚪ '}{f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SECTION 6: ADVANCED DIAGNOSTICS & MODULE CONTROL (COLLAPSED BY DEFAULT)
          ============================================================ */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => toggleSection('advanced')}
          className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
        >
          <span className="font-bold text-xs text-slate-400 flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-slate-400" />
            6. ADVANCED DIAGNOSTICS &amp; MODULES (HIDDEN)
          </span>
          {openSections.advanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.advanced && (
          <div className="p-3 flex flex-col gap-2 bg-[#070b14] text-[10px] font-mono text-slate-300">
            <div className="bg-[#0d1424] p-2 rounded-lg border border-slate-800 flex justify-between">
              <span>Charger 1A Active Rectifiers:</span>
              <strong className="text-emerald-400">{readouts.activeModulesA} / 4 Modules</strong>
            </div>
            <div className="bg-[#0d1424] p-2 rounded-lg border border-slate-800 flex justify-between">
              <span>Charger 1B Active Rectifiers:</span>
              <strong className="text-emerald-400">{readouts.activeModulesB} / 4 Modules</strong>
            </div>
            <div className="bg-[#0d1424] p-2 rounded-lg border border-slate-800 flex justify-between">
              <span>SCADA Modbus RTU Status:</span>
              <strong className="text-emerald-400">ONLINE (Node 0x0A &amp; 0x0B)</strong>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 7: SUBSTATION OPERATING PROCEDURE (SOP) WIZARD
          ============================================================ */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => toggleSection('sop')}
          className="w-full bg-[#161f32] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1c2840] transition-colors border-b border-[#1e293b]"
        >
          <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            7. SUBSTATION OPERATING PROCEDURE (SOP)
          </span>
          {openSections.sop ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.sop && (
          <div className="p-3 bg-[#070b14]">
            <InteractiveSOPWizard
              sopId="SOP-DUAL-BC-001"
              title="Substation Dual Float-cum-Boost Battery Charger SOP"
              standard="IEEE 1188 & IEC 62485-2 Substation Standard"
              steps={sopWizardSteps}
            />
          </div>
        )}
      </div>

    </div>
  );
};
