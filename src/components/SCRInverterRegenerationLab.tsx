import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

interface SCRInverterRegenerationLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * SCRInverterRegenerationLab.tsx
 * 
 * Recommendation 8: Inverter Mode (alpha > 90°) & Safe Commutation Margin Angle
 * 
 * Demonstrates:
 *  - Rectifier mode (alpha < 90°, P > 0) vs. Inverter mode (alpha > 90°, P < 0, regeneration into AC grid).
 *  - The commutation margin triangle: beta = 180° - alpha, overlap mu, and extinction angle gamma = beta - mu.
 *  - Stability limit: gamma >= omega * tq + safety_margin (typically 15° - 20°).
 *  - Catastrophic Inverter Commutation Failure: when gamma < omega * tq, outgoing SCR fails to turn off,
 *    causing dead short-circuit across DC back-EMF, current explosion, and breaker trip!
 */
export const SCRInverterRegenerationLab: React.FC<SCRInverterRegenerationLabProps> = ({
  className = '',
  onClose,
}) => {
  // Converter Controls
  const [firingAlphaDeg, setFiringAlphaDeg] = useState<number>(145); // Firing angle 60° to 175°
  const [dcBackEmfEdc, setDcBackEmfEdc] = useState<number>(320); // V DC battery/motor back-EMF
  const [loadCurrentId, setLoadCurrentId] = useState<number>(30); // A
  const [commutationLcMh, setCommutationLcMh] = useState<number>(1.2); // mH
  const [thyristorTqUs, setThyristorTqUs] = useState<number>(45); // µs
  const [acGridVrms, setAcGridVrms] = useState<number>(230); // V RMS 50Hz
  const [gridSagActive, setGridSagActive] = useState<boolean>(false);

  // Animation and simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simDeg, setSimDeg] = useState<number>(0);
  const [breakerTripped, setBreakerTripped] = useState<boolean>(false);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Effective AC Grid RMS (with 25% sag when button pressed)
  const effectiveGridVrms = gridSagActive ? acGridVrms * 0.75 : acGridVrms;
  const frequencyHz = 50;
  const omega = 2 * Math.PI * frequencyHz;

  // Margin Angle beta = 180° - alpha
  const advanceAngleBetaDeg = useMemo(() => {
    return Math.max(0, 180 - firingAlphaDeg);
  }, [firingAlphaDeg]);

  // Overlap Angle mu:
  // cos(alpha + mu) = cos(alpha) - (2 * omega * Lc * Id) / (sqrt(2) * V_rms)
  const overlapMuDeg = useMemo(() => {
    const lcH = commutationLcMh * 1e-3;
    const numerator = 2 * omega * lcH * loadCurrentId;
    const denominator = Math.SQRT2 * effectiveGridVrms;
    const alphaRad = (firingAlphaDeg * Math.PI) / 180;
    const cosVal = Math.cos(alphaRad) - numerator / denominator;
    const clampedCos = Math.max(-1, Math.min(1, cosVal));
    const totalDeg = (Math.acos(clampedCos) * 180) / Math.PI;
    return Number(Math.max(0, totalDeg - firingAlphaDeg).toFixed(1));
  }, [firingAlphaDeg, commutationLcMh, loadCurrentId, effectiveGridVrms, omega]);

  // Extinction Angle gamma = beta - mu
  const extinctionAngleGammaDeg = useMemo(() => {
    return Number(Math.max(0, advanceAngleBetaDeg - overlapMuDeg).toFixed(1));
  }, [advanceAngleBetaDeg, overlapMuDeg]);

  // Minimum required turn-off angle: omega * tq
  const minRequiredGammaDeg = useMemo(() => {
    const rad = omega * (thyristorTqUs * 1e-6);
    const deg = (rad * 180) / Math.PI;
    return Number(deg.toFixed(2));
  }, [omega, thyristorTqUs]);

  // Safe margin threshold (omega * tq + 10° safety buffer)
  const safeMarginThresholdDeg = useMemo(() => {
    return Number((minRequiredGammaDeg + 10).toFixed(1));
  }, [minRequiredGammaDeg]);

  // Is Commutation Failure imminent or active?
  const isCommutationFailure = extinctionAngleGammaDeg < minRequiredGammaDeg;
  const isMarginal = !isCommutationFailure && extinctionAngleGammaDeg < safeMarginThresholdDeg;

  // Average Converter Terminal Voltage: Vdc = (2 * sqrt(2) / pi) * Vrms * cos(alpha) + (2 * omega * Lc / pi) * Id
  const avgConverterVdc = useMemo(() => {
    const ideal = ((2 * Math.SQRT2 * effectiveGridVrms) / Math.PI) * Math.cos((firingAlphaDeg * Math.PI) / 180);
    const drop = ((2 * omega * commutationLcMh * 1e-3) / Math.PI) * loadCurrentId;
    return Number((ideal + drop).toFixed(1));
  }, [effectiveGridVrms, firingAlphaDeg, omega, commutationLcMh, loadCurrentId]);

  // Power flow direction:
  // Inverter mode if alpha > 90°
  const isInverterMode = firingAlphaDeg > 90;
  const powerKw = useMemo(() => {
    const p = (avgConverterVdc * loadCurrentId) / 1000;
    return Number(p.toFixed(2));
  }, [avgConverterVdc, loadCurrentId]);

  // Handle breaker trip when commutation failure occurs
  useEffect(() => {
    if (isCommutationFailure) {
      setBreakerTripped(true);
    }
  }, [isCommutationFailure]);

  // Animation Loop
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setSimDeg((prev) => (prev + dtMs * 0.12) % 360);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Draw Dual Oscilloscope: Converter Output Voltage & SCR Reverse Voltage showing Gamma margin
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

    // Split Canvas:
    // Top Zone (0% to 54%): Converter DC Voltage vdc(t) + AC mains reference
    // Bottom Zone (56% to 100%): SCR Anode-to-Cathode Voltage vAK(t) showing Extinction Angle Gamma
    const topZeroY = height * 0.28;
    const bottomZeroY = height * 0.78;

    const xStart = 45;
    const xEnd = width - 20;
    const degToX = (deg: number) => xStart + ((deg % 360) / 360) * (xEnd - xStart);

    // Zero baselines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xStart, topZeroY);
    ctx.lineTo(xEnd, topZeroY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xStart, bottomZeroY);
    ctx.lineTo(xEnd, bottomZeroY);
    ctx.stroke();

    // Baseline labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 V', 14, topZeroY + 3);
    ctx.fillText('0 V', 14, bottomZeroY + 3);

    const vPeak = effectiveGridVrms * Math.SQRT2;
    const voltScale = 0.22;

    // Background AC reference curve
    ctx.strokeStyle = '#38bdf825';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const v = vPeak * Math.sin((deg * Math.PI) / 180);
      const py = topZeroY - v * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // DC Output Voltage vdc(t)
    ctx.beginPath();
    ctx.strokeStyle = isCommutationFailure ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2.5;

    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      let vdcInst = 0;

      if (isCommutationFailure && px > xStart + (xEnd - xStart) * 0.45) {
        // Catastrophic dead short across DC back-EMF!
        vdcInst = -dcBackEmfEdc * 0.05;
      } else {
        const phi = deg % 180;
        if (phi < firingAlphaDeg) {
          vdcInst = -vPeak * Math.abs(Math.sin(((phi + 180) * Math.PI) / 180));
        } else {
          vdcInst = vPeak * Math.sin((phi * Math.PI) / 180);
        }
      }

      const py = topZeroY - vdcInst * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // SCR 1 Voltage vAK1(t) on bottom half
    ctx.beginPath();
    ctx.strokeStyle = isCommutationFailure ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 2.5;

    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      let vak = 0;

      // SCR1 conducts from alpha to 180 + alpha
      const condStart = firingAlphaDeg;
      const condEnd = 180 + firingAlphaDeg + overlapMuDeg;

      if (deg >= condStart && deg < condEnd) {
        vak = 1.4; // ON drop
      } else if (deg >= condEnd && deg < 360) {
        // Reverse biased period (Extinction Angle gamma zone!)
        vak = vPeak * Math.sin((deg * Math.PI) / 180);
      } else {
        vak = vPeak * Math.sin((deg * Math.PI) / 180);
      }

      const py = bottomZeroY - vak * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Highlight the Extinction Angle Gamma Zone on bottom scope
    const xTurnOff = degToX(180 + firingAlphaDeg + overlapMuDeg);
    const xZeroCross = degToX(360);
    if (xTurnOff < xEnd) {
      ctx.fillStyle = isCommutationFailure ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.18)';
      ctx.fillRect(xTurnOff, bottomZeroY - 60, Math.max(4, xEnd - xTurnOff), 80);

      // Label Gamma
      ctx.strokeStyle = isCommutationFailure ? '#ef4444' : '#10b981';
      ctx.fillStyle = isCommutationFailure ? '#ef4444' : '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        `γ = ${extinctionAngleGammaDeg}° ${isCommutationFailure ? '(FAIL < ω•tq)' : '(SAFE)'}`,
        xTurnOff + 4,
        bottomZeroY - 45
      );
    }

    // Current Sim Cursor
    const cursorX = degToX(simDeg);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 15);
    ctx.lineTo(cursorX, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Failure / Safe Overlay Badge
    if (isCommutationFailure) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.beginPath();
      ctx.roundRect(width - 290, 50, 270, 75, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('💥 INVERTER COMMUTATION FAILURE!', width - 280, 72);
      ctx.font = '10px sans-serif';
      ctx.fillText(`Extinction γ (${extinctionAngleGammaDeg}°) < ω•tq (${minRequiredGammaDeg}°)!`, width - 280, 90);
      ctx.fillText('Thyristor failed to turn off → DC shoot-through!', width - 280, 106);
    } else if (isInverterMode) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 260, 50, 240, 58, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚡ REGENERATIVE INVERTER MODE', width - 250, 70);
      ctx.font = '10px sans-serif';
      ctx.fillText(`Power: ${powerKw} kW back into AC Grid`, width - 250, 88);
    }

    // Legend
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px sans-serif';
    ctx.fillText('― Converter DC Output Voltage vdc(t)', 50, 22);
    ctx.fillStyle = '#10b981';
    ctx.fillText('― Thyristor 1 Voltage vAK1(t) (Reverse Extinction Angle γ)', 460, 22);
  }, [
    simDeg,
    firingAlphaDeg,
    overlapMuDeg,
    extinctionAngleGammaDeg,
    minRequiredGammaDeg,
    effectiveGridVrms,
    dcBackEmfEdc,
    isCommutationFailure,
    isInverterMode,
    powerKw,
  ]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 bg-clip-text text-transparent">
                INVERTER MODE (α &gt; 90°) &amp; SAFE COMMUTATION MARGIN ANGLE
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-rose-900/60 text-rose-300 border border-rose-700/50">
                REC 8 • IEC 60146
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Regenerative braking into AC mains, advance angle <span className="text-amber-400 font-mono">β = 180° - α</span>, overlap <span className="text-pink-400 font-mono">µ</span>, extinction angle <span className="text-emerald-400 font-mono">γ = β - µ</span>, and catastrophic inverter commutation failure.
            </p>
          </div>
        </div>

        {/* Operating Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black shadow-lg transition-all ${
              isCommutationFailure
                ? 'bg-red-500/20 border-red-500/60 text-red-300 animate-pulse'
                : isInverterMode
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-sky-500/20 border-sky-500/50 text-sky-300'
            }`}
          >
            {isCommutationFailure ? (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>INVERTER COMMUTATION FAILURE (DEAD SHORT-CIRCUIT)</span>
              </>
            ) : isInverterMode ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>INVERTER MODE (FEEDING {Math.abs(powerKw)} kW TO GRID)</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-sky-400" />
                <span>RECTIFIER MODE (DRAWING {powerKw} kW FROM GRID)</span>
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

      {/* Main Grid: Controls + Dual CRT Scope + Margin Triangle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Controls (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-rose-400" />
                INVERTER FIRING &amp; MARGIN BENCH
              </span>
              <button
                onClick={() => {
                  setFiringAlphaDeg(145);
                  setDcBackEmfEdc(320);
                  setLoadCurrentId(30);
                  setCommutationLcMh(1.2);
                  setThyristorTqUs(45);
                  setGridSagActive(false);
                  setBreakerTripped(false);
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Firing Angle Alpha */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-bold">Firing Angle (α):</span>
                <span className="font-mono text-amber-300 font-extrabold">{firingAlphaDeg}°</span>
              </div>
              <input
                type="range"
                min="60"
                max="175"
                step="1"
                value={firingAlphaDeg}
                onChange={(e) => setFiringAlphaDeg(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0° Rectifier</span>
                <span>90° Boundary</span>
                <span>180° Theoretical Invert</span>
              </div>
            </div>

            {/* DC Load / Regeneration Current Id */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-bold">DC Braking / Load Current (Id):</span>
                <span className="font-mono text-sky-300 font-extrabold">{loadCurrentId} A</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="2"
                value={loadCurrentId}
                onChange={(e) => setLoadCurrentId(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Higher Id widens overlap angle µ, stealing margin γ</span>
            </div>

            {/* Commutation Inductance Lc */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-pink-400 font-bold">Commutation Inductance (Lc):</span>
                <span className="font-mono text-pink-300 font-extrabold">{commutationLcMh} mH</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={commutationLcMh}
                onChange={(e) => setCommutationLcMh(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            {/* Thyristor Turn-Off Time tq */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-purple-400 font-bold">Device Recovery Time (tq):</span>
                <span className="font-mono text-purple-300 font-extrabold">{thyristorTqUs} µs</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={thyristorTqUs}
                onChange={(e) => setThyristorTqUs(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Requires minimum γ ≥ ω•tq ({minRequiredGammaDeg}°)
              </span>
            </div>

            {/* DC Back-EMF Voltage */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">DC Motor Back-EMF / Battery (Edc):</span>
                <span className="font-mono text-rose-400 font-bold">{dcBackEmfEdc} V</span>
              </div>
              <input
                type="range"
                min="100"
                max="450"
                step="10"
                value={dcBackEmfEdc}
                onChange={(e) => setDcBackEmfEdc(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Grid Sag Fault Trigger & Quick Presets */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-black text-slate-400 tracking-wider">FAULT INJECTION TESTS</span>
            <button
              onClick={() => setGridSagActive(!gridSagActive)}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                gridSagActive
                  ? 'bg-red-600 text-white border-red-400 animate-pulse'
                  : 'bg-[#161f30] hover:bg-[#1e2a40] text-amber-300 border-amber-500/30'
              }`}
            >
              <span>⚡ INJECT 25% GRID VOLTAGE SAG</span>
              <span className="font-mono text-[10px] uppercase">
                {gridSagActive ? 'ACTIVE (-25%)' : 'OFF (NORMAL)'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setFiringAlphaDeg(168);
                  setLoadCurrentId(45);
                  setCommutationLcMh(1.8);
                }}
                className="px-2 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-[11px] font-bold hover:bg-red-900/50 transition-all text-left cursor-pointer"
              >
                💥 Trigger Commutation Failure
              </button>
              <button
                onClick={() => {
                  setFiringAlphaDeg(135);
                  setLoadCurrentId(25);
                  setCommutationLcMh(0.8);
                  setGridSagActive(false);
                }}
                className="px-2 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900/50 transition-all text-left cursor-pointer"
              >
                🛡️ Robust Inverter Setting (γ 35°)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: CRT Scope + Margin Angle Triangle (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Oscilloscope Viewport */}
          <div className="relative bg-[#0a0d14] border border-[#1e293b] rounded-xl p-2 shadow-2xl overflow-hidden">
            <canvas
              ref={scopeCanvasRef}
              width={820}
              height={360}
              className="w-full h-auto block rounded-lg"
            />
          </div>

          {/* Commutation Margin Angle Triangle Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0f1420] border border-amber-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-400">Advance Angle (β)</span>
              <span className="text-base font-black font-mono text-amber-300">{advanceAngleBetaDeg}°</span>
              <span className="text-[10px] text-slate-400">β = 180° - α</span>
            </div>

            <div className="bg-[#0f1420] border border-pink-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-pink-400">Overlap Angle (µ)</span>
              <span className="text-base font-black font-mono text-pink-300">{overlapMuDeg}°</span>
              <span className="text-[10px] text-slate-400">Current transfer duration</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border flex flex-col transition-all ${
                isCommutationFailure
                  ? 'bg-red-950/50 border-red-600 text-red-300'
                  : 'bg-[#0f1420] border-emerald-900/30 text-emerald-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold">Extinction Margin (γ)</span>
              <span className="text-base font-black font-mono">{extinctionAngleGammaDeg}°</span>
              <span className="text-[10px] text-slate-400">γ = β - µ (Must &gt; ω•tq)</span>
            </div>

            <div className="bg-[#0f1420] border border-purple-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-purple-400">Min Required (ω•tq)</span>
              <span className="text-base font-black font-mono text-purple-300">{minRequiredGammaDeg}°</span>
              <span className="text-[10px] text-slate-400">Physical recovery limit</span>
            </div>
          </div>

          {/* Deep Inverter Commutation Failure Explanation Panel */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-400" />
                HOW CATASTROPHIC INVERTER COMMUTATION FAILURE OCCURS (PHYSICAL BREAKDOWN)
              </span>
              <span className="text-[11px] font-mono text-amber-300">
                α_max = 180° - µ - ω•tq - γ_margin
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">1. The Role of Margin Angle γ</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In line-commutated inverter mode (<span className="text-amber-300 font-mono">α &gt; 90°</span>), reverse AC line voltage must be held across the outgoing thyristor for at least its turn-off time <span className="text-purple-300 font-mono">tq</span>. This available reverse-bias angle is <strong className="text-emerald-400">γ = β - µ</strong>.
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-rose-400 mb-1">2. Triggers for Failure</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  If <strong className="text-slate-200">load current spikes</strong> or an <strong className="text-slate-200">AC grid voltage sag</strong> occurs, the overlap angle <span className="text-pink-400 font-mono">µ</span> balloons. This eats away at <span className="text-emerald-400 font-mono">γ</span> until <span className="text-rose-400 font-mono">γ &lt; ω•tq</span>.
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-red-400 mb-1">3. The Dead Short-Circuit</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When line voltage swings positive, the outgoing SCR is still flooded with charge carriers. It immediately resumes forward conduction along with the incoming SCR, placing a <strong className="text-red-400">dead short-circuit across the DC back-EMF source</strong>!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
