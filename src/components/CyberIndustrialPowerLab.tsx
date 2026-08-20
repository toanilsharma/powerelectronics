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
  Building2,
  Factory,
  Ship,
  Sparkles,
  Play,
  HelpCircle,
  GraduationCap,
  Waves,
} from 'lucide-react';
import { PowerQualityEngine, LoadType } from '../utils/PowerQualityEngine';
import { loadWaveformFromBus, subscribeWaveformBus, SharedWaveformPayload } from '../utils/waveformBus';
import { OscilloscopeCRTCanvas } from './OscilloscopeCRTCanvas';
import { HarmonicsFFTMotionChart } from './HarmonicsFFTMotionChart';
import { TransformerKFactorHeatmap } from './TransformerKFactorHeatmap';
import { AdvancedVisualizationTabs } from './AdvancedVisualizationTabs';
import {
  PowerQualityProvider,
  usePowerQuality,
  PREDEFINED_SCENARIOS,
} from '../context/PowerQualityContext';
import { GuidedTourOverlay } from './GuidedTourOverlay';

/**
 * Inner Cyber-Industrial Power Quality Lab Component
 * Consumes global PowerQualityContext state for Presets, Tour Walkthrough, and Engine Physics.
 */
const CyberIndustrialPowerLabInner: React.FC = () => {
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

  const [timebaseScale, setTimebaseScale] = useState<number>(1.0);
  const [showLoadWaveform, setShowLoadWaveform] = useState<boolean>(true);
  const [showApfWaveform, setShowApfWaveform] = useState<boolean>(true);
  const [showSourceWaveform, setShowSourceWaveform] = useState<boolean>(true);
  const [hoveredHarmonicOrder, setHoveredHarmonicOrder] = useState<number | null>(null);

  const [importedWaveform, setImportedWaveform] = useState<SharedWaveformPayload | null>(() => loadWaveformFromBus());

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

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans antialiased p-4 md:p-6 select-none relative">
      
      {/* Guided Tour Spotlight & Popup Overlay */}
      <GuidedTourOverlay />

      <div className="max-w-[1720px] mx-auto space-y-4">

        {/* SHARED WAVEFORM BUS IMPORT BANNER */}
        {importedWaveform && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-950/80 border border-cyan-400 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(6,182,212,0.35)] font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/20 border border-cyan-400/50 rounded-xl text-cyan-300">
                <Waves className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🌊 IMPORTED LIVE WAVEFORM FROM SOFT STARTER LAB</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-extrabold">
                    α = {importedWaveform.firingAngleDeg}° Firing Angle
                  </span>
                </h3>
                <p className="text-slate-300 text-xs mt-0.5">
                  Source: <strong className="text-cyan-300">{importedWaveform.sourceName}</strong> | Peak: <strong>{importedWaveform.peakAmps}A</strong> | Calculated SCR THD: <strong className="text-cyan-300">{importedWaveform.thdPercent}%</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedLoadType('6-Pulse');
                  setFundamentalAmp(importedWaveform.fundamentalAmp || 269);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all cursor-pointer active:scale-95"
              >
                Run IEEE 519 FFT &amp; APF Analysis
              </button>

              <button
                onClick={() => setImportedWaveform(null)}
                className="px-3 py-2 rounded-xl border border-cyan-500/40 text-slate-400 hover:text-white transition-colors text-xs font-bold"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
        
        {/* ========================================================================= */}
        {/* TOP BAR: SYSTEM STATUS, GLOBAL TDD METER & GUIDED TOUR LAUNCHER */}
        {/* ========================================================================= */}
        <header className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Brand & Engine Badges */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-xl text-[#06b6d4] shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans">
                  POWER QUALITY & HARMONICS ENGINE
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#06b6d4]/20 border border-[#06b6d4]/40 text-[#06b6d4]">
                  v2022.4
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-[#94a3b8]">
                <span className="flex items-center gap-1.5 text-[#10b981]">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                  ENGINE LIVE ({frequencyHz} Hz)
                </span>
                <span>•</span>
                <span className="text-[#06b6d4] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  IEEE 519-2022 TABLE 2
                </span>
                <span>•</span>
                <span className="text-amber-400">ANSI C57.110 K-FACTOR</span>
              </div>
            </div>
          </div>

          {/* Guided Learning Mode Launcher Button */}
          <button
            onClick={startTour}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 font-mono"
          >
            <GraduationCap className="w-4 h-4" />
            <span>START LEARNING MODE TOUR</span>
          </button>

          {/* Key Telemetry Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            
            {/* THD Meter */}
            <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                {apfEnabled ? 'Source THD' : 'Load THD'}
              </div>
              <div className="text-xl font-bold font-mono text-[#06b6d4] mt-0.5">
                {activeCompliance.thdPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] font-mono text-[#64748b]">
                I1 = {fundamentalAmp}A
              </div>
            </div>

            {/* Isc / IL Ratio */}
            <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                Isc / IL Ratio
              </div>
              <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">
                {activeCompliance.ratioIscIl.toFixed(1)}
              </div>
              <div className="text-[10px] font-mono text-[#64748b]">
                Grid Tier
              </div>
            </div>

            {/* K-Factor Derating */}
            <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                K-Factor
              </div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {kFactor.toFixed(2)}
              </div>
              <div className="text-[10px] font-mono text-[#64748b]">
                Rating: <span className="text-white font-semibold">{kRating}</span>
              </div>
            </div>

            {/* Compliance Status */}
            <div className={`bg-[#0f172a] border rounded-xl p-3 text-center flex flex-col justify-center items-center ${
              isCompliant ? 'border-[#10b981]/40' : 'border-[#ef4444]/40'
            }`}>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">
                Compliance
              </div>
              <div className={`text-base font-bold font-mono mt-0.5 flex items-center gap-1 ${
                isCompliant ? 'text-[#10b981]' : 'text-[#ef4444]'
              }`}>
                {isCompliant ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {isCompliant ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-[10px] font-mono text-[#64748b]">
                IEEE 519-2022
              </div>
            </div>

          </div>

          {/* Global TDD Circular Radial Gauge */}
          <div className="flex items-center gap-4 bg-[#0f172a]/70 border border-[#334155] p-3.5 rounded-xl">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#334155]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isCompliant ? 'text-[#10b981]' : 'text-[#ef4444]'}
                  strokeDasharray={`${Math.min(100, (currentTdd / Math.max(1, tddLimit * 1.8)) * 100)}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold font-mono text-white">
                  {currentTdd.toFixed(1)}%
                </span>
                <span className="text-[8px] font-mono text-[#94a3b8]">TDD</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Total Demand Distortion
              </div>
              <div className="text-xs text-[#94a3b8] font-mono mt-0.5">
                Limit: <span className="text-[#06b6d4] font-bold">{tddLimit}%</span>
              </div>
              <div className={`text-[10px] font-semibold mt-1 ${isCompliant ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {isCompliant ? 'Within IEEE 519 Margin' : 'Exceeds TDD Limit'}
              </div>
            </div>
          </div>

        </header>

        {/* ========================================================================= */}
        {/* MAIN 3-COLUMN DESKTOP GRID LAYOUT */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANEL (THE CAUSE): HARMONIC SOURCE & INPUT PARAMETERS */}
          {/* ----------------------------------------------------------------------- */}
          <section
            id="source-selector-target"
            className="lg:col-span-3 bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-6"
          >
            
            <div className="space-y-5">
              
              <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#06b6d4]" />
                  <h2 className="font-bold text-base text-white tracking-wide uppercase">
                    The Cause
                  </h2>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#0f172a] text-[#94a3b8] rounded border border-[#334155]">
                  Source Dynamics
                </span>
              </div>

              {/* Harmonic Source Tactile Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block">
                  Harmonic Source Selector
                </label>
                <div className="grid grid-cols-2 gap-2">
                  
                  {[
                    { id: '6-Pulse', label: '6-Pulse SCR', icon: '⚡' },
                    { id: '12-Pulse', label: '12-Pulse Xfmr', icon: '⚡' },
                    { id: 'VFD', label: 'VFD Drive', icon: '🌀' },
                    { id: 'SMPS', label: 'SMPS Load', icon: '💻' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setSelectedLoadType(btn.id as LoadType)}
                      className={`p-3 rounded-xl border font-sans text-xs font-semibold text-left transition-all duration-200 flex flex-col justify-between gap-2 ${
                        selectedLoadType === btn.id
                          ? 'bg-[#06b6d4]/15 border-[#06b6d4] text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:border-[#64748b] hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  ))}

                </div>
              </div>

              {/* Load & Grid Sliders */}
              <div className="space-y-4 pt-2">
                
                {/* Fundamental Current I1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94a3b8]">Fundamental Current (I1)</span>
                    <span className="font-mono text-[#06b6d4] font-bold">{fundamentalAmp} A</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1500"
                    step="10"
                    value={fundamentalAmp}
                    onChange={(e) => setFundamentalAmp(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
                  />
                </div>

                {/* Max Demand Load Current IL */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94a3b8]">Max Demand Load (IL)</span>
                    <span className="font-mono text-purple-400 font-bold">{maxDemandIl} A</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1500"
                    step="10"
                    value={maxDemandIl}
                    onChange={(e) => setMaxDemandIl(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                  <p className="text-[10px] text-[#64748b]">
                    IEEE 519 calculates TDD relative to IL.
                  </p>
                </div>

                {/* Short Circuit Current Isc */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94a3b8]">Grid Fault Current (Isc)</span>
                    <span className="font-mono text-amber-400 font-bold">{shortCircuitIsc} kA</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={shortCircuitIsc}
                    onChange={(e) => setShortCircuitIsc(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#64748b]">
                    <span>Isc/IL: {activeCompliance.ratioIscIl}</span>
                    <span>TDD Limit: {tddLimit}%</span>
                  </div>
                </div>

                {/* Frequency Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#0f172a] border border-[#334155] rounded-xl">
                  <span className="text-xs text-[#94a3b8]">Grid Frequency</span>
                  <div className="flex items-center bg-[#1e293b] p-0.5 rounded-lg border border-[#334155]">
                    <button
                      onClick={() => setFrequencyHz(50)}
                      className={`px-3 py-1 text-xs font-mono rounded-md font-semibold ${
                        frequencyHz === 50 ? 'bg-[#06b6d4] text-slate-950' : 'text-[#94a3b8]'
                      }`}
                    >
                      50 Hz
                    </button>
                    <button
                      onClick={() => setFrequencyHz(60)}
                      className={`px-3 py-1 text-xs font-mono rounded-md font-semibold ${
                        frequencyHz === 60 ? 'bg-[#06b6d4] text-slate-950' : 'text-[#94a3b8]'
                      }`}
                    >
                      60 Hz
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Info Card */}
            <div className="p-3.5 bg-[#0f172a]/70 border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#06b6d4]" />
                Harmonic Physics Note
              </div>
              <p className="text-[11px] leading-relaxed">
                6-Pulse converters generate characteristic odd non-triplen harmonics (5th, 7th, 11th, 13th...). 12-Pulse cancels 5th & 7th.
              </p>
            </div>

          </section>

          {/* ----------------------------------------------------------------------- */}
          {/* CENTER STAGE (THE EFFECT): OSCILLOSCOPE & FFT SPECTRUM ANALYZER */}
          {/* ----------------------------------------------------------------------- */}
          <main className="lg:col-span-6 space-y-5 flex flex-col">
            
            {/* Task 1: 60fps Phosphor CRT Canvas Oscilloscope Target */}
            <div id="scope-target">
              <OscilloscopeCRTCanvas
                loadSpectrum={loadSpectrum}
                apfEnabled={apfEnabled}
                apfEfficiency={apfEfficiency}
                frequencyHz={frequencyHz}
                fundamentalAmp={fundamentalAmp}
                timebaseScale={timebaseScale}
                showGridTrace={showSourceWaveform}
                showLoadTrace={showLoadWaveform}
                showApfTrace={showApfWaveform}
              />
            </div>

            {/* Task 2: Framer Motion Spring Animated FFT Spectrum Target */}
            <div id="fft-spectrum-target">
              <HarmonicsFFTMotionChart
                complianceResult={activeCompliance}
                maxDisplayOrder={50}
              />
            </div>

            {/* Advanced Visualization Tabs (3D Phasor & Spectrogram Waterfall) */}
            <div id="advanced-tabs-target">
              <AdvancedVisualizationTabs
                loadSpectrum={loadSpectrum}
                maxDemandIl={maxDemandIl}
                frequencyHz={frequencyHz}
              />
            </div>

          </main>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANEL (THE SOLUTION & AUDIT): FILTER CONTROLS & IEEE 519 TABLE */}
          {/* ----------------------------------------------------------------------- */}
          <section className="lg:col-span-3 space-y-5 flex flex-col">
            
            {/* Top: Filter & APF Controls */}
            <div id="solution-panel-target" className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5">
              
              <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#10b981]" />
                  <h2 className="font-bold text-base text-white tracking-wide uppercase">
                    The Solution
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#0f172a] text-[#10b981] rounded border border-[#10b981]/30">
                  APF & Mitigation
                </span>
              </div>

              {/* Active Power Filter (APF) Toggle Target */}
              <div id="apf-toggle-target" className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Active Power Filter (APF)
                    </div>
                    <div className="text-[10px] text-[#64748b]">
                      Real-time harmonic cancellation
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setApfEnabled(!apfEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                      apfEnabled ? 'bg-[#10b981]' : 'bg-[#334155]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        apfEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {apfEnabled && (
                  <div className="space-y-1.5 pt-2 border-t border-[#334155]/60">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#94a3b8]">Compensation Efficiency</span>
                      <span className="text-[#10b981] font-bold">{apfEfficiency}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={apfEfficiency}
                      onChange={(e) => setApfEfficiency(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                    />
                  </div>
                )}
              </div>

              {/* Passive LC Trap Filter Toggle */}
              <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      Passive LC Trap Filter
                    </div>
                    <div className="text-[10px] text-[#64748b]">
                      Tuned shunt LC branch
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setPassiveFilterEnabled(!passiveFilterEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                      passiveFilterEnabled ? 'bg-[#06b6d4]' : 'bg-[#334155]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        passiveFilterEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {passiveFilterEnabled && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#334155]/60 text-xs">
                    <span className="text-[#94a3b8]">Tuned Order</span>
                    <div className="flex gap-1">
                      {([5, 7, 11] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setPassiveTunedFreq(freq)}
                          className={`px-2 py-0.5 font-mono text-[10px] rounded font-semibold ${
                            passiveTunedFreq === freq
                              ? 'bg-[#06b6d4] text-slate-950'
                              : 'bg-[#1e293b] text-[#94a3b8]'
                          }`}
                        >
                          H{freq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Task 3: Transformer K-Factor Heatmap Target */}
            <div id="kfactor-heatmap-target">
              <TransformerKFactorHeatmap kFactor={kFactor} />
            </div>

            {/* Bottom: IEEE 519 Audit Table Target */}
            <div id="ieee-table-target" className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl flex-1 flex flex-col justify-between space-y-4">
              
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#06b6d4]" />
                    <h2 className="font-bold text-sm text-white tracking-wide uppercase">
                      IEEE 519 Audit Log
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    Max TDD: {tddLimit}%
                  </span>
                </div>

                {/* Table Container */}
                <div className="max-h-[220px] overflow-y-auto border border-[#334155] rounded-xl bg-[#0f172a]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#1e293b] text-[#94a3b8] text-[10px] uppercase sticky top-0 border-b border-[#334155]">
                      <tr>
                        <th className="p-2">Order</th>
                        <th className="p-2">Current</th>
                        <th className="p-2">% IL</th>
                        <th className="p-2">Limit</th>
                        <th className="p-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/60 text-[#f8fafc]">
                      {activeCompliance.details.map((row) => (
                        <tr
                          key={row.order}
                          onMouseEnter={() => setHoveredHarmonicOrder(row.order)}
                          onMouseLeave={() => setHoveredHarmonicOrder(null)}
                          className="hover:bg-[#1e293b]/70 transition-colors"
                        >
                          <td className="p-2 font-bold text-[#06b6d4]">H{row.order}</td>
                          <td className="p-2">{row.magnitude.toFixed(1)}A</td>
                          <td className="p-2">{row.percentOfIL.toFixed(1)}%</td>
                          <td className="p-2 text-[#94a3b8]">{row.limit.toFixed(1)}%</td>
                          <td className="p-2 text-right">
                            <span
                              className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                                row.isCompliant
                                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30'
                                  : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
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
              </div>

              {/* Verdict Summary Banner */}
              <div
                className={`p-3.5 rounded-xl border text-xs font-sans flex items-start gap-3 ${
                  isCompliant
                    ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]'
                    : 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#ef4444]'
                }`}
              >
                {isCompliant ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#10b981]" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#ef4444]" />
                )}
                <div>
                  <div className="font-bold uppercase tracking-wider text-white text-xs">
                    {isCompliant ? 'GRID COMPLIANT' : 'NON-COMPLIANT GRID'}
                  </div>
                  <p className="text-[11px] leading-tight text-[#94a3b8] mt-1 font-mono">
                    {activeCompliance.summary}
                  </p>
                </div>
              </div>

            </div>

          </section>

        </div>

        {/* ========================================================================= */}
        {/* BOTTOM STRIP: ONE-CLICK SCENARIO PRESETS */}
        {/* ========================================================================= */}
        <footer className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#06b6d4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Industrial One-Click Scenario Presets
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 w-full md:w-auto">
            {PREDEFINED_SCENARIOS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadScenarioPreset(preset.id)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all duration-200 flex items-center gap-2 group ${
                  activeScenarioId === preset.id
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-[#0f172a] border-[#334155] hover:border-[#06b6d4] text-[#94a3b8] hover:text-white'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{preset.icon}</span>
                <div>
                  <div className="text-white text-[11px] font-bold">{preset.name}</div>
                  <div className="text-[9px] font-mono text-[#64748b]">{preset.category}</div>
                </div>
              </button>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
};

export const CyberIndustrialPowerLab: React.FC = () => {
  return (
    <PowerQualityProvider>
      <CyberIndustrialPowerLabInner />
    </PowerQualityProvider>
  );
};
