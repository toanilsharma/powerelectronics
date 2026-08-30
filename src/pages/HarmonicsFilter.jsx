import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  ShieldCheck,
  Activity,
  Sliders,
  Cpu,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
  GraduationCap,
  Waves,
  BarChart3,
  Box,
  Thermometer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PowerQualityEngine } from '../utils/PowerQualityEngine';
import { loadWaveformFromBus, subscribeWaveformBus } from '../utils/waveformBus';
import { OscilloscopeCRTCanvas } from '../components/OscilloscopeCRTCanvas';
import { HarmonicsFFTMotionChart } from '../components/HarmonicsFFTMotionChart';
import { Phasor3DDiagram } from '../components/Phasor3DDiagram';
import {
  PowerQualityProvider,
  usePowerQuality,
  PREDEFINED_SCENARIOS,
} from '../context/PowerQualityContext';
import { GuidedTourOverlay } from '../components/GuidedTourOverlay';
import {
  calculateCapacitance,
  calculateFilterImpedance,
  calculateGridImpedance,
  calculatePostFilterHarmonics,
  calculateTHD_TDD,
  calculateKFactorPost,
  calculateFilterCurrent,
} from '../engine/LCFilterPhysics';
import { CommonFooter } from '../components/CommonFooter';

/**
 * HarmonicsFilter.jsx - Harmonics & Power Quality Lab Page
 */
const HarmonicsFilterContent = () => {
  const {
    selectedLoadType,
    setSelectedLoadType,
    fundamentalAmp,
    setFundamentalAmp,
    maxDemandIl,
    setMaxDemandIl,
    shortCircuitIsc,
    setShortCircuitIsc,
    frequencyHz,
    setFrequencyHz,
    apfEnabled,
    setApfEnabled,
    apfEfficiency,
    setApfEfficiency,
    passiveFilterEnabled,
    setPassiveFilterEnabled,
    passiveTunedFreq,
    setPassiveTunedFreq,
    loadScenarioPreset,
    activeScenarioId,
    startTour,
    loadSpectrum,
    activeCompliance,
    isCompliant,
    kFactor,
  } = usePowerQuality();

  const [centerTab, setCenterTab] = useState('fft');
  const [showAllAudit, setShowAllAudit] = useState(false);
  const [isEnginePaused, setIsEnginePaused] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Source to LC Filter Tuning Mapping Config
  const tuningMap = {
    '6-Pulse SCR': { label: '6-Pulse SCR', defaultHarmonic: 5, allowed: [5, 7, 11, 13], defaultL: 1.8, defaultC: 225 },
    '6-Pulse': { label: '6-Pulse SCR', defaultHarmonic: 5, allowed: [5, 7, 11, 13], defaultL: 1.8, defaultC: 225 },
    '12-Pulse Xfmr': { label: '12-Pulse Xfmr', defaultHarmonic: 11, allowed: [11, 13, 23, 25], defaultL: 2.2, defaultC: 38 },
    '12-Pulse': { label: '12-Pulse Xfmr', defaultHarmonic: 11, allowed: [11, 13, 23, 25], defaultL: 2.2, defaultC: 38 },
    'VFD Drive': { label: 'VFD Drive', defaultHarmonic: 5, allowed: [5, 7, 11, 13], defaultL: 1.5, defaultC: 270 },
    'VFD': { label: 'VFD Drive', defaultHarmonic: 5, allowed: [5, 7, 11, 13], defaultL: 1.5, defaultC: 270 },
    'SMPS Load': { label: 'SMPS Load', defaultHarmonic: 3, allowed: [3, 5, 7], defaultL: 3.8, defaultC: 308 },
    'SMPS': { label: 'SMPS Load', defaultHarmonic: 3, allowed: [3, 5, 7], defaultL: 3.8, defaultC: 308 },
  };

  const currentTuningCfg = tuningMap[selectedLoadType] || tuningMap['SMPS'];

  // LC Trap Filter View Mode: 'split' | 'pre' | 'post'
  const [lcViewMode, setLcViewMode] = useState('split');

  // Alias for lcEnabled
  const lcEnabled = passiveFilterEnabled;
  const setLcEnabled = setPassiveFilterEnabled;

  // Editable LC Trap Filter State
  const [tunedHarmonic, setTunedHarmonic] = useState(3);
  const [inductanceLmH, setInductanceLmH] = useState(2.0);
  const [qFactor, setQFactor] = useState(30);

  const f0 = tunedHarmonic * 50 * 0.98;

  const [capacitanceuF, setCapacitanceuF] = useState(() => {
    const cFarads = calculateCapacitance(2.0, 147, 3);
    return Math.round(cFarads * 1e6);
  });

  // Source Selector Change Handler
  const handleSourceSelect = (newSource) => {
    setSelectedLoadType(newSource);
    const cfg = tuningMap[newSource] || tuningMap['SMPS'];
    setTunedHarmonic(cfg.defaultHarmonic);
    setInductanceLmH(cfg.defaultL);
    setCapacitanceuF(cfg.defaultC);
  };

  // Sync tuned harmonic when source changes
  useEffect(() => {
    const cfg = tuningMap[selectedLoadType] || tuningMap['SMPS'];
    if (cfg && !cfg.allowed.includes(tunedHarmonic)) {
      setTunedHarmonic(cfg.defaultHarmonic);
      setInductanceLmH(cfg.defaultL);
      setCapacitanceuF(cfg.defaultC);
    }
  }, [selectedLoadType]);

  const handleLChange = (newL) => {
    const validL = Math.max(0.1, newL);
    setInductanceLmH(validL);
    const cFarads = calculateCapacitance(validL, f0, tunedHarmonic);
    setCapacitanceuF(Math.round(cFarads * 1e6));
  };

  const handleHarmonicChange = (newH) => {
    setTunedHarmonic(newH);
    const newF0 = newH * 50 * 0.98;
    const cFarads = calculateCapacitance(inductanceLmH, newF0, newH);
    setCapacitanceuF(Math.round(cFarads * 1e6));
  };

  const handleCChange = (newC) => {
    const validC = Math.max(1, newC);
    setCapacitanceuF(validC);
    const cFarads = validC / 1e6;
    const w0 = 2 * Math.PI * f0;
    const L_henries = 1 / (w0 * w0 * cFarads);
    const L_mH = parseFloat((L_henries * 1000).toFixed(2));
    setInductanceLmH(L_mH);
  };

  // Filter Topology Mode: 'Passive Only' | 'APF Only' | 'Hybrid'
  const [filterTopologyMode, setFilterTopologyMode] = useState('Hybrid');

  const handleFilterTopologyChange = (mode) => {
    setFilterTopologyMode(mode);
    if (mode === 'Passive Only') {
      setApfEnabled(false);
      setPassiveFilterEnabled(true);
    } else if (mode === 'APF Only') {
      setApfEnabled(true);
      setPassiveFilterEnabled(false);
    } else if (mode === 'Hybrid') {
      setApfEnabled(true);
      setPassiveFilterEnabled(true);
    }
  };

  // Live LC Filter Physics Solver
  const Zs = calculateGridImpedance(415, shortCircuitIsc);
  const Zf_array = loadSpectrum.map((item) =>
    calculateFilterImpedance(item.order, inductanceLmH, capacitanceuF / 1e6, qFactor, f0)
  );

  // Step 1: Passive LC Trap Filter effect
  const lcSpectrum = passiveFilterEnabled
    ? calculatePostFilterHarmonics(
        loadSpectrum,
        Zf_array,
        Zs,
        inductanceLmH,
        capacitanceuF / 1e6,
        qFactor,
        f0
      )
    : loadSpectrum;

  // Step 2: Active Power Filter (APF) Cancellation effect
  const postSpectrum = apfEnabled
    ? lcSpectrum.map((item) =>
        item.order === 1
          ? item
          : { ...item, magnitude: item.magnitude * (1 - Math.min(0.95, apfEfficiency / 100)) }
      )
    : lcSpectrum;

  const preTddThd = calculateTHD_TDD(loadSpectrum, fundamentalAmp, maxDemandIl);
  const lcTddThd = calculateTHD_TDD(lcSpectrum, fundamentalAmp, maxDemandIl);
  const postTddThd = calculateTHD_TDD(postSpectrum, fundamentalAmp, maxDemandIl);

  const preThdVal = preTddThd.thdPercent || 1;
  const lcReductPct = Math.max(0, Math.round(((preThdVal - lcTddThd.thdPercent) / preThdVal) * 100));
  const totalReductPct = Math.max(0, Math.round(((preThdVal - postTddThd.thdPercent) / preThdVal) * 100));

  const preK = calculateKFactorPost(loadSpectrum);
  const postK = calculateKFactorPost(postSpectrum);
  const activeK = passiveFilterEnabled || apfEnabled ? postK : preK;
  const activeKRating = PowerQualityEngine.getRecommendedKRating(activeK);

  const postCompliance = PowerQualityEngine.checkIEEE519Compliance(
    shortCircuitIsc * 1000,
    maxDemandIl,
    postSpectrum,
    fundamentalAmp
  );

  const preDerated = Math.max(30, Math.min(100, (1 / Math.sqrt(1 + (preK - 1) * 0.12)) * 100));
  const postDerated = Math.max(30, Math.min(100, (1 / Math.sqrt(1 + (postK - 1) * 0.12)) * 100));

  const filterCurrentInfo = calculateFilterCurrent(
    tunedHarmonic,
    loadSpectrum,
    inductanceLmH,
    capacitanceuF,
    qFactor,
    f0,
    shortCircuitIsc,
    415
  );
  const filterCurrentDisplayText = filterCurrentInfo.displayText;

  const [importedWaveform, setImportedWaveform] = useState(() => loadWaveformFromBus());

  useEffect(() => {
    const initial = loadWaveformFromBus();
    if (initial) {
      setImportedWaveform(initial);
    }

    const unsubscribe = subscribeWaveformBus((payload) => {
      setImportedWaveform(payload);
    });

    return () => unsubscribe();
  }, []);

  const currentTdd = activeCompliance.tddPercent;
  const tddLimit = activeCompliance.tddLimitPercent;
  const kRating = PowerQualityEngine.getRecommendedKRating(kFactor);
  const deratedCapacityPct = Math.max(30, Math.min(100, (1 / Math.sqrt(1 + (kFactor - 1) * 0.12)) * 100));

  const displayedAuditRows = showAllAudit
    ? activeCompliance.details
    : activeCompliance.details
        .slice()
        .sort((a, b) => b.magnitude - a.magnitude)
        .slice(0, 5);

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col justify-between overflow-x-hidden font-sans">
      <div
        className="w-full grid grid-cols-1 md:grid-cols-[300px_1fr_340px] grid-rows-none md:grid-rows-[60px_1fr_45px] h-auto md:h-screen overflow-y-auto md:overflow-hidden gap-3 p-3 select-none relative box-border"
      >
        {/* Guided Tour Overlay */}
        <GuidedTourOverlay />

      {/* ========================================================================= */}
      {/* ROW 1: HEADER (60px) - STICKY TOP, Z-INDEX 10, PADDING 0 16px */}
      {/* ========================================================================= */}
      <header
        style={{
          gridRow: '1 / 2',
          gridColumn: '1 / -1',
          height: '60px',
          minHeight: '60px',
          maxHeight: '60px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          boxSizing: 'border-box',
        }}
        className="font-mono"
      >
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-lg text-[#06b6d4]">
            <Zap className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs md:text-sm font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
              <span>POWER QUALITY &amp; HARMONICS ENGINE</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#06b6d4]/20 border border-[#06b6d4]/40 text-[#06b6d4]">
                IEEE 519-2022
              </span>
            </h1>
          </div>
        </div>

        {/* Center: Metrics Badges */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <div className="bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-lg text-center">
            <div className="text-[9px] text-[#94a3b8]">LOAD THD</div>
            <div className="text-xs font-bold text-[#06b6d4]">{activeCompliance.thdPercent.toFixed(1)}%</div>
          </div>
          <div className="bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-lg text-center">
            <div className="text-[9px] text-[#94a3b8]">Isc / IL</div>
            <div className="text-xs font-bold text-purple-400">{activeCompliance.ratioIscIl.toFixed(1)}</div>
          </div>
          <div className="bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-lg text-center">
            <div className="text-[9px] text-[#94a3b8]">K-FACTOR</div>
            <div className="text-xs font-bold text-amber-400">{activeK.toFixed(2)} ({activeKRating})</div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border text-center font-bold text-xs flex items-center gap-1 ${
            isCompliant ? 'bg-[#10b981]/15 border-[#10b981]/50 text-[#10b981]' : 'bg-[#ef4444]/15 border-[#ef4444]/50 text-[#ef4444]'
          }`}>
            {isCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>COMPLIANCE {isCompliant ? 'PASS' : 'FAIL'}</span>
          </div>
          <div className="bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-lg text-center">
            <div className="text-[9px] text-[#94a3b8]">TDD / LIMIT</div>
            <div className={`text-xs font-bold ${isCompliant ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentTdd.toFixed(1)}% / {tddLimit}%
            </div>
          </div>
        </div>

        {/* Right Header Buttons: Overview, Pause Engine, Learning Tour */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            style={{
              minHeight: '40px',
              padding: '10px 16px',
              marginRight: '12px',
              boxSizing: 'border-box',
            }}
            className="rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            ← Overview
          </button>

          <button
            type="button"
            onClick={() => setIsEnginePaused(!isEnginePaused)}
            style={{
              minHeight: '40px',
              padding: '10px 16px',
              marginRight: '12px',
              boxSizing: 'border-box',
            }}
            className="rounded-lg border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {isEnginePaused ? '▶ Resume Engine' : '❚❚ Pause Engine'}
          </button>

          <button
            type="button"
            onClick={startTour}
            style={{
              minHeight: '40px',
              padding: '10px 16px',
              marginRight: '12px',
              boxSizing: 'border-box',
            }}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Learning Tour</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ROW 2: MAIN 3 COLUMNS ROW (1fr = calc(100vh - 105px)) */}
      {/* ========================================================================= */}
      <div
        className="main-grid-3col"
        style={{
          gridRow: '2 / 3',
          gridColumn: '1 / -1',
          display: 'grid',
          gridTemplateColumns: '300px 1fr 340px',
          height: 'calc(100vh - 105px)',
          gap: '12px',
          padding: '12px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* COLUMN 1: LEFT (300px) - THE CAUSE */}
        <section
          style={{ width: '300px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}
          className="left-panel bg-[#1e293b] border border-[#334155] rounded-xl p-3 shadow-xl flex flex-col justify-start gap-3 scrollbar-thin font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#334155] pb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#0ea5e9]" />
              <h2 className="font-bold text-xs text-white uppercase tracking-wide">
                THE CAUSE: SOURCE DYNAMICS
              </h2>
            </div>
          </div>

          {/* 1. Source Selector (2x2 Grid, min-height 44px, font 13px, weight 600, border 1px solid #334155, active bg #0ea5e9) */}
          <div className="space-y-1.5 shrink-0">
            <label className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
              Harmonic Source Selector
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '6-Pulse', label: '6-Pulse SCR' },
                { id: '12-Pulse', label: '12-Pulse Xfmr' },
                { id: 'VFD', label: 'VFD Drive' },
                { id: 'SMPS', label: 'SMPS Load' },
              ].map((btn) => {
                const isActive = selectedLoadType === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleSourceSelect(btn.id)}
                    style={{
                      minHeight: '44px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid #334155',
                      boxSizing: 'border-box',
                    }}
                    className={`px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                      isActive
                        ? 'bg-[#0ea5e9] text-white shadow-md border-[#0ea5e9]'
                        : 'bg-[#0f172a] text-[#94a3b8] hover:text-white hover:border-[#64748b]'
                    }`}
                  >
                    <span className="text-amber-400">⚡</span>
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Sliders (Fundamental I1 0-500A, Max Demand IL 100-1000A, Grid Fault Isc 5-100kA) */}
          <div className="space-y-3 pt-1 shrink-0">
            {/* Fundamental Current I1 */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#94a3b8] font-semibold">Fundamental I1:</span>
                <span className="text-[#0ea5e9] font-bold text-sm">{fundamentalAmp} A</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="5"
                value={fundamentalAmp}
                onChange={(e) => setFundamentalAmp(Number(e.target.value))}
                style={{ height: '6px' }}
                className="w-full bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#0ea5e9] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0ea5e9]"
              />
            </div>

            {/* Max Demand Load Current IL */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#94a3b8] font-semibold">Max Demand IL:</span>
                <span className="text-[#0ea5e9] font-bold text-sm">{maxDemandIl} A</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="10"
                value={maxDemandIl}
                onChange={(e) => setMaxDemandIl(Number(e.target.value))}
                style={{ height: '6px' }}
                className="w-full bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#0ea5e9] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0ea5e9]"
              />
            </div>

            {/* Grid Fault Current Isc */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#94a3b8] font-semibold">Grid Fault Isc:</span>
                <span className="text-[#0ea5e9] font-bold text-sm">{shortCircuitIsc} kA</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={shortCircuitIsc}
                onChange={(e) => setShortCircuitIsc(Number(e.target.value))}
                style={{ height: '6px' }}
                className="w-full bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#0ea5e9] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0ea5e9]"
              />
            </div>

            {/* Grid Frequency Toggle */}
            <div className="flex items-center justify-between p-2 bg-[#0f172a] border border-[#334155] rounded-lg text-xs font-mono">
              <span className="text-[#94a3b8] font-semibold">Frequency</span>
              <div className="flex items-center bg-[#1e293b] p-0.5 rounded border border-[#334155]">
                <button
                  type="button"
                  onClick={() => setFrequencyHz(50)}
                  className={`px-2.5 py-1 text-xs rounded font-bold transition-all cursor-pointer ${
                    frequencyHz === 50 ? 'bg-[#0ea5e9] text-white' : 'text-[#94a3b8]'
                  }`}
                >
                  50 Hz
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyHz(60)}
                  className={`px-2.5 py-1 text-xs rounded font-bold transition-all cursor-pointer ${
                    frequencyHz === 60 ? 'bg-[#0ea5e9] text-white' : 'text-[#94a3b8]'
                  }`}
                >
                  60 Hz
                </button>
              </div>
            </div>
          </div>

          {/* 4. Calculated Badges below Sliders */}
          <div className="flex items-center justify-between gap-2 shrink-0 font-mono">
            <div className="flex-1 py-1.5 px-2 bg-[#0f172a] border border-[#334155] rounded-full text-center text-xs font-semibold text-cyan-300">
              Isc/IL: {activeCompliance.ratioIscIl.toFixed(1)}
            </div>
            <div className="flex-1 py-1.5 px-2 bg-[#0f172a] border border-[#334155] rounded-full text-center text-xs font-semibold text-emerald-300">
              TDD Limit: {activeCompliance.tddLimitPercent}%
            </div>
          </div>

          {/* 3. One-Click Presets directly under Frequency & Calculated Badges */}
          <div className="space-y-1.5 shrink-0 pt-1 border-t border-[#334155]">
            <label className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#0ea5e9]" /> One-Click Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
              {PREDEFINED_SCENARIOS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadScenarioPreset(preset.id)}
                  className={`p-2 rounded-lg border text-left truncate transition-all cursor-pointer ${
                    activeScenarioId === preset.id
                      ? 'bg-[#0ea5e9]/20 border-[#0ea5e9] text-white font-bold'
                      : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#64748b]'
                  }`}
                >
                  {preset.icon} {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Info Note */}
          <div className="p-2.5 bg-[#0f172a]/90 border border-[#334155] rounded-lg text-xs text-[#94a3b8] space-y-1 shrink-0">
            <div className="font-bold text-white flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#0ea5e9]" /> Harmonic Physics Note
            </div>
            <p className="leading-tight text-[11px]">
              6-Pulse: 5th, 7th, 11th, 13th... 12-Pulse cancels 5th &amp; 7th via 30° transformer phase shift.
            </p>
          </div>
        </section>

        {/* COLUMN 2: CENTER (1fr) - WAVEFORM 100% WIDTH, NO SCROLL */}
        <main
          style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}
          className="center-panel flex flex-col gap-2 overflow-hidden min-h-[250px]"
        >
          {lcEnabled ? (
            /* LC FILTER ACTIVE VIEW (WITH MODE SELECTOR: PRE | POST | SPLIT) */
            <div className="h-full w-full flex flex-col gap-2 overflow-hidden">
              {/* View Mode Pill Selector Header */}
              <div className="flex items-center justify-between bg-[#1e293b] border border-[#334155] rounded-xl px-3 py-1.5 shrink-0 font-mono text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1 font-sans">
                    <Zap className="w-3.5 h-3.5 text-[#0ea5e9]" /> LC Filter View:
                  </span>
                  <div className="flex gap-1 bg-[#0f172a] p-0.5 rounded-lg border border-[#334155]">
                    {['pre', 'post', 'split'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setLcViewMode(mode)}
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                          lcViewMode === mode
                            ? 'bg-[#0ea5e9] text-white shadow-md'
                            : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-[#0ea5e9] font-bold bg-[#0f172a] px-2 py-0.5 rounded border border-[#0ea5e9]/30">
                  f0: {f0.toFixed(0)} Hz • Filter: {filterCurrentDisplayText}
                </div>
              </div>

              {/* Conditional Content based on lcViewMode */}
              {lcViewMode === 'split' ? (
                <>
                  {/* SPLIT VIEW (TOP: 2 WAVEFORMS, BOTTOM: 2 FFTs) */}
                  <div className="flex-1 w-full grid grid-cols-2 gap-2 relative rounded-xl overflow-hidden bg-[#051317] border border-[#334155] p-1">
                    {/* PRE FILTER WAVEFORM (RED) */}
                    <div className="relative h-full w-full rounded-lg overflow-hidden border border-red-500/30">
                      <div className="absolute top-2 left-2 z-10 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-red-950/80 border border-red-500/50 text-red-400">
                        PRE: TDD {activeCompliance.tddPercent.toFixed(1)}% FAIL
                      </div>
                      <OscilloscopeCRTCanvas
                        loadSpectrum={loadSpectrum}
                        apfEnabled={false}
                        frequencyHz={frequencyHz}
                        fundamentalAmp={fundamentalAmp}
                        showGridTrace={false}
                        showLoadTrace={true}
                      />
                    </div>

                    {/* Animated Middle Divider Arrow */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none">
                      <div className="px-3 py-1.5 rounded-full bg-[#0ea5e9] text-white font-mono text-xs font-extrabold shadow-lg border border-cyan-300 animate-pulse flex items-center gap-1">
                        <span>→</span> LC Filter <span>→</span>
                      </div>
                    </div>

                    {/* POST FILTER WAVEFORM (GREEN) */}
                    <div className="relative h-full w-full rounded-lg overflow-hidden border border-emerald-500/30">
                      <div className="absolute top-2 right-2 z-10 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center gap-1">
                        <span>✓</span> POST: TDD {postTddThd.tddPercent.toFixed(1)}% PASS
                      </div>
                      <OscilloscopeCRTCanvas
                        loadSpectrum={postSpectrum}
                        apfEnabled={false}
                        frequencyHz={frequencyHz}
                        fundamentalAmp={fundamentalAmp}
                        showGridTrace={true}
                        showLoadTrace={false}
                      />
                    </div>
                  </div>

                  <div className="flex-1 w-full grid grid-cols-2 gap-2 bg-[#1e293b] border border-[#334155] rounded-xl p-2 overflow-hidden shadow-lg">
                    {/* PRE FILTER FFT */}
                    <div className="flex flex-col h-full overflow-hidden border border-red-500/30 rounded-lg p-2 bg-[#0f172a]/60">
                      <div className="text-[11px] font-mono font-bold text-red-400 border-b border-[#334155] pb-1 mb-1 flex items-center justify-between shrink-0">
                        <span>PRE-FILTER FFT (RED BARS) — {preTddThd.thdPercent.toFixed(1)}% THD FAIL</span>
                        <span className="text-[9px] text-red-400 font-normal">UNTRAPPED</span>
                      </div>
                      <div className="flex-1 w-full overflow-hidden">
                        <HarmonicsFFTMotionChart
                          complianceResult={activeCompliance}
                          maxDisplayOrder={25}
                          isPostFilter={false}
                          className="h-full border-none p-0 bg-transparent shadow-none"
                        />
                      </div>
                    </div>

                    {/* POST FILTER FFT */}
                    <div className="flex flex-col h-full overflow-hidden border border-emerald-500/30 rounded-lg p-2 bg-[#0f172a]/60">
                      <div className="text-[11px] font-mono font-bold text-emerald-400 border-b border-[#334155] pb-1 mb-1 flex items-center justify-between shrink-0">
                        <span>POST-FILTER FFT (GREEN BARS) — {postTddThd.thdPercent.toFixed(1)}% THD PASS</span>
                        <span className="text-[9px] text-emerald-400 font-normal">TRAPPED (1) PASS ✓</span>
                      </div>
                      <div className="flex-1 w-full overflow-hidden">
                        <HarmonicsFFTMotionChart
                          complianceResult={postCompliance}
                          maxDisplayOrder={25}
                          isPostFilter={true}
                          tunedHarmonic={tunedHarmonic}
                          className="h-full border-none p-0 bg-transparent shadow-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : lcViewMode === 'pre' ? (
                <>
                  {/* PRE VIEW (SINGLE FULL-WIDTH RED WAVEFORM & FFT) */}
                  <div className="h-1/2 w-full relative rounded-xl overflow-hidden bg-[#051317] border border-red-500/40 p-1">
                    <div className="absolute top-2 left-2 z-10 font-mono text-[11px] font-bold px-2.5 py-1 rounded bg-red-950/80 border border-red-500/50 text-red-400">
                      PRE-FILTER UNTRAPPED SCOPE — TDD {activeCompliance.tddPercent.toFixed(1)}% FAIL
                    </div>
                    <OscilloscopeCRTCanvas
                      loadSpectrum={loadSpectrum}
                      apfEnabled={false}
                      frequencyHz={frequencyHz}
                      fundamentalAmp={fundamentalAmp}
                      showGridTrace={false}
                      showLoadTrace={true}
                    />
                  </div>

                  <div className="h-1/2 w-full bg-[#1e293b] border border-[#334155] rounded-xl p-2.5 overflow-hidden shadow-lg">
                    <HarmonicsFFTMotionChart
                      complianceResult={activeCompliance}
                      maxDisplayOrder={25}
                      className="h-full border-none p-0 bg-transparent shadow-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* POST VIEW (SINGLE FULL-WIDTH GREEN WAVEFORM & FFT) */}
                  <div className="h-1/2 w-full relative rounded-xl overflow-hidden bg-[#051317] border border-emerald-500/40 p-1">
                    <div className="absolute top-2 left-2 z-10 font-mono text-[11px] font-bold px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                      ✓ POST-FILTER TRAPPED SCOPE — TDD {postTddThd.tddPercent.toFixed(1)}% PASS
                    </div>
                    <OscilloscopeCRTCanvas
                      loadSpectrum={postSpectrum}
                      apfEnabled={false}
                      frequencyHz={frequencyHz}
                      fundamentalAmp={fundamentalAmp}
                      showGridTrace={true}
                      showLoadTrace={false}
                    />
                  </div>

                  <div className="h-1/2 w-full bg-[#1e293b] border border-[#334155] rounded-xl p-2.5 overflow-hidden shadow-lg">
                    <HarmonicsFFTMotionChart
                      complianceResult={postCompliance}
                      maxDisplayOrder={25}
                      isPostFilter={true}
                      tunedHarmonic={tunedHarmonic}
                      className="h-full border-none p-0 bg-transparent shadow-none"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* STANDARD SINGLE VIEW WHEN LC FILTER IS OFF */
            <>
              <div
                style={{ height: '50%', minHeight: '220px', width: '100%', position: 'relative', overflow: 'hidden' }}
                className="rounded-xl bg-[#051317] border border-[#10b981]/30 shadow-lg flex flex-col justify-between"
              >
                <OscilloscopeCRTCanvas
                  loadSpectrum={loadSpectrum}
                  apfEnabled={apfEnabled}
                  apfEfficiency={apfEfficiency}
                  frequencyHz={frequencyHz}
                  fundamentalAmp={fundamentalAmp}
                  showGridTrace={true}
                  showLoadTrace={true}
                  showApfTrace={true}
                />

                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between z-10 font-mono text-[11px] pointer-events-none">
                  <div className="flex items-center gap-3 bg-[#051317]/85 px-2.5 py-1 rounded-lg border border-[#10b981]/30 shadow-md">
                    <span className="flex items-center gap-1.5 text-[#10b981] font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> GRID: GREEN
                    </span>
                    <span className="flex items-center gap-1.5 text-[#ef4444] font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> LOAD: RED
                    </span>
                    {apfEnabled && (
                      <span className="flex items-center gap-1.5 text-[#06b6d4] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> APF: BLUE
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-[#10b981]/80 bg-[#051317]/85 px-2 py-0.5 rounded border border-[#10b981]/30">
                    IEEE 519 CRT SCOPE
                  </div>
                </div>
              </div>

              <div id="lc-comparison-container" className="hidden"></div>

              <div
                style={{ height: '50%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                className="bg-[#1e293b] border border-[#334155] rounded-xl p-2.5 shadow-lg overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-1.5 shrink-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCenterTab('fft')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        centerTab === 'fft'
                          ? 'bg-[#0ea5e9] text-white shadow-md'
                          : 'bg-[#0f172a] text-[#94a3b8] hover:text-white border border-[#334155]'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Tab 1: FFT Spectrum (H2-H50)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCenterTab('phasor')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        centerTab === 'phasor'
                          ? 'bg-[#0ea5e9] text-white shadow-md'
                          : 'bg-[#0f172a] text-[#94a3b8] hover:text-white border border-[#334155]'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      <span>Tab 2: 3D Phasor</span>
                    </button>
                  </div>

                  {centerTab === 'fft' && (
                    <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
                      <span className="flex items-center gap-1 text-[#94a3b8]">
                        <span className="w-2.5 h-2.5 rounded bg-slate-500" /> Below Limit
                      </span>
                      <span className="flex items-center gap-1 text-[#ef4444] font-semibold">
                        <span className="w-2.5 h-2.5 rounded bg-[#ef4444]" /> Exceeds
                      </span>
                      <span className="flex items-center gap-1 text-red-400">
                        <span className="w-3 h-0.5 bg-red-400 border-b border-dashed border-red-400" /> Limit Line
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full overflow-hidden relative">
                  {centerTab === 'fft' ? (
                    <HarmonicsFFTMotionChart
                      complianceResult={activeCompliance}
                      maxDisplayOrder={50}
                      className="h-full border-none p-0 bg-transparent shadow-none flex flex-col justify-between"
                    />
                  ) : (
                    <Phasor3DDiagram
                      loadSpectrum={loadSpectrum}
                      frequencyHz={frequencyHz}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* COLUMN 3: RIGHT (340px) - THE SOLUTION */}
        <section
          style={{ width: '340px', height: '100%', overflowY: 'auto', boxSizing: 'border-box', paddingBottom: '60px', zIndex: 20 }}
          className="right-panel bg-[#1e293b] border border-[#334155] rounded-xl p-3 shadow-xl flex flex-col justify-start gap-3 scrollbar-thin font-mono text-xs relative z-20"
        >
          {/* APF & Passive Filter Controls */}
          <div className="space-y-2.5 border-b border-[#334155] pb-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white uppercase flex items-center gap-1.5 font-sans">
                <Cpu className="w-4 h-4 text-[#10b981]" /> THE SOLUTION: FILTERS
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#0f172a] text-[#10b981] rounded border border-[#10b981]/30">
                IEEE 519 Ready
              </span>
            </div>

            {/* Filter Topology Mode Selector: [Passive Only] [APF Only] [Hybrid] */}
            <div className="p-2 bg-[#0f172a] rounded-xl border border-[#334155] space-y-1.5">
              <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider block">
                Filter Topology Mode
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'Passive Only', label: 'Passive Only' },
                  { id: 'APF Only', label: 'APF Only' },
                  { id: 'Hybrid', label: 'Hybrid' },
                ].map((mode) => {
                  const isSelected = filterTopologyMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleFilterTopologyChange(mode.id)}
                      className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#0ea5e9] text-white shadow-md font-extrabold border border-cyan-400'
                          : 'bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#334155]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. APF Toggle Row */}
            <div
              title="Real-time harmonic cancellation"
              className="w-full h-[48px] min-h-[48px] px-3 bg-[#0f172a] border border-[#334155] rounded-xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex flex-col justify-center">
                <span className="font-bold text-xs text-white font-sans">Active Power Filter (APF)</span>
                <span className="text-[11px] text-[#94a3b8]">Real-time harmonic cancellation</span>
              </div>
              <button
                type="button"
                title="Real-time harmonic cancellation"
                onClick={() => {
                  const nextApf = !apfEnabled;
                  setApfEnabled(nextApf);
                  if (nextApf && passiveFilterEnabled) setFilterTopologyMode('Hybrid');
                  else if (nextApf && !passiveFilterEnabled) setFilterTopologyMode('APF Only');
                  else if (!nextApf && passiveFilterEnabled) setFilterTopologyMode('Passive Only');
                }}
                style={{ width: '48px', height: '28px', minWidth: '48px' }}
                className={`rounded-full p-1 transition-colors cursor-pointer flex items-center shrink-0 ${
                  apfEnabled ? 'bg-[#10b981]' : 'bg-[#334155]'
                }`}
              >
                <div
                  style={{ width: '20px', height: '20px' }}
                  className={`rounded-full bg-white shadow-md transition-transform ${
                    apfEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {apfEnabled && (
              <div className="p-2.5 bg-[#0f172a]/60 border border-[#334155] rounded-lg space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#94a3b8]">APF Cancellation Efficiency:</span>
                  <span className="text-[#10b981] font-bold">{apfEfficiency}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="95"
                  step="1"
                  value={apfEfficiency}
                  onChange={(e) => setApfEfficiency(Number(e.target.value))}
                  className="w-full h-1 bg-[#1e293b] rounded appearance-none cursor-pointer accent-[#10b981]"
                />
              </div>
            )}

            {/* Hybrid Effect Breakdown Card */}
            {passiveFilterEnabled && apfEnabled && (
              <div className="p-2.5 bg-[#0f172a] border border-[#0ea5e9]/40 rounded-xl space-y-1 text-xs font-mono shadow-md">
                <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  <span>HYBRID DUAL-STAGE REDUCTION</span>
                </div>
                <div className="text-[10px] text-[#94a3b8] leading-tight space-y-0.5">
                  <div>LC traps H{tunedHarmonic}: <span className="text-cyan-300 font-bold">-{lcReductPct}%</span></div>
                  <div>APF cancels residual: <span className="text-emerald-400 font-bold">-{apfEfficiency}%</span></div>
                  <div className="border-t border-[#334155] pt-0.5 mt-0.5 text-emerald-400 font-extrabold text-[11px]">
                    Total System: -{totalReductPct}% Reduction ✓
                  </div>
                </div>
              </div>
            )}

            {/* Passive LC Trap Toggle Row */}
            <div
              title="Passive tuned harmonic trap filter"
              className="w-full h-[48px] min-h-[48px] px-3 bg-[#0f172a] border border-[#334155] rounded-xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex flex-col justify-center">
                <span className="font-bold text-xs text-white font-sans">Passive LC Trap Filter</span>
                <span className="text-[11px] text-[#94a3b8]">Tuned LC notch filter</span>
              </div>
              <button
                type="button"
                title="Passive tuned harmonic trap filter"
                onClick={() => {
                  const nextPassive = !passiveFilterEnabled;
                  setPassiveFilterEnabled(nextPassive);
                  if (nextPassive && apfEnabled) setFilterTopologyMode('Hybrid');
                  else if (nextPassive && !apfEnabled) setFilterTopologyMode('Passive Only');
                  else if (!nextPassive && apfEnabled) setFilterTopologyMode('APF Only');
                }}
                style={{ width: '48px', height: '28px', minWidth: '48px' }}
                className={`rounded-full p-1 transition-colors cursor-pointer flex items-center shrink-0 ${
                  passiveFilterEnabled ? 'bg-[#10b981]' : 'bg-[#334155]'
                }`}
              >
                <div
                  style={{ width: '20px', height: '20px' }}
                  className={`rounded-full bg-white shadow-md transition-transform ${
                    passiveFilterEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Editable Settings Panel when Passive LC Trap is ON */}
            {passiveFilterEnabled && (
              <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl space-y-2.5 shadow-inner">
                {/* Tune To Dropdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[#94a3b8] font-semibold text-[11px]">Tune To:</label>
                    <select
                      value={tunedHarmonic}
                      onChange={(e) => handleHarmonicChange(Number(e.target.value))}
                      className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-white font-bold cursor-pointer focus:border-[#0ea5e9] outline-none"
                    >
                      {[
                        { h: 3, freq: 150 },
                        { h: 5, freq: 250 },
                        { h: 7, freq: 350 },
                        { h: 11, freq: 550 },
                        { h: 13, freq: 650 },
                        { h: 23, freq: 1150 },
                        { h: 25, freq: 1250 },
                      ].map((opt) => {
                        const isAllowed = currentTuningCfg.allowed.includes(opt.h);
                        return (
                          <option
                            key={opt.h}
                            value={opt.h}
                            disabled={!isAllowed}
                            title={
                              !isAllowed
                                ? `H${opt.h} not present in ${currentTuningCfg.label} — characteristic harmonics: ${currentTuningCfg.allowed.join(', ')}`
                                : ''
                            }
                          >
                            [H{opt.h} - {opt.freq}Hz]{!isAllowed ? ` (N/A)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {!currentTuningCfg.allowed.includes(3) && (
                    <div className="text-[9.5px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded px-1.5 py-0.5 font-mono leading-tight">
                      💡 H3 not present in {currentTuningCfg.label} — characteristic harmonics: {currentTuningCfg.allowed.join(', ')}
                    </div>
                  )}
                </div>

                {/* Inductance L (Slider + Editable Input) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#94a3b8]">Inductance (L):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.1"
                        value={inductanceLmH}
                        onChange={(e) => handleLChange(Number(e.target.value))}
                        className="w-14 bg-[#1e293b] border border-[#334155] rounded px-1 py-0.5 text-center text-xs font-bold text-cyan-300 outline-none"
                      />
                      <span className="text-[#94a3b8]">mH</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={inductanceLmH}
                    onChange={(e) => handleLChange(Number(e.target.value))}
                    className="w-full h-1 bg-[#1e293b] rounded appearance-none cursor-pointer accent-[#0ea5e9]"
                  />
                </div>

                {/* Capacitance C (Auto-calculated, Editable with L recalculation) */}
                <div className="flex justify-between items-center text-[11px] p-1.5 bg-[#1e293b]/60 border border-[#334155] rounded-lg">
                  <span className="text-[#94a3b8]">Capacitance (C):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="1"
                      value={capacitanceuF}
                      onChange={(e) => handleCChange(Number(e.target.value))}
                      className="w-16 bg-[#0f172a] border border-[#334155] rounded px-1 py-0.5 text-center text-xs font-bold text-emerald-400 outline-none"
                    />
                    <span className="text-[#94a3b8]">µF</span>
                  </div>
                </div>

                {/* Q Factor Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#94a3b8]">Q Factor:</span>
                    <span className="text-amber-400 font-bold font-sans">{qFactor}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={qFactor}
                    onChange={(e) => setQFactor(Number(e.target.value))}
                    className="w-full h-1 bg-[#1e293b] rounded appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Badges: Detuning (-2%), f0 (147 Hz), Filter Current (312A @ H3) */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-center text-purple-300 font-semibold">
                    -2% Detuned
                  </div>
                  <div className="px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-center text-cyan-300 font-semibold">
                    f0: {f0.toFixed(0)} Hz
                  </div>
                  <div className="col-span-2 px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-center text-emerald-400 font-bold">
                    Filter Current: {filterCurrentDisplayText}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Compact K-Factor Card */}
          <div
            style={{ height: '140px', minHeight: '140px', maxHeight: '140px' }}
            className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl flex flex-col justify-between shrink-0 font-mono shadow-md"
          >
            <div className="flex items-center justify-between border-b border-[#334155] pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs font-sans">
                <Thermometer className="w-4 h-4 text-amber-400" />
                <span>K-Factor Derating</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  passiveFilterEnabled
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-400'
                    : 'bg-amber-950/80 border border-amber-500/50 text-amber-400'
                }`}
              >
                {passiveFilterEnabled ? 'POST FILTER' : `${kRating} RATED`}
              </span>
            </div>

            <div className="flex items-center gap-3 py-1">
              {/* Left Transformer Icon 60px */}
              <div className="w-[60px] h-[60px] min-w-[60px] bg-[#1e293b] border border-[#334155] rounded-xl flex flex-col items-center justify-center gap-0.5 text-amber-400 shadow-inner">
                <Thermometer className="w-6 h-6" />
                <span className="text-[9px] font-bold text-[#94a3b8]">ANSI</span>
              </div>

              {/* Right Information */}
              <div className="flex-1 flex flex-col justify-center">
                {passiveFilterEnabled ? (
                  <>
                    <div className="text-xs font-extrabold text-amber-400 tracking-tight flex items-center gap-1">
                      <span>K: {preK.toFixed(2)}</span>
                      <span className="text-emerald-400">→ {postK.toFixed(1)}</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <span>Derated: {preDerated.toFixed(0)}%</span>
                      <span className="text-cyan-300">→ {postDerated.toFixed(0)}%</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1 animate-pulse">
                      <span>Compliance: FAIL → PASS ✓</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-extrabold text-amber-400 tracking-tight">
                      K = {preK.toFixed(2)}
                    </div>
                    <div className="text-xs font-bold text-emerald-400">
                      {deratedCapacityPct.toFixed(0)}% Nameplate
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      Max Load {Math.round((800 * deratedCapacityPct) / 100)} kVA
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. IEEE 519 Audit Log Table (200px Height, 6 rows visible, Expand All (49) button opening modal) */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between border-b border-[#334155] pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-white font-sans">
                <ShieldCheck className="w-4 h-4 text-[#0ea5e9]" />
                <span>IEEE 519 Audit Log</span>
              </div>
              
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="px-2 py-0.5 rounded bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/40 border border-[#0ea5e9]/50 text-[#0ea5e9] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Expand All (49)</span>
              </button>
            </div>

            {/* Table Container (200px Height, 6 rows visible with sticky header) */}
            <div
              style={{ height: '200px', maxHeight: '200px' }}
              className="overflow-y-auto border border-[#334155] rounded-xl bg-[#0f172a] scrollbar-thin"
            >
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#1e293b] text-[#94a3b8] sticky top-0 border-b border-[#334155] z-10">
                  <tr>
                    <th className="p-1.5">Order</th>
                    <th className="p-1.5">Amps</th>
                    <th className="p-1.5">% IL</th>
                    <th className="p-1.5">Limit</th>
                    <th className="p-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 text-[#f8fafc]">
                  {activeCompliance.details
                    .slice()
                    .sort((a, b) => b.magnitude - a.magnitude)
                    .map((row) => (
                      <tr key={row.order} className="hover:bg-[#1e293b]/70 transition-colors">
                        <td className="p-1.5 font-bold text-[#0ea5e9]">H{row.order}</td>
                        <td className="p-1.5">{row.magnitude.toFixed(1)}A</td>
                        <td className="p-1.5">{row.percentOfIL.toFixed(1)}%</td>
                        <td className="p-1.5 text-[#94a3b8]">{row.limit.toFixed(1)}%</td>
                        <td className="p-1.5 text-right">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                              row.isCompliant ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'
                            }`}
                          >
                            {row.isCompliant ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Verdict Summary Banner */}
            <div
              className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                isCompliant
                  ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]'
                  : 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#ef4444]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isCompliant ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span className="font-bold">{isCompliant ? 'IEEE 519 PASS' : 'EXCEEDS TDD LIMIT'}</span>
              </div>
              <span>TDD: {currentTdd.toFixed(1)}% / {tddLimit}%</span>
            </div>
          </div>

        </section>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: PRESETS TOOLBAR ROW (45px) - STICKY BOTTOM */}
      {/* ========================================================================= */}
      <div
        style={{
          gridRow: '3 / 4',
          gridColumn: '1 / -1',
          height: '45px',
          minHeight: '45px',
          maxHeight: '45px',
          position: 'sticky',
          bottom: 0,
          background: '#1e293b',
          borderTop: '1px solid #334155',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
        className="font-mono text-xs"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#06b6d4]" />
          <span className="font-bold uppercase tracking-wider text-white text-xs">One-Click Presets:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {PREDEFINED_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadScenarioPreset(preset.id)}
              className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                activeScenarioId === preset.id
                  ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-white font-bold'
                  : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
              }`}
            >
              {preset.icon} {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* IEEE 519 Full Audit Modal Overlay (49 Rows H2 - H50) */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#0f172a] border-b border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm text-white font-sans">
                <ShieldCheck className="w-5 h-5 text-[#0ea5e9]" />
                <span>IEEE 519-2022 Audit Log — Full Harmonic Table (H2 to H50)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Table */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0f172a] text-[#94a3b8] sticky top-0 border-b border-[#334155] z-10">
                  <tr>
                    <th className="p-2">Order</th>
                    <th className="p-2">Harmonic Type</th>
                    <th className="p-2">Current (A)</th>
                    <th className="p-2">% of IL</th>
                    <th className="p-2">IEEE Limit</th>
                    <th className="p-2 text-right">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 text-[#f8fafc]">
                  {activeCompliance.details.map((row) => (
                    <tr key={row.order} className="hover:bg-[#0f172a]/80 transition-colors">
                      <td className="p-2 font-bold text-[#0ea5e9]">H{row.order}</td>
                      <td className="p-2 text-[#94a3b8]">
                        {row.order % 3 === 0 ? 'Triplen Zero-Seq' : row.order % 2 === 0 ? 'Even Harmonic' : 'Odd Non-Triplen'}
                      </td>
                      <td className="p-2 font-semibold">{row.magnitude.toFixed(2)} A</td>
                      <td className="p-2">{row.percentOfIL.toFixed(2)}%</td>
                      <td className="p-2 text-[#94a3b8]">{row.limit.toFixed(1)}%</td>
                      <td className="p-2 text-right">
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                            row.isCompliant ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'
                          }`}
                        >
                          {row.isCompliant ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#0f172a] border-t border-[#334155] flex justify-between items-center text-xs text-[#94a3b8]">
              <div>
                Total Evaluated Orders: <span className="text-white font-bold">49</span> (H2 - H50)
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Close Audit Table
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export const HarmonicsFilter = () => {
  return (
    <PowerQualityProvider>
      <HarmonicsFilterContent />
    </PowerQualityProvider>
  );
};

export default HarmonicsFilter;
