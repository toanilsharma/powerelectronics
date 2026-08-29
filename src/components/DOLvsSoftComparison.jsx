import React, { useState, useEffect, useRef } from 'react';
import { Zap, Activity, Sliders } from 'lucide-react';

export const DOLvsSoftComparison = ({
  params,
  readouts,
  faults,
  isRunning,
  isTrip,
}) => {
  const [viewMode, setViewMode] = useState('split');
  const canvasRef = useRef(null);

  const flaAmps = 269;
  const dolPeakAmps = 2152; // 8.0x FLA
  const initialV = params.initialVoltagePct ?? 40;
  const currentLimitPct = params.currentLimitPct ?? 350;

  // Calculate live Soft Start Ramp Clamp Current
  let iRawAmps = Math.round(dolPeakAmps * (initialV / 100));
  let iCapAmps = Math.round(flaAmps * (currentLimitPct / 100));
  let softClampAmps = Math.min(iRawAmps, iCapAmps);

  // Fault impact: T1 Open increases Phase B/C current by 1.3x -> ~1118A to 1200A
  if (faults?.t1Open) {
    softClampAmps = Math.min(dolPeakAmps, Math.round(softClampAmps * 1.3));
  } else if (faults?.t1Short || faults?.bypassWeld) {
    softClampAmps = dolPeakAmps;
  }

  const softLimitRatio = (softClampAmps / flaAmps).toFixed(1);

  // Render Canvas Curves for DOL (PRE) vs Soft Start (POST)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const drawDOL = (startX, endX) => {
      const len = endX - startX;
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      for (let i = 0; i <= len; i++) {
        const x = startX + i;
        const progress = i / len;
        let amp = flaAmps;
        if (progress < 0.15) {
          // Sharp DOL Spike 2152A
          const spikeDecay = Math.exp(-progress * 25);
          amp = flaAmps + (dolPeakAmps - flaAmps) * spikeDecay;
        }
        const y = h - 6 - Math.min(h - 10, (amp / dolPeakAmps) * (h - 10));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const drawSoft = (startX, endX) => {
      const len = endX - startX;
      ctx.beginPath();
      ctx.strokeStyle = faults?.t1Open ? '#ff4d6d' : '#00e5a0';
      ctx.lineWidth = 2.5;

      for (let i = 0; i <= len; i++) {
        const x = startX + i;
        const progress = i / len;
        let amp = flaAmps;
        if (progress < 0.65) {
          amp = softClampAmps;
        }
        const y = h - 6 - Math.min(h - 10, (amp / dolPeakAmps) * (h - 10));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (viewMode === 'pre') {
      drawDOL(0, w);
    } else if (viewMode === 'post') {
      drawSoft(0, w);
    } else {
      // SPLIT VIEW: Left half PRE (DOL), Right half POST (Soft Start)
      const mid = Math.floor(w / 2);
      drawDOL(0, mid - 10);
      drawSoft(mid + 10, w);

      // Separator line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mid, 0);
      ctx.lineTo(mid, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [viewMode, softClampAmps, dolPeakAmps, initialV, currentLimitPct, faults]);

  return (
    <div id="ss-pre-post-split" className="w-full bg-[#0d131f] border border-[#1e293b] rounded-2xl p-2.5 shadow-xl flex flex-col justify-between h-auto min-h-[120px] md:h-[120px] md:max-h-[120px] overflow-hidden font-mono select-none">
      {/* TOP ROW: VIEW MODE PILLS & LIVE FORMULA BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-[#1e293b] pb-1">
        {/* LIVE FORMULA & CLAMP BADGES */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] w-full md:w-auto">
          <span className="px-2 py-0.5 rounded bg-red-950/90 border border-red-500/60 text-red-300 font-extrabold shrink-0">
            DOL PEAK 2152A (8.0x) UNTRAPPED
          </span>
          <span className={`px-2 py-0.5 rounded border font-extrabold shrink-0 ${
            faults?.t1Open
              ? 'bg-red-900/90 border-red-400 text-red-200 animate-pulse'
              : 'bg-emerald-950/90 border-emerald-500/60 text-[#00e5a0]'
          }`}>
            RAMP CLAMP {softClampAmps}A ({softLimitRatio}x) {faults?.t1Open ? 'FAULT OVERLOAD' : 'SOFT'}
          </span>
          <span className="text-slate-400 font-bold hidden xl:inline text-[9px]">
            Formula: I_soft = I_DOL × (V_start / V_nom)
          </span>
        </div>

        {/* PRE / POST / SPLIT BUTTONS */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('pre')}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
              viewMode === 'pre'
                ? 'bg-red-500/20 border-red-500 text-red-300'
                : 'bg-[#070a10] border-[#1e293b] text-slate-400 hover:text-white'
            }`}
          >
            PRE: DOL
          </button>
          <button
            type="button"
            onClick={() => setViewMode('post')}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
              viewMode === 'post'
                ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0]'
                : 'bg-[#070a10] border-[#1e293b] text-slate-400 hover:text-white'
            }`}
          >
            POST: SOFT
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'bg-[#070a10] border-[#1e293b] text-slate-400 hover:text-white'
            }`}
          >
            SPLIT
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: WAVEFORM COMPARISON CANVAS (55px height) */}
      <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#04060a] h-[55px] min-h-[55px]">
        <canvas ref={canvasRef} width={600} height={55} className="w-full h-[55px]" />
        {viewMode === 'split' && (
          <>
            <span className="absolute top-1 left-2 text-[9px] font-extrabold text-red-400 bg-black/60 px-1.5 py-0.5 rounded border border-red-500/30">
              PRE: DOL 2152A (UNFILTERED)
            </span>
            <span className="absolute top-1 right-2 text-[9px] font-extrabold text-[#00e5a0] bg-black/60 px-1.5 py-0.5 rounded border border-[#00e5a0]/30">
              POST: SOFT {softClampAmps}A ({faults?.t1Open ? '130% OVERLOAD' : 'TRAPPED'})
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default DOLvsSoftComparison;
