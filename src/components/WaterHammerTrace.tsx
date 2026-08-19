import React, { useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Activity, ShieldCheck, AlertTriangle, Info, Play, RefreshCw, Waves } from 'lucide-react';

interface WaterHammerTraceProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

/**
 * WaterHammerTrace.tsx - Pumping Hydraulic Water Hammer & Soft Stop Surge Component
 * 
 * Joukowsky Equation Physics:
 *  - Surge Head: ΔH = (c * Δv) / g
 *  - Acoustic wave speed in steel/water pipe c ≈ 1000 m/s
 *  - Gravity g = 9.81 m/s²
 *  - Compares abrupt coast stop (t_stop = 0s) vs soft stop deceleration ramp (t_stop = 15s)
 */
export const WaterHammerTrace: React.FC<WaterHammerTraceProps> = ({
  engineState,
  className = '',
}) => {
  const [showDirectStop, setShowDirectStop] = useState<boolean>(true);

  // Live Metrics from Engine State
  const tStopSec = engineState?.tStopSec ?? 15.0;
  const liveSurgeHead = engineState?.surgeHeadMeters ?? 0.0;

  // Hydraulic Pipeline Rating
  const pnRatingMeters = 160.0; // PN16 Pipe = 160 m H2O max working pressure
  const H_baseline = 65.0;      // Steady-state operating head pressure (m H2O)

  // Calculate Joukowsky Surges
  // Direct Stop (t_stop = 0s): Instantaneous fluid velocity drop Δv = 1.0 pu -> ΔH ≈ +90 m
  const surgeDirectMeters = H_baseline + 92.0; // 157.0 m H2O (Danger zone near 160m rating)

  // Soft Stop (t_stop = 15s): Soft deceleration ramp limits Δv/dt -> ΔH ≈ +6.0 m
  const surgeSoftMeters = H_baseline + Math.max(2.0, (15.0 / Math.max(1.0, tStopSec)) * 6.0);

  // Active Peak Pressure for Status Evaluation
  const currentPeakHead = liveSurgeHead > 0 ? H_baseline + liveSurgeHead : surgeSoftMeters;
  const isPipeSafe = currentPeakHead <= pnRatingMeters;

  // SVG Chart Geometry
  const svgWidth = 800;
  const svgHeight = 320;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 35;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const tToX = (tSec: number) => paddingLeft + (tSec / 20.0) * chartWidth;
  const hToY = (hMeters: number) => svgHeight - paddingBottom - (hMeters / 200.0) * chartHeight;

  // Generate Waveform Paths (20 seconds window around stop event at t = 5s)
  const steps = 100;
  
  // 1. Direct Coast Stop Waveform Path (t_stop = 0s) - Red Pressure Spike & Oscillation
  const directPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (20.0 / steps) * i;
    let h = H_baseline;

    if (t >= 5.0 && t < 5.3) {
      // Massive Joukowsky Pressure Surge Spike
      h = H_baseline + 92.0 * Math.sin(((t - 5.0) / 0.3) * Math.PI);
    } else if (t >= 5.3 && t < 15.0) {
      // Damped Hydraulic Pressure Oscillations
      const dt = t - 5.3;
      h = H_baseline + 45.0 * Math.exp(-0.4 * dt) * Math.cos(2.5 * Math.PI * dt);
    } else if (t >= 15.0) {
      h = 0.0; // Empty pipe head after stop
    }

    directPoints.push({ x: tToX(t), y: hToY(h) });
  }

  // 2. Soft Stop Deceleration Ramp Waveform Path (t_stop = 15s) - Green Smooth Descent
  const softPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (20.0 / steps) * i;
    let h = H_baseline;

    if (t >= 5.0 && t < 5.0 + tStopSec) {
      // Controlled linear ramp down with negligible pressure surge
      const progress = (t - 5.0) / tStopSec;
      h = H_baseline * (1.0 - progress) + 4.0 * Math.sin(progress * Math.PI);
    } else if (t >= 5.0 + tStopSec) {
      h = 0.0;
    }

    softPoints.push({ x: tToX(t), y: hToY(h) });
  }

  const directPathD = directPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const softPathD = softPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>🌊</span> Pump Hydraulic Water Hammer & Joukowsky Surge Analysis
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            Joukowsky Surge Equation: ΔH = (c • Δv) / g • Pipe Head Rating PN16 (160m H₂O)
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
            isPipeSafe
              ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
              : 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
          }`}>
            {isPipeSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isPipeSafe ? 'PN16 SAFE (< 160m H₂O)' : 'PIPELINE OVERPRESSURE DANGER!'}</span>
          </div>

          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1 rounded-xl text-xs text-[#06b6d4]">
            Soft Stop: <span className="font-bold">{tStopSec.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* SVG Hydraulic Pressure Waveform Scope */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
        >
          {/* 1. Grid Lines (0 to 200m H2O Y-Axis / 0 to 20s X-Axis) */}
          <g stroke="#1e293b" strokeWidth="1">
            {/* Horizontal Head Grid (0, 50, 100, 150, 200m) */}
            {[0, 50, 100, 150, 200].map((h) => {
              const y = hToY(h);
              return (
                <g key={`y-${h}`}>
                  <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} />
                  <text x={paddingLeft - 8} y={y + 4} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                    {h}m
                  </text>
                </g>
              );
            })}

            {/* Vertical Time Grid (0 to 20s) */}
            {[0, 5, 10, 15, 20].map((t) => {
              const x = tToX(t);
              return (
                <g key={`x-${t}`}>
                  <line x1={x} y1={paddingTop} x2={x} y2={svgHeight - paddingBottom} />
                  <text x={x} y={svgHeight - paddingBottom + 16} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                    {t}s
                  </text>
                </g>
              );
            })}
          </g>

          {/* 2. Pipe Nominal Rating Limit Line (PN16 = 160m H2O) */}
          <line
            x1={paddingLeft}
            y1={hToY(pnRatingMeters)}
            x2={svgWidth - paddingRight}
            y2={hToY(pnRatingMeters)}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text x={svgWidth - paddingRight - 10} y={hToY(pnRatingMeters) - 6} fill="#ef4444" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end" fontWeight="bold">
            PN16 PIPE RATING LIMIT (160m H₂O)
          </text>

          {/* Stop Event Vertical Line (t = 5s) */}
          <line
            x1={tToX(5.0)}
            y1={paddingTop}
            x2={tToX(5.0)}
            y2={svgHeight - paddingBottom}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x={tToX(5.0)} y={paddingTop - 8} fill="#06b6d4" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            STOP COMMAND INITIATED (t = 5s)
          </text>

          {/* 3. Direct Coast Stop Pressure Wave (Red Spike) */}
          {showDirectStop && (
            <path
              d={directPathD}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' }}
            />
          )}

          {/* 4. Controlled Soft Stop Pressure Wave (Green Smooth Curve) */}
          <path
            d={softPathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }}
          />

          {/* Axis Labels */}
          <text x={svgWidth / 2} y={svgHeight - 10} fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">
            Time around Stop Event (seconds)
          </text>
          <text
            x={15}
            y={svgHeight / 2}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="JetBrains Mono"
            textAnchor="middle"
            transform={`rotate(-90, 15, ${svgHeight / 2})`}
          >
            Hydraulic Head Pressure (m H₂O)
          </text>
        </svg>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-16 right-16 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3.5 py-1.5 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Controlled Soft Stop (t_stop = {tStopSec}s)
            </span>
            
            <label className="flex items-center gap-1.5 text-[#ef4444] cursor-pointer">
              <input
                type="checkbox"
                checked={showDirectStop}
                onChange={(e) => setShowDirectStop(e.target.checked)}
                className="accent-[#ef4444]"
              />
              <span>Abrupt Coast Stop (t_stop = 0s Surge Spike)</span>
            </label>
          </div>

          <div className="text-white font-bold">
            Baseline Head: {H_baseline}m H₂O
          </div>
        </div>

      </div>

      {/* Animated Pipeline Shockwave Schematic Viewport */}
      <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#334155] pb-2">
          <span className="font-bold text-white uppercase flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#06b6d4]" /> Pipeline Acoustic Shockwave Propagation Schematic
          </span>
          <span className="text-[#06b6d4] text-[11px]">
            Acoustic Wave Speed c = 1000 m/s
          </span>
        </div>

        {/* Animated Pipe Tube */}
        <div className="relative w-full h-12 bg-[#1e293b] rounded-2xl border-2 border-[#334155] overflow-hidden flex items-center px-4">
          
          {/* Water Flow Fluid Fill */}
          <div className="absolute inset-0 bg-[#06b6d4]/15" />

          {/* Flow Direction Particles Animation */}
          <div className="absolute inset-0 flex items-center justify-around opacity-40">
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" />
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" />
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" />
          </div>

          {/* Hydraulic Shockwave Front Indicator */}
          {showDirectStop && (
            <div className="absolute right-12 top-0 bottom-0 w-8 bg-[#ef4444]/40 border-l-2 border-r-2 border-[#ef4444] animate-pulse flex items-center justify-center text-[9px] text-white font-bold">
              SURGE
            </div>
          )}

          <div className="relative z-10 w-full flex items-center justify-between text-xs text-white font-bold px-2">
            <span>PUMP DISCHARGE VALVE</span>
            <span className="text-[#94a3b8]">STEEL PIPELINE 1000m</span>
            <span>HIGH RESERVOIR</span>
          </div>

        </div>
      </div>

      {/* Educational Note */}
      <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Hydraulic Surge Physics & Soft Stop Benefit
        </div>
        <p className="text-[11px] leading-relaxed">
          Abruptly stopping a centrifugal pump causes rapid fluid deceleration Δv, triggering a Joukowsky hydraulic shockwave ΔH = (c • Δv) / g.
          This destructive pressure spike causes fluid column separation, pipe bursting, and check valve slam.
          Configuring a controlled deceleration ramp (t_stop &ge; 15s) smoothly reduces fluid velocity, eliminating water hammer spikes!
        </p>
      </div>

    </div>
  );
};
