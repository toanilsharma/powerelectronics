import React, { useEffect, useRef, useState } from 'react';
import { Activity, Play, Pause, RefreshCw } from 'lucide-react';

interface HeroLiveOscilloscopeProps {
  heroAlpha: number;
  isDarkMode: boolean;
}

/**
 * Generates the SVG path string for a 3-Phase 6-Pulse SCR rectified bus voltage waveform.
 * @param alphaDeg Thyristor firing delay angle in degrees (0° - 150°)
 * @param timeOffset Real-time continuous phase offset driving the live flowing animation
 */
function generateHeroWaveformPath(alphaDeg: number, timeOffset: number): string {
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const points: string[] = [];
  const width = 360;
  const midY = 38;
  const amp = 26;

  for (let x = 0; x <= width; x += 2) {
    // 3 complete fundamental AC cycles across 360px viewport
    const theta = (x / width) * 6 * Math.PI - timeOffset;
    
    // 6-pulse conduction period (60° = pi/3 rad)
    const pulseWidth = Math.PI / 3;
    const phaseInPulse = ((theta % pulseWidth) + pulseWidth) % pulseWidth;
    
    // DC average component
    const dcAvg = Math.cos(alphaRad);
    
    // 6-pulse ripple envelope
    const ripple = Math.cos(phaseInPulse - Math.PI / 6) - 0.955;
    const rippleScale = 0.4 + 0.6 * Math.sin(alphaRad);
    let vInst = dcAvg + ripple * 2.2 * rippleScale;
    
    // Commutation overlap dip at phase commutation boundaries
    if (phaseInPulse < 0.15) {
      vInst -= 0.08 * (1 - phaseInPulse / 0.15);
    }
    
    // Clamp to CRT screen safe bounds [-1.15, 1.15]
    const clamped = Math.max(-1.15, Math.min(1.15, vInst / 1.05));
    const y = midY - clamped * amp;
    
    points.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  
  return points.join(' ');
}

export const HeroLiveOscilloscope: React.FC<HeroLiveOscilloscopeProps> = ({
  heroAlpha,
  isDarkMode,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const isRunningRef = useRef<boolean>(isRunning);
  const alphaRef = useRef<number>(heroAlpha);
  const pathRef = useRef<SVGPathElement | null>(null);
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const beamDotRef = useRef<SVGCircleElement | null>(null);
  const timeOffsetRef = useRef<number>(0);

  // Keep refs in sync with props/state without triggering re-renders in the RAF loop
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    alphaRef.current = heroAlpha;
  }, [heroAlpha]);

  // High-performance 60fps flowing waveform loop via direct SVG DOM manipulation
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (isRunningRef.current) {
        // Continuous flow speed (approx 5.5 rad/sec for realistic 50Hz/300Hz ripple sweep)
        timeOffsetRef.current += dt * 5.5;
      }

      const pathData = generateHeroWaveformPath(alphaRef.current, timeOffsetRef.current);

      if (pathRef.current) {
        pathRef.current.setAttribute('d', pathData);
      }
      if (glowPathRef.current) {
        glowPathRef.current.setAttribute('d', pathData);
      }

      // Live electron beam spot tracking at the leading right edge (x = 358)
      if (beamDotRef.current) {
        const alphaRad = (alphaRef.current * Math.PI) / 180;
        const thetaLeading = (358 / 360) * 6 * Math.PI - timeOffsetRef.current;
        const pulseWidth = Math.PI / 3;
        const phaseInPulse = ((thetaLeading % pulseWidth) + pulseWidth) % pulseWidth;
        const dcAvg = Math.cos(alphaRad);
        const ripple = Math.cos(phaseInPulse - Math.PI / 6) - 0.955;
        const rippleScale = 0.4 + 0.6 * Math.sin(alphaRad);
        let vInst = dcAvg + ripple * 2.2 * rippleScale;
        if (phaseInPulse < 0.15) {
          vInst -= 0.08 * (1 - phaseInPulse / 0.15);
        }
        const clamped = Math.max(-1.15, Math.min(1.15, vInst / 1.05));
        const dotY = 38 - clamped * 26;
        beamDotRef.current.setAttribute('cx', '358');
        beamDotRef.current.setAttribute('cy', dotY.toFixed(1));
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const isPositive = heroAlpha < 90;
  const traceColor = isPositive ? '#06b6d4' : '#f43f5e';
  const glowColor = isPositive ? 'rgba(6,182,212,0.85)' : 'rgba(244,63,94,0.85)';

  return (
    <div className="w-full h-24 sm:h-28 rounded-xl bg-[#050811] border border-slate-800 relative overflow-hidden flex items-center justify-center select-none shadow-inner group">
      {/* Phosphor CRT Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
      </svg>

      {/* Center 0V Electrical Reference Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-slate-700/60 pointer-events-none z-0" />

      {/* Continuous Flowing Waveform SVG */}
      <svg className="w-full h-full relative z-10" viewBox="0 0 360 76" preserveAspectRatio="none">
        <defs>
          {/* Subtle horizontal gradient to simulate CRT phosphor sweep decay */}
          <linearGradient id="hero-trace-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={traceColor} stopOpacity="0.5" />
            <stop offset="25%" stopColor={traceColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={traceColor} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Phosphor Glow Back-layer */}
        <path
          ref={glowPathRef}
          d={generateHeroWaveformPath(heroAlpha, 0)}
          fill="none"
          stroke={glowColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          style={{ filter: `blur(4px)` }}
        />

        {/* Primary Sharp Crisp Electron Beam Trace */}
        <path
          ref={pathRef}
          d={generateHeroWaveformPath(heroAlpha, 0)}
          fill="none"
          stroke="url(#hero-trace-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />

        {/* Leading Edge Electron Beam Spot */}
        <circle
          ref={beamDotRef}
          cx="358"
          cy="38"
          r="3"
          fill="#ffffff"
          stroke={traceColor}
          strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 8px ${traceColor})` }}
        />
      </svg>

      {/* Top Left: Channel Identifier & Live Flow Status */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none z-20">
        <div className="font-mono text-[9px] text-cyan-400/90 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded border border-cyan-900/60 flex items-center gap-1.5 shadow-sm">
          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>CH1: 3Ø 415V SCR RECTIFIED BUS</span>
          <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/50">
            LIVE 300Hz
          </span>
        </div>
      </div>

      {/* Top Right: Run / Pause Oscilloscope Trigger Controls */}
      <div className="absolute top-2 right-3 z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsRunning((prev) => !prev)}
          title={isRunning ? 'Pause Waveform Flow' : 'Resume Live Flow'}
          className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer border shadow-sm ${
            isRunning
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
              : 'bg-amber-950/80 text-amber-300 border-amber-700/80 hover:bg-amber-900'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-2.5 h-2.5 fill-emerald-300" />
              <span>RUN</span>
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-amber-300" />
              <span>HOLD</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Right: Conduction Mode Telemetry Badge */}
      <div className="absolute bottom-2 right-3 font-mono text-[9px] text-slate-300 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none z-20 shadow-sm">
        {heroAlpha < 90 ? 'CONTINUOUS RECTIFICATION' : 'INVERSION THRESHOLD (α ≥ 90°)'}
      </div>
    </div>
  );
};
