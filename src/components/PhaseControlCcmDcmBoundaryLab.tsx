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
  Layers,
  Compass
} from 'lucide-react';

interface PhaseControlCcmDcmBoundaryLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlCcmDcmBoundaryLab.tsx
 * 
 * Recommendation 1: Dynamic Continuous vs. Discontinuous Conduction (CCM/DCM) Boundary Explorer
 * 
 * Features:
 *  - Full time-domain analytical differential equation solver for R-L-E load.
 *  - Real-time numerical root-finding algorithm computing extinction angle beta (io(beta) = 0).
 *  - Precise visual distinction between CCM (beta >= pi + alpha) and DCM (beta < pi + alpha).
 *  - Visualizes the voltage pedestal vo(t) = E during the DCM zero-current dead zone.
 *  - 2D Boundary Map (alpha vs L) showing operating point trajectory across the CCM/DCM boundary.
 *  - Synchronized CRT Oscilloscope: vin(t), vo(t) with E pedestal, and io(t).
 */
export const PhaseControlCcmDcmBoundaryLab: React.FC<PhaseControlCcmDcmBoundaryLabProps> = ({
  className = '',
  onClose,
}) => {
  // Circuit Parameters
  const [vSupplyRms, setVSupplyRms] = useState<number>(230); // V RMS 50Hz
  const [firingAlphaDeg, setFiringAlphaDeg] = useState<number>(45); // alpha: 10° to 150°
  const [loadResistance, setLoadResistance] = useState<number>(15); // Ohms
  const [loadInductanceMh, setLoadInductanceMh] = useState<number>(25); // mH
  const [backEmfE, setBackEmfE] = useState<number>(40); // Back-EMF in Volts

  // Animation and View Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTimeDeg, setSimTimeDeg] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Electrical Physical Calculations
  const frequencyHz = 50;
  const omega = 2 * Math.PI * frequencyHz;
  const vPeak = vSupplyRms * Math.SQRT2;

  const alphaRad = (firingAlphaDeg * Math.PI) / 180;
  const loadInductanceH = loadInductanceMh * 1e-3;
  const omegaL = omega * loadInductanceH;
  const loadZ = Math.sqrt(loadResistance * loadResistance + omegaL * omegaL);
  const loadPhiRad = Math.atan2(omegaL, loadResistance);
  const loadPhiDeg = (loadPhiRad * 180) / Math.PI;

  // Numerical calculation of extinction angle beta
  // io(theta) = (Vm/Z)*sin(theta - phi) - (E/R) + [ (E/R) - (Vm/Z)*sin(alpha - phi) ] * exp( -(R/omegaL)*(theta - alpha) )
  const calculateCurrent = (thetaRad: number, aRad: number) => {
    if (thetaRad < aRad) return 0;
    const delta = thetaRad - aRad;
    const steadyAc = (vPeak / loadZ) * Math.sin(thetaRad - loadPhiRad);
    const steadyDc = backEmfE / loadResistance;
    const initialA = (backEmfE / loadResistance) - (vPeak / loadZ) * Math.sin(aRad - loadPhiRad);
    const damping = Math.exp(-(loadResistance / Math.max(1e-5, omegaL)) * delta);
    return steadyAc - steadyDc + initialA * damping;
  };

  // Find extinction angle beta by root bisection
  const extinctionBetaDeg = useMemo(() => {
    let low = alphaRad + 0.001;
    let high = alphaRad + Math.PI * 1.5;

    // Check if current ever goes positive
    const initialCurrent = calculateCurrent(low + 0.05, alphaRad);
    if (initialCurrent <= 0) {
      return Number(firingAlphaDeg.toFixed(1));
    }

    // Step forward to find zero-crossing
    let rootFound = false;
    let betaGuess = low;
    const step = 0.005;

    for (let theta = low + step; theta <= high; theta += step) {
      const iVal = calculateCurrent(theta, alphaRad);
      if (iVal <= 0) {
        betaGuess = theta;
        rootFound = true;
        break;
      }
    }

    if (!rootFound) {
      // Current never reaches zero before next pulse -> CCM!
      betaGuess = alphaRad + Math.PI;
    }

    const betaDeg = (betaGuess * 180) / Math.PI;
    return Number(betaDeg.toFixed(1));
  }, [alphaRad, firingAlphaDeg, vPeak, loadZ, loadPhiRad, backEmfE, loadResistance, omegaL]);

  // Is Continuous Conduction Mode (CCM) or Discontinuous (DCM)?
  const isCcm = extinctionBetaDeg >= firingAlphaDeg + 180;
  const conductionAngleGammaDeg = Number((extinctionBetaDeg - firingAlphaDeg).toFixed(1));
  const deadZoneAngleDeg = Number(Math.max(0, 180 - conductionAngleGammaDeg).toFixed(1));

  // Average Output Voltage:
  // In CCM: Vdc = (2*Vm/pi) * cos(alpha)
  // In DCM: Vdc = (Vm/pi)*(cos(alpha) - cos(beta)) + (E/pi)*(pi + alpha - beta)
  const averageVdc = useMemo(() => {
    if (isCcm) {
      const v = ((2 * vPeak) / Math.PI) * Math.cos(alphaRad);
      return Number(v.toFixed(1));
    } else {
      const betaRad = (extinctionBetaDeg * Math.PI) / 180;
      const vAc = (vPeak / Math.PI) * (Math.cos(alphaRad) - Math.cos(betaRad));
      const vPedestal = (backEmfE / Math.PI) * (Math.PI + alphaRad - betaRad);
      return Number((vAc + vPedestal).toFixed(1));
    }
  }, [isCcm, vPeak, alphaRad, extinctionBetaDeg, backEmfE]);

  // Ideal CCM textbook voltage (for showing discrepancy in DCM)
  const textbookCcmVdc = useMemo(() => {
    return Number((((2 * vPeak) / Math.PI) * Math.cos(alphaRad)).toFixed(1));
  }, [vPeak, alphaRad]);

  // Average Load Current Id = (Vdc - E) / R
  const averageId = useMemo(() => {
    const i = Math.max(0, (averageVdc - backEmfE) / loadResistance);
    return Number(i.toFixed(2));
  }, [averageVdc, backEmfE, loadResistance]);

  // Animation Loop (0 to 360 deg)
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setSimTimeDeg((prev) => (prev + dtMs * 0.1 * playbackSpeed) % 360);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Draw Synchronized Dual Oscilloscope (Voltage with E pedestal + Current with zero zone)
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
    // Top Zone (0% to 54%): Voltages (Input AC vin(t) + Output vo(t) with E pedestal)
    // Bottom Zone (58% to 100%): Output Load Current io(t)
    const voltZeroY = height * 0.32;
    const currZeroY = height * 0.85;

    const xStart = 50;
    const xEnd = width - 20;
    const degToX = (deg: number) => xStart + ((deg % 360) / 360) * (xEnd - xStart);

    // Zero Baselines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xStart, voltZeroY);
    ctx.lineTo(xEnd, voltZeroY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xStart, currZeroY);
    ctx.lineTo(xEnd, currZeroY);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 V', 14, voltZeroY + 3);
    ctx.fillText('0 A', 14, currZeroY + 3);

    // 60° ticks
    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748b';
    for (let d = 0; d <= 360; d += 60) {
      const tx = degToX(d);
      ctx.fillText(`${d}°`, tx - 8, height - 4);
    }

    const voltScale = 0.22;
    const currScale = 14.0; // px per Amp

    // Background AC Input Curve vin(t)
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf825';
    ctx.lineWidth = 1.5;
    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const v = vPeak * Math.sin((deg * Math.PI) / 180);
      const py = voltZeroY - v * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw Back-EMF Level E reference dashed line
    const eLineY = voltZeroY - backEmfE * voltScale;
    ctx.strokeStyle = '#fbbf2450';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xStart, eLineY);
    ctx.lineTo(xEnd, eLineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '9px monospace';
    ctx.fillText(`Back-EMF E = ${backEmfE} V`, xStart + 10, eLineY - 4);

    // Calculate instantaneous vo(theta) and io(theta) across 0..360°
    const getVoAndIo = (deg: number) => {
      // Full-wave: two half-cycles (0 to 180, and 180 to 360)
      const halfCycleDeg = deg % 180;
      const rad = (halfCycleDeg * Math.PI) / 180;
      const vAcInst = vPeak * Math.sin(rad);

      let vo = 0;
      let io = 0;

      const alphaD = firingAlphaDeg;
      const betaD = extinctionBetaDeg % 180 || 180;

      if (isCcm) {
        // Continuous: always conducting
        vo = vAcInst;
        // In CCM, current flows continuously
        const iVal = calculateCurrent(rad, alphaRad);
        io = Math.max(0.2, iVal + averageId * 0.8);
      } else {
        // Discontinuous:
        if (halfCycleDeg >= alphaD && halfCycleDeg < betaD) {
          // SCRs conducting: vo = vac, io > 0
          vo = vAcInst;
          io = Math.max(0, calculateCurrent(rad, alphaRad));
        } else {
          // SCRs OFF: current is zero, voltage floats at Back-EMF E!
          vo = backEmfE;
          io = 0;
        }
      }

      return { vo, io };
    };

    // --- CURVE 1: Output Voltage vo(t) (Glowing Amber / Emerald) ---
    ctx.beginPath();
    ctx.strokeStyle = isCcm ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 2.6;

    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const { vo } = getVoAndIo(deg);
      const py = voltZeroY - vo * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Shading the DCM Dead Zone (between beta and 180 + alpha)
    if (!isCcm) {
      const xBeta1 = degToX(extinctionBetaDeg % 180);
      const xAlphaNext1 = degToX(180 + firingAlphaDeg);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      if (xBeta1 < degToX(180)) {
        ctx.fillRect(xBeta1, voltZeroY - 80, Math.max(2, degToX(180) - xBeta1), 100);
      }
    }

    // --- CURVE 2: Load Current io(t) (Sky Blue) ---
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const { io } = getVoAndIo(deg);
      const py = currZeroY - io * currScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw Event Markers: Alpha (Firing) and Beta (Extinction)
    const xAlpha = degToX(firingAlphaDeg);
    const xBeta = degToX(extinctionBetaDeg % 180);

    // Alpha marker
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(xAlpha, 15);
    ctx.lineTo(xAlpha, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`α = ${firingAlphaDeg}°`, xAlpha + 3, 30);

    // Beta marker
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(xBeta, 15);
    ctx.lineTo(xBeta, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`β = ${extinctionBetaDeg}°`, xBeta + 3, 44);

    // Conduction angle gamma bar
    if (xBeta > xAlpha) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xAlpha, voltZeroY - 45);
      ctx.lineTo(xBeta, voltZeroY - 45);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`γ = ${conductionAngleGammaDeg}°`, (xAlpha + xBeta) / 2 - 20, voltZeroY - 50);
    }

    // Cursor
    const cursorX = degToX(simTimeDeg);
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

    // Status Overlay Badge inside Canvas
    if (isCcm) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 250, 48, 230, 56, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✅ CONTINUOUS CONDUCTION (CCM)', width - 240, 68);
      ctx.font = '10px sans-serif';
      ctx.fillText(`β (${extinctionBetaDeg}°) ≥ π + α (${firingAlphaDeg + 180}°)`, width - 240, 84);
      ctx.fillText(`Standard formula Vdc = (2Vm/π)cosα holds`, width - 240, 98);
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.92)';
      ctx.beginPath();
      ctx.roundRect(width - 280, 48, 260, 68, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚠️ DISCONTINUOUS CONDUCTION (DCM)', width - 270, 68);
      ctx.font = '10px sans-serif';
      ctx.fillText(`β (${extinctionBetaDeg}°) < π + α (${firingAlphaDeg + 180}°)`, width - 270, 84);
      ctx.fillText(`Dead zone: ${deadZoneAngleDeg}° • Terminal floats at E!`, width - 270, 98);
      ctx.fillText(`Standard formula fails! True Vdc = ${averageVdc}V`, width - 270, 110);
    }

    // Legend
    ctx.fillStyle = isCcm ? '#10b981' : '#f59e0b';
    ctx.font = '11px sans-serif';
    ctx.fillText('― Converter Output Voltage vo(ωt) [Shows E Pedestal in DCM]', 50, 22);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('― Load Current io(ωt) [R-L-E Transient]', 520, 22);
  }, [
    simTimeDeg,
    firingAlphaDeg,
    extinctionBetaDeg,
    conductionAngleGammaDeg,
    deadZoneAngleDeg,
    isCcm,
    vPeak,
    backEmfE,
    averageVdc,
    averageId,
    loadResistance,
    loadZ,
    loadPhiRad,
    alphaRad,
  ]);

  // Draw 2D Operating Boundary Map (alpha vs L)
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Axes: X = Firing Angle (0 to 120°), Y = Inductance (0 to 100 mH)
    const pad = 35;
    const plotW = width - pad - 15;
    const plotH = height - pad - 15;

    // Draw boundary line: L_crit(alpha)
    // For R-L-E, critical L increases as alpha increases
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // DCM zone (lower L)
    ctx.fillRect(pad, 15, plotW, plotH);

    // Draw CCM upper region
    ctx.beginPath();
    ctx.moveTo(pad, 15);

    for (let a = 0; a <= 120; a += 2) {
      // Approximation of critical inductance Lcrit(alpha)
      // Lcrit increases with alpha and with R
      const normalizedAlpha = (a * Math.PI) / 180;
      const lCritMh = Math.min(100, (loadResistance * 0.8) * Math.tan(Math.max(0.1, normalizedAlpha * 0.75)) * 10);
      const px = pad + (a / 120) * plotW;
      const py = 15 + plotH - (lCritMh / 100) * plotH;
      if (a === 0) ctx.lineTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineTo(pad + plotW, 15);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // CCM zone
    ctx.fill();

    // Boundary Curve Line
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    for (let a = 0; a <= 120; a += 2) {
      const normalizedAlpha = (a * Math.PI) / 180;
      const lCritMh = Math.min(100, (loadResistance * 0.8) * Math.tan(Math.max(0.1, normalizedAlpha * 0.75)) * 10);
      const px = pad + (a / 120) * plotW;
      const py = 15 + plotH - (lCritMh / 100) * plotH;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Axis lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, 15);
    ctx.lineTo(pad, 15 + plotH);
    ctx.lineTo(pad + plotW, 15 + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText('0°', pad - 4, 15 + plotH + 12);
    ctx.fillText('60°', pad + plotW * 0.5 - 8, 15 + plotH + 12);
    ctx.fillText('120° (α)', pad + plotW - 25, 15 + plotH + 12);

    ctx.fillText('100mH', 4, 22);
    ctx.fillText('50mH', 8, 15 + plotH * 0.5);
    ctx.fillText('0', 20, 15 + plotH + 2);

    // Zone text labels
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CCM ZONE (Continuous)', pad + 15, 35);

    ctx.fillStyle = '#ef4444';
    ctx.fillText('DCM ZONE (Discontinuous)', pad + plotW - 145, 15 + plotH - 12);

    // Current Operating Point Marker
    const curX = pad + (Math.min(120, firingAlphaDeg) / 120) * plotW;
    const curY = 15 + plotH - (Math.min(100, loadInductanceMh) / 100) * plotH;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isCcm ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`(${firingAlphaDeg}°, ${loadInductanceMh}mH)`, curX + 8, curY - 4);
  }, [firingAlphaDeg, loadInductanceMh, loadResistance, isCcm]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">
                DYNAMIC CCM vs. DCM BOUNDARY EXPLORER &amp; EXTINCTION ANGLE (β) TRACER
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                REC 1 • PHASE CONTROL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Analytical <span className="text-pink-400 font-mono">R-L-E</span> load solver, numerical extinction root <span className="text-amber-400 font-mono">β</span>, dead-zone floating pedestal <span className="text-emerald-400 font-mono">vo = E</span>, and the standard formula breakdown.
            </p>
          </div>
        </div>

        {/* Live Conduction Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black shadow-lg transition-all ${
              isCcm
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-red-500/20 border-red-500/60 text-red-300 animate-pulse'
            }`}
          >
            {isCcm ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CONTINUOUS CONDUCTION (CCM) • β ≥ π + α</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>DISCONTINUOUS CONDUCTION (DCM) • DEAD ZONE {deadZoneAngleDeg}°</span>
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

      {/* Main Grid: Controls + Dual CRT Scope + 2D Operating Boundary Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Presets (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                CONVERTER &amp; LOAD PARAMETERS
              </span>
              <button
                onClick={() => {
                  setFiringAlphaDeg(45);
                  setLoadResistance(15);
                  setLoadInductanceMh(25);
                  setBackEmfE(40);
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
                min="10"
                max="140"
                step="1"
                value={firingAlphaDeg}
                onChange={(e) => setFiringAlphaDeg(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            {/* Load Inductance L */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-bold">Load Inductance (L):</span>
                <span className="font-mono text-amber-300 font-extrabold">{loadInductanceMh} mH</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={loadInductanceMh}
                onChange={(e) => setLoadInductanceMh(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Higher L stores more magnetic energy, pushing circuit into CCM</span>
            </div>

            {/* Load Resistance R */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-bold">Load Resistance (R):</span>
                <span className="font-mono text-sky-300 font-extrabold">{loadResistance} Ω</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={loadResistance}
                onChange={(e) => setLoadResistance(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Back-EMF Voltage E */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-rose-400 font-bold">DC Back-EMF / Battery (E):</span>
                <span className="font-mono text-rose-300 font-extrabold">{backEmfE} V</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={backEmfE}
                onChange={(e) => setBackEmfE(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Voltage pedestal during zero-current interval</span>
            </div>
          </div>

          {/* Quick Teaching Presets */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-black text-slate-400 tracking-wider">TEACHING PRESETS</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setFiringAlphaDeg(60);
                  setLoadInductanceMh(8);
                  setLoadResistance(25);
                  setBackEmfE(50);
                }}
                className="px-2 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-[11px] font-bold hover:bg-red-900/50 transition-all text-left cursor-pointer"
              >
                ⚡ Deep Discontinuous (DCM)
              </button>
              <button
                onClick={() => {
                  setFiringAlphaDeg(40);
                  setLoadInductanceMh(65);
                  setLoadResistance(10);
                  setBackEmfE(20);
                }}
                className="px-2 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900/50 transition-all text-left cursor-pointer"
              >
                🛡️ Heavy Inductive (CCM)
              </button>
              <button
                onClick={() => {
                  setFiringAlphaDeg(50);
                  setLoadInductanceMh(22);
                  setLoadResistance(15);
                  setBackEmfE(30);
                }}
                className="px-2 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] font-bold hover:bg-amber-900/50 transition-all text-left cursor-pointer"
              >
                ⚖️ Critical Boundary Point
              </button>
              <button
                onClick={() => {
                  setFiringAlphaDeg(85);
                  setLoadInductanceMh(15);
                  setLoadResistance(20);
                  setBackEmfE(75);
                }}
                className="px-2 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[11px] font-bold hover:bg-purple-900/50 transition-all text-left cursor-pointer"
              >
                🚗 High Back-EMF Motor Idle
              </button>
            </div>
          </div>

          {/* 2D Operating Boundary Map */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-pink-400" />
              2D BOUNDARY MAP (α vs. L)
            </span>
            <div className="w-full h-36 bg-[#0a0d14] rounded-lg overflow-hidden border border-slate-800">
              <canvas
                ref={mapCanvasRef}
                width={360}
                height={140}
                className="w-full h-full block"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Dual CRT Scope + Mathematical Breakdown (8 cols) */}
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
                onClick={() => setSimTimeDeg(0)}
                className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded text-xs font-mono cursor-pointer"
              >
                RE-TRIGGER
              </button>
              <div className="text-xs font-mono text-pink-400">
                ωt = <span className="font-bold">{simTimeDeg.toFixed(0)}°</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Speed:</span>
              {[0.5, 1.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    playbackSpeed === spd ? 'bg-purple-600 text-white font-bold' : 'bg-[#161f30] text-slate-400'
                  }`}
                >
                  {spd}x
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

          {/* Critical Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0f1420] border border-pink-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-pink-400">Firing Angle (α)</span>
              <span className="text-base font-black font-mono text-pink-300">{firingAlphaDeg}°</span>
              <span className="text-[10px] text-slate-400">Conduction trigger</span>
            </div>

            <div className="bg-[#0f1420] border border-amber-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-400">Extinction Angle (β)</span>
              <span className="text-base font-black font-mono text-amber-300">{extinctionBetaDeg}°</span>
              <span className="text-[10px] text-slate-400">Where current hits 0</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border flex flex-col transition-all ${
                isCcm
                  ? 'bg-[#0f1420] border-emerald-900/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-600 text-red-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold">Conduction Angle (γ)</span>
              <span className="text-base font-black font-mono">{conductionAngleGammaDeg}°</span>
              <span className="text-[10px] text-slate-400">γ = β - α</span>
            </div>

            <div className="bg-[#0f1420] border border-sky-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-400">True Average Vdc</span>
              <span className="text-base font-black font-mono text-white">{averageVdc} V</span>
              <span className="text-[10px] text-slate-400">
                {isCcm ? 'Matches textbook' : `Formula err: ${textbookCcmVdc}V`}
              </span>
            </div>
          </div>

          {/* Deep Pedagogical Breakdown: Why Textbook Formula Fails in DCM */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-400" />
                THE PEDAGOGICAL BREAKDOWN: WHY Vdc = (2Vm/π)cos(α) FAILS IN DCM
              </span>
              <span className="text-[11px] font-mono text-amber-300">
                Condition for CCM: β ≥ π + α ({firingAlphaDeg + 180}°)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-pink-400 mb-1">1. The Analytical Current Equation</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When SCRs fire at <span className="text-pink-300 font-mono">α</span>, current evolves as:
                  <span className="block font-mono text-emerald-400 text-[10px] my-1">
                    i(θ) = (Vm/Z)sin(θ-φ) - E/R + Ae^-Rθ/ωL
                  </span>
                  Current reaches zero at the extinction angle <strong className="text-amber-400 font-mono">β = {extinctionBetaDeg}°</strong>.
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">2. The Floating Voltage Pedestal</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In DCM (<span className="text-amber-300 font-mono">β &lt; π + α</span>), during the dead interval from <span className="font-mono text-amber-300">β</span> to <span className="font-mono text-pink-300">π + α</span>, all thyristors turn OFF. The output voltage does <strong className="text-white">NOT</strong> follow the AC sine wave; it floats strictly at the <strong className="text-rose-400">DC back-EMF E ({backEmfE}V)</strong>!
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1">3. The Mathematical Correction</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The textbook formula assumes conduction spans 180°. In DCM, the true average voltage integrates both the AC arc and the DC pedestal:
                  <span className="block font-mono text-white text-[10px] my-1">
                    Vdc = (Vm/π)(cosα - cosβ) + (E/π)(π + α - β)
                  </span>
                  Here, actual Vdc is <strong className="text-emerald-400">{averageVdc}V</strong> instead of the false textbook value <span className="line-through text-slate-500">{textbookCcmVdc}V</span>!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
