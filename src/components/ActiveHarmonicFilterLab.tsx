import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Layers, AlertTriangle, ShieldCheck, Cpu, Filter, RotateCcw, Info, CheckCircle2 } from 'lucide-react';

interface ActiveHarmonicFilterLabProps {
  onClose?: () => void;
}

type AHFMode = 'off' | 'harmonics_only' | 'full_compensation';
type LoadType = 'six_pulse' | 'diode_cap' | 'vfd_drive';

export const ActiveHarmonicFilterLab: React.FC<ActiveHarmonicFilterLabProps> = ({ onClose }) => {
  const [loadType, setLoadType] = useState<LoadType>('six_pulse');
  const [ahfMode, setAhfMode] = useState<AHFMode>('full_compensation');
  const [ahfRatingAmps, setAhfRatingAmps] = useState<number>(100);
  const [loadCurrentRms, setLoadCurrentRms] = useState<number>(75); // Amperes fundamental
  const [gridVoltageRms] = useState<number>(415); // Volts RMS L-L

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simPhaseRef = useRef<number>(0);

  // Harmonic amplitudes as % of fundamental for different load types
  const getHarmonicProfile = (type: LoadType) => {
    switch (type) {
      case 'six_pulse':
        // 6-Pulse Converter: h = 6k ± 1 (5th: 20%, 7th: 14%, 11th: 9%, 13th: 7%)
        return { h1: 100, h5: 20.0, h7: 14.3, h11: 9.1, h13: 7.7, h17: 5.8, h19: 5.2, pf: 0.85 };
      case 'diode_cap':
        // Diode Rectifier with large DC Cap: highly peaked pulses
        return { h1: 100, h5: 38.0, h7: 22.0, h11: 12.0, h13: 8.5, h17: 7.0, h19: 5.5, pf: 0.72 };
      case 'vfd_drive':
        return { h1: 100, h5: 28.0, h7: 12.0, h11: 8.0, h13: 6.0, h17: 4.5, h19: 3.5, pf: 0.88 };
    }
  };

  const harmProfile = getHarmonicProfile(loadType);

  // Compute uncompensated Load THD %
  const uncompensatedThdPct = Math.sqrt(
    Math.pow(harmProfile.h5, 2) +
    Math.pow(harmProfile.h7, 2) +
    Math.pow(harmProfile.h11, 2) +
    Math.pow(harmProfile.h13, 2) +
    Math.pow(harmProfile.h17, 2) +
    Math.pow(harmProfile.h19, 2)
  );

  // Compensated Grid THD % (AHF attenuates harmonics by ~92% when within capacity)
  const isAhfActive = ahfMode !== 'off';
  const ahfCapacityRatio = Math.min(1.0, ahfRatingAmps / (loadCurrentRms * (uncompensatedThdPct / 100) * 1.5));
  const attenuationFactor = isAhfActive ? (1 - 0.92 * ahfCapacityRatio) : 1.0;
  const gridThdPct = uncompensatedThdPct * attenuationFactor;
  const gridPf = ahfMode === 'full_compensation' ? Math.min(0.999, harmProfile.pf + 0.14) : harmProfile.pf;
  const isIeee519Compliant = gridThdPct <= 5.0;

  // Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      simPhaseRef.current += dt * (2 * Math.PI * 50); // 50 Hz fundamental

      const phase = simPhaseRef.current;

      // 1. RENDER LIVE DUAL OSCILLOSCOPE CANVAS
      const wCanvas = waveCanvasRef.current;
      if (wCanvas) {
        const ctx = wCanvas.getContext('2d');
        if (ctx) {
          const w = wCanvas.width;
          const h = wCanvas.height;

          ctx.fillStyle = '#060a12';
          ctx.fillRect(0, 0, w, h);

          // CRT Scope Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let x = 0; x < w; x += 35) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
          }
          for (let y = 0; y < h; y += 35) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
          }
          ctx.stroke();

          // Center baseline
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
          ctx.stroke();

          const totalCycles = 2.0;
          const pts = w;

          // Helper to calculate wave components at time slice
          const getSliceValues = (theta: number) => {
            // Fundamental current
            const phiLoad = Math.acos(harmProfile.pf);
            const i1 = Math.sin(theta - phiLoad);

            // Harmonic content
            const i5 = (harmProfile.h5 / 100) * Math.sin(5 * theta);
            const i7 = (harmProfile.h7 / 100) * Math.sin(7 * theta);
            const i11 = (harmProfile.h11 / 100) * Math.sin(11 * theta);
            const i13 = (harmProfile.h13 / 100) * Math.sin(13 * theta);
            const iHarmonics = i5 + i7 + i11 + i13;

            // Total non-linear load current
            const iLoad = i1 + iHarmonics;

            // AHF Injection current: exactly anti-phase to harmonics (+ reactive power if full compensation)
            let iInj = 0;
            if (isAhfActive) {
              const cancelHarm = -iHarmonics * (0.92 * ahfCapacityRatio);
              const cancelReactive = ahfMode === 'full_compensation' ? -(Math.sin(theta - phiLoad) - Math.sin(theta)) : 0;
              iInj = cancelHarm + cancelReactive;
            }

            // Net Grid Current (Kirchhoff's Current Law: i_grid = i_load + i_inj)
            const iGrid = iLoad + iInj;

            return { iLoad, iInj, iGrid };
          };

          // Draw Trace 1: Distorted Load Current (Red)
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const theta = ((x / pts) * totalCycles * 2 * Math.PI) + phase;
            const vals = getSliceValues(theta);
            const y = (h / 2) - vals.iLoad * (h * 0.32);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Trace 2: AHF Injected Cancellation Current (Purple)
          if (isAhfActive) {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let x = 0; x < pts; x++) {
              const theta = ((x / pts) * totalCycles * 2 * Math.PI) + phase;
              const vals = getSliceValues(theta);
              const y = (h / 2) - vals.iInj * (h * 0.32);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          // Draw Trace 3: Resulting Grid Current (Emerald)
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const theta = ((x / pts) * totalCycles * 2 * Math.PI) + phase;
            const vals = getSliceValues(theta);
            const y = (h / 2) - vals.iGrid * (h * 0.32);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Legend Header
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`― i_load(t) [THD: ${uncompensatedThdPct.toFixed(1)}%]`, 10, 16);
          ctx.fillStyle = '#c084fc';
          ctx.fillText(isAhfActive ? '― i_ahf(t) (Anti-Harmonic)' : '― AHF Inactive', 210, 16);
          ctx.fillStyle = '#34d399';
          ctx.fillText(`― i_grid(t) [THD: ${gridThdPct.toFixed(1)}% - ${isIeee519Compliant ? 'PASS' : 'FAIL'}]`, 400, 16);
        }
      }

      // 2. RENDER FFT SPECTRUM COMPARISON CANVAS
      const fCanvas = fftCanvasRef.current;
      if (fCanvas) {
        const ctx = fCanvas.getContext('2d');
        if (ctx) {
          const w = fCanvas.width;
          const h = fCanvas.height;

          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // Grid & baseline
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let y = 20; y < h - 25; y += 30) {
            ctx.moveTo(30, y); ctx.lineTo(w - 15, y);
          }
          ctx.moveTo(30, h - 25); ctx.lineTo(w - 15, h - 25);
          ctx.stroke();

          // IEEE 519 5% Limit Line (Amber Dashed)
          const limitY = (h - 25) - (5 / 45) * (h - 50);
          ctx.strokeStyle = '#f59e0b';
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(30, limitY); ctx.lineTo(w - 15, limitY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f59e0b';
          ctx.font = '8px monospace';
          ctx.fillText('IEEE 519 Limit (5%)', w - 110, limitY - 4);

          // Bar data: 5th, 7th, 11th, 13th, 17th, 19th
          const harmonicOrders = [
            { h: 'h5', label: '5th (250Hz)', val: harmProfile.h5 },
            { h: 'h7', label: '7th (350Hz)', val: harmProfile.h7 },
            { h: 'h11', label: '11th (550Hz)', val: harmProfile.h11 },
            { h: 'h13', label: '13th (650Hz)', val: harmProfile.h13 },
            { h: 'h17', label: '17th (850Hz)', val: harmProfile.h17 },
            { h: 'h19', label: '19th (950Hz)', val: harmProfile.h19 },
          ];

          const groupW = (w - 60) / harmonicOrders.length;
          const barW = groupW * 0.35;

          harmonicOrders.forEach((item, idx) => {
            const cx = 45 + idx * groupW + groupW / 2;
            const maxVal = 45; // 45% max scale
            const uncompHeight = (item.val / maxVal) * (h - 50);
            const compVal = isAhfActive ? item.val * attenuationFactor : item.val;
            const compHeight = (compVal / maxVal) * (h - 50);

            // Uncompensated Bar (Red)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
            ctx.fillRect(cx - barW - 2, (h - 25) - uncompHeight, barW, uncompHeight);

            // Compensated Grid Bar (Emerald)
            ctx.fillStyle = isAhfActive ? '#34d399' : '#ef4444';
            ctx.fillRect(cx + 2, (h - 25) - compHeight, barW, compHeight);

            // Labels
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(item.h, cx, h - 10);
            ctx.textAlign = 'left';
          });

          // Y Axis Labels
          ctx.fillStyle = '#64748b';
          ctx.font = '8px monospace';
          ctx.fillText('40%', 6, (h - 25) - (40 / 45) * (h - 50) + 3);
          ctx.fillText('20%', 6, (h - 25) - (20 / 45) * (h - 50) + 3);
          ctx.fillText('0%', 12, h - 25);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [loadType, ahfMode, ahfRatingAmps, loadCurrentRms, harmProfile, uncompensatedThdPct, gridThdPct, isAhfActive, ahfCapacityRatio, attenuationFactor, isIeee519Compliant]);

  return (
    <div className="w-full bg-[#0a0f1d] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-5 text-white font-mono">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold tracking-wide uppercase text-white">
                Active Harmonic Filter (AHF) Instantaneous p-q Cancellation Lab
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 border border-purple-500/40 text-purple-400">
                IEEE 519-2022 / Akagi p-q Theory
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
              Real-time Clarke transformation, oscillating power separation, and active anti-phase harmonic current cancellation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] text-xs font-mono transition-all cursor-pointer"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {/* TOP CONFIGURATION ROW: LOAD TYPE & AHF OPERATING MODE */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Load Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#94a3b8]">Non-Linear Load:</span>
          <button
            onClick={() => setLoadType('six_pulse')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              loadType === 'six_pulse' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            ⚡ 6-Pulse SCR Rectifier
          </button>
          <button
            onClick={() => setLoadType('diode_cap')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              loadType === 'diode_cap' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            🔋 Diode Bridge + DC Cap
          </button>
          <button
            onClick={() => setLoadType('vfd_drive')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              loadType === 'vfd_drive' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            🏭 Industrial VFD Inverter
          </button>
        </div>

        {/* AHF Mode Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94a3b8]">AHF State:</span>
          <button
            onClick={() => setAhfMode('off')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              ahfMode === 'off' ? 'bg-red-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8]'
            }`}
          >
            OFF (Bypassed)
          </button>
          <button
            onClick={() => setAhfMode('harmonics_only')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              ahfMode === 'harmonics_only' ? 'bg-purple-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8]'
            }`}
          >
            Harmonics Only
          </button>
          <button
            onClick={() => setAhfMode('full_compensation')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              ahfMode === 'full_compensation' ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8]'
            }`}
          >
            Harmonics + PF Correction
          </button>
        </div>
      </div>

      {/* DUAL CANVASES: REAL-TIME SCOPE AND FFT BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 7 COLS: WAVEFORM CANCELLATION SCOPE */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" /> REAL-TIME ANTI-PHASE CANCELLATION (i_grid = i_load + i_ahf)
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              isIeee519Compliant ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-red-500/20 border-red-500 text-red-300'
            }`}>
              {isIeee519Compliant ? 'IEEE 519 COMPLIANT (<5% THD)' : 'NON-COMPLIANT (>5% THD)'}
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#060a12] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={waveCanvasRef}
              width={540}
              height={250}
              className="w-full h-auto max-h-[260px]"
            />
          </div>

          {/* Readout Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">LOAD CURRENT THD</span>
              <div className="text-sm font-extrabold text-red-400">{uncompensatedThdPct.toFixed(1)}%</div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">GRID CURRENT THD</span>
              <div className={`text-sm font-extrabold ${isIeee519Compliant ? 'text-emerald-400' : 'text-amber-400'}`}>
                {gridThdPct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">GRID POWER FACTOR</span>
              <div className="text-sm font-extrabold text-white">{gridPf.toFixed(3)}</div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">AHF CAPACITY LOAD</span>
              <div className="text-sm font-extrabold text-purple-300">{(ahfCapacityRatio * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: FFT HARMONIC COMPARISON BAR CHART */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" /> FFT SPECTRUM: LOAD VS GRID
            </span>
            <span className="text-[11px] text-amber-400 font-bold">Limit: 5.0%</span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#090d16] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={fftCanvasRef}
              width={350}
              height={250}
              className="w-full h-auto max-h-[260px]"
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e] px-1">
            <span className="text-red-400">■ Load Harmonics</span>
            <span className="text-emerald-400">■ Grid (After AHF)</span>
            <span className="text-amber-400">-- IEEE 519 Limit</span>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS & PHYSICAL EQUATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
        {/* CONTROLS (8 COLS) */}
        <div className="md:col-span-8 flex flex-col gap-4 font-mono text-xs">
          <div className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">
            AHF Hardware &amp; Load Capacity Parameters
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AHF RATING SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">AHF Inverter Rating:</span>
                <span className="font-bold text-purple-300">{ahfRatingAmps} A</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                step="10"
                value={ahfRatingAmps}
                onChange={(e) => setAhfRatingAmps(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>30A (Small)</span>
                <span>100A (Typical)</span>
                <span>250A (Heavy)</span>
              </div>
            </div>

            {/* LOAD CURRENT SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Non-Linear Load Current:</span>
                <span className="font-bold text-red-400">{loadCurrentRms} A RMS</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                step="5"
                value={loadCurrentRms}
                onChange={(e) => setLoadCurrentRms(parseFloat(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>20A</span>
                <span>75A</span>
                <span>150A</span>
              </div>
            </div>
          </div>
        </div>

        {/* AKAGI P-Q THEORY INSIGHT (4 COLS) */}
        <div className="md:col-span-4 bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 flex flex-col justify-between text-xs font-mono space-y-2.5">
          <div className="flex items-center gap-2 text-white font-bold pb-2 border-b border-[#334155]">
            <Info className="w-4 h-4 text-purple-400" />
            <span>AKAGI INSTANTANEOUS p-q THEORY</span>
          </div>

          <div className="text-[11px] text-[#c9d1d9] space-y-1.5 leading-relaxed">
            <p>
              • <b>Clarke Transformation:</b> Converts 3-phase a-b-c voltages and currents into stationary orthogonal &alpha;-&beta; coordinates.
            </p>
            <p>
              • Instantaneous active power p(t) decomposes into DC average component p_avg (useful real power) and oscillating AC ripple p_osc (harmonic distortion).
            </p>
            <p>
              • Fast 20 kHz IGBT VSC synthesizes compensating currents to cancel p_osc and reactive power q(t), leaving pure fundamental sine current at the utility grid!
            </p>
          </div>

          <div className="pt-2 border-t border-[#334155] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">IEEE 519-2022 Limit</span>
            <span className="text-emerald-400 font-bold">THD &lt; 5.0%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
