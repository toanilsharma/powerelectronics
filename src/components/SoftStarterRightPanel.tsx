import React, { useEffect, useRef, useState } from 'react';
import { SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { Waves, Activity, Zap, Play, Pause, Cpu, ShieldCheck, Flame, Gauge } from 'lucide-react';

interface SoftStarterRightPanelProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  isRunning: boolean;
  isTrip: boolean;
}

export const SoftStarterRightPanel: React.FC<SoftStarterRightPanelProps> = ({
  params,
  readouts,
  isRunning,
  isTrip,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [rightTab, setRightTab] = useState<'waveforms' | 'torque'>('waveforms');

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const torqueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

  const lineVolts = params.lineVoltageNominal || 415;
  const motorKw = params.motorPowerKw || 160;
  // Calculate Full Load Amps (FLA): I_fla = P / (sqrt(3) * V * pf * eff)
  const flaAmps = Math.round((motorKw * 1000) / (Math.sqrt(3) * lineVolts * 0.88 * 0.94));
  const currentAmps = Math.round((readouts.motorCurrentFLA / 100) * flaAmps);

  // Derived SCR Firing Angle (alpha): 180 deg when stopped, ramping down to 0 deg when bypass closes
  const firingAngleDeg = readouts.bypassClosed
    ? 0
    : isRunning
    ? Math.max(0, Math.round(180 - (readouts.outputVoltagePct / 100) * 180))
    : 180;

  // --- 1. LIVE 3-PHASE AC SCR VOLTAGE & PHASE-CHOPPED CURRENT WAVEFORMS ---
  useEffect(() => {
    if (rightTab !== 'waveforms') return;
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

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 15; y < h; y += 30) {
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

      if (isPlaying && isRunning && !isTrip) {
        timeRef.current += 0.06;
      }
      const t = timeRef.current;

      const alphaRad = (firingAngleDeg * Math.PI) / 180;
      const vScale = h * 0.35 * (readouts.outputVoltagePct / 100);

      // Phase A Voltage (Cyan)
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 + t;
        let vA = Math.sin(rad);

        // Phase-angle chopping effect during SCR firing
        const posInCycle = ((rad % Math.PI) + Math.PI) % Math.PI;
        if (!readouts.bypassClosed && posInCycle < alphaRad) {
          vA = 0;
        }

        const y = midY - vA * vScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Phase B Voltage (Amber - 120 deg shifted)
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 + t - (2 * Math.PI) / 3;
        let vB = Math.sin(rad);

        const posInCycle = ((rad % Math.PI) + Math.PI) % Math.PI;
        if (!readouts.bypassClosed && posInCycle < alphaRad) {
          vB = 0;
        }

        const y = midY - vB * vScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Phase C Voltage (Pink - 240 deg shifted)
      ctx.beginPath();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x++) {
        const rad = (x / w) * Math.PI * 4 + t - (4 * Math.PI) / 3;
        let vC = Math.sin(rad);

        const posInCycle = ((rad % Math.PI) + Math.PI) % Math.PI;
        if (!readouts.bypassClosed && posInCycle < alphaRad) {
          vC = 0;
        }

        const y = midY - vC * vScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      frameId = requestAnimationFrame(renderWaveforms);
    };

    renderWaveforms();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [readouts, firingAngleDeg, isRunning, isTrip, isPlaying, rightTab]);

  // --- 2. TORQUE-SPEED & DOL VS SOFT START COMPARISON CANVAS ---
  useEffect(() => {
    if (rightTab !== 'torque') return;
    const canvas = torqueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText('TORQUE % / CURRENT % vs MOTOR SPEED (0 to 1480 RPM)', 10, 14);

    // DOL 800% Current Curve (Dashed Red)
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    for (let x = 0; x < w; x++) {
      const nRatio = x / w;
      let dolCurrPct = 750 - nRatio * 200;
      if (nRatio > 0.85) dolCurrPct = 550 - (nRatio - 0.85) * 3000;
      dolCurrPct = Math.max(100, dolCurrPct);

      const y = h - 20 - (dolCurrPct / 800) * (h - 40);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Soft Start Clamped Current Curve (Solid Emerald Green)
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2.5;
    for (let x = 0; x < w; x++) {
      const nRatio = x / w;
      let ssCurrPct = Math.min(params.currentLimitPct, params.initialVoltagePct * 3.5 + nRatio * 150);
      if (nRatio > 0.85) ssCurrPct = params.currentLimitPct - (nRatio - 0.85) * ((params.currentLimitPct - 100) / 0.15);
      ssCurrPct = Math.max(100, ssCurrPct);

      const y = h - 20 - (ssCurrPct / 800) * (h - 40);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Motor Speed Operating Point Indicator
    const speedX = (readouts.motorSpeedRPM / 1480) * w;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(speedX, 20);
    ctx.lineTo(speedX, h - 20);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(speedX, h - 20 - (readouts.motorCurrentFLA / 800) * (h - 40), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(`${readouts.motorSpeedRPM} RPM`, Math.min(w - 60, Math.max(10, speedX - 20)), 28);
  }, [params, readouts, rightTab]);

  return (
    <div className="w-full flex flex-col gap-3.5 font-mono text-xs">
      {/* 3-PHASE SCR VOLTAGE & CURRENT OSCILLOSCOPE CARD */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 shadow-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span>SCR OSCILLOSCOPE & FIRING ANGLE</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightTab('waveforms')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                rightTab === 'waveforms'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-[#21262d] border-[#30363d] text-slate-400'
              }`}
            >
              3-Phase AC
            </button>
            <button
              onClick={() => setRightTab('torque')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                rightTab === 'torque'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-[#21262d] border-[#30363d] text-slate-400'
              }`}
            >
              τ-n Curve
            </button>
          </div>
        </div>

        {/* CANVAS DISPLAY */}
        <div className="relative w-full rounded-lg overflow-hidden border border-[#30363d] bg-[#090d12]">
          {rightTab === 'waveforms' ? (
            <canvas ref={waveCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          ) : (
            <canvas ref={torqueCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          )}

          {/* FIRING ANGLE OVERLAY */}
          <div className="absolute top-2 right-2 bg-[#0d1117]/85 backdrop-blur px-2.5 py-1 rounded border border-[#30363d] text-[10px] flex items-center gap-2">
            <span className="text-slate-400">FIRING ANGLE α:</span>
            <span className="font-bold text-amber-400">{firingAngleDeg}°</span>
          </div>
        </div>

        {/* TRACE LEGEND */}
        <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-0.5">
          <div className="bg-[#0d1117] p-1.5 rounded border border-[#21262d] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" />
            <span className="text-cyan-300 font-bold">Phase A</span>
          </div>
          <div className="bg-[#0d1117] p-1.5 rounded border border-[#21262d] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-amber-300 font-bold">Phase B</span>
          </div>
          <div className="bg-[#0d1117] p-1.5 rounded border border-[#21262d] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
            <span className="text-red-300 font-bold">Phase C</span>
          </div>
        </div>
      </div>

      {/* MOTOR ELECTRICAL & THERMAL TELEMETRY CARD */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>MOTOR ELECTRICAL TELEMETRY</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 border ${
              readouts.bypassClosed
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : isRunning
                ? 'bg-amber-950 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-[#21262d] border-slate-700 text-slate-400'
            }`}
          >
            {readouts.bypassClosed ? 'KM1 BYPASS RUN' : isRunning ? 'SCR RAMPING' : 'STOPPED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* MAINS VOLTAGE */}
          <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">LINE VOLTAGE (V_line)</span>
            <div className="flex items-baseline justify-between">
              <span className="font-extrabold text-cyan-300 text-sm">{lineVolts} V AC</span>
              <span className="text-[10px] text-slate-500">{(params.wiringConnection || 'IN_LINE').replace('_', ' ')}</span>
            </div>
          </div>

          {/* RATED POWER */}
          <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">MOTOR POWER RATING</span>
            <div className="flex items-baseline justify-between">
              <span className="font-extrabold text-emerald-400 text-sm">{motorKw} kW</span>
              <span className="text-[10px] text-slate-500">FLA: {flaAmps} A</span>
            </div>
          </div>

          {/* MOTOR CURRENT */}
          <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">MOTOR CURRENT</span>
            <div className="flex items-baseline justify-between">
              <span className={`font-extrabold text-sm ${readouts.motorCurrentFLA > 300 ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentAmps} A
              </span>
              <span className="text-[10px] text-slate-500">{readouts.motorCurrentFLA}% FLA</span>
            </div>
          </div>

          {/* SPEED RPM */}
          <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">MOTOR SPEED</span>
            <div className="flex items-baseline justify-between">
              <span className="font-extrabold text-cyan-400 text-sm">{readouts.motorSpeedRPM} RPM</span>
              <span className="text-[10px] text-slate-500">4-Pole (1500 Syn)</span>
            </div>
          </div>
        </div>

        {/* HYDRAULIC PUMP READOUTS */}
        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Pump Head:</span>
            <span className="font-bold text-cyan-300">{readouts.pumpHeadMeters} m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Pump Flow:</span>
            <span className="font-bold text-emerald-300">{readouts.pumpFlowM3H} m³/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
