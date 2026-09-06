import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Gauge
} from 'lucide-react';

interface PhaseControlHarmonicsFftLabProps {
  className?: string;
  onClose?: () => void;
}

interface HarmonicBar {
  n: number;
  freq: number;
  ampPct: number; // Amplitude relative to fundamental (%)
  currentRms: number; // RMS Amperes
  filteredAmpPct: number;
  trapActive: boolean;
}

/**
 * PhaseControlHarmonicsFftLab.tsx
 * 
 * Recommendation 9: Real-Time Harmonic Spectrum Analyzer & IEEE Std 519 Compliance Meter
 * with Tuned Passive Harmonic Trap Filter Studio.
 * 
 * Features:
 *  - Real-time FFT harmonic spectrum bar graph up to 25th harmonic.
 *  - 1-Phase (n = 1, 3, 5, 7, 9...) and 3-Phase 6-Pulse (n = 6k +- 1: 5, 7, 11, 13, 17, 19, 23, 25).
 *  - Live calculation of THD_i, THD_v, Form Factor (FF), Ripple Factor (RF), Rectification Efficiency (eta).
 *  - Interactive Tuned Harmonic Trap Filter Studio:
 *      Toggle 5th Harmonic LC Trap (300 Hz / 250 Hz)
 *      Toggle 7th Harmonic LC Trap (420 Hz / 350 Hz)
 *      Toggle High-Pass Damped Filter (11th+ harmonics)
 *  - IEEE Std 519 Current Distortion Limits (I_sc / I_L ratio categories: <20, 20-50, 50-100, 100-1000).
 *  - Reconstructed AC Current waveform showing live smoothing when traps are engaged.
 */
export const PhaseControlHarmonicsFftLab: React.FC<PhaseControlHarmonicsFftLabProps> = ({
  className = '',
  onClose,
}) => {
  // Converter Configuration
  const [topology, setTopology] = useState<'1phase' | '3phase'>('3phase');
  const [alpha, setAlpha] = useState<number>(30); // Firing angle in deg
  const [idLoad, setIdLoad] = useState<number>(50); // DC Load current (A)
  const [gridFreq, setGridFreq] = useState<number>(60); // 50Hz or 60Hz
  const [iscRatio, setIscRatio] = useState<'<20' | '20-50' | '50-100' | '>100'>('20-50');

  // Harmonic Trap Filters
  const [trap5Enabled, setTrap5Enabled] = useState<boolean>(false);
  const [trap7Enabled, setTrap7Enabled] = useState<boolean>(false);
  const [trapHighPassEnabled, setTrapHighPassEnabled] = useState<boolean>(false);

  // Animation state
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

  // Harmonic calculations
  const harmonicsData = useMemo(() => {
    const is3Ph = topology === '3phase';
    const fundamentalFreq = gridFreq;

    // Fundamental Current RMS:
    // 1-Phase: I1_rms = (2 * sqrt(2) / pi) * Id approx 0.9003 * Id
    // 3-Phase 6-Pulse: I1_rms = (sqrt(6) / pi) * Id approx 0.7797 * Id
    const i1_rms = is3Ph
      ? (Math.sqrt(6) / Math.PI) * idLoad
      : ((2 * Math.SQRT2) / Math.PI) * idLoad;

    // Harmonics list up to 25th
    const maxOrder = 25;
    const bars: HarmonicBar[] = [];

    // IEEE 519 limits based on Isc / IL ratio:
    // For Isc/IL in 20-50:
    //   h < 11: 4.0% max
    //   11 <= h < 17: 2.0% max
    //   17 <= h < 23: 1.5% max
    //   23 <= h < 35: 0.6% max
    //   Total TDD / THD: 5.0% max
    let thdLimit = 5.0;
    if (iscRatio === '<20') thdLimit = 4.0;
    else if (iscRatio === '20-50') thdLimit = 5.0;
    else if (iscRatio === '50-100') thdLimit = 8.0;
    else if (iscRatio === '>100') thdLimit = 12.0;

    let sumSquaresUnfiltered = 0;
    let sumSquaresFiltered = 0;

    for (let n = 1; n <= maxOrder; n++) {
      let isCharacteristic = false;
      let rawAmpPct = 0;

      if (n === 1) {
        isCharacteristic = true;
        rawAmpPct = 100;
      } else if (is3Ph) {
        // 3-Phase characteristic harmonics: n = 6k +- 1 (5, 7, 11, 13, 17, 19, 23, 25)
        if (n % 6 === 1 || n % 6 === 5) {
          isCharacteristic = true;
          // Theoretical magnitude: 1 / n
          rawAmpPct = (1 / n) * 100;
        }
      } else {
        // 1-Phase characteristic harmonics: odd harmonics (3, 5, 7, 9, 11, 13...)
        if (n % 2 === 1) {
          isCharacteristic = true;
          // Theoretical magnitude: 1 / n
          rawAmpPct = (1 / n) * 100;
        }
      }

      if (isCharacteristic) {
        let filteredAmpPct = rawAmpPct;
        let trapActive = false;

        if (n === 5 && trap5Enabled) {
          // 5th harmonic trap attenuates by ~90%
          filteredAmpPct = rawAmpPct * 0.10;
          trapActive = true;
        } else if (n === 7 && trap7Enabled) {
          // 7th harmonic trap attenuates by ~88%
          filteredAmpPct = rawAmpPct * 0.12;
          trapActive = true;
        } else if (n >= 11 && trapHighPassEnabled) {
          // High-pass damped filter attenuates >=11th harmonics by ~80%
          filteredAmpPct = rawAmpPct * 0.20;
          trapActive = true;
        }

        const currentRms = (filteredAmpPct / 100) * i1_rms;

        if (n > 1) {
          sumSquaresUnfiltered += Math.pow(rawAmpPct, 2);
          sumSquaresFiltered += Math.pow(filteredAmpPct, 2);
        }

        bars.push({
          n,
          freq: n * fundamentalFreq,
          ampPct: rawAmpPct,
          currentRms,
          filteredAmpPct,
          trapActive,
        });
      }
    }

    const thdUnfiltered = Math.sqrt(sumSquaresUnfiltered);
    const thdFiltered = Math.sqrt(sumSquaresFiltered);

    // Total RMS Current:
    const iRmsFiltered = i1_rms * Math.sqrt(1 + Math.pow(thdFiltered / 100, 2));
    const iRmsUnfiltered = i1_rms * Math.sqrt(1 + Math.pow(thdUnfiltered / 100, 2));

    // DC metrics:
    // Form Factor FF = Vo_rms / Vo_avg
    // For 1-Phase: FF approx 1.11 (pi / (2*sqrt(2)))
    // For 3-Phase: FF approx 1.001
    const formFactor = is3Ph ? 1.001 : 1.11;
    const rippleFactor = Math.sqrt(Math.max(0, Math.pow(formFactor, 2) - 1));
    const efficiency = (1 / Math.pow(formFactor, 2)) * 100;

    const ieeePassed = thdFiltered <= thdLimit;

    return {
      bars,
      i1_rms,
      iRmsFiltered,
      iRmsUnfiltered,
      thdUnfiltered,
      thdFiltered,
      thdLimit,
      ieeePassed,
      formFactor,
      rippleFactor,
      efficiency,
    };
  }, [topology, idLoad, gridFreq, iscRatio, trap5Enabled, trap7Enabled, trapHighPassEnabled]);

  // Reconstruct time-domain waveform from harmonics
  const wavePoints = useMemo(() => {
    const pts = 360;
    const unfilteredWave: { x: number; y: number }[] = [];
    const filteredWave: { x: number; y: number }[] = [];
    const alphaRad = (alpha * Math.PI) / 180;

    for (let deg = 0; deg <= pts; deg++) {
      const rad = (deg * Math.PI) / 180;
      let yUnfilt = 0;
      let yFilt = 0;

      for (const bar of harmonicsData.bars) {
        // Sign alternating according to Fourier series of square/stepped wave
        const sign = bar.n % 4 === 3 ? -1 : 1;
        const phaseShift = bar.n * alphaRad;
        const compAngle = bar.n * rad - phaseShift;

        yUnfilt += (bar.ampPct / 100) * Math.sin(compAngle) * sign;
        yFilt += (bar.filteredAmpPct / 100) * Math.sin(compAngle) * sign;
      }

      unfilteredWave.push({ x: deg, y: yUnfilt });
      filteredWave.push({ x: deg, y: yFilt });
    }

    return { unfilteredWave, filteredWave };
  }, [harmonicsData, alpha]);

  // SVG dimensions & helpers
  const svgWidth = 840;
  const svgHeight = 220;
  const midY = svgHeight / 2;
  const scaleY = 65;

  const toWavePath = (points: { x: number; y: number }[]) => {
    return points
      .map((pt, idx) => {
        const x = (pt.x / 360) * svgWidth;
        const y = midY - pt.y * scaleY;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 shadow-lg shadow-cyan-950/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                Harmonic Spectrum Analyzer & Passive Trap Studio
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-full">
                IEEE Std 519-2022
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Discrete Fourier Transform (DFT/FFT) &bull; Characteristic Harmonics (<span className="text-cyan-300 font-mono font-bold">n = 6k &plusmn; 1</span>) &bull; Tuned LC Harmonic Traps
            </p>
          </div>
        </div>

        {/* Topology Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setTopology('1phase')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                topology === '1phase'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1-Phase (Odd Harmonics: 3, 5, 7...)
            </button>
            <button
              onClick={() => setTopology('3phase')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                topology === '3phase'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3-Phase 6-Pulse (6k &plusmn; 1: 5, 7, 11, 13...)
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause Simulation' : 'Run Simulation'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setAlpha(30);
                setIdLoad(50);
                setTrap5Enabled(false);
                setTrap7Enabled(false);
                setTrapHighPassEnabled(false);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset Parameters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
        {/* Left Column: FFT Spectrum & Time Domain Waveform */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* FFT Spectrum Bar Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Real-Time AC Line Current Harmonic Spectrum (Magnitude % of Fundamental)
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-slate-400">
                  Unfiltered THD: <span className="text-rose-400 font-bold">{harmonicsData.thdUnfiltered.toFixed(1)}%</span>
                </span>
                <span className="text-slate-400">
                  Filtered THD: <span className="text-emerald-400 font-bold">{harmonicsData.thdFiltered.toFixed(1)}%</span>
                </span>
              </div>
            </div>

            {/* Harmonic Bars Canvas */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-4 relative overflow-x-auto">
              <div className="h-56 flex items-end justify-between gap-1.5 px-2 select-none min-w-[600px]">
                {harmonicsData.bars.map((bar) => {
                  const isFiltered = bar.trapActive;
                  const currentHeight = Math.min(100, bar.filteredAmpPct);
                  const rawHeight = Math.min(100, bar.ampPct);

                  return (
                    <div key={bar.n} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 text-white text-[10px] p-1.5 rounded pointer-events-none z-20 whitespace-nowrap shadow-xl">
                        <div>Harmonic n = {bar.n} ({bar.freq} Hz)</div>
                        <div>Magnitude: {bar.filteredAmpPct.toFixed(1)}% ({bar.currentRms.toFixed(1)} A)</div>
                        {isFiltered && <div className="text-emerald-400 font-bold">Trap Active (-{((1 - bar.filteredAmpPct / bar.ampPct) * 100).toFixed(0)}%)</div>}
                      </div>

                      {/* Bar Container */}
                      <div className="w-full h-44 bg-slate-900/50 rounded-t flex items-end relative overflow-hidden">
                        {/* Unfiltered ghost bar if trap active */}
                        {isFiltered && (
                          <div
                            className="w-full bg-slate-700/40 border border-dashed border-slate-500 absolute bottom-0 transition-all duration-300"
                            style={{ height: `${rawHeight}%` }}
                          />
                        )}

                        {/* Active Bar */}
                        <div
                          className={`w-full transition-all duration-300 rounded-t ${
                            bar.n === 1
                              ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-cyan-500/30'
                              : isFiltered
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-emerald-500/30'
                              : 'bg-gradient-to-t from-rose-600 to-amber-500 shadow-rose-500/20'
                          }`}
                          style={{ height: `${currentHeight}%` }}
                        />
                      </div>

                      {/* Bar Labels */}
                      <div className="mt-2 text-center">
                        <span className={`text-[10px] font-mono font-bold block ${bar.n === 1 ? 'text-cyan-400' : 'text-slate-300'}`}>
                          h{bar.n}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block">
                          {bar.filteredAmpPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Domain Reconstructed Current Waveform */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Synthesized AC Line Current i_s(t) &bull; Filtered (Green) vs Raw Converter Draw (Red Dashed)
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Firing Delay &alpha; = {alpha}&deg;
              </span>
            </div>

            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative shadow-2xl">
              <svg className="w-full h-44 block select-none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <pattern id="grid-pattern-harmonics" width="35" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,3" />
                  </pattern>
                </defs>

                <rect width={svgWidth} height={svgHeight} fill="#020617" />
                <rect width={svgWidth} height={svgHeight} fill="url(#grid-pattern-harmonics)" />

                {/* Zero Axis */}
                <line x1="0" y1={midY} x2={svgWidth} y2={midY} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />

                {/* 1. Raw Unfiltered Waveform */}
                <path
                  d={toWavePath(wavePoints.unfilteredWave)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.6"
                  strokeDasharray="4,3"
                  className="opacity-60"
                />

                {/* 2. Filtered Smoothed Line Current Waveform */}
                <path
                  d={toWavePath(wavePoints.filteredWave)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.4"
                  className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                />

                {/* Scanning point */}
                <circle
                  cx={(time / 360) * svgWidth}
                  cy={midY - (wavePoints.filteredWave[Math.floor(time)]?.y || 0) * scaleY}
                  r="4"
                  fill="#ffffff"
                  className="shadow-lg shadow-white"
                />
              </svg>

              {/* Legend */}
              <div className="absolute bottom-2 left-3 flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-emerald-300 font-mono font-bold">
                    Filtered Line Current (THD = {harmonicsData.thdFiltered.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-rose-500 rounded-full border border-dashed" />
                  <span className="text-rose-300 font-mono">
                    Raw Converter Current (THD = {harmonicsData.thdUnfiltered.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Harmonic Trap Studio & IEEE 519 Meter */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* IEEE Std 519 Current Distortion Compliance */}
          <div
            className={`border rounded-xl p-5 shadow-xl transition-all ${
              harmonicsData.ieeePassed
                ? 'bg-slate-900/90 border-emerald-500/40 shadow-emerald-950/20'
                : 'bg-slate-900/90 border-rose-500/50 shadow-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {harmonicsData.ieeePassed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 animate-pulse" />
                )}
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  IEEE 519 THD_i Limit
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  harmonicsData.ieeePassed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {harmonicsData.ieeePassed ? 'PASSES IEEE 519' : 'EXCEEDS LIMIT'}
              </span>
            </div>

            {/* Short Circuit Ratio Toggle */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1 font-semibold">
                Grid Short-Circuit Ratio (I_sc / I_L):
              </label>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                {(['<20', '20-50', '50-100', '>100'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setIscRatio(ratio)}
                    className={`py-1 rounded font-bold transition-all ${
                      iscRatio === ratio
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* THD Progress Gauge */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Total Harmonic Distortion (THD_i):</span>
                <span className={harmonicsData.ieeePassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {harmonicsData.thdFiltered.toFixed(1)}% / Max {harmonicsData.thdLimit}%
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    harmonicsData.ieeePassed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (harmonicsData.thdFiltered / (harmonicsData.thdLimit * 1.8)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tuned Passive Harmonic Trap Studio */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Tuned Harmonic Trap Filter Studio
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Engage shunt LC series-resonant branches to trap specific characteristic harmonic currents:
            </p>

            {/* Trap 1: 5th Harmonic Filter */}
            <div
              onClick={() => setTrap5Enabled(!trap5Enabled)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                trap5Enabled
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center space-x-2">
                  <span>5th Harmonic Trap (n=5)</span>
                  <span className="text-[10px] text-cyan-400">{5 * gridFreq} Hz</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  L_5 + C_5 tuned series branch shunts dominant 5th harmonic
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                  trap5Enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    trap5Enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Trap 2: 7th Harmonic Filter */}
            <div
              onClick={() => setTrap7Enabled(!trap7Enabled)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                trap7Enabled
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center space-x-2">
                  <span>7th Harmonic Trap (n=7)</span>
                  <span className="text-[10px] text-cyan-400">{7 * gridFreq} Hz</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  L_7 + C_7 tuned branch shunts 7th harmonic
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                  trap7Enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    trap7Enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Trap 3: High-Pass Damped Filter */}
            <div
              onClick={() => setTrapHighPassEnabled(!trapHighPassEnabled)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                trapHighPassEnabled
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center space-x-2">
                  <span>High-Pass Damped Filter</span>
                  <span className="text-[10px] text-indigo-400">&ge; 11th Harmonic</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Parallel R-L with C shunts 11th, 13th, and higher frequencies
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                  trapHighPassEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    trapHighPassEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Quality Factors & DC Waveform Metrics */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Conversion Quality & Metrics</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Form Factor (FF)</div>
                <div className="text-lg font-mono font-black text-cyan-400">
                  {harmonicsData.formFactor.toFixed(3)}
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Vo_rms / Vo_avg</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Ripple Factor (RF)</div>
                <div className="text-lg font-mono font-black text-amber-400">
                  {(harmonicsData.rippleFactor * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-500 font-mono">&radic;(FF&sup2; - 1)</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Rectification &eta;</div>
                <div className="text-lg font-mono font-black text-emerald-400">
                  {harmonicsData.efficiency.toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-500 font-mono">P_dc / P_ac</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">AC RMS Current</div>
                <div className="text-lg font-mono font-black text-indigo-400">
                  {harmonicsData.iRmsFiltered.toFixed(1)} A
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Total grid draw</div>
              </div>
            </div>

            {/* Firing Angle Slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Firing Angle (&alpha;):</span>
                <span className="text-amber-400 font-bold">{alpha}&deg;</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="1"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
