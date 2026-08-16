import React, { useEffect, useRef, useState } from 'react';
import { HarmonicBarData, PassiveFilterConfig, ActiveFilterConfig, IEEE519Params } from '../types/harmonics';
import { Waves, Play, Pause, Activity, ShieldCheck, ShieldAlert, DollarSign } from 'lucide-react';

interface HarmonicsRightPanelProps {
  harmonics: HarmonicBarData[];
  thdVal: number;
  isCompliant: boolean;
  passiveFilter: PassiveFilterConfig;
  activeFilter: ActiveFilterConfig;
  ieeeParams: IEEE519Params;
}

export const HarmonicsRightPanel: React.FC<HarmonicsRightPanelProps> = ({
  harmonics,
  thdVal,
  isCompliant,
  passiveFilter,
  activeFilter,
  ieeeParams,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [rightTab, setRightTab] = useState<'waveforms' | 'vectors'>('waveforms');

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

  // --- 1. LIVE 3-TRACE OSCILLOSCOPE ANIMATION ---
  useEffect(() => {
    if (rightTab !== 'waveforms') return;
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const renderWaveforms = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.fillStyle = '#090d12';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 15; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      if (isPlaying) {
        timeRef.current += 0.05 * timeScale;
      }
      const t = timeRef.current;
      const activeHarmonics = harmonics.filter((item) => item.magnitude > 0);

      // 1. Load Current Waveform (Distorted - Pink/Red)
      ctx.beginPath();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 * timeScale + t;
        let iLoad = Math.sin(rad);

        activeHarmonics.forEach((hItem) => {
          const hOrder = hItem.order;
          const mag = (hItem.magnitude / 100) * 0.75;
          const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
          iLoad += mag * Math.sin(hOrder * rad + phase);
        });

        const y = midY - iLoad * (h * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 2. APF Compensation Waveform (Cyan)
      if (activeFilter.enabled) {
        ctx.beginPath();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        for (let x = 0; x < w; x++) {
          const rad = (x / w) * Math.PI * 4 * timeScale + t;
          let iApf = 0;

          activeHarmonics.forEach((hItem) => {
            if (hItem.order >= 2) {
              const hOrder = hItem.order;
              const mag = (hItem.magnitude / 100) * 0.75;
              const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
              iApf -= mag * Math.sin(hOrder * rad + phase);
            }
          });

          const y = midY - iApf * (h * 0.3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 3. Cleaned Grid Current Waveform (Sinusoidal - Emerald Green)
      ctx.beginPath();
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;

      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 * timeScale + t;
        let iGrid = Math.sin(rad);

        if (!activeFilter.enabled && !passiveFilter.enabled) {
          activeHarmonics.forEach((hItem) => {
            const hOrder = hItem.order;
            const mag = (hItem.magnitude / 100) * 0.75;
            const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
            iGrid += mag * Math.sin(hOrder * rad + phase);
          });
        } else {
          activeHarmonics.forEach((hItem) => {
            if (hItem.order >= 2) {
              const hOrder = hItem.order;
              let mag = (hItem.magnitude / 100) * 0.75;

              if (activeFilter.enabled) mag *= 0.08;
              if (passiveFilter.enabled && hItem.order === passiveFilter.tunedFreq) mag *= 0.15;

              const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
              iGrid += mag * Math.sin(hOrder * rad + phase);
            }
          });
        }

        const y = midY - iGrid * (h * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      frameId = requestAnimationFrame(renderWaveforms);
    };

    renderWaveforms();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [harmonics, isPlaying, timeScale, activeFilter, passiveFilter, rightTab]);

  // --- 2. AKAGI p-q THEORY POLAR VECTOR CANVAS ---
  useEffect(() => {
    if (rightTab !== 'vectors') return;
    const canvas = vectorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const renderVectors = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.38;

      ctx.fillStyle = '#090d12';
      ctx.fillRect(0, 0, w, h);

      // Polar concentric circles
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      [0.3, 0.6, 0.9].forEach((scale) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis lines (d-q frame)
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText('+d (Active)', cx + r + 5, cy + 3);
      ctx.fillText('+q (Reactive)', cx - 25, cy - r - 5);

      if (isPlaying) {
        timeRef.current += 0.04 * timeScale;
      }
      const t = timeRef.current;

      // 1. Fundamental Active Vector Id1 (Emerald Green)
      const id1X = cx + r * 0.75 * Math.cos(t);
      const id1Y = cy - r * 0.75 * Math.sin(t);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(id1X, id1Y);
      ctx.stroke();

      // 2. Harmonic Distortion Ripple Trajectory (Red)
      const hMag = (thdVal / 100) * (r * 0.4);
      const ihX = id1X + hMag * Math.cos(5 * t);
      const ihY = id1Y - hMag * Math.sin(5 * t);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(id1X, id1Y);
      ctx.lineTo(ihX, ihY);
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(ihX, ihY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. APF Compensating Vector (Cyan)
      if (activeFilter.enabled) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ihX, ihY);
        ctx.lineTo(id1X, id1Y);
        ctx.stroke();
      }

      frameId = requestAnimationFrame(renderVectors);
    };

    renderVectors();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [thdVal, isPlaying, timeScale, activeFilter, rightTab]);

  // Derived Calculations
  const kFactor = +(1 + (Math.pow(thdVal / 100, 2) * 1.5)).toFixed(2);
  const annualSavingsUsd = Math.round((thdVal > 5 ? (thdVal - 5) * 450 : 0));
  const iscIlRatio = ieeeParams.il > 0 ? +(ieeeParams.isc / ieeeParams.il).toFixed(1) : 20;

  return (
    <div className="w-full flex flex-col gap-3.5 font-mono text-xs">
      {/* REAL-TIME 3-TRACE OSCILLOSCOPE CARD */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 shadow-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span>LIVE 3-TRACE OSCILLOSCOPE</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightTab('waveforms')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                rightTab === 'waveforms'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-[#21262d] border-[#30363d] text-slate-400'
              }`}
            >
              i(t) Traces
            </button>
            <button
              onClick={() => setRightTab('vectors')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                rightTab === 'vectors'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-[#21262d] border-[#30363d] text-slate-400'
              }`}
            >
              p-q Vectors
            </button>
          </div>
        </div>

        {/* CANVAS DISPLAY */}
        <div className="relative w-full rounded-lg overflow-hidden border border-[#30363d] bg-[#090d12]">
          {rightTab === 'waveforms' ? (
            <canvas ref={waveCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          ) : (
            <canvas ref={vectorCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          )}

          {/* CONTROLS OVERLAY */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-[#0d1117]/85 backdrop-blur px-2.5 py-1 rounded border border-[#30363d] text-[10px]">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 text-slate-200 hover:text-white font-bold cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              {isPlaying ? 'PAUSE' : 'RUN'}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">TIME SCALE:</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={timeScale}
                onChange={(e) => setTimeScale(Number(e.target.value))}
                className="w-16 accent-cyan-500 cursor-pointer h-1"
              />
            </div>
          </div>
        </div>

        {/* TRACE COLOR LEGEND */}
        <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-0.5">
          <div className="bg-[#0d1117] p-1.5 rounded border border-[#21262d] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
            <span className="text-red-300 font-bold">i_load(t)</span>
          </div>
          <div className="bg-[#0d1117] p-1.5 rounded border border-[#21262d] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" />
            <span className="text-cyan-300 font-bold">i_apf(t)</span>
          </div>
          <div className="bg-[#0d1117] p-1.5 rounded border border-[#21262d] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88]" />
            <span className="text-emerald-300 font-bold">i_grid(t)</span>
          </div>
        </div>
      </div>

      {/* POWER QUALITY TELEMETRY & IEEE 519 COMPLIANCE GAUGE CARD */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>IEEE 519 TELEMETRY & K-FACTOR</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 border ${
              isCompliant
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-red-950 border-red-500 text-red-300 animate-pulse'
            }`}
          >
            {isCompliant ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {isCompliant ? 'IEEE 519 PASS' : 'IEEE 519 FAIL'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* CURRENT THD */}
          <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">TOTAL HARMONIC DISTORTION</span>
            <div className="flex items-baseline justify-between">
              <span className={`font-extrabold text-base ${thdVal <= 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                {thdVal.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500">THD_i Limit: 5.0%</span>
            </div>
          </div>

          {/* TRANSFORMER K-FACTOR */}
          <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">TRANSFORMER K-FACTOR</span>
            <div className="flex items-baseline justify-between">
              <span className={`font-extrabold text-base ${kFactor <= 4 ? 'text-cyan-400' : 'text-amber-400'}`}>
                K-{kFactor}
              </span>
              <span className="text-[10px] text-slate-500">ANSI C57.110</span>
            </div>
          </div>
        </div>

        {/* FINANCIAL SAVINGS & COPPER LOSS REDUCTION */}
        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-slate-300 font-bold">Annual Energy Loss Savings</span>
              <span className="text-[10px] text-slate-400">Copper I²R Heating Reduction</span>
            </div>
          </div>
          <span className="font-extrabold text-emerald-400 text-sm font-mono">
            ${annualSavingsUsd.toLocaleString()}/yr
          </span>
        </div>

        {/* SHORT CIRCUIT RATIO Isc/Il */}
        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex justify-between items-center text-xs">
          <span className="text-slate-400">SHORT-CIRCUIT RATIO (Isc / Il):</span>
          <span className="font-extrabold text-cyan-300 font-mono">{iscIlRatio}</span>
        </div>
      </div>
    </div>
  );
};
