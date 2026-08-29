import React from 'react';
import { SoftStarterParams, SoftStarterReadouts, SoftStarterFaults } from '../types/softStarter';
import { Cpu, Zap, ShieldAlert, ChevronDown } from 'lucide-react';

interface SoftStarterControlsAndSOPProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  faults?: SoftStarterFaults;
  isRunning: boolean;
  isTrip: boolean;
  learningLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  onUpdateParams: (newParams: Partial<SoftStarterParams>) => void;
  onStart: () => void;
  onStop: () => void;
  onJog?: () => void;
  onTriggerFault?: (key: keyof SoftStarterFaults) => void;
}

export const SoftStarterControlsAndSOP: React.FC<SoftStarterControlsAndSOPProps> = ({
  params,
  readouts,
  faults,
  isRunning,
  isTrip,
  learningLevel = 'BEGINNER',
  onUpdateParams,
  onStart,
  onStop,
  onTriggerFault,
}) => {
  const initialV = params.initialVoltagePct ?? 40;
  const rampTime = params.rampTimeSec ?? 15;
  const currentLimit = params.currentLimitPct ?? 350;
  const motorKw = params.motorPowerKw ?? 160;

  // Live starting torque calculation Te_start = 150% * (V_start / 100)^2
  const teStartPct = Math.round(150 * Math.pow(initialV / 100, 2));

  // Determine active fault selection
  const activeFaultKey = faults?.scrShort
    ? 'scrShort'
    : faults?.overcurrent
    ? 'overcurrent'
    : faults?.startTimeout
    ? 'startTimeout'
    : faults?.phaseLoss
    ? 'phaseLoss'
    : 'none';

  const handleFaultSelect = (val: string) => {
    if (!onTriggerFault) return;
    if (val === 'none') return;
    onTriggerFault(val as keyof SoftStarterFaults);
  };

  const isBeginner = learningLevel === 'BEGINNER';
  const isIntermediate = learningLevel === 'INTERMEDIATE';
  const isExpert = learningLevel === 'EXPERT';

  return (
    <div id="ss-left-panel" className="w-full flex flex-col gap-3 font-mono text-xs select-none">
      {/* ========================================================================= */}
      {/* ACCORDION 1: MOTOR & SUPPLY (Visible in Intermediate & Expert Modes)     */}
      {/* ========================================================================= */}
      {(isIntermediate || isExpert) && (
        <details open className="group bg-[#0d131f] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
          <summary className="p-3 bg-[#121a29] border-b border-[#1e293b] text-cyan-300 font-extrabold text-xs flex items-center justify-between cursor-pointer hover:bg-[#1a2538] transition-colors min-h-[44px]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>⚡ 1. Motor &amp; Grid Supply</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="p-3 flex flex-col gap-3">
            {/* Motor Rating Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px] font-bold">Motor Rating:</label>
              <select
                value={motorKw}
                onChange={(e) => onUpdateParams({ motorPowerKw: Number(e.target.value) })}
                className="w-full bg-[#070a10] border border-[#1e293b] text-cyan-300 font-extrabold rounded-xl px-3 min-h-[44px] h-[44px] focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={55}>55kW 100A (3-Phase AC)</option>
                <option value={90}>90kW 160A (3-Phase AC)</option>
                <option value={160}>160kW 269A (Nominal 415V)</option>
                <option value={250}>250kW 420A (Heavy Duty)</option>
              </select>
            </div>

            {/* Grid Supply Voltage (Readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px] font-bold">Grid Supply:</label>
              <div className="w-full bg-[#070a10] border border-[#1e293b] rounded-xl px-3 flex items-center justify-between min-h-[44px] h-[44px] text-cyan-400 font-bold">
                <span>415V 50Hz 3-Phase AC</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">READONLY</span>
              </div>
            </div>

            {/* Load Application Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px] font-bold">Load Type:</label>
              <select
                value={params.loadType || 'CENTRIFUGAL_PUMP'}
                onChange={(e) => onUpdateParams({ loadType: e.target.value as any })}
                className="w-full bg-[#070a10] border border-[#1e293b] text-cyan-300 font-extrabold rounded-xl px-3 min-h-[44px] h-[44px] focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="CENTRIFUGAL_PUMP">Centrifugal Pump (Quad Load)</option>
                <option value="HIGH_INERTIA_FAN">Boiler ID Fan (High Inertia)</option>
                <option value="LOADED_CONVEYOR">Conveyor (Constant Torque)</option>
              </select>
            </div>
          </div>
        </details>
      )}

      {/* ========================================================================= */}
      {/* ACCORDION 2: RAMP SETUP & PARAMETERS                                     */}
      {/* ========================================================================= */}
      <details open className="group bg-[#0d131f] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
        <summary className="p-3 bg-[#121a29] border-b border-[#1e293b] text-[#00e5a0] font-extrabold text-xs flex items-center justify-between cursor-pointer hover:bg-[#1a2538] transition-colors min-h-[44px]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00e5a0]" />
            <span>🚀 {isBeginner ? '1. Soft Starter Ramp Controls' : '2. Ramp Setup & Parameters'}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>

        <div className="p-3 flex flex-col gap-3">
          {/* Initial Voltage V_start Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-[11px] font-bold flex items-center justify-between">
              <span>Initial Voltage (V_start):</span>
              {isBeginner && <span className="text-[#00e5a0] text-[10px]">Controls Starting Torque</span>}
            </label>
            <select
              value={initialV}
              onChange={(e) => onUpdateParams({ initialVoltagePct: Number(e.target.value) })}
              className="w-full bg-[#070a10] border border-[#1e293b] text-[#00e5a0] font-extrabold rounded-xl px-3 min-h-[44px] h-[44px] focus:outline-none focus:border-[#00e5a0] cursor-pointer"
            >
              <option value={20}>20% (83V - Light Start)</option>
              <option value={30}>30% (124V - Standard Fan)</option>
              <option value={40}>40% (166V - Standard Pump)</option>
              <option value={50}>50% (207V - Heavy Pump)</option>
              <option value={60}>60% (249V - High Breakaway)</option>
            </select>
          </div>

          {/* Ramp Time t_ramp Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-[11px] font-bold">Ramp Time (t_ramp):</label>
            <select
              value={rampTime}
              onChange={(e) => onUpdateParams({ rampTimeSec: Number(e.target.value) })}
              className="w-full bg-[#070a10] border border-[#1e293b] text-[#00e5a0] font-extrabold rounded-xl px-3 min-h-[44px] h-[44px] focus:outline-none focus:border-[#00e5a0] cursor-pointer"
            >
              <option value={5}>5 seconds (Fast Ramp)</option>
              <option value={10}>10 seconds (Standard)</option>
              <option value={15}>15 seconds (Nominal Pump)</option>
              <option value={20}>20 seconds (Heavy Fan)</option>
              <option value={30}>30 seconds (High Inertia)</option>
            </select>
          </div>

          {/* Current Limit I_limit Dropdown (Visible in Intermediate & Expert Modes) */}
          {(isIntermediate || isExpert) && (
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px] font-bold">Current Limit (I_limit):</label>
              <select
                value={currentLimit}
                onChange={(e) => onUpdateParams({ currentLimitPct: Number(e.target.value) })}
                className="w-full bg-[#070a10] border border-[#1e293b] text-amber-300 font-extrabold rounded-xl px-3 min-h-[44px] h-[44px] focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value={250}>250% FLA (Weak Grid Clamp)</option>
                <option value={300}>300% FLA (Standard Pump)</option>
                <option value={350}>350% FLA (Heavy Pump)</option>
                <option value={400}>400% FLA (High Torque Start)</option>
              </select>
            </div>
          )}

          {/* Live Starting Torque Readout Badge & Beginner Tooltip */}
          <div className="p-2.5 bg-[#070a10] border border-[#00e5a0]/40 rounded-xl text-center text-xs font-mono font-extrabold text-[#00e5a0] shadow-sm flex flex-col items-center justify-center min-h-[44px]">
            <span>Te_start = {teStartPct}% of DOL (Te ∝ V²)</span>
            {isBeginner && (
              <span className="text-[10px] text-cyan-300 font-sans font-normal mt-0.5">
                💡 V_start controls starting torque Te ∝ V²
              </span>
            )}
          </div>
        </div>
      </details>

      {/* ========================================================================= */}
      {/* ACCORDION 3: FAULT INJECTION MATRIX (Visible in Expert Mode Only)        */}
      {/* ========================================================================= */}
      {isExpert && (
        <details open className="group bg-[#0d131f] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
          <summary className="p-3 bg-[#121a29] border-b border-[#1e293b] text-red-400 font-extrabold text-xs flex items-center justify-between cursor-pointer hover:bg-[#1a2538] transition-colors min-h-[44px]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>🛡️ 3. Fault Injection Matrix</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="p-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px] font-bold">Inject Fault Condition:</label>
              <select
                value={activeFaultKey}
                onChange={(e) => handleFaultSelect(e.target.value)}
                className="w-full bg-[#070a10] border border-red-500/40 text-red-300 font-extrabold rounded-xl px-3 min-h-[44px] h-[44px] focus:outline-none focus:border-red-400 cursor-pointer"
              >
                <option value="none">No Fault (Normal Operation)</option>
                <option value="scrShort">T1 Short Circuit (SCR Short)</option>
                <option value="startTimeout">T1 Open Circuit (Start Timeout)</option>
                <option value="phaseLoss">Phase L1 Loss (Single Phasing)</option>
                <option value="scrShort">Bypass Weld (KM1 Short)</option>
                <option value="overcurrent">Overload Trip (&gt;500% FLA)</option>
              </select>
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

export default SoftStarterControlsAndSOP;
