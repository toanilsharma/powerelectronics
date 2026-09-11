import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  Split
} from 'lucide-react';

interface PhaseControlSemiVsFullConverterLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlSemiVsFullConverterLab.tsx
 * 
 * Recommendation 2: Semi-Converter vs. Fully-Controlled Converter Split-Screen Benchmark
 * 
 * Features:
 *  - Synchronized side-by-side comparative simulation: Semi-Converter (2 SCRs + 2 Diodes) vs Full-Converter (4 SCRs).
 *  - Visualizes in-circuit freewheeling action at omega*t = pi, clamping vo(t) = 0 and preventing negative excursions.
 *  - Visualizes Full-converter stored inductive energy holding SCRs ON and forcing vo(t) deeply negative into Quadrant IV.
 *  - 4-Quadrant V0-I0 Plane Tracer: 1-Quadrant (Semi) vs 2-Quadrant (Full with Inversion capability).
 *  - Synchronized CRT Oscilloscopes: Output voltages vo(t), load currents io(t), and AC supply line currents is(t).
 *  - Mathematical proof of superior Displacement Power Factor in Semi-converters: DPF_semi = cos(alpha/2) > cos(alpha).
 */
export const PhaseControlSemiVsFullConverterLab: React.FC<PhaseControlSemiVsFullConverterLabProps> = ({
  className = '',
  onClose,
}) => {
  // Shared Converter Settings
  const [firingAlphaDeg, setFiringAlphaDeg] = useState<number>(60); // alpha: 0° to 150°
  const [vSupplyRms, setVSupplyRms] = useState<number>(230); // V RMS 50Hz
  const [loadResistance, setLoadResistance] = useState<number>(15); // Ohms
  const [loadInductanceMh, setLoadInductanceMh] = useState<number>(45); // mH (inductive load)

  // Animation & Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simDeg, setSimDeg] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Electrical Physical Calculations
  const frequencyHz = 50;
  const omega = 2 * Math.PI * frequencyHz;
  const vPeak = vSupplyRms * Math.SQRT2;
  const alphaRad = (firingAlphaDeg * Math.PI) / 180;

  // Average Output Voltages:
  // Semi-Converter: Vdc_semi = (Vm / pi) * (1 + cos(alpha))
  const vdcSemi = useMemo(() => {
    const v = (vPeak / Math.PI) * (1 + Math.cos(alphaRad));
    return Number(v.toFixed(1));
  }, [vPeak, alphaRad]);

  // Full-Converter: Vdc_full = (2 * Vm / pi) * cos(alpha)
  const vdcFull = useMemo(() => {
    const v = ((2 * vPeak) / Math.PI) * Math.cos(alphaRad);
    return Number(v.toFixed(1));
  }, [vPeak, alphaRad]);

  // Average Load Currents: Id = Vdc / R
  const idSemi = useMemo(() => {
    return Number((vdcSemi / loadResistance).toFixed(2));
  }, [vdcSemi, loadResistance]);

  const idFull = useMemo(() => {
    return Number((vdcFull / loadResistance).toFixed(2));
  }, [vdcFull, loadResistance]);

  // Displacement Power Factor:
  // Semi-converter: DPF = cos(alpha / 2)
  const dpfSemi = useMemo(() => {
    return Number(Math.cos(alphaRad / 2).toFixed(3));
  }, [alphaRad]);

  // Full-converter: DPF = cos(alpha)
  const dpfFull = useMemo(() => {
    return Number(Math.cos(alphaRad).toFixed(3));
  }, [alphaRad]);

  // Active Conduction State for current simulation angle simDeg
  const currentConduction = useMemo(() => {
    const phi = (simDeg % 360 + 360) % 360;
    const a = firingAlphaDeg;

    // Semi-Converter:
    // Period 1 (a to 180): T1 and D2 conduct (AC to Load)
    // Period 2 (180 to 180+a): FREEWHEELING! Load loops locally through D1 and D2 (or DF). vo = 0!
    // Period 3 (180+a to 360): T2 and D1 conduct (AC to Load)
    // Period 4 (360 to 360+a): FREEWHEELING! vo = 0!
    const isSemiFreewheeling = (phi >= 180 && phi < 180 + a) || (phi < a);
    const isSemiPositiveConduction = phi >= a && phi < 180;
    const isSemiNegativeConduction = phi >= 180 + a && phi < 360;

    // Full-Converter (Continuous R-L):
    // Period 1 (a to 180+a): T1 and T2 conduct continuously. From 180 to 180+a, vo is NEGATIVE!
    // Period 2 (180+a to 360+a): T3 and T4 conduct continuously. From 0 to a, vo is NEGATIVE!
    const isFullNegativeInterval = (phi >= 180 && phi < 180 + a) || (phi < a);
    const isFullLeg1Conducting = phi >= a && phi < 180 + a;
    const isFullLeg2Conducting = !isFullLeg1Conducting;

    return {
      isSemiFreewheeling,
      isSemiPositiveConduction,
      isSemiNegativeConduction,
      isFullNegativeInterval,
      isFullLeg1Conducting,
      isFullLeg2Conducting,
    };
  }, [simDeg, firingAlphaDeg]);

  // Animation Loop
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setSimDeg((prev) => (prev + dtMs * 0.09 * playbackSpeed) % 360);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Draw Dual Synchronized Oscilloscope Screen
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Split Canvas Vertically:
    // Top Zone (0% to 52%): Semi-Converter Output vs Full-Converter Output
    // Bottom Zone (56% to 100%): AC Line Input Current is(t) comparison
    const topZeroY = height * 0.32;
    const botZeroY = height * 0.82;

    const xStart = 50;
    const xEnd = width - 20;
    const degToX = (deg: number) => xStart + ((deg % 360) / 360) * (xEnd - xStart);

    // Baselines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xStart, topZeroY);
    ctx.lineTo(xEnd, topZeroY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xStart, botZeroY);
    ctx.lineTo(xEnd, botZeroY);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 V', 14, topZeroY + 3);
    ctx.fillText('0 A', 14, botZeroY + 3);

    // 60° ticks
    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748b';
    for (let d = 0; d <= 360; d += 60) {
      const tx = degToX(d);
      ctx.fillText(`${d}°`, tx - 8, height - 4);
    }

    const voltScale = 0.20;
    const currScale = 12.0;

    // AC input envelope background
    ctx.strokeStyle = '#38bdf820';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const v = vPeak * Math.sin((deg * Math.PI) / 180);
      const py = topZeroY - v * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Helper functions for instantaneous waveforms
    const getWaveforms = (deg: number) => {
      const phi = (deg % 360 + 360) % 360;
      const a = firingAlphaDeg;
      const rad = (deg * Math.PI) / 180;
      const vAc = vPeak * Math.sin(rad);

      // --- FULL CONVERTER (Continuous R-L) ---
      let voFull = 0;
      let isFull = 0;
      if (phi >= a && phi < 180 + a) {
        voFull = vAc;
        isFull = idFull;
      } else {
        voFull = -vAc;
        isFull = -idFull;
      }

      // --- SEMI CONVERTER (With Freewheeling) ---
      let voSemi = 0;
      let isSemi = 0;
      if (phi >= a && phi < 180) {
        voSemi = vAc;
        isSemi = idSemi;
      } else if (phi >= 180 + a && phi < 360) {
        voSemi = -vAc;
        isSemi = -idSemi;
      } else {
        // FREEWHEELING INTERVAL: vo = 0, is = 0!
        voSemi = 0;
        isSemi = 0;
      }

      return { voFull, voSemi, isFull, isSemi };
    };

    // Shading the Negative Voltage Excursion Area for Full Converter
    // (from 180 to 180 + a, and from 0 to a)
    const x180 = degToX(180);
    const x180PlusA = degToX(180 + firingAlphaDeg);
    const x0 = degToX(0);
    const xA = degToX(firingAlphaDeg);

    ctx.fillStyle = 'rgba(244, 63, 94, 0.2)'; // Rose/Red negative power shading
    if (x180PlusA > x180) {
      ctx.fillRect(x180, topZeroY, x180PlusA - x180, 70);
    }
    if (xA > x0) {
      ctx.fillRect(x0, topZeroY, xA - x0, 70);
    }

    // --- CURVE 1: FULL CONVERTER OUTPUT vo_full(t) (Rose/Red) ---
    ctx.beginPath();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.2;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const { voFull } = getWaveforms(deg);
      const py = topZeroY - voFull * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- CURVE 2: SEMI CONVERTER OUTPUT vo_semi(t) (Emerald Green) ---
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.8;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const { voSemi } = getWaveforms(deg);
      const py = topZeroY - voSemi * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- CURVE 3: FULL CONVERTER AC LINE CURRENT is_full(t) (Amber) ---
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b80';
    ctx.lineWidth = 1.8;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const { isFull } = getWaveforms(deg);
      const py = botZeroY - isFull * currScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- CURVE 4: SEMI CONVERTER AC LINE CURRENT is_semi(t) (Sky Blue with Zero Freewheel notches) ---
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const { isSemi } = getWaveforms(deg);
      const py = botZeroY - isSemi * currScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Freewheeling Notch Marker on Bottom Scope
    if (x180PlusA > x180) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(x180, botZeroY - 25, x180PlusA - x180, 50);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`FREEWHEEL (is=0)`, x180 + 4, botZeroY - 30);
    }

    // Cursor
    const cursorX = degToX(simDeg);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 15);
    ctx.lineTo(cursorX, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cursorX, 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Dynamic Conduction State Overlay in Canvas
    if (currentConduction.isSemiFreewheeling) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 290, 48, 270, 60, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚡ SEMI-CONVERTER FREEWHEELING ACTIVE', width - 280, 68);
      ctx.font = '10px sans-serif';
      ctx.fillText('Diodes clamp vo = 0V • AC line draws 0A current', width - 280, 84);
      ctx.fillText('Inductor energy recirculates locally in DC loop', width - 280, 98);
    } else {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 270, 48, 250, 50, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚡ ACTIVE CONDUCTION (AC → LOAD)', width - 260, 68);
      ctx.font = '10px sans-serif';
      ctx.fillText(`SCRs & Diodes transfer power from AC mains`, width - 260, 84);
    }

    // Legends
    ctx.fillStyle = '#10b981';
    ctx.font = '11px sans-serif';
    ctx.fillText('― Semi-Converter vo(t) [Clamped at 0V by Freewheeling]', 50, 22);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText('― Full-Converter vo(t) [Swings Negative into Q-IV]', 420, 22);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('― Semi-Converter Line Current is(t) [With 0A Freewheel Gaps]', 50, botZeroY - 45);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('― Full-Converter Line Current is(t) [Square Wave Continuous]', 470, botZeroY - 45);
  }, [
    simDeg,
    firingAlphaDeg,
    vPeak,
    idSemi,
    idFull,
    currentConduction,
  ]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Split className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                SEMI-CONVERTER vs. FULLY-CONTROLLED CONVERTER BENCHMARK
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                REC 2 • PHASE CONTROL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Comparative split-screen: freewheeling diode action, negative voltage excursion suppression, 1-quadrant vs. 2-quadrant operation, and power factor enhancement.
            </p>
          </div>
        </div>

        {/* Live Freewheeling Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black shadow-lg transition-all ${
              currentConduction.isSemiFreewheeling
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 animate-pulse'
                : 'bg-sky-500/20 border-sky-500/50 text-sky-300'
            }`}
          >
            {currentConduction.isSemiFreewheeling ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>FREEWHEELING INTERVAL (vo = 0V • AC is = 0A)</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-sky-400" />
                <span>GRID POWER TRANSFER (vo = vac)</span>
              </>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 bg-[#161f30] rounded border border-slate-700 text-xs font-mono"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Controls + Dual CRT Scope + 4-Quadrant Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Comparative Metrics (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Sliders Box */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                SHARED CONVERTER CONTROLS
              </span>
              <button
                onClick={() => {
                  setFiringAlphaDeg(60);
                  setLoadResistance(15);
                  setLoadInductanceMh(45);
                  setVSupplyRms(230);
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Firing Angle Alpha Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400 font-bold">Firing Delay Angle (α):</span>
                <span className="font-mono text-emerald-300 font-extrabold">{firingAlphaDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="140"
                step="1"
                value={firingAlphaDeg}
                onChange={(e) => setFiringAlphaDeg(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Notice: At α = 90°, Full-Converter Vdc hits 0V, while Semi-Converter still outputs {vdcSemi}V!
              </span>
            </div>

            {/* Load Inductance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-bold">Load Inductance (L):</span>
                <span className="font-mono text-sky-300 font-extrabold">{loadInductanceMh} mH</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={loadInductanceMh}
                onChange={(e) => setLoadInductanceMh(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Load Resistance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-bold">Load Resistance (R):</span>
                <span className="font-mono text-amber-300 font-extrabold">{loadResistance} Ω</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={loadResistance}
                onChange={(e) => setLoadResistance(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-black text-slate-400 tracking-wider">TEACHING PRESETS</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFiringAlphaDeg(90)}
                className="px-2 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900/50 transition-all text-left cursor-pointer"
              >
                ⚖️ α = 90° (Full Vdc = 0V)
              </button>
              <button
                onClick={() => setFiringAlphaDeg(120)}
                className="px-2 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] font-bold hover:bg-rose-900/50 transition-all text-left cursor-pointer"
              >
                💥 α = 120° (Full Inverts, Semi Stays &gt;0)
              </button>
              <button
                onClick={() => setFiringAlphaDeg(30)}
                className="px-2 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-300 text-[11px] font-bold hover:bg-sky-900/50 transition-all text-left cursor-pointer"
              >
                ⚡ α = 30° (High Power Output)
              </button>
              <button
                onClick={() => {
                  setFiringAlphaDeg(60);
                  setLoadInductanceMh(100);
                }}
                className="px-2 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[11px] font-bold hover:bg-purple-900/50 transition-all text-left cursor-pointer"
              >
                🌀 Pure DC Current (Heavy L)
              </button>
            </div>
          </div>

          {/* 4-Quadrant Operating Plane Comparison Card */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              4-QUADRANT PLANE (V0 - I0)
            </span>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[#141a24] p-2.5 rounded-lg border border-emerald-500/30 flex flex-col gap-1">
                <span className="font-bold text-emerald-400">SEMI-CONVERTER</span>
                <span className="text-[11px] text-white font-mono font-black">1-QUADRANT ONLY</span>
                <span className="text-[10px] text-slate-400">Vo ≥ 0, Io ≥ 0 (Rectifier)</span>
                <div className="w-full h-8 bg-[#0a0d14] rounded flex items-center justify-center text-[10px] text-emerald-300 font-bold border border-emerald-900/40">
                  Quadrant I Only
                </div>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-rose-500/30 flex flex-col gap-1">
                <span className="font-bold text-rose-400">FULL-CONVERTER</span>
                <span className="text-[11px] text-white font-mono font-black">2-QUADRANTS</span>
                <span className="text-[10px] text-slate-400">Vo ±, Io ≥ 0 (Inverts!)</span>
                <div className="w-full h-8 bg-[#0a0d14] rounded flex items-center justify-center text-[10px] text-rose-300 font-bold border border-rose-900/40">
                  Quadrant I &amp; IV
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Split Oscilloscope + Performance Comparison Strip (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Scope Controls */}
          <div className="flex items-center justify-between bg-[#0f1420] border border-[#1e293b] rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button
                onClick={() => setSimDeg(0)}
                className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded text-xs font-mono cursor-pointer"
              >
                RE-TRIGGER
              </button>
              <div className="text-xs font-mono text-emerald-400">
                ωt = <span className="font-bold">{simDeg.toFixed(0)}°</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs bg-[#0c1322] px-2.5 py-1 rounded-xl border border-slate-700">
              <span className="text-slate-400 font-bold text-xs">SPEED:</span>
              {[
                { val: 1.0, label: '1x' },
                { val: 0.2, label: '0.2x' },
                { val: 0.05, label: '0.05x (20×)' },
                { val: 0.01, label: '0.01x (100×)' },
              ].map((spd) => (
                <button
                  key={spd.val}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd.val)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer min-h-[30px] transition-all ${
                    playbackSpeed === spd.val
                      ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/40 border border-white scale-105'
                      : 'bg-[#161f30] text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>
          </div>

          {/* CRT Oscilloscope Screen */}
          <div className="relative bg-[#0a0d14] border border-[#1e293b] rounded-xl p-2 shadow-2xl overflow-hidden">
            <canvas
              ref={scopeCanvasRef}
              width={820}
              height={360}
              className="w-full h-auto block rounded-lg"
            />
          </div>

          {/* Head-to-Head Comparative Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0f1420] border border-emerald-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Semi-Converter Vdc</span>
              <span className="text-base font-black font-mono text-emerald-300">{vdcSemi} V</span>
              <span className="text-[10px] text-slate-400">(Vm/π)•(1 + cosα)</span>
            </div>

            <div className="bg-[#0f1420] border border-rose-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-rose-400">Full-Converter Vdc</span>
              <span className="text-base font-black font-mono text-rose-300">{vdcFull} V</span>
              <span className="text-[10px] text-slate-400">(2Vm/π)•cosα</span>
            </div>

            <div className="bg-[#0f1420] border border-emerald-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Semi DPF (cos α/2)</span>
              <span className="text-base font-black font-mono text-white">{dpfSemi}</span>
              <span className="text-[10px] text-emerald-400">Superior power factor!</span>
            </div>

            <div className="bg-[#0f1420] border border-rose-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-rose-400">Full DPF (cos α)</span>
              <span className="text-base font-black font-mono text-white">{dpfFull}</span>
              <span className="text-[10px] text-slate-400">Draws heavy lagging VAr</span>
            </div>
          </div>

          {/* Theoretical & Practical Takeaway Banner */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5 text-emerald-400 font-bold">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>WHY SEMI-CONVERTERS ARE PREFERRED FOR 1-QUADRANT DC MOTOR DRIVES</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">IEC 60146 Efficiency Benchmark</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1">1. Elimination of Negative Voltage Excursions</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In a Full Converter, when AC voltage reverses polarity at <span className="font-mono text-amber-300">180°</span>, inductive load current keeps the SCRs conducting, forcing the terminal voltage to swing negative until the next trigger pulse. In a Semi-Converter, the diodes naturally freewheel at <span className="font-mono text-emerald-400">180°</span>, clamping <span className="font-mono text-emerald-300">vo = 0V</span> and preventing energy from being returned to the AC grid.
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-sky-400 mb-1">2. Higher Displacement Power Factor (DPF)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  During freewheeling, current circulates entirely within the DC converter loop and AC line current is <strong className="text-white">zero</strong>. This cuts down the fundamental phase lag:
                  <span className="block font-mono text-emerald-300 text-[10px] my-1">
                    DPF_semi = cos(α/2) &gt; DPF_full = cos(α)
                  </span>
                  At α = 60°, Semi DPF is <strong className="text-emerald-400">0.866</strong> while Full DPF drops to <strong className="text-rose-400">0.500</strong>!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
