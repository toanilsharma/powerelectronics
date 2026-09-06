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
  Layers
} from 'lucide-react';

interface SCRSixPulseBridgeExplorerLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * SCRSixPulseBridgeExplorerLab.tsx
 * 
 * Recommendation 7: 3-Phase 6-Pulse Graetz Bridge Full Conduction Topology Explorer
 * 
 * Demonstrates:
 *  - Interactive 360° phase wheel dial scrubbing through all 6 conduction intervals.
 *  - Real-time animated bridge schematic highlighting active thyristor pairs (T1-T6).
 *  - Source inductance Ls effect causing commutation overlap angle µ.
 *  - 3-thyristor simultaneous conduction during commutation overlap with line-to-line circulating current.
 *  - Commutation voltage notch on DC bus vdc = (va + vb)/2 and average DC drop ΔVdc = (3*ω*Ls/π)*Id.
 *  - Synchronized multi-channel CRT oscilloscope: 3-phase line voltages, output vdc(t), and line current ia(t).
 */
export const SCRSixPulseBridgeExplorerLab: React.FC<SCRSixPulseBridgeExplorerLabProps> = ({
  className = '',
  onClose,
}) => {
  // Converter settings
  const [vLineRms, setVLineRms] = useState<number>(400); // V LL RMS
  const [firingAlphaDeg, setFiringAlphaDeg] = useState<number>(30); // Firing angle 0-150°
  const [sourceLsMh, setSourceLsMh] = useState<number>(0.8); // Source inductance Ls in mH
  const [loadCurrentId, setLoadCurrentId] = useState<number>(35); // DC Load current Id in A
  const [frequencyHz] = useState<number>(50); // 50 Hz utility

  // Animation and scrubbed phase angle
  const [omegaTDeg, setOmegaTDeg] = useState<number>(45); // 0 to 360 deg
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Derived electrical parameters
  const omega = 2 * Math.PI * frequencyHz;
  const vPeakLL = vLineRms * Math.SQRT2;
  const vPeakPhase = (vLineRms / Math.sqrt(3)) * Math.SQRT2;

  // Commutation Overlap Angle mu:
  // cos(alpha + mu) = cos(alpha) - (2 * omega * Ls * Id) / (sqrt(6) * V_LL_rms)
  const overlapMuDeg = useMemo(() => {
    const lsHenries = sourceLsMh * 1e-3;
    const numerator = 2 * omega * lsHenries * loadCurrentId;
    const denominator = Math.sqrt(6) * vLineRms;
    const cosTerm = Math.cos((firingAlphaDeg * Math.PI) / 180) - numerator / denominator;
    const clampedCos = Math.max(-1, Math.min(1, cosTerm));
    const totalAngleDeg = (Math.acos(clampedCos) * 180) / Math.PI;
    const mu = Math.max(0, totalAngleDeg - firingAlphaDeg);
    return Number(mu.toFixed(1));
  }, [sourceLsMh, loadCurrentId, firingAlphaDeg, omega, vLineRms]);

  // Average DC Voltage Drop due to overlap: Delta Vdc = (3 * omega * Ls / pi) * Id
  const deltaVdc = useMemo(() => {
    const lsHenries = sourceLsMh * 1e-3;
    return Number(((3 * omega * lsHenries * loadCurrentId) / Math.PI).toFixed(1));
  }, [sourceLsMh, loadCurrentId, omega]);

  // Ideal Vdc without overlap: Vdc0 = (3 * sqrt(2) / pi) * V_LL * cos(alpha)
  const vdcIdeal = useMemo(() => {
    return Number(((3 * Math.SQRT2 * vLineRms * Math.cos((firingAlphaDeg * Math.PI) / 180)) / Math.PI).toFixed(1));
  }, [vLineRms, firingAlphaDeg]);

  // Actual Average Vdc:
  const vdcActual = useMemo(() => {
    return Number((vdcIdeal - deltaVdc).toFixed(1));
  }, [vdcIdeal, deltaVdc]);

  // Determine conducting thyristors at current omegaTDeg
  // 6 pulses: natural commutation points are 30°, 90°, 150°, 210°, 270°, 330°
  // Firing points: theta_n = natural_n + alpha
  const firingPoints = useMemo(() => {
    return [
      { id: 1, name: 'T1', natural: 30, fire: (30 + firingAlphaDeg) % 360 },
      { id: 2, name: 'T2', natural: 90, fire: (90 + firingAlphaDeg) % 360 },
      { id: 3, name: 'T3', natural: 150, fire: (150 + firingAlphaDeg) % 360 },
      { id: 4, name: 'T4', natural: 210, fire: (210 + firingAlphaDeg) % 360 },
      { id: 5, name: 'T5', natural: 270, fire: (270 + firingAlphaDeg) % 360 },
      { id: 6, name: 'T6', natural: 330, fire: (330 + firingAlphaDeg) % 360 },
    ];
  }, [firingAlphaDeg]);

  // Conduction state of T1 through T6
  const activeDevices = useMemo(() => {
    // Normalise angle to 0..360
    const phi = (omegaTDeg % 360 + 360) % 360;
    const a = firingAlphaDeg;
    const mu = overlapMuDeg;

    // Conduction intervals:
    // Base 60° sectors:
    // T1 conducts from (30+a) to (150+a+mu)
    // T2 conducts from (90+a) to (210+a+mu)
    // T3 conducts from (150+a) to (270+a+mu)
    // T4 conducts from (210+a) to (330+a+mu)
    // T5 conducts from (270+a) to (390+a+mu) -> (30+a+mu)
    // T6 conducts from (330+a) to (450+a+mu) -> (90+a+mu)

    const isInside = (val: number, start: number, duration: number) => {
      const s = (start % 360 + 360) % 360;
      const d = duration;
      const end = s + d;
      if (end < 360) {
        return val >= s && val < end;
      } else {
        return val >= s || val < (end % 360);
      }
    };

    const conductionDuration = 120 + mu;

    const t1 = isInside(phi, 30 + a, conductionDuration);
    const t2 = isInside(phi, 90 + a, conductionDuration);
    const t3 = isInside(phi, 150 + a, conductionDuration);
    const t4 = isInside(phi, 210 + a, conductionDuration);
    const t5 = isInside(phi, 270 + a, conductionDuration);
    const t6 = isInside(phi, 330 + a, conductionDuration);

    const activeList: number[] = [];
    if (t1) activeList.push(1);
    if (t2) activeList.push(2);
    if (t3) activeList.push(3);
    if (t4) activeList.push(4);
    if (t5) activeList.push(5);
    if (t6) activeList.push(6);

    const isOverlapNow = activeList.length >= 3;

    return {
      t1, t2, t3, t4, t5, t6,
      activeList,
      isOverlapNow,
    };
  }, [omegaTDeg, firingAlphaDeg, overlapMuDeg]);

  // Animation Loop for phase angle scrubbing
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setOmegaTDeg((prev) => {
          const inc = (dtMs * 0.08 * playbackSpeed);
          return (prev + inc) % 360;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Draw 3-Phase CRT Scope (Line voltages, Instantaneous Vdc with notches, Line Current ia)
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

    const numXDivs = 12; // 30° per division across 360°
    for (let i = 0; i <= numXDivs; i++) {
      const x = (i / numXDivs) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const numYDivs = 6;
    for (let i = 0; i <= numYDivs; i++) {
      const y = (i / numYDivs) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Split Canvas:
    // Top Zone (0% to 58%): Voltages (Line voltages background + Glowing output Vdc)
    // Bottom Zone (62% to 100%): AC Line Current ia(t)
    const voltZeroY = height * 0.35;
    const currZeroY = height * 0.82;

    const xStart = 45;
    const xEnd = width - 20;
    const degToX = (deg: number) => xStart + ((deg % 360) / 360) * (xEnd - xStart);

    // Zero baselines
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

    // Baseline labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 V', 12, voltZeroY + 3);
    ctx.fillText('0 A', 12, currZeroY + 3);

    // Degree axis ticks
    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748b';
    for (let deg = 0; deg <= 360; deg += 60) {
      const tx = degToX(deg);
      ctx.fillText(`${deg}°`, tx - 8, height - 4);
    }

    const voltScale = 0.16;
    const currScale = 0.7;

    // Helper: 3-phase line voltages
    const getVLL = (deg: number) => {
      const rad = (deg * Math.PI) / 180;
      const vab = vPeakLL * Math.sin(rad);
      const vbc = vPeakLL * Math.sin(rad - (2 * Math.PI) / 3);
      const vca = vPeakLL * Math.sin(rad + (2 * Math.PI) / 3);
      return { vab, vbc, vca, vba: -vab, vcb: -vbc, vac: -vca };
    };

    // Draw background 3-phase envelopes
    ctx.lineWidth = 1;
    ['#38bdf820', '#f43f5e20', '#10b98120'].forEach((col, idx) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      for (let px = xStart; px <= xEnd; px++) {
        const deg = ((px - xStart) / (xEnd - xStart)) * 360;
        const v = getVLL(deg);
        const val = idx === 0 ? v.vab : idx === 1 ? v.vbc : v.vca;
        const py = voltZeroY - val * voltScale;
        if (px === xStart) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Helper: compute instantaneous Vdc with commutation notches
    const getVdcInstant = (deg: number) => {
      const phi = (deg % 360 + 360) % 360;
      const a = firingAlphaDeg;
      const mu = overlapMuDeg;

      // 6 conduction regions of 60° each:
      // Region 1: T1 & T2 (v_ac). During overlap at start (30+a to 30+a+mu): T5 commutating to T1 -> notch (vac + vbc)/2
      // We can map precisely by checking active devices
      const isAngleInside = (v: number, start: number, len: number) => {
        const s = (start % 360 + 360) % 360;
        const e = s + len;
        if (e < 360) return v >= s && v < e;
        return v >= s || v < (e % 360);
      };

      const rad = (deg * Math.PI) / 180;
      const va = vPeakPhase * Math.sin(rad);
      const vb = vPeakPhase * Math.sin(rad - (2 * Math.PI) / 3);
      const vc = vPeakPhase * Math.sin(rad + (2 * Math.PI) / 3);

      // Determine positive rail voltage and negative rail voltage
      // Top Rail (T1: a, T3: b, T5: c)
      let vTop = 0;
      let vBot = 0;

      // Overlap on top rail?
      const inT1Comm = isAngleInside(phi, 30 + a, mu); // T5 commutating to T1
      const inT3Comm = isAngleInside(phi, 150 + a, mu); // T1 commutating to T3
      const inT5Comm = isAngleInside(phi, 270 + a, mu); // T3 commutating to T5

      if (inT1Comm) vTop = (vc + va) / 2;
      else if (inT3Comm) vTop = (va + vb) / 2;
      else if (inT5Comm) vTop = (vb + vc) / 2;
      else if (isAngleInside(phi, 30 + a, 120)) vTop = va;
      else if (isAngleInside(phi, 150 + a, 120)) vTop = vb;
      else vTop = vc;

      // Overlap on bottom rail?
      const inT2Comm = isAngleInside(phi, 90 + a, mu); // T6 commutating to T2
      const inT4Comm = isAngleInside(phi, 210 + a, mu); // T2 commutating to T4
      const inT6Comm = isAngleInside(phi, 330 + a, mu); // T4 commutating to T6

      if (inT2Comm) vBot = (vb + vc) / 2;
      else if (inT4Comm) vBot = (vc + va) / 2;
      else if (inT6Comm) vBot = (va + vb) / 2;
      else if (isAngleInside(phi, 90 + a, 120)) vBot = vc;
      else if (isAngleInside(phi, 210 + a, 120)) vBot = va;
      else vBot = vb;

      return vTop - vBot;
    };

    // Draw Instantaneous Vdc Curve (Golden/Amber with glowing notches)
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.8;

    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const vInst = getVdcInstant(deg);
      const py = voltZeroY - vInst * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw Average Vdc Dashed Line
    const avgY = voltZeroY - vdcActual * voltScale;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xStart, avgY);
    ctx.lineTo(xEnd, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Avg Vdc = ${vdcActual} V (Drop ΔV = ${deltaVdc}V)`, xStart + 10, avgY - 6);

    // Draw AC Line Current ia(t) (Quasi-square with trapezoidal overlap slope)
    const getIaInstant = (deg: number) => {
      const phi = (deg % 360 + 360) % 360;
      const a = firingAlphaDeg;
      const mu = Math.max(0.5, overlapMuDeg);

      // Positive conduction: T1 conducts (30+a to 150+a)
      // Rising slope: 30+a to 30+a+mu
      const posStart = (30 + a) % 360;
      const posEnd = (150 + a) % 360;

      // Negative conduction: T4 conducts (210+a to 330+a)
      const negStart = (210 + a) % 360;
      const negEnd = (330 + a) % 360;

      const isInside = (v: number, s: number, len: number) => {
        const e = s + len;
        if (e < 360) return v >= s && v < e;
        return v >= s || v < (e % 360);
      };

      // T1 rising
      if (isInside(phi, posStart, mu)) {
        const frac = ((phi - posStart + 360) % 360) / mu;
        return frac * loadCurrentId;
      }
      // T1 flat positive
      if (isInside(phi, (posStart + mu) % 360, 120 - mu)) {
        return loadCurrentId;
      }
      // T1 falling (T3 turning ON)
      if (isInside(phi, posEnd, mu)) {
        const frac = 1 - ((phi - posEnd + 360) % 360) / mu;
        return frac * loadCurrentId;
      }

      // T4 negative rising (going down to -Id)
      if (isInside(phi, negStart, mu)) {
        const frac = ((phi - negStart + 360) % 360) / mu;
        return -frac * loadCurrentId;
      }
      // T4 flat negative
      if (isInside(phi, (negStart + mu) % 360, 120 - mu)) {
        return -loadCurrentId;
      }
      // T4 returning to 0
      if (isInside(phi, negEnd, mu)) {
        const frac = 1 - ((phi - negEnd + 360) % 360) / mu;
        return -frac * loadCurrentId;
      }

      return 0;
    };

    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;

    for (let px = xStart; px <= xEnd; px++) {
      const deg = ((px - xStart) / (xEnd - xStart)) * 360;
      const iVal = getIaInstant(deg);
      const py = currZeroY - iVal * currScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Phase Angle Scrubber Cursor
    const cursorX = degToX(omegaTDeg);
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 15);
    ctx.lineTo(cursorX, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(cursorX, 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legend
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px sans-serif';
    ctx.fillText('― Instantaneous Output vdc(ωt) [With Commutation Notches]', 50, 24);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('― AC Line Current ia(ωt) [Trapezoidal Commutation Slopes]', 500, 24);

    // Overlap Status banner inside canvas
    if (activeDevices.isOverlapNow) {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 250, 48, 230, 52, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`⚡ 3-SCR OVERLAP COMMUTATION (µ=${overlapMuDeg}°)`, width - 240, 68);
      ctx.font = '10px sans-serif';
      ctx.fillText(`Active: T${activeDevices.activeList.join(', T')} (Ls shorting)`, width - 240, 84);
    }
  }, [
    omegaTDeg,
    firingAlphaDeg,
    overlapMuDeg,
    vLineRms,
    vPeakLL,
    vPeakPhase,
    loadCurrentId,
    vdcActual,
    deltaVdc,
    activeDevices,
  ]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-amber-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                3-PHASE 6-PULSE GRAETZ BRIDGE FULL CONDUCTION TOPOLOGY EXPLORER
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                REC 7 • IEEE STD 519
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 360° phase wheel dial, 6-pulse Graetz bridge schematic, source inductance <span className="text-amber-400 font-mono">Ls</span> causing overlap angle <span className="text-pink-400 font-mono">µ</span>, and DC bus voltage notch dynamics.
            </p>
          </div>
        </div>

        {/* Live Active Devices Readout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-xs font-black shadow-lg">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>
              ACTIVE THYRISTORS:{' '}
              <span className="font-mono text-white text-sm">
                T{activeDevices.activeList.join(' + T')}
              </span>
            </span>
            {activeDevices.isOverlapNow && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-pink-600 text-white text-[10px] uppercase font-black animate-pulse">
                3-SCR OVERLAP
              </span>
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

      {/* Main Grid: Controls + Interactive Phase Wheel + Schematic + CRT Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Phase Wheel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Circular Phase Wheel & Scrubbing Slider */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-pink-400" />
                360° INTERACTIVE PHASE WHEEL
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isPlaying ? 'PAUSE' : 'ROTATE'}
                </button>
              </div>
            </div>

            {/* Circular Phase Wheel SVG */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {/* Dial Circle */}
                <circle cx="100" cy="100" r="85" fill="#0d1117" stroke="#1e293b" strokeWidth="4" />

                {/* 6 60° Conduction Sector Bands */}
                {[
                  { start: 30, color: '#38bdf8', label: 'T1-T2' },
                  { start: 90, color: '#a855f7', label: 'T2-T3' },
                  { start: 150, color: '#10b981', label: 'T3-T4' },
                  { start: 210, color: '#f59e0b', label: 'T4-T5' },
                  { start: 270, color: '#f43f5e', label: 'T5-T6' },
                  { start: 330, color: '#06b6d4', label: 'T6-T1' },
                ].map((sec, idx) => {
                  const sRad = ((sec.start + firingAlphaDeg) * Math.PI) / 180;
                  const eRad = ((sec.start + firingAlphaDeg + 60) * Math.PI) / 180;
                  const x1 = 100 + 82 * Math.cos(sRad);
                  const y1 = 100 + 82 * Math.sin(sRad);
                  const x2 = 100 + 82 * Math.cos(eRad);
                  const y2 = 100 + 82 * Math.sin(eRad);

                  return (
                    <path
                      key={idx}
                      d={`M 100 100 L ${x1} ${y1} A 82 82 0 0 1 ${x2} ${y2} Z`}
                      fill={sec.color}
                      fillOpacity="0.12"
                      stroke={sec.color}
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Rotating Indicator Needle */}
                {(() => {
                  const nRad = (omegaTDeg * Math.PI) / 180;
                  const nx = 100 + 78 * Math.cos(nRad);
                  const ny = 100 + 78 * Math.sin(nRad);
                  return (
                    <g>
                      <line x1="100" y1="100" x2={nx} y2={ny} stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
                      <circle cx={nx} cy={ny} r="5" fill="#ec4899" />
                      <circle cx="100" cy="100" r="6" fill="#ffffff" />
                    </g>
                  );
                })()}
              </svg>

              {/* Center Digital Readout */}
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400">Phase ωt</span>
                <span className="text-xl font-black font-mono text-pink-400">{omegaTDeg.toFixed(0)}°</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {activeDevices.activeList.length} Thyristors
                </span>
              </div>
            </div>

            {/* Manual Scrubbing Slider */}
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Scrub Electrical Angle (ωt):</span>
                <span className="font-mono text-pink-400 font-bold">{omegaTDeg.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={omegaTDeg}
                onChange={(e) => {
                  setIsPlaying(false);
                  setOmegaTDeg(Number(e.target.value));
                }}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Parameter Sliders */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              CONVERTER &amp; SOURCE INDUCTANCE
            </span>

            {/* Firing Angle Alpha */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-bold">Firing Delay Angle (α):</span>
                <span className="font-mono text-amber-300 font-extrabold">{firingAlphaDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={firingAlphaDeg}
                onChange={(e) => setFiringAlphaDeg(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Source Inductance Ls */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-pink-400 font-bold">Source Inductance (Ls):</span>
                <span className="font-mono text-pink-300 font-extrabold">{sourceLsMh} mH</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.1"
                value={sourceLsMh}
                onChange={(e) => setSourceLsMh(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Transformer leakage &amp; utility grid inductance</span>
            </div>

            {/* Load Current Id */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-bold">DC Load Current (Id):</span>
                <span className="font-mono text-sky-300 font-extrabold">{loadCurrentId} A</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="2"
                value={loadCurrentId}
                onChange={(e) => setLoadCurrentId(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Line Voltage VLL */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Line-to-Line Voltage (VLL):</span>
                <span className="font-mono text-emerald-400 font-bold">{vLineRms} V RMS</span>
              </div>
              <input
                type="range"
                min="208"
                max="480"
                step="12"
                value={vLineRms}
                onChange={(e) => setVLineRms(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Animated Bridge Schematic + CRT Scope (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Animated 6-Thyristor Graetz Bridge Schematic */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                GRAETZ BRIDGE TOPOLOGY WITH CONDUCTION PATH HIGHLIGHTING
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Positive Rail (+): T1, T3, T5 | Negative Rail (-): T4, T6, T2
              </span>
            </div>

            {/* SVG Schematic */}
            <div className="w-full h-44 bg-[#0a0d14] rounded-lg p-2 relative overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 620 160" className="w-full h-full max-h-44">
                {/* DC Rails */}
                {/* Positive Rail (Top) */}
                <line x1="160" y1="20" x2="520" y2="20" stroke="#f59e0b" strokeWidth="3" />
                <text x="530" y="24" fill="#f59e0b" fontSize="11" fontWeight="bold">DC+ Bus</text>

                {/* Negative Rail (Bottom) */}
                <line x1="160" y1="140" x2="520" y2="140" stroke="#38bdf8" strokeWidth="3" />
                <text x="530" y="144" fill="#38bdf8" fontSize="11" fontWeight="bold">DC- Bus</text>

                {/* Load Block */}
                <rect x="520" y="40" width="40" height="80" rx="6" fill="#161f30" stroke="#334155" strokeWidth="2" />
                <text x="540" y="75" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">R - L</text>
                <text x="540" y="90" fill="#94a3b8" fontSize="8" textAnchor="middle">LOAD</text>
                <line x1="540" y1="20" x2="540" y2="40" stroke="#f59e0b" strokeWidth="2" />
                <line x1="540" y1="120" x2="540" y2="140" stroke="#38bdf8" strokeWidth="2" />

                {/* 3-Phase AC Source Lines with Ls inductors */}
                {/* Phase A */}
                <circle cx="40" cy="45" r="12" fill="#141a24" stroke="#38bdf8" strokeWidth="2" />
                <text x="40" y="49" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">A</text>
                {/* Ls inductor A */}
                <path d="M 52 45 Q 65 35 78 45 Q 90 35 102 45 Q 115 35 128 45 L 200 45" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="85" y="32" fill="#ec4899" fontSize="9" fontWeight="bold">Ls</text>

                {/* Phase B */}
                <circle cx="40" cy="80" r="12" fill="#141a24" stroke="#f43f5e" strokeWidth="2" />
                <text x="40" y="84" fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="middle">B</text>
                <path d="M 52 80 Q 65 70 78 80 Q 90 70 102 80 Q 115 70 128 80 L 320 80" fill="none" stroke="#f43f5e" strokeWidth="2" />

                {/* Phase C */}
                <circle cx="40" cy="115" r="12" fill="#141a24" stroke="#10b981" strokeWidth="2" />
                <text x="40" y="119" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">C</text>
                <path d="M 52 115 Q 65 105 78 115 Q 90 105 102 115 Q 115 105 128 115 L 440 115" fill="none" stroke="#10b981" strokeWidth="2" />

                {/* Vertical Bridge Legs */}
                {/* Leg 1: T1 (top) and T4 (bottom) at x = 200 */}
                <line x1="200" y1="20" x2="200" y2="140" stroke="#334155" strokeWidth="1.5" />

                {/* Leg 2: T3 (top) and T6 (bottom) at x = 320 */}
                <line x1="320" y1="20" x2="320" y2="140" stroke="#334155" strokeWidth="1.5" />

                {/* Leg 3: T5 (top) and T2 (bottom) at x = 440 */}
                <line x1="440" y1="20" x2="440" y2="140" stroke="#334155" strokeWidth="1.5" />

                {/* Thyristor Symbols (T1 to T6) with Glowing Active Highlights */}
                {[
                  { id: 1, name: 'T1', x: 200, y: 40, active: activeDevices.t1 },
                  { id: 3, name: 'T3', x: 320, y: 40, active: activeDevices.t3 },
                  { id: 5, name: 'T5', x: 440, y: 40, active: activeDevices.t5 },
                  { id: 4, name: 'T4', x: 200, y: 110, active: activeDevices.t4 },
                  { id: 6, name: 'T6', x: 320, y: 110, active: activeDevices.t6 },
                  { id: 2, name: 'T2', x: 440, y: 110, active: activeDevices.t2 },
                ].map((th) => {
                  const isTop = th.y < 80;
                  return (
                    <g key={th.id}>
                      {/* Glow Aura if active */}
                      {th.active && (
                        <circle
                          cx={th.x}
                          cy={th.y}
                          r="18"
                          fill={activeDevices.isOverlapNow ? '#ec4899' : '#10b981'}
                          fillOpacity="0.3"
                          className="animate-pulse"
                        />
                      )}
                      {/* Thyristor Triangle + Cathode Bar */}
                      <rect
                        x={th.x - 14}
                        y={th.y - 12}
                        width="28"
                        height="24"
                        rx="4"
                        fill={th.active ? (activeDevices.isOverlapNow ? '#831843' : '#064e3b') : '#1e293b'}
                        stroke={th.active ? (activeDevices.isOverlapNow ? '#ec4899' : '#10b981') : '#475569'}
                        strokeWidth={th.active ? '2.5' : '1.5'}
                      />
                      <text
                        x={th.x}
                        y={th.y + 4}
                        fill={th.active ? '#ffffff' : '#94a3b8'}
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {th.name}
                      </text>
                      <text
                        x={th.x + 22}
                        y={th.y + 3}
                        fill={th.active ? '#10b981' : '#64748b'}
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {th.active ? 'ON' : 'OFF'}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* CRT Multi-Channel Oscilloscope */}
          <div className="relative bg-[#0a0d14] border border-[#1e293b] rounded-xl p-2 shadow-2xl overflow-hidden">
            <canvas
              ref={scopeCanvasRef}
              width={820}
              height={340}
              className="w-full h-auto block rounded-lg"
            />
          </div>

          {/* Overlap & Voltage Drop Key Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0f1420] border border-pink-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-pink-400">Overlap Angle (µ)</span>
              <span className="text-base font-black font-mono text-pink-300">{overlapMuDeg}°</span>
              <span className="text-[10px] text-slate-400">Commutation interval</span>
            </div>

            <div className="bg-[#0f1420] border border-amber-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-400">Voltage Drop (ΔVdc)</span>
              <span className="text-base font-black font-mono text-rose-400">-{deltaVdc} V</span>
              <span className="text-[10px] text-slate-400">(3•ω•Ls/π) • Id</span>
            </div>

            <div className="bg-[#0f1420] border border-emerald-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Actual Vdc (Average)</span>
              <span className="text-base font-black font-mono text-emerald-300">{vdcActual} V</span>
              <span className="text-[10px] text-slate-400">Vdc0 - ΔVdc</span>
            </div>

            <div className="bg-[#0f1420] border border-sky-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-400">Ideal Vdc0 (No Ls)</span>
              <span className="text-base font-black font-mono text-sky-300">{vdcIdeal} V</span>
              <span className="text-[10px] text-slate-400">At α = {firingAlphaDeg}°</span>
            </div>
          </div>

          {/* Pedagogical Insight Strip */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 text-xs text-slate-300 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-[#1e293b] pb-1">
              <Info className="w-4 h-4" />
              <span>THE COMMUTATION NOTCH &amp; 3-THYRISTOR CONDUCTION DYNAMICS</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Because of source inductance <span className="text-pink-400 font-mono">Ls</span>, current cannot transfer instantaneously from one thyristor to the next. During the overlap angle <span className="text-pink-400 font-mono">µ = {overlapMuDeg}°</span>, <strong className="text-slate-200">three thyristors conduct simultaneously</strong>. The two incoming and outgoing phases are briefly short-circuited together through <span className="font-mono text-pink-300">2•Ls</span>, dragging the DC bus voltage down to the average of the two phase voltages: <span className="font-mono text-amber-300">vdc = (va + vb) / 2</span>. This creates the famous <strong className="text-amber-400">commutation notch</strong> and causes an unavoidable output voltage reduction of <span className="font-mono text-rose-400">ΔVdc = {deltaVdc} V</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
