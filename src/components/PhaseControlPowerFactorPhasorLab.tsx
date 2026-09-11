import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  Compass,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  PieChart
} from 'lucide-react';

interface PhaseControlPowerFactorPhasorLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlPowerFactorPhasorLab.tsx
 * 
 * Recommendation 3: Input Power Factor & Reactive Power (P-Q-S) Phasor Dynamo
 * 
 * Features:
 *  - Rotating AC Voltage & Fundamental Current Phasor Diagram showing phi1 = alpha lag.
 *  - Dynamic Power Triangle (P, Q, S, D) scaling in real-time as alpha is adjusted.
 *  - Decomposition of Total Power Factor: PF = DPF * CDF.
 *  - The "Resistive Load Paradox": Explains why delaying alpha draws inductive reactive power (Q > 0)
 *    from the utility grid even when load is 100% pure resistance.
 *  - Multi-Channel CRT Oscilloscope: vs(t), is(t), fundamental is1(t), and instantaneous power p(t).
 *  - Live Power Factor Correction (PFC) capacitor sizing calculation to reach 0.95 PF.
 */
export const PhaseControlPowerFactorPhasorLab: React.FC<PhaseControlPowerFactorPhasorLabProps> = ({
  className = '',
  onClose,
}) => {
  // Converter Settings
  const [converterType, setConverterType] = useState<'1ph' | '3ph'>('3ph');
  const [firingAlphaDeg, setFiringAlphaDeg] = useState<number>(45); // alpha: 0° to 120°
  const [vSupplyRms, setVSupplyRms] = useState<number>(400); // V LL RMS (or V 1ph)
  const [loadCurrentId, setLoadCurrentId] = useState<number>(40); // DC Load current in Amps
  const [loadType, setLoadType] = useState<'resistive' | 'inductive'>('inductive');

  // Animation and Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simAngleDeg, setSimAngleDeg] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phasorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const powerTriangleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Electrical Physical Calculations
  const frequencyHz = 50;
  const omega = 2 * Math.PI * frequencyHz;
  const alphaRad = (firingAlphaDeg * Math.PI) / 180;

  // Fundamental current and RMS current calculations
  const { is1Rms, isTotalRms, cdf } = useMemo(() => {
    if (converterType === '1ph') {
      // 1-Phase full wave square wave:
      // Is1 = (2*sqrt(2)/pi) * Id ~ 0.900 * Id
      // Is_rms = Id
      const is1 = (2 * Math.SQRT2 / Math.PI) * loadCurrentId;
      const isRms = loadCurrentId;
      const distFactor = is1 / Math.max(0.1, isRms);
      return { is1Rms: is1, isTotalRms: isRms, cdf: distFactor };
    } else {
      // 3-Phase 6-pulse quasi-square wave:
      // Is1 = (sqrt(6)/pi) * Id ~ 0.780 * Id
      // Is_rms = sqrt(2/3) * Id ~ 0.816 * Id
      const is1 = (Math.sqrt(6) / Math.PI) * loadCurrentId;
      const isRms = Math.sqrt(2 / 3) * loadCurrentId;
      const distFactor = (3 / Math.PI); // 0.955
      return { is1Rms: is1, isTotalRms: isRms, cdf: distFactor };
    }
  }, [converterType, loadCurrentId]);

  // Displacement Power Factor: DPF = cos(alpha)
  const dpf = useMemo(() => {
    return Number(Math.cos(alphaRad).toFixed(3));
  }, [alphaRad]);

  // Total Power Factor: PF = DPF * CDF
  const totalPf = useMemo(() => {
    return Number((dpf * cdf).toFixed(3));
  }, [dpf, cdf]);

  // Real Active Power P (kW)
  const powerPKw = useMemo(() => {
    const factor = converterType === '3ph' ? Math.sqrt(3) : 1;
    const p = factor * vSupplyRms * is1Rms * Math.cos(alphaRad);
    return Number((p / 1000).toFixed(2));
  }, [converterType, vSupplyRms, is1Rms, alphaRad]);

  // Reactive Power Q (kVAr lagging)
  const powerQKvar = useMemo(() => {
    const factor = converterType === '3ph' ? Math.sqrt(3) : 1;
    const q = factor * vSupplyRms * is1Rms * Math.sin(alphaRad);
    return Number((q / 1000).toFixed(2));
  }, [converterType, vSupplyRms, is1Rms, alphaRad]);

  // Apparent Power S (kVA)
  const powerSKva = useMemo(() => {
    const factor = converterType === '3ph' ? Math.sqrt(3) : 1;
    const s = factor * vSupplyRms * isTotalRms;
    return Number((s / 1000).toFixed(2));
  }, [converterType, vSupplyRms, isTotalRms]);

  // Distortion Power D (kVAd)
  const powerDKvad = useMemo(() => {
    const s2 = powerSKva * powerSKva;
    const p2 = powerPKw * powerPKw;
    const q2 = powerQKvar * powerQKvar;
    const d2 = Math.max(0, s2 - p2 - q2);
    return Number(Math.sqrt(d2).toFixed(2));
  }, [powerSKva, powerPKw, powerQKvar]);

  // PFC Capacitor Sizing to reach target PF = 0.95
  const pfcCapacitanceUf = useMemo(() => {
    const targetTheta = Math.acos(0.95);
    const qTargetKvar = Math.max(0, powerPKw * Math.tan(targetTheta));
    const deltaQKvar = Math.max(0, powerQKvar - qTargetKvar);
    const deltaQVar = deltaQKvar * 1000;
    // For 3-Phase Delta Bank: Q_cap = 3 * omega * C * V_LL^2
    const factor = converterType === '3ph' ? 3 * omega * vSupplyRms * vSupplyRms : omega * vSupplyRms * vSupplyRms;
    const cFarads = deltaQVar / Math.max(1, factor);
    return Number((cFarads * 1e6).toFixed(1));
  }, [powerPKw, powerQKvar, converterType, omega, vSupplyRms]);

  // Animation Loop
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setSimAngleDeg((prev) => (prev + dtMs * 0.1 * playbackSpeed) % 360);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Draw Rotating Phasor Canvas
  useEffect(() => {
    const canvas = phasorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 25;

    // Outer circle
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx - radius - 8, cy);
    ctx.lineTo(cx + radius + 8, cy);
    ctx.moveTo(cx, cy - radius - 8);
    ctx.lineTo(cx, cy + radius + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotating Supply Voltage Phasor Vs (Cyan)
    const vAngleRad = (simAngleDeg * Math.PI) / 180;
    const vx = cx + radius * Math.cos(vAngleRad);
    const vy = cy - radius * Math.sin(vAngleRad);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(vx, vy);
    ctx.stroke();

    // Arrowhead for Vs
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(vx, vy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px monospace';
    ctx.fillText('V_s', vx + 6, vy - 4);

    // Rotating Fundamental Current Phasor Is1 (Amber, lagging by alpha)
    const iAngleRad = ((simAngleDeg - firingAlphaDeg) * Math.PI) / 180;
    const iRadius = radius * 0.75;
    const ix = cx + iRadius * Math.cos(iAngleRad);
    const iy = cy - iRadius * Math.sin(iAngleRad);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ix, iy);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ix, iy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText('I_s1', ix + 6, iy + 10);

    // Arc showing lag angle alpha between Vs and Is1
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.4, -vAngleRad, -iAngleRad, true);
    ctx.stroke();

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 10px monospace';
    const midAngle = (simAngleDeg - firingAlphaDeg / 2) * Math.PI / 180;
    ctx.fillText(`α = ${firingAlphaDeg}°`, cx + (radius * 0.48) * Math.cos(midAngle), cy - (radius * 0.48) * Math.sin(midAngle));

    // Center hub
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [simAngleDeg, firingAlphaDeg]);

  // Draw 3D-Style Power Triangle Canvas (P, Q, S, D)
  useEffect(() => {
    const canvas = powerTriangleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Scale powers to fit canvas
    const originX = 35;
    const originY = 35;
    const maxDrawW = width - 70;
    const maxDrawH = height - 60;

    // Normalization factor
    const maxP = 50; // kW
    const pWidth = Math.max(20, (powerPKw / maxP) * maxDrawW);
    const qHeight = Math.max(10, (powerQKvar / maxP) * maxDrawH);

    const ptA = { x: originX, y: originY };
    const ptB = { x: originX + pWidth, y: originY };
    const ptC = { x: originX + pWidth, y: originY + qHeight };

    // Shaded Triangle Area
    ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
    ctx.beginPath();
    ctx.moveTo(ptA.x, ptA.y);
    ctx.lineTo(ptB.x, ptB.y);
    ctx.lineTo(ptC.x, ptC.y);
    ctx.closePath();
    ctx.fill();

    // 1. Base Line: Real Active Power P (Emerald Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ptA.x, ptA.y);
    ctx.lineTo(ptB.x, ptB.y);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`P = ${powerPKw} kW`, (ptA.x + ptB.x) / 2 - 25, ptA.y - 8);

    // 2. Vertical Line: Lagging Reactive Power Q (Rose/Red)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ptB.x, ptB.y);
    ctx.lineTo(ptC.x, ptC.y);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`Q = ${powerQKvar} kVAr`, ptB.x + 8, (ptB.y + ptC.y) / 2 + 3);

    // 3. Hypotenuse Line: Apparent Power S (Sky Blue)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ptA.x, ptA.y);
    ctx.lineTo(ptC.x, ptC.y);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`S = ${powerSKva} kVA`, (ptA.x + ptC.x) / 2 - 35, (ptA.y + ptC.y) / 2 + 15);

    // Angle Alpha Arc at Origin
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ptA.x, ptA.y, 22, 0, Math.atan2(qHeight, pWidth));
    ctx.stroke();
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`α=${firingAlphaDeg}°`, ptA.x + 26, ptA.y + 14);
  }, [powerPKw, powerQKvar, powerSKva, firingAlphaDeg]);

  // Draw Multi-Channel Oscilloscope: vs(t), is(t), fundamental is1(t), p(t)
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Grid
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

    // Split Canvas:
    // Top Zone (0% to 54%): Supply Voltage vs(t) & Instantaneous Power p(t)
    // Bottom Zone (58% to 100%): Total Current is(t) & Fundamental is1(t)
    const topZeroY = height * 0.30;
    const botZeroY = height * 0.80;

    const xStart = 50;
    const xEnd = width - 20;
    const degToX = (deg: number) => xStart + ((deg % 360) / 360) * (xEnd - xStart);

    // Baselines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xStart, topZeroY);
    ctx.lineTo(xEnd, topZeroY);
    ctx.moveTo(xStart, botZeroY);
    ctx.lineTo(xEnd, botZeroY);
    ctx.stroke();

    // Baseline labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 V / W', 8, topZeroY + 3);
    ctx.fillText('0 A', 14, botZeroY + 3);

    const vPeakVal = vSupplyRms * Math.SQRT2;
    const voltScale = 0.18;
    const currScale = 1.4;

    // --- 1. Supply Voltage vs(t) (Cyan) ---
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const v = vPeakVal * Math.sin((deg * Math.PI) / 180);
      const py = topZeroY - v * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- 2. Instantaneous Power p(t) = vs(t) * is(t) (Shaded Golden Wave) ---
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b80';
    ctx.lineWidth = 1.8;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const rad = (deg * Math.PI) / 180;
      const v = vPeakVal * Math.sin(rad);

      // Current square wave
      const phi = (deg % 360 + 360) % 360;
      const a = firingAlphaDeg;
      let iVal = 0;
      if (phi >= a && phi < 180 + a) iVal = isTotalRms;
      else iVal = -isTotalRms;

      const pInst = (v * iVal) / 250; // scaled for scope
      const py = topZeroY - pInst;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- 3. AC Supply Current is(t) (Quasi-square, Violet) ---
    ctx.beginPath();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.2;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const phi = (deg % 360 + 360) % 360;
      const a = firingAlphaDeg;
      let iVal = 0;
      if (phi >= a && phi < 180 + a) iVal = isTotalRms;
      else iVal = -isTotalRms;

      const py = botZeroY - iVal * currScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- 4. Fundamental Current is1(t) (Pure Sine Wave, Amber) ---
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const rad = (deg * Math.PI) / 180;
      const i1 = (is1Rms * Math.SQRT2) * Math.sin(rad - alphaRad);
      const py = botZeroY - i1 * currScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Alpha Lag Marker
    const xZero = degToX(0);
    const xAlpha = degToX(firingAlphaDeg);
    ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
    ctx.fillRect(xZero, botZeroY - 30, Math.max(2, xAlpha - xZero), 60);

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`LAG α = ${firingAlphaDeg}°`, xZero + 4, botZeroY - 35);

    // Cursor
    const cursorX = degToX(simAngleDeg);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 15);
    ctx.lineTo(cursorX, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.fillText('― AC Voltage vs(t)', 50, 22);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('― Instantaneous Power p(t)', 210, 22);

    ctx.fillStyle = '#c084fc';
    ctx.fillText('― Supply Current is(t)', 450, 22);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('― Fundamental is1(t)', 640, 22);
  }, [
    simAngleDeg,
    firingAlphaDeg,
    vSupplyRms,
    is1Rms,
    isTotalRms,
    alphaRad,
  ]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-pink-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
                INPUT POWER FACTOR &amp; REACTIVE POWER (P-Q-S) PHASOR DYNAMO
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-pink-900/60 text-pink-300 border border-pink-700/50">
                REC 3 • IEEE STD 519
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Fundamental current phase lag <span className="text-pink-400 font-mono">φ1 = α</span>, displacement factor <span className="text-amber-400 font-mono">DPF = cos(α)</span>, reactive power demand, and the resistive load paradox.
            </p>
          </div>
        </div>

        {/* Live Power Factor Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-pink-500/40 bg-pink-500/15 text-xs font-black shadow-lg">
            <Zap className="w-4 h-4 text-pink-400" />
            <span>
              TOTAL PF: <span className="font-mono text-white text-sm">{totalPf}</span> (DPF: {dpf} • CDF: {cdf.toFixed(3)})
            </span>
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

      {/* Main Grid: Controls + Rotating Phasor + Power Triangle + CRT Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Controls (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-400" />
                CONVERTER &amp; GRID PARAMETERS
              </span>
              <button
                onClick={() => {
                  setFiringAlphaDeg(45);
                  setLoadCurrentId(40);
                  setVSupplyRms(400);
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Firing Angle Alpha */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-pink-400 font-bold">Firing Delay Angle (α):</span>
                <span className="font-mono text-pink-300 font-extrabold">{firingAlphaDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={firingAlphaDeg}
                onChange={(e) => setFiringAlphaDeg(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Phase lag between voltage and fundamental current is precisely equal to α
              </span>
            </div>

            {/* DC Load Current Id */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-bold">DC Load Current (Id):</span>
                <span className="font-mono text-sky-300 font-extrabold">{loadCurrentId} A</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="2"
                value={loadCurrentId}
                onChange={(e) => setLoadCurrentId(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Supply Voltage */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-bold">AC Supply Voltage:</span>
                <span className="font-mono text-amber-300 font-extrabold">{vSupplyRms} V RMS</span>
              </div>
              <input
                type="range"
                min="120"
                max="480"
                step="20"
                value={vSupplyRms}
                onChange={(e) => setVSupplyRms(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Converter Topology Selector */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
              <span className="text-xs text-slate-300 font-medium">Converter Type:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConverterType('3ph')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    converterType === '3ph'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-[#141a24] text-slate-400 hover:text-white'
                  }`}
                >
                  3-Phase 6-Pulse
                </button>
                <button
                  onClick={() => setConverterType('1ph')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    converterType === '1ph'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-[#141a24] text-slate-400 hover:text-white'
                  }`}
                >
                  1-Phase Bridge
                </button>
              </div>
            </div>
          </div>

          {/* PFC Capacitor Calculator Card */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-black text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              PFC CAPACITOR BANK SIZING (TARGET 0.95 PF)
            </span>
            <div className="p-2.5 bg-[#141a24] rounded-lg border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Required Reactive VARs:</span>
                <span className="text-sm font-black font-mono text-rose-400">{powerQKvar} kVAr</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Capacitor Bank:</span>
                <span className="text-sm font-black font-mono text-emerald-400">{pfcCapacitanceUf} µF</span>
              </div>
            </div>
          </div>

          {/* Dual Miniature Visualizers: Rotating Phasor & Power Triangle */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-2 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-pink-400 uppercase">ROTATING PHASOR</span>
              <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-800">
                <canvas ref={phasorCanvasRef} width={180} height={128} className="w-full h-full block" />
              </div>
            </div>

            <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-2 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase">POWER TRIANGLE (P-Q-S)</span>
              <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-800">
                <canvas ref={powerTriangleCanvasRef} width={180} height={128} className="w-full h-full block" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Oscilloscope + Pedagogical Breakdown Strip (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Scope Header */}
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
                onClick={() => setSimAngleDeg(0)}
                className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded text-xs font-mono cursor-pointer"
              >
                RE-TRIGGER
              </button>
              <div className="text-xs font-mono text-pink-400">
                ωt = <span className="font-bold">{simAngleDeg.toFixed(0)}°</span>
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
                      ? 'bg-pink-600 text-white font-black shadow-md shadow-pink-600/40 border border-white scale-105'
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
              height={340}
              className="w-full h-auto block rounded-lg"
            />
          </div>

          {/* Critical Power Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0f1420] border border-emerald-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Real Power (P)</span>
              <span className="text-base font-black font-mono text-emerald-300">{powerPKw} kW</span>
              <span className="text-[10px] text-slate-400">Work done at load</span>
            </div>

            <div className="bg-[#0f1420] border border-rose-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-rose-400">Reactive Power (Q)</span>
              <span className="text-base font-black font-mono text-rose-300">{powerQKvar} kVAr</span>
              <span className="text-[10px] text-slate-400">Lagging grid penalty</span>
            </div>

            <div className="bg-[#0f1420] border border-sky-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-400">Apparent Power (S)</span>
              <span className="text-base font-black font-mono text-white">{powerSKva} kVA</span>
              <span className="text-[10px] text-slate-400">√(P² + Q² + D²)</span>
            </div>

            <div className="bg-[#0f1420] border border-amber-900/40 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-400">Distortion Power (D)</span>
              <span className="text-base font-black font-mono text-amber-300">{powerDKvad} kVAd</span>
              <span className="text-[10px] text-slate-400">Harmonic pollution</span>
            </div>
          </div>

          {/* The Resistive Load Paradox Banner */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-pink-400 font-bold border-b border-[#1e293b] pb-1.5">
              <Info className="w-4 h-4" />
              <span>THE RESISTIVE LOAD PARADOX: WHY PHASE CONTROL CONSUMES LAGGING REACTIVE POWER</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">1. The Cause of Fundamental Lag</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Even if the load contains <strong className="text-white">zero inductance (pure R)</strong>, delaying the firing angle by <span className="font-mono text-pink-300">α = {firingAlphaDeg}°</span> forces current to start late in each half-cycle. The fundamental AC current component <span className="font-mono text-amber-300">is1(t)</span> is physically delayed by angle <strong className="text-pink-400">φ1 = α</strong> relative to voltage!
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-rose-400 mb-1">2. Severe Utility Grid Penalty</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Because the fundamental current lags the voltage by <span className="font-mono text-pink-300">α</span>, the utility generator must provide magnetizing reactive power: <span className="block font-mono text-rose-300 text-[10px] my-1">Q = Vs • Is1 • sin(α) = {powerQKvar} kVAr</span>. At α = 90°, real power P drops to 0, but the converter draws maximum reactive power from the AC grid!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
