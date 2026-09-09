import React, { useState } from 'react';
import {
  Zap,
  Activity,
  Layers,
  ZoomIn,
  Compass,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2,
  Play,
  Pause,
  SkipForward,
  Clock,
  BarChart3
} from 'lucide-react';

import {
  calculatePWMPhysics,
  calculateHarmonicSpectrum,
  HarmonicComponent
} from '../engine/PWMPhysicsEngine';

export type PWMModulationType = 'spwm' | 'bipolar' | 'unipolar' | 'svpwm';

interface PWMVisualStageProps {
  modulationType: PWMModulationType;
  setModulationType: (type: PWMModulationType) => void;
  busVoltage: number;
  pwmMa: number;
  pwmFc: number;
  pwmF1: number;
  pwmDeadTime: number;
  rectifierLoad: number;
  filterL_mH?: number;
  filterC_uF?: number;
  time: number;
  timeSpeed: number;
  isPlaying: boolean;
}

export const PWMVisualStage: React.FC<PWMVisualStageProps> = ({
  modulationType,
  setModulationType,
  busVoltage = 400,
  pwmMa = 0.85,
  pwmFc = 5000,
  pwmF1 = 50,
  pwmDeadTime = 1.5,
  rectifierLoad = 20,
  filterL_mH = 2.0,
  filterC_uF = 20.0,
  time,
  timeSpeed,
  isPlaying
}) => {
  // Visual sub-view mode: 'schematic' | 'comparator' | 'svpwm_hexagon' | 'fft_spectrum'
  const [visualMode, setVisualMode] = useState<'schematic' | 'comparator' | 'svpwm_hexagon' | 'fft_spectrum'>(
    modulationType === 'svpwm' ? 'svpwm_hexagon' : 'schematic'
  );

  // Time-Dilation & Stepping Controls
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [frozenTime, setFrozenTime] = useState<number>(0);
  const [localSpeed, setLocalSpeed] = useState<number>(1.0); // 1.0, 0.5, 0.1, 0.01, 0.001
  const [zoomFactor, setZoomFactor] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [hoveredHarmonic, setHoveredHarmonic] = useState<HarmonicComponent | null>(null);

  // Synchronize freeze time when user freezes
  const handleToggleFreeze = () => {
    if (!isFrozen) {
      setFrozenTime(time);
      setIsFrozen(true);
    } else {
      setIsFrozen(false);
    }
  };

  // Microsecond Precision Stepper
  const handleMicroStep = (deltaUs: number) => {
    if (!isFrozen) {
      setFrozenTime(time + deltaUs * 1e-6);
      setIsFrozen(true);
    } else {
      setFrozenTime((prev) => Math.max(0, prev + deltaUs * 1e-6));
    }
  };

  // Step exactly 1 Carrier Cycle (1 / fc)
  const handleStepCarrierCycle = () => {
    const cycleSec = 1 / Math.max(10, pwmFc);
    if (!isFrozen) {
      setFrozenTime(time + cycleSec);
      setIsFrozen(true);
    } else {
      setFrozenTime((prev) => prev + cycleSec);
    }
  };

  // Phase Lock / Angle Scrub
  const handlePhaseLock = (targetDeg: number) => {
    const targetRad = (targetDeg * Math.PI) / 180;
    const omega1 = 2 * Math.PI * pwmF1;
    const currentCycles = Math.floor((time * omega1) / (2 * Math.PI));
    const newTime = (currentCycles * 2 * Math.PI + targetRad) / omega1;
    setFrozenTime(newTime);
    setIsFrozen(true);
  };

  // Effective simulation time considering freeze and local dilation
  const effectiveTime = isFrozen ? frozenTime : time * localSpeed;

  // Exact Physical Modeling via PWMPhysicsEngine
  const physics = calculatePWMPhysics({
    busVoltage,
    modulationType,
    ma: pwmMa,
    fc: pwmFc,
    f1: pwmF1,
    deadTimeUs: pwmDeadTime,
    loadR: rectifierLoad,
    filterL_mH,
    filterC_uF
  });

  // Dynamic Discrete Fourier Harmonic Spectrum
  const spectrum = calculateHarmonicSpectrum({
    busVoltage,
    modulationType,
    ma: pwmMa,
    fc: pwmFc,
    f1: pwmF1,
    deadTimeUs: pwmDeadTime,
    loadR: rectifierLoad,
    filterL_mH,
    filterC_uF
  });

  // Electrical variables
  const vDcTotal = busVoltage;
  const vDcHalf = vDcTotal / 2;
  const omega1 = 2 * Math.PI * pwmF1;
  const theta = (omega1 * effectiveTime) % (2 * Math.PI);
  const thetaDeg = (theta * 180) / Math.PI;
  const loadR = Math.max(1, rectifierLoad || 20);

  // Carrier & Dead-time calculations
  const carrierPeriod = 1 / Math.max(10, pwmFc);
  const tMod = effectiveTime % carrierPeriod;
  const carrierNorm = tMod / carrierPeriod; // 0 to 1
  const instantCarrier = carrierNorm < 0.5 ? 4 * carrierNorm - 1 : 3 - 4 * carrierNorm; // -1 to +1

  // Reference sine waves
  const instantRefA = Math.min(1.0, Math.max(-1.0, Math.sin(omega1 * effectiveTime) * pwmMa));
  const instantRefB =
    modulationType === 'unipolar'
      ? Math.min(1.0, Math.max(-1.0, -Math.sin(omega1 * effectiveTime) * pwmMa)) // 180° inverted for Unipolar Leg B
      : -instantRefA; // Complementary for Bipolar

  // Dead-time normalized interval
  const deadTimeSec = (pwmDeadTime || 0) * 1e-6;
  const deadTimeFraction = Math.min(0.4, deadTimeSec * pwmFc);
  const isDeadTimeActive = carrierNorm < deadTimeFraction || 1 - carrierNorm < deadTimeFraction;
  const isShootThrough = pwmDeadTime === 0;

  // Gate signals
  // Leg A (Q1 upper, Q2 lower)
  const q1Raw = instantRefA >= instantCarrier;
  const q1On = !isShootThrough ? !isDeadTimeActive && q1Raw : true;
  const q2On = !isShootThrough ? !isDeadTimeActive && !q1Raw : true;

  // Leg B (Q3 upper, Q4 lower)
  const q3Raw = instantRefB >= instantCarrier;
  const q3On = !isShootThrough ? !isDeadTimeActive && q3Raw : true;
  const q4On = !isShootThrough ? !isDeadTimeActive && !q3Raw : true;

  // Diode conduction (inductive freewheeling during dead-time)
  const isPositiveHalf = Math.sin(omega1 * effectiveTime) >= 0;
  const d1On = isDeadTimeActive && !isPositiveHalf;
  const d2On = isDeadTimeActive && isPositiveHalf;
  const d3On = isDeadTimeActive && isPositiveHalf;
  const d4On = isDeadTimeActive && !isPositiveHalf;

  // Instantaneous terminal voltages
  let vSwInstant = 0;
  if (modulationType === 'spwm') {
    vSwInstant = q1On ? vDcHalf : q2On ? -vDcHalf : 0;
  } else if (modulationType === 'unipolar') {
    const vA = q1On ? vDcTotal : 0;
    const vB = q3On ? vDcTotal : 0;
    vSwInstant = vA - vB;
  } else {
    vSwInstant = q1On && q4On ? vDcTotal : q2On && q3On ? -vDcTotal : 0;
  }

  // SVPWM Sector and Dwell Time calculations
  const sector = Math.floor(thetaDeg / 60) + 1; // 1 to 6
  const sectorAngleRad = ((thetaDeg % 60) * Math.PI) / 180;
  const tA_dwell = Math.sin(Math.PI / 3 - sectorAngleRad) * pwmMa;
  const tB_dwell = Math.sin(sectorAngleRad) * pwmMa;
  const t0_dwell = Math.max(0, 1 - tA_dwell - tB_dwell);

  // Inductor instantaneous Volt-Second Balance metric
  const vOutInstant = Math.sin(omega1 * effectiveTime) * physics.v1PeakNet;
  const vInductorInstant = vSwInstant - vOutInstant;

  return (
    <div className="w-full flex flex-col gap-2 font-mono">
      {/* 1. VISUAL SUB-VIEW TOOLBAR TABS & STATUS HEADER */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider">INSPECTOR:</span>
          <div className="flex items-center gap-1 bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setVisualMode('schematic')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                visualMode === 'schematic'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              📐 CIRCUIT SLD
            </button>
            <button
              onClick={() => setVisualMode('comparator')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                visualMode === 'comparator'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              🔬 CARRIER MICROSCOPE
            </button>
            <button
              onClick={() => {
                setVisualMode('svpwm_hexagon');
                setModulationType('svpwm');
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                visualMode === 'svpwm_hexagon'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              ⬡ SVPWM HEXAGON
            </button>
            <button
              onClick={() => setVisualMode('fft_spectrum')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                visualMode === 'fft_spectrum'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>📊 FFT SPECTRUM</span>
            </button>
          </div>
        </div>

        {/* Operating status badge */}
        <div className="flex items-center gap-2">
          {isShootThrough ? (
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500 font-extrabold text-[10px] animate-pulse">
              ⚠️ 0µs SHOOT-THROUGH BLAST
            </span>
          ) : isDeadTimeActive ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500 font-extrabold text-[10px]">
              ⏱️ DEAD-TIME BLANKING ({pwmDeadTime.toFixed(1)}µs)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500 font-extrabold text-[10px]">
              ⚡ ACTIVE SWITCHING ({vSwInstant > 0 ? `+${vSwInstant.toFixed(0)}V` : `${vSwInstant.toFixed(0)}V`})
            </span>
          )}
        </div>
      </div>

      {/* 2. TIME-DILATION & PRECISION STEPPING ENGINE HUD BAR */}
      <div className="w-full bg-[#161b22] border border-pink-500/30 rounded-xl p-2.5 flex flex-col gap-2 shadow-lg font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Play/Freeze Button & Speed Multipliers */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleFreeze}
              className={`px-3 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isFrozen
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              }`}
            >
              {isFrozen ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>⏸ FROZEN (STEPPING ACTIVE)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>▶ RUNNING ({localSpeed}x)</span>
                </>
              )}
            </button>

            {/* Time Dilation Speed Selectors */}
            <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
              <span className="text-[10px] text-slate-400 font-bold px-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-pink-400" /> DILATION:
              </span>
              {[
                { speed: 1.0, label: '1.0x' },
                { speed: 0.5, label: '0.5x' },
                { speed: 0.1, label: '0.1x' },
                { speed: 0.01, label: '0.01x (Micro)' },
                { speed: 0.001, label: '0.001x (Ultra)' }
              ].map((s) => (
                <button
                  key={s.speed}
                  onClick={() => {
                    setLocalSpeed(s.speed);
                    if (isFrozen) setIsFrozen(false);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    localSpeed === s.speed && !isFrozen
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-[#161b22] text-[#8b949e] hover:text-white border border-transparent hover:border-[#30363d]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Microscope Zoom Level Selector */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <ZoomIn className="w-3 h-3 text-sky-400" /> SCOPE ZOOM:
            </span>
            {[1, 2, 5, 10].map((z) => (
              <button
                key={z}
                onClick={() => setZoomFactor(z)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  zoomFactor === z
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-[#0d1117] text-[#8b949e] hover:text-white border border-[#30363d]'
                }`}
              >
                {z}x {z === 10 ? '(1 Cycle)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Microsecond Manual Stepping & Phase Jump Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#21262d]">
          {/* Microsecond Steppers */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
              <SkipForward className="w-3 h-3" /> STEP Δt:
            </span>
            {[-10, -1, 1, 10, 100].map((us) => (
              <button
                key={us}
                onClick={() => handleMicroStep(us)}
                className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-slate-800 text-slate-200 hover:text-white border border-[#30363d] text-[10px] font-bold cursor-pointer transition-all active:scale-95"
              >
                {us > 0 ? `+${us}µs` : `${us}µs`}
              </button>
            ))}
            <button
              onClick={handleStepCarrierCycle}
              className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-sky-950/60 text-sky-300 hover:text-sky-200 border border-sky-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              +1 Cycle ({(carrierPeriod * 1e6).toFixed(0)}µs)
            </button>
          </div>

          {/* Phase Angle Lock / Scrubber */}
          <div className="flex items-center gap-1 text-[10px] flex-wrap">
            <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
              <Compass className="w-3 h-3" /> PHASE LOCK:
            </span>
            {[
              { label: '0° (Zero-Cross)', deg: 0 },
              { label: '45°', deg: 45 },
              { label: '90° (+Peak)', deg: 90 },
              { label: '180°', deg: 180 },
              { label: '270° (-Peak)', deg: 270 }
            ].map((p) => (
              <button
                key={p.deg}
                onClick={() => handlePhaseLock(p.deg)}
                className="px-1.5 py-0.5 rounded bg-[#0d1117] hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold cursor-pointer transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Instantaneous High-Precision Microsecond Telemetry Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[10.5px] bg-[#0d1117] p-2 rounded-lg border border-[#21262d]">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8b949e]">SIMULATED TIME:</span>
            <span className="text-white font-bold">{(effectiveTime * 1000).toFixed(3)} ms ({(effectiveTime * 1e6).toFixed(0)} µs)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8b949e]">ELECTRICAL ANGLE θ:</span>
            <span className="text-[#38bdf8] font-bold">{thetaDeg.toFixed(1)}° ({((thetaDeg * Math.PI) / 180).toFixed(2)} rad)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8b949e]">CARRIER CYCLE # / NORM:</span>
            <span className="text-emerald-400 font-bold">#{Math.floor(effectiveTime * pwmFc)} ({Math.round(carrierNorm * 100)}%)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8b949e]">INSTANT V_REF / V_TRI:</span>
            <span className="text-[#e3b341] font-bold">
              {(instantRefA * vDcHalf).toFixed(1)}V / {(instantCarrier * vDcHalf).toFixed(1)}V
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8b949e]">GATES Q1 / Q2 (LEG A):</span>
            <span className={`font-bold ${q1On ? 'text-emerald-400' : 'text-slate-400'}`}>
              G1={q1On ? '1' : '0'} | G2={q2On ? '1' : '0'} {isDeadTimeActive ? '(t_dead)' : ''}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8b949e]">INDUCTOR VOLT-SEC:</span>
            <span className={`font-bold ${vInductorInstant >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
              vL = {vInductorInstant >= 0 ? `+${vInductorInstant.toFixed(1)}` : vInductorInstant.toFixed(1)} V
            </span>
          </div>
        </div>
      </div>

      {/* 3. VIEWPORT SVG CANVAS STAGE */}
      <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden relative p-3 flex flex-col items-center justify-center min-h-[340px]">
        {/* ========================================================================= */}
        {/* MODE 1: MICROSCOPE CARRIER ZOOM (CARRIER VS REFERENCE COMPARATOR)        */}
        {/* ========================================================================= */}
        {visualMode === 'comparator' ? (
          <svg viewBox="0 0 540 300" className="w-full h-auto max-h-[320px] select-none">
            <rect x="10" y="10" width="520" height="280" fill="#141a24" rx="8" stroke="#30363d" strokeWidth="1.5" />
            
            <text x="270" y="26" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
              CARRIER MODULATION MICROSCOPE: v_ref(t) vs v_tri(t) COMPARISON ({zoomFactor}x ZOOM)
            </text>
            <text x="270" y="40" textAnchor="middle" fill="#8b949e" fontSize="9">
              f1 = {pwmF1} Hz | fc = {pwmFc} Hz | Dead-Time t_dead = {pwmDeadTime.toFixed(1)} µs | Ma = {pwmMa.toFixed(2)}
            </text>

            {/* Scope Channel 1: Reference vs Carrier Wave Overlay */}
            <g transform="translate(20, 48)">
              <rect x="0" y="0" width="500" height="120" fill="#0d1117" stroke="#30363d" strokeWidth="1" rx="6" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#21262d" strokeWidth="1" strokeDasharray="4 4" />
              <text x="8" y="15" fill="#e3b341" fontSize="9" fontWeight="bold">v_ref(t) Sine Reference (Ma = {pwmMa.toFixed(2)})</text>
              <text x="330" y="15" fill="#38bdf8" fontSize="9" fontWeight="bold">v_tri(t) Carrier ({pwmFc}Hz)</text>

              {/* Multiple Carrier Triangles scaled by zoomFactor */}
              {(() => {
                const totalTriangles = Math.max(2, Math.round(20 / zoomFactor));
                const triWidth = 500 / totalTriangles;
                let pathStr = `M 0 110 `;
                for (let i = 0; i < totalTriangles; i++) {
                  const xPeak = (i + 0.5) * triWidth;
                  const xBase = (i + 1) * triWidth;
                  pathStr += `L ${xPeak} 10 L ${xBase} 110 `;
                }
                return (
                  <path d={pathStr} fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                );
              })()}

              {/* Reference Sine Wave */}
              {(() => {
                const pts: string[] = [];
                for (let x = 0; x <= 500; x += 10) {
                  const relPhase = (x / 500) * (2 * Math.PI / zoomFactor);
                  const yVal = 60 - Math.sin(theta + relPhase) * 50 * Math.min(1.2, pwmMa);
                  pts.push(`${x} ${yVal}`);
                }
                return (
                  <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#e3b341" strokeWidth="2.5" />
                );
              })()}

              {/* Animated Cursor Head Scanning */}
              {(() => {
                const scanX = isFrozen ? (carrierNorm * 500) : ((effectiveTime * 80 * zoomFactor) % 500);
                return (
                  <g>
                    <line x1={scanX} y1="0" x2={scanX} y2="120" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx={scanX} cy="60" r="3.5" fill="#f472b6" />
                  </g>
                );
              })()}
            </g>

            {/* Scope Channel 2: Gating Pulses G1, G2 & Dead-Time Blanking Gap */}
            <g transform="translate(20, 180)">
              <rect x="0" y="0" width="500" height="95" fill="#0d1117" stroke="#30363d" strokeWidth="1" rx="6" />

              {/* Gate G1 High-Side */}
              <text x="8" y="20" fill={q1On ? '#22c55e' : '#8b949e'} fontSize="9" fontWeight="bold">
                G1 (Upper Gate): {q1On ? 'ON (+15V)' : 'OFF (0V)'}
              </text>
              <path
                d={`M 0 35 L 70 35 L 70 ${q1On ? 10 : 35} L 240 ${q1On ? 10 : 35} L 240 35 L 320 35 L 320 ${q1On ? 10 : 35} L 460 ${q1On ? 10 : 35} L 460 35 L 500 35`}
                fill="none"
                stroke={q1On ? '#22c55e' : '#475569'}
                strokeWidth="2"
              />

              {/* Gate G2 Low-Side */}
              <text x="8" y="60" fill={q2On ? '#38bdf8' : '#8b949e'} fontSize="9" fontWeight="bold">
                G2 (Lower Gate): {q2On ? 'ON (+15V)' : 'OFF (0V)'}
              </text>
              <path
                d={`M 0 78 L 70 78 L 70 ${q2On ? 52 : 78} L 240 ${q2On ? 52 : 78} L 240 78 L 320 78 L 320 ${q2On ? 52 : 78} L 460 ${q2On ? 52 : 78} L 460 78 L 500 78`}
                fill="none"
                stroke={q2On ? '#38bdf8' : '#475569'}
                strokeWidth="2"
              />

              {/* Dead-Time Blanking Window Highlights */}
              {isDeadTimeActive && (
                <g>
                  <rect x="235" y="6" width="30" height="78" fill="#f59e0b25" stroke="#f59e0b" strokeWidth="1.5" rx="3" strokeDasharray="3 2" />
                  <text x="250" y="48" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">
                    t_dead {pwmDeadTime.toFixed(1)}µs
                  </text>
                </g>
              )}

              {/* Shoot-Through Warning Banner */}
              {isShootThrough && (
                <g transform="translate(140, 28)">
                  <rect x="0" y="0" width="220" height="30" fill="#da3633dd" rx="4" stroke="#ff7b72" strokeWidth="1.5" />
                  <text x="110" y="19" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                    ⚠️ 0µs SHOOT-THROUGH ACTIVE!
                  </text>
                </g>
              )}
            </g>
          </svg>
        ) : visualMode === 'svpwm_hexagon' ? (
          /* ========================================================================= */
          /* MODE 2: SPACE VECTOR PWM (SVPWM) COMPLEX VOLTAGE PLANE & HEXAGON SECTORS   */
          /* ========================================================================= */
          <svg viewBox="0 0 540 310" className="w-full h-auto max-h-[320px] select-none">
            <rect x="10" y="10" width="520" height="290" fill="#141a24" rx="8" stroke="#8957e5" strokeWidth="1.5" />
            
            <text x="270" y="28" textAnchor="middle" fill="#d2a8ff" fontSize="12" fontWeight="bold">
              SPACE VECTOR PWM (SVPWM) COMPLEX VOLTAGE PLANE (α - β)
            </text>
            <text x="270" y="42" textAnchor="middle" fill="#8b949e" fontSize="9">
              Active Sector: {sector} ({((sector - 1) * 60)}° - {(sector * 60)}°) | DC Utilization Gain: +15.5% (Vmax = Vdc / √3)
            </text>

            {/* Left Hexagonal Voltage Space Plane */}
            <g transform="translate(160, 175)">
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#30363d" strokeWidth="1.5" />
              <line x1="0" y1="-115" x2="0" y2="115" stroke="#30363d" strokeWidth="1.5" />
              <text x="125" y="4" fill="#8b949e" fontSize="9" fontWeight="bold">α</text>
              <text x="4" y="-115" fill="#8b949e" fontSize="9" fontWeight="bold">β</text>

              {(() => {
                const r = 100;
                const points = [
                  [r, 0],
                  [r * 0.5, -r * Math.sqrt(3) / 2],
                  [-r * 0.5, -r * Math.sqrt(3) / 2],
                  [-r, 0],
                  [-r * 0.5, r * Math.sqrt(3) / 2],
                  [r * 0.5, r * Math.sqrt(3) / 2]
                ];
                const ptsStr = points.map((p) => p.join(',')).join(' ');

                return (
                  <g>
                    {/* Active Sector Highlight Wedge */}
                    {(() => {
                      const startIdx = sector - 1;
                      const pA = points[startIdx];
                      const pB = points[(startIdx + 1) % 6];
                      return (
                        <polygon
                          points={`0,0 ${pA[0]},${pA[1]} ${pB[0]},${pB[1]}`}
                          fill="#8957e530"
                          stroke="#bc8cff"
                          strokeWidth="2"
                        />
                      );
                    })()}

                    <polygon points={ptsStr} fill="none" stroke="#58a6ff" strokeWidth="2" />
                    <circle cx="0" cy="0" r={r * (Math.sqrt(3) / 2)} fill="none" stroke="#3fb950" strokeWidth="1.2" strokeDasharray="3 3" />

                    {/* 6 Voltage Vectors */}
                    {[
                      { name: 'V1 [100]', x: r, y: 0, anchor: 'start', dx: 6, dy: 3 },
                      { name: 'V2 [110]', x: r * 0.5, y: -r * Math.sqrt(3) / 2, anchor: 'start', dx: 4, dy: -6 },
                      { name: 'V3 [010]', x: -r * 0.5, y: -r * Math.sqrt(3) / 2, anchor: 'end', dx: -4, dy: -6 },
                      { name: 'V4 [011]', x: -r, y: 0, anchor: 'end', dx: -6, dy: 3 },
                      { name: 'V5 [001]', x: -r * 0.5, y: r * Math.sqrt(3) / 2, anchor: 'end', dx: -4, dy: 10 },
                      { name: 'V6 [101]', x: r * 0.5, y: r * Math.sqrt(3) / 2, anchor: 'start', dx: 4, dy: 10 }
                    ].map((vec, idx) => (
                      <g key={idx}>
                        <line x1="0" y1="0" x2={vec.x} y2={vec.y} stroke="#38bdf8" strokeWidth="1.5" />
                        <circle cx={vec.x} cy={vec.y} r="3" fill="#38bdf8" />
                        <text x={vec.x + vec.dx} y={vec.y + vec.dy} textAnchor={vec.anchor as any} fill="#e2e8f0" fontSize="8" fontWeight="bold">
                          {vec.name}
                        </text>
                      </g>
                    ))}

                    {/* Rotating Reference Vector V* */}
                    {(() => {
                      const vMag = Math.min(r, r * (Math.sqrt(3) / 2) * pwmMa);
                      const vx = vMag * Math.cos(-theta);
                      const vy = vMag * Math.sin(-theta);
                      return (
                        <g>
                          <line x1="0" y1="0" x2={vx} y2={vy} stroke="#f43f5e" strokeWidth="2.5" />
                          <circle cx={vx} cy={vy} r="4" fill="#f43f5e" className="animate-ping" />
                          <circle cx={vx} cy={vy} r="4" fill="#f43f5e" />
                          <text x={vx + (vx >= 0 ? 8 : -8)} y={vy + (vy >= 0 ? 10 : -6)} fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor={vx >= 0 ? 'start' : 'end'}>
                            V* ({((thetaDeg)).toFixed(0)}°)
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })()}
            </g>

            {/* Right Panel: Volt-Second Decomposition */}
            <g transform="translate(310, 60)">
              <rect x="0" y="0" width="210" height="225" fill="#0d1117" stroke="#30363d" strokeWidth="1" rx="6" />
              
              <text x="105" y="20" textAnchor="middle" fill="#bc8cff" fontSize="10" fontWeight="bold">
                VOLT-SECOND DWELL TIME DOCK
              </text>
              <line x1="15" y1="28" x2="195" y2="28" stroke="#21262d" strokeWidth="1" />

              <g transform="translate(15, 45)">
                <text x="0" y="0" fill="#38bdf8" fontSize="9" fontWeight="bold">Ta (Vector V{sector}): {(tA_dwell * 100).toFixed(1)}%</text>
                <rect x="0" y="6" width="180" height="8" fill="#161b22" rx="4" />
                <rect x="0" y="6" width={Math.max(0, Math.min(180, tA_dwell * 180))} height="8" fill="#38bdf8" rx="4" />
              </g>

              <g transform="translate(15, 80)">
                <text x="0" y="0" fill="#a855f7" fontSize="9" fontWeight="bold">Tb (Vector V{sector === 6 ? 1 : sector + 1}): {(tB_dwell * 100).toFixed(1)}%</text>
                <rect x="0" y="6" width="180" height="8" fill="#161b22" rx="4" />
                <rect x="0" y="6" width={Math.max(0, Math.min(180, tB_dwell * 180))} height="8" fill="#a855f7" rx="4" />
              </g>

              <g transform="translate(15, 115)">
                <text x="0" y="0" fill="#eab308" fontSize="9" fontWeight="bold">T0 (Null Vectors V0/V7): {(t0_dwell * 100).toFixed(1)}%</text>
                <rect x="0" y="6" width="180" height="8" fill="#161b22" rx="4" />
                <rect x="0" y="6" width={Math.max(0, Math.min(180, t0_dwell * 180))} height="8" fill="#eab308" rx="4" />
              </g>

              <g transform="translate(15, 155)">
                <rect x="0" y="0" width="180" height="55" fill="#161b22" rx="4" stroke="#30363d" strokeWidth="1" />
                <text x="8" y="16" fill="#3fb950" fontSize="8.5" fontWeight="bold">💡 DC LINK UTILIZATION:</text>
                <text x="8" y="30" fill="#94a3b8" fontSize="7.5">SPWM Vmax = Vdc / 2 = {(busVoltage / 2).toFixed(0)}V</text>
                <text x="8" y="44" fill="#38bdf8" fontSize="7.5" fontWeight="bold">SVPWM Vmax = Vdc / √3 = {(busVoltage / Math.sqrt(3)).toFixed(0)}V (+15.5%)</text>
              </g>
            </g>
          </svg>
        ) : visualMode === 'fft_spectrum' ? (
          /* ========================================================================= */
          /* MODE 4: DYNAMIC FFT HARMONIC SPECTRUM & IEEE 519 COMPLIANCE ANALYZER      */
          /* ========================================================================= */
          <div className="w-full flex flex-col items-center">
            <svg viewBox="0 0 540 280" className="w-full h-auto max-h-[280px] select-none">
              <rect x="10" y="8" width="520" height="264" fill="#141a24" rx="8" stroke="#30363d" strokeWidth="1.5" />
              
              <text x="270" y="24" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">
                DYNAMIC FFT HARMONIC SPECTRUM &amp; IEEE 519-2022 COMPLIANCE
              </text>
              <text x="270" y="38" textAnchor="middle" fill="#8b949e" fontSize="8.5">
                V1(rms) = {spectrum.fundamentalV1Rms.toFixed(1)}V | THD_v = {spectrum.thdPct.toFixed(1)}% | Mf = {spectrum.mf} ({spectrum.isMfOdd ? 'ODD: Quarter-Wave Symmetry' : 'EVEN: Symmetry Error'})
              </text>

              {/* Chart Coordinates: X=40 to X=515 (width 475), Y=45 to Y=230 (height 185) */}
              <g transform="translate(45, 48)">
                {/* Background Grid Lines */}
                <line x1="0" y1="0" x2="470" y2="0" stroke="#21262d" strokeWidth="1" />
                <line x1="0" y1="42" x2="470" y2="42" stroke="#21262d" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="0" y1="85" x2="470" y2="85" stroke="#21262d" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="0" y1="128" x2="470" y2="128" stroke="#21262d" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="0" y1="170" x2="470" y2="170" stroke="#30363d" strokeWidth="1.5" />

                {/* Y-Axis Labels (% of Fundamental) */}
                <text x="-6" y="5" textAnchor="end" fill="#64748b" fontSize="7">100%</text>
                <text x="-6" y="46" textAnchor="end" fill="#64748b" fontSize="7">75%</text>
                <text x="-6" y="89" textAnchor="end" fill="#64748b" fontSize="7">50%</text>
                <text x="-6" y="132" textAnchor="end" fill="#64748b" fontSize="7">25%</text>
                <text x="-6" y="173" textAnchor="end" fill="#64748b" fontSize="7">0%</text>

                {/* IEEE 519 5.0% Limit Line */}
                {(() => {
                  const yLimit = 170 - (5.0 / 100) * 170;
                  return (
                    <g>
                      <line x1="0" y1={yLimit} x2="470" y2={yLimit} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="4 3" />
                      <text x="468" y={yLimit - 3} textAnchor="end" fill="#ef4444" fontSize="7" fontWeight="bold">
                        IEEE 519 Limit: 5.0%
                      </text>
                    </g>
                  );
                })()}

                {/* Unipolar Cancelled Mf Indicator Callout */}
                {modulationType === 'unipolar' && (
                  <g transform={`translate(${Math.min(420, (spectrum.mf / 60) * 470)}, 50)`}>
                    <rect x="-40" y="-12" width="80" height="18" fill="#10b98125" rx="3" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" />
                    <text x="0" y="0" textAnchor="middle" fill="#34d399" fontSize="7.5" fontWeight="bold">
                      Mf CANCELLED (0V)
                    </text>
                  </g>
                )}

                {/* Render Harmonic Bars */}
                {spectrum.harmonics.slice(0, 52).map((h) => {
                  const barX = ((h.order - 1) / 52) * 460 + 5;
                  const barW = Math.max(3, 460 / 58 - 2);
                  const barHeight = Math.min(170, (h.vPctOfFund / 100) * 170);
                  const barY = 170 - barHeight;

                  const isFund = h.order === 1;
                  const isHovered = hoveredHarmonic?.order === h.order;

                  let barColor = '#38bdf8'; // Default sky blue
                  if (isFund) barColor = '#06b6d4'; // Cyan for Fundamental
                  else if (h.isOvermodHarmonic) barColor = h.ieee519Pass ? '#f59e0b' : '#ef4444'; // Amber / Red for overmod
                  else if (h.isSideband) barColor = '#818cf8'; // Indigo for sidebands
                  else if (!h.ieee519Pass) barColor = '#ef4444'; // Red if violating

                  return (
                    <g
                      key={h.order}
                      onMouseEnter={() => setHoveredHarmonic(h)}
                      onMouseLeave={() => setHoveredHarmonic(null)}
                      className="cursor-pointer"
                    >
                      {/* Bar Rectangle */}
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={Math.max(1, barHeight)}
                        fill={barColor}
                        opacity={isHovered ? 1.0 : 0.85}
                        rx={1}
                        stroke={isHovered ? '#ffffff' : 'none'}
                        strokeWidth={isHovered ? 1.5 : 0}
                      />

                      {/* X-axis Order labels for prominent orders */}
                      {(h.order === 1 || h.order === 3 || h.order === 5 || h.order === 7 || h.order === 11 || h.order === spectrum.mf || h.order === 2 * spectrum.mf || h.order === 2 * spectrum.mf - 1) && (
                        <text
                          x={barX + barW / 2}
                          y="182"
                          textAnchor="middle"
                          fill={isFund ? '#06b6d4' : h.isSideband ? '#818cf8' : '#94a3b8'}
                          fontSize="6.5"
                          fontWeight="bold"
                        >
                          {h.order}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* X-Axis Footer Label */}
              <text x="270" y="246" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold">
                HARMONIC ORDER h (1 to 52) | Dominant Clusters: {spectrum.dominantHarmonicsStr}
              </text>
            </svg>

            {/* Hover Tooltip & Educational Details Ribbon */}
            <div className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-2 mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              {hoveredHarmonic ? (
                <div className="flex items-center gap-3 text-slate-200">
                  <span className="font-bold text-white bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
                    Order: #{hoveredHarmonic.order} ({hoveredHarmonic.freqHz} Hz)
                  </span>
                  <span>Filtered: <b className="text-[#38bdf8]">{hoveredHarmonic.vRmsFiltered} V RMS</b> ({hoveredHarmonic.vPctOfFund}% of V1)</span>
                  <span>IEEE 519: <b className={hoveredHarmonic.ieee519Pass ? 'text-emerald-400' : 'text-red-400'}>{hoveredHarmonic.ieee519Pass ? 'PASS (<5%)' : 'FAIL'}</b></span>
                  <span className="text-slate-400 italic">"{hoveredHarmonic.description}"</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>Hover over any harmonic bar to inspect exact frequency, attenuation, and IEEE 519 compliance status.</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[9.5px]">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Cyan: V1 Fund</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Amber: Overmod</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">Indigo: Sidebands</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">Red: &gt;5% Trip</span>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MODE 3: IEC 60617-STYLE FULL CIRCUIT SCHEMATIC (SLD)                     */
          /* ========================================================================= */
          <svg viewBox="0 0 540 280" className="w-full h-auto max-h-[320px] select-none">
            {/* Background Panel */}
            <rect x="10" y="10" width="520" height="260" fill="#141a24" rx="8" stroke="#30363d" strokeWidth="1.5" />

            {/* Circuit Title Header */}
            <text x="270" y="28" textAnchor="middle" fill="#f472b6" fontSize="12" fontWeight="bold">
              {physics.topologyName.toUpperCase()}
            </text>
            <text x="270" y="42" textAnchor="middle" fill="#8b949e" fontSize="9">
              Vdc = {busVoltage}V | V1(rms) = {physics.v1RmsNet.toFixed(1)}V | Pout = {physics.pOutWatts.toFixed(0)}W | Efficiency η = {physics.efficiencyPct.toFixed(1)}%
            </text>

            {/* DC Bus Rails */}
            <line x1="40" y1="65" x2="480" y2="65" stroke="#ef4444" strokeWidth="2.5" />
            <text x="45" y="58" fill="#ef4444" fontSize="9" fontWeight="bold">+Vdc (+{(vDcTotal).toFixed(0)}V)</text>

            <line x1="40" y1="235" x2="480" y2="235" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="45" y="249" fill="#38bdf8" fontSize="9" fontWeight="bold">-Vdc / RETURN (0V)</text>

            {/* Split DC Capacitors (for Half-Bridge mode only) */}
            {modulationType === 'spwm' && (
              <g transform="translate(100, 0)">
                <line x1="20" y1="65" x2="20" y2="105" stroke="#ef4444" strokeWidth="2" />
                <line x1="5" y1="105" x2="35" y2="105" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="5" y1="112" x2="35" y2="112" stroke="#94a3b8" strokeWidth="2.5" />
                <text x="40" y="111" fill="#94a3b8" fontSize="8">C1 1000µF</text>

                <circle cx="20" cy="150" r="4" fill="#38bdf8" />
                <line x1="20" y1="112" x2="20" y2="185" stroke="#38bdf8" strokeWidth="2" />
                <text x="-15" y="153" fill="#38bdf8" fontSize="8" fontWeight="bold">Midpoint N</text>

                <line x1="5" y1="185" x2="35" y2="185" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="5" y1="192" x2="35" y2="192" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="20" y1="192" x2="20" y2="235" stroke="#38bdf8" strokeWidth="2" />
                <text x="40" y="191" fill="#94a3b8" fontSize="8">C2 1000µF</text>
              </g>
            )}

            {/* LEG A: Switches Q1 & Q2 */}
            <g transform={modulationType === 'spwm' ? 'translate(190, 0)' : 'translate(170, 0)'}>
              {/* Q1 Upper Switch */}
              <rect
                x="0"
                y="65"
                width="45"
                height="45"
                fill={q1On ? '#15803d' : '#161b22'}
                stroke={q1On ? '#22c55e' : '#475569'}
                strokeWidth="2"
                rx="5"
              />
              <text x="22" y="92" textAnchor="middle" fill={q1On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q1</text>
              {q1On && <circle cx="22" cy="72" r="3" fill="#22c55e" className="animate-ping" />}

              {/* Anti-parallel Diode D1 */}
              <g transform="translate(52, 68)">
                <polygon points="12,5 12,35 0,20" fill={d1On ? '#eab308' : '#161b22'} stroke={d1On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="35" stroke={d1On ? '#fde047' : '#64748b'} strokeWidth="2" />
                <text x="8" y="-3" textAnchor="middle" fill={d1On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D1</text>
              </g>

              {/* Midpoint Node A */}
              <circle cx="22" cy="150" r="4" fill="#06b6d4" />
              <text x="-5" y="154" fill="#06b6d4" fontSize="9" fontWeight="bold">Node A</text>

              {/* Q2 Lower Switch */}
              <rect
                x="0"
                y="190"
                width="45"
                height="45"
                fill={q2On ? '#15803d' : '#161b22'}
                stroke={q2On ? '#22c55e' : '#475569'}
                strokeWidth="2"
                rx="5"
              />
              <text x="22" y="217" textAnchor="middle" fill={q2On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q2</text>
              {q2On && <circle cx="22" cy="197" r="3" fill="#22c55e" className="animate-ping" />}

              {/* Anti-parallel Diode D2 */}
              <g transform="translate(52, 193)">
                <polygon points="12,5 12,35 0,20" fill={d2On ? '#eab308' : '#161b22'} stroke={d2On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="35" stroke={d2On ? '#fde047' : '#64748b'} strokeWidth="2" />
                <text x="8" y="-3" textAnchor="middle" fill={d2On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D2</text>
              </g>

              {/* Vertical connection lines */}
              <line x1="22" y1="50" x2="22" y2="65" stroke="#ef4444" strokeWidth="2" />
              <line x1="22" y1="110" x2="22" y2="190" stroke="#06b6d4" strokeWidth="2" />
              <line x1="22" y1="235" x2="22" y2="255" stroke="#38bdf8" strokeWidth="2" />
            </g>

            {/* LEG B: Switches Q3 & Q4 (Full-Bridge Bipolar & Unipolar only) */}
            {modulationType !== 'spwm' ? (
              <g transform="translate(300, 0)">
                {/* Q3 Upper Switch */}
                <rect
                  x="0"
                  y="65"
                  width="45"
                  height="45"
                  fill={q3On ? '#15803d' : '#161b22'}
                  stroke={q3On ? '#22c55e' : '#475569'}
                  strokeWidth="2"
                  rx="5"
                />
                <text x="22" y="92" textAnchor="middle" fill={q3On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q3</text>
                {q3On && <circle cx="22" cy="72" r="3" fill="#22c55e" className="animate-ping" />}

                {/* Anti-parallel Diode D3 */}
                <g transform="translate(52, 68)">
                  <polygon points="12,5 12,35 0,20" fill={d3On ? '#eab308' : '#161b22'} stroke={d3On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                  <line x1="0" y1="5" x2="0" y2="35" stroke={d3On ? '#fde047' : '#64748b'} strokeWidth="2" />
                  <text x="8" y="-3" textAnchor="middle" fill={d3On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D3</text>
                </g>

                {/* Midpoint Node B */}
                <circle cx="22" cy="150" r="4" fill="#a855f7" />
                <text x="30" y="154" fill="#a855f7" fontSize="9" fontWeight="bold">Node B</text>

                {/* Q4 Lower Switch */}
                <rect
                  x="0"
                  y="190"
                  width="45"
                  height="45"
                  fill={q4On ? '#15803d' : '#161b22'}
                  stroke={q4On ? '#22c55e' : '#475569'}
                  strokeWidth="2"
                  rx="5"
                />
                <text x="22" y="217" textAnchor="middle" fill={q4On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q4</text>
                {q4On && <circle cx="22" cy="197" r="3" fill="#22c55e" className="animate-ping" />}

                {/* Anti-parallel Diode D4 */}
                <g transform="translate(52, 193)">
                  <polygon points="12,5 12,35 0,20" fill={d4On ? '#eab308' : '#161b22'} stroke={d4On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                  <line x1="0" y1="5" x2="0" y2="35" stroke={d4On ? '#fde047' : '#64748b'} strokeWidth="2" />
                  <text x="8" y="-3" textAnchor="middle" fill={d4On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D4</text>
                </g>

                {/* Vertical connection lines */}
                <line x1="22" y1="50" x2="22" y2="65" stroke="#ef4444" strokeWidth="2" />
                <line x1="22" y1="110" x2="22" y2="190" stroke="#a855f7" strokeWidth="2" />
                <line x1="22" y1="235" x2="22" y2="255" stroke="#38bdf8" strokeWidth="2" />
              </g>
            ) : null}

            {/* Output 2nd-Order LC Filter: Choke Lf & Shunt Cf with Animated Flux Halo */}
            <g transform={modulationType === 'spwm' ? 'translate(250, 140)' : 'translate(360, 140)'}>
              <ellipse cx="25" cy="10" rx="28" ry="14" fill="#06b6d415" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" />
              
              {/* Series Inductor Coils Lf */}
              <path d="M 0 10 Q 7 -5 14 10 Q 21 -5 28 10 Q 35 -5 42 10 Q 49 -5 56 10" fill="none" stroke="#06b6d4" strokeWidth="2.8" />
              <text x="28" y="-7" textAnchor="middle" fill="#06b6d4" fontSize="8" fontWeight="bold">Lf {filterL_mH.toFixed(1)}mH</text>

              {/* Shunt Filter Capacitor Cf */}
              <g transform="translate(68, 10)">
                <line x1="0" y1="0" x2="0" y2="28" stroke="#06b6d4" strokeWidth="1.5" />
                <line x1="-8" y1="28" x2="8" y2="28" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="-8" y1="34" x2="8" y2="34" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="0" y1="34" x2="0" y2="60" stroke="#06b6d4" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="2.5" fill="#06b6d4" />
                <circle cx="0" cy="60" r="2.5" fill="#06b6d4" />
                <text x="12" y="34" fill="#38bdf8" fontSize="7.5" fontWeight="bold">Cf {filterC_uF.toFixed(0)}µF</text>
              </g>

              {/* Load Resistor RL */}
              <g transform="translate(85, 0)">
                <line x1="-29" y1="10" x2="0" y2="10" stroke="#06b6d4" strokeWidth="2" />
                <rect x="0" y="2" width="28" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                <text x="14" y="-6" textAnchor="middle" fill="#e3b341" fontSize="8" fontWeight="bold">RL {loadR}Ω</text>
                <text x="14" y="13" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">LOAD</text>
                {/* RL return lead down to return bus */}
                <path d="M 28 10 L 40 10 L 40 70 L -17 70" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
                <circle cx="28" cy="10" r="2" fill="#06b6d4" />
                <circle cx="-17" cy="70" r="2.5" fill="#06b6d4" />
              </g>

              {/* Return Bus Conductor back to Neutral/Node B */}
              {modulationType === 'spwm' ? (
                <path d="M 68 70 L -130 70 L -130 10" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 3" />
              ) : (
                <path d="M 68 70 L -38 70 L -38 10" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3" />
              )}
            </g>

            {/* Shoot-Through Cross-Conduction Short Circuit Blast (if t_dead == 0) */}
            {isShootThrough && (
              <g transform="translate(195, 120)">
                <rect x="-10" y="-15" width="65" height="30" fill="#da3633" rx="4" className="animate-pulse" />
                <text x="22" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  💥 SHORT!
                </text>
              </g>
            )}

            {/* Animated Conduction Current Dots */}
            {(() => {
              const p = (effectiveTime * 3) % 1;
              const pathX = 212 + p * 150;
              return (
                <circle cx={pathX} cy="150" r="3.5" fill="#22c55e" className="animate-pulse" />
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
};
