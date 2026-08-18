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
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);
  const cursorXRef = useRef<number>(0);

  const lineVolts = params.lineVoltageNominal || 415;
  const motorKw = params.motorPowerKw || 160;
  // 269A FLA Nominal for 160kW 415V motor
  const flaAmps = 269;
  const currentAmps = Math.round((readouts.motorCurrentFLA / 100) * flaAmps);
  const motorVolts = Math.round(lineVolts * (readouts.outputVoltagePct / 100));

  const firingAngleDeg = readouts.firingAngleDeg ?? (readouts.bypassClosed ? 0 : isRunning ? 67 : 180);

  // --- 1. LIVE 3-PHASE AC SCR VOLTAGE OSCILLOSCOPE WITH SWEEPING TIME CURSOR ---
  useEffect(() => {
    if (rightTab !== 'waveforms') return;
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const renderVoltageWaveform = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#121a29';
      ctx.lineWidth = 1;
      for (let y = 15; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      if (isPlaying) {
        timeRef.current += 0.05;
        cursorXRef.current = (cursorXRef.current + 2) % w;
      }
      const t = timeRef.current;

      const alphaRad = (firingAngleDeg * Math.PI) / 180;
      const vScale = h * 0.38 * (readouts.outputVoltagePct / 100);

      // Render 3 Phases (A: Cyan, B: Amber, C: Pink)
      const phases = [
        { name: 'Phase A', color: '#00f0ff', shift: 0 },
        { name: 'Phase B', color: '#f59e0b', shift: (2 * Math.PI) / 3 },
        { name: 'Phase C', color: '#f43f5e', shift: (4 * Math.PI) / 3 },
      ];

      phases.forEach((ph) => {
        ctx.beginPath();
        ctx.strokeStyle = ph.color;
        ctx.lineWidth = 2;

        for (let x = 0; x < w; x++) {
          const rad = (x / w) * Math.PI * 4 + t - ph.shift;
          let v = Math.sin(rad);

          // Phase-Angle Chopping Effect during SCR Firing
          const posInCycle = ((rad % Math.PI) + Math.PI) % Math.PI;
          if (!readouts.bypassClosed && firingAngleDeg > 0 && posInCycle < alphaRad) {
            v = 0;
          }

          const y = midY - v * vScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // SWEEPING TIME CURSOR
      const cx = cursorXRef.current;
      ctx.strokeStyle = '#00e5a0';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Time cursor label dot
      ctx.fillStyle = '#00e5a0';
      ctx.beginPath();
      ctx.arc(cx, midY, 4, 0, Math.PI * 2);
      ctx.fill();

      frameId = requestAnimationFrame(renderVoltageWaveform);
    };

    renderVoltageWaveform();

    return () => cancelAnimationFrame(frameId);
  }, [readouts, firingAngleDeg, isPlaying, rightTab]);

  // --- 2. LIVE 3-PHASE STATOR CURRENT OSCILLOSCOPE WITH SWEEPING TIME CURSOR ---
  useEffect(() => {
    if (rightTab !== 'torque') return;
    const canvas = currentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const renderCurrentWaveform = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#121a29';
      ctx.lineWidth = 1;
      for (let y = 15; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      if (isPlaying) {
        timeRef.current += 0.05;
        cursorXRef.current = (cursorXRef.current + 2) % w;
      }
      const t = timeRef.current;

      const alphaRad = (firingAngleDeg * Math.PI) / 180;
      const iScale = h * 0.38 * (readouts.motorCurrentFLA / 100);

      // Render 3-Phase Phase-Chopped Currents
      const phases = [
        { name: 'I_A', color: '#00f0ff', shift: 0 },
        { name: 'I_B', color: '#f59e0b', shift: (2 * Math.PI) / 3 },
        { name: 'I_C', color: '#f43f5e', shift: (4 * Math.PI) / 3 },
      ];

      phases.forEach((ph) => {
        ctx.beginPath();
        ctx.strokeStyle = ph.color;
        ctx.lineWidth = 2;

        for (let x = 0; x < w; x++) {
          const rad = (x / w) * Math.PI * 4 + t - ph.shift;
          let iVal = Math.sin(rad - Math.PI / 6); // Lagging current angle

          const posInCycle = ((rad % Math.PI) + Math.PI) % Math.PI;
          if (!readouts.bypassClosed && firingAngleDeg > 0 && posInCycle < alphaRad) {
            iVal = 0;
          }

          const y = midY - iVal * iScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // SWEEPING TIME CURSOR
      const cx = cursorXRef.current;
      ctx.strokeStyle = '#00e5a0';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00e5a0';
      ctx.beginPath();
      ctx.arc(cx, midY, 4, 0, Math.PI * 2);
      ctx.fill();

      frameId = requestAnimationFrame(renderCurrentWaveform);
    };

    renderCurrentWaveform();

    return () => cancelAnimationFrame(frameId);
  }, [readouts, firingAngleDeg, isPlaying, rightTab]);

  return (
    <div className="w-full flex flex-col gap-3.5 font-mono text-xs select-none lg:h-[calc(100vh-175px)] lg:max-h-[580px] lg:overflow-y-auto pr-1">
      {/* OSCILLOSCOPE CONTAINER CARD */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
          <div className="flex items-center gap-2 font-bold text-white">
            <Waves className="w-4 h-4 text-[#00e5a0]" />
            <span>3-PHASE SCR OSCILLOSCOPE</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRightTab('waveforms')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                rightTab === 'waveforms'
                  ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0]'
                  : 'bg-[#121a29] border-[#1e293b] text-slate-400 hover:text-white'
              }`}
            >
              Voltage (Chopped Sine)
            </button>
            <button
              onClick={() => setRightTab('torque')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                rightTab === 'torque'
                  ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0]'
                  : 'bg-[#121a29] border-[#1e293b] text-slate-400 hover:text-white'
              }`}
            >
              Stator Current (Chopped)
            </button>
          </div>
        </div>

        {/* CANVAS DISPLAY WITH REAL CHOPPED SINE WAVES & TIME CURSOR */}
        <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
          {rightTab === 'waveforms' ? (
            <canvas id="acCanvas" ref={waveCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          ) : (
            <canvas id="acCanvas" ref={currentCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          )}

          {/* FIRING ANGLE & TELEMETRY OVERLAY BADGE */}
          <div className="absolute top-2 right-2 bg-[#0d131f]/90 backdrop-blur px-2.5 py-1 rounded-lg border border-[#00e5a0]/40 text-[10px] flex items-center gap-2">
            <span className="text-slate-400">FIRING α:</span>
            <span className="font-extrabold text-[#00e5a0]">{firingAngleDeg}°</span>
          </div>

          <div className="absolute bottom-2 left-2 bg-[#0d131f]/90 backdrop-blur px-2.5 py-1 rounded-lg border border-[#1e293b] text-[9px] text-slate-400 flex items-center gap-3">
            <span>Input: <strong className="text-cyan-300">415V</strong></span>
            <span>Motor V: <strong className="text-[#00e5a0]">{motorVolts}V</strong></span>
            <span>Current: <strong className="text-amber-300">{currentAmps}A</strong></span>
          </div>
        </div>

        {/* TRACE LEGEND */}
        <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-0.5">
          <div className="bg-[#070a10] p-1.5 rounded-lg border border-[#1e293b] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" />
            <span className="text-cyan-300 font-bold">Phase A</span>
          </div>
          <div className="bg-[#070a10] p-1.5 rounded-lg border border-[#1e293b] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-amber-300 font-bold">Phase B</span>
          </div>
          <div className="bg-[#070a10] p-1.5 rounded-lg border border-[#1e293b] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
            <span className="text-red-300 font-bold">Phase C</span>
          </div>
        </div>
      </div>

      {/* MOTOR TELEMETRY READOUT CARD */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <Cpu className="w-4 h-4 text-[#00e5a0]" />
            <span>LIVE MOTOR TELEMETRY</span>
          </div>
        </div>

        {/* EXPLICIT MOTOR OPERATIONAL MODE CARD */}
        <div
          className={`w-full p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-between shadow-md ${
            readouts.bypassClosed
              ? 'bg-emerald-950/90 border-[#00e5a0] text-[#00e5a0]'
              : isRunning
              ? 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse'
              : 'bg-[#070a10] border-[#1e293b] text-slate-400'
          }`}
        >
          <span>
            {readouts.bypassClosed
              ? '⚡ MODE: MOTOR RUNNING ON BYPASS (KM1)'
              : isRunning
              ? '🔥 MODE: MOTOR RUNNING ON SOFT STARTER (SCR RAMP)'
              : '🛑 MODE: MOTOR STOPPED (0 RPM)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* MAINS VOLTAGE */}
          <div className="bg-[#070a10] p-2.5 rounded-xl border border-[#1e293b] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">MAINS INPUT VOLTAGE</span>
            <div className="flex items-baseline justify-between">
              <span className="font-extrabold text-cyan-300 text-sm">{lineVolts} V AC</span>
              <span className="text-[10px] text-slate-500">415V Nominal</span>
            </div>
          </div>

          {/* MOTOR OUTPUT VOLTAGE */}
          <div className="bg-[#070a10] p-2.5 rounded-xl border border-[#1e293b] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">MOTOR TERMINAL V</span>
            <div className="flex items-baseline justify-between">
              <span className="font-extrabold text-[#00e5a0] text-sm">{motorVolts} V</span>
              <span className="text-[10px] text-slate-500">{readouts.outputVoltagePct.toFixed(0)}% V</span>
            </div>
          </div>

          {/* MOTOR STATOR CURRENT */}
          <div className="bg-[#070a10] p-2.5 rounded-xl border border-[#1e293b] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">STATOR CURRENT (FLA)</span>
            <div className="flex items-baseline justify-between">
              <span className={`font-extrabold text-sm ${readouts.motorCurrentFLA > 300 ? 'text-red-400' : 'text-amber-300'}`}>
                {currentAmps} A
              </span>
              <span className="text-[10px] text-slate-500">FLA: 269 A</span>
            </div>
          </div>

          {/* MOTOR SPEED */}
          <div className="bg-[#070a10] p-2.5 rounded-xl border border-[#1e293b] flex flex-col gap-0.5">
            <span className="text-slate-400 text-[10px]">MOTOR SPEED</span>
            <div className="flex items-baseline justify-between">
              <span className="font-extrabold text-cyan-400 text-sm">{Math.round(readouts.motorSpeedRPM)} RPM</span>
              <span className="text-[10px] text-slate-500">1480 Rated</span>
            </div>
          </div>
        </div>

        {/* HYDRAULIC READOUTS */}
        <div className="bg-[#070a10] p-2.5 rounded-xl border border-[#1e293b] grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[10px]">Pump Head:</span>
            <span className="font-bold text-[#00e5a0]">{readouts.pumpHeadMeters.toFixed(1)} m H₂O</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[10px]">Pump Flow:</span>
            <span className="font-bold text-cyan-300">{readouts.pumpFlowM3H.toFixed(1)} m³/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
