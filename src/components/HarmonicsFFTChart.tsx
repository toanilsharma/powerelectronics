import React, { useEffect, useRef, useState } from 'react';
import { HarmonicBarData, HarmonicSourceType } from '../types/harmonics';
import { Activity, AlertTriangle, CheckCircle, ShieldAlert, BarChart2, Waves, Cpu, Compass, Play, Pause, Zap } from 'lucide-react';

interface HarmonicsFFTChartProps {
  title: string;
  harmonics: HarmonicBarData[];
  thdVal: number;
  isCompliant: boolean;
  selectedHarmonic: HarmonicBarData | null;
  onSelectHarmonic: (bar: HarmonicBarData) => void;
  width?: number;
  height?: number;
  apfEnabled?: boolean;
  apfRatingAmps?: number;
}

export type HarmonicsVisualizerMode = 'fft' | 'oscilloscope' | 'sld' | 'vector';

export const HarmonicsFFTChart: React.FC<HarmonicsFFTChartProps> = ({
  title,
  harmonics,
  thdVal,
  isCompliant,
  selectedHarmonic,
  onSelectHarmonic,
  width = 700,
  height = 320,
  apfEnabled = true,
  apfRatingAmps = 200,
}) => {
  const [visualizerMode, setVisualizerMode] = useState<HarmonicsVisualizerMode>('fft');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [hoveredBar, setHoveredBar] = useState<HarmonicBarData | null>(null);

  // Canvas Refs
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const animRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // --- 1. FFT SPECTRUM CANVAS RENDER ---
  useEffect(() => {
    if (visualizerMode !== 'fft') return;
    const canvas = fftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, w, h);

    // Margins
    const paddingLeft = 50;
    const paddingBottom = 35;
    const paddingTop = 25;
    const paddingRight = 20;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;
    const maxY = 35;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let yVal = 0; yVal <= maxY; yVal += 5) {
      const y = paddingTop + chartH - (yVal / maxY) * chartH;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${yVal}%`, paddingLeft - 6, y + 3);
    }

    // Filter harmonics for orders 2 to 50
    const displayHarmonics = harmonics.filter((item) => item.order >= 2 && item.order <= 50);
    const barWidth = Math.max(2, chartW / displayHarmonics.length - 2);

    // Draw Bars
    displayHarmonics.forEach((bar, index) => {
      const x = paddingLeft + index * (chartW / displayHarmonics.length) + 1;
      const barH = (Math.min(bar.magnitude, maxY) / maxY) * chartH;
      const y = paddingTop + chartH - barH;

      const isSelected = selectedHarmonic?.order === bar.order;
      const isHovered = hoveredBar?.order === bar.order;

      if (bar.isExceeding) {
        ctx.fillStyle = isSelected || isHovered ? '#f87171' : '#ef4444';
      } else {
        ctx.fillStyle = isSelected || isHovered ? '#34d399' : '#10b981';
      }

      ctx.fillRect(x, y, barWidth, barH);

      if (isSelected || isHovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, barWidth, barH);
      }

      if (bar.order % 5 === 0 || bar.order === 2 || bar.order === 3) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`h${bar.order}`, x + barWidth / 2, paddingTop + chartH + 15);
      }
    });

    // IEEE 519 Limit Line Overlay (Dashed Red Line)
    ctx.beginPath();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);

    displayHarmonics.forEach((bar, index) => {
      const x = paddingLeft + index * (chartW / displayHarmonics.length) + barWidth / 2;
      const limitY = paddingTop + chartH - (bar.limit / maxY) * chartH;
      if (index === 0) ctx.moveTo(x, limitY);
      else ctx.lineTo(x, limitY);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HARMONIC ORDER (h = 2 to 50)', paddingLeft + chartW / 2, h - 5);
  }, [harmonics, selectedHarmonic, hoveredBar, visualizerMode]);

  // --- 2. LIVE REAL-TIME OSCILLOSCOPE WAVEFORM CANVAS ---
  useEffect(() => {
    if (visualizerMode !== 'oscilloscope') return;
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

      // Draw Grid Lines & Zero Axis
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 20; y < h; y += 40) {
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

      // Render Load Current Waveform (Distorted - Pinkish Red)
      ctx.beginPath();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 * timeScale + t;
        let iLoad = Math.sin(rad); // Fundamental

        // Add harmonic components
        activeHarmonics.forEach((hItem) => {
          const hOrder = hItem.order;
          const mag = (hItem.magnitude / 100) * 0.8;
          const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
          iLoad += mag * Math.sin(hOrder * rad + phase);
        });

        const y = midY - iLoad * (h * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Render APF Injected Compensation Waveform (Cyan)
      if (apfEnabled) {
        ctx.beginPath();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;

        for (let x = 0; x < w; x++) {
          const rad = (x / w) * Math.PI * 4 * timeScale + t;
          let iApf = 0;

          // APF injects anti-harmonic currents
          activeHarmonics.forEach((hItem) => {
            if (hItem.order >= 2) {
              const hOrder = hItem.order;
              const mag = (hItem.magnitude / 100) * 0.8;
              const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
              iApf -= mag * Math.sin(hOrder * rad + phase); // Negative anti-phase
            }
          });

          const y = midY - iApf * (h * 0.3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Render Cleaned Grid Current Waveform (Sinusoidal - Emerald Green)
      ctx.beginPath();
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;

      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 * timeScale + t;
        let iGrid = Math.sin(rad); // Fundamental

        if (!apfEnabled) {
          // If APF disabled, grid carries full distortion
          activeHarmonics.forEach((hItem) => {
            const hOrder = hItem.order;
            const mag = (hItem.magnitude / 100) * 0.8;
            const phase = (hItem.phaseAngle || 0) * (Math.PI / 180);
            iGrid += mag * Math.sin(hOrder * rad + phase);
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
    return () => cancelAnimationFrame(frameId);
  }, [harmonics, isPlaying, timeScale, apfEnabled, visualizerMode]);

  // --- 3. AKAGI p-q THEORY VECTOR POLAR CANVAS RENDER ---
  useEffect(() => {
    if (visualizerMode !== 'vector') return;
    const canvas = vectorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const renderVectorPlot = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(cx, cy) - 30;

      ctx.fillStyle = '#090d12';
      ctx.fillRect(0, 0, w, h);

      // Concentric Circles (50%, 100%)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Axes (α-β axes)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - radius - 15, cy);
      ctx.lineTo(cx + radius + 15, cy);
      ctx.moveTo(cx, cy - radius - 15);
      ctx.lineTo(cx, cy + radius + 15);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('α (Real Axis)', cx + radius + 5, cy - 5);
      ctx.fillText('β (Imag Axis)', cx + 5, cy - radius - 5);

      if (isPlaying) {
        timeRef.current += 0.04 * timeScale;
      }
      const t = timeRef.current;

      // Draw Fundamental Vector (Green)
      const fundAngle = t;
      const fundX = cx + radius * 0.7 * Math.cos(fundAngle);
      const fundY = cy - radius * 0.7 * Math.sin(fundAngle);

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fundX, fundY);
      ctx.stroke();

      // Draw Harmonic Ripple Trajectory
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const activeHarmonics = harmonics.filter((item) => item.magnitude > 0);

      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        let vx = Math.cos(a);
        let vy = Math.sin(a);

        activeHarmonics.forEach((hItem) => {
          const mag = (hItem.magnitude / 100) * 0.6;
          vx += mag * Math.cos(hItem.order * a);
          vy += mag * Math.sin(hItem.order * a);
        });

        const px = cx + radius * 0.6 * vx;
        const py = cy - radius * 0.6 * vy;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // APF Compensation Vector (Cyan)
      if (apfEnabled) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        let vxHarm = 0;
        let vyHarm = 0;
        activeHarmonics.forEach((hItem) => {
          if (hItem.order >= 2) {
            const mag = (hItem.magnitude / 100) * 0.6;
            vxHarm += mag * Math.cos(hItem.order * t);
            vyHarm += mag * Math.sin(hItem.order * t);
          }
        });

        const apfX = cx - radius * 0.6 * vxHarm;
        const apfY = cy + radius * 0.6 * vyHarm;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(apfX, apfY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      frameId = requestAnimationFrame(renderVectorPlot);
    };

    renderVectorPlot();
    return () => cancelAnimationFrame(frameId);
  }, [harmonics, isPlaying, timeScale, apfEnabled, visualizerMode]);

  // FFT Canvas Click & Hover Handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = fftCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const paddingLeft = 50;
    const paddingRight = 20;
    const chartW = canvas.width - paddingLeft - paddingRight;

    const displayHarmonics = harmonics.filter((item) => item.order >= 2 && item.order <= 50);
    const step = chartW / displayHarmonics.length;

    const index = Math.floor((clickX - paddingLeft) / step);
    if (index >= 0 && index < displayHarmonics.length) {
      onSelectHarmonic(displayHarmonics[index]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = fftCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const paddingLeft = 50;
    const paddingRight = 20;
    const chartW = canvas.width - paddingLeft - paddingRight;

    const displayHarmonics = harmonics.filter((item) => item.order >= 2 && item.order <= 50);
    const step = chartW / displayHarmonics.length;

    const index = Math.floor((mouseX - paddingLeft) / step);
    if (index >= 0 && index < displayHarmonics.length) {
      setHoveredBar(displayHarmonics[index]);
    } else {
      setHoveredBar(null);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-4 shadow-2xl">
      {/* TOP CONTROL & SUB-TAB NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
            <p className="text-[11px] text-slate-400">Real-Time Spectral Analyzer & Active Power Filter (APF) Engine</p>
          </div>
        </div>

        {/* MODE SELECTOR BUTTONS */}
        <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
          <button
            onClick={() => setVisualizerMode('fft')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              visualizerMode === 'fft'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            FFT Spectrum
          </button>
          <button
            onClick={() => setVisualizerMode('oscilloscope')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              visualizerMode === 'oscilloscope'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            3-Trace Waveforms
          </button>
          <button
            onClick={() => setVisualizerMode('sld')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              visualizerMode === 'sld'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            APF Topology
          </button>
          <button
            onClick={() => setVisualizerMode('vector')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              visualizerMode === 'vector'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            p-q Vectors
          </button>
        </div>

        {/* THD READOUT & PASS/FAIL INDICATOR */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">THDi:</span>
            <span className={`text-base font-mono font-extrabold ${thdVal <= 5 ? 'text-emerald-400' : 'text-red-400'}`}>
              {thdVal.toFixed(1)}%
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              isCompliant
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-red-950 border-red-500 text-red-300 animate-pulse'
            }`}
          >
            {isCompliant ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isCompliant ? 'IEEE 519 PASS' : 'IEEE 519 FAIL'}
          </div>
        </div>
      </div>

      {/* CANVAS / SLD DISPLAY AREA */}
      <div className="relative w-full overflow-hidden bg-[#090d12] border border-[#30363d] rounded-lg min-h-[300px]">
        {/* MODE 1: FFT SPECTRUM CANVAS */}
        {visualizerMode === 'fft' && (
          <canvas
            ref={fftCanvasRef}
            width={width}
            height={height}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredBar(null)}
            className="w-full h-[300px] cursor-pointer"
          />
        )}

        {/* MODE 2: REAL-TIME 3-TRACE OSCILLOSCOPE */}
        {visualizerMode === 'oscilloscope' && (
          <div className="relative w-full h-[300px]">
            <canvas ref={waveCanvasRef} width={width} height={height} className="w-full h-full" />
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center bg-[#0d1117]/80 backdrop-blur px-3 py-1.5 rounded-md border border-slate-800 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-red-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Load Current i_load(t)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> APF Injected i_apf(t)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Cleaned Grid i_grid(t)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 flex items-center gap-1"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: APF SINGLE-LINE TOPOLOGY DIAGRAM */}
        {visualizerMode === 'sld' && (
          <div className="w-full h-[300px] flex items-center justify-center p-4">
            <svg viewBox="0 0 800 280" className="w-full h-full">
              <defs>
                <filter id="glowGreenAPF" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glowCyanAPF" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Utility Grid Supply Transformer */}
              <g transform="translate(60, 140)">
                <circle cx={-15} cy={0} r={22} fill="none" stroke="#00ff88" strokeWidth={3} filter="url(#glowGreenAPF)" />
                <circle cx={15} cy={0} r={22} fill="none" stroke="#00ff88" strokeWidth={3} filter="url(#glowGreenAPF)" />
                <text x={0} y={40} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  UTILITY GRID (415V 50/60Hz)
                </text>
              </g>

              {/* Main Busbar (x=115 to x=680) */}
              <line x1={115} y1={140} x2={680} y2={140} stroke={apfEnabled ? '#00ff88' : '#f43f5e'} strokeWidth={6} filter="url(#glowGreenAPF)" />
              {apfEnabled && (
                <line x1={115} y1={140} x2={680} y2={140} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-right" />
              )}

              {/* CT Sensing Node (at x=320) */}
              <g transform="translate(320, 140)">
                <circle cx={0} cy={0} r={12} fill="#0d1117" stroke="#38bdf8" strokeWidth={2.5} />
                <text x={0} y={4} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">CT</text>
                <path d="M0,12 L0,50 L80,50" fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" />
                <text x={0} y={-20} textAnchor="middle" fill="#cbd5e1" fontSize="9">DSP CT Sensing</text>
              </g>

              {/* Shunt Active Power Filter (APF) Module Branch (at x=400, y=140 down to y=230) */}
              <line x1={400} y1={140} x2={400} y2={190} stroke="#00f0ff" strokeWidth={4} filter="url(#glowCyanAPF)" />
              <g transform="translate(400, 220)">
                <rect x={-70} y={-30} width={140} height={60} fill="#0f172a" stroke="#00f0ff" strokeWidth={2} rx={6} />
                <text x={0} y={-10} textAnchor="middle" fill="#00f0ff" fontSize="11" fontWeight="bold">
                  SHUNT APF (IGBT INVERTER)
                </text>
                <text x={0} y={8} textAnchor="middle" fill="#94a3b8" fontSize="9">
                  {apfEnabled ? `ACTIVE INJECTING ${apfRatingAmps}A` : 'BYPASSED / OFF'}
                </text>
                <text x={0} y={22} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
                  Vdc = 750V | f_sw = 20kHz
                </text>
              </g>

              {/* Non-Linear Load Box (at x=680, y=140) */}
              <line x1={680} y1={140} x2={720} y2={140} stroke="#f43f5e" strokeWidth={4} />
              <g transform="translate(740, 140)">
                <rect x={-30} y={-40} width={60} height={80} fill="#1e1b4b" stroke="#f43f5e" strokeWidth={2} rx={6} />
                <text x={0} y={-15} textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="bold">NON-LINEAR</text>
                <text x={0} y={0} textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="bold">LOAD</text>
                <text x={0} y={15} textAnchor="middle" fill="#cbd5e1" fontSize="9">VFD / SCR</text>
              </g>

              {/* Busbar Labels */}
              <text x={220} y={120} fill="#00ff88" fontSize="10" fontWeight="bold" textAnchor="middle">
                i_grid(t) Sinusoidal Grid Supply
              </text>
              <text x={550} y={120} fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="middle">
                i_load(t) Distorted Harmonic Current
              </text>
            </svg>
          </div>
        )}

        {/* MODE 4: AKAGI p-q THEORY VECTOR POLAR CANVAS */}
        {visualizerMode === 'vector' && (
          <div className="relative w-full h-[300px]">
            <canvas ref={vectorCanvasRef} width={width} height={height} className="w-full h-full" />
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center bg-[#0d1117]/80 backdrop-blur px-3 py-1.5 rounded-md border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-4">
                <span className="text-emerald-400 font-bold">Fundamental Vector (I_d1)</span>
                <span className="text-red-400 font-bold">Harmonic Trajectory (I_h)</span>
                <span className="text-cyan-400 font-bold">APF Compensation (I_APF)</span>
              </div>
              <span className="text-amber-400 font-bold">Akagi p-q Instantaneous Controller</span>
            </div>
          </div>
        )}
      </div>

      {/* INTERACTIVE HARMONIC DETAILS BAR (IF SELECTED) */}
      {selectedHarmonic && (
        <div className="bg-[#0d1117] border border-cyan-500/50 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Activity className="w-4 h-4" />
            HARMONIC DETAILS (ORDER h={selectedHarmonic.order})
          </div>
          <div className="flex items-center gap-4 text-slate-200 font-mono">
            <span>
              MEASURED: <strong className="text-white">{selectedHarmonic.magnitude.toFixed(1)}%</strong>
            </span>
            <span>
              IEEE LIMIT: <strong className="text-cyan-400">{selectedHarmonic.limit.toFixed(1)}%</strong>
            </span>
            <span
              className={`font-bold ${
                selectedHarmonic.isExceeding ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {selectedHarmonic.isExceeding
                ? `EXCEEDS BY +${(selectedHarmonic.magnitude - selectedHarmonic.limit).toFixed(1)}%`
                : 'WITHIN IEEE 519 LIMIT'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
