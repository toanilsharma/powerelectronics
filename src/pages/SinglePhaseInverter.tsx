import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Zap,
  Play,
  Square,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  Activity,
  BookOpen,
} from 'lucide-react';
import { InverterControlsAndSOP } from '../components/InverterControlsAndSOP';
import { InverterSLD } from '../components/InverterSLD';
import { InverterScopeStrip } from '../components/InverterScopeStrip';
import { InverterRightPanel } from '../components/InverterRightPanel';
import { InverterSwitchgearDrawer } from '../components/InverterSwitchgearDrawer';
import { InverterTourOverlay } from '../components/InverterTourOverlay';
import { CommonFooter } from '../components/CommonFooter';
import { calculateInverterPhysics } from '../engine/InverterPhysics';

export const SinglePhaseInverterContent: React.FC = () => {
  // 1. Converter State & Modulation Controls
  const [Vdc, setVdc] = useState<number>(400); // DC Link Voltage (V)
  const [ma, setMa] = useState<number>(0.8); // Modulation Index (0.1 to 3.0)
  const [f1, setF1] = useState<number>(50); // Fundamental AC Frequency (Hz)
  const [fc, setFc] = useState<number>(5000); // Carrier Frequency (Hz)
  const [inductanceMh, setInductanceMh] = useState<number>(2.0); // LC Filter Choke (mH)
  const [capacitanceUf, setCapacitanceUf] = useState<number>(20); // LC Filter Cap (µF)
  const [loadR, setLoadR] = useState<number>(10); // Load Resistance (Ω)
  const [loadLMh, setLoadLMh] = useState<number>(5); // Load Inductance (mH)
  const [deadTimeUs, setDeadTimeUs] = useState<number>(2.0); // Dead Time (µs)

  // 2. Switchgear & Breaker States
  const [q1Closed, setQ1Closed] = useState<boolean>(true);
  const [q2Closed, setQ2Closed] = useState<boolean>(true);
  const [q3Closed, setQ3Closed] = useState<boolean>(true);
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(true);

  // 3. Fault Injection State
  const [activeFault, setActiveFault] = useState<string | null>(null);

  // 4. Panel Collapse & Layout View States
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [centerView, setCenterView] = useState<'sld' | 'scope' | 'split'>('sld');

  // 5. Drawer & Modal States
  const [isSOPDrawerOpen, setIsSOPDrawerOpen] = useState<boolean>(false);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  // Memoized Physics Solver Execution
  const physicsResults = useMemo(() => {
    return calculateInverterPhysics(
      {
        Vdc,
        ma,
        f1,
        fc,
        inductanceMh,
        capacitanceUf,
        loadR,
        loadLMh,
        deadTimeUs,
        q1Closed,
        q2Closed,
        q3Closed,
        isEngineRunning,
      },
      activeFault
    );
  }, [Vdc, ma, f1, fc, inductanceMh, capacitanceUf, loadR, loadLMh, deadTimeUs, q1Closed, q2Closed, q3Closed, isEngineRunning, activeFault]);

  const {
    Vout_1_rms,
    Vab_1_rms,
    Iout_1_rms,
    f0_cutoff,
    thdPercent,
    Pout,
    Ploss,
    Pcond_mos,
    Psw,
    Pdiode,
    Plc,
    etaPct,
    mode,
    warnings,
    spectrum,
  } = physicsResults;

  const handleStartEngine = () => setIsEngineRunning(true);
  const handleStopEngine = () => setIsEngineRunning(false);
  const handleReset = () => {
    setVdc(400);
    setMa(0.8);
    setF1(50);
    setFc(5000);
    setInductanceMh(2.0);
    setCapacitanceUf(20);
    setLoadR(10);
    setDeadTimeUs(2.0);
    setQ1Closed(true);
    setQ2Closed(true);
    setQ3Closed(true);
    setIsEngineRunning(true);
    setActiveFault(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#040812] text-slate-100 flex flex-col font-sans select-none">
      <Helmet>
        <title>Single-Phase Full-Bridge SPWM Inverter Simulator | Power Electronics Lab</title>
        <meta
          name="description"
          content="Interactive Single-Phase Full-Bridge SPWM Inverter Simulator with LC low-pass filter, 4-channel oscilloscope, FFT spectrum scanner, and fault injection lab."
        />
      </Helmet>

      {/* HEADER TOP BAR */}
      <header className="sticky top-0 z-30 w-full bg-[#070b14]/90 backdrop-blur-md border-b border-[#1e293b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-mono"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>LAB HOME</span>
          </a>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2 font-mono">
                SINGLE-PHASE FULL-BRIDGE SPWM INVERTER LAB
              </h1>
              <span className="text-[10px] text-slate-400 font-mono">
                IEEE 519 / IEC 61800-9 PWM Inverter &amp; Harmonics Solver
              </span>
            </div>
          </div>
        </div>

        {/* Engine Status Controls & Top Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 bg-[#0b1426] border border-[#1e293b] rounded-xl px-2.5 py-1">
            <span className="text-[10px] text-slate-400 font-bold">MODE:</span>
            <span className="text-emerald-400 font-extrabold text-xs">{mode}</span>
          </div>

          <button
            type="button"
            onClick={isEngineRunning ? handleStopEngine : handleStartEngine}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
              isEngineRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isEngineRunning ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isEngineRunning ? 'STOP INVERTER' : 'START INVERTER'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer border border-[#1e293b]"
            title="Reset All Parameters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN WORKBENCH LAYOUT */}
      <main className="flex-1 w-full p-2 sm:p-3.5 flex gap-3 overflow-hidden">
        {/* LEFT COLUMN: CONTROLS & SOP */}
        <aside
          className={`h-full flex flex-col transition-all duration-200 ${
            leftCollapsed ? 'w-10 shrink-0' : 'w-[310px] xl:w-[340px] shrink-0'
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
                CONTROLS &amp; PARAMETERS
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 flex flex-col gap-2 overflow-y-auto custom-scrollbar shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5 shrink-0 font-mono">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Inverter Controls
                </span>
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Collapse Panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <InverterControlsAndSOP
                Vdc={Vdc}
                setVdc={setVdc}
                ma={ma}
                setMa={setMa}
                f1={f1}
                setF1={setF1}
                fc={fc}
                setFc={setFc}
                inductanceMh={inductanceMh}
                setInductanceMh={setInductanceMh}
                capacitanceUf={capacitanceUf}
                setCapacitanceUf={setCapacitanceUf}
                loadR={loadR}
                setLoadR={setLoadR}
                deadTimeUs={deadTimeUs}
                setDeadTimeUs={setDeadTimeUs}
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
                Vout_rms={Vout_1_rms}
                Iout_rms={Iout_1_rms}
                Pout={Pout}
                etaPct={etaPct}
                onOpenSOPDrawer={() => setIsSOPDrawerOpen(true)}
              />
            </div>
          )}
        </aside>

        {/* CENTER WORKBENCH COLUMN */}
        <section className="flex-1 h-full flex flex-col gap-2 min-w-0 overflow-y-auto custom-scrollbar">
          {/* CENTER VIEW TAB STRIP */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-[#070b14] border-2 border-[#1e293b] rounded-xl font-mono text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCenterView('sld')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  centerView === 'sld'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ SLD Schematic
              </button>
              <button
                type="button"
                onClick={() => setCenterView('scope')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  centerView === 'scope'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📈 Oscilloscope &amp; FFT
              </button>
              <button
                type="button"
                onClick={() => setCenterView('split')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  centerView === 'split'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔀 Split View (SLD + AC Waveform Scope)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSOPDrawerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 border border-amber-500/50 font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>SOP Workstation Drawer</span>
            </button>
          </div>

          {/* WARNING BANNER */}
          {warnings.length > 0 && (
            <div className="p-2.5 bg-rose-950/80 border-2 border-rose-500/80 rounded-xl text-rose-200 text-xs font-mono flex flex-col gap-1 shrink-0 shadow-lg">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2 font-bold">
                  <span>🚨</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* MAIN CENTER DISPLAY */}
          <div className="flex-1 w-full min-h-0 flex flex-col gap-3">
            {(centerView === 'sld' || centerView === 'split') && (
              <div className={centerView === 'split' ? 'h-1/2 min-h-[320px]' : 'h-full'}>
                <InverterSLD
                  Vdc={Vdc}
                  ma={ma}
                  f1={f1}
                  fc={fc}
                  inductanceMh={inductanceMh}
                  capacitanceUf={capacitanceUf}
                  loadR={loadR}
                  loadLMh={loadLMh}
                  deadTimeUs={deadTimeUs}
                  q1Closed={q1Closed}
                  q2Closed={q2Closed}
                  q3Closed={q3Closed}
                  isEngineRunning={isEngineRunning}
                  activeFault={activeFault}
                  Vout_rms={Vout_1_rms}
                  Iout_rms={Iout_1_rms}
                  Pout={Pout}
                  Ploss={Ploss}
                  etaPct={etaPct}
                  thdPercent={thdPercent}
                  onToggleQ1={() => setQ1Closed(!q1Closed)}
                  onToggleQ2={() => setQ2Closed(!q2Closed)}
                  onToggleQ3={() => setQ3Closed(!q3Closed)}
                />
              </div>
            )}

            {(centerView === 'scope' || centerView === 'split') && (
              <div className={centerView === 'split' ? 'h-1/2 min-h-[320px]' : 'h-full'}>
                <InverterScopeStrip
                  Vdc={Vdc}
                  ma={ma}
                  f1={f1}
                  fc={fc}
                  Vout_rms={Vout_1_rms}
                  Iout_rms={Iout_1_rms}
                  thdPercent={thdPercent}
                  mode={mode}
                  isEngineRunning={isEngineRunning}
                  spectrum={spectrum}
                  activeFault={activeFault}
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
                title="Expand Learning Panel"
              >
                <ChevronLeft className="w-4 h-4 text-amber-400" />
              </button>
              <div className="[writing-mode:vertical-lr] text-xs font-mono font-bold text-slate-400 tracking-wider">
                LEARNING &amp; ANALYTICS
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 flex flex-col gap-2 overflow-y-auto custom-scrollbar shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5 shrink-0 font-mono">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Learning &amp; Analytics
                </span>
                <button
                  type="button"
                  onClick={() => setRightCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Collapse Panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <InverterRightPanel
                Vdc={Vdc}
                ma={ma}
                f1={f1}
                fc={fc}
                inductanceMh={inductanceMh}
                capacitanceUf={capacitanceUf}
                loadR={loadR}
                loadLMh={loadLMh}
                deadTimeUs={deadTimeUs}
                q1Closed={q1Closed}
                q2Closed={q2Closed}
                q3Closed={q3Closed}
                isEngineRunning={isEngineRunning}
                activeFault={activeFault}
                setActiveFault={setActiveFault}
                Vout_rms={Vout_1_rms}
                Vab_1_rms={Vab_1_rms}
                Iout_rms={Iout_1_rms}
                f0_cutoff={f0_cutoff}
                thdPercent={thdPercent}
                Pout={Pout}
                Ploss={Ploss}
                Pcond_mos={Pcond_mos}
                Psw={Psw}
                Pdiode={Pdiode}
                Plc={Plc}
                etaPct={etaPct}
                mode={mode}
                onOpenTour={() => setIsTourActive(true)}
              />
            </div>
          )}
        </aside>
      </main>

      {/* DRAWERS & MODALS */}
      {isSOPDrawerOpen && (
        <InverterSwitchgearDrawer
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
        <InverterTourOverlay
          isOpen={isTourActive}
          onClose={() => setIsTourActive(false)}
          Vdc={Vdc}
          Vout_rms={Vout_1_rms}
          Iout_rms={Iout_1_rms}
          ma={ma}
          fc={fc}
          mode={mode}
          etaPct={etaPct}
        />
      )}
    </div>
  );
};

export const SinglePhaseInverter = SinglePhaseInverterContent;
export default SinglePhaseInverter;
