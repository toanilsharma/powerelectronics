import React, { useState, useRef } from 'react';
import { BatteryChargerSLD } from './BatteryChargerSLD';
import { BatteryChargerWaveforms } from './BatteryChargerWaveforms';
import { DualBatteryChargerContainer } from './DualBatteryChargerContainer';
import { SCRLearningLabPanel } from './SCRLearningLabPanel';
import { calculateSCRConductionState } from '../utils/scrConductionEngine';
import { ActiveFaults } from '../types/batteryCharger';
import { 
  Zap, 
  Gauge, 
  Sliders, 
  SlidersHorizontal,
  Play, 
  CheckCircle2, 
  ShieldAlert, 
  Maximize2, 
  Minimize2,
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Activity,
  Layers,
  FileText,
  Pause,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen
} from 'lucide-react';

interface SingleChargerSimulatorHMIProps {
  voltageIn: number;
  loadPct: number;
  setLoadPct: (val: number) => void;
  firingAngle: number;
  setFiringAngle: (val: number) => void;
  isRunning: boolean;
  setIsRunning: (val: boolean) => void;
  q1Closed: boolean;
  setQ1Closed: (val: boolean) => void;
  q2Closed: boolean;
  setQ2Closed: (val: boolean) => void;
  q3Closed: boolean;
  setQ3Closed: (val: boolean) => void;
  soc: number;
  activeFaults: ActiveFaults;
  hasLcFilter: boolean;
  setHasLcFilter: (val: boolean) => void;
  teachingView: 'operator' | 'maintenance' | 'reliability';
  setTeachingView: (view: 'operator' | 'maintenance' | 'reliability') => void;
  chargerSubTab: 'single' | 'dual';
  setChargerSubTab: (tab: 'single' | 'dual') => void;
  alarmLog: any[];
  onClearAlarms: () => void;
  onNavigateToOverview: () => void;
  onOpenHelp: () => void;
}

export const SingleChargerSimulatorHMI: React.FC<SingleChargerSimulatorHMIProps> = ({
  voltageIn,
  loadPct,
  setLoadPct,
  firingAngle,
  setFiringAngle,
  isRunning,
  setIsRunning,
  q1Closed,
  setQ1Closed,
  q2Closed,
  setQ2Closed,
  q3Closed,
  setQ3Closed,
  soc,
  activeFaults,
  hasLcFilter,
  setHasLcFilter,
  teachingView,
  setTeachingView,
  chargerSubTab,
  setChargerSubTab,
  alarmLog,
  onClearAlarms,
  onNavigateToOverview,
  onOpenHelp,
}) => {
  // Mobile active tab view: 'controls' | 'sld' | 'waveforms' | 'results'
  const [mobileTab, setMobileTab] = useState<'controls' | 'sld' | 'waveforms' | 'results'>('sld');
  const [centerView, setCenterView] = useState<'sld' | 'waveforms'>('sld');

  // Layout & Full Screen Modes
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showWaveformsModal, setShowWaveformsModal] = useState<boolean>(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);

  // Interactive SLD Canvas Pan & Zoom States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Operator Quick Control States
  const [opMode, setOpMode] = useState<'FLOAT' | 'BOOST'>('FLOAT');
  const [isWalkingIn, setIsWalkingIn] = useState<boolean>(false);
  const [walkProgress, setWalkProgress] = useState<number>(0);
  const [sourceInductanceMh, setSourceInductanceMh] = useState<number>(0.8);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  // Component Spec Tap Modal
  const [tappedComponent, setTappedComponent] = useState<{ title: string; rating: string; desc: string } | null>(null);

  // Calculated Electrical Values
  const rad = (firingAngle * Math.PI) / 180;
  let vdc = q1Closed
    ? Math.max(0, 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((67 * Math.PI) / 180)))
    : q2Closed
    ? 110 + (soc - 50) * 0.15
    : 0;

  if (activeFaults?.scrT3Open) vdc *= 0.75;
  if (activeFaults?.acPhaseLossL2) vdc *= 0.80;
  if (activeFaults?.dcOvervoltage) vdc = 145.0;
  if (activeFaults?.controlFuseBlown) vdc = q2Closed ? 110 + (soc - 50) * 0.15 : 0;
  if (activeFaults?.equalizeForgotten) vdc = 137.5;
  if (activeFaults?.looseTerminal && q3Closed && loadPct > 0) vdc = Math.max(85, vdc - 26.5);

  const idc = q3Closed
    ? activeFaults?.controlFuseBlown
      ? 0
      : activeFaults?.roomFanFail
      ? Math.min((loadPct / 100) * 50, 25)
      : (loadPct / 100) * 50
    : 2.0;

  const conductionState = calculateSCRConductionState({
    electricalAngleDeg: 0,
    firingAngleDeg: firingAngle,
    sourceInductanceMh,
    voltageIn,
    loadCurrentA: idc,
    q1Closed,
    isRunning,
    activeFaults,
  });

  const vRipple = hasLcFilter ? 0.45 : 4.85;
  const thdCurrent = 28.5 + (firingAngle / 90) * 12.0;
  const efficiency = q1Closed && q3Closed ? Math.max(82, 95.5 - (loadPct > 90 ? 3.5 : 0)) : 0;

  const powerOk = q1Closed && !activeFaults?.controlFuseBlown;
  const isAnyFault = Boolean(
    activeFaults?.scrT3Open ||
      activeFaults?.acPhaseLossL2 ||
      activeFaults?.groundFault ||
      activeFaults?.dcOvervoltage ||
      activeFaults?.loadTrip ||
      activeFaults?.controlFuseBlown ||
      activeFaults?.filterCapOpen ||
      activeFaults?.looseTerminal ||
      activeFaults?.roomFanFail ||
      activeFaults?.equalizeForgotten ||
      firingAngle > 90
  );

  let chargingStateLabel = 'FLOAT (122.6V)';
  let chargingColorClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
  if (!q1Closed) {
    chargingStateLabel = 'OFF / DISCHARGING';
    chargingColorClass = 'text-slate-400 bg-slate-900 border-slate-700';
  } else if (vdc < 122.6 && loadPct > 50) {
    chargingStateLabel = 'CC LIMIT (50A)';
    chargingColorClass = 'text-amber-400 bg-amber-950/60 border-amber-500/40 animate-pulse';
  } else if (opMode === 'BOOST' || vdc > 128.0) {
    chargingStateLabel = 'BOOST (132.0V)';
    chargingColorClass = 'text-blue-400 bg-blue-950/60 border-blue-500/40';
  }

  // Quick Action Handlers
  const handleSetFloat = () => {
    setOpMode('FLOAT');
    setFiringAngle(67);
  };

  const handleSetBoost = () => {
    setOpMode('BOOST');
    setFiringAngle(45);
  };

  const handleWalkIn = () => {
    if (isWalkingIn || !q1Closed) return;
    setIsWalkingIn(true);
    setWalkProgress(0);
    setFiringAngle(88);

    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setWalkProgress(prog);
      const angle = 88 - (prog / 100) * 21;
      setFiringAngle(Math.round(angle));

      if (prog >= 100) {
        clearInterval(interval);
        setIsWalkingIn(false);
      }
    }, 500);
  };

  // Drag & Pan Handlers for SVG Canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPos({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-64px)] overflow-hidden bg-[#070b14] text-slate-100 font-sans relative select-none">
      {/* ==========================================
          1. COMPACT STICKY SUB-HEADER (SINGLE SLIM ROW)
          ========================================== */}
      <div className="w-full bg-[#0d1424]/95 border-b border-[#1e293b] backdrop-blur-md px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-lg h-[46px]">
        {/* Sub-Tab Selector Buttons & Teaching Level */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setChargerSubTab('single')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[30px] ${
                chargerSubTab === 'single'
                  ? 'bg-blue-600 text-white shadow-md border border-blue-400'
                  : 'bg-[#1e293b] text-slate-300 hover:bg-[#2a364f]'
              }`}
            >
              <span>⚡ Single Charger</span>
            </button>
            <button
              onClick={() => setChargerSubTab('dual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[30px] ${
                chargerSubTab === 'dual'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                  : 'bg-[#1e293b] text-slate-300 hover:bg-[#2a364f]'
              }`}
            >
              <span>🔋 Dual Scheme</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Teaching Level Selector */}
          <div className="hidden sm:flex items-center gap-1 shrink-0 bg-[#070b14] border border-[#1e293b] p-0.5 rounded-lg">
            <button
              onClick={() => setTeachingView('operator')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                teachingView === 'operator'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OPERATOR
            </button>
            <button
              onClick={() => setTeachingView('maintenance')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                teachingView === 'maintenance'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              MAINTENANCE
            </button>
            <button
              onClick={() => setTeachingView('reliability')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                teachingView === 'reliability'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RELIABILITY
            </button>
          </div>
        </div>

        {/* Compact Header Readouts */}
        {chargerSubTab === 'single' && (
          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">DC BUS:</span>
              <span className="text-emerald-400 font-extrabold text-sm">{vdc.toFixed(1)}V</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">LOAD:</span>
              <span className="text-blue-400 font-extrabold text-sm">{idc.toFixed(1)}A</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">SOC:</span>
              <span className="text-amber-400 font-extrabold text-sm">{soc.toFixed(0)}%</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border hidden sm:inline-block ${chargingColorClass}`}>
              {chargingStateLabel}
            </span>
          </div>
        )}
      </div>

      {chargerSubTab === 'dual' ? (
        <div className="flex-1 w-full overflow-hidden">
          <DualBatteryChargerContainer
            voltageIn={voltageIn}
            isRunning={isRunning}
          />
        </div>
      ) : (
        <>
          {/* ==========================================
              2. MAIN SCADA AREA (MAXIMIZED VERTICAL SPACE)
              ========================================== */}
          <div className="flex-1 w-full overflow-hidden p-2 sm:p-2.5 relative font-sans">
            {/* DESKTOP LAYOUT GRID: Collapsible Left | 1fr Center SLD | Collapsible Right */}
            <div 
              className="hidden lg:grid gap-2.5 w-full h-full transition-all duration-300"
              style={{
                gridTemplateColumns: `${leftPanelCollapsed ? '42px' : '270px'} 1fr ${rightPanelCollapsed ? '42px' : '300px'}`
              }}
            >
              {/* ==========================================
                  LEFT PANEL: TELEMETRY & CONTROLS
                  ========================================== */}
              {leftPanelCollapsed ? (
                <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl select-none">
                  <button
                    onClick={() => setLeftPanelCollapsed(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Expand Control Parameters"
                  >
                    <ChevronRight className="w-5 h-5 text-blue-400" />
                  </button>
                  <div className="writing-mode-vertical text-xs font-mono font-bold tracking-widest text-slate-400 uppercase rotate-180 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400 rotate-90" />
                    <span>CONTROLS &amp; TELEMETRY</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto shadow-xl">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
                    <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Sliders className="w-4 h-4 text-blue-400" />
                      Controls &amp; Telemetry
                    </span>
                    <button
                      onClick={() => setLeftPanelCollapsed(true)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Collapse Panel"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* TELEMETRY READOUT METERS */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-2 flex flex-col">
                      <span className="text-[9px] font-mono text-slate-400 font-bold">DC BUS V</span>
                      <span className="text-sm font-mono font-black text-emerald-400">{vdc.toFixed(1)} VDC</span>
                    </div>

                    <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-2 flex flex-col">
                      <span className="text-[9px] font-mono text-slate-400 font-bold">DC LOAD I</span>
                      <span className="text-sm font-mono font-black text-blue-400">{idc.toFixed(1)} A</span>
                    </div>
                  </div>

                  {/* BATTERY SOC PROGRESS BAR */}
                  <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 font-bold">BATTERY SOC</span>
                      <span className="text-amber-400 font-black">{soc.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
                      />
                    </div>
                  </div>

                  {/* System Load Demand Slider */}
                  <div className="flex flex-col gap-1.5 bg-[#070b14] border border-[#1e293b] p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-semibold">Load Demand</span>
                      <span className="text-blue-400 font-bold">{loadPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="110"
                      value={loadPct}
                      onChange={(e) => setLoadPct(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 min-h-[32px]"
                    />
                  </div>

                  {/* Firing Angle α Slider */}
                  <div className="flex flex-col gap-1.5 bg-[#070b14] border border-[#1e293b] p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-semibold">SCR Angle (α)</span>
                      <span className="text-emerald-400 font-bold">{firingAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={firingAngle}
                      onChange={(e) => setFiringAngle(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 min-h-[32px]"
                    />
                    <div className="grid grid-cols-4 gap-1 mt-0.5">
                      {[15, 30, 45, 67].map((angle) => (
                        <button
                          key={angle}
                          onClick={() => setFiringAngle(angle)}
                          className={`py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                            firingAngle === angle
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          α={angle}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Inductance Ls Slider */}
                  <div className="flex flex-col gap-1.5 bg-[#070b14] border border-[#1e293b] p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-semibold">Source Inductance (Ls)</span>
                      <span className="text-amber-400 font-bold">{sourceInductanceMh} mH</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.5"
                      step="0.1"
                      value={sourceInductanceMh}
                      onChange={(e) => setSourceInductanceMh(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 min-h-[32px]"
                    />
                    <div className="grid grid-cols-4 gap-1 mt-0.5">
                      {[0.2, 0.8, 1.5, 2.5].map((lsVal) => (
                        <button
                          key={lsVal}
                          onClick={() => setSourceInductanceMh(lsVal)}
                          className={`py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                            sourceInductanceMh === lsVal
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lsVal}mH
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* LC Filter Toggle */}
                  <div className="flex items-center justify-between bg-[#070b14] border border-[#1e293b] p-2.5 rounded-xl">
                    <span className="text-xs font-mono text-slate-300 font-semibold">DC LC Filter</span>
                    <button
                      onClick={() => setHasLcFilter(!hasLcFilter)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        hasLcFilter
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {hasLcFilter ? 'LC ACTIVE' : 'BYPASS'}
                    </button>
                  </div>

                  {/* Breaker Toggles */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#1e293b]">
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                      Switchgear Breakers
                    </span>

                    <button
                      onClick={() => setQ1Closed(!q1Closed)}
                      className={`w-full min-h-[36px] rounded-xl text-xs font-mono font-bold flex items-center justify-between px-3 transition-all cursor-pointer ${
                        q1Closed
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 shadow-md'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      <span>52-Q1 AC Breaker</span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className={`w-2 h-2 rounded-full ${q1Closed ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                        {q1Closed ? 'CLOSED' : 'OPEN'}
                      </span>
                    </button>

                    <button
                      onClick={() => setQ2Closed(!q2Closed)}
                      className={`w-full min-h-[36px] rounded-xl text-xs font-mono font-bold flex items-center justify-between px-3 transition-all cursor-pointer ${
                        q2Closed
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 shadow-md'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      <span>52-Q2 Battery Switch</span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className={`w-2 h-2 rounded-full ${q2Closed ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                        {q2Closed ? 'CLOSED' : 'OPEN'}
                      </span>
                    </button>

                    <button
                      onClick={() => setQ3Closed(!q3Closed)}
                      className={`w-full min-h-[36px] rounded-xl text-xs font-mono font-bold flex items-center justify-between px-3 transition-all cursor-pointer ${
                        q3Closed
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 shadow-md'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      <span>52-Q3 Feeder Switch</span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className={`w-2 h-2 rounded-full ${q3Closed ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                        {q3Closed ? 'CLOSED' : 'OPEN'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ==========================================
                  CENTER PANEL: SLD CANVAS (UNCOMPRESSED FULL HEIGHT)
                  ========================================== */}
              <div className="bg-[#060911] border border-[#1e293b] rounded-2xl flex flex-col h-full relative overflow-hidden shadow-2xl">
                {/* CANVAS TOP TOOLBAR */}
                <div className="w-full bg-[#0d1424]/90 border-b border-[#1e293b] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md z-20">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-400" />
                      SLD SCHEMATIC WORKBENCH
                    </span>
                  </div>

                  {/* QUICK BREAKER OPERATING BUTTONS BAR */}
                  <div className="hidden sm:flex items-center gap-1.5 bg-[#070b14] border border-[#1e293b] px-2 py-0.5 rounded-xl">
                    <button
                      onClick={() => setQ1Closed(!q1Closed)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        q1Closed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${q1Closed ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                      52-Q1 AC: {q1Closed ? 'ON' : 'OFF'}
                    </button>

                    <button
                      onClick={() => setQ2Closed(!q2Closed)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        q2Closed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${q2Closed ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                      52-Q2 BAT: {q2Closed ? 'ON' : 'OFF'}
                    </button>

                    <button
                      onClick={() => setQ3Closed(!q3Closed)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        q3Closed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${q3Closed ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                      52-Q3 FEED: {q3Closed ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* WORKBENCH MODE BUTTONS */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTutorialStep(1)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      title="Start Guided Circuit Walkthrough Tutorial"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-white" />
                      <span>🎓 LEARN THIS CIRCUIT</span>
                    </button>

                    <button
                      onClick={() => setShowWaveformsModal(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 flex items-center gap-1 shadow-md transition-all cursor-pointer"
                      title="Open Full-Screen Multi-Channel Waveforms"
                    >
                      <Activity className="w-3.5 h-3.5 text-white" />
                      <span>📊 Waveforms</span>
                    </button>

                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 flex items-center gap-1 shadow-md transition-all cursor-pointer"
                      title="Maximize Full-Screen Interactive Diagram"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                      <span>🖥️ Full Screen</span>
                    </button>
                  </div>
                </div>

                {/* SLD DIAGRAM CANVAS WORKSPACE & LEARNING SUITE */}
                <div className="flex-1 w-full h-full relative overflow-y-auto flex flex-col gap-4 p-2 scrollbar-none">
                  <div className="w-full shrink-0 flex items-center justify-center">
                    <BatteryChargerSLD
                      voltageIn={voltageIn}
                      loadPct={loadPct}
                      firingAngle={firingAngle}
                      sourceInductanceMh={sourceInductanceMh}
                      isRunning={isRunning}
                      q1Closed={q1Closed}
                      q2Closed={q2Closed}
                      q3Closed={q3Closed}
                      onToggleQ1={() => setQ1Closed(!q1Closed)}
                      onToggleQ2={() => setQ2Closed(!q2Closed)}
                      onToggleQ3={() => setQ3Closed(!q3Closed)}
                      soc={soc}
                      activeFaults={activeFaults}
                      hasLcFilter={hasLcFilter}
                      tutorialStep={tutorialStep}
                      onSetTutorialStep={setTutorialStep}
                    />
                  </div>

                  {/* INTERACTIVE LEARNING LABORATORY SUITE PANEL */}
                  <div className="w-full max-w-[950px] mx-auto shrink-0 pb-4">
                    <SCRLearningLabPanel
                      conductionState={conductionState}
                      firingAngle={firingAngle}
                      sourceInductanceMh={sourceInductanceMh}
                      voltageIn={voltageIn}
                      loadCurrentA={idc}
                      loadPct={loadPct}
                      vdc={vdc}
                      q1Closed={q1Closed}
                      q3Closed={q3Closed}
                      activeFaults={activeFaults}
                      hasLcFilter={hasLcFilter}
                    />
                  </div>
                </div>
              </div>

              {/* ==========================================
                  RIGHT PANEL: QUICK ACTIONS & LIVE WAVEFORMS
                  ========================================== */}
              {rightPanelCollapsed ? (
                <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl flex flex-col items-center py-4 gap-4 shadow-xl select-none">
                  <button
                    onClick={() => setRightPanelCollapsed(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Expand Quick Actions"
                  >
                    <ChevronLeft className="w-5 h-5 text-emerald-400" />
                  </button>
                  <div className="writing-mode-vertical text-xs font-mono font-bold tracking-widest text-slate-400 uppercase rotate-180 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400 rotate-90" />
                    <span>QUICK ACTIONS</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto shadow-xl">
                  {/* Operator Quick Controls */}
                  <div className="flex flex-col gap-2 pb-2.5 border-b border-[#1e293b]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Quick Actions
                      </span>
                      <button
                        onClick={() => setRightPanelCollapsed(true)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Collapse Panel"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 mt-0.5">
                      <button
                        onClick={handleSetFloat}
                        className={`w-full min-h-[36px] rounded-xl text-xs font-bold flex items-center justify-between px-3 transition-all cursor-pointer ${
                          opMode === 'FLOAT' && firingAngle <= 75
                            ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                            : 'bg-[#070b14] text-slate-300 border border-[#1e293b] hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          FLOAT MODE (122.6V)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">α=67°</span>
                      </button>

                      <button
                        onClick={handleSetBoost}
                        className={`w-full min-h-[36px] rounded-xl text-xs font-bold flex items-center justify-between px-3 transition-all cursor-pointer ${
                          opMode === 'BOOST'
                            ? 'bg-blue-600 text-white shadow-md border border-blue-400'
                            : 'bg-[#070b14] text-slate-300 border border-[#1e293b] hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-400" />
                          BOOST MODE (132.0V)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">α=45°</span>
                      </button>

                      <button
                        onClick={handleWalkIn}
                        disabled={isWalkingIn || !q1Closed}
                        className={`w-full min-h-[36px] rounded-xl text-xs font-bold flex items-center justify-between px-3 transition-all cursor-pointer ${
                          isWalkingIn
                            ? 'bg-amber-500 text-black font-extrabold animate-pulse'
                            : 'bg-[#070b14] text-amber-400 border border-amber-500/40 hover:bg-amber-950/40'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5" />
                          {isWalkingIn ? `RAMPING (${walkProgress}%)` : 'WALK-IN SOFT START'}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300">10s</span>
                      </button>
                    </div>
                  </div>

                  {/* Chopped Rectifier Waveforms Panel */}
                  <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <Activity className="w-4 h-4 text-blue-400" />
                        Live Waveforms
                      </span>
                      <button
                        onClick={() => setShowWaveformsModal(true)}
                        className="text-[10px] font-mono text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        Expand ↗
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1">
                      <BatteryChargerWaveforms
                        voltageIn={voltageIn}
                        loadPct={loadPct}
                        firingAngle={firingAngle}
                        q1Closed={q1Closed}
                        q2Closed={q2Closed}
                        q3Closed={q3Closed}
                        isRunning={isRunning}
                        soc={soc}
                        activeFaults={activeFaults}
                        hasLcFilter={hasLcFilter}
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ==========================================
                FULL-SCREEN DUAL VIEW (SLD + SIDE WAVEFORMS)
                ========================================== */}
            {isFullScreen && (
              <div className="fixed inset-0 z-50 bg-[#060911] flex flex-col p-3 gap-2.5 select-none">
                {/* FULL-SCREEN TOP HEADER */}
                <div className="bg-[#0d1424] border border-[#1e293b] p-2.5 rounded-xl flex items-center justify-between gap-3 shrink-0 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                      ⚡
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm text-white font-mono">
                        FULL-SCREEN WORKBENCH: 6-PULSE SCR CHARGER + LIVE OSCILLOSCOPE
                      </h2>
                      <span className="text-[10px] text-slate-400 font-mono">IEC 60146-1-1 | IEEE 1188 Substation Standard</span>
                    </div>
                  </div>

                  {/* TELEMETRY READOUTS */}
                  <div className="hidden md:flex items-center gap-3 text-xs font-mono">
                    <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                      VDC: {vdc.toFixed(1)}V
                    </span>
                    <span className="text-blue-400 font-bold bg-blue-950/60 border border-blue-800/60 px-2.5 py-1 rounded-lg">
                      IDC: {idc.toFixed(1)}A
                    </span>
                    <span className="text-amber-400 font-bold bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                      SOC: {soc.toFixed(0)}%
                    </span>
                  </div>

                  <button
                    onClick={() => setIsFullScreen(false)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg border border-rose-400 flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>Exit Full Screen</span>
                  </button>
                </div>

                {/* FULL-SCREEN MAIN WORKSPACE (SLD DIAGRAM + SIDE WAVEFORMS) */}
                <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 min-h-0">
                  {/* FULL-SCREEN SLD DIAGRAM CANVAS (FITS 100% WITHOUT SCROLLING) */}
                  <div className="w-full h-full relative overflow-hidden bg-[#060911] border border-[#1e293b] rounded-2xl flex items-center justify-center p-2">
                    <BatteryChargerSLD
                      voltageIn={voltageIn}
                      loadPct={loadPct}
                      firingAngle={firingAngle}
                      isRunning={isRunning}
                      q1Closed={q1Closed}
                      q2Closed={q2Closed}
                      q3Closed={q3Closed}
                      onToggleQ1={() => setQ1Closed(!q1Closed)}
                      onToggleQ2={() => setQ2Closed(!q2Closed)}
                      onToggleQ3={() => setQ3Closed(!q3Closed)}
                      soc={soc}
                      activeFaults={activeFaults}
                      hasLcFilter={hasLcFilter}
                    />
                  </div>

                  {/* SIDE LIVE WAVEFORMS OSCILLOSCOPE PANEL */}
                  <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-3 flex flex-col gap-2 overflow-y-auto shadow-xl">
                    <div className="flex items-center justify-between pb-1 border-b border-[#1e293b]">
                      <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Live Oscilloscope
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded animate-pulse">
                        LIVE 60Hz
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <BatteryChargerWaveforms
                        voltageIn={voltageIn}
                        loadPct={loadPct}
                        firingAngle={firingAngle}
                        q1Closed={q1Closed}
                        q2Closed={q2Closed}
                        q3Closed={q3Closed}
                        isRunning={isRunning}
                        soc={soc}
                        activeFaults={activeFaults}
                        hasLcFilter={hasLcFilter}
                        compact={true}
                      />
                    </div>
                  </div>
                </div>

                {/* FULL-SCREEN FLOATING OPERATING DOCK */}
                <div className="bg-[#0d1424]/95 border border-[#1e293b] p-2.5 rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xl">
                  {/* BREAKER TOGGLES */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQ1Closed(!q1Closed)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${
                        q1Closed ? 'bg-emerald-600 text-white shadow-md' : 'bg-rose-600 text-white'
                      }`}
                    >
                      52-Q1 AC Breaker: {q1Closed ? 'CLOSED' : 'OPEN'}
                    </button>

                    <button
                      onClick={() => setQ2Closed(!q2Closed)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${
                        q2Closed ? 'bg-emerald-600 text-white shadow-md' : 'bg-rose-600 text-white'
                      }`}
                    >
                      52-Q2 Battery Switch: {q2Closed ? 'CLOSED' : 'OPEN'}
                    </button>

                    <button
                      onClick={() => setQ3Closed(!q3Closed)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${
                        q3Closed ? 'bg-emerald-600 text-white shadow-md' : 'bg-rose-600 text-white'
                      }`}
                    >
                      52-Q3 Feeder Switch: {q3Closed ? 'CLOSED' : 'OPEN'}
                    </button>
                  </div>

                  {/* QUICK MODES */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSetFloat}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900 cursor-pointer"
                    >
                      FLOAT (122.6V)
                    </button>
                    <button
                      onClick={handleSetBoost}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950 text-blue-400 border border-blue-500/50 hover:bg-blue-900 cursor-pointer"
                    >
                      BOOST (132.0V)
                    </button>
                  </div>

                  {/* SLIDERS */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Load:</span>
                      <input
                        type="range"
                        min="10"
                        max="110"
                        value={loadPct}
                        onChange={(e) => setLoadPct(Number(e.target.value))}
                        className="w-20 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-blue-400 font-bold">{loadPct}%</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">α Angle:</span>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        value={firingAngle}
                        onChange={(e) => setFiringAngle(Number(e.target.value))}
                        className="w-20 accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-emerald-400 font-bold">{firingAngle}°</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                FULL-SCREEN OSCILLOSCOPE WAVEFORMS MODAL
                ========================================== */}
            {showWaveformsModal && (
              <div className="fixed inset-0 z-50 bg-[#070b14]/95 backdrop-blur-2xl p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto select-none">
                <div className="bg-[#0d1424] border border-[#1e293b] p-4 rounded-2xl flex items-center justify-between shrink-0 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      📊
                    </div>
                    <div>
                      <h2 className="font-extrabold text-base text-white font-mono flex items-center gap-2">
                        MULTI-CHANNEL OSCILLOSCOPE &amp; SIGNAL ANALYZER
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full animate-pulse">
                          LIVE 60Hz
                        </span>
                      </h2>
                      <span className="text-xs text-slate-400">3-Phase AC Chopped Waveforms, DC Bus Ripple &amp; Thyristor Gate Firing Pulse Timelines</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowWaveformsModal(false)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    title="Close Waveform Analyzer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 w-full bg-[#0d1424] border border-[#1e293b] rounded-2xl p-4 overflow-y-auto shadow-2xl">
                  <BatteryChargerWaveforms
                    voltageIn={voltageIn}
                    loadPct={loadPct}
                    firingAngle={firingAngle}
                    q1Closed={q1Closed}
                    q2Closed={q2Closed}
                    q3Closed={q3Closed}
                    isRunning={isRunning}
                    soc={soc}
                    activeFaults={activeFaults}
                    hasLcFilter={hasLcFilter}
                    compact={false}
                  />
                </div>
              </div>
            )}

        {/* ==========================================
            MOBILE FIELD TABBED LAYOUT (<1024px)
            ========================================== */}
        <div className="lg:hidden w-full h-full flex flex-col relative pb-[56px]">
          {/* TAB 1: CONTROLS */}
          {mobileTab === 'controls' && (
            <div className="w-full h-full bg-[#0d1424] border border-[#1e293b] rounded-2xl p-4 overflow-y-auto flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Control Parameters
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  ACTIVE
                </span>
              </div>

              {/* Load Slider (Min 48px touch height) */}
              <div className="flex flex-col gap-2 bg-[#070b14] border border-[#1e293b] p-3 rounded-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">System Load Demand</span>
                  <span className="text-blue-400 font-bold">{loadPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="110"
                  value={loadPct}
                  onChange={(e) => setLoadPct(Number(e.target.value))}
                  className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 min-h-[48px]"
                />
              </div>

              {/* Firing Angle Slider (Min 48px touch height) */}
              <div className="flex flex-col gap-2 bg-[#070b14] border border-[#1e293b] p-3 rounded-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">SCR Firing Angle (α)</span>
                  <span className="text-emerald-400 font-bold">{firingAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={firingAngle}
                  onChange={(e) => setFiringAngle(Number(e.target.value))}
                  className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 min-h-[48px]"
                />
              </div>

              {/* Breakers (Min 48px touch buttons) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#1e293b]">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  Switchgear Breakers
                </span>
                <button
                  onClick={() => setQ1Closed(!q1Closed)}
                  className={`w-full min-h-[48px] rounded-xl text-xs font-mono font-bold flex items-center justify-between px-4 transition-all cursor-pointer ${
                    q1Closed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500' : 'bg-rose-950 text-rose-400 border border-rose-500'
                  }`}
                >
                  <span>52-Q1 AC Breaker</span>
                  <span>{q1Closed ? 'CLOSED' : 'OPEN'}</span>
                </button>
                <button
                  onClick={() => setQ2Closed(!q2Closed)}
                  className={`w-full min-h-[48px] rounded-xl text-xs font-mono font-bold flex items-center justify-between px-4 transition-all cursor-pointer ${
                    q2Closed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500' : 'bg-rose-950 text-rose-400 border border-rose-500'
                  }`}
                >
                  <span>52-Q2 Battery Switch</span>
                  <span>{q2Closed ? 'CLOSED' : 'OPEN'}</span>
                </button>
                <button
                  onClick={() => setQ3Closed(!q3Closed)}
                  className={`w-full min-h-[48px] rounded-xl text-xs font-mono font-bold flex items-center justify-between px-4 transition-all cursor-pointer ${
                    q3Closed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500' : 'bg-rose-950 text-rose-400 border border-rose-500'
                  }`}
                >
                  <span>52-Q3 Feeder Switch</span>
                  <span>{q3Closed ? 'CLOSED' : 'OPEN'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SLD CANVAS (DEFAULT) */}
          {mobileTab === 'sld' && (
            <div 
              className="w-full h-full bg-[#060911] border border-[#1e293b] rounded-2xl relative overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div 
                className="w-full h-full transition-transform duration-75 flex items-center justify-center p-1"
                style={{
                  transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              >
                <BatteryChargerSLD
                  voltageIn={voltageIn}
                  loadPct={loadPct}
                  firingAngle={firingAngle}
                  isRunning={isRunning}
                  q1Closed={q1Closed}
                  q2Closed={q2Closed}
                  q3Closed={q3Closed}
                  onToggleQ1={() => setQ1Closed(!q1Closed)}
                  onToggleQ2={() => setQ2Closed(!q2Closed)}
                  onToggleQ3={() => setQ3Closed(!q3Closed)}
                  soc={soc}
                  activeFaults={activeFaults}
                  hasLcFilter={hasLcFilter}
                />
              </div>

              {/* Floating Mobile Zoom Controls */}
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-[#0d1424]/90 border border-[#1e293b] p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
                <button
                  onClick={handleResetZoom}
                  className="w-11 h-11 min-h-[44px] rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                  className="w-11 h-11 min-h-[44px] rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                  className="w-11 h-11 min-h-[44px] rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: WAVEFORMS */}
          {mobileTab === 'waveforms' && (
            <div className="w-full h-full bg-[#070b14] border border-[#1e293b] rounded-2xl p-4 overflow-y-auto flex flex-col gap-4">
              <BatteryChargerWaveforms
                voltageIn={voltageIn}
                loadPct={loadPct}
                firingAngle={firingAngle}
                q1Closed={q1Closed}
                q2Closed={q2Closed}
                q3Closed={q3Closed}
                isRunning={isRunning}
                soc={soc}
                activeFaults={activeFaults}
                hasLcFilter={hasLcFilter}
              />
            </div>
          )}

          {/* TAB 4: RESULTS & OUTPUTS */}
          {mobileTab === 'results' && (
            <div className="w-full h-full bg-[#0d1424] border border-[#1e293b] rounded-2xl p-4 overflow-y-auto flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                  Quick Operating Actions
                </span>
                <button
                  onClick={handleSetFloat}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> FLOAT MODE (122.6V)
                </button>
                <button
                  onClick={handleSetBoost}
                  className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> BOOST MODE (132.0V)
                </button>
                <button
                  onClick={handleWalkIn}
                  disabled={isWalkingIn || !q1Closed}
                  className="w-full min-h-[48px] rounded-xl bg-amber-500 text-black font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> {isWalkingIn ? `WALK-IN (${walkProgress}%)` : 'WALK-IN SOFT START'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            MOBILE FIELD BOTTOM NAVIGATION BAR (FIXED 48PX MIN TOUCH TARGETS)
            ========================================== */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[52px] z-50 bg-[#0d1424] border-t border-[#1e293b] flex items-center justify-around px-2 shadow-2xl">
          <button
            onClick={() => setMobileTab('controls')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-mono font-bold cursor-pointer transition-all ${
              mobileTab === 'controls' ? 'text-blue-400 bg-blue-950/40 border-t-2 border-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Controls</span>
          </button>
          <button
            onClick={() => setMobileTab('sld')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-mono font-bold cursor-pointer transition-all ${
              mobileTab === 'sld' ? 'text-emerald-400 bg-emerald-950/40 border-t-2 border-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>SLD Canvas</span>
          </button>
          <button
            onClick={() => setMobileTab('waveforms')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-mono font-bold cursor-pointer transition-all ${
              mobileTab === 'waveforms' ? 'text-blue-400 bg-blue-950/40 border-t-2 border-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Waveforms</span>
          </button>
          <button
            onClick={() => setMobileTab('results')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-mono font-bold cursor-pointer transition-all ${
              mobileTab === 'results' ? 'text-purple-400 bg-purple-950/40 border-t-2 border-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Results</span>
          </button>
        </div>

        {/* MOBILE FLOATING PAUSE ENGINE BUTTON (BOTTOM-RIGHT THUMB REACHABLE) */}
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`lg:hidden fixed bottom-16 right-4 z-50 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-white border-2 cursor-pointer transition-transform active:scale-95 ${
            isRunning
              ? 'bg-emerald-600 border-emerald-400 shadow-emerald-900/50'
              : 'bg-rose-600 border-rose-400 shadow-rose-900/50 animate-pulse'
          }`}
          title={isRunning ? 'Pause Simulation Engine' : 'Resume Simulation Engine'}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
      </div>
      </>
      )}
    </div>
  );
};
