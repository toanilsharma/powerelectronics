import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Layers,
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';

interface PhaseControlOverlapNotchingLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlOverlapNotchingLab.tsx
 * 
 * Recommendation 4: Source Inductance (Ls) & Multi-Pulse Overlap (mu) Voltage Notch Engine
 * with IEEE Std 519 Line Notching Compliance.
 * 
 * Features:
 *  - 1-Phase and 3-Phase 6-Pulse commutating converter modes.
 *  - Real-time computation of Commutation Overlap Angle mu:
 *      cos(alpha) - cos(alpha + mu) = 2*omega*Ls*Id / Vm
 *  - DC output voltage drop: Delta Vd = (m * omega * Ls / 2pi) * Id
 *  - Point of Common Coupling (PCC) vs Converter Terminals Inductive Voltage Divider:
 *      Notch Depth (%) = L_grid / (L_grid + L_xfmr + L_reactor) * 100%
 *      Notch Area (V*us) = 2 * L_grid * Id
 *  - Live IEEE Std 519 Compliance Meter (Special <= 10%, General <= 20%, Dedicated <= 50%).
 *  - Animated Commutation Loop showing simultaneous conduction of outgoing and incoming thyristors.
 *  - AC Line Reactor mitigation slider showing live notch smoothing.
 *  - Inverter Commutation Failure boundary warning (alpha + mu + gamma_min >= 180 deg).
 */
export const PhaseControlOverlapNotchingLab: React.FC<PhaseControlOverlapNotchingLabProps> = ({
  className = '',
  onClose,
}) => {
  // Converter Configuration
  const [converterType, setConverterType] = useState<'1phase' | '3phase'>('3phase');
  const [alpha, setAlpha] = useState<number>(30); // Firing angle in degrees
  const [idLoad, setIdLoad] = useState<number>(50); // DC Load current (A)
  const [lGrid_uH, setLGrid_uH] = useState<number>(80); // Grid/utility inductance (uH)
  const [lXfmr_uH, setLXfmr_uH] = useState<number>(120); // Transformer leakage inductance (uH)
  const [lReactor_uH, setLReactor_uH] = useState<number>(0); // Added AC line reactor (uH)
  const [vRms, setVRms] = useState<number>(480); // AC Line RMS (V)
  const [gridFreq, setGridFreq] = useState<number>(60); // Frequency (Hz)
  const [ieeeClass, setIeeeClass] = useState<'special' | 'general' | 'dedicated'>('general');

  // Animation & Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [time, setTime] = useState<number>(0);
  const [viewScope, setViewScope] = useState<'pcc' | 'converter' | 'dc_output' | 'both'>('both');
  const [showCommutationLoop, setShowCommutationLoop] = useState<boolean>(true);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Animation loop
  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        setTime((t) => (t + dt * simSpeed * 60) % 360);
      }
      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, simSpeed]);

  // Electrical computations
  const physics = useMemo(() => {
    const omega = 2 * Math.PI * gridFreq;
    const lTotal_H = (lGrid_uH + lXfmr_uH + lReactor_uH) * 1e-6;
    const lGrid_H = lGrid_uH * 1e-6;
    const lTotal_uH = lGrid_uH + lXfmr_uH + lReactor_uH;

    const alphaRad = (alpha * Math.PI) / 180;
    const is3Ph = converterType === '3phase';

    // Vm definition:
    // For 1-Phase: Vm is peak AC voltage = vRms * sqrt(2)
    // For 3-Phase: Vm_LL is peak line-to-line voltage = vRms * sqrt(2)
    const vm = vRms * Math.SQRT2;

    // Overlap angle mu:
    // 1-phase: cos(alpha) - cos(alpha + mu) = (2 * omega * Ls * Id) / Vm
    // 3-phase: cos(alpha) - cos(alpha + mu) = (2 * omega * Ls * Id) / (sqrt(3) * Vm_phase_peak) = 2*omega*Ls*Id / Vm_LL
    const deltaCos = (2 * omega * lTotal_H * idLoad) / vm;
    const cosAlpha = Math.cos(alphaRad);
    let cosAlphaPlusMu = cosAlpha - deltaCos;

    let muDeg = 0;
    let commutationFailed = false;

    if (cosAlphaPlusMu < -1) {
      // Overlap cannot complete before 180 deg or current too high
      cosAlphaPlusMu = -1;
      muDeg = 180 - alpha;
      commutationFailed = true;
    } else {
      const alphaPlusMuRad = Math.acos(cosAlphaPlusMu);
      muDeg = Math.max(0, (alphaPlusMuRad * 180) / Math.PI - alpha);
    }

    // DC Voltage Drop Delta Vd:
    // 1-phase: Delta Vd = (omega * Ls / pi) * Id = 2 * f * Ls * Id
    // 3-phase: Delta Vd = (3 * omega * Ls / pi) * Id = 6 * f * Ls * Id
    const deltaVd = is3Ph
      ? (3 * omega * lTotal_H * idLoad) / Math.PI
      : (omega * lTotal_H * idLoad) / Math.PI;

    // Ideal DC average Vd0 * cos(alpha)
    // 1-phase: Vd0 = (2 * Vm) / pi
    // 3-phase: Vd0 = (3 * sqrt(3) * Vm_phase_peak) / pi = (3 * Vm_LL) / pi
    const vd0 = is3Ph ? (3 * vm) / Math.PI : (2 * vm) / Math.PI;
    const vdIdeal = vd0 * Math.cos(alphaRad);
    const vdActual = Math.max(0, vdIdeal - deltaVd);

    // PCC Voltage Divider & Notching:
    // Notch Depth at PCC = (L_grid / L_total) * 100%
    const notchDepthPct = lTotal_uH > 0 ? (lGrid_uH / lTotal_uH) * 100 : 0;

    // Notch Depth at Converter Terminals = 100% during commutation (phase short)
    const converterNotchDepthPct = 100;

    // Notch Area An = (Notch depth voltage drop) * (duration in us)
    // An approx = 2 * L_grid * Id (V * s) -> in V*us:
    const notchArea_Vus = 2 * lGrid_H * idLoad * 1e6;

    // IEEE Std 519-2014 / 2022 Line Notching Limits:
    // Special Applications: Depth <= 10%, Area <= 16,400 V-us
    // General System: Depth <= 20%, Area <= 22,800 V-us
    // Dedicated System: Depth <= 50%, Area <= 36,500 V-us
    let maxDepthPct = 20;
    let maxArea_Vus = 22800;
    if (ieeeClass === 'special') {
      maxDepthPct = 10;
      maxArea_Vus = 16400;
    } else if (ieeeClass === 'dedicated') {
      maxDepthPct = 50;
      maxArea_Vus = 36500;
    }

    const depthPassed = notchDepthPct <= maxDepthPct;
    const areaPassed = notchArea_Vus <= maxArea_Vus;
    const ieeePassed = depthPassed && areaPassed;

    // Inverter commutation margin:
    // Inverting when alpha > 90 deg. Safety extinction angle gamma_min approx 15 deg.
    const gamma = 180 - (alpha + muDeg);
    const isInverting = alpha > 90;
    const inverterFailureRisk = isInverting && gamma < 15;

    return {
      omega,
      lTotal_uH,
      lTotal_H,
      vm,
      muDeg,
      deltaVd,
      vd0,
      vdIdeal,
      vdActual,
      notchDepthPct,
      converterNotchDepthPct,
      notchArea_Vus,
      maxDepthPct,
      maxArea_Vus,
      depthPassed,
      areaPassed,
      ieeePassed,
      gamma,
      isInverting,
      inverterFailureRisk,
      commutationFailed,
    };
  }, [converterType, alpha, idLoad, lGrid_uH, lXfmr_uH, lReactor_uH, vRms, gridFreq, ieeeClass]);

  // Instantaneous waveform generation for SVG CRT Scope
  const waveformData = useMemo(() => {
    const points = 360;
    const pccPoints: { x: number; y: number }[] = [];
    const convPoints: { x: number; y: number }[] = [];
    const dcPoints: { x: number; y: number }[] = [];
    const idPoints: { x: number; y: number }[] = [];

    const is3Ph = converterType === '3phase';
    const vm = physics.vm;
    const mu = physics.muDeg;
    const notchRatio = physics.notchDepthPct / 100;

    // Pulse notches per cycle:
    // 1-phase bridge has 2 commutation periods per 360 deg:
    //   Commutation 1 at alpha to alpha + mu
    //   Commutation 2 at 180 + alpha to 180 + alpha + mu
    // 3-phase 6-pulse has 6 commutation notches per 360 deg:
    //   Every 60 deg starting at alpha + 30 or 60*k + alpha
    const notchStarts = is3Ph
      ? [
          (alpha + 0) % 360,
          (alpha + 60) % 360,
          (alpha + 120) % 360,
          (alpha + 180) % 360,
          (alpha + 240) % 360,
          (alpha + 300) % 360,
        ]
      : [(alpha) % 360, (alpha + 180) % 360];

    const isAngleInNotch = (thetaDeg: number) => {
      for (const nStart of notchStarts) {
        const diff = (thetaDeg - nStart + 360) % 360;
        if (diff >= 0 && diff < mu) {
          return { inNotch: true, progress: diff / Math.max(0.1, mu) };
        }
      }
      return { inNotch: false, progress: 0 };
    };

    for (let deg = 0; deg <= points; deg++) {
      const rad = (deg * Math.PI) / 180;
      // Ideal AC Phase/Line Voltage
      const vAcIdeal = vm * Math.sin(rad);

      const notchCheck = isAngleInNotch(deg);

      let vPcc = vAcIdeal;
      let vConv = vAcIdeal;

      if (notchCheck.inNotch) {
        // At converter terminals: during commutation, line voltage collapses to zero (or average)
        // Mid-point voltage during line-to-line overlap is 0 (for symmetric ac line)
        vConv = 0;
        // At PCC: inductive divider pulls it down by notchRatio towards zero
        vPcc = vAcIdeal * (1 - notchRatio);
      }

      // DC output waveform:
      let vDc = 0;
      if (is3Ph) {
        // 6-pulse bridge DC waveform:
        // Highest line-to-line voltage with commutation ramps
        const segment = Math.floor(((deg - alpha + 360) % 360) / 60);
        const thetaInSegment = ((deg - alpha + 360) % 360) % 60;
        const vPeakL = vm;
        if (thetaInSegment < mu) {
          // During overlap, DC voltage is average of previous and incoming line voltages (reduced by Delta V)
          const ramp = thetaInSegment / Math.max(0.1, mu);
          const vPrev = vPeakL * Math.cos(((thetaInSegment + 60 - 30) * Math.PI) / 180);
          const vNext = vPeakL * Math.cos(((thetaInSegment - 30) * Math.PI) / 180);
          vDc = (vPrev + vNext) / 2;
        } else {
          vDc = vPeakL * Math.cos(((thetaInSegment - 30) * Math.PI) / 180);
        }
      } else {
        // 1-phase bridge DC waveform:
        const thetaInHalf = deg % 180;
        const thetaFromAlpha = (deg - alpha + 360) % 180;
        if (thetaFromAlpha < mu) {
          // Overlap: both positive and negative thyristors conducting simultaneously -> short-circuits DC side!
          vDc = 0;
        } else {
          vDc = Math.abs(vm * Math.sin(rad));
        }
      }

      pccPoints.push({ x: deg, y: vPcc });
      convPoints.push({ x: deg, y: vConv });
      dcPoints.push({ x: deg, y: vDc });
      idPoints.push({ x: deg, y: physics.vdActual });
    }

    return { pccPoints, convPoints, dcPoints, idPoints };
  }, [converterType, alpha, physics]);

  // SVG coordinate transformation helpers
  const svgWidth = 840;
  const svgHeight = 280;
  const vScale = svgHeight / (2.6 * physics.vm);
  const midY = svgHeight / 2;

  const toSvgPath = (points: { x: number; y: number }[], offsetMidY: number = midY) => {
    return points
      .map((pt, idx) => {
        const svgX = (pt.x / 360) * svgWidth;
        const svgY = offsetMidY - pt.y * vScale;
        return `${idx === 0 ? 'M' : 'L'} ${svgX.toFixed(1)},${svgY.toFixed(1)}`;
      })
      .join(' ');
  };

  // Determine current active commutation state for the animated schematic
  const isCurrentlyInNotch = useMemo(() => {
    const is3Ph = converterType === '3phase';
    const mu = physics.muDeg;
    const notchStarts = is3Ph
      ? [
          (alpha + 0) % 360,
          (alpha + 60) % 360,
          (alpha + 120) % 360,
          (alpha + 180) % 360,
          (alpha + 240) % 360,
          (alpha + 300) % 360,
        ]
      : [(alpha) % 360, (alpha + 180) % 360];

    for (const nStart of notchStarts) {
      const diff = (time - nStart + 360) % 360;
      if (diff >= 0 && diff < mu) {
        return { active: true, progress: diff / Math.max(0.1, mu), notchStart: nStart };
      }
    }
    return { active: false, progress: 0, notchStart: 0 };
  }, [time, alpha, physics.muDeg, converterType]);

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 rounded-lg text-amber-400 shadow-lg shadow-amber-950/30">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                Source Inductance Overlap & Voltage Notching Lab
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full">
                IEEE Std 519-2022
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Commutation Overlap (<span className="text-amber-300 font-mono font-bold">&mu;</span>) &bull; Point of Common Coupling (PCC) Inductive Divider &bull; Line-to-Line Short Loop
            </p>
          </div>
        </div>

        {/* Converter Mode Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setConverterType('1phase')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                converterType === '1phase'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1-Phase (2 Notches/Cycle)
            </button>
            <button
              onClick={() => setConverterType('3phase')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                converterType === '3phase'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3-Phase 6-Pulse (6 Notches/Cycle)
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause Simulation' : 'Run Simulation'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setTime(0);
                setAlpha(30);
                setIdLoad(50);
                setLGrid_uH(80);
                setLXfmr_uH(120);
                setLReactor_uH(0);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset Parameters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
        {/* Left Column: Waveform Oscilloscope & Commutation Circuit */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Oscilloscope View */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner relative flex flex-col">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Dual-Trace CRT Oscilloscope: PCC Voltage Notches vs Converter Terminals
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setViewScope('both')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    viewScope === 'both'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Overlay (PCC & Conv)
                </button>
                <button
                  onClick={() => setViewScope('pcc')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    viewScope === 'pcc'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  PCC Only
                </button>
                <button
                  onClick={() => setViewScope('dc_output')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    viewScope === 'dc_output'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  DC Output (Vd)
                </button>
              </div>
            </div>

            {/* SVG Scope Canvas */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden relative shadow-2xl">
              {/* CRT Grid Background */}
              <svg className="w-full h-72 block select-none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <pattern id="grid-pattern-notching" width="35" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,3" />
                  </pattern>
                  <linearGradient id="notchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <rect width={svgWidth} height={svgHeight} fill="#020617" />
                <rect width={svgWidth} height={svgHeight} fill="url(#grid-pattern-notching)" />

                {/* Midline Zero-Volt Axes */}
                <line x1="0" y1={midY} x2={svgWidth} y2={midY} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />
                <line x1={svgWidth / 2} y1="0" x2={svgWidth / 2} y2={svgHeight} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />

                {/* Firing Angle & Overlap Angle Indicator Regions */}
                {viewScope !== 'dc_output' && (
                  <g>
                    {/* Commutation zone highlights */}
                    {(converterType === '3phase'
                      ? [alpha, (alpha + 60) % 360, (alpha + 120) % 360, (alpha + 180) % 360, (alpha + 240) % 360, (alpha + 300) % 360]
                      : [alpha, (alpha + 180) % 360]
                    ).map((nStart, idx) => {
                      const startX = (nStart / 360) * svgWidth;
                      const widthX = (physics.muDeg / 360) * svgWidth;
                      return (
                        <g key={idx}>
                          <rect
                            x={startX}
                            y="0"
                            width={Math.max(2, widthX)}
                            height={svgHeight}
                            fill="#f59e0b"
                            fillOpacity="0.12"
                          />
                          <line
                            x1={startX}
                            y1="0"
                            x2={startX}
                            y2={svgHeight}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                          {idx === 0 && (
                            <text
                              x={startX + widthX / 2}
                              y={20}
                              fill="#f59e0b"
                              fontSize="11"
                              fontWeight="bold"
                              textAnchor="middle"
                              className="font-mono"
                            >
                              &mu;={physics.muDeg.toFixed(1)}&deg;
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Waveforms */}
                {/* 1. Converter Terminal Voltage (collapses fully to zero during overlap) */}
                {(viewScope === 'both' || viewScope === 'converter') && (
                  <path
                    d={toSvgPath(waveformData.convPoints)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.8"
                    strokeDasharray="4,2"
                    className="opacity-75"
                  />
                )}

                {/* 2. PCC Line Voltage (notched by L_grid/(L_grid + L_xfmr + L_reactor)) */}
                {(viewScope === 'both' || viewScope === 'pcc') && (
                  <path
                    d={toSvgPath(waveformData.pccPoints)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.4"
                    className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                  />
                )}

                {/* 3. DC Output Voltage Vd */}
                {viewScope === 'dc_output' && (
                  <g>
                    <path
                      d={toSvgPath(waveformData.dcPoints, svgHeight - 40)}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                    />
                    {/* Average DC Voltage Line */}
                    <line
                      x1="0"
                      y1={svgHeight - 40 - physics.vdActual * vScale}
                      x2={svgWidth}
                      y2={svgHeight - 40 - physics.vdActual * vScale}
                      stroke="#34d399"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                    />
                    <text
                      x={svgWidth - 100}
                      y={svgHeight - 45 - physics.vdActual * vScale}
                      fill="#34d399"
                      fontSize="12"
                      fontWeight="bold"
                      className="font-mono"
                    >
                      Vd(avg)={physics.vdActual.toFixed(1)}V
                    </text>
                  </g>
                )}

                {/* Live Animated Scanning Line */}
                <line
                  x1={(time / 360) * svgWidth}
                  y1="0"
                  x2={(time / 360) * svgWidth}
                  y2={svgHeight}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="opacity-80"
                />
                <circle
                  cx={(time / 360) * svgWidth}
                  cy={
                    viewScope === 'dc_output'
                      ? svgHeight - 40 - (waveformData.dcPoints[Math.floor(time)]?.y || 0) * vScale
                      : midY - (waveformData.pccPoints[Math.floor(time)]?.y || 0) * vScale
                  }
                  r="4"
                  fill="#ffffff"
                  className="shadow-lg shadow-white"
                />
              </svg>

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-800 text-xs">
                {(viewScope === 'both' || viewScope === 'pcc') && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-amber-500 rounded-full" />
                    <span className="text-amber-300 font-mono font-bold">
                      V_PCC(t) [Notch Depth = {physics.notchDepthPct.toFixed(1)}%]
                    </span>
                  </div>
                )}
                {(viewScope === 'both' || viewScope === 'converter') && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-cyan-400 rounded-full border border-dashed" />
                    <span className="text-cyan-300 font-mono">V_Conv(t) [Collapses to 0V]</span>
                  </div>
                )}
                {viewScope === 'dc_output' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-emerald-400 rounded-full" />
                    <span className="text-emerald-300 font-mono font-bold">
                      Vd(t) [Drop &Delta;Vd = {physics.deltaVd.toFixed(1)}V]
                    </span>
                  </div>
                )}
              </div>

              {/* Commutation active alert badge */}
              {isCurrentlyInNotch.active && (
                <div className="absolute top-3 right-4 flex items-center space-x-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  <Zap className="w-3.5 h-3.5" />
                  <span>COMMUTATION OVERLAP ACTIVE (&mu;)</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Single-Line Diagram & Commutation Loop Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Inductive Voltage Divider & Commutation Short-Circuit Loop
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                PCC Voltage Divider: d_N = L_grid / (L_grid + L_xfmr + L_reactor)
              </span>
            </div>

            {/* Circuit Schematic Canvas */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-4 relative overflow-hidden">
              <svg className="w-full h-48 select-none" viewBox="0 0 760 180">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                  </marker>
                  <marker id="arrow-loop" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                  </marker>
                </defs>

                {/* 1. AC Utility Source */}
                <circle cx="50" cy="90" r="26" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                <path d="M 38 90 Q 44 78 50 90 T 62 90" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="50" y="132" fill="#94a3b8" fontSize="11" textAnchor="middle" className="font-mono">
                  Utility {vRms}V
                </text>

                {/* Bus wire to L_grid */}
                <line x1="76" y1="90" x2="110" y2="90" stroke="#94a3b8" strokeWidth="3" />

                {/* 2. Grid Inductance L_grid */}
                <rect x="110" y="74" width="70" height="32" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="145" y="94" fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  L_grid
                </text>
                <text x="145" y="122" fill="#f59e0b" fontSize="10" textAnchor="middle" className="font-mono">
                  {lGrid_uH}&mu;H
                </text>

                {/* Bus wire to PCC Node */}
                <line x1="180" y1="90" x2="250" y2="90" stroke="#94a3b8" strokeWidth="3" />

                {/* 3. Point of Common Coupling (PCC) Node */}
                <circle cx="250" cy="90" r="7" fill="#f59e0b" className="animate-ping opacity-75" />
                <circle cx="250" cy="90" r="6" fill="#f59e0b" />
                {/* PCC Drop Line to Meter */}
                <line x1="250" y1="90" x2="250" y2="40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
                <rect x="210" y="16" width="80" height="24" rx="4" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="250" y="32" fill="#fef08a" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  PCC NODE
                </text>

                {/* Bus wire from PCC to Transformer Inductance */}
                <line x1="250" y1="90" x2="310" y2="90" stroke="#94a3b8" strokeWidth="3" />

                {/* 4. Transformer Inductance L_xfmr */}
                <rect x="310" y="74" width="70" height="32" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x="345" y="94" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  L_xfmr
                </text>
                <text x="345" y="122" fill="#38bdf8" fontSize="10" textAnchor="middle" className="font-mono">
                  {lXfmr_uH}&mu;H
                </text>

                {/* Bus wire to Added Line Reactor */}
                <line x1="380" y1="90" x2="420" y2="90" stroke="#94a3b8" strokeWidth="3" />

                {/* 5. Added Line Reactor L_reactor */}
                <rect
                  x="420"
                  y="74"
                  width="80"
                  height="32"
                  rx="4"
                  fill={lReactor_uH > 0 ? '#064e3b' : '#1e293b'}
                  stroke={lReactor_uH > 0 ? '#10b981' : '#64748b'}
                  strokeWidth="2"
                />
                <text
                  x="460"
                  y="94"
                  fill={lReactor_uH > 0 ? '#34d399' : '#94a3b8'}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono"
                >
                  L_reactor
                </text>
                <text
                  x="460"
                  y="122"
                  fill={lReactor_uH > 0 ? '#34d399' : '#64748b'}
                  fontSize="10"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {lReactor_uH}&mu;H
                </text>

                {/* Wire to Converter AC Terminals */}
                <line x1="500" y1="90" x2="560" y2="90" stroke="#94a3b8" strokeWidth="3" />
                <circle cx="560" cy="90" r="5" fill="#38bdf8" />
                <text x="560" y="42" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">
                  CONV BUS
                </text>

                {/* 6. SCR Bridge Converter Block */}
                <rect x="580" y="50" width="80" height="80" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2.5" />
                <text x="620" y="86" fill="#c7d2fe" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  {converterType === '3phase' ? '6-PULSE' : '1-PHASE'}
                </text>
                <text x="620" y="104" fill="#a5b4fc" fontSize="10" textAnchor="middle" className="font-mono">
                  BRIDGE
                </text>

                {/* DC Output Link */}
                <line x1="660" y1="70" x2="710" y2="70" stroke="#ef4444" strokeWidth="3" />
                <line x1="660" y1="110" x2="710" y2="110" stroke="#3b82f6" strokeWidth="3" />
                {/* DC Load */}
                <rect x="710" y="60" width="36" height="60" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                <text x="728" y="95" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Id
                </text>

                {/* COMMUTATION SHORT CIRCUIT LOOP ANIMATION */}
                {isCurrentlyInNotch.active && (
                  <g className="animate-pulse">
                    {/* Circulating short circuit loop during overlap */}
                    <path
                      d="M 560 90 C 530 140, 430 140, 420 90"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeDasharray="4,3"
                      markerEnd="url(#arrow-loop)"
                    />
                    <rect x="440" y="145" width="160" height="22" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                    <text x="520" y="160" fill="#fca5a5" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">
                      COMMUTATION SHORT LOOP (di/dt = V_LL / 2Ls)
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical & Compliance Dashboard */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* IEEE Std 519 Compliance Card */}
          <div
            className={`border rounded-xl p-5 shadow-xl transition-all ${
              physics.ieeePassed
                ? 'bg-slate-900/90 border-emerald-500/40 shadow-emerald-950/20'
                : 'bg-slate-900/90 border-rose-500/50 shadow-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {physics.ieeePassed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 animate-pulse" />
                )}
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  IEEE Std 519 Compliance
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  physics.ieeePassed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {physics.ieeePassed ? 'PASSED' : 'VIOLATION'}
              </span>
            </div>

            {/* Application Class Toggle */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1 font-semibold">IEEE 519 System Class:</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {(['special', 'general', 'dedicated'] as const).map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setIeeeClass(cls)}
                    className={`py-1 rounded font-bold capitalize transition-all ${
                      ieeeClass === cls
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Meter 1: Notch Depth */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">PCC Notch Depth (d_N):</span>
                <span className={physics.depthPassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {physics.notchDepthPct.toFixed(1)}% / Max {physics.maxDepthPct}%
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    physics.depthPassed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (physics.notchDepthPct / physics.maxDepthPct) * 100)}%` }}
                />
              </div>
            </div>

            {/* Meter 2: Notch Area */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Notch Area (A_N):</span>
                <span className={physics.areaPassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {physics.notchArea_Vus.toFixed(0)} V&middot;&mu;s / Max {physics.maxArea_Vus.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    physics.areaPassed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (physics.notchArea_Vus / physics.maxArea_Vus) * 100)}%` }}
                />
              </div>
            </div>

            {/* Pedagogical Mitigation Recommendation */}
            {!physics.ieeePassed && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Remedy:</span> Increase the{' '}
                  <span className="font-bold text-amber-300">AC Line Reactor (L_reactor)</span> slider below to
                  increase impedance between PCC and converter terminals, reducing PCC notch depth!
                </div>
              </div>
            )}
          </div>

          {/* Key Electrical Telemetry Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Commutation Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Overlap Angle (&mu;)</div>
                <div className="text-xl font-mono font-black text-amber-400">
                  {physics.muDeg.toFixed(2)}&deg;
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {((physics.muDeg / 360) * (1000 / gridFreq) * 1000).toFixed(1)} &mu;s
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">DC Voltage Drop (&Delta;Vd)</div>
                <div className="text-xl font-mono font-black text-rose-400">
                  -{physics.deltaVd.toFixed(1)} V
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {((physics.deltaVd / Math.max(1, physics.vdIdeal)) * 100).toFixed(1)}% Loss
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Net DC Output Vd</div>
                <div className="text-xl font-mono font-black text-emerald-400">
                  {physics.vdActual.toFixed(1)} V
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Ideal: {physics.vdIdeal.toFixed(1)} V
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Turn-Off Margin (&gamma;)</div>
                <div
                  className={`text-xl font-mono font-black ${
                    physics.inverterFailureRisk ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
                  }`}
                >
                  {physics.gamma.toFixed(1)}&deg;
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {physics.isInverting ? 'Inversion Mode' : 'Rectifier Mode'}
                </div>
              </div>
            </div>

            {/* Inverter Commutation Failure Danger Alert */}
            {physics.inverterFailureRisk && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-xs text-rose-200 flex items-center space-x-2 animate-bounce">
                <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <span className="font-black text-rose-300 uppercase">Commutation Failure Risk!</span> Extinction margin &gamma; &lt; 15&deg;. Thyristor cannot recover forward blocking!
                </div>
              </div>
            )}
          </div>

          {/* Interactive Parameters Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Controls</span>
            </h3>

            {/* Firing Angle Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Firing Angle (&alpha;):</span>
                <span className="text-amber-400 font-bold">{alpha}&deg;</span>
              </div>
              <input
                type="range"
                min="0"
                max="160"
                step="1"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* DC Load Current Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">DC Load Current (Id):</span>
                <span className="text-emerald-400 font-bold">{idLoad} A</span>
              </div>
              <input
                type="range"
                min="5"
                max="250"
                step="5"
                value={idLoad}
                onChange={(e) => setIdLoad(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Grid Inductance L_grid */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Grid Inductance (L_grid):</span>
                <span className="text-amber-400 font-bold">{lGrid_uH} &mu;H</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={lGrid_uH}
                onChange={(e) => setLGrid_uH(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Mitigation: Added AC Line Reactor Slider */}
            <div className="space-y-1 p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-emerald-300 font-bold">Mitigation AC Line Reactor (L_reactor):</span>
                <span className="text-emerald-400 font-bold">{lReactor_uH} &mu;H</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={lReactor_uH}
                onChange={(e) => setLReactor_uH(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="text-[10px] text-emerald-400/80 font-mono">
                Increases downstream impedance &rarr; drops PCC notch depth immediately!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
