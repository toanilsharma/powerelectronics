import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Pause,
  Play,
  ZoomIn,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Info,
  Layers,
  HelpCircle,
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
  learnMode?: boolean;
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
  learnMode = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [autoZoomRipple, setAutoZoomRipple] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [cursorX, setCursorX] = useState(200);

  // Interactive Inspection Crosshair State (Desktop Hover & Mobile Tap)
  const [inspectPos, setInspectPos] = useState<{ x: number; y: number } | null>(null);

  // Time-base calculations
  const tswUs = (1 / fsw) * 1e6; // Microseconds
  const tswUsStr = tswUs.toFixed(1);
  const Vout_abs = Math.abs(Vout);

  // Synchronize cursor position to SLD visual phase
  useEffect(() => {
    if (isFrozen || !isEngineRunning) return;

    let animId: number;
    let startTime = performance.now();

    const updateCursor = (now: number) => {
      const elapsed = (now - startTime) % 1300; // 1300ms cycle matching SLD phase
      const ratio = elapsed / 1300;
      const x = 70 + ratio * 680;
      setCursorX(x);
      animId = requestAnimationFrame(updateCursor);
    };

    animId = requestAnimationFrame(updateCursor);
    return () => cancelAnimationFrame(animId);
  }, [isFrozen, isEngineRunning]);

  // Waveform Path Definitions (x: 70 to 750, 2 full PWM periods = 2 * Tsw)
  const dutyRatio = duty / 100;
  const periodWidth = 340; // 680 / 2
  const p1_end = 70 + periodWidth * dutyRatio;
  const p1_cycle = 70 + periodWidth;
  const p2_end = p1_cycle + periodWidth * dutyRatio;

  // Channel 1: Gate PWM (Digital 0V - 10V)
  const pwmPath = `M 70 70 L ${p1_end} 70 L ${p1_end} 30 L ${p1_cycle} 30 L ${p1_cycle} 70 L ${p2_end} 70 L ${p2_end} 30 L 750 30`;

  // Channel 2: Switch-Node Vsw (0V - Vin with switching transition overshoot)
  const vswPath = `M 70 145 L ${p1_end - 5} 145 L ${p1_end} 105 L ${p1_end + 5} 115 L ${p1_end + 10} 110 L ${p1_cycle - 5} 110 L ${p1_cycle} 145 L ${p2_end - 5} 145 L ${p2_end} 105 L 750 105`;

  // Channel 3: Inductor Current IL Sawtooth
  const ilPath =
    mode === 'DCM'
      ? `M 70 220 L ${p1_end} 180 L ${p1_end + 80} 220 L ${p1_cycle} 220 L ${p2_end} 180 L ${p2_end + 80} 220 L 750 220`
      : `M 70 215 L ${p1_end} 185 L ${p1_cycle} 215 L ${p2_end} 185 L 750 215`;

  // Channel 4: Pre-Filter vs Post-Filter Vout Ripple
  const preFilterPath = `M 70 300 L ${p1_end} 300 L ${p1_end} 260 L ${p1_cycle} 260 L ${p1_cycle} 300 L ${p2_end} 300 L ${p2_end} 260 L 750 260`;
  const postFilterPath = autoZoomRipple
    ? `M 70 280 Q ${p1_end / 2 + 35} 270, ${p1_end} 280 T ${p1_cycle} 280 T ${p2_end} 280 T 750 280`
    : `M 70 280 L 750 280`;

  // Handle Interactive Hover & Mobile Tap Inspection
  const handleSVGInteraction = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 340 / rect.height;

    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;

    if (svgX >= 70 && svgX <= 750 && svgY >= 10 && svgY <= 320) {
      setInspectPos({ x: svgX, y: svgY });
    } else {
      setInspectPos(null);
    }
  };

  // Compute Instantaneous Inspector Values & Interpretation
  let activeInspector = null;
  if (inspectPos) {
    const timeRatio = (inspectPos.x - 70) / 680;
    const totalTimeUs = 2 * tswUs;
    const tUs = timeRatio * totalTimeUs;
    const tInPeriod = tUs % tswUs;
    const isPhase1ON = tInPeriod <= (duty / 100) * tswUs;

    // Instantaneous Values
    const instVgate = isPhase1ON ? 10.0 : 0.0;
    const instVsw = isPhase1ON ? Vin : 0.0;
    const ilMin = Math.max(0, Iout - deltaIL / 2);
    const ilMax = Iout + deltaIL / 2;
    const instIL = isPhase1ON
      ? ilMin + (deltaIL * (tInPeriod / ((duty / 100) * tswUs)))
      : ilMax - (deltaIL * ((tInPeriod - (duty / 100) * tswUs) / ((1 - duty / 100) * tswUs)));
    const instVout = Vout_abs + (isPhase1ON ? (deltaVout / 2) : (-deltaVout / 2));

    const interpretation = isPhase1ON
      ? `S1 MOSFET ON: Inductor L charges from Vin, current IL ramps UP linearly at rate (Vin-Vout)/L.`
      : `S1 MOSFET OFF: Diode D1 freewheels, Inductor L discharges energy into load R, current IL ramps DOWN at rate Vout/L.`;

    activeInspector = {
      tUs: tUs.toFixed(2),
      isPhase1ON,
      instVgate: `${instVgate.toFixed(1)} V`,
      instVsw: `${instVsw.toFixed(1)} V`,
      instIL: `${Math.max(0, instIL).toFixed(2)} A`,
      instVout: `${instVout.toFixed(2)} V`,
      interpretation,
    };
  }

  return (
    <div id="dc-scope-strip" className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 font-mono text-xs select-none">
      {/* SCOPE STRIP HEADER BAR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-black text-white text-xs sm:text-sm tracking-wide">
            SYNCHRONIZED 4-CHANNEL CRT SCOPE STRIP
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 font-bold uppercase">
            Timebase: {tswUsStr} µs/div
          </span>
        </div>

        {/* CONTROLS: FREEZE, AUTO-ZOOM & LEGEND TOGGLE */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 min-h-[32px] ${
              isFrozen
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5 fill-black" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isFrozen ? 'UNFREEZE' : 'FREEZE'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoZoomRipple(!autoZoomRipple)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 min-h-[32px] ${
              autoZoomRipple
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>RIPPLE ZOOM ({autoZoomRipple ? 'ON' : 'OFF'})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className="px-2.5 py-1 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer flex items-center gap-1 min-h-[32px]"
          >
            {showLegend ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>LEGEND</span>
          </button>
        </div>
      </div>

      {/* STACKED 4-CHANNEL CRT CANVAS SVG (INTERACTIVE HOVER & TAP) */}
      <div className="w-full bg-[#030712] border-2 border-[#1e293b] rounded-xl p-1.5 relative overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 800 340"
          className="w-full h-auto max-h-[440px] cursor-crosshair"
          onMouseMove={(e) => handleSVGInteraction(e.clientX, e.clientY)}
          onMouseLeave={() => setInspectPos(null)}
          onTouchStart={(e) => {
            if (e.touches[0]) handleSVGInteraction(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handleSVGInteraction(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          {/* CRT GRID BACKGROUND PATTERN */}
          <defs>
            <pattern id="crtGrid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#101d36" strokeWidth="1" />
            </pattern>
          </defs>

          <rect x="70" y="10" width="680" height="310" fill="url(#crtGrid)" />

          {/* TIME AXIS & VOLTAGE/CURRENT AXES LABELS WITH SI UNITS */}
          <text x="410" y="334" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            Time (t / µs) — 2 Switching Cycles (2 × {tswUsStr} µs)
          </text>

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 1: GATE PWM (y: 10 to 80) */}
          {/* ----------------------------------------------------------------- */}
          <text x="12" y="45" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">CH1: GATE PWM</text>
          <text x="12" y="58" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="monospace">0V - 10V DC</text>
          <line x1="70" y1="50" x2="750" y2="50" stroke="#1e293b" strokeDasharray="3,3" />
          <path d={pwmPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          {showLegend && <text x="705" y="42" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">D={duty}%</text>}

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 2: SWITCH-NODE VOLTAGE Vsw (y: 85 to 155) */}
          {/* ----------------------------------------------------------------- */}
          <text x="12" y="118" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">CH2: V_SW NODE</text>
          <text x="12" y="131" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="monospace">0V - {Vin}V DC</text>
          <line x1="70" y1="125" x2="750" y2="125" stroke="#1e293b" strokeDasharray="3,3" />
          <path d={vswPath} fill="none" stroke="#fbbf24" strokeWidth="2" />
          {showLegend && <text x="700" y="117" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">Vin={Vin}V</text>}

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 3: INDUCTOR CURRENT IL SAWTOOTH (y: 160 to 230) */}
          {/* ----------------------------------------------------------------- */}
          <text x="12" y="192" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">CH3: INDUCTOR IL</text>
          <text x="12" y="205" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="monospace">ΔIL={deltaIL.toFixed(2)}A</text>
          {/* Dashed CCM/DCM Boundary Threshold Line at 0A */}
          <line x1="70" y1="220" x2="750" y2="220" stroke="#f43f5e" strokeDasharray="4,4" strokeWidth="1.5" />
          {showLegend && <text x="78" y="216" fill="#f43f5e" fontSize="8" fontWeight="bold" fontFamily="monospace">0A BOUNDARY ({mode})</text>}
          <path d={ilPath} fill="none" stroke={mode === 'CCM' ? '#10b981' : '#f59e0b'} strokeWidth="2.5" />

          {/* ----------------------------------------------------------------- */}
          {/* CHANNEL 4: OUTPUT VOLTAGE RIPPLE Vout & IEEE 946 SAFE BAND (y: 235 to 310) */}
          {/* ----------------------------------------------------------------- */}
          <text x="12" y="265" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="monospace">CH4: VOUT RIPPLE</text>
          <text x="12" y="278" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="monospace">ΔV={(deltaVout * 1000).toFixed(1)}mV</text>

          {/* IEEE 946 Safe Voltage Envelope Threshold Band (±1% Vout) */}
          <rect x="70" y="272" width="680" height="16" fill="#10b981" fillOpacity="0.08" stroke="#10b981" strokeOpacity="0.25" strokeDasharray="2,2" />
          {showLegend && <text x="78" y="268" fill="#10b981" fontSize="7" fontWeight="bold" fontFamily="monospace">IEEE 946 SAFE ENVELOPE (±1%)</text>}

          <line x1="70" y1="280" x2="750" y2="280" stroke="#1e293b" strokeDasharray="3,3" />

          {/* Pre-Filter Ripple Overlay (Red High Amplitude) */}
          <path d={preFilterPath} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3,2" />
          {/* Post-Filter Filtered Ripple (Cyan Smooth) */}
          <path d={postFilterPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

          {showLegend && (
            <>
              <text x="600" y="270" fill="#f43f5e" fontSize="8" fontWeight="bold" fontFamily="monospace">-- Pre-LC (Unfiltered)</text>
              <text x="600" y="290" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">— Post-LC (Filtered)</text>
            </>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* MOVING SYNCHRONIZED LASER CURSOR */}
          {/* ----------------------------------------------------------------- */}
          {!inspectPos && (
            <>
              <line x1={cursorX} y1="10" x2={cursorX} y2="320" stroke="#10b981" strokeWidth="2" strokeDasharray="4,2" />
              <circle cx={cursorX} cy="10" r="4" fill="#10b981" />
              <text x={cursorX + 6} y="22" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                {cursorX < p1_end || (cursorX > p1_cycle && cursorX < p2_end) ? 'S1 ON (Phase 1)' : 'S1 OFF (Phase 2)'}
              </text>
            </>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* INTERACTIVE INSPECTOR CROSSHAIR (DESKTOP HOVER & MOBILE TAP) */}
          {/* ----------------------------------------------------------------- */}
          {inspectPos && (
            <>
              <line x1={inspectPos.x} y1="10" x2={inspectPos.x} y2="320" stroke="#38bdf8" strokeWidth="2" />
              <line x1="70" y1={inspectPos.y} x2="750" y2={inspectPos.y} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx={inspectPos.x} cy={inspectPos.y} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}
        </svg>
      </div>

      {/* INTERACTIVE CROSSHAIR TOOLTIP CARD (DESKTOP HOVER & MOBILE TAP) */}
      {activeInspector && (
        <div className="p-2.5 rounded-xl bg-[#0b1424] border-2 border-cyan-500 shadow-2xl flex flex-col gap-1 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1">
            <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Scope Inspection Crosshair (t = {activeInspector.tUs} µs):
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border ${
              activeInspector.isPhase1ON ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-cyan-950 text-cyan-300 border-cyan-700'
            }`}>
              {activeInspector.isPhase1ON ? 'PHASE 1 (S1 ON)' : 'PHASE 2 (S1 OFF)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold text-slate-200">
            <span className="bg-[#050b18] px-2 py-0.5 rounded border border-blue-900/60">
              CH1 Gate: <span className="text-cyan-300">{activeInspector.instVgate}</span>
            </span>
            <span className="bg-[#050b18] px-2 py-0.5 rounded border border-blue-900/60">
              CH2 Vsw: <span className="text-amber-300">{activeInspector.instVsw}</span>
            </span>
            <span className="bg-[#050b18] px-2 py-0.5 rounded border border-blue-900/60">
              CH3 IL: <span className="text-emerald-400">{activeInspector.instIL}</span>
            </span>
            <span className="bg-[#050b18] px-2 py-0.5 rounded border border-blue-900/60">
              CH4 Vout: <span className="text-emerald-300">{activeInspector.instVout}</span>
            </span>
          </div>

          {learnMode && (
            <p className="text-[10px] text-amber-300 font-sans italic pt-1 border-t border-slate-800">
              💡 <span className="font-semibold text-slate-300">{activeInspector.interpretation}</span>
            </p>
          )}
        </div>
      )}

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
