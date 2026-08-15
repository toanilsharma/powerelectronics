import React, { useState } from 'react';
import { BridgeConductionState } from '../types/batteryCharger';
import { MathLatex } from './MathLatex';
import {
  BookOpen,
  HelpCircle,
  Zap,
  Activity,
  Sliders,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  BarChart2,
  Cpu,
  AlertTriangle
} from 'lucide-react';

interface SCRLearningLabPanelProps {
  conductionState: BridgeConductionState;
  firingAngle: number;
  sourceInductanceMh: number;
  voltageIn: number;
  loadCurrentA: number;
  loadPct: number;
  vdc: number;
  q1Closed: boolean;
  q3Closed: boolean;
  activeFaults?: any;
  hasLcFilter: boolean;
}

interface ParameterWhyInfo {
  paramName: string;
  symbol: string;
  unit: string;
  whatChanges: string;
  whyItChanges: string;
  whatToObserve: string;
  keyFormula?: string;
}

const PARAMETER_WHY_DATA: Record<string, ParameterWhyInfo> = {
  firingAngle: {
    paramName: 'Firing Angle Delay',
    symbol: 'α',
    unit: 'degrees (°)',
    whatChanges: 'Delays the instant at which the SCR gate pulse G_k is fired relative to the natural AC phase crossover point (30° after zero crossing).',
    whyItChanges: 'SCR thyristors are line-commutated controlled switches. They remain OFF in forward bias until a positive gate pulse is applied. Delaying α reduces the area under the phase voltage curve delivered to the DC bus.',
    whatToObserve: 'As α increases from 0° to 90°, average output voltage Vdc drops proportionally to cos(α). Output ripple voltage frequency increases and AC input power factor deteriorates.',
    keyFormula: 'V_{dc(\\text{avg})} = 1.35 V_{LL} \\cos(\\alpha)',
  },
  sourceInductance: {
    paramName: 'Source & Commutation Inductance',
    symbol: 'L_s',
    unit: 'millihenries (mH)',
    whatChanges: 'Introduces finite inductive reactance (X_s = ω L_s) in the incoming AC supply transformer and transmission line.',
    whyItChanges: 'Current in an inductor cannot change instantaneously (v_L = L di/dt). When current transfers from outgoing SCR to incoming SCR, both devices conduct simultaneously during overlap angle μ.',
    whatToObserve: 'Higher L_s increases commutation overlap μ, creates an additional average DC voltage drop ΔVc = (3 ω L_s / π) Idc, and rounds off the trapezoidal AC line current pulses.',
    keyFormula: '\\cos(\\alpha + \\mu) = \\cos(\\alpha) - \\frac{2 \\omega L_s I_{dc}}{\\sqrt{2} V_{LL}}',
  },
  loadCurrent: {
    paramName: 'DC Load Current Demand',
    symbol: 'I_{dc}',
    unit: 'Amperes (A)',
    whatChanges: 'Changes the magnitude of continuous current drawn through the conducting SCR bridge legs.',
    whyItChanges: 'Higher load demand requires more charge transfer per cycle. Heavier current requires longer duration to commutate current out of leakage inductance L_s.',
    whatToObserve: 'Increasing I_dc expands overlap angle μ, increases I²R conduction losses in SCR junction (Vf ≈ 1.2V per SCR), and increases AC supply current harmonic magnitude.',
    keyFormula: '\\Delta V_c = \\frac{3 \\omega L_s}{\\pi} I_{dc}',
  },
  loadType: {
    paramName: 'Load Characteristics (R vs RL)',
    symbol: 'Load Type',
    unit: 'Resistive / Inductive',
    whatChanges: 'Determines whether load current is pulse-like (Pure R) or continuous smoothed DC (High Inductance RL).',
    whyItChanges: 'Smoothing reactor L1 stores magnetic energy (E = 0.5 L I²). When phase voltage drops below zero, L1 releases stored energy to maintain forward current through the SCRs.',
    whatToObserve: 'With an RL load, current remains continuous even if Vdc momentary dips. With a pure R load at α > 60°, current falls to zero, causing discontinuous conduction mode (DCM).',
    keyFormula: 'e_L = -L_1 \\frac{di}{dt}',
  },
  harmonics: {
    paramName: 'AC Line Current Harmonics',
    symbol: 'THD_i',
    unit: 'percent (%)',
    whatChanges: 'Introduces non-sinusoidal harmonic current components (5th, 7th, 11th, 13th) into the AC supply grid.',
    whyItChanges: 'Rectifier switching acts as a non-linear load, drawing pulse-like current blocks rather than a smooth sine wave.',
    whatToObserve: 'Characteristic harmonics appear at orders h = 6k ± 1 (5th, 7th, 11th, 13th...). Higher firing angle α increases Total Harmonic Distortion (THDi).',
    keyFormula: 'h = 6k \\pm 1 \\quad (k = 1, 2, 3...)',
  },
  powerFactor: {
    paramName: 'Total Power Factor',
    symbol: 'PF',
    unit: 'dimensionless (0 to 1.0)',
    whatChanges: 'Ratios total active real power (P) to apparent power (S) drawn from the AC utility grid.',
    whyItChanges: 'Power factor drops due to two factors: Displacement Factor (phase lag φ1 ≈ α + μ/2) and Distortion Factor (harmonics).',
    whatToObserve: 'Increasing α causes fundamental AC current to lag voltage, lowering power factor: PF ≈ 0.955 cos(α + μ/2).',
    keyFormula: 'PF \\approx 0.955 \\cdot \\cos\\left(\\alpha + \\frac{\\mu}{2}\\right)',
  },
};

export const SCRLearningLabPanel: React.FC<SCRLearningLabPanelProps> = ({
  conductionState,
  firingAngle,
  sourceInductanceMh,
  voltageIn,
  loadCurrentA,
  loadPct,
  vdc,
  q1Closed,
  q3Closed,
  activeFaults,
  hasLcFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'explanation' | 'why' | 'formulas' | 'ideal_practical' | 'matrix'>('explanation');
  const [selectedWhyParam, setSelectedWhyParam] = useState<string>('firingAngle');

  // Math Calculations for Live Engineering Panel
  const alphaRad = (firingAngle * Math.PI) / 180;
  const omega = 2 * Math.PI * 50;
  const Ls = sourceInductanceMh * 1e-3;
  const vPeakLL = Math.SQRT2 * voltageIn;

  // Ideal Vdc = (3 * sqrt(2) / pi) * VLL * cos(alpha)
  const vdcIdeal = ( (3 * Math.SQRT2) / Math.PI ) * voltageIn * Math.cos(alphaRad);
  
  // Commutation Voltage Drop = (3 * omega * Ls / pi) * Idc
  const deltaVc = ((3 * omega * Ls) / Math.PI) * loadCurrentA;

  // SCR Semiconductor Forward Voltage Drop = 2 * Vf (approx 2 x 1.2V = 2.4V)
  const deltaVf = q1Closed && vdc > 10 ? 2.4 : 0;

  // Calculated Practical Vdc
  const vdcPracticalCalculated = Math.max(0, vdcIdeal - deltaVc - deltaVf);

  // Commutation Overlap Angle mu
  const muDeg = conductionState.overlapAngleDeg;

  // Estimated Power Factor
  const displacementFactor = Math.max(0, Math.cos((firingAngle + muDeg / 2) * (Math.PI / 180)));
  const powerFactorEst = q1Closed ? parseFloat((0.955 * displacementFactor).toFixed(2)) : 0;

  // Estimated Current THD
  const thdEst = q1Closed ? parseFloat((28.5 + (firingAngle / 90) * 12.0 - (hasLcFilter ? 14 : 0)).toFixed(1)) : 0;

  const currentWhy = PARAMETER_WHY_DATA[selectedWhyParam] || PARAMETER_WHY_DATA['firingAngle'];

  return (
    <div className="w-full bg-[#0d1424] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-4 text-slate-200 font-sans shadow-2xl select-none">
      {/* HEADER NAV BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
            🎓
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
              <span>Interactive Learning Laboratory</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                IEEE / IEC Engineering Suite
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Live physics, dynamic state explanations, parameter explorer &amp; mathematical model
            </p>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#070b14] border border-[#1e293b] p-1 rounded-xl">
          {[
            { id: 'explanation', label: '💡 What is Happening Now?' },
            { id: 'why', label: '❓ "Why?" Parameter Explorer' },
            { id: 'formulas', label: '📐 Formulas & Theory' },
            { id: 'ideal_practical', label: '⚖️ Ideal vs Practical' },
            { id: 'matrix', label: '📊 Parameter → Effect Matrix' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow-md border border-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          TAB 1: DYNAMIC "WHAT IS HAPPENING NOW?" LIVE EXPLANATION
          ============================================================ */}
      {activeTab === 'explanation' && (
        <div className="flex flex-col gap-3">
          {/* REAL-TIME ENGINEERING INSIGHT BANNER */}
          <div className="bg-[#0a0e17] border-l-4 border-l-amber-500 border border-[#1e293b] rounded-xl p-3 shadow-md flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                Instantaneous Engineering Insight:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {!q1Closed ? (
                  <span>
                    Main AC breaker 52-Q1 is OPEN. The SCR bridge is de-energized. Loads are drawing power from the VRLA battery string or output is isolated.
                  </span>
                ) : activeFaults?.controlFuseBlown ? (
                  <span>
                    Control Fuse F1-F3 is BLOWN! Firing pulses are inhibited. Output voltage collapsed to 0V.
                  </span>
                ) : firingAngle > 80 ? (
                  <span>
                    Firing delay α = {firingAngle}° is near cutoff ({((firingAngle / 180) * 10).toFixed(2)}ms delay). Output DC voltage is heavily reduced ({vdc.toFixed(1)}V). AC line power factor has dropped to PF ≈ {powerFactorEst}.
                  </span>
                ) : muDeg > 0.5 ? (
                  <span>
                    Source inductance Ls = {sourceInductanceMh}mH is causing commutation overlap angle μ = {muDeg.toFixed(1)}°. Three SCRs are conducting simultaneously during phase transitions, introducing a commutation voltage dip ΔVc = {deltaVc.toFixed(1)}V.
                  </span>
                ) : (
                  <span>
                    The 6-pulse SCR bridge is operating normally in continuous conduction mode. Firing angle α = {firingAngle}° produces average output Vdc = {vdc.toFixed(1)}V with ripple frequency f_ripple = 300Hz (6x line frequency).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* DYNAMIC ANALYSIS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {/* Card 1: Active Conduction & Phase Pair */}
            <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> 1. Conduction &amp; Phase Pair
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  {conductionState.conductingSCRs.length} SCRs Active
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Currently, <strong className="text-emerald-400">{conductionState.conductingSCRs.join(' + ')}</strong> are carrying load current.
                Connecting line voltage <strong className="text-sky-300">{conductionState.instantaneousLineVoltageName}</strong> across the DC bus.
              </p>
              <div className="text-[11px] text-slate-400 bg-[#070b14] p-2 rounded-lg border border-slate-800 font-mono">
                💡 <strong>Sequence Position:</strong> Next gate pulse will fire {conductionState.conductingSCRs.includes('T1') ? 'T2 (Phase C)' : conductionState.conductingSCRs.includes('T2') ? 'T3 (Phase B)' : 'T4 (Phase A)'} at 60° interval.
              </div>
            </div>

            {/* Card 2: Commutation Overlap Physics */}
            <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> 2. Commutation Overlap (μ)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  μ = {muDeg.toFixed(1)}°
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Source inductance <strong className="text-amber-300">Ls = {sourceInductanceMh}mH</strong> prevents instantaneous current transfer.
                Current transfer requires <strong className="text-amber-300">μ = {muDeg.toFixed(1)}°</strong> ({((muDeg / 360) * 20).toFixed(2)} ms).
              </p>
              <div className="text-[11px] text-slate-400 bg-[#070b14] p-2 rounded-lg border border-slate-800 font-mono">
                ⚡ <strong>Voltage Dip:</strong> Overlap reduces average output by <strong className="text-amber-400">ΔVc = {deltaVc.toFixed(1)}V</strong> due to temporary shorting of AC phase lines during commutation.
              </div>
            </div>

            {/* Card 3: Voltage & Loss Breakdown */}
            <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold text-sky-400 font-mono flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" /> 3. Voltage &amp; Loss Breakdown
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800">
                  Vdc = {vdc.toFixed(1)}V
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ideal Output (1.35 VLL cos α):</span>
                  <span className="text-sky-300 font-bold">{vdcIdeal.toFixed(1)} V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Commutation Drop (ΔVc):</span>
                  <span className="text-amber-400 font-bold">-{deltaVc.toFixed(1)} V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SCR Forward Drop (2x Vf):</span>
                  <span className="text-rose-400 font-bold">-{deltaVf.toFixed(1)} V</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
                  <span className="text-emerald-400">Practical Net Vdc:</span>
                  <span className="text-emerald-400">{vdcPracticalCalculated.toFixed(1)} V</span>
                </div>
              </div>
            </div>

            {/* Card 4: Load Dynamics (R vs RL) */}
            <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold text-indigo-400 font-mono flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> 4. Load &amp; Filtering (RL)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800">
                  Idc = {loadCurrentA.toFixed(1)}A
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Smoothing Reactor L1 (2.5mH) maintains <strong className="text-indigo-300">Continuous Conduction Mode (CCM)</strong>.
                Inductive energy storage prevents load current from dropping to zero between firing pulses.
              </p>
              <div className="text-[11px] text-slate-400 bg-[#070b14] p-2 rounded-lg border border-slate-800 font-mono">
                🛡️ <strong>Filter Status:</strong> {hasLcFilter ? 'LC Filter Active (DC Ripple < 2%)' : 'Raw Output (High AC Ripple 9%)'}.
              </div>
            </div>

            {/* Card 5: Power Quality & Harmonics */}
            <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" /> 5. Power Quality &amp; Harmonics
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">
                  PF = {powerFactorEst}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Power Factor (PF):</span>
                  <span className="text-rose-300 font-bold">{powerFactorEst}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current THD (THDi):</span>
                  <span className="text-amber-300 font-bold">{thdEst}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dominant Harmonics:</span>
                  <span className="text-sky-300 font-bold">5th, 7th, 11th, 13th</span>
                </div>
              </div>
            </div>

            {/* Card 6: Operating Mode & Standard */}
            <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold text-teal-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 6. Standard &amp; Compliance
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 font-bold border border-teal-800">
                  IEC 60146-1-1
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Operating under <strong className="text-teal-300">IEEE 1188 / IEC 62485 Substation Charger Standard</strong> for industrial continuous float/boost charging of 110VDC VRLA battery banks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: CONTEXTUAL "WHY?" PARAMETER EXPLORER
          ============================================================ */}
      {activeTab === 'why' && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* PARAMETER SELECTOR BUTTONS (LEFT) */}
          <div className="flex flex-col gap-1.5 w-full lg:w-[260px] shrink-0">
            <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider px-1">
              Select Parameter to Explore:
            </span>
            {Object.keys(PARAMETER_WHY_DATA).map((key) => {
              const p = PARAMETER_WHY_DATA[key];
              const isSelected = selectedWhyParam === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedWhyParam(key)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-500 text-white font-bold shadow-md'
                      : 'bg-[#070b14] border-[#1e293b] text-slate-300 hover:bg-[#141d30]'
                  }`}
                >
                  <span className="text-xs font-mono">{p.paramName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold">
                    {p.symbol}
                  </span>
                </button>
              );
            })}
          </div>

          {/* PARAMETER DETAILED EXPLORATION PANEL (RIGHT) */}
          <div className="flex-1 w-full bg-[#070b14] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg text-blue-400 font-bold font-mono">
                  {currentWhy.symbol}
                </span>
                <h4 className="text-sm font-extrabold text-white font-mono">
                  {currentWhy.paramName} ({currentWhy.unit})
                </h4>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                Live Value: {selectedWhyParam === 'firingAngle' ? `${firingAngle}°` : selectedWhyParam === 'sourceInductance' ? `${sourceInductanceMh} mH` : selectedWhyParam === 'loadCurrent' ? `${loadCurrentA.toFixed(1)} A` : selectedWhyParam === 'harmonics' ? `${thdEst}%` : selectedWhyParam === 'powerFactor' ? `${powerFactorEst}` : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Question 1: What changes physically? */}
              <div className="bg-[#0d1424] border border-blue-500/30 p-3 rounded-xl flex flex-col gap-1.5">
                <span className="text-xs font-bold text-blue-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> 1. What Changes Physically?
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {currentWhy.whatChanges}
                </p>
              </div>

              {/* Question 2: Why does it change? */}
              <div className="bg-[#0d1424] border border-amber-500/30 p-3 rounded-xl flex flex-col gap-1.5">
                <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> 2. Why Does It Change?
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {currentWhy.whyItChanges}
                </p>
              </div>

              {/* Question 3: What to observe? */}
              <div className="bg-[#0d1424] border border-emerald-500/30 p-3 rounded-xl flex flex-col gap-1.5">
                <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> 3. What to Observe?
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {currentWhy.whatToObserve}
                </p>
              </div>
            </div>

            {currentWhy.keyFormula && (
              <div className="bg-[#0d1117] border border-sky-500/40 p-3 rounded-xl flex flex-col gap-1.5 items-center justify-center">
                <span className="text-[10px] font-bold text-sky-400 font-mono uppercase tracking-wider">
                  Governing Physical Formula:
                </span>
                <MathLatex formula={currentWhy.keyFormula} className="text-sm text-sky-300" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: THEORY & FORMULAS
          ============================================================ */}
      {activeTab === 'formulas' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equation 1: Ideal Average DC Voltage */}
            <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">
                1. Ideal Average DC Output Voltage (No Overlap, Zero Drop)
              </span>
              <div className="bg-[#0d1117] p-3 rounded-xl border border-sky-500/30 flex justify-center">
                <MathLatex formula="V_{dc(\\text{ideal})} = \\frac{3 \\sqrt{2}}{\\pi} V_{LL} \\cos(\\alpha) \\approx 1.35 V_{LL} \\cos(\\alpha)" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Assumes ideal zero source inductance (Ls = 0), instantaneous SCR commutation, zero semiconductor forward voltage drop (Vf = 0), and continuous load current.
              </p>
              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800">
                Live Calculated Vdc(ideal) = 1.35 × {voltageIn}V × cos({firingAngle}°) = <strong>{vdcIdeal.toFixed(1)} V</strong>
              </div>
            </div>

            {/* Equation 2: Practical Output Voltage with Commutation & Loss */}
            <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                2. Practical DC Output Voltage (With Commutation &amp; Losses)
              </span>
              <div className="bg-[#0d1117] p-3 rounded-xl border border-amber-500/30 flex justify-center">
                <MathLatex formula="V_{dc(\\text{practical})} = 1.35 V_{LL} \\cos(\\alpha) - \\frac{3 \\omega L_s}{\\pi} I_{dc} - 2 V_f" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Accounts for commutation voltage drop ΔVc = (3 ω Ls / π) Idc due to transformer leakage inductance and series SCR forward drop (2x Vf ≈ 2.4V).
              </p>
              <div className="text-xs font-mono text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-800">
                Live Practical Vdc = {vdcIdeal.toFixed(1)}V - {deltaVc.toFixed(1)}V (ΔVc) - {deltaVf.toFixed(1)}V (2Vf) = <strong>{vdcPracticalCalculated.toFixed(1)} V</strong>
              </div>
            </div>

            {/* Equation 3: Commutation Overlap Angle mu */}
            <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                3. Commutation Overlap Angle (μ)
              </span>
              <div className="bg-[#0d1117] p-3 rounded-xl border border-emerald-500/30 flex justify-center">
                <MathLatex formula="\\cos(\\alpha + \\mu) = \\cos(\\alpha) - \\frac{2 \\omega L_s I_{dc}}{\\sqrt{2} V_{LL}}" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Determines the electrical angle duration during which outgoing and incoming SCRs conduct simultaneously to transfer current.
              </p>
              <div className="text-xs font-mono text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800">
                Live Overlap Angle μ = <strong>{muDeg.toFixed(1)}°</strong> ({((muDeg / 360) * 20).toFixed(2)} ms)
              </div>
            </div>

            {/* Equation 4: Input Power Factor */}
            <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">
                4. AC Input Power Factor &amp; Displacement
              </span>
              <div className="bg-[#0d1117] p-3 rounded-xl border border-rose-500/30 flex justify-center">
                <MathLatex formula="PF \\approx \\frac{3}{\\pi} \\cos\\left(\\alpha + \\frac{\\mu}{2}\\right) \\approx 0.955 \\cdot \\cos\\left(\\alpha + \\frac{\\mu}{2}\\right)" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Power factor decreases as firing angle α increases because fundamental AC current lags line voltage by phase angle φ1 ≈ α + μ/2.
              </p>
              <div className="text-xs font-mono text-rose-300 bg-rose-950/60 p-2 rounded-lg border border-rose-800">
                Live Estimated Power Factor PF = <strong>{powerFactorEst}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: IDEAL VS PRACTICAL COMPARISON TABLE
          ============================================================ */}
      {activeTab === 'ideal_practical' && (
        <div className="flex flex-col gap-3">
          <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-3 overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#1e293b] text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <th className="p-2.5">Parameter / Effect</th>
                  <th className="p-2.5 text-sky-400">Ideal Theoretical Model</th>
                  <th className="p-2.5 text-amber-400">Practical Physical Reality</th>
                  <th className="p-2.5 text-emerald-400">Impact on Converter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] text-slate-300">
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold font-mono text-white">Source Inductance (Ls)</td>
                  <td className="p-2.5 font-mono text-sky-300">Ls = 0 mH (Infinite di/dt)</td>
                  <td className="p-2.5 font-mono text-amber-300">Ls = 0.5 to 2.0 mH (Transformer leakage)</td>
                  <td className="p-2.5">Causes commutation overlap angle μ &gt; 0° and voltage drop ΔVc.</td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold font-mono text-white">Commutation Duration</td>
                  <td className="p-2.5 font-mono text-sky-300">Instantaneous (0 μs)</td>
                  <td className="p-2.5 font-mono text-amber-300">0.1 to 0.5 ms (μ = 2° to 15°)</td>
                  <td className="p-2.5">3 SCRs conduct simultaneously during overlap interval.</td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold font-mono text-white">SCR Semiconductor Drop</td>
                  <td className="p-2.5 font-mono text-sky-300">Vf = 0 V (Ideal Switch)</td>
                  <td className="p-2.5 font-mono text-amber-300">Vf = 1.0V to 1.4V per SCR</td>
                  <td className="p-2.5">Reduces DC voltage by 2x Vf (approx 2.4V) &amp; generates heat.</td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold font-mono text-white">AC Line Current Shape</td>
                  <td className="p-2.5 font-mono text-sky-300">Instantaneous square pulses</td>
                  <td className="p-2.5 font-mono text-amber-300">Trapezoidal pulses with finite slope</td>
                  <td className="p-2.5">Slightly reduces higher-order harmonic amplitudes at high frequencies.</td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold font-mono text-white">Load Conduction Mode</td>
                  <td className="p-2.5 font-mono text-sky-300">Infinite L (Pure constant DC)</td>
                  <td className="p-2.5 font-mono text-amber-300">Finite L1 (2.5mH) + battery load</td>
                  <td className="p-2.5">Current has slight 300Hz AC ripple superimposed on DC.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 5: PARAMETER → EFFECT EDUCATIONAL MATRIX
          ============================================================ */}
      {activeTab === 'matrix' && (
        <div className="flex flex-col gap-3">
          <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-3 overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#1e293b] text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <th className="p-2.5">Parameter Increase (↑)</th>
                  <th className="p-2.5 text-sky-400">DC Voltage Vdc</th>
                  <th className="p-2.5 text-amber-400">Overlap Angle μ</th>
                  <th className="p-2.5 text-rose-400">Power Factor PF</th>
                  <th className="p-2.5 text-indigo-400">Harmonics THDi</th>
                  <th className="p-2.5 text-emerald-400">Physical Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] text-slate-300 font-mono">
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold text-white">Firing Angle α ↑</td>
                  <td className="p-2.5 text-rose-400 font-bold">Decreases (cos α)</td>
                  <td className="p-2.5 text-slate-300">Slight Decrease</td>
                  <td className="p-2.5 text-rose-400 font-bold">Decreases (Lag φ1)</td>
                  <td className="p-2.5 text-rose-400 font-bold">Increases</td>
                  <td className="p-2.5 text-slate-300 font-sans text-[11px]">
                    Firing delay reduces positive area under phase voltage wave.
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold text-white">Source Inductance Ls ↑</td>
                  <td className="p-2.5 text-amber-400 font-bold">Decreases (ΔVc)</td>
                  <td className="p-2.5 text-amber-400 font-bold">Increases (μ ↑)</td>
                  <td className="p-2.5 text-slate-300">Slight Decrease</td>
                  <td className="p-2.5 text-emerald-400 font-bold">Slight Decrease</td>
                  <td className="p-2.5 text-slate-300 font-sans text-[11px]">
                    Higher leakage inductance prolongs SCR current commutation interval.
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold text-white">Load Current Idc ↑</td>
                  <td className="p-2.5 text-amber-400 font-bold">Decreases (ΔVc)</td>
                  <td className="p-2.5 text-amber-400 font-bold">Increases (μ ↑)</td>
                  <td className="p-2.5 text-slate-300">Unchanged</td>
                  <td className="p-2.5 text-slate-300">Unchanged</td>
                  <td className="p-2.5 text-slate-300 font-sans text-[11px]">
                    Higher current requires more volt-seconds to commute out of Ls.
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-bold text-white">Load Reactor L1 ↑</td>
                  <td className="p-2.5 text-slate-300">Unchanged</td>
                  <td className="p-2.5 text-slate-300">Unchanged</td>
                  <td className="p-2.5 text-emerald-400 font-bold">Improves</td>
                  <td className="p-2.5 text-emerald-400 font-bold">Decreases (Smoother)</td>
                  <td className="p-2.5 text-slate-300 font-sans text-[11px]">
                    Smooths DC current ripple and maintains continuous conduction mode.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
