import React, { useState, useId } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  Info,
  Layers,
  Maximize2,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Zap
} from 'lucide-react';

interface SCRSnubberDvDtLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * SCRSnubberDvDtLab.tsx
 * 
 * IEC 60747-6 / IEEE 446 SCR Dynamic Switching Stress & RC Snubber Lab
 * 
 * Physics Laws & International Standards:
 *  - Turn-Off Time (tq = trr + tgr) safety margin: tc > tq.
 *  - Commutation failure: If forward voltage reappears before tc >= tq, SCR re-fires spontaneously!
 *  - Critical dv/dt false turn-on: i_disp = Cj2 * (dv/dt) > IG(th).
 *  - Critical di/dt localized hotspot: (di/dt)max = Vs / Ls.
 *  - Second-order series RLC Snubber damping: zeta = (Rs / 2) * sqrt(Cs / Ls).
 *  - Live CRT scope displaying underdamped ringing vs critically damped voltage clamp.
 */
export const SCRSnubberDvDtLab: React.FC<SCRSnubberDvDtLabProps> = ({
  className = '',
  onClose,
}) => {
  // Active Study Tab
  const [activeTab, setActiveTab] = useState<'tq_commutation' | 'snubber_dvdt' | 'didt_hotspot'>('tq_commutation');

  // Parameters for Turn-Off Time (tq) Margin Drill
  const [circuitTurnOffTimeTc, setCircuitTurnOffTimeTc] = useState<number>(65); // microseconds (tc)
  const deviceTqUs = 80; // SCR intrinsic turn-off time (80 µs)
  const trrUs = 30;
  const tgrUs = 50;

  // Parameters for dv/dt & RC Snubber
  const [snubberResistance, setSnubberResistance] = useState<number>(22); // Ohms (Rs)
  const [snubberCapacitance, setSnubberCapacitance] = useState<number>(0.22); // microFarads (Cs)
  const strayInductanceUh = 15; // microHenries (Ls)
  const supplyVoltageVs = 600; // Volts DC / Peak (Vs)

  // Parameters for di/dt Hotspot
  const [seriesInductanceUh, setSeriesInductanceUh] = useState<number>(10); // Ls in µH
  const criticalDiDtLimit = 150; // A/µs (Device rating)
  const criticalDvDtLimit = 500; // V/µs (Device rating)
  const cj2CapacitancePf = 45; // pF (Junction 2 depletion capacitance)
  const igThresholdMa = 20; // mA (Gate trigger threshold)

  // Damping Calculations for RC Snubber
  // zeta = (Rs / 2) * sqrt(Cs / Ls)
  const csFarads = snubberCapacitance * 1e-6;
  const lsHenries = strayInductanceUh * 1e-6;
  const dampingRatioZeta = (snubberResistance / 2) * Math.sqrt(csFarads / lsHenries);
  const omega0 = 1 / Math.sqrt(lsHenries * csFarads); // rad/s
  const dampedFreqWd = omega0 * Math.sqrt(Math.max(0, 1 - dampingRatioZeta * dampingRatioZeta));

  // Max dv/dt with Snubber
  // (dv/dt)max ≈ 0.632 * Vs / (Rs * Cs)
  const maxDvDtSnubber = (0.632 * supplyVoltageVs) / (snubberResistance * snubberCapacitance); // V/µs
  const inducedDisplacementCurrentMa = (cj2CapacitancePf * maxDvDtSnubber) / 1000; // mA

  // Turn-off Safety Margin
  const safetyFactorTq = circuitTurnOffTimeTc / deviceTqUs;
  const isCommutationFailure = circuitTurnOffTimeTc < deviceTqUs;

  // di/dt calculation
  const actualDiDt = supplyVoltageVs / seriesInductanceUh; // A/µs
  const isDiDtRupture = actualDiDt > criticalDiDtLimit;

  // dv/dt triggering check
  const isDvDtFalseTrigger = maxDvDtSnubber > criticalDvDtLimit || inducedDisplacementCurrentMa > igThresholdMa;

  // SVG CRT Scope Dimensions
  const scopeWidth = 560;
  const scopeHeight = 220;
  const pointsCount = 100;

  // Generate CRT Waveform Points
  const vPoints: string[] = [];
  const iPoints: string[] = [];

  if (activeTab === 'snubber_dvdt') {
    // Generate transient forward voltage response v_AK(t) across SCR
    const tMaxUs = 15.0; // 15 µs window
    for (let i = 0; i <= pointsCount; i++) {
      const tUs = (i / pointsCount) * tMaxUs;
      const tSec = tUs * 1e-6;
      let vAK = 0;

      if (dampingRatioZeta < 1.0) {
        // Underdamped oscillatory step response
        const decay = Math.exp(-dampingRatioZeta * omega0 * tSec);
        const theta = Math.acos(dampingRatioZeta);
        vAK = supplyVoltageVs * (1 - (decay / Math.sqrt(1 - dampingRatioZeta * dampingRatioZeta)) * Math.sin(dampedFreqWd * tSec + theta));
      } else {
        // Critically damped or overdamped
        vAK = supplyVoltageVs * (1 - Math.exp(-tSec / (snubberResistance * csFarads)));
      }

      const x = (tUs / tMaxUs) * scopeWidth;
      const y = scopeHeight - 20 - (Math.min(1000, Math.max(0, vAK)) / 1000) * (scopeHeight - 40);
      vPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  } else if (activeTab === 'tq_commutation') {
    // Generate AC reverse recovery & forward reapplied voltage
    const tMaxUs = 200.0;
    for (let i = 0; i <= pointsCount; i++) {
      const tUs = (i / pointsCount) * tMaxUs;
      let vAK = 0;
      let iAK = 0;

      if (tUs < 40) {
        // Forward conduction
        vAK = 1.5;
        iAK = 100;
      } else if (tUs < 40 + trrUs) {
        // Reverse recovery negative current pulse
        vAK = -supplyVoltageVs * 0.6;
        iAK = -50 * Math.sin(((tUs - 40) / trrUs) * Math.PI);
      } else if (tUs < 40 + circuitTurnOffTimeTc) {
        // Reverse blocking period (tc)
        vAK = -supplyVoltageVs;
        iAK = 0;
      } else {
        // Forward voltage reapplied!
        if (isCommutationFailure) {
          // SCR refires spontaneously! vAK collapses to 0, current explodes!
          vAK = 2.0;
          iAK = 350;
        } else {
          // SCR blocks forward voltage successfully
          vAK = supplyVoltageVs;
          iAK = 0;
        }
      }

      const x = (tUs / tMaxUs) * scopeWidth;
      const yV = scopeHeight / 2 - (vAK / 800) * (scopeHeight / 2 - 25);
      const yI = scopeHeight / 2 - (iAK / 400) * (scopeHeight / 2 - 25);

      vPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yV.toFixed(1)}`);
      iPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yI.toFixed(1)}`);
    }
  }

  const vPathD = vPoints.join(' ');
  const iPathD = iPoints.join(' ');

  return (
    <div className={`bg-[#0f172a] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5 text-white font-sans ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ef4444]/20 border border-[#ef4444]">
              <Zap className="w-5 h-5 text-[#ef4444]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              SCR dv/dt &amp; di/dt Stress, Turn-Off Time (tq) &amp; Snubber Lab
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            IEC 60747-6 • Recombination Turn-Off Time Margin (tc &gt; tq) • Critical dv/dt Displacement Firing • RC Damping
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            isCommutationFailure || isDvDtFalseTrigger || isDiDtRupture
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
              : 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
          }`}>
            {isCommutationFailure ? (
              <Flame className="w-4 h-4 text-[#ef4444]" />
            ) : isDvDtFalseTrigger || isDiDtRupture ? (
              <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            )}
            <span>
              {activeTab === 'tq_commutation'
                ? isCommutationFailure
                  ? `COMMUTATION FAILURE! (tc=${circuitTurnOffTimeTc}µs < tq=${deviceTqUs}µs)`
                  : `SAFE COMMUTATION (SF = ${safetyFactorTq.toFixed(2)})`
                : activeTab === 'snubber_dvdt'
                ? isDvDtFalseTrigger
                  ? `dv/dt TRIGGER FAULT (${maxDvDtSnubber.toFixed(0)} V/µs > 500 V/µs)`
                  : `SNUBBER OPTIMAL (dv/dt = ${maxDvDtSnubber.toFixed(0)} V/µs)`
                : isDiDtRupture
                ? `di/dt DIE RUPTURE (${actualDiDt.toFixed(0)} A/µs > 150 A/µs)`
                : `di/dt LIMITED (${actualDiDt.toFixed(0)} A/µs)`}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white font-bold"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#334155] pb-2 font-mono text-xs">
        {[
          { id: 'tq_commutation', label: '1. Turn-Off Time (tq) Margin & Inverter Mode' },
          { id: 'snubber_dvdt', label: '2. Critical dv/dt & RC Snubber Damping' },
          { id: 'didt_hotspot', label: '3. Critical di/dt Turn-On Hotspot' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#ef4444] text-black shadow-md'
                : 'bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#334155]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Scope & Physical Animation (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Waveform CRT Scope */}
          <div className="bg-[#020617] border border-[#334155] rounded-2xl p-4 overflow-hidden shadow-inner space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#06b6d4]" />
                {activeTab === 'tq_commutation'
                  ? 'Thyristor Anode-Cathode Voltage v_AK & Current i_A vs Time'
                  : activeTab === 'snubber_dvdt'
                  ? 'Forward Voltage Step Response v_AK(t) across Snubber'
                  : 'di/dt Current Ramp Waveform i_A(t)'}
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-[#06b6d4] font-bold">── v_AK (Voltage)</span>
                {activeTab === 'tq_commutation' && <span className="text-[#f59e0b] font-bold">── i_A (Current)</span>}
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-[#1e293b] bg-[#090d16]">
              <svg viewBox={`0 0 ${scopeWidth} ${scopeHeight}`} className="w-full h-auto block select-none">
                {/* Grid Lines */}
                <g stroke="#1e293b" strokeWidth="1">
                  {[0.25, 0.5, 0.75].map((r) => (
                    <line key={`h-${r}`} x1="0" y1={scopeHeight * r} x2={scopeWidth} y2={scopeHeight * r} />
                  ))}
                  {[0.2, 0.4, 0.6, 0.8].map((r) => (
                    <line key={`v-${r}`} x1={scopeWidth * r} y1="0" x2={scopeWidth * r} y2={scopeHeight} />
                  ))}
                </g>

                {/* Center / Baseline Axis */}
                <line
                  x1="0"
                  y1={activeTab === 'tq_commutation' ? scopeHeight / 2 : scopeHeight - 20}
                  x2={scopeWidth}
                  y2={activeTab === 'tq_commutation' ? scopeHeight / 2 : scopeHeight - 20}
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />

                {/* Overvoltage Breakdown Threshold Line */}
                {activeTab === 'snubber_dvdt' && (
                  <>
                    <line x1="0" y1={scopeHeight - 20 - (800 / 1000) * (scopeHeight - 40)} x2={scopeWidth} y2={scopeHeight - 20 - (800 / 1000) * (scopeHeight - 40)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                    <text x={scopeWidth - 10} y={scopeHeight - 20 - (800 / 1000) * (scopeHeight - 40) - 5} fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end" fontWeight="bold">
                      V_DRM RATING (800V)
                    </text>
                  </>
                )}

                {/* Voltage Trace */}
                <path d={vPathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }} />

                {/* Current Trace */}
                {activeTab === 'tq_commutation' && (
                  <path d={iPathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' }} />
                )}
              </svg>

              {/* Commutation Failure Flash Alarm Overlay */}
              {activeTab === 'tq_commutation' && isCommutationFailure && (
                <div className="absolute inset-0 bg-red-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <div className="text-base font-extrabold text-[#ef4444] tracking-wide flex items-center gap-2 animate-bounce">
                    <Flame className="w-6 h-6" /> COMMUTATION FAILURE: SPONTANEOUS RE-FIRING!
                  </div>
                  <p className="text-xs text-white font-mono mt-1 max-w-md">
                    Circuit reverse recovery time tc ({circuitTurnOffTimeTc}µs) ended before base layer carriers fully recombined (tq = {deviceTqUs}µs). Reapplied forward voltage re-triggered the thyristor without a gate pulse!
                  </p>
                </div>
              )}
            </div>

            {/* Scope Telemetry */}
            <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Supply Vs</div>
                <div className="text-sm font-bold text-white">{supplyVoltageVs} V</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Turn-Off tq</div>
                <div className="text-sm font-bold text-[#06b6d4]">{deviceTqUs} µs</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Damping Ratio ζ</div>
                <div className={`text-sm font-bold ${dampingRatioZeta < 0.7 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  {dampingRatioZeta.toFixed(2)} {dampingRatioZeta < 1.0 ? '(Under)' : '(Crit)'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Max dv/dt</div>
                <div className={`text-sm font-bold ${maxDvDtSnubber > criticalDvDtLimit ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  {maxDvDtSnubber.toFixed(0)} V/µs
                </div>
              </div>
            </div>
          </div>

          {/* Microscopic PNPN Silicon Die Cross-Section */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#06b6d4]" /> PNPN Silicon Die Recombination &amp; Filament Dynamics
              </span>
              <span className="text-[10px] text-[#94a3b8]">Junction J2 Depletion Layer</span>
            </div>

            <div className="grid grid-cols-4 gap-2 h-16 bg-[#020617] p-2 rounded-xl border border-[#334155] text-center font-bold">
              <div className="bg-[#1e3a8a] text-blue-200 rounded flex flex-col justify-center text-[10px]">
                <span>P1 (Anode)</span>
                <span className="text-[8px] opacity-75">Holes (+)</span>
              </div>
              <div className={`rounded flex flex-col justify-center text-[10px] transition-colors ${
                isCommutationFailure ? 'bg-[#7f1d1d] text-red-200 animate-pulse' : 'bg-[#1e293b] text-slate-300'
              }`}>
                <span>N1 (Base)</span>
                <span className="text-[8px] opacity-75">tgr={tgrUs}µs</span>
              </div>
              <div className={`rounded flex flex-col justify-center text-[10px] border-2 transition-colors ${
                isDvDtFalseTrigger ? 'border-[#ef4444] bg-[#450a0a] text-red-300 animate-bounce' : 'border-dashed border-[#06b6d4] bg-[#0f172a] text-cyan-300'
              }`}>
                <span>J2 (Blocking)</span>
                <span className="text-[8px]">Cj2={cj2CapacitancePf}pF</span>
              </div>
              <div className="bg-[#14532d] text-emerald-200 rounded flex flex-col justify-center text-[10px]">
                <span>N2 (Cathode)</span>
                <span className="text-[8px] opacity-75">Electrons (-)</span>
              </div>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              During turn-off, minority carriers stored in inner layers N1 and P2 must recombine before forward blocking voltage can be supported. If forward voltage returns while carriers remain (<span className="text-[#ef4444] font-mono">tc &lt; tq</span>), the space charge layer instantly re-establishes conduction!
            </p>
          </div>

        </div>

        {/* Right Column: Interactive Sliders & Engineering Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          
          {/* Dynamic Interactive Controls Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#06b6d4]" /> Parameter Configuration
              </span>
              <span className="text-[#06b6d4] font-bold">Interactive Drill</span>
            </div>

            {activeTab === 'tq_commutation' && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Circuit Reverse Turn-Off Time (tc)</span>
                    <span className={`font-bold ${isCommutationFailure ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {circuitTurnOffTimeTc} µs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="5"
                    value={circuitTurnOffTimeTc}
                    onChange={(e) => setCircuitTurnOffTimeTc(Number(e.target.value))}
                    className="w-full accent-[#06b6d4] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748b]">
                    <span>30 µs (Failure Zone)</span>
                    <span>80 µs (tq Limit)</span>
                    <span>180 µs (Safe Margin)</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Safety Factor SF = tc / tq:</span>
                    <span className={`font-bold ${safetyFactorTq < 1.0 ? 'text-[#ef4444]' : safetyFactorTq < 1.5 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                      {safetyFactorTq.toFixed(2)} {safetyFactorTq >= 1.5 ? '(Optimal > 1.5)' : safetyFactorTq >= 1.0 ? '(Marginal)' : '(COLLAPSE!)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748b]">
                    Required: tc ≥ 1.5 · tq (IEEE 446 / IEC 60146 Inverter Commutation Standard)
                  </div>
                </div>
              </>
            )}

            {activeTab === 'snubber_dvdt' && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Snubber Resistor (Rs)</span>
                    <span className="text-[#06b6d4] font-bold">{snubberResistance} Ω</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={snubberResistance}
                    onChange={(e) => setSnubberResistance(Number(e.target.value))}
                    className="w-full accent-[#06b6d4] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Snubber Capacitor (Cs)</span>
                    <span className="text-[#06b6d4] font-bold">{snubberCapacitance} µF</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={snubberCapacitance}
                    onChange={(e) => setSnubberCapacitance(Number(e.target.value))}
                    className="w-full accent-[#06b6d4] cursor-pointer"
                  />
                </div>

                <div className="p-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Displacement Current i = Cj2·(dv/dt):</span>
                    <span className={`font-bold ${inducedDisplacementCurrentMa > igThresholdMa ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {inducedDisplacementCurrentMa.toFixed(1)} mA (Threshold: {igThresholdMa}mA)
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'didt_hotspot' && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Series Anode Limiting Inductor (Ls)</span>
                    <span className={`font-bold ${isDiDtRupture ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {seriesInductanceUh} µH
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    step="1"
                    value={seriesInductanceUh}
                    onChange={(e) => setSeriesInductanceUh(Number(e.target.value))}
                    className="w-full accent-[#06b6d4] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748b]">
                    <span>2 µH (Hotspot Danger!)</span>
                    <span>10 µH (Standard)</span>
                    <span>30 µH (Well-Damped)</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Turn-on di/dt = Vs / Ls:</span>
                    <span className={`font-bold ${isDiDtRupture ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {actualDiDt.toFixed(0)} A/µs (Rated Limit: {criticalDiDtLimit} A/µs)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Educational Theory Card */}
          <div className="p-4 bg-[#0f172a] border border-[#334155] rounded-2xl space-y-2 text-xs text-[#94a3b8] font-sans">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#06b6d4]" />
              Industrial Snubber &amp; Commutation Rules
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>1. Turn-off Margin (tc &gt; tq):</strong> In line-commutated or load-commutated inverters, margin angle γ = ω·tc must exceed ω·tq + 10° to prevent shoot-through short circuits.
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>2. dv/dt False Triggering:</strong> High dv/dt forces charging displacement current i_disp = C_j2 · (dv/dt) into the gate, which turns on the SCR without a firing command. The RC snubber shunts high frequencies to keep dv/dt &lt; (dv/dt)_crit.
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>3. di/dt Microscopic Melting:</strong> Conduction initiates in a narrow channel near the gate and takes time to spread across the die. A series choke Ls is strictly required to limit initial current ramp rate!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
