import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DCDCControlsAndSOP } from '../components/DCDCControlsAndSOP';
import { AnimatedConverterSLD } from '../components/AnimatedConverterSLD';
import { ConverterScopeStrip } from '../components/ConverterScopeStrip';
import { DCDCRightPanel } from '../components/DCDCRightPanel';
import { DCDCSwitchgearDrawer } from '../components/DCDCSwitchgearDrawer';
import { DCDCTourOverlay } from '../components/DCDCTourOverlay';
import { DCDCScenarioAndFaultTrainer } from '../components/DCDCScenarioAndFaultTrainer';
import {
  calculateBuck,
  calculateBoost,
  calculateBuckBoost,
  calculateSEPIC,
} from '../engine/DCDCPhysics.js';
import {
  Zap,
  Play,
  Square,
  RotateCcw,
  ChevronDown,
  Sliders,
  Activity,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  GraduationCap,
  ShieldAlert,
  Battery,
  Tv,
  Radio,
  Car,
  Sun,
  Check,
  BarChart3,
  Maximize2,
  TrendingUp,
} from 'lucide-react';

export const DCDCConverterContent: React.FC = () => {
  // 1. Converter Topology & State
  const [topology, setTopology] = useState<string>('buck'); // 'buck' | 'boost' | 'buckboost' | 'sepic'
  const [Vin, setVin] = useState<number>(48); // Input Voltage (V)
  const [duty, setDuty] = useState<number>(40); // Duty Cycle % [10 - 90%]
  const [fsw, setFsw] = useState<number>(50000); // Switching Frequency (Hz)
  const [inductanceuH, setInductanceuH] = useState<number>(100); // Inductance (µH)
  const [capacitanceuF, setCapacitanceuF] = useState<number>(470); // Capacitance (µF)
  const [loadR, setLoadR] = useState<number>(10); // Load Resistance (Ω)
  const [rdsOnmOhm] = useState<number>(10); // MOSFET Rds(on) (mΩ)

  // 2. Switchgear & Breaker States
  const [q1Closed, setQ1Closed] = useState<boolean>(true);
  const [q2Closed, setQ2Closed] = useState<boolean>(true);
  const [q3Closed, setQ3Closed] = useState<boolean>(true);
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(true);

  // 3. Fault Injection States
  const [activeFault, setActiveFault] = useState<string | null>(null);

  // 4. UI Level, Learn Mode & Modal States
  const [learningLevel, setLearningLevel] = useState<string>('INTERMEDIATE');
  const [learnMode, setLearnMode] = useState<boolean>(true);
  const [isSOPDrawerOpen, setIsSOPDrawerOpen] = useState<boolean>(false);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  // 5. Layout, Panel Collapse & Mobile Navigation States
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [centerView, setCenterView] = useState<'sld' | 'scope' | 'quiz' | 'split'>('sld');
  const [mobileTab, setMobileTab] = useState<'controls' | 'sld' | 'scope' | 'results' | 'quiz'>('sld');

  // 6. Header Dropdown States
  const [openDropdown, setOpenDropdown] = useState<'topology' | 'scenarios' | 'faults' | 'more' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: 'topology' | 'scenarios' | 'faults' | 'more') => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  // Memoized Physics Calculations Engine for 60fps Performance
  const effectiveInductanceuH = activeFault === 'L_SAT' ? inductanceuH * 0.5 : inductanceuH;
  const effectiveRdsOnmOhm = activeFault === 'S1_SHORT' ? 0.001 : rdsOnmOhm;

  const physicsParams = useMemo(
    () => ({
      Vin,
      D: duty / 100,
      f: fsw,
      L: effectiveInductanceuH * 1e-6,
      C: capacitanceuF * 1e-6,
      R: loadR,
      Rds: effectiveRdsOnmOhm / 1000,
    }),
    [Vin, duty, fsw, effectiveInductanceuH, capacitanceuF, loadR, effectiveRdsOnmOhm]
  );

  const rawResults = useMemo(() => {
    if (topology === 'boost') return calculateBoost(physicsParams);
    if (topology === 'buckboost') return calculateBuckBoost(physicsParams);
    if (topology === 'sepic') return calculateSEPIC(physicsParams);
    return calculateBuck(physicsParams);
  }, [topology, physicsParams]);

  // Fault Effects on Physics
  let isInputPowered = isEngineRunning && q1Closed && activeFault !== 'S1_OPEN' && activeFault !== 'S1_SHORT';
  let isOutputConnected = q2Closed && q3Closed && activeFault !== 'DIODE_OPEN';

  if (activeFault === 'S1_SHORT') {
    isInputPowered = false;
  }

  const Vout = isInputPowered ? (activeFault === 'DIODE_OPEN' ? rawResults.Vout * 1.8 : rawResults.Vout) : 0;
  const Vout_abs = Math.abs(Vout);
  const Iout = isInputPowered && isOutputConnected ? Vout_abs / loadR : 0;
  const deltaIL = isInputPowered ? (activeFault === 'L_SAT' ? rawResults.deltaIL * 2.5 : rawResults.deltaIL) : 0;
  const Iout_crit = rawResults.Iout_crit;
  const mode = !isInputPowered ? 'OFF' : activeFault === 'DIODE_OPEN' ? 'FORCED DCM' : rawResults.mode;
  const deltaVout = isInputPowered ? (activeFault === 'C_ESR_HIGH' ? rawResults.deltaVout * 3.0 : rawResults.deltaVout) : 0;
  const Pout = isInputPowered && isOutputConnected ? Vout_abs * Iout : 0;
  const Ploss = isInputPowered ? rawResults.Ploss : 0;
  const etaPct = isInputPowered && isOutputConnected && (Pout + Ploss) > 0 ? (Pout / (Pout + Ploss)) * 100 : 0;

  // Engine Action Handlers
  const handleStartEngine = () => {
    setIsEngineRunning(true);
    setQ1Closed(true);
    setQ2Closed(true);
    setQ3Closed(true);
    setActiveFault(null);
  };

  const handleStopEngine = () => {
    setIsEngineRunning(false);
  };

  const handleResetAll = () => {
    setIsEngineRunning(true);
    setQ1Closed(true);
    setQ2Closed(true);
    setQ3Closed(true);
    setVin(48);
    setDuty(40);
    setFsw(50000);
    setInductanceuH(100);
    setCapacitanceuF(470);
    setLoadR(10);
    setActiveFault(null);
  };

  // 5 Preset Scenarios Definition
  const SCENARIOS = [
    {
      id: 'battery-charger',
      name: 'Station Battery Charger',
      tag: 'IEEE 946',
      icon: <Battery className="w-3.5 h-3.5 text-emerald-400" />,
      topology: 'buck',
      Vin: 110,
      duty: 48,
      fsw: 50000,
      inductanceuH: 250,
      capacitanceuF: 1000,
      loadR: 8,
      desc: '48V station battery float (54V) & equalize (58V)',
    },
    {
      id: 'ups-dc-bus',
      name: 'UPS DC Bus Ride-Through',
      tag: 'IEC 62040-3',
      icon: <Tv className="w-3.5 h-3.5 text-cyan-400" />,
      topology: 'buck',
      Vin: 48,
      duty: 40,
      fsw: 100000,
      inductanceuH: 180,
      capacitanceuF: 1500,
      loadR: 10,
      desc: 'Holdup capacitor keeps Vout strictly within ±1%',
    },
    {
      id: 'telecom-power',
      name: 'Telecom 48V → 12V High Power',
      tag: '80A High Power',
      icon: <Radio className="w-3.5 h-3.5 text-purple-400" />,
      topology: 'buck',
      Vin: 48,
      duty: 25,
      fsw: 150000,
      inductanceuH: 50,
      capacitanceuF: 2000,
      loadR: 2,
      desc: 'High-density step-down for 5G equipment (η > 95%)',
    },
    {
      id: 'ev-auxiliary',
      name: 'EV Aux 400V → 12V Step-Down',
      tag: 'ISO 26262',
      icon: <Car className="w-3.5 h-3.5 text-rose-400" />,
      topology: 'buck',
      Vin: 400,
      duty: 3,
      fsw: 200000,
      inductanceuH: 500,
      capacitanceuF: 470,
      loadR: 50,
      desc: '400V traction battery down to 12V (Low duty D=3%)',
    },
    {
      id: 'pv-boost',
      name: 'PV Solar Boost MPPT',
      tag: 'IEC 61727',
      icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
      topology: 'boost',
      Vin: 48,
      duty: 60,
      fsw: 60000,
      inductanceuH: 300,
      capacitanceuF: 800,
      loadR: 15,
      desc: 'Boost topology stepping 48V solar array up to 120V',
    },
  ];

  // 5 Fault Definitions
  const FAULTS = [
    { id: 'S1_OPEN', name: 'S1 MOSFET Open Circuit', desc: 'Vout=0V, IL=0A, Gate Signal Inhibited' },
    { id: 'S1_SHORT', name: 'S1 MOSFET Short Circuit', desc: 'Direct Vin pass-through, Fuse Blown 100A' },
    { id: 'DIODE_OPEN', name: 'Freewheel Diode Open', desc: 'Overvoltage Spike > 1.8x, Forced DCM' },
    { id: 'L_SAT', name: 'Inductor Core Saturation', desc: 'Inductance drops 50%, ΔIL spikes 2.5x' },
    { id: 'C_ESR_HIGH', name: 'High Capacitor ESR (200mΩ)', desc: 'Output ripple ΔVout increases 3x' },
  ];

  const handleApplyScenario = (sc: (typeof SCENARIOS)[0]) => {
    setTopology(sc.topology);
    setVin(sc.Vin);
    setDuty(sc.duty);
    setFsw(sc.fsw);
    setInductanceuH(sc.inductanceuH);
    setCapacitanceuF(sc.capacitanceuF);
    setLoadR(sc.loadR);
    setActiveFault(null);
    setOpenDropdown(null);
  };

  return (
    <div className="w-full h-full max-h-full bg-[#07090e] text-slate-100 font-sans select-none overflow-hidden flex flex-col">
      {/* ========================================================================= */}
      {/* 1. COMPACT ETAP/MATLAB-GRADE TOP SUB-NAVIGATION & TELEMETRY BAR */}
      {/* ========================================================================= */}
      <header className="w-full h-12 px-3 bg-[#0b0f19] border-b border-[#1e293b] flex items-center justify-between gap-3 shrink-0 font-mono text-xs z-30 shadow-md">
        {/* Left: TOPOLOGY SEGMENTED PILLS + SCENARIOS & FAULTS */}
        <div className="flex items-center gap-1.5" ref={dropdownRef}>
          {/* Topology Quick Pills */}
          <div className="flex items-center gap-1 bg-[#070b14] border border-[#1e293b] p-0.5 rounded-xl">
            {[
              { id: 'buck', label: '⚡ Buck' },
              { id: 'boost', label: '🔋 Boost' },
              { id: 'buckboost', label: '⚡ Buck-Boost' },
              { id: 'sepic', label: '🔀 SEPIC' },
            ].map((top) => (
              <button
                key={top.id}
                type="button"
                onClick={() => setTopology(top.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  topology === top.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {top.label}
              </button>
            ))}
          </div>

          {/* Scenarios Dropdown */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => toggleDropdown('scenarios')}
              className="h-8 px-2.5 bg-[#0f172a] hover:bg-[#1e293b] text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scenarios</span>
              <ChevronDown className="w-3 h-3 text-emerald-400" />
            </button>

            {openDropdown === 'scenarios' && (
              <div className="absolute top-full left-0 mt-1.5 w-68 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1.5 font-mono text-xs flex flex-col gap-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  PRESET INDUSTRY CONVERTER SCENARIOS
                </div>
                {SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleApplyScenario(sc)}
                    className="w-full p-2 rounded-lg text-left hover:bg-slate-800 transition-colors flex flex-col gap-0.5 cursor-pointer min-h-[44px]"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-200 text-xs">
                      <span className="flex items-center gap-1.5">{sc.icon} {sc.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">{sc.tag}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans leading-tight">{sc.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Faults Dropdown */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => toggleDropdown('faults')}
              className={`h-8 px-2.5 font-bold text-xs rounded-xl border flex items-center gap-1.5 cursor-pointer shadow-sm ${
                activeFault
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  : 'bg-[#0f172a] hover:bg-[#1e293b] text-rose-400 border-rose-500/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{activeFault ? 'FAULT ACTIVE' : 'Faults'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {openDropdown === 'faults' && (
              <div className="absolute top-full left-0 mt-1.5 w-68 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1.5 font-mono text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <span>FAULT INJECTION LAB</span>
                  {activeFault && (
                    <button
                      type="button"
                      onClick={() => setActiveFault(null)}
                      className="text-rose-400 hover:text-white underline cursor-pointer text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {FAULTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveFault(f.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full p-2 rounded-lg text-left transition-colors flex flex-col gap-0.5 cursor-pointer min-h-[44px] ${
                      activeFault === f.id ? 'bg-rose-950/80 border border-rose-600 text-rose-200' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{f.name}</span>
                      {activeFault === f.id && <span className="text-[9px] px-1.5 bg-rose-600 text-white rounded">ACTIVE</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans leading-tight">{f.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: PRIMARY ACTIONS (START / STOP / RESET) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleStartEngine}
            className={`h-8 px-3 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
              isEngineRunning
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'bg-emerald-950/50 hover:bg-emerald-800 text-emerald-300 border-emerald-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START</span>
          </button>

          <button
            type="button"
            onClick={handleStopEngine}
            className={`h-8 px-3 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
              !isEngineRunning
                ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                : 'bg-rose-950/50 hover:bg-rose-800 text-rose-300 border-rose-700'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="h-8 px-2.5 text-xs font-bold bg-[#141d2b] hover:bg-slate-700 text-amber-300 rounded-xl border border-amber-500/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Reset parameters &amp; faults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>

        {/* Right: REAL-TIME QUICK TELEMETRY PILLS */}
        <div className="flex items-center gap-2 font-mono">
          <div className="hidden lg:flex items-center gap-1.5 text-xs bg-[#070b14] px-3 py-1.5 rounded-xl border border-[#1e293b]">
            <span className="text-slate-400 font-bold">DC BUS: <strong className="text-emerald-400 font-black">{(Vout_abs ?? 0).toFixed(1)}V</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-bold">LOAD: <strong className="text-cyan-300 font-black">{(Iout ?? 0).toFixed(1)}A</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-bold">η: <strong className="text-amber-400 font-black">{(etaPct ?? 0).toFixed(0)}%</strong></span>
          </div>

          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-xl border uppercase shadow-sm ${
              activeFault
                ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                : isEngineRunning
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {activeFault ? 'FAULT' : isEngineRunning ? `${mode} (${Vout_abs.toFixed(0)}V)` : 'STOPPED'}
          </span>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. THREE-COLUMN WORKBENCH (100% LAPTOP SCREEN OPTIMIZATION WITH NO SCROLL) */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full min-h-0 overflow-hidden flex gap-2 p-2 relative bg-[#040812]">
        {/* LEFT COLUMN: CONTROLS & TELEMETRY */}
        <aside
          className={`h-full flex flex-col transition-all duration-200 ${
            leftCollapsed ? 'w-10 shrink-0' : 'w-[320px] xl:w-[350px] shrink-0'
          }`}
        >
          {leftCollapsed ? (
            <div className="h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl flex flex-col items-center py-3 gap-3">
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Expand Controls"
              >
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
              <div className="[writing-mode:vertical-lr] text-xs font-mono font-bold text-slate-400 tracking-wider">
                CONTROLS &amp; TELEMETRY
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 flex flex-col gap-2 overflow-y-auto custom-scrollbar shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5 shrink-0">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Controls &amp; Telemetry
                </span>
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Collapse Controls Panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <DCDCControlsAndSOP
                topology={topology}
                Vin={Vin}
                setVin={setVin}
                duty={duty}
                setDuty={setDuty}
                fsw={fsw}
                setFsw={setFsw}
                inductanceuH={inductanceuH}
                setInductanceuH={setInductanceuH}
                capacitanceuF={capacitanceuF}
                setCapacitanceuF={setCapacitanceuF}
                loadR={loadR}
                setLoadR={setLoadR}
                q1Closed={q1Closed}
                setQ1Closed={setQ1Closed}
                q2Closed={q2Closed}
                setQ2Closed={setQ2Closed}
                q3Closed={q3Closed}
                setQ3Closed={setQ3Closed}
                isEngineRunning={isEngineRunning}
                activeFault={activeFault}
                setActiveFault={setActiveFault}
                mode={mode}
                deltaIL={deltaIL}
                deltaVout={deltaVout}
                Vout={Vout}
                Iout={Iout}
                Pout={Pout}
                etaPct={etaPct}
                onOpenSOPDrawer={() => setIsSOPDrawerOpen(true)}
                learnMode={learnMode}
              />
            </div>
          )}
        </aside>

        {/* CENTER COLUMN: SLD SCHEMATIC WORKBENCH */}
        <section className="flex-1 h-full min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Center Pane Top Control & View Bar */}
          <div className="w-full h-10 px-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl flex items-center justify-between gap-2 shrink-0 font-mono text-xs shadow-lg">
            {/* Left: Breaker Status Pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-wider hidden sm:inline">
                SLD SCHEMATIC WORKBENCH
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-extrabold ${q1Closed ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : 'bg-rose-950 text-rose-400 border-rose-700'}`}>
                  52-Q1: {q1Closed ? 'ON' : 'OFF'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-extrabold ${q2Closed ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : 'bg-rose-950 text-rose-400 border-rose-700'}`}>
                  52-Q2: {q2Closed ? 'ON' : 'OFF'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-extrabold ${q3Closed ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : 'bg-rose-950 text-rose-400 border-rose-700'}`}>
                  89-Q3: {q3Closed ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* Right: LEARN THIS CIRCUIT + WAVEFORMS / SCOPE + FULL SCREEN */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLearnMode(!learnMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                  learnMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'bg-[#0f172a] text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>LEARN THIS CONVERTER</span>
              </button>

              <button
                type="button"
                onClick={() => setCenterView(centerView === 'sld' ? 'scope' : 'sld')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                  centerView === 'scope'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-[#0f172a] text-cyan-300 border-cyan-500/50 hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{centerView === 'scope' ? 'Schematic' : 'Waveforms'}</span>
              </button>
            </div>
          </div>

          {/* Main Visual Display Area */}
          <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden relative">
            {centerView === 'sld' && (
              <AnimatedConverterSLD
                topology={topology}
                Vin={Vin}
                duty={duty}
                fsw={fsw}
                inductanceuH={effectiveInductanceuH}
                capacitanceuF={capacitanceuF}
                loadR={loadR}
                q1Closed={q1Closed}
                q2Closed={q2Closed}
                q3Closed={q3Closed}
                isEngineRunning={isEngineRunning}
                mode={mode}
                activeFault={activeFault}
                Vout={Vout}
                Iout={Iout}
                deltaIL={deltaIL}
                deltaVout={deltaVout}
                Pout={Pout}
                Ploss={Ploss}
                etaPct={etaPct}
                onToggleQ1={() => setQ1Closed(!q1Closed)}
                onToggleQ2={() => setQ2Closed(!q2Closed)}
                onToggleQ3={() => setQ3Closed(!q3Closed)}
                onDutyChange={setDuty}
                onLoadRChange={setLoadR}
              />
            )}

            {centerView === 'scope' && (
              <div className="w-full h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 flex flex-col shadow-2xl">
                <ConverterScopeStrip
                  Vin={Vin}
                  Vout={Vout}
                  duty={duty}
                  fsw={fsw}
                  deltaIL={deltaIL}
                  deltaVout={deltaVout}
                  isEngineRunning={isEngineRunning}
                  mode={mode}
                  topology={topology}
                />
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: LEARNING & ANALYTICS */}
        <aside
          className={`h-full flex flex-col transition-all duration-200 ${
            rightCollapsed ? 'w-10 shrink-0' : 'w-[320px] xl:w-[350px] shrink-0'
          }`}
        >
          {rightCollapsed ? (
            <div className="h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl flex flex-col items-center py-3 gap-3">
              <button
                type="button"
                onClick={() => setRightCollapsed(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Expand Learning & Analytics"
              >
                <ChevronLeft className="w-4 h-4 text-amber-400" />
              </button>
              <div className="[writing-mode:vertical-lr] text-xs font-mono font-bold text-slate-400 tracking-wider">
                LEARNING &amp; ANALYTICS
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 flex flex-col gap-2 overflow-y-auto custom-scrollbar shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5 shrink-0">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Learning &amp; Analytics
                </span>
                <button
                  type="button"
                  onClick={() => setRightCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Collapse Learning Panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <DCDCRightPanel
                topology={topology}
                Vin={Vin}
                duty={duty}
                fsw={fsw}
                inductanceuH={inductanceuH}
                capacitanceuF={capacitanceuF}
                loadR={loadR}
                q1Closed={q1Closed}
                q2Closed={q2Closed}
                q3Closed={q3Closed}
                isEngineRunning={isEngineRunning}
                mode={mode}
                activeFault={activeFault}
                setActiveFault={setActiveFault}
                Vout={Vout}
                Iout={Iout}
                deltaIL={deltaIL}
                deltaVout={deltaVout}
                Pout={Pout}
                Ploss={Ploss}
                etaPct={etaPct}
                Iout_crit={Iout_crit}
                onOpenTour={() => setIsTourActive(true)}
              />
            </div>
          )}
        </aside>
      </main>

      {/* ========================================================================= */}
      {/* 3. MODAL DRAWERS & OVERLAYS */}
      {/* ========================================================================= */}
      {isSOPDrawerOpen && (
        <DCDCSwitchgearDrawer
          isOpen={isSOPDrawerOpen}
          onClose={() => setIsSOPDrawerOpen(false)}
          q1Closed={q1Closed}
          setQ1Closed={setQ1Closed}
          q2Closed={q2Closed}
          setQ2Closed={setQ2Closed}
          q3Closed={q3Closed}
          setQ3Closed={setQ3Closed}
          isEngineRunning={isEngineRunning}
          onStartEngine={handleStartEngine}
          onStopEngine={handleStopEngine}
        />
      )}

      {isTourActive && (
        <DCDCTourOverlay
          isOpen={isTourActive}
          onClose={() => setIsTourActive(false)}
          topology={topology}
          Vin={Vin}
          Vout={Vout_abs}
          Iout={Iout}
          duty={duty}
          fsw={fsw}
          mode={mode}
          etaPct={etaPct}
        />
      )}
    </div>
  );
};

export const DCDCConverter = DCDCConverterContent;
export default DCDCConverter;
