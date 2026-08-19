import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Layers, Eye, RefreshCw, Info } from 'lucide-react';
import { SoftStarterState } from '../utils/softStarterEngine';

interface StartProfileChartProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

interface DataPoint {
  t: number;        // Time (s)
  vPct: number;     // Voltage RMS (%)
  iPu: number;      // Current RMS (pu)
  wPct: number;     // Speed (%)
  tePu: number;     // Torque (pu)
  stateStr: string; // Engine state string
}

interface EventAnnotation {
  t: number;
  label: string;
  color: string;
}

/**
 * StartProfileChart.tsx - Real-time Dual Y-Axis Startup Acceleration Profile Canvas
 * 
 * Features:
 * - Dual Y-Axis: Left % (Voltage, Speed), Right pu (Current, Torque)
 * - 4 Live Glowing Traces: V_rms (cyan), I_rms (red), Speed% (green), Torque pu (amber)
 * - Event Annotations: Kickstart, I_limit active, Ramp end, KM1 bypass, Trip, Soft stop start
 * - Ghost Comparison Overlays: DOL, Star-Delta, VFD
 * - Hover Tooltip & Freeze Scope Controls
 * - 60 FPS requestAnimationFrame rendering
 */
export const StartProfileChart: React.FC<StartProfileChartProps> = ({
  engineState,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ghost Comparison Method Overlays
  const [showDol, setShowDol] = useState<boolean>(true);
  const [showStarDelta, setShowStarDelta] = useState<boolean>(true);
  const [showVfd, setShowVfd] = useState<boolean>(false);

  // Interactivity Controls
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [hoverInfo, setHoverInfo] = useState<{
    t: number;
    vPct: number;
    iPu: number;
    wPct: number;
    tePu: number;
    xScreen: number;
    yScreen: number;
  } | null>(null);

  // Historic Data Buffer (Up to 30 seconds)
  const historyRef = useRef<DataPoint[]>([]);
  const eventsRef = useRef<EventAnnotation[]>([]);
  const lastStateRef = useRef<string>('STOPPED');
  const simTimeRef = useRef<number>(0.0);

  // Record Live Physics Engine Telemetry Data Points
  useEffect(() => {
    if (isFrozen) return;

    const state = engineState?.state ?? 'STOPPED';
    const w = (engineState?.w ?? 0.0) * 100.0;
    const vPct = engineState?.VrmsPct ?? 0.0;
    const iPu = engineState?.IrmsPu ?? 0.0;
    const tePu = engineState?.Te ?? 0.0;

    // Reset history when starting fresh start
    if (lastStateRef.current === 'STOPPED' && state === 'STARTING') {
      historyRef.current = [];
      eventsRef.current = [];
      simTimeRef.current = 0.0;
      eventsRef.current.push({ t: 0.0, label: 'Start', color: '#06b6d4' });
    }

    if (state !== 'STOPPED') {
      simTimeRef.current += 0.0166; // ~16.6ms per frame
      const t = simTimeRef.current;

      // Event Annotations Trigger Detection
      if (lastStateRef.current !== 'BYPASSED' && state === 'BYPASSED') {
        eventsRef.current.push({ t, label: 'KM1 Bypass', color: '#10b981' });
      }
      if (lastStateRef.current !== 'STOPPING' && state === 'STOPPING') {
        eventsRef.current.push({ t, label: 'Soft Stop Start', color: '#f59e0b' });
      }
      if (lastStateRef.current !== 'TRIPPED' && state === 'TRIPPED') {
        eventsRef.current.push({ t, label: 'TRIP', color: '#ef4444' });
      }
      if (iPu >= 3.4 && !eventsRef.current.some((e) => e.label === 'I_limit active')) {
        eventsRef.current.push({ t, label: 'I_limit active', color: '#ef4444' });
      }

      historyRef.current.push({ t, vPct, iPu, wPct: w, tePu, stateStr: state });

      // Cap history buffer at 30 seconds (1800 points at 60Hz)
      if (historyRef.current.length > 1800) {
        historyRef.current.shift();
      }
    }

    lastStateRef.current = state;
  }, [engineState, isFrozen]);

  // Main 60 FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      const paddingLeft = 55;
      const paddingRight = 55;
      const paddingTop = 30;
      const paddingBottom = 35;

      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      // 1. Dark Industrial Slate Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw CRT Phosphor Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      // Horizontal Grid Lines (10 divisions)
      const numYDivs = 6;
      for (let i = 0; i <= numYDivs; i++) {
        const y = paddingTop + (chartHeight / numYDivs) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();

        // Left Y-Axis Label (%: 0 to 120%)
        const pctVal = Math.round(120 - (120 / numYDivs) * i);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${pctVal}%`, paddingLeft - 8, y + 3);

        // Right Y-Axis Label (pu: 0 to 7.0 pu)
        const puVal = (7.0 - (7.0 / numYDivs) * i).toFixed(1);
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText(`${puVal}pu`, width - paddingRight + 8, y + 3);
      }

      // Determine Max X Time (Auto-scale 0 to 30s)
      const data = historyRef.current;
      const maxTime = Math.max(10, Math.min(30, data.length > 0 ? data[data.length - 1].t : 10));

      // Vertical Time Grid Lines (6 divisions)
      const numXDivs = 6;
      for (let i = 0; i <= numXDivs; i++) {
        const x = paddingLeft + (chartWidth / numXDivs) * i;
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, height - paddingBottom);
        ctx.stroke();

        const tVal = ((maxTime / numXDivs) * i).toFixed(1);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${tVal}s`, x, height - 12);
      }

      // Scale Converters
      const timeToX = (t: number) => paddingLeft + (t / maxTime) * chartWidth;
      const pctToY = (pct: number) => height - paddingBottom - (pct / 120.0) * chartHeight;
      const puToY = (pu: number) => height - paddingBottom - (pu / 7.0) * chartHeight;

      // 3. Draw Ghost Method Comparison Overlays (DOL, Star-Delta, VFD)
      if (showDol) {
        // Direct-On-Line (DOL): Inrush I jumps to 6.5pu, decay as speed ramps rapidly in 2.5s
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'; // Ghost Red
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let t = 0; t <= maxTime; t += 0.1) {
          const w_dol = Math.min(1.0, t / 2.5);
          const i_dol = 6.5 * (1.0 - 0.85 * w_dol);
          const x = timeToX(t);
          const y = puToY(i_dol);
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showStarDelta) {
        // Star-Delta: I = 2.2pu in Star (t < 5s), open transition spike to 4.5pu at 5s, decay
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'; // Ghost Amber
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let t = 0; t <= maxTime; t += 0.1) {
          let i_sd = 2.2;
          if (t >= 4.9 && t <= 5.1) i_sd = 4.5; // Changeover Spike
          else if (t > 5.1) {
            const w_sd = Math.min(1.0, 0.6 + (t - 5.1) / 3.0);
            i_sd = 4.0 * (1.0 - 0.75 * w_sd);
          }
          const x = timeToX(t);
          const y = puToY(i_sd);
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showVfd) {
        // Variable Frequency Drive (VFD): Controlled I <= 1.5pu, linear smooth speed ramp
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Ghost Green
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let t = 0; t <= maxTime; t += 0.1) {
          const i_vfd = Math.min(1.4, 0.2 + t * 0.2);
          const x = timeToX(t);
          const y = puToY(i_vfd);
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw 4 Live Soft Starter Traces from Physics Engine Profile Buffer
      if (data.length > 1) {
        // Trace 1: Voltage V_rms (Cyan)
        ctx.strokeStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        data.forEach((pt, i) => {
          const x = timeToX(pt.t);
          const y = pctToY(pt.vPct);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Trace 2: Current I_rms (Red)
        ctx.strokeStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        data.forEach((pt, i) => {
          const x = timeToX(pt.t);
          const y = puToY(pt.iPu);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Trace 3: Speed % (Green)
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        data.forEach((pt, i) => {
          const x = timeToX(pt.t);
          const y = pctToY(pt.wPct);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Trace 4: Torque Te (Amber)
        ctx.strokeStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((pt, i) => {
          const x = timeToX(pt.t);
          const y = puToY(pt.tePu);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.shadowBlur = 0;
      }

      // 5. Draw Event Annotation Badges & Vertical Dashed Lines
      eventsRef.current.forEach((evt) => {
        const x = timeToX(evt.t);
        if (x >= paddingLeft && x <= width - paddingRight) {
          ctx.strokeStyle = evt.color;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, paddingTop);
          ctx.lineTo(x, height - paddingBottom);
          ctx.stroke();
          ctx.setLineDash([]);

          // Badge label
          ctx.fillStyle = evt.color;
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(evt.label, x, paddingTop - 6);
        }
      });

      // 6. Draw Hover Cursor Crosshair
      if (hoverInfo) {
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(hoverInfo.xScreen, paddingTop);
        ctx.lineTo(hoverInfo.xScreen, height - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showDol, showStarDelta, showVfd, hoverInfo, isFrozen]);

  // Mouse Move Hover Tooltip Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xMouse = e.clientX - rect.left;

    const data = historyRef.current;
    if (data.length === 0) return;

    const paddingLeft = 55;
    const paddingRight = 55;
    const chartWidth = canvas.width - paddingLeft - paddingRight;

    const maxTime = Math.max(10, Math.min(30, data[data.length - 1].t));
    const targetT = ((xMouse - paddingLeft) / chartWidth) * maxTime;

    // Find nearest data point to cursor
    let nearest = data[0];
    let minDist = Math.abs(data[0].t - targetT);

    for (let i = 1; i < data.length; i++) {
      const dist = Math.abs(data[i].t - targetT);
      if (dist < minDist) {
        minDist = dist;
        nearest = data[i];
      }
    }

    setHoverInfo({
      t: nearest.t,
      vPct: nearest.vPct,
      iPu: nearest.iPu,
      wPct: nearest.wPct,
      tePu: nearest.tePu,
      xScreen: xMouse,
      yScreen: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>📈</span> Real-Time Startup Acceleration Profile
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            Dual Y-Axis (% Voltage & Speed / pu Current & Torque) • 60 FPS Scope
          </p>
        </div>

        {/* Controls & Comparison Overlays */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          
          {/* Method Ghost Checkboxes */}
          <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-xl border border-[#334155]">
            <span className="text-[10px] text-[#64748b] uppercase font-bold">Compare:</span>
            
            <label className="flex items-center gap-1 cursor-pointer text-[#ef4444]">
              <input
                type="checkbox"
                checked={showDol}
                onChange={(e) => setShowDol(e.target.checked)}
                className="accent-[#ef4444]"
              />
              <span>DOL</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer text-[#f59e0b]">
              <input
                type="checkbox"
                checked={showStarDelta}
                onChange={(e) => setShowStarDelta(e.target.checked)}
                className="accent-[#f59e0b]"
              />
              <span>Y-Δ</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer text-[#10b981]">
              <input
                type="checkbox"
                checked={showVfd}
                onChange={(e) => setShowVfd(e.target.checked)}
                className="accent-[#10b981]"
              />
              <span>VFD</span>
            </label>
          </div>

          {/* Freeze / Live Toggle Button */}
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              isFrozen
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            {isFrozen ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#10b981]" />}
            <span>{isFrozen ? 'FREEZE HELD' : 'FREEZE LAST START'}</span>
          </button>

        </div>
      </div>

      {/* Scope Canvas Container */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <canvas
          ref={canvasRef}
          width={820}
          height={320}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-[280px] md:h-[320px] block cursor-crosshair"
        />

        {/* Live Hover Tooltip Badge */}
        {hoverInfo && (
          <div className="absolute top-3 left-16 bg-[#1e293b]/95 backdrop-blur border border-[#06b6d4] px-3 py-2 rounded-xl text-xs font-mono text-white shadow-2xl flex items-center gap-4 pointer-events-none z-30">
            <span className="text-[#06b6d4] font-bold">t = {hoverInfo.t.toFixed(2)}s</span>
            <span className="text-[#06b6d4]">V: {hoverInfo.vPct.toFixed(1)}%</span>
            <span className="text-[#ef4444]">I: {hoverInfo.iPu.toFixed(2)}pu</span>
            <span className="text-[#10b981]">ω: {hoverInfo.wPct.toFixed(1)}%</span>
            <span className="text-[#f59e0b]">Te: {hoverInfo.tePu.toFixed(2)}pu</span>
          </div>
        )}

        {/* Trace Legend Overlay */}
        <div className="absolute bottom-3 left-16 right-16 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3 py-1.5 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#06b6d4]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> V_rms (% Left)
            </span>
            <span className="flex items-center gap-1.5 text-[#ef4444]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> I_rms (pu Right)
            </span>
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Speed % (Left)
            </span>
            <span className="flex items-center gap-1.5 text-[#f59e0b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Torque (pu Right)
            </span>
          </div>

          <div className="text-[#94a3b8]">
            HOVER CURSOR TO INSPECT
          </div>
        </div>

      </div>

      {/* Physics Note */}
      <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Soft Starter Acceleration Physics
        </div>
        <p className="text-[11px] leading-relaxed">
          Soft Starter ramps voltage smoothly to suppress DOL locked-rotor inrush (6.5 pu -&gt; 3.5 pu) and eliminate Star-Delta open transition mechanical torque shocks.
        </p>
      </div>

    </div>
  );
};
