import React, { useState, useRef } from 'react';
import { BatteryChargerSLD } from './BatteryChargerSLD';
import { BatteryChargerWaveforms } from './BatteryChargerWaveforms';
import { DualBatteryChargerContainer } from './DualBatteryChargerContainer';
import { SCRLearningLabPanel } from './SCRLearningLabPanel';
import { SingleChargerFaultModal } from './SingleChargerFaultModal';
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
  Pause,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Power,
  Shield,
  AlertTriangle,
  Sparkles
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
  setActiveFaults?: React.Dispatch<React.SetStateAction<ActiveFaults>>;
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
  setActiveFaults,
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

  // Layout & Full Screen Modes
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showWaveformsModal, setShowWaveformsModal] = useState<boolean>(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  const [showFaultModal, setShowFaultModal] = useState<boolean>(false);

  // Systematic Controls & Telemetry Section Navigation States
  const [activeControlSection, setActiveControlSection] = useState<'ALL' | 'STATUS' | 'CONTROLS' | 'PARAMS' | 'TELEMETRY' | 'PROTECTION'>('STATUS');
  const [showDetailedSectionModal, setShowDetailedSectionModal] = useState<boolean>(false);
  const [detailedModalTab, setDetailedModalTab] = useState<'STATUS' | 'CONTROLS' | 'PARAMS' | 'TELEMETRY' | 'PROTECTION' | 'SOP'>('CONTROLS');

  // Right Panel Systematic Section Navigation & Detailed Learning Workstation States
  const [activeRightPanelSection, setActiveRightPanelSection] = useState<'ALL' | 'LAB' | 'ACTIONS' | 'WAVEFORMS'>('LAB');
  const [showDetailedLearningModal, setShowDetailedLearningModal] = useState<boolean>(false);

  const openDetailedSection = (tab: 'STATUS' | 'CONTROLS' | 'PARAMS' | 'TELEMETRY' | 'PROTECTION' | 'SOP') => {
    setDetailedModalTab(tab);
    setShowDetailedSectionModal(true);
  };

  // Accordion Sections State for Left Panel (legacy compatibility)
  const [accordions, setAccordions] = useState({
    status: true,
    controls: true,
    params: true,
    telemetry: true,
    protection: true,
    actions: true,
    moreMeasurements: false,
  });

  const toggleAccordion = (key: keyof typeof accordions) => {
    setAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Tooltip State for Info Popovers
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

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

  // Fault Handlers
  const handleToggleFault = (faultKey: keyof ActiveFaults) => {
    if (setActiveFaults) {
      setActiveFaults((prev) => ({
        ...prev,
        [faultKey]: !prev[faultKey],
      }));
    }
  };

  const handleClearAllFaults = () => {
    if (setActiveFaults) {
      setActiveFaults({
        scrT3Open: false,
        acPhaseLossL2: false,
        groundFault: false,
        dcOvervoltage: false,
        loadTrip: false,
        controlFuseBlown: false,
        filterCapOpen: false,
        looseTerminal: false,
        roomFanFail: false,
        equalizeForgotten: false,
      });
    }
  };

  // Reset Actions
  const handleResetSimulation = () => {
    setLoadPct(85);
    setFiringAngle(67);
    setSourceInductanceMh(0.8);
    setHasLcFilter(true);
    setIsRunning(true);
    setQ1Closed(true);
    setQ2Closed(true);
    setQ3Closed(true);
    handleClearAllFaults();
  };

  const handleResetProtection = () => {
    handleClearAllFaults();
    setQ1Closed(true);
    setQ2Closed(true);
    setQ3Closed(true);
  };

  const handleToggleCharger = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    if (nextState) {
      setQ1Closed(true);
    }
  };

  // Calculated Electrical Values
  const rad = (firingAngle * Math.PI) / 180;
  let vdc = q1Closed && isRunning
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

  const vBat = q2Closed
    ? q1Closed && isRunning
      ? vdc
      : 110 + (soc - 50) * 0.15
    : 0;

  const iBat = q2Closed
    ? q1Closed && isRunning
      ? Math.max(0, 50 - idc)
      : q3Closed
      ? -idc
      : 0
    : 0;

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

  const vRipple = hasLcFilter
    ? activeFaults?.filterCapOpen
      ? 4.85
      : 0.45
    : 4.85;

  const vRipplePct = vdc > 0 ? (vRipple / vdc) * 100 : 0;
  const thdCurrent = 28.5 + (firingAngle / 90) * 12.0 - (hasLcFilter ? 18.0 : 0);
  const efficiency = q1Closed && q3Closed ? Math.max(82, 95.5 - (loadPct > 90 ? 3.5 : 0)) : 0;
  const vCell = vBat > 0 ? vBat / 55 : 0;

  const activeFaultsCount = Object.values(activeFaults || {}).filter(Boolean).length;
  const isAnyFault = activeFaultsCount > 0 || firingAngle > 90;

  let chargingStateLabel = 'FLOAT (122.6V)';
  let chargingColorClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
  if (!isRunning || !q1Closed) {
    chargingStateLabel = 'OFF / DISCHARGING';
    chargingColorClass = 'text-slate-400 bg-slate-900 border-slate-700';
  } else if (activeFaultsCount > 0) {
    chargingStateLabel = `FAULT TRIP (${activeFaultsCount})`;
    chargingColorClass = 'text-rose-400 bg-rose-950/80 border-rose-500/60 animate-pulse';
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
    if (isWalkingIn || !q1Closed || !isRunning) return;
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

  // Helper renderer for Group Headers
  const renderGroupHeader = (
    title: string,
    key: keyof typeof accordions,
    icon: React.ReactNode,
    badge?: string,
    badgeColor?: string
  ) => {
    const isOpen = accordions[key];
    return (
      <div
        onClick={() => toggleAccordion(key)}
        className="w-full flex items-center justify-between py-1.5 px-2 bg-[#0a101d] hover:bg-[#111a2e] border border-[#1e293b] rounded-lg cursor-pointer transition-colors select-none"
      >
        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
          {icon}
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded border ${badgeColor || 'text-slate-300 bg-slate-800 border-slate-700'}`}>
              {badge}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>
    );
  };

  // Helper Tooltip Popover Button
  const renderTooltipButton = (id: string, text: string) => {
    const isOpen = activeTooltip === id;
    return (
      <div className="relative inline-block ml-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTooltip(isOpen ? null : id);
          }}
          onMouseEnter={() => setActiveTooltip(id)}
          onMouseLeave={() => setActiveTooltip(null)}
          className="text-slate-400 hover:text-sky-300 transition-colors p-0.5 rounded cursor-pointer align-middle"
          title="Engineering Explanation"
        >
          <Info className="w-3 h-3" />
        </button>

        {isOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-52 p-2 bg-[#0c1424] border border-sky-500/50 rounded-lg shadow-xl z-50 text-[10px] text-slate-200 font-sans leading-tight pointer-events-none">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0c1424]" />
          </div>
        )}
      </div>
    );
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
                gridTemplateColumns: `${leftPanelCollapsed ? '42px' : '285px'} 1fr ${rightPanelCollapsed ? '42px' : '300px'}`
              }}
            >
              {/* ==========================================
                  LEFT PANEL: CONTROLS & TELEMETRY
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
                <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-2.5 flex flex-col gap-2 overflow-y-auto shadow-xl scrollbar-thin">
                  {/* Panel Header with Section Selector Dropdown */}
                  <div className="flex flex-col gap-2 pb-2 border-b border-[#1e293b]">
                    <div className="flex items-center justify-between">
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

                    {/* Section Selector Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        Active Control Section
                      </label>
                      <select
                        value={activeControlSection}
                        onChange={(e) => setActiveControlSection(e.target.value as any)}
                        className="w-full bg-[#070b14] text-xs font-mono font-bold text-sky-400 border border-[#1e293b] rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="STATUS">⚡ 1. System Status &amp; Switchgear Breakers</option>
                        <option value="CONTROLS">🎛️ 2. Charger Operating Mode &amp; Firing Angle</option>
                        <option value="PARAMS">⚙️ 3. Grid &amp; Circuit Parameters</option>
                        <option value="TELEMETRY">📊 4. DC Bus &amp; Battery Telemetry</option>
                        <option value="PROTECTION">🛡️ 5. Protection &amp; Fault Management</option>
                        <option value="ALL">🌐 View All Sections</option>
                      </select>
                    </div>

                    {/* Quick Section Navigation Pills Bar */}
                    <div className="grid grid-cols-6 gap-1 pt-0.5">
                      {[
                        { id: 'STATUS', label: '⚡', name: 'Status & Breakers' },
                        { id: 'CONTROLS', label: '🎛️', name: 'Charger Mode & α' },
                        { id: 'PARAMS', label: '⚙️', name: 'Grid & Circuit' },
                        { id: 'TELEMETRY', label: '📊', name: 'Telemetry' },
                        { id: 'PROTECTION', label: '🛡️', name: 'Relays & Faults' },
                        { id: 'ALL', label: '🌐', name: 'Show All' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveControlSection(item.id as any)}
                          title={item.name}
                          className={`py-1 text-center rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                            activeControlSection === item.id
                              ? 'bg-blue-600/30 text-blue-300 border-blue-400 shadow-sm font-bold'
                              : 'bg-[#070b14] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ==========================================
                      SECTION 1: SYSTEM STATUS & SWITCHGEAR BREAKERS
                      ========================================== */}
                  {(activeControlSection === 'STATUS' || activeControlSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Power className="w-3.5 h-3.5 text-emerald-400" />
                          System Status &amp; Breakers
                        </span>
                        <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                          isRunning ? (activeFaultsCount > 0 ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse' : 'bg-emerald-950 text-emerald-400 border-emerald-800') : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {isRunning ? (activeFaultsCount > 0 ? 'TRIP' : 'NORMAL') : 'STOPPED'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0b1220] border border-[#1e293b]">
                          <span className="text-slate-400 text-[10px] font-bold">CHARGER ENGINE</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${chargingColorClass}`}>
                            {chargingStateLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0b1220] border border-[#1e293b]">
                          <span className="text-slate-400 text-[10px] font-bold">AC INFEED (3Φ)</span>
                          <span className="text-sky-400 font-bold text-[11px]">{voltageIn}V / 50Hz</span>
                        </div>

                        {/* Interactive Breaker Switches */}
                        <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            Switchgear Breakers (Interactive)
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => setQ1Closed(!q1Closed)}
                              className={`p-1.5 text-center rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                q1Closed ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' : 'bg-rose-950/70 border-rose-700 text-rose-300'
                              }`}
                            >
                              52-Q1 {q1Closed ? 'CLOSED' : 'OPEN'}
                            </button>
                            <button
                              onClick={() => setQ2Closed(!q2Closed)}
                              className={`p-1.5 text-center rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                q2Closed ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' : 'bg-rose-950/70 border-rose-700 text-rose-300'
                              }`}
                            >
                              52-Q2 {q2Closed ? 'CLOSED' : 'OPEN'}
                            </button>
                            <button
                              onClick={() => setQ3Closed(!q3Closed)}
                              className={`p-1.5 text-center rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                q3Closed ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' : 'bg-rose-950/70 border-rose-700 text-rose-300'
                              }`}
                            >
                              52-Q3 {q3Closed ? 'CLOSED' : 'OPEN'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openDetailedSection('STATUS')}
                        className="w-full mt-1 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-400" />
                        <span>Open Detailed Switchgear &amp; SOP Panel</span>
                      </button>
                    </div>
                  )}

                  {/* ==========================================
                      SECTION 2: CHARGER OPERATING MODE & FIRING ANGLE
                      ========================================== */}
                  {(activeControlSection === 'CONTROLS' || activeControlSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                          Charger Operating Mode &amp; α
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                          α={firingAngle}°
                        </span>
                      </div>

                      {/* Main Charger Run / Stop Button */}
                      <button
                        onClick={handleToggleCharger}
                        className={`w-full py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                          isRunning
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                            : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        <span>{isRunning ? 'CHARGER RUNNING (STOP)' : 'CHARGER STOPPED (START)'}</span>
                      </button>

                      {/* Float / Boost Selector */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={handleSetFloat}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                            opMode === 'FLOAT'
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                              : 'bg-[#0b1220] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                          }`}
                        >
                          FLOAT (122.6V)
                        </button>
                        <button
                          onClick={handleSetBoost}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                            opMode === 'BOOST'
                              ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                              : 'bg-[#0b1220] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                          }`}
                        >
                          BOOST (132.0V)
                        </button>
                      </div>

                      {/* Walk-in Soft Start */}
                      <button
                        onClick={handleWalkIn}
                        disabled={isWalkingIn || !q1Closed || !isRunning}
                        className={`w-full py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center justify-between px-2.5 transition-all cursor-pointer ${
                          isWalkingIn
                            ? 'bg-amber-500 text-black font-extrabold animate-pulse'
                            : 'bg-[#0b1220] text-amber-400 border border-amber-500/40 hover:bg-amber-950/40'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Play className="w-3 h-3" />
                          {isWalkingIn ? `RAMPING (${walkProgress}%)` : 'WALK-IN SOFT START'}
                        </span>
                        <span className="text-[9px] font-mono text-amber-300">10s</span>
                      </button>

                      {/* Firing Angle Slider & Presets */}
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-[#1e293b]">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 font-semibold flex items-center">
                            SCR Angle (α)
                            {renderTooltipButton('alpha', 'Phase delay angle α of thyristor gate triggers determining DC output voltage.')}
                          </span>
                          <span className="text-emerald-400 font-bold">{firingAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={firingAngle}
                          onChange={(e) => setFiringAngle(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 min-h-[24px]"
                        />
                        <div className="grid grid-cols-4 gap-1">
                          {[15, 30, 45, 67].map((angle) => (
                            <button
                              key={angle}
                              onClick={() => setFiringAngle(angle)}
                              className={`py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                                firingAngle === angle
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#0b1220] text-slate-400 hover:text-white border border-[#1e293b]'
                              }`}
                            >
                              α={angle}°
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => openDetailedSection('CONTROLS')}
                        className="w-full mt-1 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-400" />
                        <span>Open Detailed Firing Angle Control Center</span>
                      </button>
                    </div>
                  )}

                  {/* ==========================================
                      SECTION 3: GRID & CIRCUIT PARAMETERS
                      ========================================== */}
                  {(activeControlSection === 'PARAMS' || activeControlSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Gauge className="w-3.5 h-3.5 text-amber-400" />
                          Grid &amp; Circuit Parameters
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                          {loadPct}% LOAD
                        </span>
                      </div>

                      {/* System Load Demand Slider */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 font-semibold flex items-center">
                            System Load Demand
                            {renderTooltipButton('load', 'Percentage of nominal critical substation DC load demand (0-50A).')}
                          </span>
                          <span className="text-blue-400 font-bold">{loadPct}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="110"
                          value={loadPct}
                          onChange={(e) => setLoadPct(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 min-h-[24px]"
                        />
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span>10% (5A)</span>
                          <span>50% (25A)</span>
                          <span>110% (55A)</span>
                        </div>
                      </div>

                      {/* Source Inductance Ls Slider */}
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-[#1e293b]">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 font-semibold flex items-center">
                            Source Inductance (Ls)
                            {renderTooltipButton('ls', 'Substation transformer & line commutating reactance causing phase overlap angle μ.')}
                          </span>
                          <span className="text-amber-400 font-bold">{sourceInductanceMh} mH</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="2.5"
                          step="0.1"
                          value={sourceInductanceMh}
                          onChange={(e) => setSourceInductanceMh(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 min-h-[24px]"
                        />
                        <div className="grid grid-cols-4 gap-1">
                          {[0.2, 0.8, 1.5, 2.5].map((lsVal) => (
                            <button
                              key={lsVal}
                              onClick={() => setSourceInductanceMh(lsVal)}
                              className={`py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                                sourceInductanceMh === lsVal
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-[#0b1220] text-slate-400 hover:text-white border border-[#1e293b]'
                              }`}
                            >
                              {lsVal}mH
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* DC LC Filter Toggle */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#1e293b]">
                        <span className="text-xs font-mono text-slate-300 font-semibold flex items-center">
                          DC LC Filter
                          {renderTooltipButton('lc', 'DC smoothing reactor L1 and capacitor C1 bank ripple filter.')}
                        </span>
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

                      <button
                        onClick={() => openDetailedSection('PARAMS')}
                        className="w-full mt-1 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-400" />
                        <span>Open Detailed Circuit Parameter Workbench</span>
                      </button>
                    </div>
                  )}

                  {/* ==========================================
                      SECTION 4: DC BUS & BATTERY TELEMETRY
                      ========================================== */}
                  {(activeControlSection === 'TELEMETRY' || activeControlSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Activity className="w-3.5 h-3.5 text-sky-400" />
                          DC Bus &amp; Battery Telemetry
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                          {vdc.toFixed(1)}V DC
                        </span>
                      </div>

                      {/* COMPACT TELEMETRY CARDS (2x2 Grid) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* DC Bus Voltage Card */}
                        <div className={`p-2 rounded-xl border flex flex-col justify-between bg-[#0b1220] ${
                          vdc > 135 || vdc < 100 ? 'border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 'border-[#1e293b]'
                        }`}>
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold">
                            <span>DC BUS V</span>
                            <span className="flex items-center text-emerald-400">
                              <TrendingUp className="w-3 h-3 mr-0.5" />
                              VDC
                            </span>
                          </div>
                          <span className="text-base font-mono font-black text-emerald-400 my-0.5">
                            {vdc.toFixed(1)} <span className="text-xs font-normal">V</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {vdc > 135 ? '⚠️ OVERVOLTAGE' : vdc < 100 ? '⚠️ LOW VOLTAGE' : '✓ NORMAL'}
                          </span>
                        </div>

                        {/* DC Load Current Card */}
                        <div className="p-2 rounded-xl border border-[#1e293b] flex flex-col justify-between bg-[#0b1220]">
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold">
                            <span>DC LOAD I</span>
                            <span className="flex items-center text-blue-400">
                              <Minus className="w-3 h-3 mr-0.5" />
                              AMP
                            </span>
                          </div>
                          <span className="text-base font-mono font-black text-blue-400 my-0.5">
                            {idc.toFixed(1)} <span className="text-xs font-normal">A</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {q3Closed ? `${loadPct}% DEMAND` : 'OFF'}
                          </span>
                        </div>

                        {/* Battery Voltage Card */}
                        <div className="p-2 rounded-xl border border-[#1e293b] flex flex-col justify-between bg-[#0b1220]">
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold">
                            <span>BATTERY V</span>
                            <span className="text-amber-400 font-bold">55 CELLS</span>
                          </div>
                          <span className="text-base font-mono font-black text-amber-400 my-0.5">
                            {vBat.toFixed(1)} <span className="text-xs font-normal">V</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {vCell.toFixed(2)} V/CELL
                          </span>
                        </div>

                        {/* Battery Current Card */}
                        <div className="p-2 rounded-xl border border-[#1e293b] flex flex-col justify-between bg-[#0b1220]">
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold">
                            <span>BATTERY I</span>
                            <span className={iBat >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {iBat >= 0 ? 'FLOAT' : 'DISCHG'}
                            </span>
                          </div>
                          <span className={`text-base font-mono font-black my-0.5 ${iBat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {Math.abs(iBat).toFixed(1)} <span className="text-xs font-normal">A</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {iBat >= 0 ? 'INFLOW (+)' : 'OUTFLOW (-)'}
                          </span>
                        </div>
                      </div>

                      {/* BATTERY SOC PROGRESS CARD */}
                      <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400 font-bold">BATTERY SOC</span>
                          <span className="text-amber-400 font-black">{soc.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
                          />
                        </div>
                      </div>

                      {/* RIPPLE TELEMETRY CARD */}
                      <div className={`p-2 rounded-xl border flex items-center justify-between bg-[#0b1220] ${
                        vRipple > 2.0 ? 'border-amber-500/60 bg-amber-950/20' : 'border-[#1e293b]'
                      }`}>
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 font-bold block">DC VOLTAGE RIPPLE</span>
                          <span className={`text-xs font-mono font-extrabold ${vRipple > 2.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {vRipple.toFixed(2)} V ({vRipplePct.toFixed(1)}%)
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          vRipple > 2.0 ? 'bg-amber-950 text-amber-400 border-amber-800' : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {vRipple > 2.0 ? 'HIGH RIPPLE' : 'NORMAL'}
                        </span>
                      </div>

                      {/* Secondary Telemetry Grid */}
                      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#0b1220] border border-[#1e293b] rounded-xl text-xs font-mono">
                        <div className="p-1">
                          <span className="text-[9px] text-slate-400 block font-bold">THD CURRENT</span>
                          <span className="text-purple-400 font-bold">{thdCurrent.toFixed(1)}%</span>
                        </div>
                        <div className="p-1">
                          <span className="text-[9px] text-slate-400 block font-bold">EFFICIENCY</span>
                          <span className="text-emerald-400 font-bold">{efficiency.toFixed(1)}%</span>
                        </div>
                        <div className="p-1">
                          <span className="text-[9px] text-slate-400 block font-bold">OVERLAP (μ)</span>
                          <span className="text-amber-400 font-bold">{conductionState.overlapAngleDeg.toFixed(1)}°</span>
                        </div>
                        <div className="p-1">
                          <span className="text-[9px] text-slate-400 block font-bold">FIRING (α)</span>
                          <span className="text-sky-400 font-bold">{firingAngle}°</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openDetailedSection('TELEMETRY')}
                        className="w-full mt-1 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-400" />
                        <span>Open Detailed Telemetry Dashboard</span>
                      </button>
                    </div>
                  )}

                  {/* ==========================================
                      SECTION 5: PROTECTION & FAULT MANAGEMENT
                      ========================================== */}
                  {(activeControlSection === 'PROTECTION' || activeControlSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Shield className="w-3.5 h-3.5 text-rose-400" />
                          Protection &amp; Fault Matrix
                        </span>
                        <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                          activeFaultsCount > 0 ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse' : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {activeFaultsCount > 0 ? `${activeFaultsCount} FAULTS` : 'NOMINAL'}
                        </span>
                      </div>

                      {/* Active Fault Status Summary */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-xs font-mono">
                        <span className="text-slate-300 font-bold flex items-center gap-1">
                          <AlertTriangle className={`w-3.5 h-3.5 ${activeFaultsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                          Protection Summary
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          activeFaultsCount > 0 ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse' : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {activeFaultsCount > 0 ? `${activeFaultsCount} FAULTS ACTIVE` : 'ALL RELAYS OK'}
                        </span>
                      </div>

                      {/* Fault Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={handleResetProtection}
                          className="py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Protection</span>
                        </button>
                        <button
                          onClick={() => setShowFaultModal(true)}
                          className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Apply Fault...</span>
                        </button>
                      </div>

                      <button
                        onClick={handleClearAllFaults}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Clear All Active Faults</span>
                      </button>

                      <button
                        onClick={handleResetSimulation}
                        className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>Reset Simulation Engine</span>
                      </button>

                      <button
                        onClick={() => openDetailedSection('PROTECTION')}
                        className="w-full mt-1 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-400" />
                        <span>Open Detailed Relaying &amp; Fault Lab</span>
                      </button>
                    </div>
                  )}
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

                {/* SLD DIAGRAM CANVAS WORKSPACE (FULL 100% UNCOMPRESSED HEIGHT) */}
                <div className="flex-1 w-full h-full relative overflow-y-auto flex items-center justify-center p-2 scrollbar-none">
                  <div className="w-full h-full flex items-center justify-center">
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
                      onToggleFault={(faultKey) => {
                        if (setActiveFaults) {
                          setActiveFaults((prev) => ({ ...prev, [faultKey]: !prev[faultKey] }));
                        }
                      }}
                      soc={soc}
                      activeFaults={activeFaults}
                      hasLcFilter={hasLcFilter}
                      tutorialStep={tutorialStep}
                      onSetTutorialStep={setTutorialStep}
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
                <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-2.5 flex flex-col gap-2.5 overflow-y-auto shadow-xl scrollbar-thin">
                  {/* Right Panel Header with Section Dropdown Selector */}
                  <div className="flex flex-col gap-2 pb-2 border-b border-[#1e293b]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        Learning &amp; Quick Actions
                      </span>
                      <button
                        onClick={() => setRightPanelCollapsed(true)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Collapse Panel"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Section Selector Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        Active Right Section
                      </label>
                      <select
                        value={activeRightPanelSection}
                        onChange={(e) => setActiveRightPanelSection(e.target.value as any)}
                        className="w-full bg-[#070b14] text-xs font-mono font-bold text-amber-300 border border-[#1e293b] rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:border-amber-500 shadow-sm"
                      >
                        <option value="LAB">🎓 1. Interactive Learning Laboratory</option>
                        <option value="ACTIONS">⚡ 2. Operator Quick Actions &amp; Modes</option>
                        <option value="WAVEFORMS">📈 3. Live Waveforms Oscilloscope</option>
                        <option value="ALL">🌐 View All Right Sections</option>
                      </select>
                    </div>

                    {/* Navigation Pills Bar */}
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {[
                        { id: 'LAB', label: '🎓', name: 'Learning Lab' },
                        { id: 'ACTIONS', label: '⚡', name: 'Quick Actions' },
                        { id: 'WAVEFORMS', label: '📈', name: 'Live Oscilloscope' },
                        { id: 'ALL', label: '🌐', name: 'Show All' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveRightPanelSection(item.id as any)}
                          title={item.name}
                          className={`py-1 text-center rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                            activeRightPanelSection === item.id
                              ? 'bg-amber-600/30 text-amber-300 border-amber-400 shadow-sm font-bold'
                              : 'bg-[#070b14] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ==========================================
                      RIGHT SECTION 1: INTERACTIVE LEARNING LABORATORY
                      ========================================== */}
                  {(activeRightPanelSection === 'LAB' || activeRightPanelSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md font-mono">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          Interactive Learning Suite
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                          IEEE / IEC
                        </span>
                      </div>

                      {/* Live Engineering Insight Snippet */}
                      <div className="p-2 rounded-lg bg-[#0b1220] border border-[#1e293b] flex flex-col gap-1 text-xs">
                        <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" /> Live Physics Insight:
                        </span>
                        <p className="text-[10px] text-slate-300 leading-snug font-sans">
                          {!q1Closed ? (
                            'Main AC breaker 52-Q1 is OPEN. SCR bridge is de-energized.'
                          ) : activeFaults?.controlFuseBlown ? (
                            'Control Fuse F1-F3 BLOWN! Pulse triggers inhibited.'
                          ) : firingAngle > 80 ? (
                            `Firing angle α = ${firingAngle}° near cutoff. Vdc reduced to ${vdc.toFixed(1)}V.`
                          ) : conductionState.overlapAngleDeg > 0.5 ? (
                            `Source inductance Ls = ${sourceInductanceMh}mH causing overlap μ = ${conductionState.overlapAngleDeg.toFixed(1)}°.`
                          ) : (
                            `Continuous SCR conduction mode at α = ${firingAngle}°. Output Vdc = ${vdc.toFixed(1)}V.`
                          )}
                        </p>
                      </div>

                      {/* Key State Badges Grid */}
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className="p-1.5 bg-[#0b1220] rounded-lg border border-[#1e293b]">
                          <span className="text-slate-400 block text-[9px]">ACTIVE SCR PAIR</span>
                          <span className="text-emerald-400 font-bold">{conductionState.conductingSCRs.join(' + ') || 'NONE'}</span>
                        </div>
                        <div className="p-1.5 bg-[#0b1220] rounded-lg border border-[#1e293b]">
                          <span className="text-slate-400 block text-[9px]">OVERLAP (μ)</span>
                          <span className="text-amber-400 font-bold">{conductionState.overlapAngleDeg.toFixed(1)}°</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowDetailedLearningModal(true)}
                        className="w-full mt-1 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-amber-400" />
                        <span>Open Detailed Learning Workstation</span>
                      </button>
                    </div>
                  )}

                  {/* ==========================================
                      RIGHT SECTION 2: OPERATOR QUICK ACTIONS
                      ========================================== */}
                  {(activeRightPanelSection === 'ACTIONS' || activeRightPanelSection === 'ALL') && (
                    <div className="flex flex-col gap-2 p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md font-mono">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-400" />
                          Operator Quick Actions
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                          QUICK PRESETS
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          onClick={handleSetFloat}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-between px-2.5 transition-all cursor-pointer border ${
                            opMode === 'FLOAT' && firingAngle <= 75
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                              : 'bg-[#0b1220] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            FLOAT MODE (122.6V)
                          </span>
                          <span className="text-[10px] text-slate-400">α=67°</span>
                        </button>

                        <button
                          onClick={handleSetBoost}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-between px-2.5 transition-all cursor-pointer border ${
                            opMode === 'BOOST'
                              ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                              : 'bg-[#0b1220] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-blue-400" />
                            BOOST MODE (132.0V)
                          </span>
                          <span className="text-[10px] text-slate-400">α=45°</span>
                        </button>

                        <button
                          onClick={handleWalkIn}
                          disabled={isWalkingIn || !q1Closed || !isRunning}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-between px-2.5 transition-all cursor-pointer ${
                            isWalkingIn
                              ? 'bg-amber-500 text-black font-extrabold animate-pulse'
                              : 'bg-[#0b1220] text-amber-400 border border-amber-500/40 hover:bg-amber-950/40'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Play className="w-3.5 h-3.5" />
                            {isWalkingIn ? `RAMPING (${walkProgress}%)` : 'WALK-IN SOFT START'}
                          </span>
                          <span className="text-[10px] text-amber-300">10s</span>
                        </button>

                        <button
                          onClick={handleResetSimulation}
                          className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset Simulation Engine</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ==========================================
                      RIGHT SECTION 3: LIVE WAVEFORMS OSCILLOSCOPE
                      ========================================== */}
                  {(activeRightPanelSection === 'WAVEFORMS' || activeRightPanelSection === 'ALL') && (
                    <div className="flex-1 flex flex-col gap-1.5 min-h-[220px] p-2 bg-[#070b14] border border-[#1e293b] rounded-xl shadow-md font-mono">
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
                        <span className="font-bold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-400" />
                          Live Waveforms Oscilloscope
                        </span>
                        <button
                          onClick={() => setShowWaveformsModal(true)}
                          className="text-[10px] text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          Expand ↗
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto pr-1">
                        <BatteryChargerWaveforms
                          voltageIn={voltageIn}
                          loadPct={loadPct}
                          firingAngle={firingAngle}
                          sourceInductanceMh={sourceInductanceMh}
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
                  )}
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
                    sourceInductanceMh={sourceInductanceMh}
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
                CONTROLLED FAULT SELECTION MODAL
                ========================================== */}
            <SingleChargerFaultModal
              isOpen={showFaultModal}
              onClose={() => setShowFaultModal(false)}
              activeFaults={activeFaults}
              onToggleFault={handleToggleFault}
              onClearAllFaults={handleClearAllFaults}
            />

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

              {/* Fault Modal Launcher for Mobile */}
              <button
                onClick={() => setShowFaultModal(true)}
                className="w-full min-h-[48px] rounded-xl bg-rose-600 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer mt-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>OPEN FAULT SELECTION INTERFACE</span>
              </button>
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
                  disabled={isWalkingIn || !q1Closed || !isRunning}
                  className="w-full min-h-[48px] rounded-xl bg-amber-500 text-black font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> {isWalkingIn ? `WALK-IN (${walkProgress}%)` : 'WALK-IN SOFT START'}
                </button>
                <button
                  onClick={handleResetSimulation}
                  className="w-full min-h-[48px] rounded-xl bg-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
                >
                  <RefreshCw className="w-4 h-4" /> RESET SIMULATION
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

        {/* ==========================================
            DETAILED SECTION CONTROL CENTER MODAL WORKSTATION
            ========================================== */}
        {showDetailedSectionModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono">
              {/* Modal Header */}
              <div className="bg-[#070b14] border-b border-[#1e293b] px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                    <Sliders className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                      Control &amp; Telemetry Detailed Workstation
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Industrial Substation SCR Converter &amp; Battery Charger Control Workbench
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailedSectionModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workstation Tab Bar */}
              <div className="bg-[#0b1220] border-b border-[#1e293b] px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
                {[
                  { id: 'STATUS', label: '⚡ 1. Switchgear & Status', icon: Power },
                  { id: 'CONTROLS', label: '🎛️ 2. Firing Angle (α)', icon: SlidersHorizontal },
                  { id: 'PARAMS', label: '⚙️ 3. Circuit Parameters', icon: Gauge },
                  { id: 'TELEMETRY', label: '📊 4. Telemetry Gauges', icon: Activity },
                  { id: 'PROTECTION', label: '🛡️ 5. Relaying & Faults', icon: Shield },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailedModalTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                      detailedModalTab === tab.id
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                        : 'bg-[#070b14] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Workstation Content View */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 bg-[#080d18]">
                {/* TAB 1: STATUS & SWITCHGEAR */}
                {detailedModalTab === 'STATUS' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-[#0c1322] border border-[#1e293b] p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-slate-400 text-xs font-bold">ENGINE RUN STATUS</span>
                        <div className="my-2">
                          <span className={`text-sm font-black px-3 py-1 rounded-lg border ${chargingColorClass}`}>
                            {chargingStateLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Primary Thyristor Bridge Firing Loop State
                        </span>
                      </div>

                      <div className="bg-[#0c1322] border border-[#1e293b] p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-slate-400 text-xs font-bold">AC MAINS INFEED</span>
                        <div className="my-2">
                          <span className="text-lg font-black text-sky-400">{voltageIn}V AC</span>
                          <span className="text-xs text-slate-400 ml-2">3-Phase 50Hz</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {q1Closed ? '✓ 52-Q1 Breaker Engaged' : '⚠️ Breaker Disconnected'}
                        </span>
                      </div>

                      <div className="bg-[#0c1322] border border-[#1e293b] p-3.5 rounded-xl flex flex-col justify-between">
                        <span className="text-slate-400 text-xs font-bold">PROTECTION RELAYS</span>
                        <div className="my-2">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                            activeFaultsCount > 0 ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          }`}>
                            {activeFaultsCount > 0 ? `${activeFaultsCount} FAULTS TRIP` : 'SYSTEM NOMINAL (OK)'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Automatic trip protection monitoring
                        </span>
                      </div>
                    </div>

                    {/* Detailed Switchgear Operations */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                        <Power className="w-4 h-4 text-emerald-400" />
                        Switchgear Breakers Operational SOP Matrix
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                          q1Closed ? 'bg-emerald-950/20 border-emerald-800' : 'bg-rose-950/20 border-rose-800'
                        }`}>
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">52-Q1 AC Breaker</span>
                            <span className="text-[10px] text-slate-400 block mb-2">415V AC Input Isolation</span>
                          </div>
                          <button
                            onClick={() => setQ1Closed(!q1Closed)}
                            className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              q1Closed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            {q1Closed ? 'CLOSE BREAKER (ON)' : 'OPEN BREAKER (OFF)'}
                          </button>
                        </div>

                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                          q2Closed ? 'bg-emerald-950/20 border-emerald-800' : 'bg-rose-950/20 border-rose-800'
                        }`}>
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">52-Q2 Battery Switch</span>
                            <span className="text-[10px] text-slate-400 block mb-2">110V DC Bank Connection</span>
                          </div>
                          <button
                            onClick={() => setQ2Closed(!q2Closed)}
                            className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              q2Closed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            {q2Closed ? 'CLOSE SWITCH (ON)' : 'OPEN SWITCH (OFF)'}
                          </button>
                        </div>

                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                          q3Closed ? 'bg-emerald-950/20 border-emerald-800' : 'bg-rose-950/20 border-rose-800'
                        }`}>
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">52-Q3 Load Feeder</span>
                            <span className="text-[10px] text-slate-400 block mb-2">Substation Bus Feeder</span>
                          </div>
                          <button
                            onClick={() => setQ3Closed(!q3Closed)}
                            className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              q3Closed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            {q3Closed ? 'CLOSE FEEDER (ON)' : 'OPEN FEEDER (OFF)'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CONTROLS & FIRING ANGLE */}
                {detailedModalTab === 'CONTROLS' && (
                  <div className="flex flex-col gap-4">
                    {/* Formula Bar */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-3.5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block">6-PULSE SCR DC OUTPUT FORMULA</span>
                        <span className="text-emerald-400 font-bold text-sm">
                          Vdc = (3√2 / π) × Vac × cos(α) = {vdc.toFixed(1)} V
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        α = {firingAngle}° delay angle
                      </span>
                    </div>

                    {/* Firing Angle Precision Control */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white uppercase tracking-wider">
                          SCR Firing Angle Gate Control (α)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFiringAngle(Math.max(0, firingAngle - 1))}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
                          >
                            - 1°
                          </button>
                          <span className="text-base font-black text-emerald-400">{firingAngle}°</span>
                          <button
                            onClick={() => setFiringAngle(Math.min(90, firingAngle + 1))}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
                          >
                            + 1°
                          </button>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="90"
                        value={firingAngle}
                        onChange={(e) => setFiringAngle(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />

                      <div className="grid grid-cols-5 gap-2 pt-2">
                        {[15, 30, 45, 67, 75].map((angle) => (
                          <button
                            key={angle}
                            onClick={() => setFiringAngle(angle)}
                            className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                              firingAngle === angle
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                : 'bg-[#070b14] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                            }`}
                          >
                            α = {angle}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Operational Modes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleSetFloat}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          opMode === 'FLOAT' ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300' : 'bg-[#0c1322] border-[#1e293b] text-slate-400'
                        }`}
                      >
                        <span className="font-bold text-sm">FLOAT CHARGE MODE (122.6V)</span>
                        <span className="text-xs mt-1">Normal continuous trickle charge voltage (2.23 V/cell for 55 VRLA cells).</span>
                      </button>

                      <button
                        onClick={handleSetBoost}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          opMode === 'BOOST' ? 'bg-blue-950/30 border-blue-500 text-blue-300' : 'bg-[#0c1322] border-[#1e293b] text-slate-400'
                        }`}
                      >
                        <span className="font-bold text-sm">BOOST CHARGE MODE (132.0V)</span>
                        <span className="text-xs mt-1">Accelerated equalization charge voltage (2.40 V/cell for 55 VRLA cells).</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: CIRCUIT PARAMETERS */}
                {detailedModalTab === 'PARAMS' && (
                  <div className="flex flex-col gap-4">
                    {/* Load Demand Tuning */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white uppercase tracking-wider">
                          System Load Demand (%)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLoadPct(Math.max(10, loadPct - 5))}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
                          >
                            - 5%
                          </button>
                          <span className="text-base font-black text-blue-400">{loadPct}% ({idc.toFixed(1)}A)</span>
                          <button
                            onClick={() => setLoadPct(Math.min(110, loadPct + 5))}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
                          >
                            + 5%
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="110"
                        value={loadPct}
                        onChange={(e) => setLoadPct(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    {/* Source Inductance Ls */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white uppercase tracking-wider">
                          Source Inductance (Ls) &amp; Overlap Angle (μ)
                        </span>
                        <span className="text-base font-black text-amber-400">{sourceInductanceMh} mH (μ={conductionState.overlapAngleDeg.toFixed(1)}°)</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.5"
                        step="0.1"
                        value={sourceInductanceMh}
                        onChange={(e) => setSourceInductanceMh(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {[0.2, 0.8, 1.5, 2.5].map((lsVal) => (
                          <button
                            key={lsVal}
                            onClick={() => setSourceInductanceMh(lsVal)}
                            className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                              sourceInductanceMh === lsVal
                                ? 'bg-amber-600 text-white border-amber-400'
                                : 'bg-[#070b14] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                            }`}
                          >
                            {lsVal} mH
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* LC Filter */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white uppercase tracking-wider block">DC LC Smoothing Filter</span>
                        <span className="text-xs text-slate-400">Filters 300Hz thyristor ripple voltage to maintain battery health.</span>
                      </div>
                      <button
                        onClick={() => setHasLcFilter(!hasLcFilter)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          hasLcFilter ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {hasLcFilter ? 'LC FILTER ACTIVE' : 'LC BYPASSED'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: TELEMETRY & GAUGES */}
                {detailedModalTab === 'TELEMETRY' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#0c1322] border border-[#1e293b] p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400">DC BUS VOLTAGE</span>
                        <span className="text-xl font-black text-emerald-400 my-1">{vdc.toFixed(1)} V</span>
                        <span className="text-[9px] text-slate-400">{vdc > 135 ? '⚠️ OVERVOLTAGE' : 'NOMINAL RANGE'}</span>
                      </div>

                      <div className="bg-[#0c1322] border border-[#1e293b] p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400">LOAD CURRENT</span>
                        <span className="text-xl font-black text-blue-400 my-1">{idc.toFixed(1)} A</span>
                        <span className="text-[9px] text-slate-400">{loadPct}% Load Demand</span>
                      </div>

                      <div className="bg-[#0c1322] border border-[#1e293b] p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400">BATTERY VOLTAGE</span>
                        <span className="text-xl font-black text-amber-400 my-1">{vBat.toFixed(1)} V</span>
                        <span className="text-[9px] text-slate-400">{vCell.toFixed(2)} V/Cell (55 cells)</span>
                      </div>

                      <div className="bg-[#0c1322] border border-[#1e293b] p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400">BATTERY CURRENT</span>
                        <span className={`text-xl font-black my-1 ${iBat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {Math.abs(iBat).toFixed(1)} A
                        </span>
                        <span className="text-[9px] text-slate-400">{iBat >= 0 ? 'FLOAT CHARGE' : 'DISCHARGING'}</span>
                      </div>
                    </div>

                    {/* Advanced Metrics Table */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex flex-col gap-2">
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-1">
                        Detailed Power Quality &amp; Electrical Measurements
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2 bg-[#070b14] rounded-lg border border-[#1e293b]">
                          <span className="text-[10px] text-slate-400 block">DC VOLTAGE RIPPLE</span>
                          <span className="text-amber-400 font-bold">{vRipple.toFixed(2)} V ({vRipplePct.toFixed(1)}%)</span>
                        </div>
                        <div className="p-2 bg-[#070b14] rounded-lg border border-[#1e293b]">
                          <span className="text-[10px] text-slate-400 block">AC CURRENT THD</span>
                          <span className="text-purple-400 font-bold">{thdCurrent.toFixed(1)}%</span>
                        </div>
                        <div className="p-2 bg-[#070b14] rounded-lg border border-[#1e293b]">
                          <span className="text-[10px] text-slate-400 block">SYSTEM EFFICIENCY</span>
                          <span className="text-emerald-400 font-bold">{efficiency.toFixed(1)}%</span>
                        </div>
                        <div className="p-2 bg-[#070b14] rounded-lg border border-[#1e293b]">
                          <span className="text-[10px] text-slate-400 block">PHASE OVERLAP (μ)</span>
                          <span className="text-amber-400 font-bold">{conductionState.overlapAngleDeg.toFixed(1)}°</span>
                        </div>
                        <div className="p-2 bg-[#070b14] rounded-lg border border-[#1e293b]">
                          <span className="text-[10px] text-slate-400 block">BATTERY SOC</span>
                          <span className="text-amber-400 font-bold">{soc.toFixed(1)}%</span>
                        </div>
                        <div className="p-2 bg-[#070b14] rounded-lg border border-[#1e293b]">
                          <span className="text-[10px] text-slate-400 block">CELL VOLTAGE</span>
                          <span className="text-sky-400 font-bold">{vCell.toFixed(3)} V/cell</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: PROTECTION & FAULTS */}
                {detailedModalTab === 'PROTECTION' && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white uppercase tracking-wider block">Protection Relaying State</span>
                        <span className="text-xs text-slate-400">
                          {activeFaultsCount > 0 ? `${activeFaultsCount} Active Fault conditions detected.` : 'All protection relays clear & nominal.'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResetProtection}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                        >
                          Reset Relays
                        </button>
                        <button
                          onClick={handleClearAllFaults}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer border border-slate-700"
                        >
                          Clear Faults
                        </button>
                      </div>
                    </div>

                    {/* Interactive Fault Injection Matrix */}
                    <div className="bg-[#0c1322] border border-[#1e293b] p-4 rounded-xl flex flex-col gap-3">
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                        Interactive Electrical Fault Injection Lab
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { key: 'scrT3Open', label: 'SCR T3 Gate Open' },
                          { key: 'acPhaseLossL2', label: 'AC Phase L2 Loss' },
                          { key: 'groundFault', label: 'DC Ground Fault' },
                          { key: 'dcOvervoltage', label: 'DC Overvoltage' },
                          { key: 'loadTrip', label: 'DC Load Trip' },
                          { key: 'controlFuseBlown', label: 'Control Fuse Blown' },
                          { key: 'filterCapOpen', label: 'Filter Cap C1 Open' },
                          { key: 'looseTerminal', label: 'Loose Bus Terminal' },
                          { key: 'roomFanFail', label: 'Room Cooling Fan Fail' },
                          { key: 'equalizeForgotten', label: 'Overcharge Forgotten' },
                        ].map((faultItem) => {
                          const isActive = activeFaults?.[faultItem.key as keyof ActiveFaults];
                          return (
                            <button
                              key={faultItem.key}
                              onClick={() => handleToggleFault(faultItem.key as keyof ActiveFaults)}
                              className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                isActive
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md animate-pulse'
                                  : 'bg-[#070b14] border-[#1e293b] text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span>{faultItem.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                isActive ? 'bg-rose-900 text-rose-200 border-rose-700' : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {isActive ? 'ACTIVE' : 'NORMAL'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-[#070b14] border-t border-[#1e293b] px-4 py-3 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-400">
                  ⚡ 100% Physics Simulation Engine Active • IEEE 60046 Standards
                </span>
                <button
                  onClick={() => setShowDetailedSectionModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Close Workstation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            DETAILED INTERACTIVE LEARNING WORKSTATION MODAL
            ========================================== */}
        {showDetailedLearningModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-mono">
              {/* Modal Header */}
              <div className="bg-[#070b14] border-b border-[#1e293b] px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                    🎓
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                      Interactive Learning Laboratory &amp; Physics Suite
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      IEEE / IEC Power Electronics Mathematical &amp; Conduction Model
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailedLearningModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workstation Body: Full SCRLearningLabPanel */}
              <div className="p-4 overflow-y-auto flex-1 bg-[#080d18]">
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

              {/* Modal Footer */}
              <div className="bg-[#070b14] border-t border-[#1e293b] px-4 py-3 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-400">
                  🎓 IEEE 60046 / IEC 60146-1-1 Educational Engineering Workbench
                </span>
                <button
                  onClick={() => setShowDetailedLearningModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Close Learning Workstation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
