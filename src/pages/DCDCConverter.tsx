import React, { useState } from 'react';
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
  const [activeFault, setActiveFault] = useState<string | null>(null); // null | 'S1_OPEN' | 'S1_SHORT' | 'DIODE_OPEN' | 'L_SAT' | 'C_ESR_HIGH'

  // 4. UI Level & Modal States
  const [learningLevel, setLearningLevel] = useState<string>('INTERMEDIATE'); // 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'
  const [isSOPDrawerOpen, setIsSOPDrawerOpen] = useState<boolean>(false);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  // 5. Physics Engine Calculations
  const effectiveInductanceuH = activeFault === 'L_SAT' ? inductanceuH * 0.5 : inductanceuH;
  const effectiveRdsOnmOhm = activeFault === 'S1_SHORT' ? 0.001 : rdsOnmOhm;

  const physicsParams = {
    Vin,
    D: duty / 100,
    f: fsw,
    L: effectiveInductanceuH * 1e-6,
    C: capacitanceuF * 1e-6,
    R: loadR,
    Rds: effectiveRdsOnmOhm / 1000,
  };

  let rawResults: any;
  if (topology === 'boost') {
    rawResults = calculateBoost(physicsParams);
  } else if (topology === 'buckboost') {
    rawResults = calculateBuckBoost(physicsParams);
  } else if (topology === 'sepic') {
    rawResults = calculateSEPIC(physicsParams);
  } else {
    rawResults = calculateBuck(physicsParams);
  }

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

  // State Lamp Matrix Status Determination
  let activeStateLamp = 'IDLE';
  if (activeFault) activeStateLamp = 'FAULT';
  else if (!isEngineRunning || !q1Closed) activeStateLamp = 'IDLE';
  else if (duty < 20) activeStateLamp = 'SOFT-START';
  else activeStateLamp = 'RUNNING';

  return (
    <div className="w-full min-h-screen bg-[#04060a] text-slate-100 font-sans select-none overflow-y-auto">
      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR */}
      {/* ========================================================================= */}
      <header className="w-full px-3 py-2 bg-[#0d1117] border-b border-[#30363d] flex flex-col lg:flex-row items-center justify-between gap-2.5 shrink-0 font-mono">
        {/* Left Title & Upstream Context Chip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 id="dc-header-title" className="text-xs md:text-sm font-bold text-white tracking-wide">
                INDUSTRIAL DC-DC CONVERTER LAB
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                12V - 400V DC • 100A
              </span>
            </div>

            {/* Upstream Context Chip */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-cyan-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 font-bold flex items-center gap-1">
                <span>⚡ Upstream: 415V AC → 48V DC Charger OK</span>
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">IEEE 946 / IEC 62040-3 Standard</span>
            </div>
          </div>
        </div>

        {/* Right Controls: TOPOLOGY SEGMENTED CONTROL, STATE LAMPS, MODE & BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* TOPOLOGY SEGMENTED CONTROL */}
          <div id="dc-topology-control" className="flex items-center bg-[#070a10] border-2 border-blue-500/60 rounded-xl p-0.5 shadow-md">
            {[
              { id: 'buck', label: 'Buck' },
              { id: 'boost', label: 'Boost' },
              { id: 'buckboost', label: 'Buck-Boost' },
              { id: 'sepic', label: 'SEPIC' },
            ].map((top) => (
              <button
                key={top.id}
                type="button"
                onClick={() => setTopology(top.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer min-h-[32px] ${
                  topology === top.id
                    ? 'bg-emerald-600 text-white shadow-md scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {top.label}
              </button>
            ))}
          </div>

          {/* STATE LAMP STRIP */}
          <div className="flex items-center gap-1 bg-[#070a10] border border-[#1e293b] rounded-xl p-1 shadow-inner">
            {[
              { id: 'IDLE', label: 'IDLE', color: 'bg-slate-700 text-slate-300' },
              { id: 'SOFT-START', label: 'SOFT-START', color: 'bg-amber-500 text-black animate-pulse' },
              { id: 'RUNNING', label: 'RUNNING', color: 'bg-emerald-500 text-black font-black' },
              { id: 'FAULT', label: 'FAULT', color: 'bg-rose-600 text-white animate-pulse' },
            ].map((lamp) => (
              <span
                key={lamp.id}
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border transition-all ${
                  activeStateLamp === lamp.id ? `${lamp.color} border-white shadow-sm` : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50'
                }`}
              >
                {lamp.label}
              </span>
            ))}
          </div>

          {/* MODE SELECTOR */}
          <select
            value={learningLevel}
            onChange={(e) => setLearningLevel(e.target.value)}
            className="h-[34px] bg-[#070a10] border border-emerald-500/50 text-[#00e5a0] font-extrabold text-xs rounded-xl px-2 focus:outline-none cursor-pointer"
          >
            <option value="BEGINNER">🎓 Beginner</option>
            <option value="INTERMEDIATE">📘 Intermediate</option>
            <option value="EXPERT">⚡ Expert</option>
          </select>

          {/* ACTION BUTTONS */}
          <button
            type="button"
            onClick={handleStartEngine}
            className="h-[34px] px-3 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-xl border border-[#00ffb7] shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>▶ START</span>
          </button>

          <button
            type="button"
            onClick={handleStopEngine}
            className="h-[34px] px-3 bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold text-xs rounded-xl border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)] active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>⏹ STOP</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="h-[34px] px-2.5 bg-[#1f2937] hover:bg-[#374151] text-amber-300 font-extrabold text-xs rounded-xl border border-amber-500/50 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            title="Reset all parameters and faults"
          >
            <span>🔄 RESET</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKBENCH LAYOUT */}
      {/* ========================================================================= */}
      <main className="w-full p-3 grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-3 items-start">
        {/* LEFT RAIL: CONVERTER & FILTER PARAMETERS SLIDERS */}
        <section className="w-full flex flex-col gap-2.5">
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
            mode={mode}
            deltaIL={deltaIL}
            deltaVout={deltaVout}
            Vout={Vout}
            onOpenSOPDrawer={() => setIsSOPDrawerOpen(true)}
          />
        </section>

        {/* CENTER PANEL: ANIMATED SLD & SYNCHRONIZED CRT SCOPE STRIP */}
        <section className="w-full flex flex-col gap-3">
          {/* TOP: ANIMATED SCHEMATIC SLD WORKBENCH */}
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
          />

          {/* BELOW SLD: SYNCHRONIZED 4-CHANNEL CRT OSCILLOSCOPE STRIP */}
          <ConverterScopeStrip
            topology={topology}
            Vin={Vin}
            duty={duty}
            fsw={fsw}
            Vout={Vout}
            Iout={Iout}
            deltaIL={deltaIL}
            deltaVout={deltaVout}
            mode={mode}
            isEngineRunning={isEngineRunning}
            visualPhase="ON"
          />

          {/* BELOW SCOPE: ONE-CLICK SCENARIO CARDS & FAULT TRAINER */}
          <DCDCScenarioAndFaultTrainer
            setTopology={setTopology}
            setVin={setVin}
            setDuty={setDuty}
            setFsw={setFsw}
            setInductanceuH={setInductanceuH}
            setCapacitanceuF={setCapacitanceuF}
            setLoadR={setLoadR}
            setActiveFault={setActiveFault}
          />
        </section>

        {/* RIGHT RAIL: PHYSICS INSIGHT, LOSSES, EFFICIENCY & FAULTS */}
        <section className="w-full flex flex-col gap-2.5">
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
        </section>
      </main>

      {/* SLIDE-IN SWITCHGEAR & SOP DRAWER */}
      <DCDCSwitchgearDrawer
        isOpen={isSOPDrawerOpen}
        onClose={() => setIsSOPDrawerOpen(false)}
        topology={topology}
        Vin={Vin}
        duty={duty}
        fsw={fsw}
        Vout={Vout}
        Iout={Iout}
        q1Closed={q1Closed}
        q2Closed={q2Closed}
        q3Closed={q3Closed}
        onToggleQ1={() => setQ1Closed(!q1Closed)}
        onToggleQ2={() => setQ2Closed(!q2Closed)}
        onToggleQ3={() => setQ3Closed(!q3Closed)}
      />

      {/* GUIDED SPOTLIGHT TOUR OVERLAY */}
      <DCDCTourOverlay
        isOpen={isTourActive}
        onClose={() => setIsTourActive(false)}
        setTopology={setTopology}
        setVin={setVin}
        setDuty={setDuty}
        setFsw={setFsw}
        setInductanceuH={setInductanceuH}
        setCapacitanceuF={setCapacitanceuF}
        setLoadR={setLoadR}
        setActiveFault={setActiveFault}
      />
    </div>
  );
};

export const DCDCConverter = DCDCConverterContent;
export default DCDCConverterContent;
