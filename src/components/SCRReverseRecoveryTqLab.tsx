import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  CheckCircle2,
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';

interface SCRReverseRecoveryTqLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * SCRReverseRecoveryTqLab.tsx
 * 
 * Recommendation 6: Reverse Recovery Dynamics & The t_q vs. t_c Race Hazard
 * 
 * Demonstrates:
 *  - Split turn-off timeline: trr = ta + tb (outer junctions J1/J3 recovery) + tgr (internal J2 recombination).
 *  - Total device turn-off time: t_q = trr + tgr.
 *  - Circuit commutation turn-off time margin: tc vs tq.
 *  - Race hazard triggering: when tc < tq, forward voltage reapplied causes spontaneous shoot-through.
 *  - Reverse recovery charge Qrr, peak reverse current IRM, snubber sizing Cs >= Qrr / (2 Vm).
 */
export const SCRReverseRecoveryTqLab: React.FC<SCRReverseRecoveryTqLabProps> = ({
  className = '',
  onClose,
}) => {
  // User adjustable sliders
  const [forwardCurrentIf, setForwardCurrentIf] = useState<number>(100); // A
  const [diDt, setDiDt] = useState<number>(30); // A/µs
  const [circuitTcUs, setCircuitTcUs] = useState<number>(50); // µs (circuit turn-off time)
  const [deviceTqUs, setDeviceTqUs] = useState<number>(40); // µs (thyristor rated tq)
  const [reappliedVf, setReappliedVf] = useState<number>(400); // V
  const [reverseVoltageVr, setReverseVoltageVr] = useState<number>(250); // V

  // Animation and Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTimeUs, setSimTimeUs] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // References
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Physical calculations
  const taUs = useMemo(() => {
    return Math.max(1.5, Math.min(8.0, 0.45 * Math.sqrt(forwardCurrentIf / (diDt * 0.1))));
  }, [forwardCurrentIf, diDt]);

  const irmA = useMemo(() => {
    return taUs * diDt;
  }, [taUs, diDt]);

  const tbUs = useMemo(() => {
    return taUs * 0.8;
  }, [taUs]);

  const trrUs = useMemo(() => {
    return taUs + tbUs;
  }, [taUs, tbUs]);

  const qrrUC = useMemo(() => {
    return 0.5 * irmA * trrUs;
  }, [irmA, trrUs]);

  const tgrUs = useMemo(() => {
    return Math.max(5, deviceTqUs - trrUs);
  }, [deviceTqUs, trrUs]);

  // Is Race Hazard triggered?
  const isRaceHazard = circuitTcUs < deviceTqUs;
  const safetyFactor = (circuitTcUs / deviceTqUs).toFixed(2);

  // Snubber requirement
  const minSnubberC_uF = useMemo(() => {
    return Number(((qrrUC) / (2 * reappliedVf)).toFixed(3));
  }, [qrrUC, reappliedVf]);

  // Animation Loop: 0 to 120 µs cycle
  const maxCycleTimeUs = 110;

  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setSimTimeUs((prev) => {
          const next = prev + (dtMs * 0.05 * playbackSpeed);
          return next > maxCycleTimeUs ? 0 : next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Draw Synchronized Dual Oscilloscope + Carrier Visualizer
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

    const numXDivs = 10;
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

    // Split oscilloscope into two horizontal zones:
    const topZeroY = height * 0.32;
    const bottomZeroY = height * 0.78;

    // Time scale: 0 to maxCycleTimeUs maps to x = 50 to width - 20
    const xStart = 50;
    const xEnd = width - 20;
    const timeToX = (tUs: number) => xStart + (tUs / maxCycleTimeUs) * (xEnd - xStart);

    // Key event timestamps
    const t0 = 10;
    const tZeroCurrent = t0 + (forwardCurrentIf / diDt);
    const tPeakReverse = tZeroCurrent + taUs;
    const tRecoveryEnd = tPeakReverse + tbUs;
    const tDeviceTq = tZeroCurrent + deviceTqUs;
    const tCircuitTc = tZeroCurrent + circuitTcUs;

    // Region highlights:
    const xZero = timeToX(tZeroCurrent);
    const xTa = timeToX(tPeakReverse);
    const xTrr = timeToX(tRecoveryEnd);
    const xTq = timeToX(tDeviceTq);
    const xTc = timeToX(tCircuitTc);

    // Shading for trr = ta + tb
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(xZero, 20, Math.max(2, xTrr - xZero), height - 40);

    // Shading for tgr (gate recovery)
    ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
    ctx.fillRect(xTrr, 20, Math.max(2, xTq - xTrr), height - 40);

    // Race hazard danger band if tc < tq
    if (isRaceHazard && xTc < xTq) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(xTc, 20, Math.max(2, xTq - xTc), height - 40);
    }

    // Zero Baselines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xStart, topZeroY);
    ctx.lineTo(xEnd, topZeroY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xStart, bottomZeroY);
    ctx.lineTo(xEnd, bottomZeroY);
    ctx.stroke();

    // Labels for Baselines
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 A', 14, topZeroY + 3);
    ctx.fillText('0 V', 14, bottomZeroY + 3);

    const currentScale = 0.9;
    const voltScale = 0.22;

    // --- CURVE 1: iA(t) Anode Current ---
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    for (let px = xStart; px <= xEnd; px++) {
      const t = ((px - xStart) / (xEnd - xStart)) * maxCycleTimeUs;
      let iVal = 0;

      if (t < t0) {
        iVal = forwardCurrentIf;
      } else if (t < tPeakReverse) {
        iVal = forwardCurrentIf - diDt * (t - t0);
      } else if (t < tRecoveryEnd) {
        const frac = (t - tPeakReverse) / tbUs;
        iVal = -irmA * Math.exp(-frac * 2.8);
      } else if (t < tCircuitTc) {
        iVal = -0.5;
      } else {
        if (isRaceHazard) {
          const overshoot = Math.min(220, 15 + Math.pow((t - tCircuitTc) * 6, 1.4));
          iVal = overshoot;
        } else {
          const spikeTime = t - tCircuitTc;
          iVal = 18 * Math.exp(-spikeTime * 1.5);
        }
      }

      const py = topZeroY - iVal * currentScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- CURVE 2: vAK(t) Anode-to-Cathode Voltage ---
    ctx.beginPath();
    ctx.strokeStyle = isRaceHazard ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2.5;

    for (let px = xStart; px <= xEnd; px++) {
      const t = ((px - xStart) / (xEnd - xStart)) * maxCycleTimeUs;
      let vVal = 0;

      if (t < tPeakReverse) {
        vVal = 1.4;
      } else if (t < tRecoveryEnd) {
        const spike = reverseVoltageVr * 1.35;
        const frac = (t - tPeakReverse) / tbUs;
        vVal = -(1.4 + (spike - 1.4) * Math.sin(frac * Math.PI * 0.6));
      } else if (t < tCircuitTc) {
        vVal = -reverseVoltageVr;
      } else {
        if (isRaceHazard) {
          const delta = t - tCircuitTc;
          if (delta < 1.2) {
            vVal = reappliedVf * (delta / 1.2);
          } else {
            vVal = 1.8;
          }
        } else {
          vVal = reappliedVf;
        }
      }

      const py = bottomZeroY - vVal * voltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Vertical Marker: Current Simulation Cursor
    const cursorX = timeToX(simTimeUs);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 15);
    ctx.lineTo(cursorX, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cursorX, 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Markers & Dimension Lines
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('ta', (xZero + xTa) / 2 - 5, topZeroY - 45);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText('tb', (xTa + xTrr) / 2 - 5, topZeroY - 45);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xZero, topZeroY - 40);
    ctx.lineTo(xTrr, topZeroY - 40);
    ctx.stroke();
    ctx.fillText(`trr = ${trrUs.toFixed(1)} µs`, (xZero + xTrr) / 2 - 25, topZeroY - 30);

    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(xTrr, topZeroY - 40);
    ctx.lineTo(xTq, topZeroY - 40);
    ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`tgr = ${tgrUs.toFixed(1)} µs`, (xTrr + xTq) / 2 - 20, topZeroY - 30);

    // Device tq line
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(xTq, 25);
    ctx.lineTo(xTq, height - 20);
    ctx.stroke();
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`DEVICE tq (${deviceTqUs}µs)`, xTq + 4, 38);

    // Circuit tc line
    ctx.strokeStyle = isRaceHazard ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xTc, 25);
    ctx.lineTo(xTc, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isRaceHazard ? '#ef4444' : '#10b981';
    ctx.fillText(`CIRCUIT tc (${circuitTcUs}µs)`, xTc + 4, 52);

    // Peak Reverse Current IRM label
    const irmY = topZeroY + irmA * currentScale;
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`-IRM = -${irmA.toFixed(0)} A`, xTa - 45, Math.min(height - 60, irmY + 14));

    // Legend
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.fillText('― iA(t) Anode Current', 55, 25);
    ctx.fillStyle = isRaceHazard ? '#ef4444' : '#10b981';
    ctx.fillText('― vAK(t) Thyristor Voltage', 210, 25);

    // Failure Alert Box inside Canvas
    if (isRaceHazard && simTimeUs >= tCircuitTc) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 240, 60, 220, 65, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⚠️ SPONTANEOUS BREAKOVER!', width - 230, 80);
      ctx.font = '10px sans-serif';
      ctx.fillText('tc < tq: Trapped carriers at J2', width - 230, 96);
      ctx.fillText('re-ignited SCR under forward V!', width - 230, 112);
    } else if (!isRaceHazard && simTimeUs >= tCircuitTc) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 230, 60, 210, 55, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✅ SAFE FORWARD BLOCKING', width - 220, 80);
      ctx.font = '10px sans-serif';
      ctx.fillText(`tc > tq (Margin SF: ${safetyFactor}x)`, width - 220, 98);
    }
  }, [
    forwardCurrentIf,
    diDt,
    circuitTcUs,
    deviceTqUs,
    reappliedVf,
    reverseVoltageVr,
    taUs,
    irmA,
    tbUs,
    trrUs,
    tgrUs,
    isRaceHazard,
    simTimeUs,
    safetyFactor,
  ]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-purple-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                SCR REVERSE RECOVERY DYNAMICS &amp; THE tq vs. tc RACE HAZARD
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                REC 6 • IEC 60747-6
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Split turn-off timeline: outer junctions recovery (<span className="text-sky-400 font-mono">trr = ta + tb</span>) plus internal <span className="text-purple-400 font-mono">J2</span> gate recovery (<span className="text-purple-400 font-mono">tgr</span>). Circuit margin race test.
            </p>
          </div>
        </div>

        {/* Live Race Hazard Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black shadow-lg transition-all ${
              isRaceHazard
                ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {isRaceHazard ? (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>RACE HAZARD: tc &lt; tq (SHOOT-THROUGH DANGER)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>COMMUTATION SAFE: tc &gt; tq (SF = {safetyFactor}x)</span>
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

      {/* Main Grid: Controls + CRT Dual Oscilloscope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sliders & Circuit Parameters (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                COMMUTATION TIMING RACE BENCH
              </span>
              <button
                onClick={() => {
                  setForwardCurrentIf(100);
                  setDiDt(30);
                  setCircuitTcUs(50);
                  setDeviceTqUs(40);
                  setReappliedVf(400);
                  setReverseVoltageVr(250);
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Circuit Turn-off Time tc */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400 font-bold">Circuit Turn-Off Time (tc):</span>
                <span className="font-mono text-emerald-300 font-extrabold">{circuitTcUs} µs</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="1"
                value={circuitTcUs}
                onChange={(e) => setCircuitTcUs(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Time circuit holds SCR reverse-biased before reapplying +V</span>
            </div>

            {/* Device Rated Turn-off Time tq */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-purple-400 font-bold">SCR Rated Turn-Off Time (tq):</span>
                <span className="font-mono text-purple-300 font-extrabold">{deviceTqUs} µs</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="1"
                value={deviceTqUs}
                onChange={(e) => setDeviceTqUs(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Datasheet specification: minimum required zero-bias time</span>
            </div>

            {/* Forward Current IF */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Prior Forward Current (IF):</span>
                <span className="font-mono text-sky-400 font-bold">{forwardCurrentIf} A</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={forwardCurrentIf}
                onChange={(e) => setForwardCurrentIf(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Commutation Rate di/dt */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Current Decay Rate (-di/dt):</span>
                <span className="font-mono text-amber-400 font-bold">{diDt} A/µs</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="2"
                value={diDt}
                onChange={(e) => setDiDt(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Reapplied Forward Voltage VF */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Reapplied Forward Voltage (+VF):</span>
                <span className="font-mono text-rose-400 font-bold">{reappliedVf} V</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="25"
                value={reappliedVf}
                onChange={(e) => setReappliedVf(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Reverse Voltage VR */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Reverse Commutation Bias (VR):</span>
                <span className="font-mono text-blue-400 font-bold">{reverseVoltageVr} V</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={reverseVoltageVr}
                onChange={(e) => setReverseVoltageVr(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Preset Scenarios */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-black text-slate-400 tracking-wider">TEACHING PRESETS</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setCircuitTcUs(28);
                  setDeviceTqUs(45);
                  setDiDt(40);
                }}
                className="px-2 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-[11px] font-bold hover:bg-red-900/50 transition-all text-left cursor-pointer"
              >
                💥 Inverter Shoot-Through (tc &lt; tq)
              </button>
              <button
                onClick={() => {
                  setCircuitTcUs(65);
                  setDeviceTqUs(35);
                  setDiDt(25);
                }}
                className="px-2 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900/50 transition-all text-left cursor-pointer"
              >
                🛡️ Safe Line Commutation (SF 1.8x)
              </button>
              <button
                onClick={() => {
                  setDiDt(75);
                  setForwardCurrentIf(220);
                }}
                className="px-2 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] font-bold hover:bg-amber-900/50 transition-all text-left cursor-pointer"
              >
                ⚡ Massive Qrr &amp; IRM Spike
              </button>
              <button
                onClick={() => {
                  setCircuitTcUs(42);
                  setDeviceTqUs(40);
                }}
                className="px-2 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[11px] font-bold hover:bg-purple-900/50 transition-all text-left cursor-pointer"
              >
                ⚠️ Marginal Boundary (tc ≈ tq)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Split Oscilloscope + Dynamic Carrier Model (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Oscilloscope Header Controls */}
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
                onClick={() => setSimTimeUs(0)}
                className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded text-xs font-mono cursor-pointer"
              >
                RE-TRIGGER
              </button>
              <div className="text-xs font-mono text-amber-400">
                t = <span className="font-bold">{simTimeUs.toFixed(1)}</span> µs
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Speed:</span>
              {[0.25, 0.5, 1.0].map((spd) => (
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

          {/* Split Timeline Math Breakdown Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0f1420] border border-sky-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-400">Storage Time (ta)</span>
              <span className="text-base font-black font-mono text-white">{taUs.toFixed(1)} µs</span>
              <span className="text-[10px] text-slate-400">J1, J3 carrier clearing</span>
            </div>

            <div className="bg-[#0f1420] border border-sky-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-400">Peak Reverse IRM</span>
              <span className="text-base font-black font-mono text-rose-400">-{irmA.toFixed(0)} A</span>
              <span className="text-[10px] text-slate-400">IRM = (di/dt) • ta</span>
            </div>

            <div className="bg-[#0f1420] border border-purple-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-purple-400">Gate Recovery (tgr)</span>
              <span className="text-base font-black font-mono text-white">{tgrUs.toFixed(1)} µs</span>
              <span className="text-[10px] text-slate-400">J2 trapped recombination</span>
            </div>

            <div className="bg-[#0f1420] border border-amber-900/30 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-400">Stored Charge (Qrr)</span>
              <span className="text-base font-black font-mono text-amber-300">{qrrUC.toFixed(0)} µC</span>
              <span className="text-[10px] text-slate-400">0.5 • IRM • trr</span>
            </div>
          </div>

          {/* 4-Layer PNPN Carrier Concentration Insight Box */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-400" />
                PNPN CARRIER DYNAMICS DURING REVERSE RECOVERY &amp; RECOMBINATION
              </span>
              <span className="text-[11px] font-mono text-purple-300">
                tq = trr + tgr = {trrUs.toFixed(1)} + {tgrUs.toFixed(1)} = {deviceTqUs} µs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-sky-400 mb-1">1. Interval ta (0 to ta)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Negative current sweeps mobile electrons and holes out of outer junctions <strong className="text-slate-200">J1 and J3</strong>. Anode current reaches peak negative value <span className="text-rose-400 font-mono">-IRM</span>. J1 and J3 regain reverse blocking.
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-purple-400 mb-1">2. Interval tb (ta to trr)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Depletion regions form at J1 and J3. Reverse current decays to near-zero as remaining outer charge is swept out. High <span className="text-amber-400 font-mono">L•(di/dt)</span> voltage spike is generated across thyristor terminals.
                </p>
              </div>

              <div className="bg-[#141a24] p-2.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1">3. Interval tgr (trr to tq)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Middle junction <strong className="text-slate-200">J2 cannot be swept out by external current</strong>. Trapped carriers must recombine naturally via carrier lifetime <span className="font-mono text-purple-300">τ</span>. If forward voltage is applied before tgr finishes, the SCR suffers spontaneous forward breakover!
                </p>
              </div>
            </div>

            {/* Snubber Sizing Formula Card */}
            <div className="mt-2 bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-slate-900/40 border border-blue-800/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Recommended Reverse Recovery Snubber Capacitance:</span>
                <span className="text-xs font-mono text-emerald-400 font-extrabold">
                  Cs ≥ Qrr / (2 • Vm) = {minSnubberC_uF} µF
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Protects thyristor against dv/dt re-triggering and absorbs inductive recovery energy 0.5 • L • IRM²
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
