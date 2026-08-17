import React, { useEffect, useRef } from 'react';
import { SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { Activity, Gauge, LineChart } from 'lucide-react';

interface SoftStarterWaveformsProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  isRunning: boolean;
  isTrip: boolean;
}

export const SoftStarterWaveforms: React.FC<SoftStarterWaveformsProps> = ({
  params,
  readouts,
  isRunning,
  isTrip,
}) => {
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pumpCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Draw Real-time Ramped Current Trace vs DOL across 0-30s with Moving Time Cursor
  useEffect(() => {
    const canvas = currentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let timeOffset = 0;

    const render = () => {
      if (isRunning && !isTrip) {
        timeOffset += 0.1;
      } else if (!isRunning) {
        timeOffset = 0;
      }
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Dark Background #070a10
      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#121a29';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Axes & Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('CURRENT (AMPS / % FLA)', 10, 15);
      ctx.fillText('TIME (0 to 30 SECONDS)', w - 140, h - 8);

      // 800% FLA (2152A) DOL Spike Reference Line
      ctx.strokeStyle = '#451a1a';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(w, 40);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillText('800% FLA (DOL IN RUSH: 2152A)', 10, 36);

      // 100% FLA (269A) Nominal Line
      ctx.strokeStyle = '#00e5a0';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 200);
      ctx.lineTo(w, 200);
      ctx.stroke();
      ctx.fillStyle = '#00e5a0';
      ctx.fillText('100% FLA (NOMINAL LOAD: 269A)', 10, 196);
      ctx.setLineDash([]);

      // TRACE 1: DOL (Direct On Line) Spike (Red Dashed)
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (let x = 0; x < w; x++) {
        const timeSec = (x / w) * 30.0;
        let currentPct = 0;
        if (timeSec < 0.2) {
          currentPct = (timeSec / 0.2) * 800;
        } else if (timeSec < 4.0) {
          currentPct = 750 - (timeSec / 4.0) * 150;
        } else if (timeSec < 5.5) {
          currentPct = 600 - ((timeSec - 4.0) / 1.5) * 500;
        } else {
          currentPct = 100;
        }

        const y = h - 20 - (currentPct / 850) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // TRACE 2: SOFT STARTER RAMPED CURRENT (Neon Emerald Green #00e5a0)
      ctx.beginPath();
      ctx.strokeStyle = '#00e5a0';
      ctx.lineWidth = 3;
      for (let x = 0; x < w; x++) {
        const timeSec = (x / w) * 30.0;
        let currentPct = 0;

        if (params.kickStart && timeSec < 2.0) {
          currentPct = 350;
        } else if (timeSec < params.rampTimeSec) {
          const initV = params.initialVoltagePct;
          const limit = params.currentLimitPct;
          const rampProgress = timeSec / params.rampTimeSec;
          currentPct = Math.min(limit, initV * 2.5 + rampProgress * (limit - initV * 2.5));
        } else {
          currentPct = 100; // Bypass closed, 269A FLA
        }

        const y = h - 20 - (currentPct / 850) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // MOVING TIME CURSOR
      if (isRunning) {
        const cursorX = (Math.min(30, timeOffset) / 30.0) * w;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cursorX, h - 20 - (readouts.motorCurrentFLA / 850) * (h - 40), 5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isRunning, isTrip, params, readouts]);

  // 2. Draw Torque-Speed & Pump Head vs Flow (H-Q) Overlay
  useEffect(() => {
    const canvas = pumpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (params.loadType === 'CENTRIFUGAL_PUMP') {
      // PUMP H vs Q HYDRAULIC CURVE
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText('PUMP H-Q HYDRAULIC CURVE (Head 45m vs Flow 120m³/h)', 10, 15);

      // Pump Head Curve (H)
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x++) {
        const q = (x / w) * 150;
        const hVal = 65 - Math.pow(q / 150, 2) * 35;
        const y = h - 25 - (hVal / 80) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // System Resistance Curve
      ctx.beginPath();
      ctx.strokeStyle = '#00e5a0';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (let x = 0; x < w; x++) {
        const q = (x / w) * 150;
        const sysH = 15 + Math.pow(q / 150, 2) * 40;
        const y = h - 25 - (sysH / 80) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00e5a0';
      ctx.fillText('SYSTEM RESISTANCE', 180, 130);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('PUMP HEAD (H)', 180, 70);
    } else {
      // MOTOR TORQUE vs SPEED CURVE
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText('TORQUE-SPEED CHARACTERISTIC (Torque ~ V²)', 10, 15);

      // Full Voltage Torque
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x++) {
        const speed = (x / w) * 1500;
        const torque = 120 + 150 * (speed / 1500) - Math.pow(speed / 1500, 3) * 100;
        const y = h - 25 - (torque / 300) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Soft Start Reduced Voltage Torque
      ctx.beginPath();
      ctx.strokeStyle = '#00e5a0';
      ctx.lineWidth = 2.5;
      const vRatio = params.initialVoltagePct / 100;
      for (let x = 0; x < w; x++) {
        const speed = (x / w) * 1500;
        const baseT = 120 + 150 * (speed / 1500) - Math.pow(speed / 1500, 3) * 100;
        const reducedT = baseT * Math.pow(vRatio, 2);
        const y = h - 25 - (reducedT / 300) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('FULL VOLTAGE TORQUE (415V 100%)', 180, 50);
      ctx.fillStyle = '#00e5a0';
      ctx.fillText(`REDUCED VOLTAGE TORQUE (${params.initialVoltagePct}% V)`, 180, 110);
    }
  }, [params]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 select-none font-mono text-xs">
      {/* LEFT: RAMPED CURRENT COMPARISON OSCILLOSCOPE */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2 text-[#00e5a0] font-bold text-xs">
            <Activity className="w-4 h-4" />
            <span>MOTOR STARTING CURRENT PROFILE (0 to 30 SECONDS)</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-red-400 font-bold">--- DOL (2152A)</span>
            <span className="text-[#00e5a0] font-bold">--- SOFT START (269A FLA)</span>
          </div>
        </div>

        <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
          <canvas ref={currentCanvasRef} width={500} height={230} className="w-full h-[230px]" />
        </div>
      </div>

      {/* RIGHT: TORQUE-SPEED / HYDRAULIC H-Q OVERLAY */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <LineChart className="w-4 h-4" />
            <span>{params.loadType === 'CENTRIFUGAL_PUMP' ? 'CENTRIFUGAL PUMP H-Q CURVE' : 'TORQUE-SPEED CHARACTERISTIC'}</span>
          </div>
          <span className="text-[10px] text-slate-400">Torque ∝ V²</span>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden border border-[#1e293b] bg-[#070a10]">
          <canvas ref={pumpCanvasRef} width={500} height={230} className="w-full h-[230px]" />
        </div>
      </div>
    </div>
  );
};
