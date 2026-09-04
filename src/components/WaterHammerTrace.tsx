import React, { useState, useEffect } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Activity, ShieldCheck, AlertTriangle, Info, Play, RotateCcw, Waves, Sliders, Volume2, ShieldAlert } from 'lucide-react';

interface WaterHammerTraceProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

/**
 * WaterHammerTrace.tsx - Pumping Hydraulic Water Hammer & Joukowsky Surge Physics Lab
 * 
 * Joukowsky Equation Physics:
 *  - Surge Head: ΔH = (c * Δv) / g
 *  - Acoustic wave speed in steel/water pipe c ≈ 1000 - 1200 m/s
 *  - Pipeline reflection period Tr = 2L / c
 *  - For slow closure (t_stop > Tr): ΔH_reduced = (2L * v0) / (g * t_stop)
 *  - Check valve slam causes column separation and destructive pressure reflection.
 */
export const WaterHammerTrace: React.FC<WaterHammerTraceProps> = ({
  engineState,
  className = '',
}) => {
  // Interactive Simulator Parameters
  const [pipelineLength, setPipelineLength] = useState<number>(1000); // meters (L)
  const [flowVelocity, setFlowVelocity] = useState<number>(2.0);      // m/s (v0)
  const [acousticSpeed, setAcousticSpeed] = useState<number>(1000);   // m/s (c)
  const [manualStopSec, setManualStopSec] = useState<number>(15.0);   // ramp time
  const [stopMode, setStopMode] = useState<'coast' | 'soft'>('soft'); // active simulated stop mode
  const [simTime, setSimTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showDirectGhost, setShowDirectGhost] = useState<boolean>(true);

  // Pipe Rating (PN16 = 160m H2O)
  const pnRatingMeters = 160.0;
  const H_baseline = 60.0; // Normal operating head pressure (m H2O)
  const g = 9.81;

  // Joukowsky Surge Calculations
  // Critical time Tr = 2 * L / c
  const reflectionPeriod = (2 * pipelineLength) / acousticSpeed; // seconds
  
  // Coast Stop Surge (t_stop = 0s -> Instantaneous closure Δv = v0)
  const joukowskyDirectSurge = (acousticSpeed * flowVelocity) / g;
  const peakCoastHead = H_baseline + joukowskyDirectSurge; // ~ 263.8 m H2O (Massive burst risk)

  // Soft Stop Surge (Controlled ramp)
  const effectiveRamp = Math.max(0.1, manualStopSec);
  const joukowskySoftSurge = effectiveRamp <= reflectionPeriod
    ? joukowskyDirectSurge
    : (2 * pipelineLength * flowVelocity) / (g * effectiveRamp);
  const peakSoftHead = H_baseline + joukowskySoftSurge;

  const activePeakHead = stopMode === 'coast' ? peakCoastHead : peakSoftHead;
  const isPipeSafe = activePeakHead <= pnRatingMeters;

  // Animation Loop for live stop event replay
  useEffect(() => {
    let animationFrame: number;
    if (isPlaying) {
      const startTime = performance.now();
      const runAnim = (now: number) => {
        const elapsed = (now - startTime) / 1000.0;
        if (elapsed <= 20.0) {
          setSimTime(elapsed);
          animationFrame = requestAnimationFrame(runAnim);
        } else {
          setSimTime(20.0);
          setIsPlaying(false);
        }
      };
      animationFrame = requestAnimationFrame(runAnim);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  // SVG Dimensions
  const svgWidth = 800;
  const svgHeight = 320;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 35;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const tToX = (tSec: number) => paddingLeft + (tSec / 20.0) * chartWidth;
  const hToY = (hMeters: number) => svgHeight - paddingBottom - (hMeters / 280.0) * chartHeight;

  // Waveform Generator
  const steps = 120;
  const coastPoints: { x: number; y: number }[] = [];
  const softPoints: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (20.0 / steps) * i;
    
    // Coast Stop Waveform
    let hCoast = H_baseline;
    if (t >= 4.0 && t < 4.4) {
      // Violent Joukowsky Pressure Spike
      hCoast = H_baseline + joukowskyDirectSurge * Math.sin(((t - 4.0) / 0.4) * Math.PI);
    } else if (t >= 4.4 && t < 16.0) {
      // Acoustic reflections decaying with pipeline damping
      const dt = t - 4.4;
      hCoast = H_baseline + (joukowskyDirectSurge * 0.6) * Math.exp(-0.25 * dt) * Math.cos((2 * Math.PI / reflectionPeriod) * dt);
    } else if (t >= 16.0) {
      hCoast = 0;
    }
    coastPoints.push({ x: tToX(t), y: hToY(Math.max(0, hCoast)) });

    // Soft Stop Waveform
    let hSoft = H_baseline;
    if (t >= 4.0 && t < 4.0 + manualStopSec) {
      const progress = (t - 4.0) / manualStopSec;
      hSoft = H_baseline * (1.0 - progress) + joukowskySoftSurge * Math.sin(progress * Math.PI);
    } else if (t >= 4.0 + manualStopSec) {
      hSoft = 0;
    }
    softPoints.push({ x: tToX(t), y: hToY(Math.max(0, hSoft)) });
  }

  const coastPathD = coastPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const softPathD = softPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  // Live Tracking Head at simTime
  let liveHead = H_baseline;
  if (isPlaying) {
    if (simTime < 4.0) {
      liveHead = H_baseline;
    } else if (stopMode === 'coast') {
      if (simTime < 4.4) {
        liveHead = H_baseline + joukowskyDirectSurge * Math.sin(((simTime - 4.0) / 0.4) * Math.PI);
      } else if (simTime < 16.0) {
        const dt = simTime - 4.4;
        liveHead = H_baseline + (joukowskyDirectSurge * 0.6) * Math.exp(-0.25 * dt) * Math.cos((2 * Math.PI / reflectionPeriod) * dt);
      } else {
        liveHead = 0;
      }
    } else {
      if (simTime < 4.0 + manualStopSec) {
        const progress = (simTime - 4.0) / manualStopSec;
        liveHead = H_baseline * (1.0 - progress) + joukowskySoftSurge * Math.sin(progress * Math.PI);
      } else {
        liveHead = 0;
      }
    }
  }

  return (
    <div id="ss-water-hammer" className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>🌊</span> Hydraulic Water Hammer & Joukowsky Pipeline Surge Lab
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            ΔH = (c·Δv)/g • Reflection Time Tr = 2L/c = {reflectionPeriod.toFixed(2)}s • PN16 Pipe Limit: 160m H₂O
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
            isPipeSafe
              ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
              : 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
          }`}>
            {isPipeSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span>{isPipeSafe ? `PN16 SAFE (Peak: ${activePeakHead.toFixed(0)}m)` : `BURST HAZARD (${activePeakHead.toFixed(0)}m > 160m)!`}</span>
          </div>

          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1 rounded-xl text-xs text-[#06b6d4] font-bold">
            {stopMode === 'coast' ? 'ABRUPT COAST STOP (0s)' : `CONTROLLED RAMP (${manualStopSec}s)`}
          </div>
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs font-mono">
        {/* Pipeline Length */}
        <div className="space-y-1">
          <div className="flex justify-between text-[#94a3b8]">
            <span className="text-white font-bold">Pipeline Length L</span>
            <span className="text-[#06b6d4] font-bold">{pipelineLength} m</span>
          </div>
          <input
            type="range"
            min="400"
            max="2500"
            step="100"
            value={pipelineLength}
            onChange={(e) => setPipelineLength(Number(e.target.value))}
            className="w-full accent-[#06b6d4] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748b]">Reflection Tr = {reflectionPeriod.toFixed(2)}s</div>
        </div>

        {/* Flow Velocity */}
        <div className="space-y-1">
          <div className="flex justify-between text-[#94a3b8]">
            <span className="text-white font-bold">Fluid Velocity v₀</span>
            <span className="text-[#06b6d4] font-bold">{flowVelocity.toFixed(1)} m/s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={flowVelocity}
            onChange={(e) => setFlowVelocity(Number(e.target.value))}
            className="w-full accent-[#06b6d4] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748b]">Max Joukowsky: +{joukowskyDirectSurge.toFixed(0)}m</div>
        </div>

        {/* Soft Stop Ramp Time */}
        <div className="space-y-1">
          <div className="flex justify-between text-[#94a3b8]">
            <span className="text-white font-bold">Soft Stop Ramp t_stop</span>
            <span className="text-[#10b981] font-bold">{manualStopSec} s</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={manualStopSec}
            onChange={(e) => setManualStopSec(Number(e.target.value))}
            className="w-full accent-[#10b981] cursor-pointer"
          />
          <div className="text-[10px] text-[#64748b]">Soft Surge: +{joukowskySoftSurge.toFixed(1)}m</div>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-col justify-between gap-1.5">
          <div className="text-white font-bold text-[11px]">Simulate Stop Event</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setStopMode('coast');
                setIsPlaying(true);
                setSimTime(0);
              }}
              className="px-2 py-1.5 rounded-lg bg-[#ef4444]/20 hover:bg-[#ef4444]/30 border border-[#ef4444] text-[#ef4444] font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
            >
              <AlertTriangle className="w-3 h-3" /> Coast Stop
            </button>
            <button
              onClick={() => {
                setStopMode('soft');
                setIsPlaying(true);
                setSimTime(0);
              }}
              className="px-2 py-1.5 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981] text-[#10b981] font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
            >
              <Play className="w-3 h-3" /> Soft Ramp
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <label className="text-[#94a3b8] flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showDirectGhost}
                onChange={(e) => setShowDirectGhost(e.target.checked)}
                className="accent-[#ef4444]"
              />
              Overlay Coast Spike
            </label>
          </div>
        </div>
      </div>

      {/* SVG Hydraulic Pressure Waveform Scope */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
        >
          {/* 1. Grid Lines (0 to 280m H2O Y-Axis / 0 to 20s X-Axis) */}
          <g stroke="#1e293b" strokeWidth="1">
            {[0, 50, 100, 150, 200, 250].map((h) => {
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

            {[0, 4, 8, 12, 16, 20].map((t) => {
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
            PN16 PIPE BURST LIMIT (160m H₂O)
          </text>

          {/* Stop Event Vertical Line (t = 4s) */}
          <line
            x1={tToX(4.0)}
            y1={paddingTop}
            x2={tToX(4.0)}
            y2={svgHeight - paddingBottom}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x={tToX(4.0)} y={paddingTop - 8} fill="#06b6d4" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            STOP COMMAND INITIATED (t = 4s)
          </text>

          {/* 3. Direct Coast Stop Pressure Wave (Red Spike) */}
          {(showDirectGhost || stopMode === 'coast') && (
            <path
              d={coastPathD}
              fill="none"
              stroke="#ef4444"
              strokeWidth={stopMode === 'coast' ? 3 : 1.5}
              strokeDasharray={stopMode === 'coast' ? 'none' : '4,3'}
              opacity={stopMode === 'coast' ? 1 : 0.6}
              style={{ filter: stopMode === 'coast' ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'none' }}
            />
          )}

          {/* 4. Controlled Soft Stop Pressure Wave (Green Smooth Curve) */}
          {(stopMode === 'soft' || !showDirectGhost) && (
            <path
              d={softPathD}
              fill="none"
              stroke="#10b981"
              strokeWidth={stopMode === 'soft' ? 3 : 1.5}
              style={{ filter: stopMode === 'soft' ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' : 'none' }}
            />
          )}

          {/* Live Dynamic Playhead Marker */}
          {isPlaying && (
            <g>
              <line
                x1={tToX(simTime)}
                y1={paddingTop}
                x2={tToX(simTime)}
                y2={svgHeight - paddingBottom}
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <circle
                cx={tToX(simTime)}
                cy={hToY(Math.max(0, liveHead))}
                r="6"
                fill={liveHead > pnRatingMeters ? '#ef4444' : '#10b981'}
                stroke="#ffffff"
                strokeWidth="2"
                className="animate-pulse"
              />
            </g>
          )}

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

        {/* Scope Telemetry Overlay */}
        <div className="absolute bottom-3 left-16 right-16 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3.5 py-1.5 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Controlled Soft Stop (Peak: {peakSoftHead.toFixed(1)}m)
            </span>
            <span className="flex items-center gap-1.5 text-[#ef4444]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Abrupt Coast Surge (Peak: {peakCoastHead.toFixed(1)}m)
            </span>
          </div>

          <div className="text-white font-bold">
            Baseline: {H_baseline}m H₂O • Joukowsky ΔH: +{joukowskyDirectSurge.toFixed(1)}m
          </div>
        </div>

      </div>

      {/* Animated Pipeline & Check Valve Cutaway Viewport */}
      <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#334155] pb-2">
          <span className="font-bold text-white uppercase flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#06b6d4]" /> Dynamic Pipe Acoustic Reflection & Check Valve Cutaway
          </span>
          <span className="text-[#06b6d4] text-[11px]">
            L = {pipelineLength}m • Acoustic Speed c = {acousticSpeed} m/s
          </span>
        </div>

        {/* Animated Pipe Tube Cutaway */}
        <div className="relative w-full h-16 bg-[#1e293b] rounded-2xl border-2 border-[#334155] overflow-hidden flex items-center px-4">
          
          {/* Pressure Color Stress Gradient */}
          <div
            className={`absolute inset-0 transition-colors duration-300 ${
              stopMode === 'coast' && isPlaying && simTime >= 4.0 && simTime <= 10.0
                ? 'bg-[#ef4444]/30 animate-pulse'
                : 'bg-[#06b6d4]/15'
            }`}
          />

          {/* Check Valve Representation at Left */}
          <div className="relative z-10 flex flex-col items-center mr-6">
            <div className={`w-3 h-10 border-2 rounded ${
              stopMode === 'coast' && isPlaying && simTime >= 4.0
                ? 'bg-[#ef4444] border-white shadow-[0_0_12px_#ef4444]'
                : 'bg-[#10b981] border-[#334155]'
            }`} />
            <span className="text-[9px] text-[#94a3b8] mt-0.5">CHECK VALVE</span>
          </div>

          {/* Flow Direction Particles */}
          <div className="relative flex-1 flex items-center justify-around">
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" />
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" style={{ animationDelay: '0.3s' }} />
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" style={{ animationDelay: '0.6s' }} />
            <div className="w-3 h-3 rounded-full bg-[#06b6d4] animate-ping" style={{ animationDelay: '0.9s' }} />
          </div>

          {/* Shockwave Traveling Wave Badge */}
          {stopMode === 'coast' && isPlaying && simTime >= 4.0 && (
            <div className="absolute right-16 top-2 bottom-2 px-3 bg-[#ef4444]/50 border border-[#ef4444] rounded-lg text-white font-bold text-[10px] flex items-center justify-center animate-bounce">
              SHOCKWAVE REFLECTION ⚡
            </div>
          )}

          <div className="relative z-10 text-right ml-4">
            <span className="text-[10px] text-white font-bold">RESERVOIR</span>
          </div>

        </div>
      </div>

      {/* Physics Teaching Card */}
      <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Joukowsky Hydraulic Surge Law & Soft Stop Protection
        </div>
        <p className="text-[11px] leading-relaxed">
          The Joukowsky equation states that an instantaneous fluid stoppage produces a head surge of <span className="text-white font-mono">ΔH = (c·Δv)/g</span>. For steel pipes with acoustic wave speed <span className="text-white font-mono">c = 1000 m/s</span> and fluid speed <span className="text-white font-mono">2.0 m/s</span>, an abrupt stop generates a massive <span className="text-[#ef4444] font-bold">+204m H₂O</span> surge! This exceeds the PN16 pipe burst rating (160m) and destroys check valves. A soft stop ramp (15s) allows fluid inertia to dissipate gently, maintaining pressure within safe limits.
        </p>
      </div>

    </div>
  );
};

