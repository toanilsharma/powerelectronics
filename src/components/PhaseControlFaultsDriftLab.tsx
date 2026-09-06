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
  Flame,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  Gauge,
  Compass,
  CheckCircle2,
  XCircle,
  Magnet
} from 'lucide-react';

interface PhaseControlFaultsDriftLabProps {
  className?: string;
  onClose?: () => void;
}

type FaultMode =
  | 'healthy'
  | 'missing_gate_scr3'
  | 'single_phasing_phaseA'
  | 'gate_jitter_asymmetry'
  | 'reverse_phase_sequence';

/**
 * PhaseControlFaultsDriftLab.tsx
 * 
 * Recommendation 8: 3-Phase Phase-Sequence & Asymmetrical Firing Fault Lab
 * with Transformer DC Core Saturation Visualizer.
 * 
 * Features:
 *  - Interactive Fault Matrix:
 *      1. Normal Balanced 6-Pulse (Healthy)
 *      2. Missing Gate Pulse on SCR 3 (5-Pulse Operation, DC bias, 100Hz ripple)
 *      3. Lost AC Phase A / Single-Phasing (Blown upstream fuse)
 *      4. Firing Angle Asymmetry / Microcontroller Jitter (+-15 deg drift)
 *      5. Reversed Phase Sequence (C-B-A vs A-B-C)
 *  - Transformer DC Core Saturation Visualizer:
 *      Live B-H magnetic curve showing DC operating point offset into saturation.
 *  - Low-Frequency Sub-Harmonic Spectrum (50Hz, 100Hz, 150Hz spikes).
 *  - Dual-Trace Scope: Healthy 6-Pulse baseline vs Real-Time Faulted Waveform.
 */
export const PhaseControlFaultsDriftLab: React.FC<PhaseControlFaultsDriftLabProps> = ({
  className = '',
  onClose,
}) => {
  // Fault State
  const [activeFault, setActiveFault] = useState<FaultMode>('healthy');
  const [nominalAlpha, setNominalAlpha] = useState<number>(30); // Firing angle (deg)
  const [idLoad, setIdLoad] = useState<number>(40); // DC Load current (A)
  const [vAcRms, setVAcRms] = useState<number>(415); // AC supply (V)
  const [gridFreq, setGridFreq] = useState<number>(50); // Grid freq (Hz)
  const [jitterAngle, setJitterAngle] = useState<number>(15); // Asymmetry spread (deg)

  // Simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [time, setTime] = useState<number>(0);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (isPlaying) {
        setTime((t) => (t + dt * 60) % 360);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  // Electrical physics computations
  const physics = useMemo(() => {
    const vmLL = vAcRms * Math.SQRT2;
    const vd0_ideal = (3 * vmLL) / Math.PI; // approx 1.35 * V_LL = 560V at 415V
    const alphaRad = (nominalAlpha * Math.PI) / 180;
    const vdNominal = vd0_ideal * Math.cos(alphaRad);

    let vdActual = vdNominal;
    let dcCurrentBias_A = 0;
    let dominantRippleFreq = 6 * gridFreq; // 300Hz
    let rippleFactorPct = 4.0;
    let coreSaturationLevel = 10; // 0 - 100%

    if (activeFault === 'healthy') {
      vdActual = vdNominal;
      dcCurrentBias_A = 0;
      dominantRippleFreq = 6 * gridFreq;
      rippleFactorPct = 4.04;
      coreSaturationLevel = 10;
    } else if (activeFault === 'missing_gate_scr3') {
      // Missing gate pulse on SCR 3: 5 pulses per cycle
      // Average voltage drops by approx 1/6th = 16.7%
      vdActual = vdNominal * 0.833;
      // Injects net unidirectional half-wave current into Phase B:
      dcCurrentBias_A = (idLoad / 3) * 0.5; // ~6.7A DC bias!
      dominantRippleFreq = gridFreq; // 50 Hz fundamental ripple!
      rippleFactorPct = 28.5;
      // High saturation hazard!
      coreSaturationLevel = 88;
    } else if (activeFault === 'single_phasing_phaseA') {
      // 1 phase completely missing: collapses to 1-phase full wave bridge
      // Vd drops from (3*VmLL)/pi to (2*VmLL)/pi = drops by ~33%
      vdActual = vdNominal * 0.667;
      dcCurrentBias_A = 0; // AC current is balanced on remaining two lines
      dominantRippleFreq = 2 * gridFreq; // 100 Hz ripple
      rippleFactorPct = 48.3;
      coreSaturationLevel = 25;
    } else if (activeFault === 'gate_jitter_asymmetry') {
      // Unequal firing angles across pulses
      vdActual = vdNominal * 0.96;
      dcCurrentBias_A = (jitterAngle / 30) * 3.5;
      dominantRippleFreq = 2 * gridFreq;
      rippleFactorPct = 16.2;
      coreSaturationLevel = 45;
    } else if (activeFault === 'reverse_phase_sequence') {
      // Reversed sequence C-B-A
      vdActual = 0; // SCRs fire when reverse biased
      dcCurrentBias_A = 0;
      dominantRippleFreq = 0;
      rippleFactorPct = 0;
      coreSaturationLevel = 0;
    }

    return {
      vmLL,
      vd0_ideal,
      vdNominal,
      vdActual,
      dcCurrentBias_A,
      dominantRippleFreq,
      rippleFactorPct,
      coreSaturationLevel,
    };
  }, [activeFault, nominalAlpha, idLoad, vAcRms, gridFreq, jitterAngle]);

  // Waveform generation for CRT scope
  const waveformData = useMemo(() => {
    const pts = 360;
    const healthyTrace: { x: number; y: number }[] = [];
    const faultedTrace: { x: number; y: number }[] = [];
    const vmLL = physics.vmLL;
    const a = nominalAlpha;

    for (let deg = 0; deg <= pts; deg++) {
      // 1. Ideal Healthy 6-pulse waveform
      const thetaHealthy = ((deg - a + 360) % 60) - 30;
      const vHealthy = vmLL * Math.cos((thetaHealthy * Math.PI) / 180);
      healthyTrace.push({ x: deg, y: vHealthy });

      // 2. Faulted waveform according to active fault
      let vFault = vHealthy;

      if (activeFault === 'healthy') {
        vFault = vHealthy;
      } else if (activeFault === 'missing_gate_scr3') {
        // SCR 3 conducts during pulse window 2 (deg between a+60 and a+120)
        const pulseIndex = Math.floor(((deg - a + 360) % 360) / 60);
        if (pulseIndex === 2) {
          // SCR 3 missing: current freewheels or voltage collapses to zero/preceding conduction
          vFault = 0;
        } else {
          vFault = vHealthy;
        }
      } else if (activeFault === 'single_phasing_phaseA') {
        // Only Phases B and C active: 1-phase rectification across 180 deg
        const theta1Ph = (deg - a + 360) % 180;
        vFault = Math.abs(vmLL * Math.sin(((theta1Ph + 30) * Math.PI) / 180));
      } else if (activeFault === 'gate_jitter_asymmetry') {
        // Each of the 6 pulses has a jittered firing angle
        const jitters = [0, jitterAngle, -jitterAngle, jitterAngle * 0.7, -jitterAngle * 0.8, jitterAngle * 0.4];
        const pIdx = Math.floor(((deg - a + 360) % 360) / 60);
        const effectiveA = a + jitters[pIdx % 6];
        const thetaJitter = ((deg - effectiveA + 360) % 60) - 30;
        vFault = vmLL * Math.cos((thetaJitter * Math.PI) / 180);
      } else if (activeFault === 'reverse_phase_sequence') {
        // Reversed sequence: SCRs misfire, output floats at 0
        vFault = 0;
      }

      faultedTrace.push({ x: deg, y: vFault });
    }

    return { healthyTrace, faultedTrace };
  }, [nominalAlpha, activeFault, jitterAngle, physics.vmLL]);

  // Coordinate transforms
  const svgWidth = 840;
  const svgHeight = 230;
  const midY = svgHeight / 2;
  const vScale = svgHeight / (2.6 * physics.vmLL);

  const toPath = (points: { x: number; y: number }[], baseY: number = svgHeight - 40, customScale: number = vScale) => {
    return points
      .map((pt, idx) => {
        const x = (pt.x / 360) * svgWidth;
        const y = baseY - pt.y * customScale;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/40 rounded-lg text-rose-400 shadow-lg shadow-rose-950/30">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                Phase-Sequence &amp; Asymmetrical Fault Lab
              </h2>
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border ${
                  activeFault === 'healthy'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                }`}
              >
                {activeFault === 'healthy' ? 'NORMAL BALANCED (6-PULSE)' : 'ABNORMAL FAULT INJECTED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Single-Phasing &bull; Missing Gate Pulses (5-Pulse) &bull; Transformer DC Core Saturation &bull; Sub-Harmonics
            </p>
          </div>
        </div>

        {/* Reset / Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setActiveFault('healthy');
                setNominalAlpha(30);
                setIdLoad(40);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset to Healthy"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Fault Injection Matrix Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Interactive Fault Injection Matrix:
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveFault('healthy')}
            className={`px-3 py-2 rounded-lg font-bold border transition-all ${
              activeFault === 'healthy'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            &bull; Healthy 6-Pulse
          </button>
          <button
            onClick={() => setActiveFault('missing_gate_scr3')}
            className={`px-3 py-2 rounded-lg font-bold border transition-all ${
              activeFault === 'missing_gate_scr3'
                ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                : 'bg-slate-950 text-rose-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            &bull; SCR 3 Gate Open (5-Pulse)
          </button>
          <button
            onClick={() => setActiveFault('single_phasing_phaseA')}
            className={`px-3 py-2 rounded-lg font-bold border transition-all ${
              activeFault === 'single_phasing_phaseA'
                ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                : 'bg-slate-950 text-amber-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            &bull; Blown Fuse (Phase A Loss)
          </button>
          <button
            onClick={() => setActiveFault('gate_jitter_asymmetry')}
            className={`px-3 py-2 rounded-lg font-bold border transition-all ${
              activeFault === 'gate_jitter_asymmetry'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                : 'bg-slate-950 text-purple-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            &bull; Firing Jitter (&plusmn;15&deg; Asymmetry)
          </button>
          <button
            onClick={() => setActiveFault('reverse_phase_sequence')}
            className={`px-3 py-2 rounded-lg font-bold border transition-all ${
              activeFault === 'reverse_phase_sequence'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                : 'bg-slate-950 text-cyan-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            &bull; Reversed Sequence (C-B-A)
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
        {/* Left Column: Waveforms Scope & Ripple Spectrum */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Dual-Trace Fault Scope */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Dual-Trace Oscilloscope: Healthy Baseline (Dashed Cyan) vs Active Waveform (Amber/Red)
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-slate-400">
                  Healthy Vd: <span className="text-cyan-400 font-bold">{physics.vdNominal.toFixed(1)}V</span>
                </span>
                <span className="text-slate-400">
                  Actual Vd:{' '}
                  <span className={`font-bold ${activeFault === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {physics.vdActual.toFixed(1)}V
                  </span>
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative shadow-2xl">
              <svg className="w-full h-64 block select-none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <pattern id="grid-fault" width="35" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,3" />
                  </pattern>
                </defs>

                <rect width={svgWidth} height={svgHeight} fill="#020617" />
                <rect width={svgWidth} height={svgHeight} fill="url(#grid-fault)" />

                <line x1="0" y1={svgHeight - 40} x2={svgWidth} y2={svgHeight - 40} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />

                {/* Healthy baseline trace (cyan dashed) */}
                {activeFault !== 'healthy' && (
                  <path
                    d={toPath(waveformData.healthyTrace)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.6"
                    strokeDasharray="4,2"
                    className="opacity-50"
                  />
                )}

                {/* Active waveform trace */}
                <path
                  d={toPath(waveformData.faultedTrace)}
                  fill="none"
                  stroke={activeFault === 'healthy' ? '#10b981' : activeFault === 'reverse_phase_sequence' ? '#64748b' : '#f59e0b'}
                  strokeWidth="2.5"
                  className={activeFault === 'healthy' ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'filter drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]'}
                />

                {/* Scanning line */}
                <line
                  x1={(time / 360) * svgWidth}
                  y1="0"
                  x2={(time / 360) * svgWidth}
                  y2={svgHeight}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="opacity-75"
                />
              </svg>

              {/* Legend */}
              <div className="absolute bottom-2 left-3 flex flex-wrap items-center gap-4 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-xs">
                {activeFault !== 'healthy' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-cyan-400 rounded-full border border-dashed" />
                    <span className="text-cyan-300 font-mono text-[11px]">Normal 6-Pulse Baseline</span>
                  </div>
                )}
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`w-3 h-1 rounded-full ${
                      activeFault === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-amber-300 font-mono font-bold text-[11px]">
                    Faulted Vd(t) [Ripple: {physics.rippleFactorPct.toFixed(1)}%]
                  </span>
                </div>
              </div>

              {/* Missing Pulse Gap Callout */}
              {activeFault === 'missing_gate_scr3' && (
                <div className="absolute top-4 right-4 bg-rose-500/20 border border-rose-500/50 text-rose-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold animate-pulse">
                  MISSING PULSE GAP ON SCR 3 (5-PULSE DENT)
                </div>
              )}
            </div>
          </div>

          {/* Low-Frequency Ripple & Sub-Harmonic Spectrum */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  DC Output Voltage Ripple Harmonic Spectrum
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Dominant Ripple Frequency:{' '}
                <span className="text-amber-400 font-bold">{physics.dominantRippleFreq} Hz</span>
              </span>
            </div>

            {/* Harmonic Bars */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-4">
              <div className="h-32 flex items-end justify-around gap-4 px-4 select-none">
                {[
                  { label: '50 Hz (1f)', height: activeFault === 'missing_gate_scr3' ? 65 : 0, isFault: true },
                  {
                    label: '100 Hz (2f)',
                    height:
                      activeFault === 'single_phasing_phaseA'
                        ? 85
                        : activeFault === 'missing_gate_scr3'
                        ? 50
                        : activeFault === 'gate_jitter_asymmetry'
                        ? 40
                        : 0,
                    isFault: true,
                  },
                  { label: '150 Hz (3f)', height: activeFault === 'gate_jitter_asymmetry' ? 25 : 0, isFault: true },
                  { label: '300 Hz (6f)', height: activeFault === 'reverse_phase_sequence' ? 0 : 70, isFault: false },
                  { label: '600 Hz (12f)', height: activeFault === 'reverse_phase_sequence' ? 0 : 20, isFault: false },
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full h-24 bg-slate-900/50 rounded-t flex items-end justify-center">
                      <div
                        className={`w-12 rounded-t transition-all duration-300 ${
                          bar.isFault && bar.height > 0
                            ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-rose-500/30'
                            : 'bg-gradient-to-t from-emerald-600 to-cyan-400'
                        }`}
                        style={{ height: `${bar.height}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[10px] font-mono font-bold text-slate-300 text-center">
                      {bar.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transformer DC Saturation Visualizer & Technical Readouts */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* Transformer DC Core Saturation Visualizer */}
          <div
            className={`border rounded-xl p-5 shadow-xl transition-all ${
              physics.coreSaturationLevel > 70
                ? 'bg-slate-900/90 border-rose-500/60 shadow-rose-950/30'
                : physics.coreSaturationLevel > 30
                ? 'bg-slate-900/90 border-amber-500/50 shadow-amber-950/20'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Magnet className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  Transformer DC Core Saturation
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  physics.coreSaturationLevel > 70
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {physics.coreSaturationLevel > 70 ? 'CORE SATURATING' : 'LINEAR B-H FLUX'}
              </span>
            </div>

            {/* B-H Curve SVG */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-3 flex items-center justify-center relative mb-3">
              <svg className="w-52 h-44 select-none" viewBox="0 0 200 160">
                {/* Axes */}
                <line x1="20" y1="80" x2="180" y2="80" stroke="#475569" strokeWidth="1.5" />
                <line x1="100" y1="10" x2="100" y2="150" stroke="#475569" strokeWidth="1.5" />
                <text x="180" y="75" fill="#94a3b8" fontSize="9" textAnchor="end" className="font-mono">
                  H (A/m)
                </text>
                <text x="105" y="20" fill="#94a3b8" fontSize="9" className="font-mono">
                  B (Tesla)
                </text>

                {/* S-shaped magnetic saturation curve */}
                <path
                  d="M 30 140 Q 80 130 90 90 T 110 70 Q 120 30 170 20"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="3,2"
                />

                {/* Dynamic Operating Flux Loop */}
                {(() => {
                  const dcShift = (physics.dcCurrentBias_A / 15) * 45;
                  const centerX = 100 + dcShift;
                  const centerY = 80 - dcShift * 0.7;
                  return (
                    <g>
                      {/* Shifted B-H loop ellipse */}
                      <ellipse
                        cx={centerX}
                        cy={centerY}
                        rx="16"
                        ry="25"
                        fill="none"
                        stroke={physics.coreSaturationLevel > 70 ? '#ef4444' : '#10b981'}
                        strokeWidth="2.5"
                        className={physics.coreSaturationLevel > 70 ? 'animate-pulse' : ''}
                      />
                      <circle cx={centerX} cy={centerY} r="4" fill="#ffffff" />
                      {/* DC Bias Arrow */}
                      {physics.dcCurrentBias_A > 0.5 && (
                        <line
                          x1="100"
                          y1="80"
                          x2={centerX}
                          y2="80"
                          stroke="#ef4444"
                          strokeWidth="2"
                          markerEnd="url(#arrow)"
                        />
                      )}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Saturation Gauge */}
            <div className="space-y-1.5 mb-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">DC Line Current Bias:</span>
                <span className={physics.dcCurrentBias_A > 1 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {physics.dcCurrentBias_A.toFixed(2)} A DC
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    physics.coreSaturationLevel > 70 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${physics.coreSaturationLevel}%` }}
                />
              </div>
            </div>

            {physics.coreSaturationLevel > 70 && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-300 flex items-start space-x-2">
                <Flame className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Thermal Hazard:</span> Asymmetrical conduction injects net DC current into transformer primary, saturating the core and causing high magnetizing inrush surges and tripping upstream breakers!
                </div>
              </div>
            )}
          </div>

          {/* Fault Telemetry Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Fault Telemetry &amp; Quality Metrics</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Voltage Ripple</div>
                <div className="text-xl font-mono font-black text-rose-400">
                  {physics.rippleFactorPct.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Normal: 4.0%</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Average DC Voltage</div>
                <div className="text-xl font-mono font-black text-amber-400">
                  {physics.vdActual.toFixed(1)} V
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Loss: -{(physics.vdNominal - physics.vdActual).toFixed(1)}V</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Dominant Ripple</div>
                <div className="text-xl font-mono font-black text-cyan-400">
                  {physics.dominantRippleFreq} Hz
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Healthy: 300 Hz</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">SCR Pulse Count</div>
                <div className="text-xl font-mono font-black text-purple-400">
                  {activeFault === 'healthy' ? '6-Pulse' : activeFault === 'missing_gate_scr3' ? '5-Pulse' : 'Abnormal'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Per AC cycle</div>
              </div>
            </div>

            {/* Firing Angle Slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Nominal Firing Angle (&alpha;):</span>
                <span className="text-amber-400 font-bold">{nominalAlpha}&deg;</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={nominalAlpha}
                onChange={(e) => setNominalAlpha(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
