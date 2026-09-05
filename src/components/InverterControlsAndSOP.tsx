import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Play,
  Gauge,
  BookOpen,
  Zap,
  Info,
  ShieldAlert,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface InverterControlsAndSOPProps {
  Vdc: number;
  setVdc: (v: number) => void;
  ma: number;
  setMa: (m: number) => void;
  f1: number;
  setF1: (f: number) => void;
  fc: number;
  setFc: (f: number) => void;
  inductanceMh: number;
  setInductanceMh: (l: number) => void;
  capacitanceUf: number;
  setCapacitanceUf: (c: number) => void;
  loadR: number;
  setLoadR: (r: number) => void;
  deadTimeUs: number;
  setDeadTimeUs: (t: number) => void;
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
  Vout_rms: number;
  Iout_rms: number;
  Pout: number;
  etaPct: number;
  onOpenSOPDrawer: () => void;
}

export const InverterControlsAndSOP: React.FC<InverterControlsAndSOPProps> = ({
  Vdc,
  setVdc,
  ma,
  setMa,
  f1,
  setF1,
  fc,
  setFc,
  inductanceMh,
  setInductanceMh,
  capacitanceUf,
  setCapacitanceUf,
  loadR,
  setLoadR,
  deadTimeUs,
  setDeadTimeUs,
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
  Vout_rms,
  Iout_rms,
  Pout,
  etaPct,
  onOpenSOPDrawer,
}) => {
  const [activeControlSection, setActiveControlSection] = useState<
    'STATUS' | 'CONTROLS' | 'PARAMS' | 'TELEMETRY' | 'PROTECTION' | 'ALL'
  >('STATUS');
  const [isRamping, setIsRamping] = useState<boolean>(false);

  const handleSoftStart = () => {
    setIsRamping(true);
    setMa(0.1);
    let currentMa = 0.1;
    const interval = setInterval(() => {
      currentMa += 0.1;
      if (currentMa >= 0.8) {
        setMa(0.8);
        setIsRamping(false);
        clearInterval(interval);
      } else {
        setMa(Number(currentMa.toFixed(1)));
      }
    }, 150);
  };

  const fmt = (val: number | undefined | null, decimals = 1, fallback = '0.0'): string => {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(decimals);
  };

  return (
    <div className="flex flex-col gap-2.5 font-mono text-xs w-full">
      {/* SECTION SELECTOR DROPDOWN & QUICK PILLS */}
      <div className="flex flex-col gap-2 p-2.5 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono text-slate-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            Active Control Section Selector:
          </label>
          <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-800">
            NOMINAL 400V DC / 230V AC 50Hz
          </span>
        </div>
        <select
          value={activeControlSection}
          onChange={(e) => setActiveControlSection(e.target.value as any)}
          className="w-full bg-[#0b1426] text-xs sm:text-sm font-mono font-black text-cyan-200 border-2 border-cyan-500/70 hover:border-cyan-400 rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-[0_0_16px_rgba(6,182,212,0.3)] transition-all"
        >
          <option value="STATUS">⚡ 1. System Status &amp; Switchgear Breakers (52-Q1 DC, 52-Q2 AC, 89-Q3 Load)</option>
          <option value="PARAMS">⚙️ 2. Inverter Parameters &amp; Filter Design (Vdc, ma, f1, fc, Lf, Cf, td)</option>
          <option value="PROTECTION">🛡️ 3. Protection, Fault Injection &amp; Soft-Start SOP</option>
          <option value="ALL">🌐 View All Control Sections</option>
        </select>

        {/* Quick Section Navigation Pills - With Names and Symbols */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
          {[
            { id: 'STATUS', icon: '⚡', label: 'Breakers', sub: '52-Q1, 52-Q2, 89-Q3' },
            { id: 'PARAMS', icon: '⚙️', label: 'Parameters', sub: 'Vdc, ma, f1, fc, L, C, td' },
            { id: 'PROTECTION', icon: '🛡️', label: 'Faults & SOP', sub: 'Shoot-Through, SOP' },
            { id: 'ALL', icon: '🌐', label: 'All Sections', sub: 'Complete System' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveControlSection(item.id as any)}
              title={`${item.label} (${item.sub})`}
              className={`p-2 text-left rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer border flex flex-col justify-between shadow-sm min-h-[46px] ${
                activeControlSection === item.id || (activeControlSection === 'CONTROLS' && item.id === 'PARAMS')
                  ? 'bg-cyan-600/50 text-white border-cyan-400 shadow-md scale-[1.02]'
                  : 'bg-[#0b1220] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1 font-extrabold text-slate-100 leading-tight">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <span className="text-[9.5px] text-cyan-300/80 font-normal leading-tight truncate">
                {item.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: SYSTEM STATUS & SWITCHGEAR BREAKERS */}
      {(activeControlSection === 'STATUS' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              Switchgear Breaker Control Panel
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-bold">
              3 Breakers
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* 52-Q1 DC Input Breaker */}
            <button
              type="button"
              onClick={() => setQ1Closed(!q1Closed)}
              className={`p-2 rounded-xl border-2 font-bold transition-all cursor-pointer ${
                q1Closed
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <span className="text-[10px] block text-slate-400">52-Q1 DC INPUT</span>
              <span className="text-xs font-black">{q1Closed ? 'CLOSED' : 'TRIPPED'}</span>
            </button>

            {/* 52-Q2 AC Output Breaker */}
            <button
              type="button"
              onClick={() => setQ2Closed(!q2Closed)}
              className={`p-2 rounded-xl border-2 font-bold transition-all cursor-pointer ${
                q2Closed
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <span className="text-[10px] block text-slate-400">52-Q2 AC OUTPUT</span>
              <span className="text-xs font-black">{q2Closed ? 'CLOSED' : 'OPEN'}</span>
            </button>

            {/* 89-Q3 Load Disconnector */}
            <button
              type="button"
              onClick={() => setQ3Closed(!q3Closed)}
              className={`p-2 rounded-xl border-2 font-bold transition-all cursor-pointer ${
                q3Closed
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <span className="text-[10px] block text-slate-400">89-Q3 LOAD</span>
              <span className="text-xs font-black">{q3Closed ? 'CLOSED' : 'OPEN'}</span>
            </button>
          </div>
        </div>
      )}

      {/* UNIFIED SECTION 2: CONTROL PARAMETERS & FILTER DESIGN */}
      {(activeControlSection === 'PARAMS' || activeControlSection === 'CONTROLS' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              ⚙️ Control Parameters &amp; Filter Design
            </span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-bold">
              All Parameters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {/* DC Voltage Vdc */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">DC Bus Voltage (Vdc / Supply):</span>
                <span className="text-cyan-300 font-extrabold">{Vdc} V DC</span>
              </div>
              <input
                type="range"
                min={100}
                max={800}
                step={10}
                value={Vdc}
                onChange={(e) => setVdc(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Modulation Index ma */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">Modulation Index (ma / SPWM Depth):</span>
                <span className="text-amber-300 font-extrabold">{ma} ({mode})</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3.0}
                step={0.05}
                value={ma}
                onChange={(e) => setMa(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Fundamental Frequency f1 */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">Fundamental AC Frequency (f1 / Line Rate):</span>
                <span className="text-emerald-400 font-extrabold">{f1} Hz</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={1}
                value={f1}
                onChange={(e) => setF1(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Carrier Frequency fc */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">Carrier Switching Frequency (fc / PWM Clock):</span>
                <span className="text-purple-300 font-extrabold">{fc / 1000} kHz (mf={Math.round(fc/f1)})</span>
              </div>
              <input
                type="range"
                min={1000}
                max={20000}
                step={500}
                value={fc}
                onChange={(e) => setFc(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Filter Inductance Lf */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">LC Choke Inductance (Lf / Energy Choke):</span>
                <span className="text-emerald-400 font-extrabold">{inductanceMh} mH</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={10.0}
                step={0.1}
                value={inductanceMh}
                onChange={(e) => setInductanceMh(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Filter Capacitance Cf */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">LC Cap Capacitance (Cf / Harmonic Filter):</span>
                <span className="text-cyan-300 font-extrabold">{capacitanceUf} µF</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={capacitanceUf}
                onChange={(e) => setCapacitanceUf(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Dead Time t_d */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">Bridge Dead-Time (td / Anti-Shoot-Through):</span>
                <span className="text-amber-300 font-extrabold">{deadTimeUs} µs</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={10.0}
                step={0.5}
                value={deadTimeUs}
                onChange={(e) => setDeadTimeUs(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Load Resistance R */}
            <div className="flex flex-col gap-0.5 p-2 bg-[#0b1220] rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">AC Substation Load Resistance (RL):</span>
                <span className="text-cyan-300 font-extrabold">{loadR} Ω ({fmt(Pout, 0)}W)</span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={1}
                value={loadR}
                onChange={(e) => setLoadR(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}


      {/* SECTION 5: PROTECTION & FAULT INJECTION */}
      {(activeControlSection === 'PROTECTION' || activeControlSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Real Fault Injection Lab &amp; SOP Soft-Start
            </span>
          </div>

          {/* Fault Injection Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'S1_OPEN', label: '🔥 S1 MOSFET Open' },
              { id: 'S1_SHORT', label: '⚡ S1 Short (Shoot-thru)' },
              { id: 'DEADTIME_ZERO', label: '🚨 Zero Dead Time' },
              { id: 'CARRIER_MISMATCH', label: '📐 Carrier Mismatch' },
              { id: 'DC_UNDERVOLTAGE', label: '🔋 DC Sag (-40%)' },
              { id: 'LC_RESONANCE', label: '🌊 LC Resonance Ringing' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFault(activeFault === f.id ? null : f.id)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                  activeFault === f.id
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md scale-102'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {activeFault && (
            <button
              type="button"
              onClick={() => setActiveFault(null)}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CLEAR ACTIVE FAULT &amp; RESET INVERTER</span>
            </button>
          )}

          {/* SOP Soft-Start Button */}
          <button
            type="button"
            onClick={handleSoftStart}
            disabled={isRamping}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isRamping ? 'RAMPING SPWM MODULATION...' : 'START SPWM SOFT-START RAMP (0.1 → 0.8 ma)'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default InverterControlsAndSOP;
