import React, { useEffect, useRef, useState } from 'react';
import { SoftStarterParams, SoftStarterReadouts, SoftStarterFaults } from '../types/softStarter';
import { Waves, Cpu, ArrowRight, AlertTriangle } from 'lucide-react';
import { exportWaveformToHarmonicsLab } from '../utils/waveformBus';

interface SoftStarterRightPanelProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  faults?: SoftStarterFaults;
  isRunning: boolean;
  isTrip: boolean;
  onExportToHarmonicsLab?: () => void;
}

export const SoftStarterRightPanel: React.FC<SoftStarterRightPanelProps> = ({
  params,
  readouts,
  faults,
  isRunning,
  isTrip,
  onExportToHarmonicsLab,
}) => {
  const [isPlaying] = useState<boolean>(true);

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);
  const cursorXRef = useRef<number>(0);

  const lineVolts = params.lineVoltageNominal || 415;
  const flaAmps = 269;
  const currentAmps = Math.round((readouts.motorCurrentFLA / 100) * flaAmps);
  const motorVolts = Math.round(lineVolts * (readouts.outputVoltagePct / 100));

  const firingAngleDeg = readouts.firingAngleDeg ?? (readouts.bypassClosed ? 0 : isRunning ? 67 : 180);

  // --- 1. LIVE 3-PHASE AC SCR VOLTAGE OSCILLOSCOPE (160px height) ---
  useEffect(() => {
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

      const phases = [
        { name: 'Phase A', color: '#00f0ff', shift: 0 },
        { name: 'Phase B', color: '#f59e0b', shift: (2 * Math.PI) / 3 },
        { name: 'Phase C', color: '#ef4444', shift: (4 * Math.PI) / 3 },
      ];

      phases.forEach((ph) => {
        ctx.beginPath();
        ctx.strokeStyle = ph.color;
        ctx.lineWidth = 2;

        for (let x = 0; x < w; x++) {
          const rad = (x / w) * Math.PI * 4 + t - ph.shift;
          let v = Math.sin(rad);

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

      frameId = requestAnimationFrame(renderVoltageWaveform);
    };

    renderVoltageWaveform();
    return () => cancelAnimationFrame(frameId);
  }, [readouts, firingAngleDeg, isPlaying]);

  // --- 2. LIVE 3-PHASE STATOR CURRENT OSCILLOSCOPE (160px height) ---
  useEffect(() => {
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

      const phases = [
        { name: 'I_A', color: '#00f0ff', shift: 0 },
        { name: 'I_B', color: '#f59e0b', shift: (2 * Math.PI) / 3 },
        { name: 'I_C', color: '#ef4444', shift: (4 * Math.PI) / 3 },
      ];

      phases.forEach((ph) => {
        ctx.beginPath();
        ctx.strokeStyle = ph.color;
        ctx.lineWidth = 2;

        for (let x = 0; x < w; x++) {
          const rad = (x / w) * Math.PI * 4 + t - ph.shift;
          let iVal = Math.sin(rad - Math.PI / 6);

          const posInCycle = ((rad % Math.PI) + Math.PI) % Math.PI;
          if (!readouts.bypassClosed && firingAngleDeg > 0 && posInCycle < alphaRad) {
            iVal = 0;
          }

          // IEC 60947-4-2 T1 Open / Phase Loss: Phase A current flatline to 0A
          if (ph.name === 'I_A' && (faults?.t1Open || faults?.phaseLossL1 || faults?.phaseLoss)) {
            iVal = 0;
          }

          const y = midY - iVal * iScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

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
  }, [readouts, firingAngleDeg, isPlaying]);

  return (
    <div id="ss-right-panel" className="w-full flex flex-col gap-3 font-mono text-xs select-none pr-1">
      {/* OSCILLOSCOPE CONTAINER CARD (300px total height) */}
      <div id="ss-scope" className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-2.5 shadow-xl flex flex-col gap-2 h-[300px] min-h-[300px] max-h-[300px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-1">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <Waves className="w-4 h-4 text-[#00e5a0]" />
            <span>3-PHASE SCR OSCILLOSCOPE</span>
          </div>

          <div className="bg-[#070a10] px-2 py-0.5 rounded border border-[#00e5a0]/40 text-[10px] text-slate-300">
            FIRING α: <strong className="text-[#00e5a0]">{firingAngleDeg.toFixed(0)}°</strong>
          </div>
        </div>

        {/* 1. TOP SCOPE: VOLTAGE (CHOPPED SINE, 90px height) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[9px] text-slate-300 font-semibold px-0.5">
            <span>Voltage (Chopped Sine)</span>
            <span className="text-[#00e5a0]">{motorVolts}V RMS</span>
          </div>
          <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
            <canvas ref={waveCanvasRef} width={450} height={90} className="w-full h-[90px]" />
            <div className="absolute top-1 right-2 bg-[#0d131f]/90 backdrop-blur px-1.5 py-0.5 rounded border border-[#00e5a0]/40 text-[8px] font-bold text-[#00e5a0]">
              α: {firingAngleDeg.toFixed(0)}°
            </div>
          </div>
        </div>

        {/* 2. BOTTOM SCOPE: STATOR CURRENT (CHOPPED, 90px height) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[9px] text-slate-300 font-semibold px-0.5">
            <span>Stator Current (Chopped)</span>
            <span className="text-amber-300">{currentAmps}A RMS</span>
          </div>
          <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
            <canvas ref={currentCanvasRef} width={450} height={90} className="w-full h-[90px]" />
            <div className="absolute top-1 right-2 bg-[#0d131f]/90 backdrop-blur px-1.5 py-0.5 rounded border border-[#00e5a0]/40 text-[8px] font-bold text-amber-300">
              α: {firingAngleDeg.toFixed(0)}°
            </div>
          </div>
        </div>

        {/* TRACE LEGEND: PHASE A/B/C DOTS (BLUE, ORANGE, RED) */}
        <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-0.5">
          <div className="bg-[#070a10] p-1 rounded-lg border border-[#1e293b] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" />
            <span className="text-cyan-300 font-bold">Phase A (Blue)</span>
          </div>
          <div className="bg-[#070a10] p-1 rounded-lg border border-[#1e293b] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-amber-300 font-bold">Phase B (Orange)</span>
          </div>
          <div className="bg-[#070a10] p-1 rounded-lg border border-[#1e293b] flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-red-400 font-bold">Phase C (Red)</span>
          </div>
        </div>

        {/* EXPORT WAVEFORM TO HARMONICS LAB BUTTON */}
        <button
          onClick={() => {
            const numSamples = 512;
            const samples: number[] = [];
            const alphaRad = (firingAngleDeg * Math.PI) / 180;
            const peakA = currentAmps > 0 ? currentAmps * 1.414 : 380;

            for (let i = 0; i < numSamples; i++) {
              const angleRad = (i / numSamples) * Math.PI * 4;
              const posInCycle = ((angleRad % Math.PI) + Math.PI) % Math.PI;
              let val = Math.sin(angleRad);
              if (!readouts.bypassClosed && firingAngleDeg > 0 && posInCycle < alphaRad) {
                val = 0;
              }
              samples.push(val * peakA);
            }

            exportWaveformToHarmonicsLab({
              sourceName: `Soft Starter SCR Current (α = ${firingAngleDeg.toFixed(0)}°)`,
              samples,
              firingAngleDeg: Math.round(firingAngleDeg),
              currentLimitPct: params.currentLimitPct || 300,
              fundamentalAmp: Math.round(currentAmps || 269),
              peakAmps: Math.round(peakA),
              thdPercent: firingAngleDeg > 0 ? Math.round(35 + firingAngleDeg * 0.4) : 4.5,
              harmonicSpectrum: [
                { order: 1, magnitude: Math.round(currentAmps || 269) },
                { order: 3, magnitude: Math.round((currentAmps || 269) * 0.18) },
                { order: 5, magnitude: Math.round((currentAmps || 269) * 0.28) },
                { order: 7, magnitude: Math.round((currentAmps || 269) * 0.14) },
                { order: 11, magnitude: Math.round((currentAmps || 269) * 0.08) },
                { order: 13, magnitude: Math.round((currentAmps || 269) * 0.05) },
              ],
            });

            if (onExportToHarmonicsLab) {
              onExportToHarmonicsLab();
            }
          }}
          className="w-full py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-0.5"
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Export Waveform to Harmonics Lab 🌊</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* COMPACT 2X4 LIVE MOTOR TELEMETRY GRID CARD */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-3 shadow-xl flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <Cpu className="w-4 h-4 text-[#00e5a0]" />
            <span>LIVE MOTOR TELEMETRY</span>
          </div>
        </div>

        {/* 2X4 COMPACT GRID */}
        <div id="ss-strip-chart" className="grid grid-cols-2 gap-2 text-xs">
          {/* 1. MAINS AC */}
          <div className="bg-[#070a10] p-2 rounded-xl border border-[#1e293b] flex flex-col">
            <span className="text-slate-400 text-[10px]">Mains Input:</span>
            <span className="font-extrabold text-cyan-300 text-xs">{lineVolts}V AC</span>
          </div>

          {/* 2. MOTOR TERMINAL VOLTAGE */}
          <div className="bg-[#070a10] p-2 rounded-xl border border-[#1e293b] flex flex-col">
            <span className="text-slate-400 text-[10px]">Motor Volts:</span>
            <span className="font-extrabold text-[#00e5a0] text-xs">{motorVolts}V</span>
          </div>

          {/* 3. CURRENT */}
          <div className="bg-[#070a10] p-2 rounded-xl border border-[#1e293b] flex flex-col">
            <span className="text-slate-400 text-[10px]">Current:</span>
            <span className={`font-extrabold text-xs ${currentAmps > 300 ? 'text-red-400' : 'text-amber-300'}`}>
              {currentAmps}A
            </span>
          </div>

          {/* 4. SPEED */}
          <div className="bg-[#070a10] p-2 rounded-xl border border-[#1e293b] flex flex-col">
            <span className="text-slate-400 text-[10px]">Speed:</span>
            <span className="font-extrabold text-cyan-400 text-xs">{Math.round(readouts.motorSpeedRPM)} RPM</span>
          </div>

          {/* 5. PUMP HEAD */}
          <div className="bg-[#070a10] p-2 rounded-xl border border-[#1e293b] flex flex-col">
            <span className="text-slate-400 text-[10px]">Pump Head:</span>
            <span className="font-extrabold text-[#00e5a0] text-xs">{readouts.pumpHeadMeters.toFixed(1)} m H₂O</span>
          </div>

          {/* 6. FLOW */}
          <div className="bg-[#070a10] p-2 rounded-xl border border-[#1e293b] flex flex-col">
            <span className="text-slate-400 text-[10px]">Flow:</span>
            <span className="font-extrabold text-cyan-300 text-xs">{readouts.pumpFlowM3H.toFixed(1)} m³/h</span>
          </div>

          {/* 7. MODE BADGE (RED / AMBER / GREEN / FAULT) */}
          <div className="col-span-2 p-2 rounded-xl border text-center text-xs font-extrabold shadow-sm">
            {faults?.t1Open ? (
              <span className="text-red-300 bg-red-950/90 border border-red-500/80 px-3 py-1.5 rounded-lg block flex items-center justify-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>WARNING: Phase Imbalance 130% (T1 Open)</span>
              </span>
            ) : readouts.bypassClosed ? (
              <span className="text-[#10b981] bg-[#10b981]/20 border border-emerald-500/50 px-3 py-1 rounded-lg block">
                ⚡ MODE: MOTOR BYPASSED (KM1)
              </span>
            ) : isRunning ? (
              <span className="text-amber-400 bg-amber-500/20 border border-amber-400/50 px-3 py-1 rounded-lg block animate-pulse">
                🔥 MODE: MOTOR STARTING (SCR RAMP)
              </span>
            ) : (
              <span className="text-red-400 bg-red-500/20 border border-red-500/50 px-3 py-1 rounded-lg block">
                🛑 MODE: MOTOR STOPPED
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoftStarterRightPanel;
