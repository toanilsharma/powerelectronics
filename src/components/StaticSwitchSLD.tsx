import React, { useState, useEffect } from 'react';
import { ActiveSource, STSFaults } from '../types/staticSwitch';
import { SimulationControlHUD } from './shared/SimulationControlHUD';
import { audioAcoustics } from '../engine/AudioAcoustics';

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
  outputVoltage?: number;
  faults: STSFaults;
  nominalVoltageRating?: '110V' | '220V';
  onSelectNominalVoltage?: (voltage: '110V' | '220V') => void;
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
  LOAD: { name: 'Critical Plant Output Busbar (1Φ + N)', rating: '800A Continuous Rating, IEC 62040-3 Class 1', standard: 'IEC 62040-3 / IEEE 1547' },
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
  outputVoltage,
  faults,
  nominalVoltageRating = '220V',
  onSelectNominalVoltage,
}) => {
  const [internalBypassSource, setInternalBypassSource] = useState<'A' | 'B'>('A');
  const [animFrame, setAnimFrame] = useState<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);

  // STS Transfer Drill & Out-of-Phase Flashover States (Gap 15)
  const [relay25Override, setRelay25Override] = useState<boolean>(false);
  const [transferDrillState, setTransferDrillState] = useState<'idle' | 'bumpless' | 'blocked' | 'flashover'>('idle');
  const [fusesBlown, setFusesBlown] = useState<boolean>(false);
  const [showTransferScope, setShowTransferScope] = useState<boolean>(true);

  const handleInitiateTransfer = (target: 'A' | 'B') => {
    if (fusesBlown) return;
    audioAcoustics.playBreakerClick();
    const absPhaseDiff = Math.abs(phaseB);
    if (absPhaseDiff <= 10.0) {
      setTransferDrillState('bumpless');
      setTimeout(() => setTransferDrillState('idle'), 4000);
    } else {
      if (!relay25Override) {
        setTransferDrillState('blocked');
        setTimeout(() => setTransferDrillState('idle'), 4000);
      } else {
        setTransferDrillState('flashover');
        setFusesBlown(true);
      }
    }
  };

  const handleResetFuses = () => {
    audioAcoustics.playBreakerClick();
    setFusesBlown(false);
    setTransferDrillState('idle');
  };

  // Pan & Zoom Fit-To-Screen States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const effectiveBypassSource = propBypassSource ?? internalBypassSource;

  const handleSelectBypassSource = (source: 'A' | 'B') => {
    audioAcoustics.playBreakerClick();
    if (onSelectBypassSource) {
      onSelectBypassSource(source);
    }
    setInternalBypassSource(source);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPos({ x: 0, y: 0 });
  };

  // Simulation Slow-Motion & Freeze State for Sub-Cycle Transfer Analysis
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [timeDilation, setTimeDilation] = useState<number>(1);
  const [simTimeUs, setSimTimeUs] = useState<number>(0);

  useEffect(() => {
    if (isSimPaused) return;
    let timer: number;
    let lastT = performance.now();
    const update = (now: number) => {
      const dt = now - lastT;
      lastT = now;
      setSimTimeUs((prev) => prev + dt * 1000 * timeDilation);
      setAnimFrame((prev) => (prev + 1.5 * timeDilation) % 360);
      timer = requestAnimationFrame(update);
    };
    timer = requestAnimationFrame(update);
    return () => cancelAnimationFrame(timer);
  }, [isSimPaused, timeDilation]);

  // Source Online States (Dynamically scaled for 110V AC vs 220V AC systems)
  const minOnlineV = nominalVoltageRating === '110V' ? 75 : 150;
  const sourceAOnline = voltageA > minOnlineV && !faults.sourceALoss;
  const sourceBOnline = voltageB > minOnlineV;

  const sourceAThroughQA = sourceAOnline && qaClosed;
  const sourceBThroughQB = sourceBOnline && qbClosed;

  const bridgeAConducting = (activeBridge === 'A' || activeBridge === 'BOTH') && sourceAThroughQA;
  const bridgeBConducting = (activeBridge === 'B' || activeBridge === 'BOTH') && sourceBThroughQB;

  // Dual Bypass Conductive Logic
  const bypassSourceEnergized = effectiveBypassSource === 'A' ? sourceAOnline : sourceBOnline;
  const bypassConducting = q3Closed && bypassSourceEnergized;

  const busEnergized = bridgeAConducting || bridgeBConducting || bypassConducting;

  // Active busbar color & glow filter definition
  const busColor = bridgeAConducting
    ? '#00ff88'
    : bridgeBConducting
    ? '#00f0ff'
    : bypassConducting
    ? (effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff')
    : '#ff3355';

  const activeGlowFilter = !busEnergized
    ? 'none'
    : bridgeAConducting || (bypassConducting && effectiveBypassSource === 'A')
    ? 'url(#glowGreenSTS)'
    : 'url(#glowCyanSTS)';

  // SCR / Thyristor phase firing animation
  const deg = animFrame % 360;
  const activePhase = deg < 120 ? 'L1' : deg < 240 ? 'L2' : 'L3';

  // Render IEC 60617 / IEEE 315 Circuit Breaker (52)
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
        onClick={() => {
          audioAcoustics.playBreakerClick();
          onToggle();
        }}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Card Frame (Width 270, centered from x-135 to x+135) */}
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

        {/* IEEE Device Number Circle Tag (52) on far left */}
        <circle cx={x - 110} cy={y + 25} r={13} fill="#020617" stroke="#38bdf8" strokeWidth={1.5} />
        <text x={x - 110} y={y + 29} textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="black" fontFamily="monospace">
          {deviceNum}
        </text>

        {/* --- MAIN VERTICAL CONDUCTOR LINE PASSING EXACTLY THROUGH CENTER (x) --- */}
        <line x1={x} y1={y - 10} x2={x} y2={y + 8} stroke={isEnergized ? '#00ff88' : '#64748b'} strokeWidth={4} />
        <line x1={x} y1={y + 42} x2={x} y2={y + 60} stroke={isClosed && isEnergized ? '#00ff88' : '#64748b'} strokeWidth={4} />

        {/* Animated Power Flow Dashes through Breaker when Energized & Closed */}
        {isClosed && isEnergized && (
          <>
            <line x1={x} y1={y - 10} x2={x} y2={y + 8} stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" className="power-flow-dash-down" />
            <line x1={x} y1={y + 42} x2={x} y2={y + 60} stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" className="power-flow-dash-down" />
          </>
        )}

        {/* --- IEC 60617 / IEEE 315 CIRCUIT BREAKER SYMBOL [X] (CENTERED ON x) --- */}
        <g transform={`translate(${x}, ${y + 25})`}>
          <rect
            x={-14}
            y={-17}
            width={28}
            height={34}
            fill="#020617"
            stroke={stateColor}
            strokeWidth={2.5}
            rx={2}
          />
          <line x1={-12} y1={-15} x2={12} y2={15} stroke={stateColor} strokeWidth={2.5} />
          <line x1={12} y1={-15} x2={-12} y2={15} stroke={stateColor} strokeWidth={2.5} />

          {/* Contact Blade Disconnect Position when Open */}
          {!isClosed && (
            <line x1={0} y1={17} x2={18} y2={-5} stroke="#f59e0b" strokeWidth={3.5} />
          )}
        </g>

        {/* Breaker Label & Rating Text (Placed on right side of conductor line, x+22) */}
        <text x={x + 22} y={y + 18} fill="#ffffff" fontSize="11" fontWeight="black" fontFamily="sans-serif">
          {label}
        </text>
        <text x={x + 22} y={y + 34} fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
          {rating}
        </text>

        {/* Status Badge (CLOSED / OPEN) */}
        <rect
          x={x + 65}
          y={y + 42}
          width={58}
          height={18}
          rx={4}
          fill={isClosed ? (isEnergized ? '#022c22' : '#450a0a') : '#312e81'}
          stroke={isClosed ? (isEnergized ? '#00ff88' : '#ff3355') : '#f59e0b'}
          strokeWidth={1.5}
        />
        <text x={x + 94} y={y + 54} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="black">
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
    <div className="relative w-full bg-[#0b0f17] border-2 border-[#1e293b] rounded-2xl p-3 sm:p-4 select-none shadow-2xl font-mono text-slate-100 overflow-hidden">
      {/* HEADER STATUS BAR & CONTROL ROW */}
      <div className="flex flex-col gap-2 border-b border-[#1e293b] pb-3 mb-2 text-xs">
        {/* Top Row: STS Status Badge & Interactive Nominal Voltage Rating Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold text-[11px]">IEC 62040-3 CLASS 1 STS STATUS:</span>
            <span
              className={`px-3 py-1 rounded-full font-black tracking-wider text-xs border ${
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

          {/* INTERACTIVE NOMINAL VOLTAGE RATING SELECTOR (LEFT/TOP SIDE) */}
          <div className="flex items-center gap-1.5 bg-[#020617] px-2 py-1 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AC RATING:</span>
            <button
              onClick={() => onSelectNominalVoltage?.('110V')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer border ${
                nominalVoltageRating === '110V'
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-md shadow-amber-950/50 scale-105'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Select 110V AC Single-Phase System Rating"
            >
              ⚡ 110V AC
            </button>
            <button
              onClick={() => onSelectNominalVoltage?.('220V')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer border ${
                nominalVoltageRating === '220V'
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-950/50 scale-105'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Select 220V AC Single-Phase System Rating"
            >
              ⚡ 220V AC
            </button>
          </div>
        </div>

        {/* Second Row: Nominal Telemetry Box on Left + Non-Overlapping Pan/Zoom Controls on Right */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Telemetry Readings Box */}
          <div className="flex items-center gap-3 bg-[#020617] px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]">
            <span>Source A: <strong className={faults.sourceALoss ? 'text-red-400' : 'text-emerald-400'}>{voltageA.toFixed(0)}V ({freqA.toFixed(1)}Hz)</strong></span>
            <span className="text-slate-700">|</span>
            <span>Source B: <strong className="text-sky-400">{voltageB.toFixed(0)}V ({freqB.toFixed(1)}Hz)</strong></span>
            <span className="text-slate-700">|</span>
            <span>Phase Angle Δθ: <strong className={Math.abs(phaseB) > 10 ? 'text-red-400' : 'text-amber-400'}>{phaseB.toFixed(1)}°</strong></span>
            <span className="text-slate-700">|</span>
            <span>Load Current: <strong className="text-emerald-400">{loadCurrent.toFixed(0)}A</strong></span>
          </div>

          {/* Pan & Zoom Controls (Shifted to right side below/next to ratings, ZERO overlap) */}
          <div className="flex items-center gap-1.5 bg-[#070b14] border-2 border-slate-700 px-2.5 py-1 rounded-xl shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">VIEW:</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-cyan-400 transition-all active:scale-95"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-cyan-400 transition-all active:scale-95"
              title="Zoom Out"
            >
              -
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded text-[10px] font-bold text-cyan-300 transition-all active:scale-95"
              title="Reset View to Fit Screen"
            >
              FIT SCREEN
            </button>
          </div>
        </div>

        {/* SIMULATION CONTROL HUD (SLOW MOTION 0.5x, 0.2x, 0.1x .. 0.0001x, FREEZE & STEPPING FOR SUB-CYCLE ANALYSIS) */}
        <div className="w-full">
          <SimulationControlHUD
            timeDilation={timeDilation}
            onTimeDilationChange={setTimeDilation}
            isPaused={isSimPaused}
            onTogglePause={() => setIsSimPaused(!isSimPaused)}
            onStepForward={() => setSimTimeUs((prev) => prev + 100)}
            onStepBackward={() => setSimTimeUs((prev) => Math.max(0, prev - 100))}
            onReset={() => {
              setIsSimPaused(false);
              setTimeDilation(1);
              setSimTimeUs(0);
            }}
            simTimeUs={simTimeUs}
            speedPresets={[1, 0.5, 0.2, 0.1, 0.01, 0.001, 0.0001]}
          />
        </div>

        {/* MECHANICAL INTERLOCK SAFETY WARNING BANNER */}
        {q3Closed && (qaClosed || qbClosed) && (
          <div className="flex items-center justify-between gap-2 bg-amber-950/90 border-2 border-amber-500/80 text-amber-200 px-3 py-1.5 rounded-xl font-mono text-[11px] animate-pulse shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span className="font-extrabold text-amber-300">
                MECHANICAL INTERLOCK WARNING (ANSI 11 / IEC 60947-2):
              </span>
              <span>52-Q3 Maintenance Bypass Breaker is CLOSED while SCR input breakers (52-QA/52-QB) remain closed! Open 52-QA & 52-QB to isolate SCR modules.</span>
            </div>
            <span className="px-2 py-0.5 bg-amber-900/80 border border-amber-400 rounded text-[10px] font-black text-amber-300 shrink-0">
              MBB BYPASS PARALLEL FEED
            </span>
          </div>
        )}
        {/* TRANSFER DRILL & OUT-OF-PHASE COMMUTATION CONTROLS (GAP 15) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070d18] border border-cyan-900/60 rounded-xl p-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-cyan-400 flex items-center gap-1">
              <span>⚡</span> STS TRANSFER DRILL:
            </span>
            <button
              onClick={() => handleInitiateTransfer('B')}
              disabled={fusesBlown}
              className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                fusesBlown
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-md active:scale-95'
              }`}
            >
              TRANSFER TO SRC B
            </button>
            <button
              onClick={() => handleInitiateTransfer('A')}
              disabled={fusesBlown}
              className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                fusesBlown
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md active:scale-95'
              }`}
            >
              TRANSFER TO SRC A
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRelay25Override(!relay25Override)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                relay25Override
                  ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              }`}
            >
              <span>{relay25Override ? '⚠️ RELAY 25 OVERRIDDEN (DANGER)' : '🛡️ RELAY 25 ENFORCED (SAFE)'}</span>
            </button>

            <button
              onClick={() => setShowTransferScope(!showTransferScope)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showTransferScope
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span>🔍 SUB-CYCLE TRANSFER SCOPE (&lt;4ms)</span>
            </button>

            {fusesBlown && (
              <button
                onClick={handleResetFuses}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold transition-all active:scale-95 shadow-lg"
              >
                REPLACE FUSES & RESET STS
              </button>
            )}
          </div>
        </div>

        {/* SUB-CYCLE TRANSFER WAVEFORM SPLICER SCOPE OVERLAY (<4ms) */}
        {showTransferScope && (
          <div className="bg-[#050b14] border border-cyan-500/40 rounded-xl p-3 shadow-2xl flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs font-mono">
              <span className="text-cyan-400 font-black flex items-center gap-1.5">
                <span>⚡</span> SUB-CYCLE COMMUTATION SPLICER SCOPE (IEC 62040-3 CLASS 1 &lt; 4.0ms)
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/40 text-[10px]">
                  TRANSFER TIME: 2.45 ms
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40 text-[10px]">
                  di/dt: 42 A/µs (SAFE)
                </span>
                <button
                  type="button"
                  onClick={() => setShowTransferScope(false)}
                  className="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SVG Splicer Oscilloscope */}
            <div className="w-full h-24 bg-[#020610] rounded-lg border border-slate-800 relative overflow-hidden">
              <svg viewBox="0 0 600 100" className="w-full h-full" preserveAspectRatio="none">
                {/* Zero line */}
                <line x1="0" y1="50" x2="600" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                {/* Transfer boundary marker (t = 2.4ms window at x = 235..290) */}
                <rect x="235" y="0" width="55" height="100" fill="#0284c7" fillOpacity="0.15" />
                <line x1="235" y1="0" x2="235" y2="100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="290" y1="0" x2="290" y2="100" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="262" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Δt = 2.45ms
                </text>

                {/* Source A Voltage: active from 0 to 240, then commutating to 0 */}
                <path
                  d="M 0 50 Q 60 5 120 50 Q 180 95 240 50"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <text x="120" y="24" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  SRC A (OUTGOING)
                </text>

                {/* Source B Voltage: triggered from 270 onward */}
                <path
                  d="M 270 50 Q 350 5 430 50 Q 510 95 600 50"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <text x="430" y="24" fill="#facc15" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  SRC B (INCOMING)
                </text>

                {/* Output Load Spliced Continuous Waveform (Emerald Green, thick solid line) */}
                <path
                  d="M 0 50 Q 60 5 120 50 Q 180 95 240 50 Q 255 46 270 50 Q 350 5 430 50 Q 510 95 600 50"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                />
                <text x="100" y="88" fill="#34d399" fontSize="8.5" fontWeight="black" fontFamily="monospace">
                  V_LOAD (SPLICED BUMPLESS CONTINUOUS AC ENVELOPE)
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* ACTIVE STATUS ALERTS */}
        {transferDrillState === 'bumpless' && (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 p-2 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
            <span className="text-base">✔</span>
            <span><b>IEC 62040-3 BUMPLESS TRANSFER SUCCESS:</b> SCR gate pulse extinguished at current zero-cross (t &lt; 2.8 ms). Seamless sinusoidal continuity!</span>
          </div>
        )}
        {transferDrillState === 'blocked' && (
          <div className="bg-amber-950/90 border-2 border-amber-500 p-2 rounded-xl text-xs text-amber-200 flex items-center gap-2 shadow-lg animate-bounce">
            <span className="text-base">🛡️</span>
            <span><b>SYNCHROCHECK RELAY 25 INTERLOCK BLOCKED:</b> Δθ = {Math.abs(phaseB).toFixed(1)}° &gt; ±10° tolerance! Break-before-make required; instantaneous transfer blocked to prevent cross-conduction.</span>
          </div>
        )}
        {transferDrillState === 'flashover' && (
          <div className="bg-red-950/95 border-2 border-red-500 p-2.5 rounded-xl text-xs text-red-100 flex items-center justify-between gap-2 shadow-2xl animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-xl">💥</span>
              <div>
                <b className="text-red-300">CATASTROPHIC OUT-OF-PHASE FLASHOVER DETECTED!</b>
                <div>Inter-bus voltage 2·Vm·sin(Δθ/2) drove <b>12,400 A circulating short-circuit</b> between Source A and Source B! Fast semiconductor fuses F1A &amp; F1B blown!</div>
              </div>
            </div>
            <button
              onClick={handleResetFuses}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0"
            >
              RESET FUSES
            </button>
          </div>
        )}
      </div>

      {/* HOVER TOOLTIP */}
      {hovered && TOOLTIPS[hovered] && (
        <div className="absolute top-24 right-8 bg-[#020617] border-2 border-[#00f0ff] rounded-xl p-3.5 shadow-2xl z-30 pointer-events-none text-xs max-w-xs">
          <div className="font-bold text-[#00f0ff] text-sm mb-1">{TOOLTIPS[hovered].name}</div>
          <div className="text-slate-200 mb-1">Rating: <span className="text-[#f59e0b] font-bold">{TOOLTIPS[hovered].rating}</span></div>
          <div className="text-slate-400">Standard: <span className="text-white">{TOOLTIPS[hovered].standard}</span></div>
        </div>
      )}

      {/* ZOOMABLE & FIT-TO-SCREEN SLD SVG CONTAINER (COMPACT HEIGHT 545px FOR ZERO SCROLLING) */}
      <div
        className="w-full flex items-center justify-center transition-transform duration-75 overflow-hidden"
        style={{
          transform: `scale(${zoomLevel}) translate(${panPos.x / zoomLevel}px, ${panPos.y / zoomLevel}px)`,
          transformOrigin: 'center center',
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg viewBox="-10 -10 1000 545" className="w-full h-auto max-h-[82vh] object-contain block mx-auto select-none">
        <defs>
          <pattern id="stsDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.2" fill="#1e293b" />
          </pattern>

          <radialGradient id="arcFlashBlast" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#ffff55" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ff3300" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#8b00ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

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
        <rect width="980" height="530" fill="#020617" />
        <rect width="980" height="530" fill="url(#stsDotGrid)" />
        <rect x="10" y="10" width="960" height="510" fill="none" stroke="#1e293b" strokeWidth="2.5" rx="10" />

        {/* ============================================================== */}
        {/* [BOUNDARY 1] OUTSIDE STS: UPSTREAM POWER SOURCES (TOP REGION) */}
        {/* ============================================================== */}
        <rect x="35" y="14" width="910" height="76" fill="#1e293b" fillOpacity="0.2" stroke="#475569" strokeWidth="1.5" strokeDasharray="6 4" rx="8" />
        <g transform="translate(50, 4)">
          <rect x="0" y="0" width="280" height="18" fill="#334155" rx="4" stroke="#475569" strokeWidth="1" />
          <text x="140" y="13" textAnchor="middle" fill="#cbd5e1" fontSize="9.5" fontWeight="bold">
            ⚡ OUTSIDE STS: UPSTREAM POWER SUPPLIES
          </text>
        </g>

        {/* ============================================================== */}
        {/* [BOUNDARY 2] INSIDE STS: STATIC SWITCH CUBICLE & ELECTRONICS */}
        {/* ============================================================== */}
        <rect x="35" y="98" width="910" height="272" fill="#0f172a" fillOpacity="0.35" stroke="#38bdf8" strokeWidth="2" strokeDasharray="8 5" rx="12" />
        <g transform="translate(50, 88)">
          <rect x="0" y="0" width="295" height="20" fill="#0284c7" rx="5" />
          <text x="147.5" y="14" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" letterSpacing="0.5">
            🔒 INSIDE STATIC SWITCH (STS) ENCLOSURE
          </text>
        </g>

        {/* ============================================================== */}
        {/* [BOUNDARY 3] OUTSIDE STS: DOWNSTREAM CRITICAL LOADS (BOTTOM) */}
        {/* ============================================================== */}
        <rect x="35" y="378" width="910" height="134" fill="#1e293b" fillOpacity="0.2" stroke="#475569" strokeWidth="1.5" strokeDasharray="6 4" rx="8" />
        <g transform="translate(50, 368)">
          <rect x="0" y="0" width="280" height="18" fill="#334155" rx="4" stroke="#475569" strokeWidth="1" />
          <text x="140" y="13" textAnchor="middle" fill="#cbd5e1" fontSize="9.5" fontWeight="bold">
            🏭 OUTSIDE STS: DOWNSTREAM PLANT LOADS
          </text>
        </g>

        {/* [1] SOURCE A INFEED (LEFT TOP, x = 170) */}
        <g transform="translate(170, 20)">
          <rect x={-105} y={0} width={210} height={36} fill="#0f172a" stroke={sourceAOnline ? '#00ff88' : '#ff3355'} strokeWidth={2} rx={6} />
          <text x={0} y={15} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">
            SOURCE A (PREFERRED 1Φ+N)
          </text>
          <text x={0} y={29} textAnchor="middle" fill={sourceAOnline ? '#00ff88' : '#ff3355'} fontSize="9.5" fontWeight="bold">
            {nominalVoltageRating} AC 1Φ+N | fA = {freqA.toFixed(2)}Hz | θA = 0.0°
          </text>

          {/* Infeed Line down to Breaker QA */}
          <line
            x1={0}
            y1={36}
            x2={0}
            y2={95}
            stroke={sourceAOnline ? '#00ff88' : '#64748b'}
            strokeWidth={4.5}
            filter={sourceAOnline ? 'url(#glowGreenSTS)' : 'none'}
          />
          {sourceAOnline && (
            <line x1={0} y1={36} x2={0} y2={95} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-down" />
          )}
        </g>

        {/* TAP POINT FOR MAINTENANCE BYPASS FROM SOURCE A (at x=170, y=70) */}
        <circle cx={170} cy={70} r={4.5} fill={sourceAOnline ? '#00ff88' : '#64748b'} stroke="#ffffff" strokeWidth={1.5} />
        <line x1={170} y1={70} x2={390} y2={70} stroke={sourceAOnline ? '#00ff88' : '#64748b'} strokeWidth={3.5} />
        <line x1={390} y1={70} x2={390} y2={100} stroke={sourceAOnline ? '#00ff88' : '#64748b'} strokeWidth={3.5} />
        {sourceAOnline && (
          <>
            <line x1={170} y1={70} x2={390} y2={70} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-right" />
            <line x1={390} y1={70} x2={390} y2={100} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-down" />
          </>
        )}

        {/* [2] SOURCE B INFEED (RIGHT TOP, x = 810) */}
        <g transform="translate(810, 20)">
          <rect x={-105} y={0} width={210} height={36} fill="#0f172a" stroke={sourceBOnline ? '#00f0ff' : '#ff3355'} strokeWidth={2} rx={6} />
          <text x={0} y={15} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">
            SOURCE B (ALTERNATE 1Φ+N)
          </text>
          <text x={0} y={29} textAnchor="middle" fill={sourceBOnline ? '#00f0ff' : '#ff3355'} fontSize="9.5" fontWeight="bold">
            {nominalVoltageRating} AC 1Φ+N | fB = {freqB.toFixed(2)}Hz | θB = {phaseB.toFixed(1)}°
          </text>

          {/* Infeed Line down to Breaker QB */}
          <line
            x1={0}
            y1={36}
            x2={0}
            y2={95}
            stroke={sourceBOnline ? '#00f0ff' : '#64748b'}
            strokeWidth={4.5}
            filter={sourceBOnline ? 'url(#glowCyanSTS)' : 'none'}
          />
          {sourceBOnline && (
            <line x1={0} y1={36} x2={0} y2={95} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-down" />
          )}
        </g>

        {/* TAP POINT FOR MAINTENANCE BYPASS FROM SOURCE B (at x=810, y=70) */}
        <circle cx={810} cy={70} r={4.5} fill={sourceBOnline ? '#00f0ff' : '#64748b'} stroke="#ffffff" strokeWidth={1.5} />
        <line x1={810} y1={70} x2={590} y2={70} stroke={sourceBOnline ? '#00f0ff' : '#64748b'} strokeWidth={3.5} />
        <line x1={590} y1={70} x2={590} y2={100} stroke={sourceBOnline ? '#00f0ff' : '#64748b'} strokeWidth={3.5} />
        {sourceBOnline && (
          <>
            <line x1={810} y1={70} x2={590} y2={70} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-left" />
            <line x1={590} y1={70} x2={590} y2={100} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-down" />
          </>
        )}

        {/* [2.5] IEC 60617 / IEEE 315 CHANGEOVER SELECTOR SWITCH (QJ-SEL / Q3-SEL) BLOCK at x=490, y=105..155 */}
        <g id="bypass-selector" onMouseEnter={() => setHovered('Q3_SEL')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={350}
            y={100}
            width={280}
            height={55}
            fill="#0b1329"
            stroke={effectiveBypassSource === 'A' ? (sourceAOnline ? '#00ff88' : '#f59e0b') : (sourceBOnline ? '#00f0ff' : '#f59e0b')}
            strokeWidth={2}
            rx={6}
            className="shadow-xl"
          />
          <text x={490} y={114} textAnchor="middle" fill="#f8fafc" fontSize="9.5" fontWeight="black">
            IEC 60617 CHANGEOVER SELECTOR (QJ-SEL)
          </text>
          <text x={490} y={125} textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontWeight="bold">
            MAKE-BEFORE-BREAK (MBB) MAINTENANCE BYPASS PATH
          </text>

          {/* Source A Terminal Contact */}
          <g className="cursor-pointer" onClick={() => handleSelectBypassSource('A')}>
            <circle cx={390} cy={138} r={5} fill={effectiveBypassSource === 'A' ? '#00ff88' : '#1e293b'} stroke="#00ff88" strokeWidth={2} />
            <text x={390} y={150} textAnchor="middle" fill={effectiveBypassSource === 'A' ? '#00ff88' : '#94a3b8'} fontSize="8" fontWeight="bold">
              SRC A (POS 1)
            </text>
          </g>

          {/* Source B Terminal Contact */}
          <g className="cursor-pointer" onClick={() => handleSelectBypassSource('B')}>
            <circle cx={590} cy={138} r={5} fill={effectiveBypassSource === 'B' ? '#00f0ff' : '#1e293b'} stroke="#00f0ff" strokeWidth={2} />
            <text x={590} y={150} textAnchor="middle" fill={effectiveBypassSource === 'B' ? '#00f0ff' : '#94a3b8'} fontSize="8" fontWeight="bold">
              SRC B (POS 2)
            </text>
          </g>

          {/* Common Output Terminal Contact */}
          <circle cx={490} cy={145} r={4.5} fill="#ffffff" stroke="#38bdf8" strokeWidth={2} />

          {/* Switch Contact Blade Lever pointing to Active Position A or B */}
          <line
            x1={490}
            y1={145}
            x2={effectiveBypassSource === 'A' ? 390 : 590}
            y2={138}
            stroke={effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff'}
            strokeWidth={3}
          />
        </g>

        {/* Feeder line from Selector Output (490, 155) down to 52-Q3 Input (490, 165) */}
        <line
          x1={490}
          y1={155}
          x2={490}
          y2={165}
          stroke={bypassSourceEnergized ? (effectiveBypassSource === 'A' ? '#00ff88' : '#00f0ff') : '#64748b'}
          strokeWidth={4}
          filter={bypassSourceEnergized ? (effectiveBypassSource === 'A' ? 'url(#glowGreenSTS)' : 'url(#glowCyanSTS)') : 'none'}
        />
        {bypassSourceEnergized && (
          <line x1={490} y1={155} x2={490} y2={165} stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" className="power-flow-dash-down" />
        )}

        {/* [3] BREAKER 52-QA (SOURCE A) at (170, 105) */}
        <g transform="translate(170, 105)">
          {renderIECBreaker(0, 0, 'QA', '52-QA Source A Breaker', '800A 35kA 2P (L+N) IEC 60617 [X]', qaClosed, sourceAOnline, onToggleQA, '52')}
        </g>

        {/* Line from Breaker QA bottom (y=165) to SCR Bridge A top (y=215) */}
        <line
          x1={170}
          y1={165}
          x2={170}
          y2={215}
          stroke={sourceAThroughQA ? '#00ff88' : '#64748b'}
          strokeWidth={4.5}
          filter={sourceAThroughQA ? 'url(#glowGreenSTS)' : 'none'}
        />
        {sourceAThroughQA && (
          <line x1={170} y1={165} x2={170} y2={215} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-down" />
        )}

        {/* [4] BREAKER 52-QB (SOURCE B) at (810, 105) */}
        <g transform="translate(810, 105)">
          {renderIECBreaker(0, 0, 'QB', '52-QB Source B Breaker', '800A 35kA 2P (L+N) IEC 60617 [X]', qbClosed, sourceBOnline, onToggleQB, '52')}
        </g>

        {/* Line from Breaker QB bottom (y=165) to SCR Bridge B top (y=215) */}
        <line
          x1={810}
          y1={165}
          x2={810}
          y2={215}
          stroke={sourceBThroughQB ? '#00f0ff' : '#64748b'}
          strokeWidth={4.5}
          filter={sourceBThroughQB ? 'url(#glowCyanSTS)' : 'none'}
        />
        {sourceBThroughQB && (
          <line x1={810} y1={165} x2={810} y2={215} stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" className="power-flow-dash-down" />
        )}

        {/* [4.5] MECHANICAL INTERLOCK LINKAGE BAR BETWEEN 52-Q3 AND 52-QA / 52-QB */}
        <g id="mechanical-interlock-link">
          {/* Linkage Line Left: 52-QA to 52-Q3 */}
          <line x1={245} y1={195} x2={405} y2={195} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />
          {/* Linkage Line Right: 52-Q3 to 52-QB */}
          <line x1={575} y1={195} x2={735} y2={195} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />

          <g transform="translate(325, 187)">
            <rect x={-5} y={0} width={10} height={16} fill="#020617" stroke="#f59e0b" strokeWidth={1} rx={2} />
            <text x={0} y={12} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">🔒</text>
          </g>
          <g transform="translate(655, 187)">
            <rect x={-5} y={0} width={10} height={16} fill="#020617" stroke="#f59e0b" strokeWidth={1} rx={2} />
            <text x={0} y={12} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">🔒</text>
          </g>

          <text x={325} y={210} textAnchor="middle" fill="#f59e0b" fontSize="7.5" fontWeight="black" fontFamily="monospace">
            🔒 MECHANICAL INTERLOCK LINK (ANSI 11 / IEC 60947-2)
          </text>
          <text x={655} y={210} textAnchor="middle" fill="#f59e0b" fontSize="7.5" fontWeight="black" fontFamily="monospace">
            🔒 52-Q3 CLOSED ➔ ISOLATES 52-QA & 52-QB
          </text>
        </g>

        {/* [5] SCR BRIDGE A (SOURCE A) BOX (COMPACTED RECTANGULAR BOX: height 140px, y=215..355) */}
        <g id="bridge-a" onMouseEnter={() => setHovered('SCR_A')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={70}
            y={215}
            width={200}
            height={140}
            fill="#060c1a"
            stroke={bridgeAConducting ? '#00ff88' : sourceAThroughQA ? '#f59e0b' : '#1e293b'}
            strokeWidth={2}
            rx={8}
            className="shadow-xl"
          />
          <text x={170} y={232} textAnchor="middle" fill="#00ff88" fontSize="11" fontWeight="black">
            SCR STATIC SWITCH A (PREFERRED)
          </text>
          <text x={170} y={246} textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="bold">
            IEC 60617 1Φ+N Anti-Parallel SCRs (&lt; 2ms)
          </text>

          {/* Continuous Internal Conductor Line through Bridge A */}
          <line
            x1={170}
            y1={252}
            x2={170}
            y2={355}
            stroke={bridgeAConducting ? '#00ff88' : sourceAThroughQA ? '#f59e0b' : '#334155'}
            strokeWidth={3.5}
          />

          {renderSCRPair(170, 275, 'Phase Line L (T1/T2)', true, bridgeAConducting, faults.scrShortBridgeAT2)}
          
          {/* Unswitched Common Neutral Path */}
          <g transform="translate(170, 332)">
            <line x1={-60} y1={0} x2={60} y2={0} stroke={bridgeAConducting ? '#00ff88' : '#64748b'} strokeWidth={2} strokeDasharray="4 2" />
            <text x={0} y={-6} textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontWeight="bold">Unswitched Common Neutral (Solid)</text>
          </g>
        </g>

        {/* Conductor from SCR Bridge A bottom (355) down to Critical Busbar (390) */}
        <line
          x1={170}
          y1={355}
          x2={170}
          y2={390}
          stroke={bridgeAConducting ? '#00ff88' : '#64748b'}
          strokeWidth={4.5}
          filter={bridgeAConducting ? 'url(#glowGreenSTS)' : 'none'}
        />
        <circle cx={170} cy={390} r={5} fill={bridgeAConducting ? '#00ff88' : '#30363d'} stroke="#ffffff" strokeWidth={2} />

        {/* [6] SCR BRIDGE B (SOURCE B) BOX (COMPACTED RECTANGULAR BOX: height 140px, y=215..355) */}
        <g id="bridge-b" onMouseEnter={() => setHovered('SCR_B')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={710}
            y={215}
            width={200}
            height={140}
            fill="#060c1a"
            stroke={bridgeBConducting ? '#00f0ff' : sourceBThroughQB ? '#f59e0b' : '#1e293b'}
            strokeWidth={2}
            rx={8}
            className="shadow-xl"
          />
          <text x={810} y={232} textAnchor="middle" fill="#00f0ff" fontSize="11" fontWeight="black">
            SCR STATIC SWITCH B (ALTERNATE)
          </text>
          <text x={810} y={246} textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="bold">
            IEC 60617 1Φ+N Anti-Parallel SCRs (&lt; 2ms)
          </text>

          {/* Continuous Internal Conductor Line through Bridge B */}
          <line
            x1={810}
            y1={252}
            x2={810}
            y2={355}
            stroke={bridgeBConducting ? '#00f0ff' : sourceBThroughQB ? '#f59e0b' : '#334155'}
            strokeWidth={3.5}
          />

          {renderSCRPair(810, 275, 'Phase Line L (T1/T2)', true, bridgeBConducting, false)}
          
          {/* Unswitched Common Neutral Path */}
          <g transform="translate(810, 332)">
            <line x1={-60} y1={0} x2={60} y2={0} stroke={bridgeBConducting ? '#00f0ff' : '#64748b'} strokeWidth={2} strokeDasharray="4 2" />
            <text x={0} y={-6} textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontWeight="bold">Unswitched Common Neutral (Solid)</text>
          </g>
        </g>

        {/* Conductor from SCR Bridge B bottom (355) down to Critical Busbar (390) */}
        <line
          x1={810}
          y1={355}
          x2={810}
          y2={390}
          stroke={bridgeBConducting ? '#00f0ff' : '#64748b'}
          strokeWidth={4.5}
          filter={bridgeBConducting ? 'url(#glowCyanSTS)' : 'none'}
        />
        <circle cx={810} cy={390} r={5} fill={bridgeBConducting ? '#00f0ff' : '#30363d'} stroke="#ffffff" strokeWidth={2} />

        {/* [7] MAINTENANCE BYPASS BREAKER 52-Q3 */}
        <g id="bypass-q3" onMouseEnter={() => setHovered('Q3')} onMouseLeave={() => setHovered(null)}>
          {/* Breaker 52-Q3 */}
          <g transform="translate(490, 165)">
            {renderIECBreaker(0, 0, 'Q3', '52-Q3 Maint Bypass Breaker', '800A Mechanical Interlocked 2P [X]', q3Closed, bypassSourceEnergized, onToggleQ3, '52')}
          </g>

          {/* Vertical below Q3 (y=215) down to Busbar (y=390) */}
          <line
            x1={490}
            y1={215}
            x2={490}
            y2={390}
            stroke={bypassConducting ? busColor : '#64748b'}
            strokeWidth={bypassConducting ? 4.5 : 2.5}
            strokeDasharray={bypassConducting ? 'none' : '4 4'}
            filter={bypassConducting ? activeGlowFilter : 'none'}
          />
          {bypassConducting && (
            <line x1={490} y1={215} x2={490} y2={390} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="5 5" className="power-flow-dash-down" />
          )}
          <circle cx={490} cy={390} r={6} fill={busEnergized ? busColor : '#30363d'} stroke="#ffffff" strokeWidth={2} filter={activeGlowFilter} />
        </g>

        {/* [8] CRITICAL OUTPUT BUSBAR ({nominalVoltageRating} AC 1Φ + N) at y = 390 */}
        <g transform="translate(0, 390)" onMouseEnter={() => setHovered('LOAD')} onMouseLeave={() => setHovered(null)}>
          {/* Main Busbar Line */}
          <line
            x1={170}
            y1={0}
            x2={810}
            y2={0}
            stroke={busColor}
            strokeWidth={8}
            filter={activeGlowFilter}
          />

          {/* Animated Busbar Flow Dashes */}
          {busEnergized && bridgeAConducting && (
            <line x1={170} y1={0} x2={490} y2={0} stroke="#ffffff" strokeWidth={3} strokeDasharray="6 6" className="power-flow-dash-right" />
          )}
          {busEnergized && bridgeBConducting && (
            <line x1={810} y1={0} x2={490} y2={0} stroke="#ffffff" strokeWidth={3} strokeDasharray="6 6" className="power-flow-dash-left" />
          )}
          {busEnergized && bypassConducting && (
            <>
              <line x1={490} y1={0} x2={170} y2={0} stroke="#ffffff" strokeWidth={3} strokeDasharray="6 6" className="power-flow-dash-left" />
              <line x1={490} y1={0} x2={810} y2={0} stroke="#ffffff" strokeWidth={3} strokeDasharray="6 6" className="power-flow-dash-right" />
            </>
          )}

          {/* OUT-OF-PHASE ARC FLASH EXPLOSION OVERLAY (GAP 15) */}
          {transferDrillState === 'flashover' && (
            <g id="out-of-phase-arc-blast">
              <circle cx={490} cy={0} r={160} fill="url(#arcFlashBlast)" opacity={0.6} />
              <circle cx={490} cy={0} r={95} fill="url(#arcFlashBlast)" opacity={0.9} />
              <path d="M 170 -35 Q 330 -80 490 0 T 810 -35" stroke="#ffffff" strokeWidth={7} fill="none" filter="url(#glowAmberSTS)" />
              <path d="M 170 -35 Q 330 60 490 0 T 810 -35" stroke="#ffff00" strokeWidth={5} fill="none" filter="url(#glowAmberSTS)" />
              <text x={490} y={-35} textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" filter="url(#glowAmberSTS)">
                💥 12.4 kA CROSS-CONDUCTION ARC BLAST! 💥
              </text>
              <text x={490} y={35} textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">
                ⚠️ CATASTROPHIC INTER-BUS SHORT CIRCUIT • FUSES BLOWN
              </text>
            </g>
          )}

          {/* BLOWN FUSES STATUS INDICATOR */}
          {fusesBlown && (
            <g id="fuses-blown-flags">
              <g transform="translate(170, -25)">
                <rect x={-45} y={-10} width={90} height={18} fill="#450a0a" stroke="#ef4444" strokeWidth={1.5} rx={3} />
                <text x={0} y={3} textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="black">FUSE F1A BLOWN</text>
              </g>
              <g transform="translate(810, -25)">
                <rect x={-45} y={-10} width={90} height={18} fill="#450a0a" stroke="#ef4444" strokeWidth={1.5} rx={3} />
                <text x={0} y={3} textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="black">FUSE F1B BLOWN</text>
              </g>
            </g>
          )}

          {/* Busbar Label Badge (High-Contrast, Zero Overlap) */}
          <g transform="translate(490, -18)">
            <rect x={-210} y={-10} width={420} height={20} fill="#090d16" stroke={busEnergized ? busColor : '#30363d'} strokeWidth={1.5} rx={4} />
            <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="black" fontFamily="monospace">
              CRITICAL PLANT OUTPUT BUSBAR ({outputVoltage ? outputVoltage.toFixed(0) : (nominalVoltageRating === '110V' ? '110' : '220')}V AC 1Φ + N) | Transfer Time &lt; 2ms
            </text>
          </g>

          {/* Feeder down to Load from (490, 0) to (490, 50) */}
          <line
            x1={490}
            y1={0}
            x2={490}
            y2={50}
            stroke={busColor}
            strokeWidth={6}
            filter={activeGlowFilter}
          />
          {busEnergized && (
            <line x1={490} y1={0} x2={490} y2={50} stroke="#ffffff" strokeWidth={2.5} strokeDasharray="5 5" className="power-flow-dash-down" />
          )}
        </g>

        {/* [9] CRITICAL PLANT LOAD BOX (at x=490, y=440) */}
        <g transform="translate(490, 440)">
          <rect
            x={-140}
            y={0}
            width={280}
            height={60}
            fill={!busEnergized ? '#450a0a' : '#0f172a'}
            stroke={!busEnergized ? '#ff3355' : '#00ff88'}
            strokeWidth={!busEnergized ? 2.5 : 2}
            className={!busEnergized ? 'animate-pulse' : 'shadow-xl'}
            rx={6}
          />
          <text x={0} y={20} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">
            CRITICAL PROCESS LOADS (DCS/ESD/F&G)
          </text>
          <text x={0} y={38} textAnchor="middle" fill={!busEnergized ? '#f87171' : '#00ff88'} fontSize="11" fontWeight="black">
            {!busEnergized ? '🚨 LOAD TRIPPED (0V)' : `IL = ${loadCurrent.toFixed(0)} A | ${outputVoltage ? outputVoltage.toFixed(0) : (nominalVoltageRating === '110V' ? '110' : '220')}V AC ENERGIZED`}
          </text>

          {/* PE Earth / Ground Symbol */}
          <line x1={0} y1={60} x2={0} y2={76} stroke="#00ff88" strokeWidth={2} />
          <g transform="translate(0, 76)">
            <line x1={-10} y1={0} x2={10} y2={0} stroke="#00ff88" strokeWidth={2} />
            <line x1={-6} y1={3} x2={6} y2={3} stroke="#00ff88" strokeWidth={2} />
            <line x1={-3} y1={6} x2={3} y2={6} stroke="#00ff88" strokeWidth={2} />
          </g>
        </g>

        {/* TITLE BLOCK (COMPACTED AT BOTTOM RIGHT, x=640, y=440) */}
        <g transform="translate(640, 440)">
          <rect x={0} y={0} width={310} height={70} fill="#090d16" stroke="#1e293b" strokeWidth={1.5} rx={4} />
          <line x1={0} y1={18} x2={310} y2={18} stroke="#1e293b" strokeWidth={1} />
          <line x1={0} y1={36} x2={310} y2={36} stroke="#1e293b" strokeWidth={1} />
          <line x1={0} y1={52} x2={310} y2={52} stroke="#1e293b" strokeWidth={1} />
          <line x1={155} y1={0} x2={155} y2={70} stroke="#1e293b" strokeWidth={1} />

          <text x={6} y={13} fill="#64748b" fontSize="8">DWG NO: PE-SIM-STS-001</text>
          <text x={161} y={13} fill="#64748b" fontSize="8">REV: F (SINGLE-PHASE 230V)</text>

          <text x={6} y={29} fill="#ffffff" fontSize="8.5" fontWeight="bold">TITLE: Single-Phase Static Switch SLD</text>

          <text x={6} y={46} fill="#64748b" fontSize="8">SCALE: NTS</text>
          <text x={161} y={46} fill="#64748b" fontSize="8">DATE: 2026-08-16</text>

          <text x={6} y={64} fill="#64748b" fontSize="8">STD: IEC 62040-3 / IEC 60617</text>
          <text x={161} y={64} fill="#00f0ff" fontSize="8" fontWeight="bold">DRAWN BY: PE Training LAB</text>
        </g>
      </svg>
    </div>
  </div>
  );
};
