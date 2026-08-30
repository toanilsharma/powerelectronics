import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Play,
  Gauge,
  BookOpen,
  Zap,
  Info,
  X,
  Power,
  Sliders,
  Activity,
  ShieldAlert,
  ChevronDown,
  Maximize2,
  TrendingUp,
  Minus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface DCDCControlsAndSOPProps {
  topology: string;
  Vin: number;
  setVin: (v: number) => void;
  duty: number;
  setDuty: (d: number) => void;
  fsw: number;
  setFsw: (f: number) => void;
  inductanceuH: number;
  setInductanceuH: (l: number) => void;
  capacitanceuF: number;
  setCapacitanceuF: (c: number) => void;
  loadR: number;
  setLoadR: (r: number) => void;
  q1Closed: boolean;
  setQ1Closed: (closed: boolean) => void;
  q2Closed: boolean;
  setQ2Closed: (closed: boolean) => void;
  q3Closed: boolean;
  setQ3Closed: (closed: boolean) => void;
  isEngineRunning: boolean;
  activeFault: string | null;
  setActiveFault: (fault: string | null) => void;
  mode: string;
  deltaIL: number;
  deltaVout: number;
  Vout: number;
  Iout: number;
  Pout: number;
  etaPct: number;
  onOpenSOPDrawer: () => void;
  learnMode?: boolean;
}

interface TooltipInfo {
  title: string;
  unit: string;
  meaning: string;
  affects: string;
  safeRange: string;
}

const CONTROL_TOOLTIPS: Record<string, TooltipInfo> = {
  duty: {
    title: 'Duty Cycle (D)',
    unit: '%',
    meaning: 'Percentage of switching period Tsw during which high-side MOSFET S1 stays CLOSED (ON).',
    affects: 'Directly sets ideal output voltage Vout. Higher duty increases Vout.',
    safeRange: '10% to 90% (extreme >90% risks thermal runaway & magnetics saturation)',
  },
  fsw: {
    title: 'Switching Frequency (fsw)',
    unit: 'kHz',
    meaning: 'Rate of PWM gate pulse generation per second.',
    affects: 'Higher fsw reduces inductor ripple ΔIL & filter size, but increases MOSFET switching loss Psw.',
    safeRange: '20 kHz to 200 kHz (Silicon MOSFET standard)',
  },
  vin: {
    title: 'Input Voltage (Vin)',
    unit: 'V DC',
    meaning: 'Primary DC voltage supplied from battery array or rectifier.',
    affects: 'Infeed voltage level and semiconductor peak voltage stress.',
    safeRange: '12V to 400V DC',
  },
  inductance: {
    title: 'Filter Inductance (L)',
    unit: 'µH',
    meaning: 'Energy storage choke inductance value.',
    affects: 'Limits current slew rate di/dt and peak-to-peak inductor current ripple ΔIL.',
    safeRange: '10 µH to 1000 µH',
  },
  capacitance: {
    title: 'Filter Capacitance (C)',
    unit: 'µF',
    meaning: 'Output filter capacitor energy storage rating.',
    affects: 'Attenuates output voltage ripple ΔVout and holds voltage during load steps.',
    safeRange: '100 µF to 2000 µF',
  },
  load: {
    title: 'Load Resistance (R)',
    unit: 'Ω',
    meaning: 'Electrical resistance of connected DC load equipment.',
    affects: 'Sets load current Iout = Vout / R. High R (>100Ω) transitions converter into DCM mode.',
    safeRange: '1 Ω (Heavy Load) to 100 Ω (Light Load)',
  },
};

export const DCDCControlsAndSOP: React.FC<DCDCControlsAndSOPProps> = ({
  topology,
  Vin,
  setVin,
  duty,
  setDuty,
  fsw,
  setFsw,
  inductanceuH,
  setInductanceuH,
  capacitanceuF,
  setCapacitanceuF,
  loadR,
  setLoadR,
  q1Closed,
  setQ1Closed,
  q2Closed,
  setQ2Closed,
  q3Closed,
  setQ3Closed,
  isEngineRunning,
  activeFault,
  setActiveFault,
  mode,
  deltaIL,
  deltaVout,
  Vout,
  Iout,
  Pout,
  etaPct,
  onOpenSOPDrawer,
  learnMode = true,
}) => {
  const [activeControlSection, setActiveControlSection] = useState<
    'STATUS' | 'CONTROLS' | 'PARAMS' | 'TELEMETRY' | 'PROTECTION' | 'ALL'
  >('STATUS');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isRamping, setIsRamping] = useState<boolean>(false);

  const handleSoftStart = () => {
    setIsRamping(true);
    setDuty(5);
    let currentD = 5;
    const interval = setInterval(() => {
      currentD += 5;
      if (currentD >= 40) {
        setDuty(40);
        setIsRamping(false);
        clearInterval(interval);
      } else {
        setDuty(currentD);
      }
    }, 120);
  };

  const renderTooltipButton = (key: string) => {
    if (!learnMode) return null;
    return (
      <button
        type="button"
        onClick={() => setActiveTooltip(activeTooltip === key ? null : key)}
        className="ml-1 p-0.5 text-cyan-400 hover:text-cyan-200 cursor-pointer inline-flex items-center"
        title="View Engineering Explanation & Safe Limits"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    );
  };

  const Vout_abs = Math.abs(Vout);

  return (
    <div className="flex flex-col gap-2.5 font-mono text-xs w-full">
      {/* SECTION SELECTOR DROPDOWN (ETAP / MATLAB GRADE DOUBLE-SIZE WITH HIGH-VISIBILITY GLOW) */}
      <div className="flex flex-col gap-1.5 p-2 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
        <label className="text-[11px] font-mono text-slate-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          Active Control Section Selector:
        </label>
        <select
          value={activeControlSection}
          onChange={(e) => setActiveControlSection(e.target.value as any)}
          className="w-full bg-[#0b1426] text-xs sm:text-sm font-mono font-black text-cyan-200 border-2 border-cyan-500/70 hover:border-cyan-400 rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-[0_0_16px_rgba(6,182,212,0.3)] transition-all"
        >
          <option value="STATUS">⚡ 1. System Status &amp; Switchgear Breakers (52-Q1, 52-Q2, 89-Q3)</option>
          <option value="CONTROLS">🎛️ 2. Converter Parameters (Duty Cycle D &amp; Frequency fsw)</option>
          <option value="PARAMS">⚙️ 3. Passives &amp; Filter Design (Inductor L &amp; Capacitor C)</option>
          <option value="TELEMETRY">📊 4. DC Bus &amp; Dynamic Load Demand (Resistance R &amp; Power Pout)</option>
          <option value="PROTECTION">🛡️ 5. Protection, Fault Injection &amp; Soft-Start SOP</option>
          <option value="ALL">🌐 View All Sections</option>
        </select>

        {/* Quick Section Navigation Pills Bar */}
        <div className="grid grid-cols-6 gap-1 pt-0.5">
          {[
            { id: 'STATUS', label: '⚡', name: 'Status & Breakers' },
            { id: 'CONTROLS', label: '🎛️', name: 'Duty & Freq' },
            { id: 'PARAMS', label: '⚙️', name: 'L & C Filter' },
            { id: 'TELEMETRY', label: '📊', name: 'DC Telemetry' },
            { id: 'PROTECTION', label: '🛡️', name: 'Faults & SOP' },
            { id: 'ALL', label: '🌐', name: 'Show All' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveControlSection(item.id as any)}
              title={item.name}
              className={`py-1.5 text-center rounded-lg text-xs font-mono font-black transition-all cursor-pointer border shadow-sm ${
                activeControlSection === item.id
                  ? 'bg-cyan-600/50 text-white border-cyan-400 shadow-md scale-105'
                  : 'bg-[#0b1220] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* POP-OVER TOOLTIP CARD IF OPEN */}
      {activeTooltip && CONTROL_TOOLTIPS[activeTooltip] && (
        <div className="p-2.5 bg-[#0b1426] border-2 border-cyan-400 rounded-xl shadow-xl flex flex-col gap-1 text-[11px] animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1">
            <span className="font-extrabold text-cyan-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              {CONTROL_TOOLTIPS[activeTooltip].title}
            </span>
            <button
              onClick={() => setActiveTooltip(null)}
              className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="text-slate-200 leading-snug">
            <strong className="text-amber-300">Meaning:</strong> {CONTROL_TOOLTIPS[activeTooltip].meaning}
          </div>
          <div className="text-slate-200 leading-snug">
            <strong className="text-emerald-300">Impact:</strong> {CONTROL_TOOLTIPS[activeTooltip].affects}
          </div>
          <div className="text-slate-300 text-[10px] bg-[#070b14] px-2 py-0.5 rounded border border-slate-800">
            <strong>Safe Range:</strong> {CONTROL_TOOLTIPS[activeTooltip].safeRange}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: SYSTEM STATUS & SWITCHGEAR BREAKERS */}
      {/* ========================================================================= */}
      {(activeControlSection === 'STATUS' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Power className="w-4 h-4 text-emerald-400" />
              System Status &amp; Breakers
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                activeFault
                  ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                  : isEngineRunning
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {activeFault ? 'FAULT' : isEngineRunning ? 'NORMAL' : 'STOPPED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-[#0b1220] border border-[#1e293b] flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] font-bold">DC INFEED (Vin)</span>
              <span className="text-cyan-300 font-extrabold text-sm">{Vin} V DC</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0b1220] border border-[#1e293b] flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] font-bold">OPERATING MODE</span>
              <span
                className={`font-extrabold text-sm ${
                  mode === 'CCM' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {mode}
              </span>
            </div>
          </div>

          {/* Interactive Breaker Switches (BIG BUTTONS WITH HIGH CONTRAST) */}
          <div className="flex flex-col gap-1 pt-1.5 border-t border-[#1e293b]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Switchgear Breakers (Click to Toggle)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setQ1Closed(!q1Closed)}
                className={`p-2 text-center rounded-xl border-2 text-xs font-black transition-all cursor-pointer shadow-md flex flex-col items-center gap-0.5 min-h-[44px] ${
                  q1Closed
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                }`}
              >
                <span>52-Q1</span>
                <span className="text-[10px] uppercase font-mono">{q1Closed ? 'CLOSED' : 'OPEN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setQ2Closed(!q2Closed)}
                className={`p-2 text-center rounded-xl border-2 text-xs font-black transition-all cursor-pointer shadow-md flex flex-col items-center gap-0.5 min-h-[44px] ${
                  q2Closed
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                }`}
              >
                <span>52-Q2</span>
                <span className="text-[10px] uppercase font-mono">{q2Closed ? 'CLOSED' : 'OPEN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setQ3Closed(!q3Closed)}
                className={`p-2 text-center rounded-xl border-2 text-xs font-black transition-all cursor-pointer shadow-md flex flex-col items-center gap-0.5 min-h-[44px] ${
                  q3Closed
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                }`}
              >
                <span>89-Q3</span>
                <span className="text-[10px] uppercase font-mono">{q3Closed ? 'CLOSED' : 'OPEN'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSOPDrawer}
            className="w-full mt-1 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-cyan-300 border border-cyan-500/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[36px]"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Switchgear Drawer &amp; SOP Panel</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CONVERTER PARAMETERS (DUTY & FREQUENCY) */}
      {/* ========================================================================= */}
      {(activeControlSection === 'CONTROLS' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Converter Parameters
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              D = {duty}%
            </span>
          </div>

          {/* Duty Cycle Slider & Presets */}
          <div className="flex flex-col gap-1 p-2 bg-[#0b1220] rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center">
                Duty Cycle (D) {renderTooltipButton('duty')}
              </span>
              <span className="text-cyan-300 font-extrabold text-sm">{duty} %</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              step="1"
              value={duty}
              onChange={(e) => setDuty(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 my-1"
            />
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[20, 40, 60, 80].map((dVal) => (
                <button
                  key={dVal}
                  type="button"
                  onClick={() => setDuty(dVal)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    duty === dVal
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {dVal}%
                </button>
              ))}
            </div>
          </div>

          {/* Switching Frequency Slider & Presets */}
          <div className="flex flex-col gap-1 p-2 bg-[#0b1220] rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center">
                Switching Freq (fsw) {renderTooltipButton('fsw')}
              </span>
              <span className="text-amber-300 font-extrabold text-sm">{(fsw / 1000).toFixed(0)} kHz</span>
            </div>
            <input
              type="range"
              min="20000"
              max="200000"
              step="5000"
              value={fsw}
              onChange={(e) => setFsw(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 my-1"
            />
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[20000, 50000, 100000, 200000].map((fVal) => (
                <button
                  key={fVal}
                  type="button"
                  onClick={() => setFsw(fVal)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    fsw === fVal
                      ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {fVal / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* Input Voltage Slider */}
          <div className="flex flex-col gap-1 p-2 bg-[#0b1220] rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center">
                Input Voltage (Vin) {renderTooltipButton('vin')}
              </span>
              <span className="text-emerald-400 font-extrabold text-sm">{Vin} V</span>
            </div>
            <input
              type="range"
              min="12"
              max="400"
              step="2"
              value={Vin}
              onChange={(e) => setVin(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 my-1"
            />
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[24, 48, 110, 400].map((vVal) => (
                <button
                  key={vVal}
                  type="button"
                  onClick={() => setVin(vVal)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    Vin === vVal
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {vVal}V
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PASSIVES & FILTER DESIGN (INDUCTOR L & CAPACITOR C) */}
      {/* ========================================================================= */}
      {(activeControlSection === 'PARAMS' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Passives &amp; Filter Design
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              LC Filter
            </span>
          </div>

          {/* Inductance L Slider & Presets */}
          <div className="flex flex-col gap-1 p-2 bg-[#0b1220] rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center">
                Filter Inductor (L) {renderTooltipButton('inductance')}
              </span>
              <span className="text-emerald-400 font-extrabold text-sm">{inductanceuH} µH</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={inductanceuH}
              onChange={(e) => setInductanceuH(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 my-1"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 pb-0.5">
              <span>Inductor Current Ripple ΔIL:</span>
              <span className="font-bold text-cyan-300">{deltaIL.toFixed(2)} A</span>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[50, 100, 250, 500].map((lVal) => (
                <button
                  key={lVal}
                  type="button"
                  onClick={() => setInductanceuH(lVal)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    inductanceuH === lVal
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {lVal}µH
                </button>
              ))}
            </div>
          </div>

          {/* Capacitance C Slider & Presets */}
          <div className="flex flex-col gap-1 p-2 bg-[#0b1220] rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center">
                Filter Capacitor (C) {renderTooltipButton('capacitance')}
              </span>
              <span className="text-cyan-300 font-extrabold text-sm">{capacitanceuF} µF</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={capacitanceuF}
              onChange={(e) => setCapacitanceuF(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 my-1"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 pb-0.5">
              <span>Output Voltage Ripple ΔVout:</span>
              <span className="font-bold text-amber-300">{(deltaVout * 1000).toFixed(1)} mV</span>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[220, 470, 1000, 2000].map((cVal) => (
                <button
                  key={cVal}
                  type="button"
                  onClick={() => setCapacitanceuF(cVal)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    capacitanceuF === cVal
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {cVal}µF
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: DC BUS & DYNAMIC LOAD DEMAND */}
      {/* ========================================================================= */}
      {(activeControlSection === 'TELEMETRY' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              DC Bus &amp; Dynamic Load
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
              {Vout_abs.toFixed(1)}V DC
            </span>
          </div>

          {/* 2x2 Telemetry Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-[#0b1220] border border-[#1e293b] flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">VOUT VOLTAGE</span>
              <span className="text-emerald-400 font-black text-base">{Vout_abs.toFixed(2)} V</span>
              <span className="text-[9px] text-slate-400">Ripple: {(deltaVout * 1000).toFixed(0)}mV</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0b1220] border border-[#1e293b] flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">IOUT CURRENT</span>
              <span className="text-cyan-300 font-black text-base">{Iout.toFixed(2)} A</span>
              <span className="text-[9px] text-slate-400">Power: {Pout.toFixed(0)}W</span>
            </div>
          </div>

          {/* Load Resistance Slider & Presets */}
          <div className="flex flex-col gap-1 p-2 bg-[#0b1220] rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center">
                Load Resistance (R) {renderTooltipButton('load')}
              </span>
              <span className="text-amber-300 font-extrabold text-sm">{loadR} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={loadR}
              onChange={(e) => setLoadR(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 my-1"
            />
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[2, 5, 10, 25].map((rVal) => (
                <button
                  key={rVal}
                  type="button"
                  onClick={() => setLoadR(rVal)}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    loadR === rVal
                      ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {rVal}Ω
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: PROTECTION, FAULT INJECTION & SOFT-START SOP */}
      {/* ========================================================================= */}
      {(activeControlSection === 'PROTECTION' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Protection &amp; Fault Trainer
            </span>
            {activeFault ? (
              <button
                type="button"
                onClick={() => setActiveFault(null)}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white cursor-pointer"
              >
                CLEAR FAULT
              </button>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                HEALTHY
              </span>
            )}
          </div>

          {/* Walk-in Soft Start Button */}
          <button
            type="button"
            onClick={handleSoftStart}
            disabled={isRamping}
            className="w-full py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/60 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[40px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isRamping ? 'RAMPING (SOFT-START)...' : '▶ WALK-IN SOFT START RAMP (10s)'}</span>
          </button>

          {/* Fault Injection Buttons */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Inject Fault Mode:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'S1_OPEN', label: 'S1 Open Circuit' },
                { id: 'S1_SHORT', label: 'S1 Short Circuit' },
                { id: 'DIODE_OPEN', label: 'Diode Open (Spike)' },
                { id: 'L_SAT', label: 'Inductor Saturation' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFault(activeFault === f.id ? null : f.id)}
                  className={`p-2 rounded-lg text-left text-[11px] font-bold border transition-all cursor-pointer min-h-[40px] flex items-center justify-between ${
                    activeFault === f.id
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md font-black'
                      : 'bg-[#0b1220] text-slate-300 border-[#1e293b] hover:bg-slate-800'
                  }`}
                >
                  <span>{f.label}</span>
                  {activeFault === f.id && <span className="text-[9px]">ACTIVE</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DCDCControlsAndSOP;
