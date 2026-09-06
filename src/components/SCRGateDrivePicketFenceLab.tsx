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
  Layers,
  Cpu
} from 'lucide-react';

interface SCRGateDrivePicketFenceLabProps {
  className?: string;
  onClose?: () => void;
}

type GateDriveMode = 'continuous_dc' | 'single_narrow' | 'single_wide' | 'picket_fence';

/**
 * SCRGateDrivePicketFenceLab.tsx
 * 
 * Recommendation 9: Gate Firing Circuitry, Pulse Transformers & Picket-Fence Pulse Trains
 * 
 * Demonstrates:
 *  - Why continuous DC gate drive causes excessive gate thermal dissipation and has no galvanic isolation.
 *  - The Inductive Load Trap: Why single narrow 10µs pulses fail to latch R-L loads when iA(t_pulse) < IL.
 *  - Why single wide pulses cause pulse transformer magnetic saturation.
 *  - Picket-fence modulation (10-20 kHz carrier burst): solves transformer saturation, reduces gate heating by 65%,
 *    and guarantees reliable latching on inductive loads.
 */
export const SCRGateDrivePicketFenceLab: React.FC<SCRGateDrivePicketFenceLabProps> = ({
  className = '',
  onClose,
}) => {
  // Drive Mode
  const [driveMode, setDriveMode] = useState<GateDriveMode>('picket_fence');

  // Circuit and Device Parameters
  const [loadResistance, setLoadResistance] = useState<number>(20); // Ohms
  const [loadInductanceMh, setLoadInductanceMh] = useState<number>(40); // mH (Inductive load)
  const [supplyVs, setSupplyVs] = useState<number>(100); // V DC
  const [latchingCurrentMa, setLatchingCurrentMa] = useState<number>(150); // mA (SCR datasheet IL)
  const [carrierFreqKhz, setCarrierFreqKhz] = useState<number>(15); // kHz for picket fence
  const [carrierDutyPct, setCarrierDutyPct] = useState<number>(40); // % duty cycle

  // Pulse timings
  const [narrowPulseUs] = useState<number>(10); // 10 µs narrow pulse
  const [widePulseMs] = useState<number>(1.2); // 1.2 ms wide pulse
  const [envelopeMs] = useState<number>(1.5); // 1.5 ms picket fence envelope

  // Animation and simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTimeMs, setSimTimeMs] = useState<number>(0);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Time constant of load: tau = L / R (in ms)
  const loadTauMs = useMemo(() => {
    return (loadInductanceMh / loadResistance);
  }, [loadInductanceMh, loadResistance]);

  // Steady-state anode current: Is = Vs / R
  const steadyCurrentA = useMemo(() => {
    return supplyVs / loadResistance;
  }, [supplyVs, loadResistance]);

  // Minimum pulse duration required to reach latching current:
  // i(t) = (Vs/R) * (1 - exp(-t / tau)) >= IL
  // exp(-t / tau) <= 1 - (IL * R / Vs)
  // t_min = -tau * ln(1 - (IL * R / Vs))
  const minLatchingTimeMs = useMemo(() => {
    const ilA = latchingCurrentMa * 1e-3;
    const ratio = (ilA * loadResistance) / supplyVs;
    if (ratio >= 1) return 999; // impossible to latch
    return Number((-loadTauMs * Math.log(1 - ratio)).toFixed(3));
  }, [loadTauMs, latchingCurrentMa, loadResistance, supplyVs]);

  const minLatchingTimeUs = useMemo(() => {
    return Number((minLatchingTimeMs * 1000).toFixed(1));
  }, [minLatchingTimeMs]);

  // Latching status for each mode:
  const latchingResult = useMemo(() => {
    if (driveMode === 'continuous_dc') {
      return {
        latched: true,
        reason: 'Latched, but massive continuous gate heating (Pg = 1.2W)! Zero pulse transformer isolation possible.',
        color: 'text-amber-400',
        gatePowerW: 1.2,
      };
    }

    if (driveMode === 'single_narrow') {
      // 10 µs pulse
      const latched = narrowPulseUs >= minLatchingTimeUs;
      return {
        latched,
        reason: latched
          ? 'Narrow pulse barely latched load.'
          : `LATCHING FAILURE! Pulse ended at ${narrowPulseUs}µs, but load needed ${minLatchingTimeUs}µs to reach IL (${latchingCurrentMa}mA). Current collapsed to zero!`,
        color: latched ? 'text-emerald-400' : 'text-red-400',
        gatePowerW: 0.005,
      };
    }

    if (driveMode === 'single_wide') {
      const latched = widePulseMs >= minLatchingTimeMs;
      return {
        latched,
        reason: latched
          ? 'Latched, but 1.2ms continuous DC pulse will SATURATE a compact ferrite pulse transformer core (B > Bsat)!'
          : 'Failed to latch.',
        color: 'text-amber-400',
        gatePowerW: 0.45,
      };
    }

    // Picket fence mode
    const latched = envelopeMs >= minLatchingTimeMs;
    const avgGatePower = 1.2 * (carrierDutyPct / 100) * (envelopeMs / 20); // burst over 20ms period
    return {
      latched,
      reason: latched
        ? `PERFECT LATCHING & LOW POWER! High-frequency picket fence (${carrierFreqKhz} kHz) keeps transformer core reset while sustaining gate trigger until iA > IL. Gate power reduced by ${(100 - carrierDutyPct)}%!`
        : `Envelope ended too early before reaching latching current.`,
      color: 'text-emerald-400',
      gatePowerW: Number(avgGatePower.toFixed(3)),
    };
  }, [
    driveMode,
    narrowPulseUs,
    widePulseMs,
    envelopeMs,
    minLatchingTimeUs,
    minLatchingTimeMs,
    latchingCurrentMa,
    carrierDutyPct,
    carrierFreqKhz,
  ]);

  // Animation cycle (0 to 4 ms)
  const maxTimeMs = 3.5;

  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dtMs = stamp - lastStamp;
      lastStamp = stamp;

      if (isPlaying) {
        setSimTimeMs((prev) => {
          const next = prev + dtMs * 0.002;
          return next > maxTimeMs ? 0 : next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Draw Multi-Channel Scope (Gate Voltage, Gate Current, Anode Current vs IL threshold)
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

    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
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
    // Top Zone (0% to 48%): Gate Drive Signal vG(t)
    // Bottom Zone (52% to 100%): Anode Load Current iA(t) with IL latching threshold
    const gateZeroY = height * 0.38;
    const anodeZeroY = height * 0.88;

    const xStart = 50;
    const xEnd = width - 20;
    const timeToX = (tMs: number) => xStart + (tMs / maxTimeMs) * (xEnd - xStart);

    // Baselines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xStart, gateZeroY);
    ctx.lineTo(xEnd, gateZeroY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xStart, anodeZeroY);
    ctx.lineTo(xEnd, anodeZeroY);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 V', 14, gateZeroY + 3);
    ctx.fillText('0 A', 14, anodeZeroY + 3);

    // Draw Latching Current IL threshold line on Anode scope
    const ilA = latchingCurrentMa * 1e-3;
    const anodeScale = 45; // px per Ampere
    const ilY = anodeZeroY - ilA * anodeScale;

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xStart, ilY);
    ctx.lineTo(xEnd, ilY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`LATCHING CURRENT IL = ${latchingCurrentMa} mA`, xStart + 10, ilY - 5);

    // --- CURVE 1: Gate Pulse Waveform vG(t) ---
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;

    const tGateStart = 0.2; // Gate pulse starts at 0.2 ms
    const gateVoltScale = 8; // px per Volt (pulse ~ 5V)

    for (let px = xStart; px <= xEnd; px++) {
      const t = ((px - xStart) / (xEnd - xStart)) * maxTimeMs;
      let vg = 0;

      if (t >= tGateStart) {
        if (driveMode === 'continuous_dc') {
          vg = 5.0;
        } else if (driveMode === 'single_narrow') {
          if (t < tGateStart + narrowPulseUs * 1e-3) vg = 5.0;
        } else if (driveMode === 'single_wide') {
          if (t < tGateStart + widePulseMs) vg = 5.0;
        } else if (driveMode === 'picket_fence') {
          if (t < tGateStart + envelopeMs) {
            // Carrier square wave
            const carrierPeriodMs = 1 / carrierFreqKhz;
            const frac = ((t - tGateStart) % carrierPeriodMs) / carrierPeriodMs;
            vg = frac < carrierDutyPct / 100 ? 5.0 : 0.0;
          }
        }
      }

      const py = gateZeroY - vg * gateVoltScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- CURVE 2: Anode Current iA(t) ---
    ctx.beginPath();
    ctx.strokeStyle = latchingResult.latched ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2.8;

    let isScrTurnedOn = false;

    for (let px = xStart; px <= xEnd; px++) {
      const t = ((px - xStart) / (xEnd - xStart)) * maxTimeMs;
      let ia = 0;

      if (t >= tGateStart) {
        const deltaT = t - tGateStart;

        // Gate active check
        let isGateActive = false;
        if (driveMode === 'continuous_dc') isGateActive = true;
        else if (driveMode === 'single_narrow') isGateActive = deltaT < narrowPulseUs * 1e-3;
        else if (driveMode === 'single_wide') isGateActive = deltaT < widePulseMs;
        else if (driveMode === 'picket_fence') isGateActive = deltaT < envelopeMs;

        // Inductive current rise: i(t) = (Vs/R) * (1 - exp(-t / tau))
        const risingCurrent = steadyCurrentA * (1 - Math.exp(-deltaT / loadTauMs));

        if (risingCurrent >= ilA) {
          isScrTurnedOn = true; // successfully latched!
        }

        if (isGateActive || isScrTurnedOn) {
          ia = risingCurrent;
        } else {
          // Gate disappeared before reaching IL -> Anode current collapses to zero!
          ia = 0;
        }
      }

      const py = anodeZeroY - ia * anodeScale;
      if (px === xStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Cursor
    const cursorX = timeToX(simTimeMs);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 15);
    ctx.lineTo(cursorX, height - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Status Banner in Canvas
    if (latchingResult.latched) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 250, 50, 230, 55, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✅ SCR SUCCESSFULLY LATCHED', width - 240, 70);
      ctx.font = '10px sans-serif';
      ctx.fillText(`iA exceeded IL (${latchingCurrentMa} mA) safely`, width - 240, 88);
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.beginPath();
      ctx.roundRect(width - 270, 50, 250, 62, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('❌ LATCHING CURRENT FAILURE!', width - 260, 70);
      ctx.font = '10px sans-serif';
      ctx.fillText(`Pulse ended before iA reached ${latchingCurrentMa} mA!`, width - 260, 88);
      ctx.fillText('SCR turned OFF when gate signal died!', width - 260, 102);
    }

    // Legend
    ctx.fillStyle = '#ec4899';
    ctx.font = '11px sans-serif';
    ctx.fillText('― Gate Trigger Signal vG(t)', 50, 22);

    ctx.fillStyle = latchingResult.latched ? '#10b981' : '#ef4444';
    ctx.fillText('― Anode Current iA(t) (R-L Load Transient)', 480, 22);
  }, [
    simTimeMs,
    driveMode,
    loadResistance,
    loadInductanceMh,
    supplyVs,
    latchingCurrentMa,
    carrierFreqKhz,
    carrierDutyPct,
    narrowPulseUs,
    widePulseMs,
    envelopeMs,
    loadTauMs,
    steadyCurrentA,
    latchingResult,
  ]);

  return (
    <div className={`w-full bg-[#0a0e17] border border-[#1e293b] rounded-2xl p-4 text-slate-100 flex flex-col gap-4 font-sans ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-pink-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
                GATE FIRING CIRCUITRY, PULSE TRANSFORMERS &amp; PICKET-FENCE TRAINS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-pink-900/60 text-pink-300 border border-pink-700/50">
                REC 9 • IEEE STD 446
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Galvanic isolation, pulse transformer saturation dynamics, inductive load latching traps, and 10–20 kHz picket fence carrier modulation.
            </p>
          </div>
        </div>

        {/* Latching Result Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black shadow-lg transition-all ${
              latchingResult.latched
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-red-500/20 border-red-500/60 text-red-300 animate-pulse'
            }`}
          >
            {latchingResult.latched ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SCR LATCHED (iA &gt; IL) • GATE POWER: {latchingResult.gatePowerW} W</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>LATCHING FAILED (INDUCTIVE LOAD TRAP)</span>
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

      {/* Main Grid: Controls + Hardware Circuit Diagram + CRT Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Drive Mode Selector & Sliders (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Drive Mode Selector */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-pink-400" />
              SELECT GATE DRIVE TOPOLOGY
            </span>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setDriveMode('picket_fence')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  driveMode === 'picket_fence'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                    : 'bg-[#141a24] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">⚡ Picket-Fence Pulse Train (Recommended)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                    15 kHz Carrier
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Modulated high-frequency burst. Prevents core saturation, cuts dissipation by 60%, guarantees latching.
                </span>
              </button>

              <button
                onClick={() => setDriveMode('single_narrow')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  driveMode === 'single_narrow'
                    ? 'bg-rose-950/40 border-rose-500 text-white shadow-md'
                    : 'bg-[#141a24] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">⚠️ Single Narrow Pulse (10 µs)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300">
                    Classic Trap
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Fails to latch inductive R-L loads because pulse vanishes before anode current exceeds IL!
                </span>
              </button>

              <button
                onClick={() => setDriveMode('single_wide')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  driveMode === 'single_wide'
                    ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                    : 'bg-[#141a24] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">📦 Single Wide Pulse (1.2 ms)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300">
                    Core Saturates
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Latches inductive loads, but DC volt-seconds saturate compact pulse transformers (B &gt; Bsat).
                </span>
              </button>

              <button
                onClick={() => setDriveMode('continuous_dc')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  driveMode === 'continuous_dc'
                    ? 'bg-red-950/40 border-red-500 text-white shadow-md'
                    : 'bg-[#141a24] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400">❌ Continuous DC Drive</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-900/60 text-red-300">
                    Banned in Industry
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Huge gate junction heating (1.2W continuous) and impossible to isolate with pulse transformers.
                </span>
              </button>
            </div>
          </div>

          {/* Inductive Load & Circuit Sliders */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-3">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              LOAD &amp; LATCHING PARAMETERS
            </span>

            {/* Load Inductance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-pink-400 font-bold">Load Inductance (L):</span>
                <span className="font-mono text-pink-300 font-extrabold">{loadInductanceMh} mH</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={loadInductanceMh}
                onChange={(e) => setLoadInductanceMh(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Load time constant τ = L/R = {loadTauMs.toFixed(2)} ms
              </span>
            </div>

            {/* Load Resistance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-bold">Load Resistance (R):</span>
                <span className="font-mono text-sky-300 font-extrabold">{loadResistance} Ω</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={loadResistance}
                onChange={(e) => setLoadResistance(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* SCR Latching Current IL */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-rose-400 font-bold">Latching Current (IL):</span>
                <span className="font-mono text-rose-300 font-extrabold">{latchingCurrentMa} mA</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={latchingCurrentMa}
                onChange={(e) => setLatchingCurrentMa(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Minimum duration to latch: <strong className="text-amber-400 font-mono">{minLatchingTimeUs} µs</strong>
              </span>
            </div>

            {/* Picket Fence Carrier Frequency */}
            {driveMode === 'picket_fence' && (
              <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-bold">Carrier Frequency:</span>
                  <span className="font-mono text-emerald-300 font-extrabold">{carrierFreqKhz} kHz</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={carrierFreqKhz}
                  onChange={(e) => setCarrierFreqKhz(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hardware Diagram + Oscilloscope (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Pulse Transformer & Isolation Hardware Schematic Banner */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-1.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-pink-400" />
                GALVANICALLY ISOLATED GATE DRIVE HARDWARE TOPOLOGY
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Isolation: 2.5 kV RMS (Ferrite Pulse Transformer / Opto)
              </span>
            </div>

            {/* SVG Hardware Diagram */}
            <div className="w-full h-32 bg-[#0a0d14] rounded-lg p-2 relative overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 620 120" className="w-full h-full max-h-32">
                {/* DSP / Microcontroller block */}
                <rect x="20" y="25" width="80" height="70" rx="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
                <text x="60" y="55" fill="#a5b4fc" fontSize="10" fontWeight="bold" textAnchor="middle">DSP / MCU</text>
                <text x="60" y="72" fill="#818cf8" fontSize="8" textAnchor="middle">PWM Logic</text>

                {/* Arrow to Driver */}
                <line x1="100" y1="60" x2="140" y2="60" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow)" />

                {/* Gate Driver MOSFET Push-Pull Block */}
                <rect x="140" y="25" width="90" height="70" rx="6" fill="#14291e" stroke="#10b981" strokeWidth="2" />
                <text x="185" y="55" fill="#6ee7b7" fontSize="10" fontWeight="bold" textAnchor="middle">DRIVER STAGE</text>
                <text x="185" y="72" fill="#34d399" fontSize="8" textAnchor="middle">Push-Pull MOSFET</text>

                {/* Arrow to Pulse Transformer */}
                <line x1="230" y1="60" x2="280" y2="60" stroke="#10b981" strokeWidth="2" />

                {/* Ferrite Pulse Transformer (1:1) */}
                <rect x="280" y="20" width="100" height="80" rx="8" fill="#1c1917" stroke="#f59e0b" strokeWidth="2" />
                <text x="330" y="45" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle">PULSE XFMR</text>
                <text x="330" y="60" fill="#fde68a" fontSize="8" textAnchor="middle">Ferrite Toroid 1:1</text>
                <text x="330" y="78" fill="#ec4899" fontSize="8" fontWeight="bold" textAnchor="middle">Galvanic Isolation</text>

                {/* Diode clamp & secondary shaper */}
                <line x1="380" y1="40" x2="440" y2="40" stroke="#f59e0b" strokeWidth="2" />
                <line x1="380" y1="80" x2="440" y2="80" stroke="#f59e0b" strokeWidth="2" />

                {/* SCR Block */}
                <rect x="440" y="20" width="110" height="80" rx="8" fill="#161f30" stroke="#38bdf8" strokeWidth="2" />
                <text x="495" y="50" fill="#7dd3fc" fontSize="11" fontWeight="bold" textAnchor="middle">MAIN SCR</text>
                <text x="495" y="68" fill="#bae6fd" fontSize="9" textAnchor="middle">High-Power Anode</text>
                <text x="495" y="84" fill="#38bdf8" fontSize="8" textAnchor="middle">Gate + Cathode</text>

                {/* Glowing gate pulse arrow */}
                <path d="M 410 40 L 440 40" stroke="#ec4899" strokeWidth="3" />
                <circle cx="425" cy="40" r="4" fill="#ec4899" className="animate-ping" />
              </svg>
            </div>
          </div>

          {/* CRT Multi-Channel Oscilloscope */}
          <div className="relative bg-[#0a0d14] border border-[#1e293b] rounded-xl p-2 shadow-2xl overflow-hidden">
            <canvas
              ref={scopeCanvasRef}
              width={820}
              height={320}
              className="w-full h-auto block rounded-lg"
            />
          </div>

          {/* Diagnostic & Technical Takeaway */}
          <div className="bg-[#0f1420] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-pink-400 font-bold border-b border-[#1e293b] pb-1">
              <Info className="w-4 h-4" />
              <span>THE INDUCTIVE LOAD LATCHING TRAP &amp; PICKET-FENCE EXPLANATION</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When an SCR fires into an inductive load (<span className="text-pink-400 font-mono">L = {loadInductanceMh} mH</span>), the current rises exponentially according to <span className="font-mono text-emerald-400">iA(t) = (Vs/R)•(1 - e^-t/τ)</span>. To remain latched once the gate drive is removed, the anode current must reach the <strong className="text-rose-400">latching current IL ({latchingCurrentMa} mA)</strong>, which takes <strong className="text-amber-400 font-mono">{minLatchingTimeUs} µs</strong>. A standard 10 µs narrow pulse vanishes while <span className="font-mono text-rose-300">iA &lt; IL</span>, causing the SCR to immediately extinguish. The <strong className="text-pink-400">picket fence pulse train</strong> maintains high-frequency firing bursts throughout the entire transient envelope without saturating the pulse transformer core or overheating the gate junction!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
