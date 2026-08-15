import React, { useState, useEffect } from 'react';
import { ActiveSource, STSFaults } from '../types/staticSwitch';

interface StaticSwitchSLDProps {
  qaClosed: boolean;
  qbClosed: boolean;
  q3Closed: boolean;
  bypassSource?: 'A' | 'B';
  activeBridge: ActiveSource;
  onToggleQA: () => void;
  onToggleQB: () => void;
  onToggleQ3: () => void;
  onSelectBypassSource?: (source: 'A' | 'B') => void;
  voltageA: number;
  freqA: number;
  voltageB: number;
  freqB: number;
  phaseB: number;
  loadCurrent: number;
  faults: STSFaults;
}

interface ComponentInfo {
  name: string;
  rating: string;
  standard: string;
}

const TOOLTIPS: Record<string, ComponentInfo> = {
  QA: { name: 'Source A Input Circuit Breaker (52-QA)', rating: '800A 35kA Icu, 2P (L+N), IEC 60617 [X] Symbol', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  QB: { name: 'Source B Input Circuit Breaker (52-QB)', rating: '800A 35kA Icu, 2P (L+N), IEC 60617 [X] Symbol', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  SCR_A: { name: 'Source A Static Switch SCR Pair (T1-T2)', rating: '1600V / 1000A Line L Anti-Parallel SCRs (< 2ms transfer)', standard: 'IEC 62040-3 / IEC 60617-7' },
  SCR_B: { name: 'Source B Static Switch SCR Pair (T1-T2)', rating: '1600V / 1000A Line L Anti-Parallel SCRs (< 2ms transfer)', standard: 'IEC 62040-3 / IEC 60617-7' },
  Q3_SEL: { name: 'Maintenance Bypass Selector Switch (Q3-SEL)', rating: '800A 2P 2-Position Changeover Switch (IEC 60617-7)', standard: 'IEC 60947-3 / IEEE 315' },
  Q3: { name: 'Maintenance Bypass Breaker (52-Q3)', rating: '800A 35kA Icu, 2P (L+N) Mechanical Interlocked', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  LOAD: { name: 'Critical Plant Output Busbar (1Φ + N)', rating: '230VAC 1Φ + N / 800A Continuous Rating', standard: 'IEC 62040-3 / IEEE 1547' },
};

export const StaticSwitchSLD: React.FC<StaticSwitchSLDProps> = ({
  qaClosed,
  qbClosed,
  q3Closed,
  bypassSource: propBypassSource,
  activeBridge,
  onToggleQA,
  onToggleQB,
  onToggleQ3,
  onSelectBypassSource,
  voltageA,
  freqA,
  voltageB,
  freqB,
  phaseB,
  loadCurrent,
  faults,
}) => {
  const [internalBypassSource, setInternalBypassSource] = useState<'A' | 'B'>('A');
  const [animFrame, setAnimFrame] = useState<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const effectiveBypassSource = propBypassSource ?? internalBypassSource;

  const handleSelectBypassSource = (source: 'A' | 'B') => {
    if (onSelectBypassSource) {
      onSelectBypassSource(source);
    }
    setInternalBypassSource(source);
  };

  useEffect(() => {
    let timer: number;
    const update = () => {
      setAnimFrame((prev) => (prev + 1) % 360);
      timer = requestAnimationFrame(update);
    };
    timer = requestAnimationFrame(update);
    return () => cancelAnimationFrame(timer);
  }, []);

  // Source States
  const sourceAOnline = voltageA > 180 && !faults.sourceALoss;
  const sourceBOnline = voltageB > 180;

  const sourceAThroughQA = sourceAOnline && qaClosed;
  const sourceBThroughQB = sourceBOnline && qbClosed;

  const bridgeAConducting = (activeBridge === 'A' || activeBridge === 'BOTH') && sourceAThroughQA;
  const bridgeBConducting = (activeBridge === 'B' || activeBridge === 'BOTH') && sourceBThroughQB;

  // Dual Bypass Conductive Logic
  const bypassSourceEnergized = effectiveBypassSource === 'A' ? sourceAOnline : sourceBOnline;
  const bypassConducting = q3Closed && bypassSourceEnergized;

  const busEnergized = bridgeAConducting || bridgeBConducting || bypassConducting;

  // Active busbar color definition
  const busColor = bridgeAConducting
    ? '#00ff88'
    : bridgeBConducting
    ? '#00f0ff'
    : bypassConducting
    ? (effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff')
    : '#475569';

  // SCR / Thyristor phase firing animation
  const deg = animFrame % 360;
  const activePhase = deg < 120 ? 'L1' : deg < 240 ? 'L2' : 'L3';

  // Render IEC 60617 / IEEE 315 Circuit Breaker (52)
  // IEC 60617 standard symbol for a circuit breaker is a rectangle with diagonal cross [X]
  // combined with open/closed contact switch representation
  const renderIECBreaker = (
    x: number,
    y: number,
    id: string,
    label: string,
    rating: string,
    isClosed: boolean,
    isEnergized: boolean,
    onToggle: () => void,
    deviceNum: string = '52'
  ) => {
    const isHovered = hovered === id;
    const stateColor = isClosed ? (isEnergized ? '#00ff88' : '#ff3355') : '#f59e0b';

    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={onToggle}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Card Frame */}
        <rect
          x={x - 135}
          y={y - 10}
          width={270}
          height={70}
          fill={isHovered ? '#1e293b' : '#0f172a'}
          rx={8}
          stroke={isHovered ? '#00f0ff' : isClosed ? stateColor : '#475569'}
          strokeWidth={isHovered ? 2.5 : 1.5}
          className="shadow-2xl"
        />

        {/* Main Vertical Conductor Line */}
        <line x1={x - 85} y1={y - 10} x2={x - 85} y2={y + 8} stroke={isEnergized ? '#00ff88' : '#64748b'} strokeWidth={3.5} />
        <line x1={x - 85} y1={y + 42} x2={x - 85} y2={y + 60} stroke={isClosed && isEnergized ? '#00ff88' : '#64748b'} strokeWidth={3.5} />

        {/* --- IEC 60617 / IEEE 315 CIRCUIT BREAKER SYMBOL [X] --- */}
        <g transform={`translate(${x - 85}, ${y + 25})`}>
          {/* Outer IEC Breaker Square Box */}
          <rect
            x={-14}
            y={-17}
            width={28}
            height={34}
            fill="#020617"
            stroke={stateColor}
            strokeWidth={2}
            rx={2}
          />
          {/* Diagonal Cross (IEC 60617 Breaker Tripping Function Symbol) */}
          <line x1={-12} y1={-15} x2={12} y2={15} stroke={stateColor} strokeWidth={2} />
          <line x1={12} y1={-15} x2={-12} y2={15} stroke={stateColor} strokeWidth={2} />

          {/* Contact Blade State Indicator */}
          {!isClosed && (
            <line x1={0} y1={17} x2={16} y2={-5} stroke="#f59e0b" strokeWidth={3.5} />
          )}
        </g>

        {/* IEEE Device Number Circle Tag (52) */}
        <circle cx={x - 115} cy={y + 25} r={13} fill="#020617" stroke="#38bdf8" strokeWidth={1.5} />
        <text x={x - 115} y={y + 29} textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="black" fontFamily="monospace">
          {deviceNum}
        </text>

        {/* Label & Rating */}
        <text x={x - 50} y={y + 20} fill="#ffffff" fontSize="12" fontWeight="black" fontFamily="sans-serif">
          {label}
        </text>
        <text x={x - 50} y={y + 36} fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">
          {rating}
        </text>

        {/* Status Badge */}
        <rect
          x={x + 55}
          y={y + 13}
          width={68}
          height={24}
          rx={4}
          fill={isClosed ? (isEnergized ? '#022c22' : '#450a0a') : '#312e81'}
          stroke={isClosed ? (isEnergized ? '#00ff88' : '#ff3355') : '#f59e0b'}
          strokeWidth={1.5}
        />
        <text x={x + 89} y={y + 29} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="black">
          {isClosed ? 'CLOSED' : 'OPEN'}
        </text>
      </g>
    );
  };

  // Render IEC 60617 Anti-Parallel Thyristor (SCR) Pair
  const renderSCRPair = (
    x: number,
    y: number,
    label: string,
    isPhaseActive: boolean,
    isBridgeConducting: boolean,
    isFaulted: boolean = false
  ) => {
    const isConducting = isBridgeConducting && isPhaseActive;
    const fillColor = isFaulted ? '#450a0a' : isConducting ? '#00ff88' : '#0f172a';
    const strokeColor = isFaulted ? '#ff3355' : isConducting ? '#00ff88' : '#38bdf8';

    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Upper SCR (Anode -> Cathode) */}
        <polygon points="-12,-16 12,-16 0,0" fill={fillColor} stroke={strokeColor} strokeWidth={2} />
        <line x1={-14} y1={0} x2={14} y2={0} stroke={strokeColor} strokeWidth={2.5} />

        {/* Lower SCR (Cathode <- Anode) */}
        <polygon points="-12,16 12,16 0,0" fill={fillColor} stroke={strokeColor} strokeWidth={2} />
        <line x1={-14} y1={0} x2={14} y2={0} stroke={strokeColor} strokeWidth={2.5} />

        {/* Gate Lines (IEC 60617 Thyristor Gate Terminal) */}
        <line x1={-8} y1={-8} x2={-16} y2={-14} stroke="#ffd700" strokeWidth={2} />
        <circle cx={-16} cy={-14} r={1.5} fill="#ffd700" />
        <line x1={8} y1={8} x2={16} y2={14} stroke="#ffd700" strokeWidth={2} />
        <circle cx={16} cy={14} r={1.5} fill="#ffd700" />

        <text
          x={24}
          y={4}
          fill={isConducting ? '#00ff88' : '#cbd5e1'}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {label}
        </text>

        {isFaulted && (
          <g>
            <line x1={-14} y1={-16} x2={14} y2={16} stroke="#ff3355" strokeWidth={3.5} />
            <line x1={14} y1={-16} x2={-14} y2={16} stroke="#ff3355" strokeWidth={3.5} />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full max-w-[1000px] mx-auto bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 select-none shadow-2xl font-mono text-slate-100">
      {/* HEADER STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1e293b] pb-4 mb-4 text-xs gap-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-bold">IEC 62040-3 CLASS 1 STS STATUS:</span>
          <span
            className={`px-3 py-1 rounded-full font-black tracking-wider border ${
              bridgeAConducting
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-950/60'
                : bridgeBConducting
                ? 'bg-sky-950/80 text-sky-200 border-sky-400 shadow-lg shadow-sky-950/60'
                : bypassConducting
                ? effectiveBypassSource === 'A'
                  ? 'bg-emerald-950/90 text-emerald-300 border-amber-400'
                  : 'bg-sky-950/90 text-sky-200 border-amber-400'
                : 'bg-red-950/90 text-red-200 border-red-500 animate-pulse'
            }`}
          >
            {bridgeAConducting
              ? 'SOURCE A ACTIVE (PREFERRED SCR)'
              : bridgeBConducting
              ? 'SOURCE B ACTIVE (ALTERNATE SCR)'
              : bypassConducting
              ? `MANUAL MAINTENANCE BYPASS Q3 ACTIVE (FED FROM SOURCE ${effectiveBypassSource})`
              : '🚨 ALL SOURCES ISOLATED / LOAD DE-ENERGIZED'}
          </span>
        </div>

        <div className="flex items-center gap-4 bg-[#020617] px-3.5 py-2 rounded-xl border border-slate-800">
          <span>Source A: <strong className={faults.sourceALoss ? 'text-red-400' : 'text-emerald-400'}>{voltageA.toFixed(0)}V ({freqA.toFixed(1)}Hz)</strong></span>
          <span className="text-slate-600">|</span>
          <span>Source B: <strong className="text-sky-400">{voltageB.toFixed(0)}V ({freqB.toFixed(1)}Hz)</strong></span>
          <span className="text-slate-600">|</span>
          <span>Phase Angle Δθ: <strong className={Math.abs(phaseB) > 10 ? 'text-red-400' : 'text-amber-400'}>{phaseB.toFixed(1)}°</strong></span>
          <span className="text-slate-600">|</span>
          <span>Load Current: <strong className="text-emerald-400">{loadCurrent.toFixed(0)}A</strong></span>
        </div>
      </div>

      {/* HOVER TOOLTIP */}
      {hovered && TOOLTIPS[hovered] && (
        <div className="absolute top-20 right-8 bg-[#020617] border-2 border-[#00f0ff] rounded-xl p-3.5 shadow-2xl z-30 pointer-events-none text-xs max-w-xs">
          <div className="font-bold text-[#00f0ff] text-sm mb-1">{TOOLTIPS[hovered].name}</div>
          <div className="text-slate-200 mb-1">Rating: <span className="text-[#f59e0b] font-bold">{TOOLTIPS[hovered].rating}</span></div>
          <div className="text-slate-400">Standard: <span className="text-white">{TOOLTIPS[hovered].standard}</span></div>
        </div>
      )}

      {/* MAIN SVG CANVAS (980 x 880) */}
      <svg viewBox="0 0 980 880" className="w-full h-auto block overflow-visible select-none">
        <defs>
          <pattern id="stsDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.2" fill="#1e293b" />
          </pattern>

          <filter id="glowGreenSTS" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowCyanSTS" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowAmberSTS" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Canvas Background */}
        <rect width="980" height="880" fill="#020617" />
        <rect width="980" height="880" fill="url(#stsDotGrid)" />
        <rect x="10" y="10" width="960" height="860" fill="none" stroke="#1e293b" strokeWidth="2.5" rx="10" />

        {/* ============================================================== */}
        {/* [BOUNDARY 1] OUTSIDE STS: UPSTREAM POWER SOURCES (TOP REGION) */}
        {/* ============================================================== */}
        <rect x="35" y="14" width="910" height="92" fill="#1e293b" fillOpacity="0.2" stroke="#475569" strokeWidth="1.5" strokeDasharray="6 4" rx="8" />
        <g transform="translate(50, 4)">
          <rect x="0" y="0" width="280" height="20" fill="#334155" rx="4" stroke="#475569" strokeWidth="1" />
          <text x="140" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
            ⚡ OUTSIDE STS: UPSTREAM POWER SUPPLIES
          </text>
        </g>

        {/* ============================================================== */}
        {/* [BOUNDARY 2] INSIDE STS: STATIC SWITCH CUBICLE & ELECTRONICS */}
        {/* ============================================================== */}
        <rect x="35" y="115" width="910" height="425" fill="#0f172a" fillOpacity="0.35" stroke="#38bdf8" strokeWidth="2" strokeDasharray="8 5" rx="12" />
        <g transform="translate(50, 103)">
          <rect x="0" y="0" width="295" height="24" fill="#0284c7" rx="5" />
          <text x="147.5" y="16" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="0.5">
            🔒 INSIDE STATIC SWITCH (STS) ENCLOSURE
          </text>
        </g>

        {/* ============================================================== */}
        {/* [BOUNDARY 3] OUTSIDE STS: DOWNSTREAM CRITICAL LOADS (BOTTOM) */}
        {/* ============================================================== */}
        <rect x="35" y="550" width="910" height="315" fill="#1e293b" fillOpacity="0.2" stroke="#475569" strokeWidth="1.5" strokeDasharray="6 4" rx="8" />
        <g transform="translate(50, 538)">
          <rect x="0" y="0" width="280" height="20" fill="#334155" rx="4" stroke="#475569" strokeWidth="1" />
          <text x="140" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
            🏭 OUTSIDE STS: DOWNSTREAM PLANT LOADS
          </text>
        </g>

        {/* [1] SOURCE A INFEED (LEFT TOP, x = 170) */}
        <g transform="translate(170, 25)">
          <rect x={-105} y={0} width={210} height={44} fill="#0f172a" stroke={sourceAOnline ? '#00ff88' : '#ff3355'} strokeWidth={2} rx={6} />
          <text x={0} y={18} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black">
            SOURCE A (PREFERRED 1Φ+N)
          </text>
          <text x={0} y={34} textAnchor="middle" fill={sourceAOnline ? '#00ff88' : '#ff3355'} fontSize="10" fontWeight="bold">
            230VAC 1Φ+N | fA = {freqA.toFixed(2)}Hz | θA = 0.0°
          </text>

          {/* Infeed Line down to Breaker QA */}
          <line
            x1={0}
            y1={44}
            x2={0}
            y2={110}
            stroke={sourceAOnline ? '#00ff88' : '#64748b'}
            strokeWidth={5}
            filter={sourceAOnline ? 'url(#glowGreenSTS)' : 'none'}
          />
          {sourceAOnline && (
            <line x1={0} y1={44} x2={0} y2={110} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
          )}
        </g>

        {/* TAP POINT FOR MAINTENANCE BYPASS FROM SOURCE A (at x=170, y=85) */}
        <circle cx={170} cy={85} r={5} fill={sourceAOnline ? '#00ff88' : '#64748b'} stroke="#ffffff" strokeWidth={1.5} />
        <line x1={170} y1={85} x2={410} y2={85} stroke={sourceAOnline ? '#00ff88' : '#64748b'} strokeWidth={4} />
        <line x1={410} y1={85} x2={410} y2={125} stroke={sourceAOnline ? '#00ff88' : '#64748b'} strokeWidth={4} />
        {sourceAOnline && (
          <>
            <line x1={170} y1={85} x2={410} y2={85} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-right" />
            <line x1={410} y1={85} x2={410} y2={125} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-down" />
          </>
        )}

        {/* [2] SOURCE B INFEED (RIGHT TOP, x = 810) */}
        <g transform="translate(810, 25)">
          <rect x={-105} y={0} width={210} height={44} fill="#0f172a" stroke={sourceBOnline ? '#00f0ff' : '#ff3355'} strokeWidth={2} rx={6} />
          <text x={0} y={18} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black">
            SOURCE B (ALTERNATE 1Φ+N)
          </text>
          <text x={0} y={34} textAnchor="middle" fill={sourceBOnline ? '#00f0ff' : '#ff3355'} fontSize="10" fontWeight="bold">
            230VAC 1Φ+N | fB = {freqB.toFixed(2)}Hz | θB = {phaseB.toFixed(1)}°
          </text>

          {/* Infeed Line down to Breaker QB */}
          <line
            x1={0}
            y1={44}
            x2={0}
            y2={110}
            stroke={sourceBOnline ? '#00f0ff' : '#64748b'}
            strokeWidth={5}
            filter={sourceBOnline ? 'url(#glowCyanSTS)' : 'none'}
          />
          {sourceBOnline && (
            <line x1={0} y1={44} x2={0} y2={110} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
          )}
        </g>

        {/* TAP POINT FOR MAINTENANCE BYPASS FROM SOURCE B (at x=810, y=85) */}
        <circle cx={810} cy={85} r={5} fill={sourceBOnline ? '#00f0ff' : '#64748b'} stroke="#ffffff" strokeWidth={1.5} />
        <line x1={810} y1={85} x2={570} y2={85} stroke={sourceBOnline ? '#00f0ff' : '#64748b'} strokeWidth={4} />
        <line x1={570} y1={85} x2={570} y2={125} stroke={sourceBOnline ? '#00f0ff' : '#64748b'} strokeWidth={4} />
        {sourceBOnline && (
          <>
            <line x1={810} y1={85} x2={570} y2={85} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-left" />
            <line x1={570} y1={85} x2={570} y2={125} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-down" />
          </>
        )}

        {/* [2.5] IEC 60617 / IEEE 315 SELECTOR SWITCH SYMBOL (Q3-SEL) BLOCK at x=490, y=125..190 */}
        <g id="bypass-selector" onMouseEnter={() => setHovered('Q3_SEL')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={370}
            y={125}
            width={240}
            height={65}
            fill="#0b1329"
            stroke={effectiveBypassSource === 'A' ? (sourceAOnline ? '#00ff88' : '#f59e0b') : (sourceBOnline ? '#00f0ff' : '#f59e0b')}
            strokeWidth={2}
            rx={8}
            className="shadow-xl"
          />
          <text x={490} y={140} textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="black">
            IEC 60617 CHANGEOVER SELECTOR (Q3-SEL)
          </text>

          {/* Source A Terminal Contact */}
          <g className="cursor-pointer" onClick={() => handleSelectBypassSource('A')}>
            <circle cx={410} cy={162} r={6} fill={effectiveBypassSource === 'A' ? '#00ff88' : '#1e293b'} stroke="#00ff88" strokeWidth={2} />
            <text x={410} y={180} textAnchor="middle" fill={effectiveBypassSource === 'A' ? '#00ff88' : '#94a3b8'} fontSize="9" fontWeight="bold">
              SRC A (POS 1)
            </text>
          </g>

          {/* Source B Terminal Contact */}
          <g className="cursor-pointer" onClick={() => handleSelectBypassSource('B')}>
            <circle cx={570} cy={162} r={6} fill={effectiveBypassSource === 'B' ? '#00f0ff' : '#1e293b'} stroke="#00f0ff" strokeWidth={2} />
            <text x={570} y={180} textAnchor="middle" fill={effectiveBypassSource === 'B' ? '#00f0ff' : '#94a3b8'} fontSize="9" fontWeight="bold">
              SRC B (POS 2)
            </text>
          </g>

          {/* Common Output Terminal Contact (Pivot Point at 490, 175) */}
          <circle cx={490} cy={175} r={5} fill="#ffffff" stroke="#38bdf8" strokeWidth={2} />

          {/* Switch Contact Blade Lever pointing to Active Position A or B */}
          <line
            x1={490}
            y1={175}
            x2={effectiveBypassSource === 'A' ? 410 : 570}
            y2={162}
            stroke={effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff'}
            strokeWidth={3.5}
          />

          {/* Mechanical Linkage Arc */}
          <path
            d="M 425 152 Q 490 142 555 152"
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        </g>

        {/* Feeder line from Selector Output (490, 190) down to 52-Q3 Input (490, 225) */}
        <line
          x1={490}
          y1={190}
          x2={490}
          y2={225}
          stroke={bypassSourceEnergized ? (effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff') : '#64748b'}
          strokeWidth={4}
          filter={bypassSourceEnergized ? (effectiveBypassSource === 'A' ? 'url(#glowGreenSTS)' : 'url(#glowCyanSTS)') : 'none'}
        />
        {bypassSourceEnergized && (
          <line x1={490} y1={190} x2={490} y2={225} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-down" />
        )}

        {/* [3] BREAKER 52-QA (SOURCE A) at (170, 135) */}
        <g transform="translate(170, 135)">
          {renderIECBreaker(0, 0, 'QA', '52-QA Source A Breaker', '800A 35kA Icu [X]', qaClosed, sourceAOnline, onToggleQA, '52')}
        </g>

        {/* Line from Breaker QA bottom (y=185) to SCR Bridge A top (y=255) */}
        <line
          x1={170}
          y1={185}
          x2={170}
          y2={255}
          stroke={sourceAThroughQA ? '#00ff88' : '#64748b'}
          strokeWidth={5}
          filter={sourceAThroughQA ? 'url(#glowGreenSTS)' : 'none'}
        />
        {sourceAThroughQA && (
          <line x1={170} y1={185} x2={170} y2={255} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
        )}

        {/* [4] BREAKER 52-QB (SOURCE B) at (810, 135) */}
        <g transform="translate(810, 135)">
          {renderIECBreaker(0, 0, 'QB', '52-QB Source B Breaker', '800A 35kA Icu [X]', qbClosed, sourceBOnline, onToggleQB, '52')}
        </g>

        {/* Line from Breaker QB bottom (y=185) to SCR Bridge B top (y=255) */}
        <line
          x1={810}
          y1={185}
          x2={810}
          y2={255}
          stroke={sourceBThroughQB ? '#00f0ff' : '#64748b'}
          strokeWidth={5}
          filter={sourceBThroughQB ? 'url(#glowCyanSTS)' : 'none'}
        />
        {sourceBThroughQB && (
          <line x1={810} y1={185} x2={810} y2={255} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
        )}

        {/* [5] SCR BRIDGE A (SOURCE A) BOX (x=70..270, y=255..495) */}
        <g id="bridge-a" onMouseEnter={() => setHovered('SCR_A')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={70}
            y={255}
            width={200}
            height={240}
            fill="#060c1a"
            stroke={bridgeAConducting ? '#00ff88' : sourceAThroughQA ? '#f59e0b' : '#1e293b'}
            strokeWidth={2.5}
            rx={10}
            className="shadow-2xl"
          />
          <text x={170} y={277} textAnchor="middle" fill="#00ff88" fontSize="12" fontWeight="black">
            SCR STATIC SWITCH A (PREFERRED)
          </text>
          <text x={170} y={293} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
            IEC 60617 1Φ+N Anti-Parallel SCRs (&lt; 2ms)
          </text>

          {/* Continuous Internal Conductor Line through Bridge A */}
          <line
            x1={170}
            y1={300}
            x2={170}
            y2={495}
            stroke={bridgeAConducting ? '#00ff88' : sourceAThroughQA ? '#f59e0b' : '#334155'}
            strokeWidth={4}
          />
          {bridgeAConducting && (
            <line x1={170} y1={300} x2={170} y2={495} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-down" />
          )}

          {renderSCRPair(170, 345, 'Phase Line L (T1/T2 Anti-Parallel)', true, bridgeAConducting, faults.scrShortBridgeAT2)}
          
          {/* Solid Neutral Conductor Path */}
          <g transform="translate(170, 430)">
            <line x1={-60} y1={0} x2={60} y2={0} stroke={bridgeAConducting ? '#00ff88' : '#64748b'} strokeWidth={2.5} strokeDasharray="4 2" />
            <text x={0} y={-8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">Neutral N (Solid Conductor)</text>
          </g>
        </g>

        {/* Conductor from SCR Bridge A bottom (495) down to Critical Busbar (570) */}
        <line
          x1={170}
          y1={495}
          x2={170}
          y2={570}
          stroke={bridgeAConducting ? '#00ff88' : '#64748b'}
          strokeWidth={5}
          filter={bridgeAConducting ? 'url(#glowGreenSTS)' : 'none'}
        />
        {bridgeAConducting && (
          <line x1={170} y1={495} x2={170} y2={570} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
        )}
        <circle cx={170} cy={570} r={6} fill={bridgeAConducting ? '#00ff88' : '#30363d'} stroke="#ffffff" strokeWidth={2} />

        {/* [6] SCR BRIDGE B (SOURCE B) BOX (x=710..910, y=255..495) */}
        <g id="bridge-b" onMouseEnter={() => setHovered('SCR_B')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={710}
            y={255}
            width={200}
            height={240}
            fill="#060c1a"
            stroke={bridgeBConducting ? '#00f0ff' : sourceBThroughQB ? '#f59e0b' : '#1e293b'}
            strokeWidth={2.5}
            rx={10}
            className="shadow-2xl"
          />
          <text x={810} y={277} textAnchor="middle" fill="#00f0ff" fontSize="12" fontWeight="black">
            SCR STATIC SWITCH B (ALTERNATE)
          </text>
          <text x={810} y={293} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
            IEC 60617 1Φ+N Anti-Parallel SCRs (&lt; 2ms)
          </text>

          {/* Continuous Internal Conductor Line through Bridge B */}
          <line
            x1={810}
            y1={300}
            x2={810}
            y2={495}
            stroke={bridgeBConducting ? '#00f0ff' : sourceBThroughQB ? '#f59e0b' : '#334155'}
            strokeWidth={4}
          />
          {bridgeBConducting && (
            <line x1={810} y1={300} x2={810} y2={495} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-down" />
          )}

          {renderSCRPair(810, 345, 'Phase Line L (T1/T2 Anti-Parallel)', true, bridgeBConducting, false)}
          
          {/* Solid Neutral Conductor Path */}
          <g transform="translate(810, 430)">
            <line x1={-60} y1={0} x2={60} y2={0} stroke={bridgeBConducting ? '#00f0ff' : '#64748b'} strokeWidth={2.5} strokeDasharray="4 2" />
            <text x={0} y={-8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">Neutral N (Solid Conductor)</text>
          </g>
        </g>

        {/* Conductor from SCR Bridge B bottom (495) down to Critical Busbar (570) */}
        <line
          x1={810}
          y1={495}
          x2={810}
          y2={570}
          stroke={bridgeBConducting ? '#00f0ff' : '#64748b'}
          strokeWidth={5}
          filter={bridgeBConducting ? 'url(#glowCyanSTS)' : 'none'}
        />
        {bridgeBConducting && (
          <line x1={810} y1={495} x2={810} y2={570} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
        )}
        <circle cx={810} cy={570} r={6} fill={bridgeBConducting ? '#00f0ff' : '#30363d'} stroke="#ffffff" strokeWidth={2} />

        {/* [7] MAINTENANCE BYPASS BREAKER 52-Q3 */}
        <g id="bypass-q3" onMouseEnter={() => setHovered('Q3')} onMouseLeave={() => setHovered(null)}>
          {/* Breaker 52-Q3 */}
          <g transform="translate(490, 225)">
            {renderIECBreaker(0, 0, 'Q3', '52-Q3 Maint Bypass', '800A Mechanical Interlock [X]', q3Closed, bypassSourceEnergized, onToggleQ3, '52')}
          </g>

          {/* Vertical below Q3 (y=275) down to Busbar (y=570) */}
          <line
            x1={490}
            y1={275}
            x2={490}
            y2={570}
            stroke={bypassConducting ? (effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff') : '#64748b'}
            strokeWidth={bypassConducting ? 5 : 3}
            strokeDasharray={bypassConducting ? 'none' : '4 4'}
            filter={bypassConducting ? (effectiveBypassSource === 'A' ? 'url(#glowGreenSTS)' : 'url(#glowCyanSTS)') : 'none'}
          />
          {bypassConducting && (
            <line x1={490} y1={275} x2={490} y2={570} stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" className="power-flow-dash-down" />
          )}
          <circle cx={490} cy={570} r={6} fill={bypassConducting ? (effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff') : '#30363d'} stroke="#ffffff" strokeWidth={2} />
        </g>

        {/* [8] CRITICAL OUTPUT BUSBAR (230VAC 1Φ + N) at y = 570 */}
        <g transform="translate(0, 570)" onMouseEnter={() => setHovered('LOAD')} onMouseLeave={() => setHovered(null)}>
          <line
            x1={170}
            y1={0}
            x2={810}
            y2={0}
            stroke={busColor}
            strokeWidth={10}
            filter={busEnergized ? (bridgeAConducting ? 'url(#glowGreenSTS)' : bridgeBConducting ? 'url(#glowCyanSTS)' : (effectiveBypassSource === 'A' ? 'url(#glowGreenSTS)' : 'url(#glowCyanSTS)')) : 'none'}
          />
          {busEnergized && (
            <line x1={170} y1={0} x2={810} y2={0} stroke="#ffffff" strokeWidth={3} strokeDasharray="8 8" className="power-flow-dash-right" />
          )}

          <text x={490} y="-12" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="black" fontFamily="monospace">
            CRITICAL PLANT OUTPUT BUSBAR (230VAC 1Φ + N) | Transfer Time &lt; 2ms
          </text>

          {/* Feeder down to Load from (490, 0) to (490, 80) */}
          <line
            x1={490}
            y1={0}
            x2={490}
            y2={80}
            stroke={busColor}
            strokeWidth={6}
            filter={busEnergized ? 'url(#glowGreenSTS)' : 'none'}
          />
          {busEnergized && (
            <line x1={490} y1={0} x2={490} y2={80} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="6 6" className="power-flow-dash-down" />
          )}
        </g>

        {/* [9] CRITICAL PLANT LOAD BOX (at x=490, y=650) */}
        <g transform="translate(490, 650)">
          <rect
            x={-140}
            y={0}
            width={280}
            height={75}
            fill={!busEnergized ? '#450a0a' : '#0f172a'}
            stroke={!busEnergized ? '#ff3355' : '#00ff88'}
            strokeWidth={!busEnergized ? 3 : 2}
            className={!busEnergized ? 'animate-pulse' : 'shadow-2xl'}
            rx={8}
          />
          <text x={0} y={24} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black">
            CRITICAL PROCESS LOADS (DCS/ESD/F&G)
          </text>
          <text x={0} y={46} textAnchor="middle" fill={!busEnergized ? '#f87171' : '#00ff88'} fontSize="12" fontWeight="black">
            {!busEnergized ? '🚨 LOAD TRIPPED (0V)' : `IL = ${loadCurrent.toFixed(0)} A | 230VAC 1Φ + N ENERGIZED`}
          </text>

          {/* PE Earth / Ground Symbol */}
          <line x1={0} y1={75} x2={0} y2={102} stroke="#00ff88" strokeWidth={2.5} />
          <g transform="translate(0, 102)">
            <line x1={-12} y1={0} x2={12} y2={0} stroke="#00ff88" strokeWidth={2.5} />
            <line x1={-8} y1={4} x2={8} y2={4} stroke="#00ff88" strokeWidth={2.5} />
            <line x1={-4} y1={8} x2={4} y2={8} stroke="#00ff88" strokeWidth={2.5} />
          </g>
        </g>

        {/* TITLE BLOCK */}
        <g transform="translate(630, 770)">
          <rect x={0} y={0} width={330} height={85} fill="#090d16" stroke="#1e293b" strokeWidth={2} rx={4} />
          <line x1={0} y1={22} x2={330} y2={22} stroke="#1e293b" strokeWidth={1} />
          <line x1={0} y1={44} x2={330} y2={44} stroke="#1e293b" strokeWidth={1} />
          <line x1={0} y1={64} x2={330} y2={64} stroke="#1e293b" strokeWidth={1} />
          <line x1={165} y1={0} x2={165} y2={85} stroke="#1e293b" strokeWidth={1} />

          <text x={8} y={15} fill="#64748b" fontSize="8.5">DWG NO: PE-SIM-STS-001</text>
          <text x={173} y={15} fill="#64748b" fontSize="8.5">REV: E (SINGLE-PHASE 230V 1Φ+N)</text>

          <text x={8} y={36} fill="#ffffff" fontSize="9.5" fontWeight="bold">TITLE: Single-Phase Static Switch (STS) SLD</text>

          <text x={8} y={56} fill="#64748b" fontSize="8.5">SCALE: NTS</text>
          <text x={173} y={56} fill="#64748b" fontSize="8.5">DATE: 2026-07-31</text>

          <text x={8} y={78} fill="#64748b" fontSize="8.5">STD: IEC 62040-3 / IEC 60617 / IEEE 315</text>
          <text x={173} y={78} fill="#00f0ff" fontSize="8.5" fontWeight="bold">DRAWN BY: PowerElectronics Lab</text>
        </g>
      </svg>
    </div>
  );
};
