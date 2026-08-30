import React, { useState, useEffect } from 'react';
import {
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Cpu,
  Info,
} from 'lucide-react';

interface AnimatedConverterSLDProps {
  topology: string; // 'buck' | 'boost' | 'buckboost' | 'sepic'
  Vin: number;
  duty: number;
  fsw: number;
  inductanceuH: number;
  capacitanceuF: number;
  loadR: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isEngineRunning: boolean;
  mode: string;
  activeFault: string | null;
  Vout: number;
  Iout: number;
  deltaIL: number;
  deltaVout: number;
  Pout: number;
  Ploss: number;
  etaPct: number;
  onToggleQ1: () => void;
  onToggleQ2: () => void;
  onToggleQ3: () => void;
  onSelectComponent?: (compName: string) => void;
}

export const AnimatedConverterSLD: React.FC<AnimatedConverterSLDProps> = ({
  topology,
  Vin,
  duty,
  fsw,
  inductanceuH,
  capacitanceuF,
  loadR,
  q1Closed,
  q2Closed,
  q3Closed,
  isEngineRunning,
  mode,
  activeFault,
  Vout,
  Iout,
  deltaIL,
  deltaVout,
  Pout,
  Ploss,
  etaPct,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
  onSelectComponent,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [hoveredComp, setHoveredComp] = useState<string | null>(null);

  // Time Dilation Visual Switching Animation (~1.2 Hz visual rate)
  const [visualPhase, setVisualPhase] = useState<'ON' | 'OFF'>('ON');
  const [dotOffset, setDotOffset] = useState<number>(0);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setVisualPhase((prev) => (prev === 'ON' ? 'OFF' : 'ON'));
    }, 650);

    let animId: number;
    const animateDots = () => {
      setDotOffset((prev) => (prev + 1.5) % 40);
      animId = requestAnimationFrame(animateDots);
    };
    animId = requestAnimationFrame(animateDots);

    return () => {
      clearInterval(phaseInterval);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.0, prev + 0.2));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.75, prev - 0.2));
  const handleResetZoom = () => setZoomScale(1);

  // Computed Consequence Readouts & Conduction State
  const Vout_abs = Math.abs(Vout);
  const isInputLive = isEngineRunning;
  const isQ1Live = isInputLive && q1Closed;
  const isS1Conducting = isQ1Live && activeFault !== 'S1_OPEN' && activeFault !== 'S1_SHORT';
  const isS1VisuallyOn = isS1Conducting && visualPhase === 'ON';
  const isDiodeVisuallyOn = isS1Conducting && (visualPhase === 'OFF' || topology === 'boost');

  const isOutputBusLive = isS1Conducting && activeFault !== 'DIODE_OPEN';
  const isQ2Live = isOutputBusLive && q2Closed;
  const isLoadLive = isQ2Live && q3Closed;

  const energyL_mJ = 0.5 * (inductanceuH * 1e-6) * Math.pow(Iout + deltaIL / 2, 2) * 1000;
  const energyC_mJ = 0.5 * (capacitanceuF * 1e-6) * Math.pow(Vout_abs, 2) * 1000;
  const tjMosfetC = Math.round(25 + Ploss * 1.8);

  // Wire Color Utilities
  const liveColor = '#00e5a0';
  const swNodeColor = isS1VisuallyOn ? '#00ffb7' : isDiodeVisuallyOn ? '#38bdf8' : '#334155';
  const deadColor = '#334155';

  const TOOLTIPS: Record<string, { title: string; subtitle: string; readouts: string[] }> = {
    S1: {
      title: 'Power MOSFET Switch (S1)',
      subtitle: 'ANSI / IEEE Solid-State Switching Transistor',
      readouts: [
        `Ids Peak: ${(Iout + deltaIL / 2).toFixed(2)} A`,
        `Vds Voltage: ${Vin.toFixed(1)} V`,
        `Loss: ${Ploss.toFixed(2)} W`,
        `Junction Temp Tj: ${tjMosfetC}°C`,
        `Status: ${activeFault === 'S1_OPEN' ? 'OPEN FAULT' : activeFault === 'S1_SHORT' ? 'SHORT FAULT' : isS1VisuallyOn ? 'CONDUCTING (ON)' : 'OFF'}`,
      ],
    },
    DIODE: {
      title: 'Power Recirculation Diode (D1)',
      subtitle: 'IEC 60617 Ultra-Fast Schottky Power Diode',
      readouts: [
        `Forward Current If: ${isDiodeVisuallyOn ? Iout.toFixed(2) : '0.00'} A`,
        `Forward Drop Vf: 0.70 V`,
        `Reverse Voltage: ${Vin.toFixed(1)} V`,
        `Conduction State: ${activeFault === 'DIODE_OPEN' ? 'OPEN FAULT' : isDiodeVisuallyOn ? 'CONDUCTING (ON)' : 'REVERSE BIASED'}`,
      ],
    },
    L: {
      title: 'Power Filter Inductor (L)',
      subtitle: 'IEEE 315 Ferrite Core Power Choke',
      readouts: [
        `Inductance Value: ${inductanceuH} µH`,
        `DC Average Current IL: ${Iout.toFixed(2)} A`,
        `Ripple ΔIL: ${deltaIL.toFixed(2)} A`,
        `Stored Energy EL: ${energyL_mJ.toFixed(2)} mJ`,
        `Status: ${activeFault === 'L_SAT' ? 'CORE SATURATED' : 'NORMAL'}`,
      ],
    },
    C: {
      title: 'Output Filter Capacitor (C)',
      subtitle: 'Low-ESR Aluminum Polymer Capacitance',
      readouts: [
        `Capacitance Value: ${capacitanceuF} µF`,
        `Output DC Voltage Vout: ${Vout_abs.toFixed(2)} V`,
        `Voltage Ripple ΔVout: ${(deltaVout * 1000).toFixed(1)} mV`,
        `Stored Energy EC: ${energyC_mJ.toFixed(2)} mJ`,
        `ESR Status: ${activeFault === 'C_ESR_HIGH' ? 'HIGH ESR (200mΩ)' : 'NORMAL'}`,
      ],
    },
    Q1: {
      title: 'DC Input Air Circuit Breaker (52-Q1)',
      subtitle: 'ANSI C37.13 / IEC 60947-2 Main Infeed Breaker',
      readouts: [
        `Breaker Rating: 400A 500VDC 25kA Icu`,
        `Operating State: ${q1Closed ? 'CLOSED (LIVE)' : 'OPEN (AIR GAP DISCONNECT)'}`,
        `Infeed Voltage: ${Vin} V DC`,
      ],
    },
    Q2: {
      title: 'DC Bus Isolation Switch (52-Q2)',
      subtitle: 'Substation Battery Bus Tie Breaker',
      readouts: [
        `Breaker Rating: 250A 250VDC 2-Pole`,
        `Operating State: ${q2Closed ? 'CLOSED (CONNECTED)' : 'OPEN (ISOLATED)'}`,
      ],
    },
    Q3: {
      title: 'Substation Load Disconnect Isolator (89-Q3)',
      subtitle: 'ANSI 89 Manual Lockout Load Disconnector',
      readouts: [
        `Switch Rating: 250A Lockout Disconnector`,
        `Operating State: ${q3Closed ? 'CLOSED (FEEDING LOAD)' : 'OPEN (ISOLATED)'}`,
      ],
    },
    LOAD: {
      title: 'Substation Critical Auxiliary DC Load',
      subtitle: 'IEEE 946 Substation Control & Protection Load',
      readouts: [
        `Load Resistance R: ${loadR} Ω`,
        `Output Voltage: ${Vout_abs.toFixed(2)} V`,
        `Load Current Iout: ${Iout.toFixed(2)} A`,
        `Output Power Pout: ${Pout.toFixed(1)} W`,
        `Efficiency η: ${etaPct.toFixed(1)} %`,
      ],
    },
  };

  return (
    <div id="dc-animated-sld" className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3 shadow-2xl relative flex flex-col gap-2.5 font-mono overflow-hidden select-none min-h-[500px]">
      {/* Dark Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px] opacity-40 pointer-events-none" />

      {/* TOP HEADER BAR */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
            ANSI / IEC SINGLE LINE DIAGRAM ({topology.toUpperCase()})
          </span>
          <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.3)] tracking-wider">
            TIME DILATED ×25,000 — REAL f = {(fsw / 1000).toFixed(0)} kHz
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border uppercase ${
            mode === 'CCM' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : mode === 'DCM' ? 'bg-amber-950 text-amber-400 border-amber-800' : 'bg-rose-950 text-rose-400 border-rose-800'
          }`}>
            MODE: {mode}
          </span>

          {/* ZOOM CONTROLS */}
          <div className="flex items-center gap-1 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1 shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-300 px-1.5">{Math.round(zoomScale * 100)}%</span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer ml-1"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG WORKBENCH CANVAS */}
      <div className="relative z-10 w-full flex-1 min-h-[420px] overflow-hidden rounded-xl border border-blue-900/40 bg-[#040812] flex items-center justify-center p-2">
        <svg
          viewBox="0 0 800 360"
          className="w-full h-full max-h-[480px] transition-transform duration-300"
          style={{ transform: `scale(${zoomScale})` }}
        >
          <defs>
            <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ========================================================================= */}
          {/* 1. ACCURATE NODE-TO-NODE BUSBAR SEGMENT WIRING (NO OVERLAPS OR GAPS) */}
          {/* ========================================================================= */}

          {/* Segment 1: Source (+70,100) to 52-Q1 Input (130,100) */}
          <line x1="70" y1="100" x2="130" y2="100" stroke={isInputLive ? liveColor : deadColor} strokeWidth="3" filter={isInputLive ? 'url(#glow-emerald)' : undefined} />

          {/* Segment 2: 52-Q1 Output (190,100) to Component 1 Input (240,100) */}
          <line x1="190" y1="100" x2="240" y2="100" stroke={isQ1Live ? liveColor : deadColor} strokeWidth="3" filter={isQ1Live ? 'url(#glow-emerald)' : undefined} />

          {/* Segment 3: Component 1 Output (320,100) to SW Node (370,100) */}
          <line x1="320" y1="100" x2="370" y2="100" stroke={isS1Conducting ? swNodeColor : deadColor} strokeWidth="3" />

          {/* Segment 4: SW Node (370,100) to Component 2 Input (420,100) */}
          <line x1="370" y1="100" x2="420" y2="100" stroke={isS1Conducting ? swNodeColor : deadColor} strokeWidth="3" />

          {/* Segment 5: Component 2 Output (500,100) to Cap Node (550,100) */}
          <line x1="500" y1="100" x2="550" y2="100" stroke={isOutputBusLive ? liveColor : deadColor} strokeWidth="3" />

          {/* Segment 6: Cap Node (550,100) to 52-Q2 Input (590,100) */}
          <line x1="550" y1="100" x2="590" y2="100" stroke={isOutputBusLive ? liveColor : deadColor} strokeWidth="3" />

          {/* Segment 7: 52-Q2 Output (640,100) to 89-Q3 Input (660,100) */}
          <line x1="640" y1="100" x2="660" y2="100" stroke={isQ2Live ? liveColor : deadColor} strokeWidth="3" />

          {/* Segment 8: 89-Q3 Output (710,100) to Load Input (740,100) */}
          <line x1="710" y1="100" x2="740" y2="100" stroke={isLoadLive ? liveColor : deadColor} strokeWidth="3" />

          {/* Segment 9: Load Input (740,100) down to Load Box Top (740,160) - ZERO GAP */}
          <line x1="740" y1="100" x2="740" y2="160" stroke={isLoadLive ? liveColor : deadColor} strokeWidth="3" />

          {/* Bottom Ground Rail (GND) at y=280 */}
          <line x1="70" y1="280" x2="740" y2="280" stroke="#334155" strokeWidth="4" />
          <line x1="70" y1="280" x2="740" y2="280" stroke="#0284c7" strokeWidth="2" strokeDasharray="6,4" />

          {/* ANIMATED ELECTRON FLOW DOTS ALONG ACTIVE CONDUCTING PATHS */}
          {isQ1Live && (
            <>
              {/* Main Conducting Path Dots */}
              <line
                x1="70"
                y1="100"
                x2={isLoadLive ? "740" : isQ2Live ? "660" : isOutputBusLive ? "590" : "370"}
                y2="100"
                stroke={isS1VisuallyOn ? '#00ffb7' : '#38bdf8'}
                strokeWidth="4"
                strokeDasharray="8,12"
                strokeDashoffset={-dotOffset}
              />
              {/* Freewheel Diode Branch Dots (During OFF Phase) */}
              {!isS1VisuallyOn && (
                <line
                  x1="370"
                  y1="280"
                  x2="370"
                  y2="100"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6,8"
                  strokeDashoffset={-dotOffset}
                />
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. COMPONENT SCHEMATICS & SWITCH CONTACTS (IEEE / IEC STANDARDS) */}
          {/* ========================================================================= */}

          {/* 1. DC SOURCE (Vin) */}
          <g
            className="cursor-pointer group"
            onMouseEnter={() => setHoveredComp('VinSource')}
            onMouseLeave={() => setHoveredComp(null)}
            onClick={() => onSelectComponent && onSelectComponent('VinSource')}
          >
            <line x1="70" y1="100" x2="70" y2="280" stroke={isInputLive ? liveColor : deadColor} strokeWidth="3" />
            <circle cx="70" cy="190" r="26" fill="#0c1527" stroke={isInputLive ? liveColor : deadColor} strokeWidth="3" filter={isInputLive ? 'url(#glow-emerald)' : undefined} />
            <text x="70" y="185" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="monospace">
              +{Vin}V
            </text>
            <text x="70" y="202" fill="#00e5a0" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              DC SOURCE
            </text>
          </g>

          {/* 2. CIRCUIT BREAKER 52-Q1 (130..190, y=100) */}
          <g
            className="cursor-pointer transition-all"
            onClick={onToggleQ1}
            onMouseEnter={() => setHoveredComp('Q1')}
            onMouseLeave={() => setHoveredComp(null)}
          >
            {/* Terminal Dots */}
            <circle cx="130" cy="100" r="4" fill={isInputLive ? liveColor : deadColor} />
            <circle cx="190" cy="100" r="4" fill={isQ1Live ? liveColor : deadColor} />

            {/* Switch Contact Arm */}
            {q1Closed ? (
              <line x1="130" y1="100" x2="190" y2="100" stroke="#00e5a0" strokeWidth="3.5" filter="url(#glow-emerald)" />
            ) : (
              <line x1="130" y1="100" x2="182" y2="80" stroke="#f43f5e" strokeWidth="3.5" />
            )}

            {/* Breaker Housing Rectangle */}
            <rect x="135" y="80" width="50" height="40" rx="6" fill="none" stroke={q1Closed ? '#10b981' : '#f43f5e'} strokeWidth="1.5" strokeDasharray="4,2" />
            <text x="160" y="74" fill="#38bdf8" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              52-Q1
            </text>
            <text x="160" y="132" fill={q1Closed ? '#34d399' : '#fb7185'} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              {q1Closed ? '[CLOSED]' : '[OPEN]'}
            </text>
          </g>

          {/* 3. DYNAMIC TOPOLOGY COMPONENT 1 (240..320, y=100) */}
          {/* BUCK & BUCK-BOOST: Series MOSFET S1 | BOOST & SEPIC: Series Inductor L/L1 */}
          {topology === 'boost' || topology === 'sepic' ? (
            /* Series Power Inductor L / L1 */
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredComp('L')}
              onMouseLeave={() => setHoveredComp(null)}
              onClick={() => onSelectComponent && onSelectComponent('LInductor')}
            >
              <rect
                x="240"
                y="82"
                width="80"
                height="36"
                rx="8"
                fill={activeFault === 'L_SAT' ? '#78350f' : isQ1Live ? '#064e3b' : '#0c1527'}
                stroke={activeFault === 'L_SAT' ? '#f59e0b' : isQ1Live ? '#00e5a0' : deadColor}
                strokeWidth="2"
                filter={isS1VisuallyOn ? 'url(#glow-amber)' : undefined}
              />
              <path
                d="M 248 100 Q 258 86, 268 100 Q 278 86, 288 100 Q 298 86, 308 100 Q 312 86, 316 100"
                fill="none"
                stroke={activeFault === 'L_SAT' ? '#f59e0b' : '#00ffb7'}
                strokeWidth="3.5"
              />
              <text x="280" y="74" fill="#00ffb7" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                {topology === 'sepic' ? 'L1' : 'L'} = {inductanceuH}µH
              </text>
            </g>
          ) : (
            /* Series Power MOSFET S1 */
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredComp('S1')}
              onMouseLeave={() => setHoveredComp(null)}
              onClick={() => onSelectComponent && onSelectComponent('S1MOSFET')}
            >
              <rect
                x="240"
                y="78"
                width="80"
                height="44"
                rx="10"
                fill={activeFault === 'S1_OPEN' ? '#18181b' : isS1VisuallyOn ? '#064e3b' : '#0c1527'}
                stroke={activeFault === 'S1_OPEN' ? '#71717a' : activeFault === 'S1_SHORT' ? '#ef4444' : isS1VisuallyOn ? '#00e5a0' : deadColor}
                strokeWidth="2.5"
                filter={isS1VisuallyOn ? 'url(#glow-emerald)' : undefined}
              />
              <Cpu x="270" y="84" className={`w-5 h-5 ${isS1VisuallyOn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <text x="280" y="114" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                S1 MOSFET
              </text>
              <circle cx="280" cy="66" r="4" fill={isS1VisuallyOn ? '#00ffb7' : '#334155'} />
              <text x="280" y="56" fill="#38bdf8" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">
                GATE {duty}%
              </text>
            </g>
          )}

          {/* 4. SWITCH NODE (SW NODE) & SHUNT BRANCH (x=370) */}
          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp(topology === 'boost' ? 'S1' : topology === 'buckboost' ? 'L' : 'DIODE')} onMouseLeave={() => setHoveredComp(null)}>
            <circle cx="370" cy="100" r="5" fill="#38bdf8" />
            <text x="370" y="85" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              SW NODE
            </text>

            <line x1="370" y1="100" x2="370" y2="280" stroke={isDiodeVisuallyOn || (topology === 'boost' && isS1VisuallyOn) ? '#38bdf8' : deadColor} strokeWidth="3" />

            {/* BUCK & SEPIC: Freewheeling Diode D1 | BOOST: Shunt MOSFET S1 | BUCK-BOOST: Shunt Inductor L */}
            {topology === 'boost' ? (
              <g onClick={() => onSelectComponent && onSelectComponent('S1MOSFET')}>
                <rect x="340" y="165" width="60" height="44" rx="8" fill={isS1VisuallyOn ? '#064e3b' : '#0c1527'} stroke={isS1VisuallyOn ? '#00e5a0' : deadColor} strokeWidth="2" filter={isS1VisuallyOn ? 'url(#glow-emerald)' : undefined} />
                <Cpu x="360" y="170" className={`w-5 h-5 ${isS1VisuallyOn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <text x="370" y="202" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">S1 (BOOST)</text>
              </g>
            ) : topology === 'buckboost' ? (
              <g onClick={() => onSelectComponent && onSelectComponent('LInductor')}>
                <rect x="340" y="165" width="60" height="44" rx="8" fill={isS1Conducting ? '#064e3b' : '#0c1527'} stroke="#00e5a0" strokeWidth="2" filter="url(#glow-amber)" />
                <text x="370" y="190" fill="#00ffb7" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">L {inductanceuH}µH</text>
              </g>
            ) : (
              <g onClick={() => onSelectComponent && onSelectComponent('S2Diode')}>
                <rect x="345" y="165" width="50" height="44" rx="8" fill={isDiodeVisuallyOn ? '#092d54' : '#0c1527'} stroke={isDiodeVisuallyOn ? '#38bdf8' : deadColor} strokeWidth="2" filter={isDiodeVisuallyOn ? 'url(#glow-cyan)' : undefined} />
                {/* Diode Anode (bottom) to Cathode (top) */}
                <polygon points="360,198 380,198 370,178" fill={isDiodeVisuallyOn ? '#38bdf8' : '#64748b'} />
                <line x1="360" y1="178" x2="380" y2="178" stroke={isDiodeVisuallyOn ? '#38bdf8' : '#64748b'} strokeWidth="2.5" />
                <text x="370" y="220" fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">D1 FREEWHEEL</text>
              </g>
            )}
          </g>

          {/* 5. DYNAMIC TOPOLOGY COMPONENT 2 (420..500, y=100) */}
          {/* BUCK: Output Inductor L | BOOST: Series Output Diode D1 | BUCK-BOOST: Series Inverted Diode D1 */}
          {topology === 'boost' || topology === 'buckboost' ? (
            <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('DIODE')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('S2Diode')}>
              <rect x="420" y="82" width="80" height="36" rx="8" fill={isDiodeVisuallyOn ? '#092d54' : '#0c1527'} stroke={isDiodeVisuallyOn ? '#38bdf8' : deadColor} strokeWidth="2" filter={isDiodeVisuallyOn ? 'url(#glow-cyan)' : undefined} />
              <polygon points={topology === 'buckboost' ? "475,90 475,110 445,100" : "445,90 445,110 475,100"} fill={isDiodeVisuallyOn ? '#38bdf8' : '#64748b'} />
              <line x1={topology === 'buckboost' ? "445" : "475"} y1="90" x2={topology === 'buckboost' ? "445" : "475"} y2="110" stroke={isDiodeVisuallyOn ? '#38bdf8' : '#64748b'} strokeWidth="2.5" />
              <text x="460" y="74" fill="#38bdf8" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">D1 OUTPUT</text>
            </g>
          ) : (
            <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('L')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('LInductor')}>
              <rect x="420" y="82" width="80" height="36" rx="8" fill={activeFault === 'L_SAT' ? '#78350f' : isQ1Live ? '#064e3b' : '#0c1527'} stroke={activeFault === 'L_SAT' ? '#f59e0b' : isQ1Live ? '#00e5a0' : deadColor} strokeWidth="2" filter={isS1VisuallyOn ? 'url(#glow-amber)' : undefined} />
              <path d="M 428 100 Q 438 86, 448 100 Q 458 86, 468 100 Q 478 86, 488 100 Q 492 86, 496 100" fill="none" stroke={activeFault === 'L_SAT' ? '#f59e0b' : '#00ffb7'} strokeWidth="3.5" />
              <text x="460" y="74" fill="#00ffb7" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">L = {inductanceuH}µH</text>
            </g>
          )}

          {/* 6. FILTER CAPACITOR C (x=550) */}
          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('C')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('CCapacitor')}>
            <line x1="550" y1="100" x2="550" y2="280" stroke={isOutputBusLive ? liveColor : deadColor} strokeWidth="2.5" />
            <line x1="535" y1="180" x2="565" y2="180" stroke={isOutputBusLive ? liveColor : deadColor} strokeWidth="4" filter="url(#glow-emerald)" />
            <line x1="535" y1="192" x2="565" y2="192" stroke={isOutputBusLive ? liveColor : deadColor} strokeWidth="4" filter="url(#glow-emerald)" />
            <text x="550" y="170" fill="#34d399" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">C = {capacitanceuF}µF</text>
            <text x="550" y="208" fill="#38bdf8" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">EC={energyC_mJ.toFixed(1)}mJ</text>
          </g>

          {/* 7. CIRCUIT BREAKER 52-Q2 (590..640, y=100) */}
          <g className="cursor-pointer transition-all" onClick={onToggleQ2} onMouseEnter={() => setHoveredComp('Q2')} onMouseLeave={() => setHoveredComp(null)}>
            <circle cx="590" cy="100" r="4" fill={isOutputBusLive ? liveColor : deadColor} />
            <circle cx="640" cy="100" r="4" fill={isQ2Live ? liveColor : deadColor} />
            {q2Closed ? (
              <line x1="590" y1="100" x2="640" y2="100" stroke={isQ2Live ? liveColor : deadColor} strokeWidth="3.5" filter="url(#glow-emerald)" />
            ) : (
              <line x1="590" y1="100" x2="635" y2="82" stroke="#f43f5e" strokeWidth="3.5" />
            )}
            <rect x="592" y="80" width="46" height="40" rx="6" fill="none" stroke={q2Closed ? '#10b981' : '#f43f5e'} strokeWidth="1.5" strokeDasharray="4,2" />
            <text x="615" y="74" fill="#38bdf8" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">52-Q2</text>
          </g>

          {/* 8. ISOLATOR 89-Q3 (660..710, y=100) */}
          <g className="cursor-pointer transition-all" onClick={onToggleQ3} onMouseEnter={() => setHoveredComp('Q3')} onMouseLeave={() => setHoveredComp(null)}>
            <circle cx="660" cy="100" r="4" fill={isQ2Live ? liveColor : deadColor} />
            <circle cx="710" cy="100" r="4" fill={isLoadLive ? liveColor : deadColor} />
            {q3Closed ? (
              <line x1="660" y1="100" x2="710" y2="100" stroke={isLoadLive ? liveColor : deadColor} strokeWidth="3.5" filter="url(#glow-emerald)" />
            ) : (
              <line x1="660" y1="100" x2="705" y2="82" stroke="#f43f5e" strokeWidth="3.5" />
            )}
            <rect x="662" y="80" width="46" height="40" rx="6" fill="none" stroke={q3Closed ? '#10b981' : '#f43f5e'} strokeWidth="1.5" strokeDasharray="4,2" />
            <text x="685" y="74" fill="#38bdf8" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">89-Q3</text>
          </g>

          {/* 9. SUBSTATION AUXILIARY LOAD BLOCK (x=740, ZERO GAP) */}
          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('LOAD')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('Load')}>
            <line x1="740" y1="220" x2="740" y2="280" stroke={isLoadLive ? liveColor : deadColor} strokeWidth="3" />
            <rect x="715" y="160" width="50" height="60" rx="10" fill="#091b36" stroke={isLoadLive ? '#38bdf8' : deadColor} strokeWidth="2.5" filter={isLoadLive ? "url(#glow-cyan)" : undefined} />
            <text x="740" y="182" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">{Vout_abs.toFixed(1)}V</text>
            <text x="740" y="198" fill="#34d399" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">{Iout.toFixed(1)}A</text>
            <text x="740" y="212" fill="#fbbf24" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">{Pout.toFixed(0)}W</text>
            <text x="740" y="234" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">LOAD R={loadR}Ω</text>
          </g>
        </svg>
      </div>

      {/* HOVER TOOLTIP */}
      {hoveredComp && TOOLTIPS[hoveredComp] && (
        <div className="relative z-20 w-full p-2 bg-[#0d1729] border-2 border-cyan-500/80 rounded-xl shadow-2xl flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1">
            <span className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              {TOOLTIPS[hoveredComp].title}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">{TOOLTIPS[hoveredComp].subtitle}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold text-slate-200">
            {TOOLTIPS[hoveredComp].readouts.map((rd, i) => (
              <span key={i} className="bg-[#050b18] px-2 py-0.5 rounded border border-blue-900/60">
                {rd}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedConverterSLD;
