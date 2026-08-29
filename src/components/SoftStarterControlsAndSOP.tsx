import React, { useState, useEffect, useRef } from 'react';
import { LoadType, StartMode, SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { Settings, Play, Square as StopIcon, RefreshCw, Zap, ShieldCheck, Activity, Gauge, Sliders, Cpu, Layers } from 'lucide-react';
import { InteractiveSOPWizard, SOPStepItem } from './InteractiveSOPWizard';

interface SoftStarterControlsAndSOPProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  isRunning: boolean;
  isTrip: boolean;
  onUpdateParams: (newParams: Partial<SoftStarterParams>) => void;
  onStart: () => void;
  onStop: () => void;
  onJog: () => void;
}

export const SoftStarterControlsAndSOP: React.FC<SoftStarterControlsAndSOPProps> = ({
  params,
  readouts,
  isRunning,
  isTrip,
  onUpdateParams,
  onStart,
  onStop,
  onJog,
}) => {
  const motorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rampCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tripCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const initialV = params.initialVoltagePct ?? 40;
  const rampTime = params.rampTimeSec ?? 15;
  const stopTime = params.softStopTimeSec ?? 10;
  const currentLimit = params.currentLimitPct ?? 300;
  const motorKw = params.motorPowerKw ?? 160;
  const wiring = params.wiringConnection ?? 'IN_LINE';
  const loadDemand = params.systemLoadDemandPct ?? 78;
  const breakawayTorque = Math.round(Math.pow(initialV / 100, 2) * 100);

  // --- CANVAS 1: MOTOR SETUP CURVE PREVIEW (Motor Power vs Current / Efficiency) ---
  useEffect(() => {
    const canvas = motorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // In-Line Line Current vs Inside-Delta Winding Current Curves
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x++) {
      const kw = (x / w) * 500;
      const currentInLine = (kw / 160) * 100;
      const y = h - 20 - Math.min(h - 30, (currentInLine / 250) * (h - 30));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#00e5a0';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (let x = 0; x < w; x++) {
      const kw = (x / w) * 500;
      const currentDelta = (kw / 160) * 58;
      const y = h - 20 - Math.min(h - 30, (currentDelta / 250) * (h - 30));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Highlight current motorKw marker
    const markerX = (motorKw / 500) * w;
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(markerX, 0);
    ctx.lineTo(markerX, h);
    ctx.stroke();

    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(markerX, h - 20 - ((motorKw / 160) * (wiring === 'INSIDE_DELTA' ? 58 : 100) / 250) * (h - 30), 4, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0kW', 5, h - 5);
    ctx.fillText('500kW', w - 40, h - 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('In-Line (100%)', 10, 15);
    ctx.fillStyle = '#00e5a0';
    ctx.fillText('Inside-Delta (58%)', 120, 15);
  }, [motorKw, wiring]);

  // --- CANVAS 2: RAMP PROFILE LIVE CURVE PREVIEW ---
  useEffect(() => {
    const canvas = rampCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const totalSec = 40;
    const getYForV = (vPct: number) => h - 20 - (vPct / 100) * (h - 35);
    const getXForSec = (sec: number) => (sec / totalSec) * w;

    // Draw Voltage Ramp Profile
    ctx.beginPath();
    ctx.strokeStyle = '#00e5a0';
    ctx.lineWidth = 2.5;

    let startSec = 2;
    ctx.moveTo(0, getYForV(0));
    ctx.lineTo(getXForSec(startSec), getYForV(0));

    // Kickstart pulse if checked
    if (params.kickStart) {
      ctx.lineTo(getXForSec(startSec), getYForV(70));
      ctx.lineTo(getXForSec(startSec + 1), getYForV(70));
      startSec += 1;
    }

    // Initial Pedestal & Ramp
    ctx.lineTo(getXForSec(startSec), getYForV(initialV));
    const endRampSec = startSec + rampTime;
    ctx.lineTo(getXForSec(endRampSec), getYForV(100));

    // Steady state run
    const startStopSec = endRampSec + 10;
    ctx.lineTo(getXForSec(startStopSec), getYForV(100));

    // Soft Stop ramp down
    const endStopSec = startStopSec + stopTime;
    ctx.lineTo(getXForSec(endStopSec), getYForV(0));
    ctx.lineTo(w, getYForV(0));
    ctx.stroke();

    // Fill underneath ramp
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = 'rgba(0, 229, 160, 0.08)';
    ctx.fill();

    // Key points markers
    ctx.fillStyle = '#ffea00';
    ctx.font = '9px monospace';
    ctx.fillText(`V_start: ${initialV}%`, getXForSec(startSec) + 4, getYForV(initialV) - 5);
    ctx.fillText(`t_ramp: ${rampTime}s`, getXForSec(startSec + rampTime / 2) - 15, getYForV(60));
    ctx.fillText(`t_stop: ${stopTime}s`, getXForSec(startStopSec + stopTime / 2) - 15, getYForV(40));
  }, [initialV, rampTime, stopTime, params.kickStart]);

  // --- CANVAS 3: PROTECTION TRIP CURVE PREVIEW ---
  useEffect(() => {
    const canvas = tripCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#04060a';
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
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Protection Relay 50/51 Inverse Time Overcurrent Curve
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    for (let x = 10; x < w; x++) {
      const iPct = (x / w) * 600;
      if (iPct <= 105) continue;
      const tripTimeSec = 80 / Math.pow(iPct / 100 - 1, 1.2);
      const y = h - 20 - Math.min(h - 30, (tripTimeSec / 60) * (h - 30));
      if (x === 10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Set Current Limit Line (300% FLA)
    const limitX = (currentLimit / 600) * w;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(limitX, 0);
    ctx.lineTo(limitX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // System Load Demand Line (78%)
    const demandX = (loadDemand / 600) * w;
    ctx.strokeStyle = '#00e5a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(demandX, 0);
    ctx.lineTo(demandX, h);
    ctx.stroke();

    ctx.fillStyle = '#00e5a0';
    ctx.font = '9px monospace';
    ctx.fillText(`Load: ${loadDemand}%`, demandX + 4, 18);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`I_limit: ${currentLimit}%`, limitX + 4, 32);

    ctx.fillStyle = '#ef4444';
    ctx.fillText('Relay 50/51 Curve', 10, 15);
  }, [currentLimit, loadDemand]);

  const sopWizardSteps: SOPStepItem[] = [
    {
      id: 1,
      title: '1. Verify pump suction valve OPEN',
      description: 'Ensure pump suction line is flooded and suction valve fully open to prevent cavitation.',
      actionLabel: 'Confirm Suction Valve Open',
    },
    {
      id: 2,
      title: '2. Verify discharge valve CLOSED',
      description: 'Ensure discharge valve is closed to minimize initial mechanical starting torque load.',
      actionLabel: 'Confirm Discharge Closed',
    },
    {
      id: 3,
      title: '3. Set ramp time: 15 seconds',
      description: 'Configure soft starter ramp time to 15 seconds for smooth acceleration.',
      actionLabel: 'Set Ramp Time to 15s',
      onExecute: () => onUpdateParams({ rampTimeSec: 15 }),
    },
    {
      id: 4,
      title: '4. Set current limit: 300%',
      description: 'Set peak current limit clamp to 300% rated FLA to prevent voltage sag on mains.',
      actionLabel: 'Set Current Limit 300%',
      onExecute: () => onUpdateParams({ currentLimitPct: 300 }),
    },
    {
      id: 5,
      title: '5. Set initial breakaway voltage: 40%',
      description: 'Set initial voltage pedestal to 40% (166V) to overcome mechanical stiction.',
      actionLabel: 'Set Initial Volts 40%',
      onExecute: () => onUpdateParams({ initialVoltagePct: 40 }),
    },
    {
      id: 6,
      title: '6. Issue START command to soft starter',
      description: 'Trigger SCR phase-angle firing to begin voltage ramp up.',
      actionLabel: 'Issue Soft Start Command',
      onExecute: () => onStart(),
    },
    {
      id: 7,
      title: '7. Monitor motor current envelope during ramp up',
      description: 'Verify starting current stays clamped below set 300% limit.',
      actionLabel: 'Confirm Ramp Current OK',
    },
    {
      id: 8,
      title: '8. Verify bypass contactor KM1 closes at top of ramp',
      description: 'Ensure internal bypass contactor engages to bypass SCRs during steady-state run.',
      actionLabel: 'Confirm Bypass KM1 Closed',
    },
    {
      id: 9,
      title: '9. Open discharge valve slowly',
      description: 'Gradually open pump discharge valve to establish rated system hydraulic flow.',
      actionLabel: 'Confirm Discharge Valve Open',
    },
    {
      id: 10,
      title: '10. Verify motor operating current < 269A FLA',
      description: 'Confirm motor running current is stable and within nameplate 269A full-load amps.',
      actionLabel: 'Confirm FLA & Complete SOP',
    },
  ];

  return (
    <div id="ss-controls" className="flex flex-col gap-4 font-mono text-xs select-none lg:h-[calc(100vh-175px)] lg:max-h-[580px] lg:overflow-y-auto pr-1">
      {/* WORKSTATION COMMAND HEADER BAR */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded-xl text-[#00e5a0]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>SOFT STARTER WORKSTATION CONTROLS</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300">
                3-Card Modular Setup
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Spacious 44px Controls • Live Curve Previews • System Load Demand Linkage
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* PRO PROMINENT START BUTTON */}
          <button
            onClick={onStart}
            disabled={isRunning || isTrip}
            className={`min-h-[52px] px-6 py-3 rounded-2xl font-black text-sm tracking-wider flex items-center gap-3 shadow-2xl transition-all cursor-pointer border-2 ${
              isRunning
                ? 'bg-emerald-950/80 border-[#00e5a0]/40 text-[#00e5a0]/60 opacity-50 cursor-not-allowed'
                : isTrip
                ? 'bg-slate-900 border-slate-700 text-slate-500 opacity-40 cursor-not-allowed'
                : 'bg-[#00e5a0] hover:bg-[#00c98c] text-[#04060a] border-[#00ffb7] shadow-[0_0_20px_rgba(0,229,160,0.4)] hover:shadow-[0_0_25px_rgba(0,229,160,0.6)] active:scale-95'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#04060a] animate-ping" />
            <Play className="w-5 h-5 fill-current shrink-0" />
            <span>START MOTOR</span>
          </button>

          {/* PRO PROMINENT STOP BUTTON */}
          <button
            onClick={onStop}
            disabled={!isRunning}
            className={`min-h-[52px] px-6 py-3 rounded-2xl font-black text-sm tracking-wider flex items-center gap-3 shadow-2xl transition-all cursor-pointer border-2 ${
              !isRunning
                ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                : 'bg-[#ef4444] hover:bg-[#dc2626] text-white border-[#ff6b6b] shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] active:scale-95'
            }`}
          >
            <StopIcon className="w-5 h-5 fill-current shrink-0" />
            <span>STOP MOTOR</span>
          </button>

          {/* PRO PROMINENT JOG BUTTON */}
          <button
            onClick={onJog}
            disabled={isRunning || isTrip}
            className={`min-h-[52px] px-5 py-3 rounded-2xl font-black text-xs tracking-wider flex items-center gap-2.5 shadow-xl transition-all cursor-pointer border-2 ${
              isRunning || isTrip
                ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95'
            }`}
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>JOG (10% RPM)</span>
          </button>
        </div>
      </div>

      {/* 3-CARD REDESIGN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ============================================================== */}
        {/* CARD 1: MOTOR SETUP                                           */}
        {/* ============================================================== */}
        <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Cpu className="w-4 h-4" />
              <span>CARD 1: MOTOR SETUP</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
              415V Rated
            </span>
          </div>

          {/* Mains Voltage (Read-Only) */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex justify-between items-center">
            <span className="font-bold text-slate-400">MAINS VOLTAGE:</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-cyan-300">415 V AC</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">READ-ONLY</span>
            </div>
          </div>

          {/* Motor Power Slider (44px tall, accent #00e5a0) */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>MOTOR POWER:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="5"
                  value={motorKw}
                  onChange={(e) => onUpdateParams({ motorPowerKw: Math.max(10, Math.min(500, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-2 py-1 text-[#00e5a0] font-bold text-xs text-center focus:outline-none focus:border-[#00e5a0]"
                />
                <span className="text-[#00e5a0] font-mono">kW</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="5"
              value={motorKw}
              onChange={(e) => onUpdateParams({ motorPowerKw: Number(e.target.value) })}
              className="w-full h-[44px] accent-[#00e5a0] cursor-pointer bg-[#121a29] rounded-xl px-2"
            />
          </div>

          {/* Wiring Connection Toggle & Mini Diagram */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>WIRING TOPOLOGY:</span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                {wiring === 'INSIDE_DELTA' ? 'Inside Delta (58% Line)' : 'In Line (100% Line)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 h-[44px]">
              {['IN_LINE', 'INSIDE_DELTA'].map((w) => (
                <button
                  key={w}
                  onClick={() => onUpdateParams({ wiringConnection: w as any })}
                  className={`rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    wiring === w
                      ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0] shadow-md ring-1 ring-[#00e5a0]/40'
                      : 'bg-[#0d131f] border-[#1e293b] text-slate-400 hover:text-white'
                  }`}
                >
                  {w === 'IN_LINE' ? 'IN LINE' : 'INSIDE DELTA'}
                </button>
              ))}
            </div>

            {/* Mini Diagram Showing Current Comparison 58% vs 33% */}
            <div className="mt-1 p-2 bg-[#04060a] rounded-lg border border-[#1e293b] flex items-center justify-between text-[10px]">
              <div className="flex flex-col">
                <span className="text-slate-400">Current Distribution:</span>
                <span className="text-[#00e5a0] font-bold">
                  {wiring === 'INSIDE_DELTA' ? '58% Line Current / 33% Winding' : '100% Line Current / 58% Winding'}
                </span>
              </div>
              <div className="px-2 py-1 bg-[#121a29] rounded border border-[#1e293b] text-cyan-300 font-bold">
                {wiring === 'INSIDE_DELTA' ? '33% Winding' : '58% Winding'}
              </div>
            </div>
          </div>

          {/* Live Curve Preview Canvas 1 */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
              <span>LIVE MOTOR POWER & WIRING CURVE PREVIEW</span>
              <span className="text-[#00e5a0]">{motorKw}kW ({wiring})</span>
            </span>
            <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#04060a]">
              <canvas ref={motorCanvasRef} width={360} height={110} className="w-full h-[110px]" />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD 2: RAMP PROFILE                                          */}
        {/* ============================================================== */}
        <div id="ss-torque-curve" className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2 text-[#00e5a0] font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>CARD 2: RAMP PROFILE</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[#00e5a0] font-bold">
              Voltage Ramp Engine
            </span>
          </div>

          {/* Initial Voltage Vstart Slider (44px tall, accent #00e5a0) + Live Torque Preview */}
          {/* Initial Voltage Vstart Slider (44px tall, 20-80%) */}
          <div className="bg-[#070a10] p-3.5 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-200 text-xs">
              <span>INITIAL VOLTAGE (V_start):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="20"
                  max="80"
                  value={initialV}
                  onChange={(e) => onUpdateParams({ initialVoltagePct: Math.max(20, Math.min(80, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-2 py-1 text-[#00e5a0] font-bold text-xs text-center focus:outline-none focus:border-[#00e5a0]"
                />
                <span className="text-[#00e5a0] font-mono">% V</span>
              </div>
            </div>

            <input
              type="range"
              min="20"
              max="80"
              value={initialV}
              onChange={(e) => onUpdateParams({ initialVoltagePct: Number(e.target.value) })}
              className="w-full h-[44px] accent-[#00e5a0] cursor-pointer bg-[#121a29] rounded-xl px-2"
            />

            {/* Slider Min/Max Bound Labels */}
            <div className="flex justify-between text-[11px] text-slate-400 font-mono font-semibold px-1">
              <span>20% Min</span>
              <span className="text-slate-500">45% Nominal</span>
              <span>80% Max</span>
            </div>

            {/* Live Breakaway Torque Physics Consequence Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-[#04060a] rounded-xl border border-[#1e293b] text-xs gap-1">
              <span className="text-slate-400 font-medium">⚡ Computed Breakaway Torque Consequence:</span>
              <span className="text-[#00e5a0] font-extrabold text-xs">
                Te = (V/100)² = {breakawayTorque}% Rated ({Math.round(breakawayTorque * 2.69)} N·m)
              </span>
            </div>
          </div>

          {/* Accel Ramp Time Slider (44px tall, 5-30s) */}
          <div className="bg-[#070a10] p-3.5 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-200 text-xs">
              <span>ACCEL RAMP TIME (t_ramp):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={rampTime}
                  onChange={(e) => onUpdateParams({ rampTimeSec: Math.max(5, Math.min(30, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-2 py-1 text-cyan-400 font-bold text-xs text-center focus:outline-none focus:border-cyan-400"
                />
                <span className="text-cyan-400 font-mono">sec</span>
              </div>
            </div>

            <input
              type="range"
              min="5"
              max="30"
              value={rampTime}
              onChange={(e) => onUpdateParams({ rampTimeSec: Number(e.target.value) })}
              className="w-full h-[44px] accent-cyan-400 cursor-pointer bg-[#121a29] rounded-xl px-2"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono font-semibold px-1">
              <span>5s Fast</span>
              <span className="text-slate-500">15s Standard</span>
              <span>30s Max</span>
            </div>

            {/* Live Accel Time Physics Consequence Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-[#04060a] rounded-xl border border-[#1e293b] text-xs gap-1">
              <span className="text-slate-400 font-medium">⏱ Computed Motor Accel Time Consequence:</span>
              <span className="text-cyan-400 font-extrabold text-xs">
                t_accel ≈ {Math.round(rampTime * 1.25)}s (Inertia J = 1.2 kg·m²)
              </span>
            </div>
          </div>

          {/* Soft Stop Time Slider (44px tall) */}
          <div className="bg-[#070a10] p-3.5 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-200 text-xs">
              <span>SOFT STOP TIME (t_stop):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={stopTime}
                  onChange={(e) => onUpdateParams({ softStopTimeSec: Math.max(0, Math.min(60, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-2 py-1 text-purple-400 font-bold text-xs text-center focus:outline-none focus:border-purple-400"
                />
                <span className="text-purple-400 font-mono">sec</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="60"
              value={stopTime}
              onChange={(e) => onUpdateParams({ softStopTimeSec: Number(e.target.value) })}
              className="w-full h-[44px] accent-purple-400 cursor-pointer bg-[#121a29] rounded-xl px-2"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono font-semibold px-1">
              <span>0s (Coast Stop)</span>
              <span className="text-slate-500">15s Soft Stop</span>
              <span>60s Slow</span>
            </div>

            {/* Live Joukowsky Surge Physics Consequence Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-[#04060a] rounded-xl border border-[#1e293b] text-xs gap-1">
              <span className="text-slate-400 font-medium">🌊 Joukowsky Surge Head Consequence:</span>
              <span className={`font-extrabold text-xs ${stopTime === 0 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}>
                {stopTime === 0 ? 'ΔH = +92.0m H₂O (WATER HAMMER SHOCK)' : `ΔH = +${(15 / Math.max(1, stopTime) * 6.0).toFixed(1)}m H₂O (Safe PN16 Pipe)`}
              </span>
            </div>
          </div>

          {/* Kickstart Boost Checkbox & Pulse Diagram */}
          <div className="bg-[#070a10] p-3.5 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-slate-200 text-xs">KICKSTART BOOST PULSE</span>
                <span className="text-[11px] text-slate-400">Injects 70% V boost pulse for 0.5s for stiction breakaway</span>
              </div>
              <input
                type="checkbox"
                checked={params.kickStart}
                onChange={(e) => onUpdateParams({ kickStart: e.target.checked })}
                className="w-6 h-6 accent-[#00e5a0] cursor-pointer"
              />
            </div>
            {/* Pulse Diagram SVG */}
            <div className="h-7 w-full bg-[#04060a] rounded-lg border border-[#1e293b] flex items-center justify-center">
              <svg viewBox="0 0 200 30" className="w-full h-full">
                <path
                  d={params.kickStart ? 'M 10 25 L 30 25 L 30 5 L 60 5 L 60 18 L 190 18' : 'M 10 25 L 50 25 L 50 18 L 190 18'}
                  fill="none"
                  stroke={params.kickStart ? '#00e5a0' : '#475569'}
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>

          {/* Live Curve Preview Canvas 2 */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] text-slate-300 font-bold flex items-center justify-between">
              <span>LIVE VOLTAGE RAMP PROFILE PREVIEW</span>
              <span className="text-[#00e5a0]">V_start={initialV}% • Ramp={rampTime}s</span>
            </span>
            <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#04060a]">
              <canvas ref={rampCanvasRef} width={450} height={200} className="w-full h-[200px]" />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD 3: PROTECTION                                             */}
        {/* ============================================================== */}
        <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>CARD 3: PROTECTION</span>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-bold">
              Relay 50/51 Protection
            </span>
          </div>

          {/* Current Limit Slider (44px tall, accent #00e5a0) */}
          <div className="bg-[#070a10] p-3.5 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-200 text-xs">
              <span>CURRENT LIMIT (I_limit):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="250"
                  max="500"
                  step="10"
                  value={currentLimit}
                  onChange={(e) => onUpdateParams({ currentLimitPct: Math.max(250, Math.min(500, Number(e.target.value))) })}
                  className="w-18 bg-[#0d131f] border border-[#1e293b] rounded px-2 py-1 text-amber-400 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                />
                <span className="text-amber-400 font-mono">% FLA</span>
              </div>
            </div>

            <input
              type="range"
              min="250"
              max="500"
              step="10"
              value={currentLimit}
              onChange={(e) => onUpdateParams({ currentLimitPct: Number(e.target.value) })}
              className="w-full h-[44px] accent-amber-400 cursor-pointer bg-[#121a29] rounded-xl px-2"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono font-semibold px-1">
              <span>250% Min</span>
              <span className="text-slate-500">350% Standard</span>
              <span>500% Max</span>
            </div>

            {/* Live Current & Bus Dip Physics Consequence Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-[#04060a] rounded-xl border border-[#1e293b] text-xs gap-1">
              <span className="text-slate-400 font-medium">⚡ Line Current &amp; Bus Dip Consequence:</span>
              <span className="text-amber-300 font-extrabold text-xs">
                {Math.round(currentLimit * 2.69)} A ({currentLimit}% FLA) | Bus Dip ≈ {(currentLimit / 20).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* System Load Demand Slider (44px tall, accent #00e5a0) */}
          <div className="bg-[#070a10] p-3.5 rounded-xl border border-[#1e293b] flex flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-slate-200 text-xs">
              <span>SYSTEM LOAD DEMAND:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="150"
                  value={loadDemand}
                  onChange={(e) => onUpdateParams({ systemLoadDemandPct: Math.max(10, Math.min(150, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-2 py-1 text-[#00e5a0] font-bold text-xs text-center focus:outline-none focus:border-[#00e5a0]"
                />
                <span className="text-[#00e5a0] font-mono">% Load</span>
              </div>
            </div>

            <input
              type="range"
              min="10"
              max="150"
              value={loadDemand}
              onChange={(e) => onUpdateParams({ systemLoadDemandPct: Number(e.target.value) })}
              className="w-full h-[44px] accent-[#00e5a0] cursor-pointer bg-[#121a29] rounded-xl px-2"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono font-semibold px-1">
              <span>10% Light</span>
              <span className="text-slate-500">78% Rated</span>
              <span>150% Overload</span>
            </div>

            {/* Live SCR Loss Physics Consequence Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-[#04060a] rounded-xl border border-[#1e293b] text-xs gap-1">
              <span className="text-slate-400 font-medium">🔥 Computed SCR Heat Loss Consequence:</span>
              <span className="text-[#00e5a0] font-extrabold text-xs">
                P_scr = 3 × 2 × 1.2V × I = {Math.round(2160 * (loadDemand / 100))} W (Heat Loss)
              </span>
            </div>
          </div>

          {/* Protection Parameters Summary */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Overload Relay 49:</span>
              <span className="text-emerald-400 font-bold">Class 10 Thermal Model</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Instantaneous Relay 50:</span>
              <span className="text-amber-400 font-bold">500% FLA / 10ms</span>
            </div>
          </div>

          {/* Live Protection Trip Curve Preview Canvas 3 */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
              <span>LIVE PROTECTION TRIP CURVE PREVIEW</span>
              <span className="text-amber-400">Limit={currentLimit}% FLA</span>
            </span>
            <div className="relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#04060a]">
              <canvas ref={tripCanvasRef} width={360} height={110} className="w-full h-[110px]" />
            </div>
          </div>
        </div>
      </div>

      {/* EMBEDDED SOP-SS-001 CENTRIFUGAL PUMP START PROCEDURE */}
      <InteractiveSOPWizard
        sopId="SOP-SS-001"
        title="Soft Starter Centrifugal Pump Start Procedure"
        standard="IEC 60947-4-2 Referenced"
        steps={sopWizardSteps}
      />
    </div>
  );
};
