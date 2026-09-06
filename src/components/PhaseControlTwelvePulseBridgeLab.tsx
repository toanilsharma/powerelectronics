import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  BarChart3,
  Compass,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface PhaseControlTwelvePulseBridgeLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlTwelvePulseBridgeLab.tsx
 * 
 * Recommendation 5: Synchronized 12-Pulse Series/Parallel Bridge Architecture
 * with Star-Delta (Y-Delta, 30 deg) Harmonic Cancellation Studio.
 * 
 * Features:
 *  - Dual 6-Pulse Converters fed by Star-Star (Y-Y, 0 deg) and Star-Delta (Y-Delta, 30 deg) secondaries.
 *  - Mathematical cancellation of 5th & 7th harmonics in primary current:
 *      Phase shift for nth harmonic = n * 30 deg.
 *      At n=5: 5*30 = 150 deg -> 180 deg anti-phase in primary -> CANCELED.
 *      At n=7: 7*30 = 210 deg -> 180 deg anti-phase in primary -> CANCELED.
 *      Surviving harmonics: n = 12k +- 1 (11, 13, 23, 25...).
 *  - 12-pulse DC ripple frequency (12 * f = 720 Hz / 600 Hz) with ripple factor dropping to ~3.4%.
 *  - Series Connection (double voltage, HVDC) vs Parallel Connection (double current with Interphase Transformer IPT).
 *  - Live comparison toggle: 6-Pulse vs 12-Pulse showing instant waveform smoothing.
 */
export const PhaseControlTwelvePulseBridgeLab: React.FC<PhaseControlTwelvePulseBridgeLabProps> = ({
  className = '',
  onClose,
}) => {
  // Configuration
  const [pulseMode, setPulseMode] = useState<'6pulse' | '12pulse'>('12pulse');
  const [connectionMode, setConnectionMode] = useState<'series' | 'parallel'>('series');
  const [alpha, setAlpha] = useState<number>(20); // Firing angle in deg
  const [idLoad, setIdLoad] = useState<number>(60); // DC Load current (A)
  const [vLineRms, setVLineRms] = useState<number>(480); // AC Line-to-line RMS (V)
  const [gridFreq, setGridFreq] = useState<number>(60); // Grid freq (Hz)

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [time, setTime] = useState<number>(0);
  const [activeScopeTrace, setActiveScopeTrace] = useState<'dc' | 'ac_current' | 'both'>('both');

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

  // Electrical computations
  const physics = useMemo(() => {
    const alphaRad = (alpha * Math.PI) / 180;
    const vmLL = vLineRms * Math.SQRT2;

    // Ideal 6-pulse average DC output:
    // Vd0_6p = (3 * sqrt(2) / pi) * V_LL = (3 * VmLL) / pi approx 1.35 * V_LL
    const vd0_6p = (3 * vmLL) / Math.PI;
    const vdAvg_6p = vd0_6p * Math.cos(alphaRad);

    // 12-Pulse DC output:
    // If Series: Vd_total = Vd1 + Vd2 = 2 * VdAvg_6p
    // If Parallel: Vd_total = VdAvg_6p, but Id_total = 2 * Id1
    const vdAvg_12p = connectionMode === 'series' ? 2 * vdAvg_6p : vdAvg_6p;
    const vdActive = pulseMode === '12pulse' ? vdAvg_12p : vdAvg_6p;

    // Output Ripple Frequency:
    // 6-pulse: 6 * f = 360 Hz (at 60Hz)
    // 12-pulse: 12 * f = 720 Hz (at 60Hz)
    const rippleFreq = pulseMode === '12pulse' ? 12 * gridFreq : 6 * gridFreq;

    // Theoretical Ripple Factor:
    // 6-pulse: approx 4.04%
    // 12-pulse: approx 0.99% (massive drop!)
    const rippleFactorPct = pulseMode === '12pulse' ? 0.99 : 4.04;

    // Primary current THD:
    // 6-pulse: sqrt((pi/3)^2 - 1) approx 31.08%
    // 12-pulse: without 5th & 7th, THD drops to approx 15.22%
    const currentThdPct = pulseMode === '12pulse' ? 15.22 : 31.08;

    // Harmonic Spectrum Bar Data
    const harmonicOrders = [1, 5, 7, 11, 13, 17, 19, 23, 25];
    const harmonics = harmonicOrders.map((n) => {
      let mag6p = n === 1 ? 100 : (1 / n) * 100;
      let mag12p = 0;
      let isCanceled = false;

      if (n === 1) {
        mag12p = 100;
      } else if (n === 5 || n === 7 || n === 17 || n === 19) {
        // Canceled in 12-pulse by 30 deg star-delta phase shift!
        mag12p = 0;
        isCanceled = true;
      } else {
        // Surviving characteristic harmonics: n = 12k +- 1 (11, 13, 23, 25)
        mag12p = (1 / n) * 100;
      }

      return {
        n,
        freq: n * gridFreq,
        mag6p,
        mag12p,
        activeMag: pulseMode === '12pulse' ? mag12p : mag6p,
        isCanceled: pulseMode === '12pulse' && isCanceled,
      };
    });

    return {
      vd0_6p,
      vdAvg_6p,
      vdAvg_12p,
      vdActive,
      rippleFreq,
      rippleFactorPct,
      currentThdPct,
      harmonics,
      vmLL,
    };
  }, [pulseMode, connectionMode, alpha, idLoad, vLineRms, gridFreq]);

  // Generate Waveforms for dual-trace CRT scope
  const waveformData = useMemo(() => {
    const pts = 360;
    const bridge1Dc: { x: number; y: number }[] = [];
    const bridge2Dc: { x: number; y: number }[] = [];
    const totalDc: { x: number; y: number }[] = [];
    const acCurrent: { x: number; y: number }[] = [];

    const vmLL = physics.vmLL;
    const is12p = pulseMode === '12pulse';
    const isParallel = connectionMode === 'parallel';

    for (let deg = 0; deg <= pts; deg++) {
      const rad = (deg * Math.PI) / 180;

      // Bridge 1 (Y-Y) DC output: peak of 6-pulse rectified wave
      const theta1 = ((deg - alpha + 360) % 60) - 30;
      const v1 = vmLL * Math.cos((theta1 * Math.PI) / 180);

      // Bridge 2 (Y-Delta) DC output: shifted by 30 deg
      const theta2 = ((deg - alpha - 30 + 720) % 60) - 30;
      const v2 = vmLL * Math.cos((theta2 * Math.PI) / 180);

      // Total DC output:
      let vTot = 0;
      if (!is12p) {
        vTot = v1;
      } else if (isParallel) {
        // Parallel with IPT: average of both bridges
        vTot = (v1 + v2) / 2;
      } else {
        // Series: sum of both bridges (scaled down by 0.5 for normalized scope display)
        vTot = (v1 + v2) / 2;
      }

      // AC Primary Current synthesis:
      // 6-pulse has 2 steps: +1, 0, -1
      // 12-pulse has 4 steps (staircase waveform): +1.366, +1, +0.366, 0, etc.
      let iAc = 0;
      if (!is12p) {
        // Standard quasi-square 6-pulse current
        const modDeg = (deg - alpha + 360) % 360;
        if (modDeg >= 30 && modDeg < 150) iAc = 1;
        else if (modDeg >= 210 && modDeg < 330) iAc = -1;
        else iAc = 0;
      } else {
        // 12-pulse staircase current (superposition of Y-Y and Y-Delta)
        const modDeg = (deg - alpha + 360) % 360;
        if (modDeg >= 15 && modDeg < 45) iAc = 0.5;
        else if (modDeg >= 45 && modDeg < 75) iAc = 0.866;
        else if (modDeg >= 75 && modDeg < 105) iAc = 1.0;
        else if (modDeg >= 105 && modDeg < 135) iAc = 0.866;
        else if (modDeg >= 135 && modDeg < 165) iAc = 0.5;
        else if (modDeg >= 195 && modDeg < 225) iAc = -0.5;
        else if (modDeg >= 225 && modDeg < 255) iAc = -0.866;
        else if (modDeg >= 255 && modDeg < 285) iAc = -1.0;
        else if (modDeg >= 285 && modDeg < 315) iAc = -0.866;
        else if (modDeg >= 315 && modDeg < 345) iAc = -0.5;
        else iAc = 0;
      }

      bridge1Dc.push({ x: deg, y: v1 });
      bridge2Dc.push({ x: deg, y: v2 });
      totalDc.push({ x: deg, y: vTot });
      acCurrent.push({ x: deg, y: iAc * 180 });
    }

    return { bridge1Dc, bridge2Dc, totalDc, acCurrent };
  }, [pulseMode, connectionMode, alpha, physics.vmLL]);

  // SVG coordinate transformation
  const svgWidth = 840;
  const svgHeight = 240;
  const midY = svgHeight / 2;
  const vScale = svgHeight / (2.6 * physics.vmLL);

  const toPath = (points: { x: number; y: number }[], baseY: number = midY, customScale: number = vScale) => {
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
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-lg text-indigo-400 shadow-lg shadow-indigo-950/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                12-Pulse Bridge &amp; Star-Delta Harmonic Cancellation Studio
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-full">
                IEC 60146 &bull; IEEE 519
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dual 6-Pulse Bridges &bull; Star-Delta (<span className="text-indigo-300 font-mono font-bold">30&deg; Phase Shift</span>) &bull; Complete 5th &amp; 7th Harmonic Cancellation
            </p>
          </div>
        </div>

        {/* Pulse Mode and Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setPulseMode('6pulse')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                pulseMode === '6pulse'
                  ? 'bg-rose-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Standard 6-Pulse
            </button>
            <button
              onClick={() => setPulseMode('12pulse')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                pulseMode === '12pulse'
                  ? 'bg-indigo-500 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Synchronized 12-Pulse (Y-&Delta;)
            </button>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setConnectionMode('series')}
              disabled={pulseMode === '6pulse'}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                connectionMode === 'series' && pulseMode === '12pulse'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Series (HVDC)
            </button>
            <button
              onClick={() => setConnectionMode('parallel')}
              disabled={pulseMode === '6pulse'}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                connectionMode === 'parallel' && pulseMode === '12pulse'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Parallel (IPT)
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-indigo-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setAlpha(20);
                setIdLoad(60);
                setPulseMode('12pulse');
                setConnectionMode('series');
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
        {/* Left Column: Scope & Harmonic FFT Comparison */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Dual-Trace CRT Scope */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Dual-Trace CRT Oscilloscope: {pulseMode === '12pulse' ? '12-Pulse 720Hz Ripple' : '6-Pulse 360Hz Ripple'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setActiveScopeTrace('both')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    activeScopeTrace === 'both'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Both (DC + AC Current)
                </button>
                <button
                  onClick={() => setActiveScopeTrace('dc')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    activeScopeTrace === 'dc'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  DC Output Only
                </button>
                <button
                  onClick={() => setActiveScopeTrace('ac_current')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    activeScopeTrace === 'ac_current'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  AC Grid Current
                </button>
              </div>
            </div>

            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative shadow-2xl">
              <svg className="w-full h-64 block select-none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <pattern id="grid-pattern-12pulse" width="35" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,3" />
                  </pattern>
                </defs>

                <rect width={svgWidth} height={svgHeight} fill="#020617" />
                <rect width={svgWidth} height={svgHeight} fill="url(#grid-pattern-12pulse)" />

                <line x1="0" y1={midY} x2={svgWidth} y2={midY} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />

                {/* 1. Sub-Bridges in 12-pulse mode (thin dashed traces) */}
                {pulseMode === '12pulse' && (activeScopeTrace === 'both' || activeScopeTrace === 'dc') && (
                  <>
                    {/* Bridge 1 (Y-Y) */}
                    <path
                      d={toPath(waveformData.bridge1Dc, svgHeight - 40, vScale * 0.9)}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="1.2"
                      strokeDasharray="4,2"
                      className="opacity-50"
                    />
                    {/* Bridge 2 (Y-Delta, 30 deg shifted) */}
                    <path
                      d={toPath(waveformData.bridge2Dc, svgHeight - 40, vScale * 0.9)}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="1.2"
                      strokeDasharray="4,2"
                      className="opacity-50"
                    />
                  </>
                )}

                {/* 2. Total DC Output Voltage Trace */}
                {(activeScopeTrace === 'both' || activeScopeTrace === 'dc') && (
                  <path
                    d={toPath(waveformData.totalDc, svgHeight - 40, vScale * 0.9)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  />
                )}

                {/* 3. Primary AC Line Current Trace */}
                {(activeScopeTrace === 'both' || activeScopeTrace === 'ac_current') && (
                  <path
                    d={toPath(waveformData.acCurrent, midY - 20, 0.4)}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                    className="filter drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
                  />
                )}

                {/* Scanning line */}
                <line
                  x1={(time / 360) * svgWidth}
                  y1="0"
                  x2={(time / 360) * svgWidth}
                  y2={svgHeight}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="opacity-70"
                />
              </svg>

              {/* Scope Legend */}
              <div className="absolute bottom-2 left-3 flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-xs">
                {(activeScopeTrace === 'both' || activeScopeTrace === 'dc') && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-emerald-300 font-mono font-bold">
                      V_dc Total ({pulseMode === '12pulse' ? '12 Pulses / Cycle' : '6 Pulses / Cycle'})
                    </span>
                  </div>
                )}
                {(activeScopeTrace === 'both' || activeScopeTrace === 'ac_current') && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-cyan-400 rounded-full" />
                    <span className="text-cyan-300 font-mono font-bold">
                      i_A(t) Primary ({pulseMode === '12pulse' ? '12-Step Staircase' : '6-Pulse Square'})
                    </span>
                  </div>
                )}
                {pulseMode === '12pulse' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-indigo-400 rounded-full border border-dashed" />
                    <span className="text-indigo-300 font-mono text-[10px]">
                      Bridge 1 (Y) vs Bridge 2 (&Delta;, 30&deg; lag)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Harmonic Spectrum Comparison Bar Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Primary Line Current Harmonic Spectrum ({pulseMode === '12pulse' ? '5th & 7th Canceled!' : 'Standard 6-Pulse Spectrum'})
                </span>
              </div>
              <div className="text-xs font-mono">
                THD_i:{' '}
                <span className={`font-bold ${pulseMode === '12pulse' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {physics.currentThdPct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Bars */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-4 relative overflow-x-auto">
              <div className="h-44 flex items-end justify-between gap-2 px-2 select-none min-w-[500px]">
                {physics.harmonics.map((h) => {
                  const barHeight = Math.min(100, h.activeMag);

                  return (
                    <div key={h.n} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 text-white text-[10px] p-1.5 rounded pointer-events-none z-20 whitespace-nowrap shadow-xl">
                        <div>Harmonic h{h.n} ({h.freq} Hz)</div>
                        <div>Magnitude: {h.activeMag.toFixed(1)}%</div>
                        {h.isCanceled && <div className="text-emerald-400 font-bold">100% CANCELED BY Y-&Delta;</div>}
                      </div>

                      {/* Bar Container */}
                      <div className="w-full h-32 bg-slate-900/50 rounded-t flex items-end relative overflow-hidden">
                        {h.isCanceled ? (
                          <div className="w-full h-1 bg-emerald-500 rounded-full animate-pulse" />
                        ) : (
                          <div
                            className={`w-full transition-all duration-300 rounded-t ${
                              h.n === 1
                                ? 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                                : 'bg-gradient-to-t from-indigo-600 to-purple-500 shadow-indigo-500/20'
                            }`}
                            style={{ height: `${barHeight}%` }}
                          />
                        )}
                      </div>

                      {/* Labels */}
                      <div className="mt-1.5 text-center">
                        <span className={`text-[10px] font-mono font-bold block ${h.isCanceled ? 'text-emerald-400' : 'text-slate-300'}`}>
                          h{h.n}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block">
                          {h.isCanceled ? '0%' : `${h.activeMag.toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transformer Vector Diagram & Technical Metrics */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* Star-Delta Transformer Vector Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  30&deg; Star-Delta Phasor Vector
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                &Delta;&theta; = 30&deg;
              </span>
            </div>

            {/* Vector Diagram SVG */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-3 relative flex items-center justify-center">
              <svg className="w-56 h-56 select-none" viewBox="0 0 200 200">
                {/* Center origin */}
                <circle cx="100" cy="100" r="2" fill="#94a3b8" />
                <circle cx="100" cy="100" r="75" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />

                {/* Star Secondary Vectors (0 deg, 120 deg, 240 deg) */}
                <g stroke="#818cf8" strokeWidth="2.5">
                  <line x1="100" y1="100" x2="175" y2="100" />
                  <line x1="100" y1="100" x2="62.5" y2="165" />
                  <line x1="100" y1="100" x2="62.5" y2="35" />
                </g>
                <text x="185" y="104" fill="#818cf8" fontSize="10" fontWeight="bold" className="font-mono">
                  Y1 (0&deg;)
                </text>

                {/* Delta Secondary Vectors (shifted by 30 deg: 30 deg, 150 deg, 270 deg) */}
                <g stroke="#c084fc" strokeWidth="2.5" strokeDasharray="5,3">
                  <line x1="100" y1="100" x2="165" y2="62.5" />
                  <line x1="100" y1="100" x2="35" y2="137.5" />
                  <line x1="100" y1="100" x2="100" y2="25" />
                </g>
                <text x="175" y="58" fill="#c084fc" fontSize="10" fontWeight="bold" className="font-mono">
                  &Delta;2 (30&deg;)
                </text>

                {/* Arc showing 30 deg displacement */}
                <path
                  d="M 140 100 A 40 40 0 0 0 134.6 80"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />
                <text x="145" y="88" fill="#fbbf24" fontSize="10" fontWeight="bold" className="font-mono">
                  30&deg;
                </text>
              </svg>
            </div>

            {/* Cancellation Proof */}
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/40 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="text-indigo-300 font-bold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vector Cancellation Proof:</span>
              </div>
              <div className="text-[11px] text-slate-300">
                &bull; 5th Harmonic: 5 &times; 30&deg; = 150&deg; &rarr; adds 180&deg; in &Delta; turns &rarr; <span className="text-emerald-400 font-bold">180&deg; (Cancels)</span>
              </div>
              <div className="text-[11px] text-slate-300">
                &bull; 7th Harmonic: 7 &times; 30&deg; = 210&deg; &rarr; adds 180&deg; in &Delta; turns &rarr; <span className="text-emerald-400 font-bold">180&deg; (Cancels)</span>
              </div>
            </div>
          </div>

          {/* Output Telemetry Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Conversion Performance</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Average DC Voltage</div>
                <div className="text-xl font-mono font-black text-emerald-400">
                  {physics.vdActive.toFixed(1)} V
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {connectionMode === 'series' && pulseMode === '12pulse' ? 'Series Sum (2x)' : 'Single Bridge Level'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Ripple Frequency</div>
                <div className="text-xl font-mono font-black text-amber-400">
                  {physics.rippleFreq} Hz
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {pulseMode === '12pulse' ? '12 &times; 60Hz' : '6 &times; 60Hz'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Voltage Ripple Factor</div>
                <div className="text-xl font-mono font-black text-cyan-400">
                  {physics.rippleFactorPct.toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {pulseMode === '12pulse' ? '4x Ripple Reduction!' : 'Standard 6-Pulse'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">AC Current THD</div>
                <div
                  className={`text-xl font-mono font-black ${
                    pulseMode === '12pulse' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {physics.currentThdPct.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {pulseMode === '12pulse' ? '5th & 7th Eliminated' : '5th & 7th Present'}
                </div>
              </div>
            </div>
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
                max="90"
                step="1"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* DC Load Current */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">DC Load Current (Id):</span>
                <span className="text-emerald-400 font-bold">{idLoad} A</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={idLoad}
                onChange={(e) => setIdLoad(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
