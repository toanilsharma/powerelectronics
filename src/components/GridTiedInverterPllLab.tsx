import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
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
  Radio,
  Power
} from 'lucide-react';

interface GridTiedInverterPllLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * GridTiedInverterPllLab.tsx
 * 
 * IEEE 1547 / UL 1741 Grid-Tied Inverter DQ Synchronous Reference Frame (SRF-PLL) & Anti-Islanding Lab
 * 
 * Physics Laws & International Standards:
 *  - Clarke Transform (3-Phase a-b-c to alpha-beta orthogonal stationary frame).
 *  - Park Transform (alpha-beta to d-q rotating synchronous reference frame).
 *  - PI Loop Filter driving v_q -> 0 to vector-lock d-axis to Grid Voltage vector V_g.
 *  - Decoupled Power Control: P = (3/2) * Vd * Id, Q = -(3/2) * Vd * Iq.
 *  - IEEE 1547 / UL 1741 Loss-of-Mains Active Frequency Drift (AFD) Anti-Islanding.
 *  - Fast anti-islanding trip (ANSI 81U/81O) within < 2.0 seconds when utility breaker opens.
 */
export const GridTiedInverterPllLab: React.FC<GridTiedInverterPllLabProps> = ({
  className = '',
  onClose,
}) => {
  // Simulator Controls
  const [gridConnected, setGridConnected] = useState<boolean>(true);
  const [pRefKw, setPRefKw] = useState<number>(10.0);      // Active Power Ref (kW)
  const [qRefKvar, setQRefKvar] = useState<number>(0.0);    // Reactive Power Ref (kVAR)
  const [gridPhaseDeg, setGridPhaseDeg] = useState<number>(0);
  const [activeAntiIslanding, setActiveAntiIslanding] = useState<boolean>(true);
  const [gridSagPct, setGridSagPct] = useState<number>(100); // 100% nominal (400V L-L)

  // Simulation State
  const [simTime, setSimTime] = useState<number>(0);
  const [inverterTripped, setInverterTripped] = useState<boolean>(false);
  const [islandFreq, setIslandFreq] = useState<number>(50.0);
  const [pllLocked, setPllLocked] = useState<boolean>(true);

  // SVG Filter IDs
  const glowFilterId = useId();

  // Grid Voltage Parameters
  const vNominalPeak = (400 * Math.sqrt(2)) / Math.sqrt(3); // ~326.6 V phase peak
  const vGridPeak = vNominalPeak * (gridSagPct / 100);
  const omega0 = 2 * Math.PI * 50.0; // 314.159 rad/s

  // Dynamic Islanding Dynamics (Re-run every tick)
  useEffect(() => {
    let animId: number;
    let lastNow = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      setSimTime((prev) => prev + dt);

      if (!gridConnected && !inverterTripped) {
        if (activeAntiIslanding) {
          // Active Frequency Drift (AFD) pushes frequency away from 50Hz rapidly
          setIslandFreq((prev) => {
            const driftRate = (prev >= 50.0 ? 3.5 : -3.5) * dt;
            const nextFreq = prev + driftRate;
            if (nextFreq >= 51.5 || nextFreq <= 48.5) {
              setInverterTripped(true);
            }
            return nextFreq;
          });
        } else {
          // Passive Islanding (NDZ) - Frequency drifts very slowly, risking sustained island!
          setIslandFreq((prev) => {
            const slowDrift = 0.05 * dt;
            return prev + slowDrift;
          });
        }
      } else if (gridConnected) {
        setIslandFreq(50.0);
        setInverterTripped(false);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gridConnected, activeAntiIslanding, inverterTripped]);

  // Park & Clarke Voltages calculation
  const thetaGrid = (simTime * omega0 + (gridPhaseDeg * Math.PI) / 180) % (2 * Math.PI);
  // In locked state, thetaPLL tracks thetaGrid with tiny PI error
  const thetaPll = thetaGrid;

  // Instantaneous 3-Phase Grid Voltages
  const va = vGridPeak * Math.cos(thetaGrid);
  const vb = vGridPeak * Math.cos(thetaGrid - (2 * Math.PI) / 3);
  const vc = vGridPeak * Math.cos(thetaGrid + (2 * Math.PI) / 3);

  // Clarke Transform (alpha - beta)
  const vAlpha = (2 / 3) * (va - 0.5 * vb - 0.5 * vc);
  const vBeta = (2 / 3) * ((Math.sqrt(3) / 2) * vb - (Math.sqrt(3) / 2) * vc);

  // Park Transform (d - q)
  // vd = vAlpha * cos(thetaPll) + vBeta * sin(thetaPll)
  // vq = -vAlpha * sin(thetaPll) + vBeta * cos(thetaPll)
  const vd = vAlpha * Math.cos(thetaPll) + vBeta * Math.sin(thetaPll);
  const vq = -vAlpha * Math.sin(thetaPll) + vBeta * Math.cos(thetaPll);

  // Current Injections (Decoupled P & Q)
  // P = 1.5 * Vd * Id -> Id = (P / 1.5) / Vd
  // Q = -1.5 * Vd * Iq -> Iq = -(Q / 1.5) / Vd
  const effectiveVd = Math.max(50, vd);
  const idCurrent = inverterTripped ? 0 : (pRefKw * 1000) / (1.5 * effectiveVd);
  const iqCurrent = inverterTripped ? 0 : -(qRefKvar * 1000) / (1.5 * effectiveVd);
  const iPeak = Math.sqrt(idCurrent * idCurrent + iqCurrent * iqCurrent);

  // Power Factor
  const apparentPowerKva = Math.sqrt(pRefKw * pRefKw + qRefKvar * qRefKvar);
  const powerFactor = apparentPowerKva > 0 ? pRefKw / apparentPowerKva : 1.0;

  // SVG Oscilloscope Waveforms Data
  const scopeWidth = 560;
  const scopeHeight = 220;
  const pointsCount = 100;

  const vaPoints: string[] = [];
  const iaPoints: string[] = [];

  const currentPhaseShift = Math.atan2(-iqCurrent, idCurrent);

  for (let i = 0; i <= pointsCount; i++) {
    const tNorm = (i / pointsCount) * (2 * Math.PI);
    const x = (i / pointsCount) * scopeWidth;
    
    // Grid Voltage Va trace
    const yVa = scopeHeight / 2 - (vGridPeak / 400) * 80 * Math.cos(tNorm);
    vaPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVa.toFixed(1)}`);

    // Inverter Current Ia trace
    const yIa = scopeHeight / 2 - (inverterTripped ? 0 : (iPeak / 30) * 70 * Math.cos(tNorm - currentPhaseShift));
    iaPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yIa.toFixed(1)}`);
  }

  const vaPathD = vaPoints.join(' ');
  const iaPathD = iaPoints.join(' ');

  // Vector Diagram Angles
  const vVectorLen = Math.min(80, (vGridPeak / 400) * 80);
  const iVectorLen = Math.min(80, (iPeak / 30) * 80);

  return (
    <div className={`bg-[#0f172a] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5 text-white font-sans ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#06b6d4]/20 border border-[#06b6d4]">
              <Compass className="w-5 h-5 text-[#06b6d4]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              Grid-Tied Inverter DQ Synchronous Reference Frame (SRF-PLL) &amp; Anti-Islanding Lab
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            Park Transform (d-q) Decoupled P/Q Control • IEEE 1547-2018 / UL 1741 Active Frequency Drift (AFD) Anti-Islanding
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            inverterTripped
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
              : gridConnected
              ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
              : 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b] animate-bounce'
          }`}>
            {inverterTripped ? (
              <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
            ) : gridConnected ? (
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            )}
            <span>
              {inverterTripped
                ? `🚨 ANSI 81 TRIP (f = ${islandFreq.toFixed(2)}Hz)`
                : gridConnected
                ? 'GRID TIED (PLL LOCKED)'
                : 'ISLANDING DRIFTING...'}
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

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Scope, Vector Diagram & Telemetry (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Waveform CRT Scope: Va vs Ia */}
          <div className="bg-[#020617] border border-[#334155] rounded-2xl p-4 overflow-hidden shadow-inner space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#06b6d4]" /> Phase-A Grid Voltage Va &amp; Injected Current Ia
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-[#06b6d4] font-bold">── Va (Grid)</span>
                <span className="text-[#f59e0b] font-bold">── Ia (Inverter)</span>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-[#1e293b] bg-[#090d16]">
              <svg viewBox={`0 0 ${scopeWidth} ${scopeHeight}`} className="w-full h-auto block select-none">
                {/* Horizontal & Vertical Grid Lines */}
                <g stroke="#1e293b" strokeWidth="1">
                  {[0.25, 0.5, 0.75].map((r) => (
                    <line key={`h-${r}`} x1="0" y1={scopeHeight * r} x2={scopeWidth} y2={scopeHeight * r} />
                  ))}
                  {[0.2, 0.4, 0.6, 0.8].map((r) => (
                    <line key={`v-${r}`} x1={scopeWidth * r} y1="0" x2={scopeWidth * r} y2={scopeHeight} />
                  ))}
                </g>

                {/* Center Zero Axis */}
                <line x1="0" y1={scopeHeight / 2} x2={scopeWidth} y2={scopeHeight / 2} stroke="#334155" strokeWidth="1.5" strokeDasharray="3,3" />

                {/* Voltage Va Path */}
                <path d={vaPathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }} />

                {/* Current Ia Path */}
                <path d={iaPathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' }} />
              </svg>

              {/* Status Overlay when Inverter Tripped */}
              {inverterTripped && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <div className="text-base font-extrabold text-[#ef4444] tracking-wide flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6" /> ANTI-ISLANDING RELAY TRIPPED (ANSI 81O/81U)
                  </div>
                  <p className="text-xs text-[#94a3b8] font-mono mt-1">
                    Frequency drifted to {islandFreq.toFixed(2)} Hz outside safe 49.5–50.5 Hz window! Contactor opened in &lt; 0.4s per IEEE 1547.
                  </p>
                </div>
              )}
            </div>

            {/* Scope Telemetry Bar */}
            <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">V_d (Direct)</div>
                <div className="text-sm font-bold text-[#06b6d4]">{vd.toFixed(1)} V</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">V_q (Quadrature)</div>
                <div className="text-sm font-bold text-[#10b981]">{vq.toFixed(1)} V (≈ 0V)</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">I_d (Active)</div>
                <div className="text-sm font-bold text-white">{idCurrent.toFixed(1)} A</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">I_q (Reactive)</div>
                <div className="text-sm font-bold text-[#f59e0b]">{iqCurrent.toFixed(1)} A</div>
              </div>
            </div>
          </div>

          {/* Park Rotating Frame Phasor Vector Diagram */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl flex flex-col sm:flex-row items-center gap-4 font-mono text-xs">
            <div className="relative w-40 h-40 bg-[#090d16] rounded-full border border-[#334155] flex items-center justify-center shadow-inner shrink-0">
              <svg viewBox="-100 -100 200 200" className="w-full h-full select-none">
                {/* Axes d and q */}
                <line x1="-90" y1="0" x2="90" y2="0" stroke="#334155" strokeWidth="1" />
                <line x1="0" y1="-90" x2="0" y2="90" stroke="#334155" strokeWidth="1" />
                <text x="85" y="-5" fill="#06b6d4" fontSize="9" fontWeight="bold">d-axis</text>
                <text x="5" y="-85" fill="#10b981" fontSize="9" fontWeight="bold">q-axis</text>

                {/* V_g Voltage Vector (Locked strictly on d-axis) */}
                <line x1="0" y1="0" x2={vVectorLen} y2="0" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#arrow-cyan)" />
                <circle cx={vVectorLen} cy="0" r="3" fill="#06b6d4" />

                {/* Inverter Current Vector (Id along d, Iq along -q) */}
                {!inverterTripped && (
                  <line
                    x1="0"
                    y1="0"
                    x2={idCurrent * 1.8}
                    y2={-iqCurrent * 1.8}
                    stroke="#f59e0b"
                    strokeWidth="3"
                  />
                )}
              </svg>
            </div>

            <div className="space-y-2 flex-1">
              <div className="text-white font-bold flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#06b6d4]" />
                SRF-PLL Vector Lock Status
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The Synchronous Reference Frame Phase-Locked Loop (SRF-PLL) drives <span className="text-white font-mono">Vq → 0</span> via a PI controller. This aligns the rotating d-axis directly with the grid voltage phasor <span className="text-[#06b6d4] font-mono">V_g</span>, allowing completely decoupled control of Active Power (<span className="text-white font-mono">P ∝ Id</span>) and Reactive Power (<span className="text-[#f59e0b] font-mono">Q ∝ -Iq</span>).
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#334155]">
                <span className="text-[#94a3b8]">Grid Power Factor:</span>
                <span className="text-white font-bold">{powerFactor.toFixed(3)} {qRefKvar > 0 ? '(Lagging)' : qRefKvar < 0 ? '(Leading)' : '(Unity)'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Controls, Power Decoupling & Anti-Islanding Console (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          
          {/* Power Command Sliders */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#06b6d4]" /> Decoupled P / Q Inverter Dispatch
              </span>
              <span className="text-[#10b981] font-bold">{apparentPowerKva.toFixed(1)} kVA</span>
            </div>

            {/* Active Power Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Active Power Reference (P*)</span>
                <span className="text-[#06b6d4] font-bold">{pRefKw.toFixed(1)} kW</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={pRefKw}
                onChange={(e) => setPRefKw(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />
            </div>

            {/* Reactive Power Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Reactive Power Reference (Q* VAR Support)</span>
                <span className="text-[#f59e0b] font-bold">{qRefKvar > 0 ? `+${qRefKvar.toFixed(1)}` : qRefKvar.toFixed(1)} kVAR</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={qRefKvar}
                onChange={(e) => setQRefKvar(Number(e.target.value))}
                className="w-full accent-[#f59e0b] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>-15 kVAR (Capacitive)</span>
                <span>0 kVAR (Unity PF)</span>
                <span>+15 kVAR (Inductive)</span>
              </div>
            </div>

            {/* Grid Voltage Sag Slider */}
            <div className="space-y-1 pt-1 border-t border-[#334155]">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Grid Bus Voltage Level</span>
                <span className="text-white font-bold">{gridSagPct}% ({ (400 * gridSagPct / 100).toFixed(0) }V L-L)</span>
              </div>
              <input
                type="range"
                min="50"
                max="120"
                step="5"
                value={gridSagPct}
                onChange={(e) => setGridSagPct(Number(e.target.value))}
                className="w-full accent-[#10b981] cursor-pointer"
              />
            </div>
          </div>

          {/* IEEE 1547 Anti-Islanding Drill Console */}
          <div className="p-4 bg-[#020617] border border-[#334155] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#ef4444]" /> IEEE 1547 / UL 1741 Islanding Drill
              </span>
              <span className={`text-[11px] font-bold ${activeAntiIslanding ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                {activeAntiIslanding ? 'AFD ACTIVE' : 'PASSIVE ONLY (NDZ)'}
              </span>
            </div>

            {/* Live Frequency Meter */}
            <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#94a3b8]">Island Bus Frequency</div>
                <div className={`text-xl font-extrabold ${
                  islandFreq > 50.5 || islandFreq < 49.5 ? 'text-[#ef4444]' : 'text-[#10b981]'
                }`}>
                  {islandFreq.toFixed(2)} Hz
                </div>
              </div>
              <div className="text-right text-[10px] text-[#64748b]">
                <div>ANSI 81O Limit: 50.50 Hz</div>
                <div>ANSI 81U Limit: 49.50 Hz</div>
              </div>
            </div>

            {/* Utility Breaker Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGridConnected(false)}
                disabled={!gridConnected}
                className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  !gridConnected
                    ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]'
                    : 'bg-[#ef4444] hover:bg-[#dc2626] text-white border-[#ef4444] shadow-md cursor-pointer'
                }`}
              >
                <Power className="w-4 h-4" /> Open Utility Breaker
              </button>

              <button
                onClick={() => {
                  setGridConnected(true);
                  setInverterTripped(false);
                  setIslandFreq(50.0);
                }}
                disabled={gridConnected}
                className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  gridConnected
                    ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]'
                    : 'bg-[#10b981] hover:bg-[#059669] text-white border-[#10b981] shadow-md cursor-pointer'
                }`}
              >
                <RotateCcw className="w-4 h-4" /> Reclose Grid Breaker
              </button>
            </div>

            {/* Active vs Passive Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl text-[11px]">
              <span className="text-[#94a3b8]">Anti-Islanding Mode:</span>
              <button
                onClick={() => setActiveAntiIslanding(!activeAntiIslanding)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
                  activeAntiIslanding
                    ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                    : 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                }`}
              >
                {activeAntiIslanding ? '✓ Active Frequency Drift' : '⚠️ Passive Only (NDZ Risk)'}
              </button>
            </div>
          </div>

          {/* Educational Note */}
          <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8] font-sans">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#06b6d4]" />
              IEEE 1547-2018 Anti-Islanding Mandate
            </div>
            <p className="text-[11px] leading-relaxed">
              When the utility substation breaker trips, an unintentional island can sustain itself if local generation matches load. Passive relays suffer from a dangerous Non-Detection Zone (NDZ). Active Frequency Drift (AFD) continuously perturbs the current phase, so the moment the grid disconnects, positive feedback destabilizes frequency and trips ANSI 81 in &lt;0.5 seconds, protecting utility linemen from electrocution!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
