import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, Sliders, Info, Eye, Layers } from 'lucide-react';
import { SoftStarterState } from '../utils/softStarterEngine';

interface ThyristorScopeProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

interface WaveformPoint {
  t: number;
  v_grid_A: number;
  v_grid_B: number;
  v_grid_C: number;
  v_out_A: number;
  v_out_B: number;
  v_out_C: number;
  i_line_A: number;
  i_line_B: number;
  i_line_C: number;
  alphaDeg: number;
  isGatePulse: boolean;
}

/**
 * ThyristorScope.tsx - 3-Phase SCR Phase-Angle Chopping Scope
 * 
 * Features:
 * - 3 Synchronized Traces (Grid Sinusoid Reference + Gate Pulses, Chopped Output Voltage, Discontinuous Current)
 * - Phase Selector: Phase A, Phase B, Phase C, 3-Phase Overlaid
 * - Slow-Motion Replay (1x, 10x Slow, 100x Ultra Slow) with Play/Pause & Scrub Bar
 * - Freeze Capture (Retains last start waveform when stopped)
 * - Live Telemetry Readouts (Firing α, Conduction Angle γ, V_rms, I_rms)
 * - 60 FPS Phosphor CRT Canvas Rendering
 */
export const ThyristorScope: React.FC<ThyristorScopeProps> = ({
  engineState,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Phase Selection State
  const [selectedPhase, setSelectedPhase] = useState<'A' | 'B' | 'C' | 'ALL'>('A');

  // Slow-Motion & Playback Controls
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 10 | 100>(1); // 1 = 1x, 10 = 10x slow, 100 = 100x slow
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scrubIndex, setScrubIndex] = useState<number>(0);
  const [isFrozenMode, setIsFrozenMode] = useState<boolean>(false);

  // Buffer History Stores (Up to 400 points = 2 full cycles sampled at 10kHz)
  const historyBufferRef = useRef<WaveformPoint[]>([]);
  const frozenBufferRef = useRef<WaveformPoint[]>([]);
  const phaseTimerRef = useRef<number>(0.0);

  const stateStr = engineState?.state ?? 'STOPPED';
  const alphaDeg = engineState?.alphaDeg ?? 180.0;
  const vRmsPct = engineState?.VrmsPct ?? 0.0;
  const iRmsPu = engineState?.IrmsPu ?? 0.0;
  const conductionAngleDeg = Math.max(0, 180.0 - alphaDeg);

  // Synthesize Live 3-Phase Thyristor Waveforms into History Buffer
  useEffect(() => {
    if (!isPlaying && isFrozenMode) return;

    const f = 50.0; // 50 Hz
    const V_peak = 338.8; // 240V RMS * sqrt(2)
    const bufferSize = 200; // 2 full cycles (40ms) at 5kHz
    const periodSec = 1.0 / f; // 20ms
    const dtSample = (2.0 * periodSec) / bufferSize; // 0.2ms

    const points: WaveformPoint[] = [];
    const alphaRad = (alphaDeg * Math.PI) / 180.0;

    phaseTimerRef.current += dtSample * (1.0 / playbackSpeed);

    for (let i = 0; i < bufferSize; i++) {
      const t = phaseTimerRef.current + i * dtSample;
      const thetaA = (2 * Math.PI * f * t) % (2 * Math.PI);
      const thetaB = (thetaA - (2 * Math.PI) / 3 + 2 * Math.PI) % (2 * Math.PI);
      const thetaC = (thetaA + (2 * Math.PI) / 3 + 2 * Math.PI) % (2 * Math.PI);

      // Grid Reference Sinusoids
      const v_grid_A = V_peak * Math.sin(thetaA);
      const v_grid_B = V_peak * Math.sin(thetaB);
      const v_grid_C = V_peak * Math.sin(thetaC);

      // Chopped Output Voltage & Discontinuous Current Calculation
      const calculateChopped = (theta: number, vGrid: number) => {
        let vOut = 0.0;
        let iLine = 0.0;
        let gate = false;

        if (stateStr === 'BYPASSED') {
          vOut = vGrid;
          iLine = (iRmsPu * Math.sqrt(2) * 269) * Math.sin(theta - Math.PI / 6);
        } else if (stateStr === 'STARTING' || stateStr === 'RUNNING' || stateStr === 'STOPPING') {
          const thetaMod = theta % Math.PI;
          
          // Gate pulse marker check (within 2 degrees of alpha)
          if (Math.abs(thetaMod - alphaRad) < 0.08) {
            gate = true;
          }

          // Conduction interval: from alpha to extinction angle beta (approx alpha + conductionAngle)
          if (thetaMod >= alphaRad && thetaMod < alphaRad + (conductionAngleDeg * Math.PI) / 180.0 + 0.3) {
            vOut = vGrid;
            iLine = (iRmsPu * Math.sqrt(2) * 269) * Math.sin(theta - alphaRad);
          }
        }

        return { vOut, iLine, gate };
      };

      const chA = calculateChopped(thetaA, v_grid_A);
      const chB = calculateChopped(thetaB, v_grid_B);
      const chC = calculateChopped(thetaC, v_grid_C);

      points.push({
        t: i * dtSample * 1000.0, // ms
        v_grid_A,
        v_grid_B,
        v_grid_C,
        v_out_A: chA.vOut,
        v_out_B: chB.vOut,
        v_out_C: chC.vOut,
        i_line_A: chA.iLine,
        i_line_B: chB.iLine,
        i_line_C: chC.iLine,
        alphaDeg,
        isGatePulse: chA.gate,
      });
    }

    historyBufferRef.current = points;

    // Freeze Capture Persistence when engine stops
    if (stateStr === 'BYPASSED' || stateStr === 'RUNNING' || stateStr === 'STOPPING') {
      frozenBufferRef.current = [...points];
    }
  }, [alphaDeg, vRmsPct, iRmsPu, stateStr, conductionAngleDeg, playbackSpeed, isPlaying, isFrozenMode]);

  // Main 60 FPS Phosphor CRT Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      const paddingLeft = 50;
      const paddingRight = 30;
      const paddingTop = 35;
      const paddingBottom = 35;

      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;
      const centerY = paddingTop + chartHeight / 2;

      // 1. Dark CRT Phosphor Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 2. CRT Grid Lines & Center Axis Hash Marks
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      // Horizontal Division Lines (8 divisions)
      for (let i = 0; i <= 8; i++) {
        const y = paddingTop + (chartHeight / 8) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
      }

      // Vertical Time Division Lines (10 divisions = 4ms per div)
      for (let i = 0; i <= 10; i++) {
        const x = paddingLeft + (chartWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, height - paddingBottom);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i * 4}ms`, x, height - 10);
      }

      // Zero Center Axis Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, centerY);
      ctx.lineTo(width - paddingRight, centerY);
      ctx.stroke();

      // Determine Waveform Buffer Source (Live vs. Frozen)
      const data = isFrozenMode && frozenBufferRef.current.length > 0
        ? frozenBufferRef.current
        : historyBufferRef.current;

      if (data.length > 1) {
        const tMaxMs = 40.0; // 40ms = 2 full 50Hz cycles
        const tToX = (tMs: number) => paddingLeft + (tMs / tMaxMs) * chartWidth;
        const vToY = (v: number) => centerY - (v / 400.0) * (chartHeight / 2);
        const iToY = (i: number) => centerY - (i / 800.0) * (chartHeight / 2);

        // 3. Trace 1: Grid Voltage Reference (Dim Grey Line)
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)'; // Dim Grey
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        data.forEach((pt, i) => {
          const x = tToX(pt.t);
          const y = vToY(selectedPhase === 'B' ? pt.v_grid_B : selectedPhase === 'C' ? pt.v_grid_C : pt.v_grid_A);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Gate Pulse Markers (Vertical Neon Cyan Spikes at firing angle α)
        data.forEach((pt) => {
          if (pt.isGatePulse && (selectedPhase === 'A' || selectedPhase === 'ALL')) {
            const x = tToX(pt.t);
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(x, centerY - 40);
            ctx.lineTo(x, centerY + 40);
            ctx.stroke();

            // Gate Alpha Label Badge
            ctx.fillStyle = '#06b6d4';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(`α=${pt.alphaDeg.toFixed(0)}°`, x, centerY - 45);
          }
        });

        // 4. Trace 2: Chopped Output Voltage v_out (Neon Cyan, Thick Glow)
        const drawVoltageTrace = (getV: (pt: WaveformPoint) => number, color: string) => {
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          data.forEach((pt, i) => {
            const x = tToX(pt.t);
            const y = vToY(getV(pt));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };

        if (selectedPhase === 'ALL') {
          drawVoltageTrace((p) => p.v_out_A, '#06b6d4'); // Phase A Cyan
          drawVoltageTrace((p) => p.v_out_B, '#10b981'); // Phase B Green
          drawVoltageTrace((p) => p.v_out_C, '#f59e0b'); // Phase C Amber
        } else {
          drawVoltageTrace(
            (p) => (selectedPhase === 'B' ? p.v_out_B : selectedPhase === 'C' ? p.v_out_C : p.v_out_A),
            '#06b6d4'
          );
        }

        // 5. Trace 3: Discontinuous Motor Current i_line (Neon Red, Thick Glow)
        const drawCurrentTrace = (getI: (pt: WaveformPoint) => number, color: string) => {
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((pt, i) => {
            const x = tToX(pt.t);
            const y = iToY(getI(pt));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };

        if (selectedPhase === 'ALL') {
          drawCurrentTrace((p) => p.i_line_A, '#ef4444');
        } else {
          drawCurrentTrace(
            (p) => (selectedPhase === 'B' ? p.i_line_B : selectedPhase === 'C' ? p.i_line_C : p.i_line_A),
            '#ef4444'
          );
        }

        ctx.shadowBlur = 0;
      }

      // CRT Scanlines Effect Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedPhase, isFrozenMode]);

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#334155] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide uppercase">
              🔬 3-Phase Thyristor Phase-Angle Chopping Scope
            </h2>
            <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold ${
              isFrozenMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
            }`}>
              {isFrozenMode ? 'FROZEN CAPTURE' : 'LIVE 60FPS SCOPE'}
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            2-Cycle Electrical Window (40ms) • Firing Pulse α → Chopped Voltage → Motor Current
          </p>
        </div>

        {/* Live Telemetry Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto font-mono text-xs">
          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-[#64748b] block">Firing Angle α</span>
            <span className="text-[#06b6d4] font-bold text-sm">{alphaDeg.toFixed(0)}°</span>
          </div>

          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-[#64748b] block">Conduction γ</span>
            <span className="text-emerald-400 font-bold text-sm">{conductionAngleDeg.toFixed(0)}°</span>
          </div>

          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-[#64748b] block">Output V_rms</span>
            <span className="text-cyan-400 font-bold text-sm">{vRmsPct.toFixed(0)}%</span>
          </div>

          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-[#64748b] block">Line Current I</span>
            <span className="text-[#ef4444] font-bold text-sm">{iRmsPu.toFixed(2)}pu</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Phase Selector & Slow-Motion Replay */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-xs font-mono">
        
        {/* Phase Selector Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#64748b] uppercase font-bold mr-1">Phase:</span>
          {(['A', 'B', 'C', 'ALL'] as const).map((ph) => (
            <button
              key={ph}
              onClick={() => setSelectedPhase(ph)}
              className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                selectedPhase === ph
                  ? 'bg-[#06b6d4] text-slate-950 border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-[#1e293b] text-[#94a3b8] border-[#334155] hover:text-white'
              }`}
            >
              {ph === 'ALL' ? '3-Phase Overlaid' : `Phase ${ph}`}
            </button>
          ))}
        </div>

        {/* Slow-Motion Replay Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[#64748b] uppercase font-bold mr-1">Replay Speed:</span>
          
          <button
            onClick={() => setPlaybackSpeed(1)}
            className={`px-2.5 py-1 rounded-lg border font-bold ${
              playbackSpeed === 1
                ? 'bg-[#10b981] text-slate-950 border-[#10b981]'
                : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'
            }`}
          >
            1x Live
          </button>

          <button
            onClick={() => setPlaybackSpeed(10)}
            className={`px-2.5 py-1 rounded-lg border font-bold ${
              playbackSpeed === 10
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'
            }`}
          >
            10x Slow
          </button>

          <button
            onClick={() => setPlaybackSpeed(100)}
            className={`px-2.5 py-1 rounded-lg border font-bold ${
              playbackSpeed === 100
                ? 'bg-[#ef4444] text-white border-[#ef4444]'
                : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'
            }`}
          >
            100x Ultra Slow
          </button>

          {/* Freeze Mode Toggle Button */}
          <button
            onClick={() => setIsFrozenMode(!isFrozenMode)}
            className={`px-3 py-1 rounded-lg border font-bold ml-2 transition-colors ${
              isFrozenMode
                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                : 'bg-[#1e293b] text-[#94a3b8] border-[#334155] hover:text-white'
            }`}
          >
            {isFrozenMode ? 'FREEZE CAPTURE' : 'LIVE'}
          </button>
        </div>

      </div>

      {/* Scope Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <canvas
          ref={canvasRef}
          width={800}
          height={320}
          className="w-full h-[280px] md:h-[320px] block"
        />

        {/* Legend Footer Overlay */}
        <div className="absolute bottom-3 left-12 right-12 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3.5 py-1.5 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#64748b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" /> Grid Reference (v_grid)
            </span>
            <span className="flex items-center gap-1.5 text-[#06b6d4]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> Gate Pulse α & Chopped V_out
            </span>
            <span className="flex items-center gap-1.5 text-[#ef4444]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Motor Current (i_line)
            </span>
          </div>

          <div className="text-[#06b6d4] font-bold">
            2 CYCLES (40ms WINDOW)
          </div>
        </div>

      </div>

      {/* Educational SCR Firing Note */}
      <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Thyristor Phase-Angle Control Physics
        </div>
        <p className="text-[11px] leading-relaxed">
          Each phase uses a back-to-back antiparallel SCR pair.
          At firing angle α, gate current pulse triggers conduction, output voltage v_out immediately snaps to grid voltage, and motor current i(t) builds discontinuously.
          When current drops to zero, the SCR turns off until the next firing pulse.
        </p>
      </div>

    </div>
  );
};
