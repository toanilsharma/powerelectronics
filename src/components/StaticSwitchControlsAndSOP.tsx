import React, { useState } from 'react';
import { ActiveSource, STSTransferMode } from '../types/staticSwitch';
import { InteractiveSOPWizard, SOPStepItem } from './InteractiveSOPWizard';
import { Play, CheckCircle2, ShieldCheck } from 'lucide-react';

interface StaticSwitchControlsAndSOPProps {
  v1?: number;
  onV1Change?: (val: number) => void;
  f1?: number;
  onF1Change?: (val: number) => void;
  phase1?: number;
  onPhase1Change?: (val: number) => void;

  v2?: number;
  onV2Change?: (val: number) => void;
  f2?: number;
  onF2Change?: (val: number) => void;
  phase2?: number;
  onPhase2Change?: (val: number) => void;

  voltTolerance?: number;
  onVoltToleranceChange?: (val: number) => void;
  freqTolerance?: number;
  onFreqToleranceChange?: (val: number) => void;
  phaseTolerance?: number;
  onPhaseToleranceChange?: (val: number) => void;

  phaseBOffset: number;
  onPhaseBChange: (val: number) => void;
  freqBOffset: number;
  onFreqBChange: (val: number) => void;
  voltageBOffset: number;
  onVoltageBChange: (val: number) => void;

  nominalVoltageRating?: '110V' | '220V';
  onSelectNominalVoltage?: (voltage: '110V' | '220V') => void;

  transferMode: STSTransferMode;
  onToggleTransferMode: () => void;

  activeBridge: ActiveSource;
  isSyncOk: boolean;

  onTransferToB: () => void;
  onTransferToA: () => void;
  onEmergencyTransfer: () => void;

  q3Closed?: boolean;
  onToggleQ3?: () => void;
  bypassSource?: 'A' | 'B';
  onSelectBypassSource?: (source: 'A' | 'B') => void;
}

export const StaticSwitchControlsAndSOP: React.FC<StaticSwitchControlsAndSOPProps> = ({
  v1 = 220,
  onV1Change,
  f1 = 60.0,
  onF1Change,
  phase1 = 0,
  onPhase1Change,
  v2 = 220,
  onV2Change,
  f2 = 60.0,
  onF2Change,
  phase2 = 0,
  onPhase2Change,
  voltTolerance = 5.0,
  onVoltToleranceChange,
  freqTolerance = 0.10,
  onFreqToleranceChange,
  phaseTolerance = 5.0,
  onPhaseToleranceChange,
  phaseBOffset,
  onPhaseBChange,
  freqBOffset,
  onFreqBChange,
  voltageBOffset,
  onVoltageBChange,
  nominalVoltageRating = '220V',
  onSelectNominalVoltage,
  transferMode,
  onToggleTransferMode,
  activeBridge,
  isSyncOk,
  onTransferToB,
  onTransferToA,
  onEmergencyTransfer,
  q3Closed = false,
  onToggleQ3,
  bypassSource = 'A',
  onSelectBypassSource,
}) => {
  // SOP Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isSopCompleted, setIsSopCompleted] = useState<boolean>(false);

  const sopWizardSteps: SOPStepItem[] = [
    {
      id: 1,
      title: '1. Verify Source B Power Supply Availability',
      description: 'Check that Source B voltage and frequency offsets are within IEC 62040-3 tolerance limits before initiating transfer.',
      actionLabel: 'Confirm Source B Healthy',
    },
    {
      id: 2,
      title: '2. Check Synchroscope & Phase Match (Δθ < 5°)',
      description: 'Ensure Synchroscope indicates PERMISSIVE OK with Phase angle delta < 5° and frequency delta < 0.10Hz.',
      actionLabel: 'Confirm Synchronization OK',
    },
    {
      id: 3,
      title: '3. Select Preferred Maintenance Bypass Feed Source',
      description: 'Set Maintenance Bypass Feed selector to preferred source (Source A or B) prior to closing 52-Q3 breaker.',
      actionLabel: 'Confirm Bypass Source Selected',
    },
    {
      id: 4,
      title: '4. Notify Central Control Room (CCR)',
      description: 'Obtain CCR clearance and notify operations team of planned static switch maintenance bypass transfer.',
      actionLabel: 'Confirm Clearance Obtained',
    },
    {
      id: 5,
      title: '5. Close 52-Q3 Maintenance Bypass Breaker',
      description: 'Close 52-Q3 mechanical breaker to establish parallel maintenance bypass path across the static switch.',
      actionLabel: 'Close Breaker 52-Q3 & Confirm',
      onExecute: () => {
        if (onToggleQ3 && !q3Closed) onToggleQ3();
      },
    },
    {
      id: 6,
      title: '6. Open SCR Module Breakers 52-QA & 52-QB',
      description: 'Safely open upstream input breakers 52-QA and 52-QB to isolate SCR power semiconductor modules.',
      actionLabel: 'Open 52-QA/52-QB & Isolate SCRs',
    },
    {
      id: 7,
      title: '7. Verify Continuous Uninterrupted Power Flow',
      description: 'Confirm load current remains 100% energized via 52-Q3 path with zero bus voltage dip.',
      actionLabel: 'Confirm Load Bus Energized',
    },
    {
      id: 8,
      title: '8. Log Maintenance Bypass Transfer Event',
      description: 'Record transfer event timestamp, load current, and operator signature in substation digital log sheet.',
      actionLabel: 'Log Event & Complete SOP',
    },
  ];

  return (
    <div className="relative w-full bg-[#161b22] border border-[#30363d] rounded-lg p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 select-none font-mono">
      {/* ================= LEFT SIDE: CONTROL PANEL ================= */}
      <div className="flex flex-col gap-4 border-r-0 lg:border-r border-[#30363d] pr-0 lg:pr-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
          <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-wider flex items-center gap-2">
            ⚙️ Static Switch Control Panel & Parameters
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">
            ACTIVE: {activeBridge === 'A' ? 'SRC A (SCR)' : activeBridge === 'B' ? 'SRC B (SCR)' : activeBridge === 'BOTH' ? 'COMMUTATING' : 'BYPASS Q3'}
          </span>
        </div>

        {/* 1-CLICK STANDARD GRID DISTURBANCE SCENARIOS (RECOMMENDATION 5) */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0d1117] border border-amber-500/40 rounded-lg">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-amber-400">
              ⚡ 1-Click Grid Disturbance Scenarios:
            </span>
            <span className="text-[9px] text-slate-400 font-mono">Test STS Sub-cycle Transfer</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10.5px] font-mono font-bold">
            <button
              type="button"
              onClick={() => {
                onV2Change?.(220);
                onF2Change?.(60.0);
                onPhase2Change?.(0);
                onVoltageBChange?.(0);
                onFreqBChange?.(0);
                onPhaseBChange?.(0);
              }}
              className="p-1.5 rounded bg-[#161b22] hover:bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-center cursor-pointer transition-all shadow-sm"
              title="Source B in full sync with Source A"
            >
              ✓ Normal Sync
            </button>
            <button
              type="button"
              onClick={() => {
                onV2Change?.(176);
                onVoltageBChange?.(-20);
              }}
              className="p-1.5 rounded bg-[#161b22] hover:bg-amber-950/60 border border-amber-500/40 text-amber-300 text-center cursor-pointer transition-all shadow-sm"
              title="Source B Voltage Sag (-20% / 176V)"
            >
              ⚠️ Sag (-20%)
            </button>
            <button
              type="button"
              onClick={() => {
                onV2Change?.(253);
                onVoltageBChange?.(15);
              }}
              className="p-1.5 rounded bg-[#161b22] hover:bg-amber-950/60 border border-amber-500/40 text-amber-300 text-center cursor-pointer transition-all shadow-sm"
              title="Source B Voltage Swell (+15% / 253V)"
            >
              ⚡ Swell (+15%)
            </button>
            <button
              type="button"
              onClick={() => {
                onPhase2Change?.(30);
                onPhaseBChange?.(30);
              }}
              className="p-1.5 rounded bg-[#161b22] hover:bg-rose-950/60 border border-rose-500/40 text-rose-300 text-center cursor-pointer transition-all shadow-sm"
              title="Source B Phase Jump (+30° out-of-phase)"
            >
              🔄 Phase (+30°)
            </button>
            <button
              type="button"
              onClick={() => {
                onF2Change?.(58.5);
                onFreqBChange?.(-1.5);
              }}
              className="p-1.5 rounded bg-[#161b22] hover:bg-purple-950/60 border border-purple-500/40 text-purple-300 text-center cursor-pointer transition-all shadow-sm"
              title="Source B Frequency Drift to 58.5 Hz"
            >
              📉 Freq (58.5Hz)
            </button>
          </div>
        </div>

        {/* 0. DUAL INPUT AC POWER SOURCE SLIDERS (INPUT 1 & INPUT 2) */}
        <div className="flex flex-col gap-3.5 bg-[#0d1117] border border-[#30363d] rounded-md p-3.5">
          <div className="flex justify-between items-center text-xs sm:text-sm text-[#c9d1d9] border-b border-slate-800 pb-2">
            <span className="font-extrabold flex items-center gap-1.5 text-sky-400">
              <span>⚡</span> Input Power Source Sliders (Input 1 & Input 2)
            </span>
            <span className="text-xs font-mono text-[#3fb950] font-bold bg-[#022c22] px-2 py-0.5 rounded border border-[#00ff88]/40">
              Vout = Vin ({nominalVoltageRating})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* INPUT 1 (SOURCE A) SLIDERS */}
            <div className="flex flex-col gap-3 bg-[#161b22] p-3.5 rounded-lg border border-[#21262d]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-xs sm:text-sm">
                <span className="font-extrabold text-emerald-400">⚡ Input 1 (Source A)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">Preferred</span>
              </div>

              {/* V1 Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span className="text-[#8b949e]">Voltage (V1):</span>
                  <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">{v1.toFixed(0)} V AC</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="1"
                  value={v1}
                  onChange={(e) => onV1Change?.(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500 my-0.5"
                />
              </div>

              {/* f1 Slider (0 to 100 Hz, default 60 Hz) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span className="text-[#8b949e]">Frequency (f1):</span>
                  <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">{f1.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={f1}
                  onChange={(e) => onF1Change?.(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500 my-0.5"
                />
              </div>

              {/* Phase 1 Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span className="text-[#8b949e]">Phase Angle (θ1):</span>
                  <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">{phase1 >= 0 ? '+' : ''}{phase1.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={phase1}
                  onChange={(e) => onPhase1Change?.(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500 my-0.5"
                />
              </div>
            </div>

            {/* INPUT 2 (SOURCE B) SLIDERS */}
            <div className="flex flex-col gap-3 bg-[#161b22] p-3.5 rounded-lg border border-[#21262d]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-xs sm:text-sm">
                <span className="font-extrabold text-cyan-400">⚡ Input 2 (Source B)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">Alternate</span>
              </div>

              {/* V2 Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span className="text-[#8b949e]">Voltage (V2):</span>
                  <span className="font-extrabold text-cyan-400 text-xs sm:text-sm">{v2.toFixed(0)} V AC</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="1"
                  value={v2}
                  onChange={(e) => onV2Change?.(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500 my-0.5"
                />
              </div>

              {/* f2 Slider (0 to 100 Hz, default 60 Hz) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span className="text-[#8b949e]">Frequency (f2):</span>
                  <span className="font-extrabold text-cyan-400 text-xs sm:text-sm">{f2.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={f2}
                  onChange={(e) => onF2Change?.(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500 my-0.5"
                />
              </div>

              {/* Phase 2 Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#8b949e]">Phase Angle (θ2):</span>
                  <span className="font-extrabold text-cyan-400 text-xs">{phase2 >= 0 ? '+' : ''}{phase2.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={phase2}
                  onChange={(e) => onPhase2Change?.(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* OEM SYNC TOLERANCE RANGE INPUTS CARD (ANSI 25 RELAY) */}
          <div className="flex flex-col gap-2 bg-[#161b22] p-2.5 rounded-lg border border-[#21262d] mt-1">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1 text-xs font-bold text-[#c9d1d9]">
              <span className="flex items-center gap-1 text-amber-400">
                🛡️ ANSI 25 Sync Permissive Tolerance Limits
              </span>
              <span className="text-[9px] text-slate-400 font-mono">OEM Standard Permissible Range</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* Voltage Tol Limit */}
              <div className="flex flex-col gap-0.5 bg-[#0d1117] p-1.5 rounded border border-[#21262d]">
                <span className="text-[#8b949e] text-[9px] font-bold">Volt ΔV Limit:</span>
                <div className="flex items-center gap-0.5">
                  <span className="text-amber-400 font-bold text-[10px]">±</span>
                  <input
                    type="number"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={voltTolerance}
                    onChange={(e) => onVoltToleranceChange?.(Math.max(0.5, Math.min(15, Number(e.target.value))))}
                    className="w-full bg-[#161b22] border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400 text-[9px]">%</span>
                </div>
              </div>

              {/* Freq Tol Limit */}
              <div className="flex flex-col gap-0.5 bg-[#0d1117] p-1.5 rounded border border-[#21262d]">
                <span className="text-[#8b949e] text-[9px] font-bold">Freq Δf Limit:</span>
                <div className="flex items-center gap-0.5">
                  <span className="text-amber-400 font-bold text-[10px]">±</span>
                  <input
                    type="number"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={freqTolerance}
                    onChange={(e) => onFreqToleranceChange?.(Math.max(0.01, Math.min(1.0, Number(e.target.value))))}
                    className="w-full bg-[#161b22] border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400 text-[9px]">Hz</span>
                </div>
              </div>

              {/* Phase Angle Tol Limit */}
              <div className="flex flex-col gap-0.5 bg-[#0d1117] p-1.5 rounded border border-[#21262d]">
                <span className="text-[#8b949e] text-[9px] font-bold">Phase Δθ Limit:</span>
                <div className="flex items-center gap-0.5">
                  <span className="text-amber-400 font-bold text-[10px]">±</span>
                  <input
                    type="number"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={phaseTolerance}
                    onChange={(e) => onPhaseToleranceChange?.(Math.max(0.5, Math.min(15, Number(e.target.value))))}
                    className="w-full bg-[#161b22] border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400 text-[9px]">°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1. SYNCHRONIZING CONTROLS & SLIDERS CARD */}
        <div className="flex flex-col gap-3 bg-[#0d1117] border border-[#30363d] rounded-md p-3">
          <div className="flex justify-between items-center text-xs text-[#c9d1d9]">
            <span className="font-medium">Source B Synchronizing Controls</span>
            <button
              onClick={() => {
                onPhaseBChange(0);
                onFreqBChange(0);
                onVoltageBChange(0);
              }}
              className="text-[10px] text-[#58a6ff] hover:underline"
            >
              Zero Offsets
            </button>
          </div>

          {/* Phase Offset Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8b949e]">Phase Offset (Δθ)</span>
              <span className={`font-mono font-bold text-sm bg-[#000000] px-2 py-0.5 border border-[#30363d] rounded ${Math.abs(phaseBOffset) <= 5 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                Δθ = {phaseBOffset >= 0 ? '+' : ''}{phaseBOffset.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={0.5}
              value={phaseBOffset}
              onChange={(e) => onPhaseBChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b949e] px-1">
              <span>-30°</span>
              <span>Sync Band [-5°, +5°]</span>
              <span>+30°</span>
            </div>
          </div>

          {/* Frequency Offset Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8b949e]">Frequency Offset (Δf)</span>
              <span className={`font-mono font-bold text-sm bg-[#000000] px-2 py-0.5 border border-[#30363d] rounded ${Math.abs(freqBOffset) <= 0.1 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                Δf = {freqBOffset >= 0 ? '+' : ''}{freqBOffset.toFixed(2)} Hz
              </span>
            </div>
            <input
              type="range"
              min={-0.5}
              max={0.5}
              step={0.01}
              value={freqBOffset}
              onChange={(e) => onFreqBChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b949e] px-1">
              <span>-0.50Hz</span>
              <span>Sync Band [-0.10Hz, +0.10Hz]</span>
              <span>+0.50Hz</span>
            </div>
          </div>

          {/* Voltage Offset Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8b949e]">Voltage Offset (ΔV)</span>
              <span className={`font-mono font-bold text-sm bg-[#000000] px-2 py-0.5 border border-[#30363d] rounded ${Math.abs(voltageBOffset) <= 5 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                ΔV = {voltageBOffset >= 0 ? '+' : ''}{voltageBOffset.toFixed(1)} %
              </span>
            </div>
            <input
              type="range"
              min={-10}
              max={10}
              step={0.5}
              value={voltageBOffset}
              onChange={(e) => onVoltageBChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b949e] px-1">
              <span>-10%</span>
              <span>Sync Band [-5%, +5%]</span>
              <span>+10%</span>
            </div>
          </div>
        </div>

        {/* 2. TRANSFER MODE SELECTOR CARD */}
        <div className="flex flex-col gap-2 bg-[#0d1117] border border-[#30363d] rounded-md p-3">
          <div className="flex justify-between items-center text-xs text-[#c9d1d9]">
            <span className="font-medium">Thyristor Transfer Mode</span>
            <span className="text-[10px] font-mono text-[#3fb950]">
              {transferMode === 'MAKE_BEFORE_BREAK' ? 'Overlapping Commutation' : 'Break-Before-Make (<4ms)'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => transferMode !== 'MAKE_BEFORE_BREAK' && onToggleTransferMode()}
              className={`py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                transferMode === 'MAKE_BEFORE_BREAK'
                  ? 'bg-[#238636] text-white shadow-[0_0_8px_#238636]'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d]'
              }`}
            >
              🔀 MAKE-BEFORE-BREAK
            </button>
            <button
              onClick={() => transferMode !== 'BREAK_BEFORE_MAKE' && onToggleTransferMode()}
              className={`py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                transferMode === 'BREAK_BEFORE_MAKE'
                  ? 'bg-[#238636] text-white shadow-[0_0_8px_#238636]'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d]'
              }`}
            >
              ⚡ BREAK-BEFORE-MAKE
            </button>
          </div>
        </div>

        {/* 3. TRANSFER ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={onTransferToB}
            disabled={activeBridge === 'B'}
            className={`py-2.5 px-2 rounded-md font-bold text-xs font-mono transition-all flex flex-col items-center justify-center ${
              activeBridge === 'B'
                ? 'bg-[#21262d] text-[#8b949e] border border-[#30363d] cursor-not-allowed'
                : 'bg-[#238636] hover:bg-[#2ea043] text-white border border-[#3fb950] shadow-md'
            }`}
          >
            <span>▶ TRANSFER A → B</span>
            <span className="text-[9px] font-normal opacity-80">Planned Switch</span>
          </button>

          <button
            onClick={onTransferToA}
            disabled={activeBridge === 'A'}
            className={`py-2.5 px-2 rounded-md font-bold text-xs font-mono transition-all flex flex-col items-center justify-center ${
              activeBridge === 'A'
                ? 'bg-[#21262d] text-[#8b949e] border border-[#30363d] cursor-not-allowed'
                : 'bg-[#238636] hover:bg-[#2ea043] text-white border border-[#3fb950] shadow-md'
            }`}
          >
            <span>◀ TRANSFER B → A</span>
            <span className="text-[9px] font-normal opacity-80">Return Preferred</span>
          </button>

          <button
            onClick={onEmergencyTransfer}
            className="py-2.5 px-2 rounded-md font-bold text-xs font-mono transition-all bg-[#da3633] hover:bg-[#f85149] text-white border border-[#f85149] shadow-md flex flex-col items-center justify-center"
          >
            <span>🚨 FAST TRANSFER</span>
            <span className="text-[9px] font-normal opacity-90">&lt; 4ms Emergency</span>
          </button>
        </div>

        {/* 4. MAINTENANCE BYPASS & SOURCE SELECTOR CARD */}
        <div className="flex flex-col gap-2.5 bg-[#0d1117] p-3 rounded-md border border-[#30363d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#f59e0b] flex items-center gap-1.5">
              <span>🛠️</span> MAINTENANCE BYPASS (52-Q3) & SOURCE
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${q3Closed ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40' : 'bg-[#21262d] text-[#8b949e]'}`}>
              {q3Closed ? `ACTIVE (SRC ${bypassSource})` : 'ISOLATED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#8b949e]">Bypass Feed Source:</span>
              <div className="flex rounded border border-[#30363d] overflow-hidden">
                <button
                  onClick={() => onSelectBypassSource && onSelectBypassSource('A')}
                  className={`flex-1 py-1 text-[11px] font-bold transition-all ${
                    bypassSource === 'A'
                      ? 'bg-[#238636] text-white'
                      : 'bg-[#161b22] text-[#8b949e] hover:text-white'
                  }`}
                >
                  SRC A
                </button>
                <button
                  onClick={() => onSelectBypassSource && onSelectBypassSource('B')}
                  className={`flex-1 py-1 text-[11px] font-bold transition-all ${
                    bypassSource === 'B'
                      ? 'bg-[#0284c7] text-white'
                      : 'bg-[#161b22] text-[#8b949e] hover:text-white'
                  }`}
                >
                  SRC B
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#8b949e]">52-Q3 Breaker:</span>
              <button
                onClick={onToggleQ3}
                className={`py-1 px-2 rounded text-[11px] font-bold border transition-all ${
                  q3Closed
                    ? 'bg-[#da3633] border-[#f85149] text-white hover:bg-[#f85149]'
                    : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:border-[#f59e0b]'
                }`}
              >
                {q3Closed ? 'CLOSE 52-Q3 (OPEN)' : 'OPEN (CLICK TO CLOSE)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE: SOP PANEL EMBEDDED ON SAME SCREEN ================= */}
      <InteractiveSOPWizard
        sopId="SOP-STS-001"
        title="Static Switch Planned Transfer & Maintenance Bypass"
        standard="IEC 62040-3 / IEEE 1547 Referenced"
        steps={sopWizardSteps}
      />
    </div>
  );
};
