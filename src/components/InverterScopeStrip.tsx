import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'waveforms' | 'spectrum'>('waveforms');
  const [hoverX, setHoverX] = useState<number | null>(null);

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
    </div>
  );
};

export default InverterScopeStrip;
