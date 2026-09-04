import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Info, Maximize2, Zap } from 'lucide-react';
import { HarmonicSpectrumItem } from '../engine/InverterPhysics';

interface InverterScopeStripProps {
  Vdc: number;
  ma: number;
  f1: number;
  fc: number;
  Vout_rms: number;
  Iout_rms: number;
  thdPercent: number;
  mode: string;
  isEngineRunning: boolean;
  spectrum: HarmonicSpectrumItem[];
  activeFault: string | null;
}

export const InverterScopeStrip: React.FC<InverterScopeStripProps> = ({
  Vdc = 400,
  ma = 0.8,
  f1 = 50,
  fc = 5000,
  Vout_rms = 230,
  Iout_rms = 23,
  thdPercent = 1.8,
  mode = 'UNMODULATED_SPWM',
  isEngineRunning = true,
  spectrum = [],
  activeFault = null,
}) => {
  const [activeTab, setActiveTab] = useState<'waveforms' | 'spectrum' | 'intersector'>('waveforms');
  const [intersectorZoom, setIntersectorZoom] = useState<'FULL' | 'PEAK' | 'ZERO'>('PEAK');
  const [localMa, setLocalMa] = useState<number>(ma);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Sync prop changes to localMa
  useEffect(() => {
    setLocalMa(ma);
  }, [ma]);

  const fmt = (val: number | undefined | null, decimals = 1, fallback = '0.0'): string => {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(decimals);
  };

  const periodMs = 1000 / Math.max(1, f1); // 20ms for 50Hz
  const displayPeriods = 2;
  const totalTimeMs = displayPeriods * periodMs; // 40ms

  // Generate 200 Points for SVG Waveforms
  const pointsCount = 200;
  const tStepMs = totalTimeMs / (pointsCount - 1);

  const pointsVref: string[] = [];
  const pointsVtri: string[] = [];
  const pointsVab: string[] = [];
  const pointsVout: string[] = [];
  const pointsIout: string[] = [];

  const width = 720;
  const height = 280;
  const marginX = 50;

  for (let i = 0; i < pointsCount; i++) {
    const tMs = i * tStepMs;
    const tSec = tMs / 1000;
    const x = marginX + (i / (pointsCount - 1)) * (width - 2 * marginX);

    // Reference Sine Wave Vref(t) = ma * sin(2π f1 t)
    const vrefVal = ma * Math.sin(2 * Math.PI * f1 * tSec);
    const yVref = 60 - vrefVal * 25; // CH1: y center = 60
    pointsVref.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVref.toFixed(1)}`);

    // Carrier Triangle Wave Vtri(t)
    const triPhase = (tSec * fc) % 1.0;
    const vtriVal = triPhase < 0.5 ? 4 * triPhase - 1 : 3 - 4 * triPhase;
    const yVtri = 60 - vtriVal * 25;
    pointsVtri.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVtri.toFixed(1)}`);

    // H-Bridge Bipolar PWM Output Vab(t) (+Vdc, 0, -Vdc)
    let vabVal = 0;
    if (activeFault === 'S1_OPEN') {
      vabVal = vrefVal > vtriVal ? Vdc * 0.5 : 0;
    } else if (activeFault === 'DEADTIME_ZERO' || activeFault === 'S1_SHORT') {
      vabVal = (i % 8 < 2) ? Vdc * 1.5 : (vrefVal > vtriVal ? Vdc : -Vdc);
    } else {
      vabVal = vrefVal > vtriVal ? Vdc : -Vdc;
    }
    const yVab = 135 - (vabVal / Math.max(100, Vdc)) * 25; // CH2: y center = 135
    pointsVab.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVab.toFixed(1)}`);

    // Filtered AC Output Voltage Vout(t) (Pure 50Hz Sine)
    let voutVal = Vout_rms * Math.SQRT2 * Math.sin(2 * Math.PI * f1 * tSec);
    if (activeFault === 'LC_RESONANCE') {
      voutVal += 40 * Math.sin(2 * Math.PI * fc * 0.5 * tSec);
    }
    const yVout = 205 - (voutVal / Math.max(100, Vdc)) * 25; // CH3: y center = 205
    pointsVout.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVout.toFixed(1)}`);

    // Inductor / Load Current Iout(t)
    const ioutVal = Iout_rms * Math.SQRT2 * Math.sin(2 * Math.PI * f1 * tSec - 0.3);
    const yIout = 255 - (ioutVal / Math.max(10, Iout_rms * 2)) * 15; // CH4: y center = 255
    pointsIout.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yIout.toFixed(1)}`);
  }

  return (
    <div className="flex flex-col gap-2 w-full h-full min-h-[460px] font-mono select-none">
      {/* SCOPE CONTROL STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#070b14] border-2 border-[#1e293b] rounded-xl text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white text-xs">
            LIVE DUAL-CANVAS OSCILLOSCOPE &amp; FFT HARMONIC SCANNER
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('waveforms')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'waveforms' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 Live Scope Channels (4-CH)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('intersector')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'intersector' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ SPWM Carrier Intersector &amp; Overmodulation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spectrum')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'spectrum' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 FFT Harmonic Spectrum (1-50th)
          </button>
        </div>
      </div>

      {/* TAB 1: 4-CHANNEL LIVE OSCILLOSCOPE */}
      {activeTab === 'waveforms' && (
        <div className="relative w-full flex-1 min-h-[360px] rounded-xl border border-slate-800 bg-[#030712] p-2 flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 720 280"
            className="w-full h-full max-h-[340px]"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              setHoverX(x);
            }}
            onMouseLeave={() => setHoverX(null)}
          >
            {/* Grid Lines */}
            <g stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3,3">
              <line x1="50" y1="60" x2="670" y2="60" />
              <line x1="50" y1="135" x2="670" y2="135" />
              <line x1="50" y1="205" x2="670" y2="205" />
              <line x1="50" y1="255" x2="670" y2="255" />

              <line x1="205" y1="20" x2="205" y2="270" />
              <line x1="360" y1="20" x2="360" y2="270" />
              <line x1="515" y1="20" x2="515" y2="270" />
            </g>

            {/* Channel Labels */}
            <text x="12" y="63" fill="#f59e0b" fontSize="9" fontWeight="bold">CH1: SPWM</text>
            <text x="12" y="138" fill="#38bdf8" fontSize="9" fontWeight="bold">CH2: Vab</text>
            <text x="12" y="208" fill="#00e5a0" fontSize="9" fontWeight="bold">CH3: Vout</text>
            <text x="12" y="258" fill="#c084fc" fontSize="9" fontWeight="bold">CH4: Iout</text>

            {/* CH1: Reference Sine Vref vs Carrier Vtri */}
            <path d={pointsVtri.join(' ')} fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.6" />
            <path d={pointsVref.join(' ')} fill="none" stroke="#eab308" strokeWidth="2.5" />

            {/* CH2: H-Bridge PWM Voltage Vab */}
            <path d={pointsVab.join(' ')} fill="none" stroke="#38bdf8" strokeWidth="1.8" />

            {/* CH3: Filtered AC Output Voltage Vout */}
            <path d={pointsVout.join(' ')} fill="none" stroke="#00e5a0" strokeWidth="2.5" />

            {/* CH4: Inductor / Load Current Iout */}
            <path d={pointsIout.join(' ')} fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="4,2" />

            {/* Interactive Crosshair */}
            {hoverX !== null && hoverX >= 50 && hoverX <= 670 && (
              <g>
                <line x1={hoverX} y1="20" x2={hoverX} y2="270" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                <rect x={hoverX + 6} y="25" width="130" height="42" rx="4" fill="#0b1322" stroke="#38bdf8" strokeWidth="1" />
                <text x={hoverX + 12} y="38" fill="#38bdf8" fontSize="8" fontWeight="bold">
                  t = {fmt(((hoverX - 50) / 620) * totalTimeMs, 2)} ms
                </text>
                <text x={hoverX + 12} y="50" fill="#00e5a0" fontSize="8" fontWeight="bold">
                  Vout = {fmt(Vout_rms, 1)} V | Iout = {fmt(Iout_rms, 1)} A
                </text>
                <text x={hoverX + 12} y="60" fill="#f59e0b" fontSize="8" fontWeight="bold">
                  ma = {ma} | THD = {fmt(thdPercent, 2)}%
                </text>
              </g>
            )}
          </svg>

          {/* Scope Legend Footer Bar */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[10px] text-center font-bold">
            <div className="p-1 rounded bg-[#0b1220] border border-amber-500/40 text-amber-300">
              CH1: Vref vs Vtri (ma={ma})
            </div>
            <div className="p-1 rounded bg-[#0b1220] border border-cyan-500/40 text-cyan-300">
              CH2: Vab PWM (±{Vdc}V)
            </div>
            <div className="p-1 rounded bg-[#0b1220] border border-emerald-500/40 text-emerald-300">
              CH3: Filtered Vout ({fmt(Vout_rms, 1)}V RMS)
            </div>
            <div className="p-1 rounded bg-[#0b1220] border border-purple-500/40 text-purple-300">
              CH4: Iout Current ({fmt(Iout_rms, 1)}A RMS)
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FFT HARMONIC SPECTRUM */}
      {activeTab === 'spectrum' && (
        <div className="relative w-full flex-1 min-h-[360px] rounded-xl border border-slate-800 bg-[#030712] p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              IEEE 519 / IEC 61000 FFT HARMONIC SPECTRUM ANALYSIS
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              THD_V = {fmt(thdPercent, 2)}% {thdPercent <= 5.0 ? '(PASS ≤ 5%)' : '(HIGH DISTORTION)'}
            </span>
          </div>

          {/* BAR CHART CANVAS */}
          <div className="w-full h-48 bg-[#070b14] border border-slate-800 rounded-xl p-3 flex items-end justify-between gap-1 overflow-x-auto">
            {spectrum.map((item) => {
              const barHeightPct = Math.min(100, Math.max(4, item.percentage));
              return (
                <div key={item.order} className="flex flex-col items-center gap-1 flex-1 min-w-[24px] group">
                  <span className="text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-all">
                    {item.magnitudeV}V
                  </span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      item.order === 1
                        ? 'bg-emerald-500 hover:bg-emerald-400'
                        : item.percentage > 5
                        ? 'bg-rose-500 hover:bg-rose-400'
                        : 'bg-cyan-500 hover:bg-cyan-400'
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                    title={`Harmonic h=${item.order} (${item.freqHz}Hz): ${item.magnitudeV}V (${item.percentage}%)`}
                  />
                  <span className="text-[9px] font-bold text-slate-400">h{item.order}</span>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 bg-[#0b1220] border border-purple-500/40 rounded-xl text-[11px] text-slate-300 leading-relaxed font-sans">
            💡 <strong className="text-purple-300 font-mono">SPWM Harmonic Feature:</strong> In Sinusoidal PWM, fundamental frequency harmonic distortion occurs primarily at sideband groups centered around the switching frequency carrier ratio <strong className="text-cyan-300 font-mono">mf = fc/f1 = {Math.round(fc/f1)}</strong> (i.e. mf ± 1, mf ± 3). The LC filter attenuates these carrier sidebands by over 95%!
          </div>
        </div>
      )}

      {/* TAB 3: SPWM CARRIER INTERSECTOR & OVERMODULATION */}
      {activeTab === 'intersector' && (() => {
        let tStart = 0;
        let tEnd = periodMs;
        if (intersectorZoom === 'PEAK') {
          tStart = periodMs * 0.175;
          tEnd = periodMs * 0.325;
        } else if (intersectorZoom === 'ZERO') {
          tStart = 0;
          tEnd = periodMs * 0.15;
        }

        const tSpan = tEnd - tStart;
        const ptsCount = 500;
        const ptsVtri: string[] = [];
        const ptsVref: string[] = [];
        const ptsPwm: string[] = [];
        const ptsVabInter: string[] = [];
        const laserTransitions: number[] = [];

        const svgW = 720;
        const mX = 50;
        const plotW = svgW - 2 * mX;

        let prevComp = false;

        for (let i = 0; i < ptsCount; i++) {
          const frac = i / (ptsCount - 1);
          const tSec = (tStart + frac * tSpan) / 1000;
          const x = mX + frac * plotW;

          const vref = localMa * Math.sin(2 * Math.PI * f1 * tSec);
          const pTri = (tSec * fc) % 1.0;
          const vtri = pTri < 0.5 ? 4 * pTri - 1 : 3 - 4 * pTri;

          const scaleY = 32 / Math.max(1.0, localMa * 0.7);
          const yTri = 68 - vtri * scaleY;
          const yRef = 68 - vref * scaleY;

          ptsVtri.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yTri.toFixed(1)}`);
          ptsVref.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yRef.toFixed(1)}`);

          const compHigh = vref >= vtri;
          if (i > 0 && compHigh !== prevComp && laserTransitions.length < 32) {
            laserTransitions.push(x);
          }
          prevComp = compHigh;

          const yPwm = compHigh ? 150 : 175;
          ptsPwm.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yPwm}`);

          const yVab = compHigh ? 210 : 255;
          ptsVabInter.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVab}`);
        }

        const isOvermod = localMa > 1.0 && localMa <= 3.24;
        const isSquare = localMa > 3.24;

        return (
          <div className="relative w-full flex-1 min-h-[380px] rounded-xl border border-slate-800 bg-[#030712] p-3 flex flex-col gap-2.5">
            {/* Header & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-white text-xs">
                  REAL-TIME CARRIER COMPARATOR &amp; OVERMODULATION VISUALIZER
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                  isSquare
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : isOvermod
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}>
                  {isSquare ? 'Pure Square-Wave (ma > 3.24)' : isOvermod ? 'Overmodulation (1 < ma ≤ 3.24)' : 'Linear SPWM (ma ≤ 1.0)'}
                </span>
              </div>

              {/* Window Zoom Toggle & ma Slider */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] bg-[#0b1220] border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setIntersectorZoom('PEAK')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      intersectorZoom === 'PEAK' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔍 Peak Zoom (90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntersectorZoom('ZERO')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      intersectorZoom === 'ZERO' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔍 Zero Crossing (0°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntersectorZoom('FULL')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      intersectorZoom === 'FULL' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌐 Full Cycle (20ms)
                  </button>
                </div>

                <div className="flex items-center gap-1.5 bg-[#0b1220] border border-amber-500/40 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-amber-300 font-bold">ma:</span>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.05"
                    value={localMa}
                    onChange={(e) => setLocalMa(parseFloat(e.target.value))}
                    className="w-20 accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[11px] text-white font-extrabold w-8 text-right">{localMa.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Overmodulation Physics Banner */}
            {isOvermod && (
              <div className="p-2 bg-amber-950/50 border border-amber-500/60 rounded-lg text-[11px] text-amber-200 flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>
                  <strong>PULSE-DROPPING PHENOMENON ACTIVE:</strong> Because <code className="text-white">ma = {localMa.toFixed(2)} &gt; 1.0</code>, the reference sine exceeds the triangular carrier peaks at 90°. The comparator output stays HIGH continuously, causing PWM pulses to drop out and merge. Odd harmonics (h3, h5, h7) now enter the output spectrum!
                </span>
              </div>
            )}
            {isSquare && (
              <div className="p-2 bg-rose-950/60 border border-rose-500/80 rounded-lg text-[11px] text-rose-200 flex items-center gap-2">
                <span className="text-base">🚨</span>
                <span>
                  <strong>SQUARE-WAVE COLLAPSE (SIX-STEP LIMIT):</strong> At <code className="text-white">ma = {localMa.toFixed(2)} &gt; 3.24</code>, all intermediate PWM chops have completely vanished! The H-bridge operates in pure square-wave switching. Output fundamental voltage hits theoretical maximum: <code className="text-white">V1_rms = (4/π√2) × Vdc = {((4 / (Math.PI * Math.SQRT2)) * Vdc).toFixed(1)}V RMS</code>.
                </span>
              </div>
            )}

            {/* SVG Visualizer */}
            <svg viewBox="0 0 720 280" className="w-full h-full max-h-[300px] select-none">
              {/* Grid */}
              <g stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3,3">
                <line x1="50" y1="68" x2="670" y2="68" />
                <line x1="50" y1="162" x2="670" y2="162" />
                <line x1="50" y1="232" x2="670" y2="232" />
              </g>

              {/* Vertical Laser Trip Lines */}
              {laserTransitions.map((lx, idx) => (
                <line
                  key={idx}
                  x1={lx.toFixed(1)}
                  y1="25"
                  x2={lx.toFixed(1)}
                  y2="265"
                  stroke="#f59e0b"
                  strokeWidth="0.8"
                  strokeDasharray="2,3"
                  opacity="0.5"
                />
              ))}

              {/* Channel 1: Carrier & Sine Wave */}
              <text x="12" y="55" fill="#f59e0b" fontSize="9" fontWeight="bold">CH1: Vref</text>
              <text x="12" y="67" fill="#64748b" fontSize="8" fontWeight="bold">vs Vtri</text>
              <path d={ptsVtri.join(' ')} fill="none" stroke="#64748b" strokeWidth="1.2" opacity="0.85" />
              <path d={ptsVref.join(' ')} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Carrier Peak Limit Guidelines */}
              <line x1="50" y1={68 - 32} x2="670" y2={68 - 32} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />
              <text x="675" y={71 - 32} fill="#ef4444" fontSize="7" fontWeight="bold">+1.0 Carrier Peak</text>

              {/* Channel 2: S1 Gate Drive Pulse */}
              <text x="12" y="156" fill="#38bdf8" fontSize="9" fontWeight="bold">CH2: GATE</text>
              <text x="12" y="168" fill="#64748b" fontSize="8" fontWeight="bold">S1 Pulse</text>
              <path d={ptsPwm.join(' ')} fill="none" stroke="#38bdf8" strokeWidth="2" />

              {/* Channel 3: H-Bridge Vab Bipolar Pulse Output */}
              <text x="12" y="225" fill="#10b981" fontSize="9" fontWeight="bold">CH3: Vab</text>
              <text x="12" y="237" fill="#64748b" fontSize="8" fontWeight="bold">±{Vdc}V DC</text>
              <path d={ptsVabInter.join(' ')} fill="none" stroke="#10b981" strokeWidth="2.2" />

              {/* Time Span Label */}
              <text x="360" y="275" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold">
                Time Window: {tStart.toFixed(1)}ms to {tEnd.toFixed(1)}ms (Span = {tSpan.toFixed(1)}ms)
              </text>
            </svg>
          </div>
        );
      })()}
    </div>
  );
};

export default InverterScopeStrip;
