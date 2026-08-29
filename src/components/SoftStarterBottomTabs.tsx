import React, { useEffect, useRef, useState } from 'react';
import { SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Activity, Gauge, Zap, BarChart2, Layers } from 'lucide-react';

interface SoftStarterBottomTabsProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  engineState?: Partial<SoftStarterState>;
  isRunning: boolean;
  isTrip: boolean;
  learningLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

export const SoftStarterBottomTabs: React.FC<SoftStarterBottomTabsProps> = ({
  params,
  readouts,
  engineState,
  isRunning,
  isTrip,
  learningLevel = 'BEGINNER',
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'torque' | 'hq' | 'compare'>('current');

  // Canvas Refs
  const dolCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const softCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const torqueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hqCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const lineVolts = params.lineVoltageNominal || 415;
  const flaAmps = 269;
  const currentLimitPct = params.currentLimitPct || 350;
  const initialVoltagePct = params.initialVoltagePct || 40;
  const rampTimeSec = params.rampTimeSec || 15;

  const peakDolAmps = Math.round(flaAmps * 8.0); // 2152A
  const peakSoftAmps = Math.round(flaAmps * (currentLimitPct / 100)); // 900A @ 350%

  // =========================================================================
  // TAB 1: SPLIT VIEW STARTUP CURRENT (DOL vs SOFT START)
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'current') return;

    // --- 1A. LEFT CANVAS: DOL STARTUP CURRENT (2152A SPIKE) ---
    const dolCanvas = dolCanvasRef.current;
    if (dolCanvas) {
      const ctx = dolCanvas.getContext('2d');
      if (ctx) {
        const w = dolCanvas.width;
        const h = dolCanvas.height;
        const paddingLeft = 35;
        const paddingBottom = 25;
        const paddingTop = 15;
        const paddingRight = 15;
        const graphW = w - paddingLeft - paddingRight;
        const graphH = h - paddingTop - paddingBottom;

        ctx.fillStyle = '#070a10';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#121a29';
        ctx.lineWidth = 1;
        for (let y = 0; y <= 4; y++) {
          const yPos = paddingTop + (graphH / 4) * y;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, yPos);
          ctx.lineTo(w - paddingRight, yPos);
          ctx.stroke();

          const ampLabel = Math.round(2500 - (2500 / 4) * y);
          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.fillText(`${ampLabel}A`, 4, yPos + 3);
        }

        for (let x = 0; x <= 6; x++) {
          const xPos = paddingLeft + (graphW / 6) * x;
          ctx.beginPath();
          ctx.moveTo(xPos, paddingTop);
          ctx.lineTo(xPos, h - paddingBottom);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.fillText(`${x * 5}s`, xPos - 6, h - 8);
        }

        // DOL Current Curve (Red 2152A Spike at t=0s, holds 2.5s, drops to 269A)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let px = 0; px <= graphW; px++) {
          const t = (px / graphW) * 30; // 0 to 30s
          let iVal = 269; // Steady state 1.0x FLA

          if (t <= 0.2) {
            iVal = 269 + (peakDolAmps - 269) * (t / 0.2);
          } else if (t <= 2.5) {
            iVal = peakDolAmps - (peakDolAmps - 1800) * ((t - 0.2) / 2.3);
          } else if (t <= 3.2) {
            iVal = 1800 - (1800 - 269) * ((t - 2.5) / 0.7);
          } else {
            iVal = 269;
          }

          const xPos = paddingLeft + px;
          const yPos = h - paddingBottom - (iVal / 2500) * graphH;

          if (px === 0) ctx.moveTo(xPos, yPos);
          else ctx.lineTo(xPos, yPos);
        }
        ctx.stroke();

        // High Inrush Fill
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.moveTo(paddingLeft, h - paddingBottom);
        for (let px = 0; px <= graphW; px++) {
          const t = (px / graphW) * 30;
          let iVal = 269;
          if (t <= 0.2) iVal = 269 + (peakDolAmps - 269) * (t / 0.2);
          else if (t <= 2.5) iVal = peakDolAmps - (peakDolAmps - 1800) * ((t - 0.2) / 2.3);
          else if (t <= 3.2) iVal = 1800 - (1800 - 269) * ((t - 2.5) / 0.7);
          else iVal = 269;

          const xPos = paddingLeft + px;
          const yPos = h - paddingBottom - (iVal / 2500) * graphH;
          ctx.lineTo(xPos, yPos);
        }
        ctx.lineTo(paddingLeft + graphW, h - paddingBottom);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- 1B. RIGHT CANVAS: SOFT STARTER CURRENT (900A CLAMPED RAMP) ---
    const softCanvas = softCanvasRef.current;
    if (softCanvas) {
      const ctx = softCanvas.getContext('2d');
      if (ctx) {
        const w = softCanvas.width;
        const h = softCanvas.height;
        const paddingLeft = 35;
        const paddingBottom = 25;
        const paddingTop = 15;
        const paddingRight = 15;
        const graphW = w - paddingLeft - paddingRight;
        const graphH = h - paddingTop - paddingBottom;

        ctx.fillStyle = '#070a10';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#121a29';
        ctx.lineWidth = 1;
        for (let y = 0; y <= 4; y++) {
          const yPos = paddingTop + (graphH / 4) * y;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, yPos);
          ctx.lineTo(w - paddingRight, yPos);
          ctx.stroke();

          const ampLabel = Math.round(2500 - (2500 / 4) * y);
          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.fillText(`${ampLabel}A`, 4, yPos + 3);
        }

        for (let x = 0; x <= 6; x++) {
          const xPos = paddingLeft + (graphW / 6) * x;
          ctx.beginPath();
          ctx.moveTo(xPos, paddingTop);
          ctx.lineTo(xPos, h - paddingBottom);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.fillText(`${x * 5}s`, xPos - 6, h - 8);
        }

        // Soft Start Current Curve (Green 900A Clamped Ramp over 15s)
        ctx.strokeStyle = '#00e5a0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const startPedestalAmps = Math.round(peakDolAmps * (initialVoltagePct / 100));

        for (let px = 0; px <= graphW; px++) {
          const t = (px / graphW) * 30;
          let iVal = 269;

          if (t <= 0.3) {
            iVal = startPedestalAmps;
          } else if (t <= rampTimeSec) {
            // Clamped ramp at currentLimit (e.g. 900A)
            iVal = Math.min(peakSoftAmps, startPedestalAmps + (peakSoftAmps - startPedestalAmps) * (t / 3.0));
          } else if (t <= rampTimeSec + 1.0) {
            // Bypass contactor KM1 closes at end of ramp
            iVal = peakSoftAmps - (peakSoftAmps - 269) * ((t - rampTimeSec) / 1.0);
          } else {
            iVal = 269;
          }

          const xPos = paddingLeft + px;
          const yPos = h - paddingBottom - (iVal / 2500) * graphH;

          if (px === 0) ctx.moveTo(xPos, yPos);
          else ctx.lineTo(xPos, yPos);
        }
        ctx.stroke();

        // Controlled Ramp Fill
        ctx.fillStyle = 'rgba(0, 229, 160, 0.15)';
        ctx.beginPath();
        ctx.moveTo(paddingLeft, h - paddingBottom);
        for (let px = 0; px <= graphW; px++) {
          const t = (px / graphW) * 30;
          let iVal = 269;
          if (t <= 0.3) iVal = startPedestalAmps;
          else if (t <= rampTimeSec) iVal = Math.min(peakSoftAmps, startPedestalAmps + (peakSoftAmps - startPedestalAmps) * (t / 3.0));
          else if (t <= rampTimeSec + 1.0) iVal = peakSoftAmps - (peakSoftAmps - 269) * ((t - rampTimeSec) / 1.0);
          else iVal = 269;

          const xPos = paddingLeft + px;
          const yPos = h - paddingBottom - (iVal / 2500) * graphH;
          ctx.lineTo(xPos, yPos);
        }
        ctx.lineTo(paddingLeft + graphW, h - paddingBottom);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [activeTab, peakDolAmps, peakSoftAmps, initialVoltagePct, rampTimeSec]);

  // =========================================================================
  // TAB 2: TORQUE-SPEED CURVE (Te ∝ V² Kloss Approximation)
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'torque') return;

    const canvas = torqueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const paddingLeft = 40;
    const paddingBottom = 25;
    const paddingTop = 20;
    const paddingRight = 20;
    const graphW = w - paddingLeft - paddingRight;
    const graphH = h - paddingTop - paddingBottom;

    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 4; y++) {
      const yPos = paddingTop + (graphH / 4) * y;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(w - paddingRight, yPos);
      ctx.stroke();

      const tLabel = (2.5 - (2.5 / 4) * y).toFixed(1);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${tLabel} T/Tn`, 4, yPos + 3);
    }

    for (let x = 0; x <= 5; x++) {
      const xPos = paddingLeft + (graphW / 5) * x;
      ctx.beginPath();
      ctx.moveTo(xPos, paddingTop);
      ctx.lineTo(xPos, h - paddingBottom);
      ctx.stroke();

      const rpmLabel = Math.round((1500 / 5) * x);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${rpmLabel}`, xPos - 10, h - 8);
    }

    // 1. DOL Motor Torque Te(n) (Light Blue Line)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const n = (px / graphW) * 1500;
      const s = Math.max(0.001, (1500 - n) / 1500);
      const sk = 0.15;
      const teDol = (2 * 2.2) / (s / sk + sk / s);
      const xPos = paddingLeft + px;
      const yPos = h - paddingBottom - (teDol / 2.5) * graphH;
      if (px === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Soft Starter Motor Torque Te_soft(n) (Bright Blue Line Te ∝ V²)
    const vRatio = initialVoltagePct / 100;
    const vSquare = vRatio * vRatio;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const n = (px / graphW) * 1500;
      const s = Math.max(0.001, (1500 - n) / 1500);
      const sk = 0.15;
      const teBase = (2 * 2.2) / (s / sk + sk / s);
      const teSoft = teBase * (vSquare + (1 - vSquare) * (n / 1500)); // Ramp transition
      const xPos = paddingLeft + px;
      const yPos = h - paddingBottom - (teSoft / 2.5) * graphH;
      if (px === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    }
    ctx.stroke();

    // 3. Pump Load Torque TL(n) (Orange Dashed Curve)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const n = (px / graphW) * 1500;
      const tl = 0.15 + 0.85 * Math.pow(n / 1480, 2);
      const xPos = paddingLeft + px;
      const yPos = h - paddingBottom - (tl / 2.5) * graphH;
      if (px === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Net Acceleration Torque Shading (Green when Te > TL)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const n = (px / graphW) * 1500;
      const s = Math.max(0.001, (1500 - n) / 1500);
      const sk = 0.15;
      const teBase = (2 * 2.2) / (s / sk + sk / s);
      const teSoft = teBase * (vSquare + (1 - vSquare) * (n / 1500));
      const tl = 0.15 + 0.85 * Math.pow(n / 1480, 2);

      const xPos = paddingLeft + px;
      const yTe = h - paddingBottom - (teSoft / 2.5) * graphH;
      const yTl = h - paddingBottom - (tl / 2.5) * graphH;

      if (px === 0) ctx.moveTo(xPos, yTl);
      else ctx.lineTo(xPos, yTe);
    }
    ctx.lineTo(paddingLeft + graphW, h - paddingBottom);
    ctx.closePath();
    ctx.fill();
  }, [activeTab, initialVoltagePct]);

  // =========================================================================
  // TAB 3: PUMP H-Q HYDRAULIC HEAD VS FLOW CURVE
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'hq') return;

    const canvas = hqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const paddingLeft = 40;
    const paddingBottom = 25;
    const paddingTop = 20;
    const paddingRight = 20;
    const graphW = w - paddingLeft - paddingRight;
    const graphH = h - paddingTop - paddingBottom;

    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 4; y++) {
      const yPos = paddingTop + (graphH / 4) * y;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(w - paddingRight, yPos);
      ctx.stroke();

      const headLabel = Math.round(60 - (60 / 4) * y);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${headLabel}m`, 4, yPos + 3);
    }

    for (let x = 0; x <= 5; x++) {
      const xPos = paddingLeft + (graphW / 5) * x;
      ctx.beginPath();
      ctx.moveTo(xPos, paddingTop);
      ctx.lineTo(xPos, h - paddingBottom);
      ctx.stroke();

      const flowLabel = Math.round((160 / 5) * x);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${flowLabel}`, xPos - 8, h - 8);
    }

    // 1. Pump Head Curve H(Q) = 55m - 0.0007*Q^2 (Solid Cyan Curve)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const q = (px / graphW) * 160;
      const head = 55 - 0.00069 * q * q;
      const xPos = paddingLeft + px;
      const yPos = h - paddingBottom - (head / 60) * graphH;
      if (px === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    }
    ctx.stroke();

    // 2. System Resistance Curve H_sys(Q) = 15m + 0.00208*Q^2 (Green Dashed)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const q = (px / graphW) * 160;
      const hSys = 15 + 0.00208 * q * q;
      const xPos = paddingLeft + px;
      const yPos = h - paddingBottom - (hSys / 60) * graphH;
      if (px === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Operating Point Marker Dot (120 m³/h @ 45m Head)
    const opQ = 120;
    const opH = 45;
    const opX = paddingLeft + (opQ / 160) * graphW;
    const opY = h - paddingBottom - (opH / 60) * graphH;

    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(opX, opY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffea00';
    ctx.font = '10px monospace';
    ctx.fillText(`Duty Point: ${opH}m @ ${opQ}m³/h`, opX - 60, opY - 12);
  }, [activeTab]);

  return (
    <div id="ss-bottom-tabs" className="w-full bg-[#0d131f] border border-[#1e293b] rounded-2xl p-3 shadow-xl flex flex-col gap-2 font-mono select-none">
      {/* TAB NAVIGATION BAR (4 TABS) */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'current', label: '1. Startup Current', icon: Zap, minLevel: 'BEGINNER' },
            { id: 'torque', label: '2. Torque-Speed (Te ∝ V²)', icon: Gauge, minLevel: 'INTERMEDIATE' },
            { id: 'hq', label: '3. Pump H-Q', icon: Activity, minLevel: 'EXPERT' },
            { id: 'compare', label: '4. DOL / Y-Δ / VFD / Soft Comparison', icon: BarChart2, minLevel: 'EXPERT' },
          ]
            .filter((t) => {
              if (learningLevel === 'BEGINNER') return t.minLevel === 'BEGINNER';
              if (learningLevel === 'INTERMEDIATE') return t.minLevel === 'BEGINNER' || t.minLevel === 'INTERMEDIATE';
              return true;
            })
            .map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#00e5a0]/20 text-[#00e5a0] border border-[#00e5a0] shadow-[0_0_10px_rgba(0,229,160,0.3)]'
                      : 'bg-[#070a10] text-slate-400 border border-[#1e293b] hover:text-white hover:border-slate-500'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00e5a0]' : 'text-slate-400'}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* TAB CONTENT DISPLAY CONTAINER (280px HEIGHT) */}
      <div className="w-full h-[280px] min-h-[280px] max-h-[280px] overflow-hidden rounded-xl border border-[#1e293b] bg-[#04060a] p-2.5">
        {/* ========================================================================= */}
        {/* TAB 1: STARTUP CURRENT (SPLIT VIEW PRE DOL vs POST SOFT START)           */}
        {/* ========================================================================= */}
        {activeTab === 'current' && (
          <div className="w-full h-full flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-1.5 text-red-300 flex justify-between items-center">
                <span>PRE-FILTER: DOL DIRECT START (2152A PEAK)</span>
                <span className="text-red-400">UNTRAPPED INRUSH 🛑</span>
              </div>
              <div className="bg-emerald-950/40 border border-[#00e5a0]/40 rounded-lg p-1.5 text-[#00e5a0] flex justify-between items-center">
                <span>POST-FILTER: SOFT STARTER RAMP ({peakSoftAmps}A PEAK)</span>
                <span className="text-[#00e5a0]">I_soft = I_DOL × (V_start/V_nom) ✓</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
                <canvas ref={dolCanvasRef} width={450} height={210} className="w-full h-full" />
                <div className="absolute top-2 right-2 bg-red-950/90 border border-red-500/60 px-2 py-0.5 rounded text-[9px] text-red-300 font-bold">
                  DOL PEAK: 2152A (8.0× FLA)
                </div>
              </div>

              <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
                <canvas ref={softCanvasRef} width={450} height={210} className="w-full h-full" />
                <div className="absolute top-2 right-2 bg-emerald-950/90 border border-[#00e5a0]/60 px-2 py-0.5 rounded text-[9px] text-[#00e5a0] font-bold">
                  RAMP CLAMP: {peakSoftAmps}A ({currentLimitPct}% LIMIT)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TORQUE-SPEED CURVE (Te ∝ V²)                                       */}
        {/* ========================================================================= */}
        {activeTab === 'torque' && (
          <div className="w-full h-full flex flex-col gap-1.5">
            {(() => {
              const teStartPct = Math.round(150 * Math.pow(initialVoltagePct / 100, 2));
              const isStall = teStartPct < 15;

              return (
                <>
                  <div className="flex items-center justify-between bg-[#070a10] border border-[#1e293b] rounded-lg p-1.5 text-[10px]">
                    <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      <span>KLOSS APPROXIMATION: Te ∝ V² LAW (50% V_pedestal = 25% Torque)</span>
                    </span>
                    <div className="flex items-center gap-3 text-slate-300">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Motor Te ({teStartPct}% start)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Pump Load TL (15%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> Accel Torque</span>
                    </div>
                  </div>

                  <div className="relative w-full flex-1 rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
                    <canvas ref={torqueCanvasRef} width={880} height={220} className="w-full h-full" />
                    {isStall ? (
                      <div className="absolute bottom-3 right-3 bg-red-950/90 border border-red-500/80 px-2.5 py-1 rounded-lg text-[10px] text-red-300 font-extrabold animate-bounce">
                        🚨 STALL RISK: INITIAL TORQUE ({teStartPct}%) &lt; LOAD TORQUE (15%)! INCREASE V_START!
                      </div>
                    ) : (
                      <div className="absolute bottom-3 right-3 bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-1 rounded-lg text-[10px] text-[#00e5a0] font-bold">
                        Net Accel Torque T_accel = Te ({teStartPct}%) - TL (15%) &gt; 0 PASS ✓
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PUMP H-Q HYDRAULIC CURVE                                            */}
        {/* ========================================================================= */}
        {activeTab === 'hq' && (
          <div className="w-full h-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between bg-[#070a10] border border-[#1e293b] rounded-lg p-1.5 text-[10px]">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>PUMP HEAD vs FLOW (H-Q CURVE) &amp; SYSTEM RESISTANCE</span>
              </span>
              <div className="flex items-center gap-3 text-slate-300">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00f0ff]" /> Pump Head H(Q)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> System Resistance</span>
              </div>
            </div>

            <div className="relative w-full flex-1 rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10]">
              <canvas ref={hqCanvasRef} width={880} height={220} className="w-full h-full" />
              <div className="absolute top-3 right-3 bg-[#0d131f]/90 border border-cyan-500/40 px-2.5 py-1 rounded-lg text-[10px] text-cyan-300 font-bold">
                Nominal Duty: 45.0m H₂O Head @ 120 m³/h Flow
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COMPARISON MATRIX (DOL vs Y-Δ vs VFD vs SOFT STARTER)             */}
        {/* ========================================================================= */}
        {activeTab === 'compare' && (
          <div className="w-full h-full grid grid-cols-4 gap-2 text-xs">
            {/* DOL */}
            <div className="bg-[#070a10] border border-red-500/30 rounded-xl p-2.5 flex flex-col justify-between">
              <div>
                <div className="font-extrabold text-red-400 border-b border-red-500/30 pb-1 mb-2">DOL Direct</div>
                <div className="space-y-1.5 text-[10px]">
                  <div>Start Current: <strong className="text-red-400">800% (2152A)</strong></div>
                  <div>Start Torque: <strong className="text-slate-200">200%</strong></div>
                  <div>Grid Sag: <strong className="text-red-400">Severe (-15%)</strong></div>
                  <div>Water Hammer: <strong className="text-red-400">High Risk</strong></div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 bg-red-950/30 p-1 rounded text-center">Lowest Cost $100</div>
            </div>

            {/* STAR DELTA */}
            <div className="bg-[#070a10] border border-amber-500/30 rounded-xl p-2.5 flex flex-col justify-between">
              <div>
                <div className="font-extrabold text-amber-400 border-b border-amber-500/30 pb-1 mb-2">Star-Delta (Y-Δ)</div>
                <div className="space-y-1.5 text-[10px]">
                  <div>Start Current: <strong className="text-amber-400">330% (888A)</strong></div>
                  <div>Start Torque: <strong className="text-amber-300">33% (Low!)</strong></div>
                  <div>Grid Sag: <strong className="text-amber-400">Moderate (-8%)</strong></div>
                  <div>Transition Spike: <strong className="text-amber-400">High Open Spike</strong></div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 bg-amber-950/30 p-1 rounded text-center">Low Cost $250</div>
            </div>

            {/* SOFT STARTER */}
            <div className="bg-[#070a10] border border-[#00e5a0] rounded-xl p-2.5 flex flex-col justify-between shadow-[0_0_12px_rgba(0,229,160,0.15)]">
              <div>
                <div className="font-extrabold text-[#00e5a0] border-b border-[#00e5a0]/30 pb-1 mb-2 flex items-center justify-between">
                  <span>Soft Starter</span>
                  <span className="text-[9px] bg-[#00e5a0]/20 px-1.5 py-0.5 rounded text-[#00e5a0]">SELECTED</span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div>Start Current: <strong className="text-[#00e5a0]">300-350% ({peakSoftAmps}A)</strong></div>
                  <div>Start Torque: <strong className="text-cyan-300">30-80% (Smooth)</strong></div>
                  <div>Grid Sag: <strong className="text-[#00e5a0]">Low (-3%)</strong></div>
                  <div>Water Hammer: <strong className="text-[#00e5a0]">Prevented ✓</strong></div>
                </div>
              </div>
              <div className="text-[10px] text-[#00e5a0] bg-emerald-950/40 p-1 rounded text-center font-bold">Optimal Cost $600</div>
            </div>

            {/* VFD */}
            <div className="bg-[#070a10] border border-cyan-500/30 rounded-xl p-2.5 flex flex-col justify-between">
              <div>
                <div className="font-extrabold text-cyan-400 border-b border-cyan-500/30 pb-1 mb-2">VFD Drive</div>
                <div className="space-y-1.5 text-[10px]">
                  <div>Start Current: <strong className="text-cyan-300">100% (269A)</strong></div>
                  <div>Start Torque: <strong className="text-cyan-300">150% Full</strong></div>
                  <div>Grid Sag: <strong className="text-cyan-300">Minimal (&lt;1%)</strong></div>
                  <div>Harmonics: <strong className="text-amber-400">High THD (30%)</strong></div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 bg-cyan-950/30 p-1 rounded text-center">High Cost $2500</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoftStarterBottomTabs;
