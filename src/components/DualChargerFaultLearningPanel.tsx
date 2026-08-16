import React, { useState } from 'react';
import { DualChargerFaults, DualBatteryChargerReadouts, DualBatteryChargerState } from '../types/dualBatteryCharger';
import {
  ShieldAlert,
  AlertTriangle,
  ZapOff,
  Activity,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  BookOpen,
  X,
  Layers,
  ArrowRight,
  Shield,
  Gauge
} from 'lucide-react';

interface DualChargerFaultLearningPanelProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  faults: DualChargerFaults;
  onToggleFault: (key: keyof DualChargerFaults) => void;
  onResetFaults: () => void;
}

interface FaultDefinition {
  key: keyof DualChargerFaults;
  name: string;
  category: 'AC_SUPPLY' | 'CHARGER' | 'BATTERY' | 'DC_BUS' | 'LOAD';
  severity: 'TRIP' | 'CRITICAL' | 'WARNING';
  ieeeTag: string;
  description: string;
  stage1Fault: string;
  stage2Protection: string;
  stage3Impact: string;
  stage4Recovery: string;
  explanation: (state: DualBatteryChargerState, readouts: DualBatteryChargerReadouts) => string;
}

const FAULT_DEFINITIONS: FaultDefinition[] = [
  {
    key: 'acOutageA',
    name: '1. AC Supply A Failure (415V Outage)',
    category: 'AC_SUPPLY',
    severity: 'TRIP',
    ieeeTag: 'IEEE 27 (Undervoltage)',
    description: 'Complete loss of 3PH 415V AC incoming utility supply on System A.',
    stage1Fault: 'AC Supply A Phase Voltage drops from 415V to 0V AC.',
    stage2Protection: 'Undervoltage Relay 27-A trips. Charger 1A thyristor bridge de-energizes.',
    stage3Impact: 'Charger 1A output current drops to 0A. DC Bus 1 supported solely by Battery Bank 1.',
    stage4Recovery: 'If Bus Tie MCCB 125A is closed, Charger 1B takes over supply to both DC Bus 1 and Bus 2.',
    explanation: (s, r) =>
      `AC Supply A failed (0V). Undervoltage Relay 27-A tripped Charger 1A. Battery Bank 1 (${Math.round(s.soc1)}% SOC) is currently supplying DC Bus 1 (${r.vDcBus1.toFixed(1)}V) at ${Math.abs(r.iBatt1).toFixed(1)}A discharge. Close DC Bus Tie MCCB 125A to allow Charger 1B to feed both buses.`,
  },
  {
    key: 'acOutageB',
    name: '2. AC Supply B Failure (415V Outage)',
    category: 'AC_SUPPLY',
    severity: 'TRIP',
    ieeeTag: 'IEEE 27 (Undervoltage)',
    description: 'Complete loss of 3PH 415V AC incoming utility supply on System B.',
    stage1Fault: 'AC Supply B Phase Voltage drops from 415V to 0V AC.',
    stage2Protection: 'Undervoltage Relay 27-B trips. Charger 1B thyristor bridge de-energizes.',
    stage3Impact: 'Charger 1B output current drops to 0A. DC Bus 2 supported solely by Battery Bank 2.',
    stage4Recovery: 'If Bus Tie MCCB 125A is closed, Charger 1A takes over supply to both DC Bus 1 and Bus 2.',
    explanation: (s, r) =>
      `AC Supply B failed (0V). Undervoltage Relay 27-B tripped Charger 1B. Battery Bank 2 (${Math.round(s.soc2)}% SOC) is currently supplying DC Bus 2 (${r.vDcBus2.toFixed(1)}V) at ${Math.abs(r.iBatt2).toFixed(1)}A discharge. Close DC Bus Tie MCCB 125A to allow Charger 1A to feed both buses.`,
  },
  {
    key: 'moduleFailA',
    name: '3. Charger 1A Rectifier Module Failure',
    category: 'CHARGER',
    severity: 'WARNING',
    ieeeTag: 'IEEE 59 (Overvoltage / Load Share)',
    description: '2 of 4 high-frequency switch mode rectifier modules in Charger 1A trip offline.',
    stage1Fault: 'Internal power module fault trips 2 modules in Charger 1A.',
    stage2Protection: 'Controller MTM070K issues module alarm & derates maximum capacity from 80A to 40A.',
    stage3Impact: 'Output voltage remains regulated at 234V, but maximum continuous charging current is halved.',
    stage4Recovery: 'Replace faulty hot-swappable module MT220V/20A or start Charger 1B to assist.',
    explanation: (s, r) =>
      `Charger 1A module failure derated capacity to ${r.activeModulesA * 20}A (2 of 4 active). Output remains at ${r.vChargerA.toFixed(1)}V. Station load demand is ${r.iDcBus1.toFixed(1)}A. If demand exceeds 40A, Battery Bank 1 will assist.`,
  },
  {
    key: 'diodeAOpen',
    name: '4. Charger 1A Blocking Diode Open Circuit',
    category: 'CHARGER',
    severity: 'TRIP',
    ieeeTag: 'IEEE 46 (Reverse Current / Diode Protection)',
    description: 'Blocking Diode MR 150A fails open-circuit on Charger 1A output.',
    stage1Fault: 'Blocking diode semiconductor junction opens, breaking output path.',
    stage2Protection: 'Output isolator interlock detects infinite impedance path.',
    stage3Impact: 'Charger 1A generates 234V internally, but 0A flows to DC Bus 1. Bus 1 drops to battery voltage.',
    stage4Recovery: 'Bypass faulty diode assembly or transfer station load to Charger 1B via Bus Tie.',
    explanation: (s, r) =>
      `Blocking Diode A failed open circuit. Charger 1A output is disconnected from DC Bus 1 (${r.vDcBus1.toFixed(1)}V). DC Bus 1 is powered by Battery Bank 1 (${Math.round(s.soc1)}% SOC). Replace blocking diode MR 150A.`,
  },
  {
    key: 'dcBusShort1',
    name: '5. DC Bus 1 Bolted Short Circuit (0V)',
    category: 'DC_BUS',
    severity: 'CRITICAL',
    ieeeTag: 'IEEE 50/51 (Instantaneous Overcurrent)',
    description: 'Low-impedance short circuit fault directly across positive and negative bars of DC Bus 1.',
    stage1Fault: 'Bolted short circuit fault occurs on DC Bus 1 bar.',
    stage2Protection: 'High instantaneous fault current (>500A) trips Charger 1A MCCB and Battery 1 MCCB instantly.',
    stage3Impact: 'DC Bus 1 voltage collapses to 0V (Total Blackout on DCDB 1).',
    stage4Recovery: 'Isolate faulted Bus 1 section, verify insulation, then clear fault and reset breakers.',
    explanation: (s, r) =>
      `CRITICAL: Bolted short circuit on DC Bus 1! Instantaneous Overcurrent Relay 50 tripped Charger 1A MCCB and Battery 1 MCCB to prevent catastrophic busbar damage. DC Bus 1 is de-energized (0V). Clear bus fault before resetting.`,
  },
  {
    key: 'groundFaultBus1Pos',
    name: '6A. DC Bus 1 Positive (+VE) Earth Fault (Relay 64G / 89G)',
    category: 'DC_BUS',
    severity: 'WARNING',
    ieeeTag: 'IEEE 64G / 89G (Ground Insulation Fault)',
    description: 'Positive busbar 1 insulation drops to earth ground in ungrounded floating DC system.',
    stage1Fault: 'Insulation breakdown on Positive DC Bus 1 rail.',
    stage2Protection: 'Ground Fault Relay ANSI 64 / 89G detects V_L1+ -> 0V and V_L1- -> -220V.',
    stage3Impact: 'System stays powered at 220V DC. Relay 64G triggers visual & audible alarm.',
    stage4Recovery: 'Locate and clear positive cable insulation ground fault.',
    explanation: (s, r) =>
      `DC Bus 1 Positive Earth Fault active. Floating system maintains 220V across DC Bus 1 (${r.vDcBus1.toFixed(1)}V). V_L1+ = 0V, V_L1- = -${r.vDcBus1.toFixed(1)}V. Relay 89G Alarm active.`,
  },
  {
    key: 'groundFaultBus1Neg',
    name: '6B. DC Bus 1 Negative (-VE) Earth Fault (Relay 64G / 89G)',
    category: 'DC_BUS',
    severity: 'WARNING',
    ieeeTag: 'IEEE 64G / 89G (Ground Insulation Fault)',
    description: 'Negative busbar 1 insulation drops to earth ground in ungrounded floating DC system.',
    stage1Fault: 'Insulation breakdown on Negative DC Bus 1 rail.',
    stage2Protection: 'Ground Fault Relay ANSI 64 / 89G detects V_L1- -> 0V and V_L1+ -> +220V.',
    stage3Impact: 'System stays powered at 220V DC. Relay 64G triggers visual & audible alarm.',
    stage4Recovery: 'Locate and clear negative cable insulation ground fault.',
    explanation: (s, r) =>
      `DC Bus 1 Negative Earth Fault active. Floating system maintains 220V across DC Bus 1 (${r.vDcBus1.toFixed(1)}V). V_L1- = 0V, V_L1+ = +${r.vDcBus1.toFixed(1)}V. Relay 89G Alarm active.`,
  },
  {
    key: 'groundFaultBus1',
    name: '6C. DC Bus 1 General Earth Insulation Fault',
    category: 'DC_BUS',
    severity: 'WARNING',
    ieeeTag: 'IEEE 64G (Ground Insulation Fault)',
    description: 'Positive busbar insulation resistance drops below 10kΩ to earth ground.',
    stage1Fault: 'Insulation breakdown creates low-resistance path to station ground grid.',
    stage2Protection: 'Ground Fault Leakage Monitor Relay 64G trips alarm contact (no trip).',
    stage3Impact: 'DC Bus 1 voltage remains 234V, but earth fault alarm alerts operators to risk of double-ground short.',
    stage4Recovery: 'Use DC feeder insulation tracer to locate and isolate grounded cable branch.',
    explanation: (s, r) =>
      `Ground Insulation Relay 64G activated on DC Bus 1. Positive pole resistance to earth is <10kΩ. DC Bus 1 remains operational at ${r.vDcBus1.toFixed(1)}V, but immediate tracing is required to prevent a secondary negative ground fault.`,
  },
  {
    key: 'load1Trip',
    name: '7. DCDB 1 Downstream Load Short Circuit',
    category: 'LOAD',
    severity: 'TRIP',
    ieeeTag: 'IEEE 50 (Feeder Overcurrent)',
    description: 'Heavy short circuit on downstream switchgear control or trip circuit feeders.',
    stage1Fault: 'Downstream feeder short circuit draws excessive fault current from DC Bus 1.',
    stage2Protection: 'DCDB 1 feeder MCCB 125A trips on magnetic instant element.',
    stage3Impact: 'DCDB 1 downstream loads isolated. Main DC Bus 1 remains healthy at 234V.',
    stage4Recovery: 'Clear faulted downstream feeder branch, then reset DCDB 1 MCCB.',
    explanation: (s, r) =>
      `DCDB 1 Downstream Feeder Short Circuit! Feeder protection MCCB 125A tripped to isolate the faulted branch. DC Bus 1 remains healthy at ${r.vDcBus1.toFixed(1)}V. Clear load short before re-closing feeder MCCB.`,
  },
  {
    key: 'overloadCondition',
    name: '8. Station Heavy DC Overload Demand (>68A)',
    category: 'LOAD',
    severity: 'WARNING',
    ieeeTag: 'IEEE 49 (Thermal Overload)',
    description: 'Simultaneous station load demand exceeds rated output capacity of single charger.',
    stage1Fault: 'Station demand rises to 15kW (68A at 220VDC).',
    stage2Protection: 'Charger 1A operates at 100% current limit (80A max). Thermal overload alarm activates.',
    stage3Impact: 'Charger 1A & Battery 1 share load current. Battery 1 assists if demand exceeds 80A.',
    stage4Recovery: 'Start Charger 1B and close Bus Tie MCCB to share total station demand across both chargers.',
    explanation: (s, r) =>
      `Station Overload Warning! Demand is ${r.iDcBus1.toFixed(1)}A on Bus 1 and ${r.iDcBus2.toFixed(1)}A on Bus 2. Charger 1A output is ${r.iChargerA.toFixed(1)}A. Start Charger 1B and close DC Bus Tie MCCB 125A for load sharing.`,
  },
];

export const DualChargerFaultLearningPanel: React.FC<DualChargerFaultLearningPanelProps> = ({
  state,
  readouts,
  faults,
  onToggleFault,
  onResetFaults,
}) => {
  const [selectedFaultKey, setSelectedFaultKey] = useState<keyof DualChargerFaults | null>('acOutageA');
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);

  const activeFaultsCount = Object.values(faults).filter(Boolean).length;
  const currentFaultDef = FAULT_DEFINITIONS.find((f) => f.key === selectedFaultKey) || FAULT_DEFINITIONS[0];

  return (
    <div className="flex flex-col gap-4 font-mono text-xs text-slate-100 select-none">
      
      {/* FAULT SIMULATION HEADER */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-950 border border-rose-500/50 rounded-xl text-rose-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white tracking-wider flex items-center gap-2">
              FAULT SIMULATION &amp; LEARNING MODE
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              IEEE 946 / IEC 62485 Substation Fault Matrix &amp; Protection Response Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFaultsCount > 0 && (
            <button
              onClick={onResetFaults}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CLEAR ALL FAULTS ({activeFaultsCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* FAULT MATRIX SELECTION BUTTONS */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3 shadow-md">
        <span className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Select Fault Scenario to Inject:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {FAULT_DEFINITIONS.map((f) => {
            const isActive = faults[f.key];
            const isSelected = selectedFaultKey === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  onToggleFault(f.key);
                  setSelectedFaultKey(f.key);
                }}
                className={`p-2.5 rounded-xl text-left font-mono transition-all cursor-pointer border flex flex-col gap-1 ${
                  isActive
                    ? 'bg-rose-950 border-rose-500 text-white shadow-lg animate-pulse'
                    : isSelected
                    ? 'bg-[#161f32] border-blue-500 text-blue-300'
                    : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="truncate">{f.name}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] ${isActive ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {isActive ? 'ACTIVE' : 'INJECT'}
                  </span>
                </div>
                <span className="text-[9px] text-amber-400 font-sans truncate">{f.ieeeTag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-STAGE ELECTRICAL EVENT PROGRESSION TRACKER */}
      {currentFaultDef && (
        <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-amber-400">{currentFaultDef.name}</span>
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-mono">
                {currentFaultDef.ieeeTag}
              </span>
            </div>

            <button
              onClick={() => setShowExplanationModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md border border-emerald-400"
            >
              <BookOpen className="w-4 h-4" />
              <span>🎓 Explain What Happened</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {currentFaultDef.description}
          </p>

          {/* 4-STAGE PIPELINE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
            {/* STAGE 1 */}
            <div className="bg-[#070b14] p-3 rounded-xl border border-rose-900/60 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                🚨 STAGE 1: FAULT INJECTED
              </span>
              <p className="text-[11px] font-sans text-slate-300 leading-normal">
                {currentFaultDef.stage1Fault}
              </p>
            </div>

            {/* STAGE 2 */}
            <div className="bg-[#070b14] p-3 rounded-xl border border-amber-900/60 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                ⚡ STAGE 2: PROTECTION ACTION
              </span>
              <p className="text-[11px] font-sans text-slate-300 leading-normal">
                {currentFaultDef.stage2Protection}
              </p>
            </div>

            {/* STAGE 3 */}
            <div className="bg-[#070b14] p-3 rounded-xl border border-sky-900/60 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                📊 STAGE 3: SYSTEM RESPONSE
              </span>
              <p className="text-[11px] font-sans text-slate-300 leading-normal">
                {currentFaultDef.stage3Impact}
              </p>
            </div>

            {/* STAGE 4 */}
            <div className="bg-[#070b14] p-3 rounded-xl border border-emerald-900/60 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                🔄 STAGE 4: RECOVERY &amp; CHANGEOVER
              </span>
              <p className="text-[11px] font-sans text-slate-300 leading-normal">
                {currentFaultDef.stage4Recovery}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* "EXPLAIN WHAT HAPPENED" MODAL */}
      {showExplanationModal && currentFaultDef && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1424] border-2 border-emerald-500 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs text-slate-200 select-none">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-lg">
                  🎓
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">ENGINEERING FAULT EXPLANATION</h3>
                  <p className="text-[11px] text-amber-400">{currentFaultDef.name} ({currentFaultDef.ieeeTag})</p>
                </div>
              </div>

              <button
                onClick={() => setShowExplanationModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-[#070b14] p-4 rounded-xl border border-emerald-500/40 font-sans text-xs text-slate-200 leading-relaxed flex flex-col gap-3">
              <span className="font-bold text-emerald-400 font-mono text-[11px]">
                LIVE PHYSICS ENGINE DIAGNOSTIC EXPLANATION:
              </span>
              <p>{currentFaultDef.explanation(state, readouts)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#070b14] p-3 rounded-xl border border-slate-800">
              <div>DC BUS 1: <strong className="text-emerald-400">{readouts.vDcBus1.toFixed(1)} V</strong></div>
              <div>DC BUS 2: <strong className="text-emerald-400">{readouts.vDcBus2.toFixed(1)} V</strong></div>
              <div>BATTERY 1 SOC: <strong className="text-amber-400">{Math.round(state.soc1)}%</strong></div>
              <div>BATTERY 2 SOC: <strong className="text-amber-400">{Math.round(state.soc2)}%</strong></div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1e293b]">
              <button
                onClick={() => setShowExplanationModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
              >
                Got It (Return to Simulation)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
