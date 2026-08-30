import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Cpu,
  Gauge,
  Power,
  ShieldCheck,
  Info,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';

export const AnimatedConverterSLD = ({
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
  const [zoomScale, setZoomScale] = useState(1);
  const [hoveredComp, setHoveredComp] = useState(null);
  const [visualPhase, setVisualPhase] = useState('ON');
  const [dotOffset, setDotOffset] = useState(0);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setVisualPhase((prev) => (prev === 'ON' ? 'OFF' : 'ON'));
    }, 650);

    let animId;
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

  const Vout_abs = Math.abs(Vout);
  const isInputPowered = isEngineRunning && q1Closed && activeFault !== 'S1_OPEN' && activeFault !== 'S1_SHORT';
  const isOutputConnected = q2Closed && q3Closed && activeFault !== 'DIODE_OPEN';
  const isS1VisuallyOn = isInputPowered && visualPhase === 'ON';
  const isDiodeVisuallyOn = isInputPowered && (visualPhase === 'OFF' || topology === 'boost');

  const energyL_mJ = 0.5 * (inductanceuH * 1e-6) * Math.pow(Iout + deltaIL / 2, 2) * 1000;
  const energyC_mJ = 0.5 * (capacitanceuF * 1e-6) * Math.pow(Vout_abs, 2) * 1000;
  const tjMosfetC = Math.round(25 + Ploss * 1.8);

  const TOOLTIPS = {
    S1: {
      title: 'High-Side Power MOSFET (S1)',
      subtitle: 'SiC / GaN Fast-Switching Transistor',
      readouts: [
        `Ids Peak: ${(Iout + deltaIL / 2).toFixed(2)} A`,
        `Vds Voltage: ${Vin.toFixed(1)} V`,
        `Switching & Conduction Loss: ${Ploss.toFixed(2)} W`,
        `Junction Temp Tj: ${tjMosfetC}°C`,
        `Status: ${activeFault === 'S1_OPEN' ? 'OPEN FAULT' : activeFault === 'S1_SHORT' ? 'SHORT FAULT' : isS1VisuallyOn ? 'CONDUCTING (ON)' : 'OFF'}`,
      ],
    },
    DIODE: {
      title: 'Freewheel / Synchronous Diode (D1 / S2)',
      subtitle: 'Schottky Ultra-Fast Recirculation Diode',
      readouts: [
        `Forward Current If: ${isDiodeVisuallyOn ? Iout.toFixed(2) : '0.00'} A`,
        `Forward Drop Vf: 0.70 V`,
        `Reverse Voltage: ${Vin.toFixed(1)} V`,
        `Conduction State: ${activeFault === 'DIODE_OPEN' ? 'OPEN FAULT' : isDiodeVisuallyOn ? 'FREEWHEELING (ON)' : 'REVERSE BIASED (OFF)'}`,
      ],
    },
    L: {
      title: 'High-Frequency Power Choke (Inductor L)',
      subtitle: 'Ferrite E-Core Power Inductor',
      readouts: [
        `Inductance Value: ${inductanceuH} µH`,
        `DC Average Current IL: ${Iout.toFixed(2)} A`,
        `Peak-to-Peak Ripple ΔIL: ${deltaIL.toFixed(2)} A`,
        `Stored Energy EL: ${energyL_mJ.toFixed(2)} mJ`,
        `Saturation Status: ${activeFault === 'L_SAT' ? 'CORE SATURATED (50% DROP)' : 'NORMAL'}`,
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
        `ESR Status: ${activeFault === 'C_ESR_HIGH' ? 'HIGH ESR (200mΩ 3x RIPPLE)' : 'NORMAL (10mΩ)'}`,
      ],
    },
    Q1: {
      title: 'DC Input Air Circuit Breaker (52-Q1)',
      subtitle: 'Primary Infeed Power Isolation',
      readouts: [
        `Breaker Rating: 400A 500VDC 25kA Icu`,
        `Operating State: ${q1Closed ? 'CLOSED (LIVE)' : 'OPEN (TRIPPED)'}`,
        `Infeed Voltage: ${Vin} V DC`,
      ],
    },
    Q2: {
      title: 'DC Bus Isolation Switch (52-Q2)',
      subtitle: 'Substation Battery / Bus Tie Breaker',
      readouts: [
        `Breaker Rating: 250A 250VDC 2-Pole`,
        `Operating State: ${q2Closed ? 'CLOSED (CONNECTED)' : 'OPEN (ISOLATED)'}`,
      ],
    },
    Q3: {
      title: 'Substation Load Disconnect Isolator (89-Q3)',
      subtitle: 'Manual Auxiliary Load Disconnector',
      readouts: [
        `Switch Rating: 250A Lockout Disconnector`,
        `Operating State: ${q3Closed ? 'CLOSED (FEEDING LOAD)' : 'OPEN (ISOLATED)'}`,
      ],
    },
    LOAD: {
      title: 'Substation Critical Auxiliary DC Load',
      subtitle: 'Substation Control & Protection Load',
      readouts: [
        `Load Resistance R: ${loadR} Ω`,
        `Output Voltage: ${Vout_abs.toFixed(2)} V`,
        `Load Current Iout: ${Iout.toFixed(2)} A`,
        `Output Power Pout: ${Pout.toFixed(1)} W`,
        `System Efficiency η: ${etaPct.toFixed(1)} %`,
      ],
    },
  };

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3 shadow-2xl relative flex flex-col gap-3 font-mono overflow-hidden select-none min-h-[60vh]">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px] opacity-40 pointer-events-none" />

      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
            LIVE ANIMATED SCHEMATIC WORKBENCH
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

          <div className="flex items-center gap-1 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1 shadow-md">
            <button type="button" onClick={handleZoomIn} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer" title="Zoom In (+)">
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-300 px-1.5">{Math.round(zoomScale * 100)}%</span>
            <button type="button" onClick={handleZoomOut} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer" title="Zoom Out (-)">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleResetZoom} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer ml-1" title="Reset Zoom (100%)">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full flex-1 min-h-[500px] overflow-hidden rounded-xl border border-blue-900/40 bg-[#040812] flex items-center justify-center p-2">
        <svg viewBox="0 0 800 400" className="w-full h-full max-h-[550px] transition-transform duration-300" style={{ transform: `scale(${zoomScale})` }}>
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

          <line x1="80" y1="120" x2="720" y2="120" stroke="#1e293b" strokeWidth="4" />
          <line x1="80" y1="120" x2="720" y2="120" stroke={isInputPowered ? '#00e5a0' : '#334155'} strokeWidth={isInputPowered ? '3' : '2'} strokeOpacity={isInputPowered ? '0.9' : '0.4'} filter={isInputPowered ? 'url(#glow-emerald)' : undefined} />
          <line x1="80" y1="300" x2="720" y2="300" stroke="#334155" strokeWidth="4" />
          <line x1="80" y1="300" x2="720" y2="300" stroke="#0284c7" strokeWidth="2" strokeDasharray="6,4" />

          {isInputPowered && (
            <>
              <line x1="80" y1="120" x2="720" y2="120" stroke={isS1VisuallyOn ? '#00ffb7' : '#38bdf8'} strokeWidth="4" strokeDasharray="8,12" strokeDashoffset={-dotOffset} />
              {!isS1VisuallyOn && (
                <line x1="380" y1="300" x2="380" y2="120" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6,8" strokeDashoffset={-dotOffset} />
              )}
            </>
          )}

          <g className="cursor-pointer group" onMouseEnter={() => setHoveredComp('VinSource')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('VinSource')}>
            <line x1="80" y1="120" x2="80" y2="300" stroke="#00e5a0" strokeWidth="3" />
            <circle cx="80" cy="210" r="28" fill="#0c1527" stroke="#00e5a0" strokeWidth="3" filter="url(#glow-emerald)" />
            <text x="80" y="205" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="monospace">+{Vin}V</text>
            <text x="80" y="222" fill="#00e5a0" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="monospace">DC SOURCE</text>
          </g>

          <g className="cursor-pointer transition-all" onClick={onToggleQ1} onMouseEnter={() => setHoveredComp('Q1')} onMouseLeave={() => setHoveredComp(null)}>
            <rect x="145" y="102" width="60" height="36" rx="8" fill={q1Closed ? '#064e3b' : '#881337'} stroke={q1Closed ? '#10b981' : '#f43f5e'} strokeWidth="2.5" />
            {q1Closed ? <line x1="155" y1="120" x2="195" y2="120" stroke="#ffffff" strokeWidth="3" /> : <line x1="155" y1="120" x2="190" y2="106" stroke="#f43f5e" strokeWidth="3" />}
            <text x="175" y="94" fill="#38bdf8" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">52-Q1 INFEED</text>
            <text x="175" y="152" fill={q1Closed ? '#34d399' : '#fb7185'} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">{q1Closed ? '[CLOSED]' : '[TRIPPED]'}</text>
          </g>

          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('S1')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('S1MOSFET')}>
            <rect x="260" y="98" width="64" height="44" rx="10" fill={activeFault === 'S1_OPEN' ? '#18181b' : isS1VisuallyOn ? '#064e3b' : '#0c1527'} stroke={activeFault === 'S1_OPEN' ? '#71717a' : activeFault === 'S1_SHORT' ? '#ef4444' : isS1VisuallyOn ? '#00e5a0' : '#334155'} strokeWidth="2.5" filter={isS1VisuallyOn ? 'url(#glow-emerald)' : undefined} />
            <Cpu x="282" y="104" className={`w-5 h-5 ${isS1VisuallyOn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <text x="292" y="134" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">S1 MOSFET</text>
            <circle cx="292" cy="86" r="5" fill={isS1VisuallyOn ? '#00ffb7' : '#334155'} />
            <text x="292" y="74" fill="#38bdf8" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">GATE {duty}%</text>
          </g>

          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('DIODE')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('S2Diode')}>
            <circle cx="380" cy="120" r="5" fill="#38bdf8" />
            <text x="380" y="105" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">SW NODE</text>
            <line x1="380" y1="120" x2="380" y2="300" stroke={isDiodeVisuallyOn ? '#38bdf8' : '#334155'} strokeWidth="3" />
            <rect x="355" y="185" width="50" height="40" rx="8" fill={isDiodeVisuallyOn ? '#092d54' : '#0c1527'} stroke={isDiodeVisuallyOn ? '#38bdf8' : '#334155'} strokeWidth="2" filter={isDiodeVisuallyOn ? 'url(#glow-cyan)' : undefined} />
            <polygon points="370,215 390,215 380,195" fill={isDiodeVisuallyOn ? '#38bdf8' : '#64748b'} />
            <line x1="370" y1="195" x2="390" y2="195" stroke={isDiodeVisuallyOn ? '#38bdf8' : '#64748b'} strokeWidth="2" />
            <text x="380" y="238" fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">D1 FREEWHEEL</text>
          </g>

          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('L')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('LInductor')}>
            <rect x="430" y="102" width="90" height="36" rx="10" fill={activeFault === 'L_SAT' ? '#78350f' : isInputPowered ? '#064e3b' : '#0c1527'} stroke={activeFault === 'L_SAT' ? '#f59e0b' : '#00e5a0'} strokeWidth={isS1VisuallyOn ? '3' : '2'} filter={isS1VisuallyOn ? 'url(#glow-amber)' : undefined} />
            <path d="M 440 120 Q 450 106, 460 120 Q 470 106, 480 120 Q 490 106, 500 120 Q 510 106, 520 120" fill="none" stroke={activeFault === 'L_SAT' ? '#f59e0b' : '#00ffb7'} strokeWidth="3.5" />
            <text x="475" y="94" fill="#00ffb7" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">L = {inductanceuH}µH</text>
            <text x="475" y="152" fill="#fbbf24" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">EL={energyL_mJ.toFixed(1)}mJ</text>
          </g>

          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('C')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('CCapacitor')}>
            <line x1="560" y1="120" x2="560" y2="300" stroke="#00e5a0" strokeWidth="2.5" />
            <line x1="545" y1="195" x2="575" y2="195" stroke="#00e5a0" strokeWidth="4" filter="url(#glow-emerald)" />
            <line x1="545" y1="205" x2="575" y2="205" stroke="#00e5a0" strokeWidth="4" filter="url(#glow-emerald)" />
            <text x="560" y="184" fill="#34d399" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">C = {capacitanceuF}µF</text>
            <text x="560" y="222" fill="#38bdf8" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">EC={energyC_mJ.toFixed(1)}mJ</text>
          </g>

          <g className="cursor-pointer transition-all" onClick={onToggleQ2} onMouseEnter={() => setHoveredComp('Q2')} onMouseLeave={() => setHoveredComp(null)}>
            <rect x="605" y="102" width="45" height="36" rx="8" fill={q2Closed ? '#064e3b' : '#881337'} stroke={q2Closed ? '#10b981' : '#f43f5e'} strokeWidth="2" />
            {q2Closed ? <line x1="612" y1="120" x2="643" y2="120" stroke="#ffffff" strokeWidth="3" /> : <line x1="612" y1="120" x2="640" y2="108" stroke="#f43f5e" strokeWidth="3" />}
            <text x="627" y="94" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">52-Q2</text>
          </g>

          <g className="cursor-pointer transition-all" onClick={onToggleQ3} onMouseEnter={() => setHoveredComp('Q3')} onMouseLeave={() => setHoveredComp(null)}>
            <rect x="665" y="102" width="45" height="36" rx="8" fill={q3Closed ? '#064e3b' : '#881337'} stroke={q3Closed ? '#10b981' : '#f43f5e'} strokeWidth="2" />
            {q3Closed ? <line x1="672" y1="120" x2="703" y2="120" stroke="#ffffff" strokeWidth="3" /> : <line x1="672" y1="120" x2="700" y2="108" stroke="#f43f5e" strokeWidth="3" />}
            <text x="687" y="94" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">89-Q3</text>
          </g>

          <g className="cursor-pointer" onMouseEnter={() => setHoveredComp('LOAD')} onMouseLeave={() => setHoveredComp(null)} onClick={() => onSelectComponent && onSelectComponent('Load')}>
            <line x1="740" y1="120" x2="740" y2="300" stroke="#00e5a0" strokeWidth="3" />
            <rect x="715" y="180" width="50" height="60" rx="10" fill="#091b36" stroke="#38bdf8" strokeWidth="2.5" filter="url(#glow-cyan)" />
            <text x="740" y="202" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">{Vout_abs.toFixed(1)}V</text>
            <text x="740" y="218" fill="#34d399" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">{Iout.toFixed(1)}A</text>
            <text x="740" y="232" fill="#fbbf24" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">{Pout.toFixed(0)}W</text>
            <text x="740" y="254" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">LOAD R={loadR}Ω</text>
          </g>
        </svg>
      </div>

      {hoveredComp && TOOLTIPS[hoveredComp] && (
        <div className="relative z-20 w-full p-3 bg-[#0d1729] border-2 border-cyan-500/80 rounded-xl shadow-2xl flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1">
            <span className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              {TOOLTIPS[hoveredComp].title}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">{TOOLTIPS[hoveredComp].subtitle}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-slate-200">
            {TOOLTIPS[hoveredComp].readouts.map((rd, i) => (
              <span key={i} className="bg-[#050b18] px-2 py-1 rounded border border-blue-900/60">
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
