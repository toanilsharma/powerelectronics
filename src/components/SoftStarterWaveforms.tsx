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

  // 1. Draw Real-time Current Trace: DOL (8x FLA spike) vs Soft Start (ramped, 3x FLA max) across 0-30s
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
      }
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Dark Background
      ctx.fillStyle = '#090d12';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#1e293b';
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
      ctx.font = '10px sans-serif';
      ctx.fillText('CURRENT (% FLA)', 10, 15);
      ctx.fillText('TIME (0 to 30 SECONDS)', w - 130, h - 8);

      // 800% FLA Line
      ctx.strokeStyle = '#451a1a';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(w, 40);
      ctx.stroke();
      ctx.fillText('800% FLA (DOL SPIKE)', 10, 38);

      // 100% FLA Line
      ctx.strokeStyle = '#064e3b';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 210);
      ctx.lineTo(w, 210);
      ctx.stroke();
      ctx.fillText('100% FLA (NOMINAL)', 10, 208);
      ctx.setLineDash([]);

      // TRACE 1: DOL (Direct On Line) STARTING SPIKE (Red Dashed)
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (let x = 0; x < w; x++) {
        const timeSec = (x / w) * 30.0;
        let currentPct = 0;
        if (timeSec < 0.2) {
          currentPct = (timeSec / 0.2) * 800; // Inrush spike
        } else if (timeSec < 4.0) {
          currentPct = 750 - (timeSec / 4.0) * 150; // High locked rotor current
        } else if (timeSec < 5.5) {
          currentPct = 600 - ((timeSec - 4.0) / 1.5) * 500; // Drop to full speed
        } else {
          currentPct = 100;
        }

        const y = h - 20 - (currentPct / 850) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // TRACE 2: SOFT STARTER RAMPED CURRENT (Green Solid)
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      for (let x = 0; x < w; x++) {
        const timeSec = (x / w) * 30.0;
        let currentPct = 0;

        // Kickstart pulse check
        if (params.kickStart && timeSec < 2.0) {
          currentPct = 350;
        } else if (timeSec < params.rampTimeSec) {
          const initV = params.initialVoltagePct;
          const limit = params.currentLimitPct;
          const rampProgress = timeSec / params.rampTimeSec;
          currentPct = Math.min(limit, initV * 2.5 + rampProgress * (limit - initV * 2.5));
        } else {
          currentPct = 100; // Bypass closed, operating at FLA
        }

        const y = h - 20 - (currentPct / 850) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // CURRENT OPERATING TIME INDICATOR CURSOR
      if (isRunning) {
        const cursorX = (Math.min(30, timeOffset) / 30.0) * w;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isRunning, isTrip, params]);

  // 2. Draw Torque-Speed Curve & Pump Head vs Flow (H vs Q) Overlay
  useEffect(() => {
    const canvas = pumpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
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
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (params.loadType === 'CENTRIFUGAL PUMP') {
      // PUMP H vs Q CURVE
      ctx.fillStyle = '#06b6d4';
      ctx.font = '10px sans-serif';
      ctx.fillText('PUMP H-Q CURVE (Head vs Flow Rate)', 10, 15);

      // Pump Head Curve (H)
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x++) {
        const q = (x / w) * 150; // 0 - 150 m3/h
        const hVal = 65 - Math.pow(q / 150, 2) * 35; // Head drops with flow
        const y = h - 25 - (hVal / 80) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // System Resistance Curve
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (let x = 0; x < w; x++) {
        const q = (x / w) * 150;
        const sysH = 15 + Math.pow(q / 150, 2) * 40; // Static head + friction losses
        const y = h - 25 - (sysH / 80) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('SYSTEM RESISTANCE', 180, 130);
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('PUMP CURVE (H)', 180, 70);
    } else {
      // MOTOR TORQUE vs SPEED CURVE
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px sans-serif';
      ctx.fillText('TORQUE-SPEED CHARACTERISTIC CURVE', 10, 15);

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
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      const vRatio = params.initialVoltagePct / 100;
      for (let x = 0; x < w; x++) {
        const speed = (x / w) * 1500;
        const baseT = 120 + 150 * (speed / 1500) - Math.pow(speed / 1500, 3) * 100;
        const reducedT = baseT * Math.pow(vRatio, 2); // Torque scales with V^2
        const y = h - 25 - (reducedT / 300) * (h - 40);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('FULL VOLTAGE TORQUE (100% V)', 180, 50);
      ctx.fillStyle = '#10b981';
      ctx.fillText(`REDUCED VOLTAGE TORQUE (${params.initialVoltagePct}% V)`, 180, 110);
    }
  }, [params]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: STARTING CURRENT WAVEFORM TRACE */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            MOTOR STARTING CURRENT COMPARISON (0 to 30 SECONDS)
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-red-400 font-bold flex items-center gap-1">--- DOL (8× FLA)</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">--- SOFT START (3× FLA)</span>
          </div>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden border border-[#30363d]">
          <canvas ref={currentCanvasRef} width={500} height={230} className="w-full h-[230px] bg-[#090d12]" />
        </div>
      </div>

      {/* RIGHT: TORQUE-SPEED / PUMP H-Q OVERLAY */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <LineChart className="w-4 h-4" />
            {params.loadType === 'CENTRIFUGAL PUMP' ? 'CENTRIFUGAL PUMP H-Q HYDRAULIC CURVE' : 'MECHANICAL TORQUE-SPEED CHARACTERISTIC'}
          </div>
          <span className="text-xs text-slate-400">Torque ~ V² Proportional</span>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden border border-[#30363d]">
          <canvas ref={pumpCanvasRef} width={500} height={230} className="w-full h-[230px] bg-[#090d12]" />
        </div>
      </div>
    </div>
  );
};
