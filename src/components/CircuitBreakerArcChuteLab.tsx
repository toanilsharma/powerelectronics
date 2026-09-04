import React, { useState, useEffect, useId } from 'react';
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
  Zap,
  Power
} from 'lucide-react';

interface CircuitBreakerArcChuteLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * CircuitBreakerArcChuteLab.tsx
 * 
 * IEC 60947-2 / IEEE C37.13 / IEEE C37.20 Circuit Breaker Arc Interruption & De-ion Arc Chute Lab
 * 
 * Physics Laws & International Standards:
 *  - Contact Separation Velocity (v = 5 - 10 m/s) driven by trip spring release.
 *  - Cassie-Mayr dynamic electric arc conductance: (1/g)(dg/dt) = (1/theta) * ((v*i)/P0 - 1).
 *  - Lorentz Magnetic Blowout Force: F = I * L x B driving plasma arc into steel splitter plates.
 *  - De-ion Splitter Chute: Arc divided into N series micro-arcs, each adding ~35V cathode/anode fall.
 *  - Arc Extinction Condition: Total arc voltage V_arc = N * V_plate > V_sys at current zero crossing.
 *  - Transient Recovery Voltage (TRV) vs Dielectric Recovery: If TRV > V_withstand, re-ignition occurs!
 */
export const CircuitBreakerArcChuteLab: React.FC<CircuitBreakerArcChuteLabProps> = ({
  className = '',
  onClose,
}) => {
  // Simulator Controls
  const [faultCurrentKa, setFaultCurrentKa] = useState<number>(10.0); // kA RMS Short-Circuit Current
  const [powerFactor, setPowerFactor] = useState<number>(0.2);        // Inductive fault PF (0.1 - 0.8)
  const [splitterPlatesCount, setSplitterPlatesCount] = useState<number>(10); // 4 to 14 de-ion plates
  const [magneticBlowoutActive, setMagneticBlowoutActive] = useState<boolean>(true);
  const [isTripping, setIsTripping] = useState<boolean>(false);
  const [simTimeMs, setSimTimeMs] = useState<number>(0);
  const [breakerStatus, setBreakerStatus] = useState<'CLOSED' | 'PARTING_ARCING' | 'CLEARED' | 'RESTRIKE_FAIL'>('CLOSED');

  // SVG Unique IDs
  const arcGlowId = useId();
  const flameFilterId = useId();

  // Circuit & Arc Physics Parameters
  const sysVoltageVrms = 415; // 415V Phase-to-Phase
  const sysPeakVoltage = (sysVoltageVrms * Math.sqrt(2)) / Math.sqrt(3); // ~338.8 V phase peak
  const vCathodeAnodeFallPerPlate = 35.0; // Volts per de-ion plate micro-arc
  const maxArcVoltage = splitterPlatesCount * vCathodeAnodeFallPerPlate; // e.g. 10 * 35V = 350V

  // Transient Recovery Voltage (TRV) Peak
  // TRV_peak ≈ 2 * V_peak * sin(phi)
  const phiRad = Math.acos(powerFactor);
  const trvPeak = 2.0 * sysPeakVoltage * Math.sin(phiRad);
  const rrrvVoltsPerUs = (trvPeak * 0.8) / 15.0; // V/µs Rate of Rise

  // Extinction Check
  const canExtinguish = maxArcVoltage > (sysPeakVoltage * 0.85) && splitterPlatesCount >= 8;

  // Tripping Sequence Animation Loop
  useEffect(() => {
    let animFrame: number;
    if (isTripping) {
      const startTime = performance.now();
      const tripLoop = (now: number) => {
        const elapsedMs = (now - startTime) / 2.0; // 0 to 25ms total interruption window
        setSimTimeMs(elapsedMs);

        if (elapsedMs < 3.0) {
          setBreakerStatus('CLOSED');
          animFrame = requestAnimationFrame(tripLoop);
        } else if (elapsedMs >= 3.0 && elapsedMs < 15.0) {
          setBreakerStatus('PARTING_ARCING');
          animFrame = requestAnimationFrame(tripLoop);
        } else {
          // At current zero (~15ms)
          if (canExtinguish) {
            setBreakerStatus('CLEARED');
            setIsTripping(false);
          } else {
            setBreakerStatus('RESTRIKE_FAIL');
            setIsTripping(false);
          }
        }
      };
      animFrame = requestAnimationFrame(tripLoop);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isTripping, canExtinguish]);

  // SVG Scope Dimensions
  const scopeWidth = 560;
  const scopeHeight = 220;
  const pointsCount = 100;

  // Waveform Traces: Current i(t), Arc Voltage v_arc(t), and TRV
  const currentPoints: string[] = [];
  const voltagePoints: string[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const tMs = (i / pointsCount) * 25.0; // 25ms window (1.25 electrical cycles)
    const omega = 2 * Math.PI * 0.050; // 50Hz in rad/ms
    let iWave = 0;
    let vWave = 0;

    if (tMs < 3.0) {
      // Normal short circuit fault current before contact parting
      iWave = faultCurrentKa * Math.sin(omega * tMs);
      vWave = 5.0; // Negligible contact drop
    } else if (tMs >= 3.0 && tMs < 15.0) {
      // Contacts parting: electric arc plasma stretches and enters chute
      const arcProgress = (tMs - 3.0) / 12.0;
      const currentDamping = 1.0 - 0.4 * arcProgress;
      iWave = faultCurrentKa * currentDamping * Math.sin(omega * tMs);
      // Arc voltage builds up as plasma splits across plates
      vWave = maxArcVoltage * Math.pow(arcProgress, 0.7) * (iWave >= 0 ? 1 : -1);
    } else {
      // After current zero at t = 15ms
      if (canExtinguish) {
        // Arc quenched! Current drops to zero; TRV transient appears
        iWave = 0;
        const dtUs = (tMs - 15.0) * 1000;
        vWave = trvPeak * (1 - Math.exp(-dtUs / 2000) * Math.cos(2 * Math.PI * 0.005 * dtUs));
      } else {
        // Restrike failure: arc continues conducting uncontrollably!
        iWave = faultCurrentKa * 1.3 * Math.sin(omega * tMs);
        vWave = 35.0;
      }
    }

    const x = (tMs / 25.0) * scopeWidth;
    const yI = scopeHeight / 2 - (iWave / (faultCurrentKa * 1.5)) * (scopeHeight / 2 - 20);
    const yV = scopeHeight / 2 - (vWave / (trvPeak * 1.3)) * (scopeHeight / 2 - 20);

    currentPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yI.toFixed(1)}`);
    voltagePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yV.toFixed(1)}`);
  }

  const currentPathD = currentPoints.join(' ');
  const voltagePathD = voltagePoints.join(' ');

  // Contact Position in SVG Animation
  const contactGapPx = breakerStatus === 'CLOSED'
    ? 0
    : breakerStatus === 'PARTING_ARCING'
    ? Math.min(50, (simTimeMs - 3.0) * 4.5)
    : 50;

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
              Circuit Breaker Magnetic Blowout Arc Chute Plasma Interruption Lab
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            IEC 60947-2 / IEEE C37.13 • Lorentz Blowout Force F = I(L x B) • De-ion Steel Splitter Plates • TRV &amp; RRRV Physics
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            breakerStatus === 'RESTRIKE_FAIL'
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
              : breakerStatus === 'PARTING_ARCING'
              ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b] animate-bounce'
              : breakerStatus === 'CLEARED'
              ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
              : 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]'
          }`}>
            {breakerStatus === 'RESTRIKE_FAIL' ? (
              <Flame className="w-4 h-4 text-[#ef4444]" />
            ) : breakerStatus === 'PARTING_ARCING' ? (
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            ) : breakerStatus === 'CLEARED' ? (
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#3b82f6]" />
            )}
            <span>
              {breakerStatus === 'RESTRIKE_FAIL'
                ? '🔥 CONTACT RESTRIKE / ARC BLAST!'
                : breakerStatus === 'PARTING_ARCING'
                ? '⚡ CONTACTS PARTING: PLASMA ARC IN CHUTE'
                : breakerStatus === 'CLEARED'
                ? '✓ ARC EXTINCTION AT CURRENT ZERO'
                : 'BREAKER CLOSED (CONDUCTING)'}
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

      {/* Main Interactive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Scope & Physical Arc Chute Cutaway (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* CRT Oscilloscope: Fault Current vs Arc Voltage & TRV */}
          <div className="bg-[#020617] border border-[#334155] rounded-2xl p-4 overflow-hidden shadow-inner space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#06b6d4]" /> Interruption Scope: Fault Current i(t) &amp; Arc Voltage v_arc(t) / TRV
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-[#f59e0b] font-bold">── i_fault ({faultCurrentKa} kA)</span>
                <span className="text-[#06b6d4] font-bold">── v_arc / TRV</span>
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

                {/* Center Zero Line */}
                <line x1="0" y1={scopeHeight / 2} x2={scopeWidth} y2={scopeHeight / 2} stroke="#334155" strokeWidth="1.5" strokeDasharray="3,3" />

                {/* Current Waveform */}
                <path d={currentPathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' }} />

                {/* Voltage Waveform */}
                <path d={voltagePathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }} />

                {/* Current Zero Marker */}
                <line x1={(15.0 / 25.0) * scopeWidth} y1="0" x2={(15.0 / 25.0) * scopeWidth} y2={scopeHeight} stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
                <text x={(15.0 / 25.0) * scopeWidth + 4} y="20" fill="#10b981" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                  Current Zero (t=15ms)
                </text>
              </svg>

              {/* Status Alert Overlay */}
              {breakerStatus === 'RESTRIKE_FAIL' && (
                <div className="absolute inset-0 bg-red-950/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <div className="text-base font-extrabold text-[#ef4444] tracking-wide flex items-center gap-2 animate-bounce">
                    <Flame className="w-6 h-6" /> DIELECTRIC RECOVERY FAILED: ARC RESTRIKE!
                  </div>
                  <p className="text-xs text-white font-mono mt-1 max-w-md">
                    Arc voltage ({maxArcVoltage}V) was insufficient to overcome system voltage (338V peak). TRV rose faster than the dielectric medium could de-ionize, resulting in violent plasma restrike!
                  </p>
                </div>
              )}
            </div>

            {/* Scope Telemetry */}
            <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Short-Circuit Isc</div>
                <div className="text-sm font-bold text-white">{faultCurrentKa.toFixed(1)} kA RMS</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">De-ion Arc Voltage</div>
                <div className={`text-sm font-bold ${canExtinguish ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {maxArcVoltage} V ({splitterPlatesCount} plates)
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Peak TRV</div>
                <div className="text-sm font-bold text-[#06b6d4]">{trvPeak.toFixed(0)} V</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">RRRV Stress</div>
                <div className="text-sm font-bold text-[#f59e0b]">{rrrvVoltsPerUs.toFixed(1)} V/µs</div>
              </div>
            </div>
          </div>

          {/* Physical Arc Chute & Contact Mechanism Cutaway */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#06b6d4]" />
                De-ion Steel Splitter Arc Chute &amp; Contact Separation Mechanism
              </span>
              <span className="text-[10px] text-[#94a3b8]">Lorentz Force F = I(L x B)</span>
            </div>

            <div className="relative w-full h-44 bg-[#020617] rounded-xl border border-[#334155] overflow-hidden p-3 flex flex-col justify-between">
              {/* De-ion Steel Splitter Plates (Upper Half) */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {Array.from({ length: splitterPlatesCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-14 rounded-sm border transition-colors ${
                      breakerStatus === 'PARTING_ARCING'
                        ? 'bg-[#f59e0b] border-white shadow-[0_0_8px_#f59e0b] animate-pulse'
                        : 'bg-[#334155] border-[#475569]'
                    }`}
                    title={`De-ion Splitter Plate ${idx + 1} (~35V Fall)`}
                  />
                ))}
              </div>
              <div className="text-center text-[9px] text-[#94a3b8]">
                STEEL DE-ION SPLITTER PLATES ({splitterPlatesCount} PLATES • {maxArcVoltage}V TOTAL ARC VOLTAGE)
              </div>

              {/* Lower Half: Fixed Contact & Moving Contact */}
              <div className="relative flex items-center justify-between px-10 pb-2">
                {/* Fixed Anode Contact */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-8 bg-[#94a3b8] rounded-t border-2 border-white flex items-center justify-center font-bold text-[10px] text-black">
                    FIXED
                  </div>
                  <span className="text-[9px] text-[#64748b] mt-0.5">Contact</span>
                </div>

                {/* Plasma Electric Arc (Rendered during parting) */}
                {breakerStatus === 'PARTING_ARCING' && (
                  <div className="absolute left-28 right-28 h-6 flex items-center justify-center">
                    <div className="w-full h-3 bg-[#f59e0b] rounded-full blur-xs shadow-[0_0_20px_#ef4444] animate-pulse flex items-center justify-center text-[10px] text-white font-extrabold">
                      ⚡ 10,000K PLASMA ARC ⚡
                    </div>
                  </div>
                )}

                {/* Moving Cathode Contact (Animated horizontally) */}
                <div
                  style={{ transform: `translateX(-${contactGapPx}px)` }}
                  className="flex flex-col items-center transition-transform duration-75"
                >
                  <div className="w-12 h-8 bg-[#06b6d4] rounded-t border-2 border-white flex items-center justify-center font-bold text-[10px] text-black">
                    MOVING
                  </div>
                  <span className="text-[9px] text-[#64748b] mt-0.5">Gap: {(contactGapPx / 5).toFixed(1)}mm</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              When trip springs part the contacts, the electric arc draws into the chamber. The magnetic blowout field drives the arc upward into the V-shaped steel de-ion plates, segmenting it into {splitterPlatesCount} series micro-arcs. This forces arc voltage to exceed system voltage ({maxArcVoltage}V &gt; 338V), driving current to zero!
            </p>
          </div>

        </div>

        {/* Right Column: Controls & Safety Margins (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          
          {/* Controls Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#06b6d4]" /> Switchgear Interruption Controls
              </span>
              <span className="text-[#06b6d4] font-bold">IEC 60947-2</span>
            </div>

            {/* Fault Current Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Prospective Fault Current (Isc)</span>
                <span className="text-[#f59e0b] font-bold">{faultCurrentKa.toFixed(1)} kA RMS</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="25.0"
                step="0.5"
                value={faultCurrentKa}
                onChange={(e) => setFaultCurrentKa(Number(e.target.value))}
                className="w-full accent-[#f59e0b] cursor-pointer"
              />
            </div>

            {/* Splitter Plates Count */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>De-ion Splitter Plates in Chute</span>
                <span className={`font-bold ${splitterPlatesCount >= 8 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {splitterPlatesCount} Plates ({maxArcVoltage}V)
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="14"
                step="1"
                value={splitterPlatesCount}
                onChange={(e) => setSplitterPlatesCount(Number(e.target.value))}
                className="w-full accent-[#10b981] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>4 (Severe Restrike Risk)</span>
                <span>8 (Minimum Safe)</span>
                <span>14 (Heavy Industrial)</span>
              </div>
            </div>

            {/* Fault Power Factor */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Fault Power Factor (cos φ)</span>
                <span className="text-white font-bold">{powerFactor.toFixed(2)} (Inductive)</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={powerFactor}
                onChange={(e) => setPowerFactor(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />
            </div>

            {/* Magnetic Blowout Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl text-[11px]">
              <span className="text-[#94a3b8]">Magnetic Blowout Coil:</span>
              <button
                onClick={() => setMagneticBlowoutActive(!magneticBlowoutActive)}
                className={`px-2 py-1 rounded-lg font-bold border transition-all ${
                  magneticBlowoutActive
                    ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                    : 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                }`}
              >
                {magneticBlowoutActive ? '✓ ENABLED (Lorentz Push)' : '✕ DISABLED'}
              </button>
            </div>

            {/* Trigger Breaker Trip Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsTripping(true);
                  setSimTimeMs(0);
                  setBreakerStatus('CLOSED');
                }}
                disabled={isTripping}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  isTripping
                    ? 'bg-[#f59e0b] text-black border-[#f59e0b] animate-pulse'
                    : 'bg-[#ef4444] hover:bg-[#dc2626] text-white border-[#ef4444] shadow-lg'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isTripping ? 'INTERRUPTING SHORT CIRCUIT ARC...' : 'TRIP BREAKER UNDER FULL SHORT-CIRCUIT'}</span>
              </button>
            </div>
          </div>

          {/* Educational Standard Card */}
          <div className="p-4 bg-[#0f172a] border border-[#334155] rounded-2xl space-y-2 text-xs text-[#94a3b8] font-sans">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#06b6d4]" />
              IEC 60947-2 &amp; IEEE C37.13 Interruption Criteria
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>1. Arc Quenching:</strong> Unlike a solid-state switch, an air circuit breaker cannot interrupt current instantaneously without causing catastrophic inductive overvoltage. It must extend and cool the arc, increasing resistance until the next natural current zero ($i = 0$).
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>2. Restrike vs Clearance:</strong> At current zero, the plasma channel begins de-ionizing. If the Transient Recovery Voltage (TRV) rises faster than the contact gap dielectric strength can recover (RRRV &gt; dV_withstand/dt), a restrike occurs, destroying the arc chute!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
