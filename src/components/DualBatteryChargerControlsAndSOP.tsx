import React, { useState } from 'react';
import { DualBatteryChargerReadouts, DualBatteryChargerState } from '../types/dualBatteryCharger';
import { Sliders, RefreshCw, CheckCircle2, Shield, Zap, AlertTriangle, FileText, CheckSquare, Play, RotateCcw } from 'lucide-react';
import { InteractiveSOPWizard, SOPStepItem } from './InteractiveSOPWizard';

interface DualBatteryChargerControlsAndSOPProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  onToggleBreaker: (key: keyof DualBatteryChargerState) => void;
  onSetModeA: (mode: 'FLOAT' | 'BOOST' | 'OFF') => void;
  onSetModeB: (mode: 'FLOAT' | 'BOOST' | 'OFF') => void;
  onSetLoad1: (kw: number) => void;
  onSetLoad2: (kw: number) => void;
  onTripShunt1: () => void;
  onTripShunt2: () => void;
  onResetAll: () => void;
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
  onToggleBreaker,
  onSetModeA,
  onSetModeB,
  onSetLoad1,
  onSetLoad2,
  onTripShunt1,
  onTripShunt2,
  onResetAll,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'SOP'>('CONTROLS');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isSopCompleted, setIsSopCompleted] = useState<boolean>(false);

  const sopWizardSteps: SOPStepItem[] = DUAL_SOP_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    actionLabel: `Confirm Step ${s.id} Executed`,
  }));

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-2xl flex flex-col gap-5 font-mono select-none">
      {/* HEADER TABS */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('CONTROLS')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'CONTROLS'
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50'
                : 'bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            DUAL CHARGER OPERATIONAL CONTROLS
          </button>

          <button
            onClick={() => setActiveTab('SOP')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'SOP'
                ? 'bg-blue-950 border border-blue-500 text-blue-300 shadow-md shadow-blue-950/50'
                : 'bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            SUBSTATION SOP & OPERATING PROCEDURE ({completedSteps.length}/7)
          </button>
        </div>

        <button
          onClick={onResetAll}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          RESET SYSTEM
        </button>
      </div>

      {activeTab === 'CONTROLS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* COLUMN 1: CHARGER 1A CONTROLS */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> CHARGER 1A (220V/80A)
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px]">
                SYSTEM A
              </span>
            </div>

            {/* AC Incomer & Mode Buttons */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AC Supply A (415V):</span>
                <button
                  onClick={() => onToggleBreaker('acSupplyAOnline')}
                  className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    state.acSupplyAOnline
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-red-950 border-red-500 text-red-300'
                  }`}
                >
                  {state.acSupplyAOnline ? 'ONLINE (415V)' : 'OFF / OUTAGE'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Charger Mode:</span>
                <div className="flex items-center gap-1">
                  {(['FLOAT', 'BOOST', 'OFF'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onSetModeA(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        state.modeA === m
                          ? 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-[#161b22] border-[#30363d] text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Output MCCB (100A):</span>
                <button
                  onClick={() => onToggleBreaker('mccbChargerA')}
                  className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    state.mccbChargerA
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}
                >
                  {state.mccbChargerA ? 'CLOSED' : 'OPEN'}
                </button>
              </div>
            </div>

            {/* Active Modules & Telemetry */}
            <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Active Rectifiers:</span>
                <span className="text-emerald-400 font-bold">{readouts.activeModulesA} / 4 Modules</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>DC Output Voltage:</span>
                <span className="text-sky-300 font-bold">{readouts.vChargerA.toFixed(1)} VDC</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>DC Output Current:</span>
                <span className="text-emerald-400 font-bold">{readouts.iChargerA.toFixed(1)} A</span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: BUS TIE & DCDB LOADS CONTROLS */}
          <div className="p-4 bg-[#0d1117] border border-amber-500/40 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> BUS TIE & STATION LOADS
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                INTERCONNECTION
              </span>
            </div>

            {/* Bus Tie MCCB & DCDB Bus Coupler Toggles */}
            <div className="p-3 bg-amber-950/30 border border-amber-500/50 rounded-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-200">Main DC Bus Tie (125A MCCB):</span>
                <button
                  onClick={() => onToggleBreaker('mccbBusTie')}
                  className={`px-3 py-1 rounded text-xs font-black border transition-all ${
                    state.mccbBusTie
                      ? 'bg-amber-600 border-amber-400 text-white shadow-lg animate-pulse'
                      : 'bg-[#161b22] border-[#30363d] text-slate-400 hover:border-amber-500'
                  }`}
                >
                  {state.mccbBusTie ? 'CLOSED / ON' : 'NORMALLY OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-200">DCDB Bus Coupler Switch:</span>
                <button
                  onClick={() => onToggleBreaker('dcdbBusCoupler')}
                  className={`px-3 py-1 rounded text-xs font-black border transition-all ${
                    state.dcdbBusCoupler
                      ? 'bg-amber-600 border-amber-400 text-white shadow-lg animate-pulse'
                      : 'bg-[#161b22] border-[#30363d] text-slate-400 hover:border-amber-500'
                  }`}
                >
                  {state.dcdbBusCoupler ? 'CLOSED / ON' : 'NORMALLY OFF'}
                </button>
              </div>

              <p className="text-[10px] text-amber-300/80">
                Closing Bus Coupler Switch / Tie interconnects System A & B DC buses. Allows Charger 1B/1A to cross-feed both DCDB 1 and DCDB 2 during a supply outage!
              </p>
            </div>

            {/* DCDB 1 & 2 Load Sliders */}
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>DCDB 1 Station Load:</span>
                  <span className="text-emerald-400 font-bold">{state.loadKw1.toFixed(1)} kW (~{readouts.iDcBus1.toFixed(0)}A)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={state.loadKw1}
                  onChange={(e) => onSetLoad1(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#161b22] rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>DCDB 2 Station Load:</span>
                  <span className="text-cyan-400 font-bold">{state.loadKw2.toFixed(1)} kW (~{readouts.iDcBus2.toFixed(0)}A)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={state.loadKw2}
                  onChange={(e) => onSetLoad2(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-[#161b22] rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* COLUMN 3: CHARGER 1B CONTROLS */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> CHARGER 1B (220V/80A)
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                SYSTEM B
              </span>
            </div>

            {/* AC Incomer & Mode Buttons */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AC Supply B (415V):</span>
                <button
                  onClick={() => onToggleBreaker('acSupplyBOnline')}
                  className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    state.acSupplyBOnline
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-red-950 border-red-500 text-red-300'
                  }`}
                >
                  {state.acSupplyBOnline ? 'ONLINE (415V)' : 'OFF / OUTAGE'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Charger Mode:</span>
                <div className="flex items-center gap-1">
                  {(['FLOAT', 'BOOST', 'OFF'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onSetModeB(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        state.modeB === m
                          ? 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-[#161b22] border-[#30363d] text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Output MCCB (100A):</span>
                <button
                  onClick={() => onToggleBreaker('mccbChargerB')}
                  className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    state.mccbChargerB
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}
                >
                  {state.mccbChargerB ? 'CLOSED' : 'OPEN'}
                </button>
              </div>
            </div>

            {/* Active Modules & Telemetry */}
            <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Active Rectifiers:</span>
                <span className="text-emerald-400 font-bold">{readouts.activeModulesB} / 4 Modules</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>DC Output Voltage:</span>
                <span className="text-cyan-300 font-bold">{readouts.vChargerB.toFixed(1)} VDC</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>DC Output Current:</span>
                <span className="text-emerald-400 font-bold">{readouts.iChargerB.toFixed(1)} A</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD OPERATING PROCEDURE (SOP) PANEL EMBEDDED ON SAME SCREEN */
        <div className="flex flex-col gap-4">
          <InteractiveSOPWizard
            sopId="SOP-DUAL-BC-001"
            title="Substation Dual Float-cum-Boost Battery Charger SOP"
            standard="IEEE 1188 & IEC 62485-2 Substation Standard"
            steps={sopWizardSteps}
          />
        </div>
      )}
    </div>
  );
};
