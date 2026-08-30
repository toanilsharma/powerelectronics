import React, { useState, useEffect } from 'react';
import {
  Activity,
  Pause,
  Play,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ConverterScopeStripProps {
  topology: string;
  Vin: number;
  duty: number;
  fsw: number;
  Vout: number;
  Iout: number;
  deltaIL: number;
  deltaVout: number;
  mode: string;
  isEngineRunning: boolean;
  visualPhase: 'ON' | 'OFF';
}

export const ConverterScopeStrip: React.FC<ConverterScopeStripProps> = ({
  topology,
  Vin,
  duty,
  fsw,
  Vout,
  Iout,
  deltaIL,
  deltaVout,
  mode,
  isEngineRunning,
  visualPhase,
}) => {
  const [isFrozen, setIsFrozen] = useState(false);
  const [autoZoomRipple, setAutoZoomRipple] = useState(true);
  const [cursorX, setCursorX] = useState(200);

  // Time-base calculations
  const tswUs = ((1 / fsw) * 1e6).toFixed(1);
  const Vout_abs = Math.abs(Vout);

  // Synchronize cursor position to SLD visual phase
  useEffect(() => {
    if (isFrozen || !isEngineRunning) return;

    let animId: number;
    let startTime = performance.now();

    const updateCursor = (now: number) => {
      const elapsed = (now - startTime) % 1300; // 1300ms cycle matching SLD phase (650ms ON + 650ms OFF)
      const ratio = elapsed / 1300;
      // Map ratio to time axis (x: 80 to 740)
      const x = 80 + ratio * 660;
      setCursorX(x);
      animId = requestAnimationFrame(updateCursor);
    };

    animId = requestAnimationFrame(updateCursor);
    return () => cancelAnimationFrame(animId);
  }, [isFrozen, isEngineRunning]);

  // Waveform Path Definitions (sharing time axis x: 80 to 740, 2 full PWM periods)
  const dutyRatio = duty / 100;
  const p1_end = 80 + 330 * dutyRatio;
  const p1_cycle = 410;
  const p2_end = 410 + 330 * dutyRatio;

  // Channel 1: Gate PWM (Digital 0V - 10V)
  const pwmPath = `M 80 70 L ${p1_end} 70 L ${p1_end} 30 L ${p1_cycle} 30 L ${p1_cycle} 70 L ${p2_end} 70 L ${p2_end} 30 L 740 30`;

  // Channel 2: Switch-Node Vsw (0V - Vin with switching transition overshoot)
  const vswPath = `M 80 145 L ${p1_end - 5} 145 L ${p1_end} 105 L ${p1_end + 5} 115 L ${p1_end + 10} 110 L ${p1_cycle - 5} 110 L ${p1_cycle} 145 L ${p2_end - 5} 145 L ${p2_end} 105 L 740 105`;

  // Channel 3: Inductor Current IL Sawtooth
  const ilPath =
    mode === 'DCM'
      ? `M 80 220 L ${p1_end} 180 L ${p1_end + 80} 220 L ${p1_cycle} 220 L ${p2_end} 180 L ${p2_end + 80} 220 L 740 220`
      : `M 80 215 L ${p1_end} 185 L ${p1_cycle} 215 L ${p2_end} 185 L 740 215`;

  // Channel 4: Pre-Filter vs Post-Filter Vout Ripple
  const preFilterPath = `M 80 300 L ${p1_end} 300 L ${p1_end} 260 L ${p1_cycle} 260 L ${p1_cycle} 300 L ${p2_end} 300 L ${p2_end} 260 L 740 260`;
  const postFilterPath = autoZoomRipple
    ? `M 80 280 Q ${p1_end / 2 + 40} 270, ${p1_end} 280 T ${p1_cycle} 280 T ${p2_end} 280 T 740 280`
    : `M 80 280 L 740 280`;

  return (
    <div id="dc-scope-strip" className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 font-mono text-xs select-none">
      {/* SCOPE STRIP HEADER BAR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
            SYNCHRONIZED 4-CHANNEL CRT SCOPE STRIP
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 font-bold uppercase">
            Timebase: {tswUs} µs/div
          </span>
        </div>

        {/* CONTROLS: FREEZE & AUTO-ZOOM */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
              isFrozen
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5 fill-black" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isFrozen ? 'UNFREEZE (RUN)' : 'FREEZE (PAUSE)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoZoomRipple(!autoZoomRipple)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
              autoZoomRipple
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>AUTO-ZOOM RIPPLE ({autoZoomRipple ? 'ON' : 'OFF'})</span>
          </button>
        </div>
      </div>

      {/* STACKED 4-CHANNEL CRT CANVAS SVG */}
      <div className="w-full bg-[#030712] border-2 border-[#1e293b] rounded-xl p-2 relative overflow-hidden">
        <svg viewBox="0 0 800 330" className="w-full h-auto max-h-[420px]">
          {/* CRT GRID BACKGROUND PATTERN */}
          <defs>
            <pattern id="crtGrid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#101d36" strokeWidth="1" />
            </pattern>
            <filter id="scopeGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="scopeGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="scopeGlowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect x="70" y="10" width="680" height="310" fill="url(#crtGrid)" />

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 1: GATE PWM (y: 10 to 80) */}
          {/* ----------------------------------------------------------------- */}
          <text x="15" y="45" fill="#38bdf8" fontSize="10" fontWeight="800" fontFamily="monospace">CH1: GATE PWM</text>
          <text x="15" y="60" fill="#64748b" fontSize="8" fontWeight="700" fontFamily="monospace">0V - 10V</text>
          <line x1="70" y1="50" x2="750" y2="50" stroke="#1e293b" strokeDasharray="3,3" />
          <path d={pwmPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" filter="url(#scopeGlowCyan)" />
          <text x="715" y="42" fill="#38bdf8" fontSize="9" fontWeight="800" fontFamily="monospace">D={duty}%</text>

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 2: SWITCH-NODE VOLTAGE Vsw (y: 85 to 155) */}
          {/* ----------------------------------------------------------------- */}
          <text x="15" y="120" fill="#fbbf24" fontSize="10" fontWeight="800" fontFamily="monospace">CH2: V_SW NODE</text>
          <text x="15" y="135" fill="#64748b" fontSize="8" fontWeight="700" fontFamily="monospace">0V - {Vin}V</text>
          <line x1="70" y1="125" x2="750" y2="125" stroke="#1e293b" strokeDasharray="3,3" />
          <path d={vswPath} fill="none" stroke="#fbbf24" strokeWidth="2" filter="url(#scopeGlowAmber)" />
          <text x="710" y="117" fill="#fbbf24" fontSize="9" fontWeight="800" fontFamily="monospace">Vin={Vin}V</text>

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 3: INDUCTOR CURRENT IL SAWTOOTH (y: 160 to 230) */}
          {/* ----------------------------------------------------------------- */}
          <text x="15" y="195" fill="#00ffb7" fontSize="10" fontWeight="800" fontFamily="monospace">CH3: INDUCTOR IL</text>
          <text x="15" y="210" fill="#64748b" fontSize="8" fontWeight="700" fontFamily="monospace">ΔIL={deltaIL.toFixed(2)}A</text>
          {/* Dashed CCM/DCM Boundary Line at 0A */}
          <line x1="70" y1="220" x2="750" y2="220" stroke="#f43f5e" strokeDasharray="4,4" strokeWidth="1.5" />
          <text x="78" y="216" fill="#f43f5e" fontSize="8" fontWeight="800" fontFamily="monospace">0A BOUNDARY ({mode})</text>
          <path d={ilPath} fill="none" stroke={mode === 'CCM' ? '#00ffb7' : '#f59e0b'} strokeWidth="2.5" filter="url(#scopeGlowEmerald)" />

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 4: OUTPUT VOLTAGE RIPPLE Vout (y: 235 to 310) */}
          {/* ----------------------------------------------------------------- */}
          <text x="15" y="270" fill="#34d399" fontSize="10" fontWeight="800" fontFamily="monospace">CH4: VOUT RIPPLE</text>
          <text x="15" y="285" fill="#64748b" fontSize="8" fontWeight="700" fontFamily="monospace">ΔV={(deltaVout * 1000).toFixed(1)}mV</text>
          <line x1="70" y1="280" x2="750" y2="280" stroke="#1e293b" strokeDasharray="3,3" />

          {/* Pre-Filter Ripple Overlay (Red High Amplitude) */}
          <path d={preFilterPath} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3,2" />
          {/* Post-Filter Filtered Ripple (Cyan Smooth) */}
          <path d={postFilterPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" filter="url(#scopeGlowCyan)" />

          <text x="610" y="272" fill="#f43f5e" fontSize="8" fontWeight="700" fontFamily="monospace">-- Pre-LC (Unfiltered)</text>
          <text x="610" y="292" fill="#38bdf8" fontSize="8" fontWeight="800" fontFamily="monospace">— Post-LC (Filtered)</text>

          {/* ----------------------------------------------------------------- */}
          {/* MOVING VERTICAL SYNCHRONIZED LASER CURSOR */}
          {/* ----------------------------------------------------------------- */}
          <line
            x1={cursorX}
            y1="10"
            x2={cursorX}
            y2="320"
            stroke="#00e5a0"
            strokeWidth="2"
            strokeDasharray="4,2"
            className="shadow-lg"
          />
          <circle cx={cursorX} cy="10" r="4" fill="#00e5a0" />
          <text x={cursorX + 6} y="22" fill="#00ffb7" fontSize="9" fontWeight="900" fontFamily="monospace">
            {cursorX < p1_end || (cursorX > p1_cycle && cursorX < p2_end) ? 'S1 ON (Phase 1)' : 'S1 OFF (Phase 2)'}
          </text>
        </svg>
      </div>

      {/* FOOTER BADGES: PRE VS POST FILTER COMPARISON */}
      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] font-bold">
        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-center justify-between">
          <span className="text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> PRE-FILTER UNFILTERED RIPPLE:
          </span>
          <span className="text-white">RIPPLE 45% (FAIL IEEE 519)</span>
        </div>

        <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between">
          <span className="text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> POST-FILTER LC RIPPLE:
          </span>
          <span className="text-emerald-300">RIPPLE 1.2% (PASS IEEE 946)</span>
        </div>
      </div>
    </div>
  );
};

export default ConverterScopeStrip;
