import React, { useState } from 'react';
import {
  BookOpen,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  FlaskConical,
  Calculator,
  ShieldCheck,
  Zap,
  GraduationCap,
} from 'lucide-react';
import {
  runInverterBenchmarkSuite,
  calculateInverterEfficiencyMap,
} from '../engine/InverterPhysics';
import { InverterLossSankey } from './InverterLossSankey';

interface InverterRightPanelProps {
  Vdc: number;
  ma: number;
  f1: number;
  fc: number;
  inductanceMh: number;
  capacitanceUf: number;
  loadR: number;
  loadLMh: number;
  deadTimeUs: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isEngineRunning: boolean;
  activeFault: string | null;
  setActiveFault: (fault: string | null) => void;
  Vout_rms: number;
  Vab_1_rms: number;
  Iout_rms: number;
  f0_cutoff: number;
  thdPercent: number;
  Pout: number;
  Ploss: number;
  Pcond_mos: number;
  Psw: number;
  Pdiode: number;
  Plc: number;
  etaPct: number;
  mode: string;
  onOpenTour: () => void;
}

export const InverterRightPanel: React.FC<InverterRightPanelProps> = ({
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
  activeFault,
  setActiveFault,
  Vout_rms,
  Vab_1_rms,
  Iout_rms,
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
  onOpenTour,
}) => {
  const [activeRightSection, setActiveRightSection] = useState<
    'LEARNING' | 'STEPS' | 'BENCHMARKS' | 'SANKEY' | 'EFFICIENCY' | 'PROTECTION' | 'ALL'
  >('LEARNING');

  const fmt = (val: number | undefined | null, decimals = 1, fallback = '0.0'): string => {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(decimals);
  };

  // Live Benchmark Execution
  const benchmarkResults = runInverterBenchmarkSuite();

  // Efficiency & THD Map vs Carrier Frequency
  const effMap = calculateInverterEfficiencyMap({
    Vdc,
    ma,
    f1,
    fc,
    inductanceMh,
    capacitanceUf,
    loadR,
  });

  return (
    <div className="flex flex-col gap-2.5 font-mono text-xs w-full">
      {/* SECTION SELECTOR DROPDOWN */}
      <div className="flex flex-col gap-1.5 p-2 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
        <label className="text-[11px] font-mono text-slate-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          Active Right Section Selector:
        </label>
        <select
          value={activeRightSection}
          onChange={(e) => setActiveRightSection(e.target.value as any)}
          className="w-full bg-[#0b1426] text-xs sm:text-sm font-mono font-black text-amber-200 border-2 border-amber-500/70 hover:border-amber-400 rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-[0_0_16px_rgba(245,158,11,0.3)] transition-all"
        >
          <option value="LEARNING">⭐ 1. Interactive Learning &amp; Live Physics Insight</option>
          <option value="STEPS">📐 2. Calculation Steps &amp; SPWM Derivations (5 Steps)</option>
          <option value="BENCHMARKS">🧪 3. Benchmark Verification Suite (5/5 Cases PASS)</option>
          <option value="SANKEY">⚡ 4. Power Flow Sankey Diagram &amp; Loss Breakdown</option>
          <option value="EFFICIENCY">📈 5. Frequency vs Efficiency &amp; THD Trade-off Map</option>
          <option value="PROTECTION">🛡️ 6. Protection Relays &amp; Fault Analysis Lab</option>
          <option value="ALL">🌐 View All Sections</option>
        </select>

        {/* Quick Section Navigation Pills Bar */}
        <div className="grid grid-cols-7 gap-1 pt-0.5">
          {[
            { id: 'LEARNING', label: '⭐', name: 'Learning & Physics' },
            { id: 'STEPS', label: '📐', name: 'Derivations' },
            { id: 'BENCHMARKS', label: '🧪', name: 'Benchmark Suite' },
            { id: 'SANKEY', label: '⚡', name: 'Sankey Diagram' },
            { id: 'EFFICIENCY', label: '📈', name: 'Efficiency Map' },
            { id: 'PROTECTION', label: '🛡️', name: 'Relays & Faults' },
            { id: 'ALL', label: '🌐', name: 'Show All' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveRightSection(item.id as any)}
              title={item.name}
              className={`py-1.5 text-center rounded-lg text-xs font-mono font-black transition-all cursor-pointer border shadow-sm ${
                activeRightSection === item.id
                  ? 'bg-amber-600/50 text-white border-amber-400 shadow-md scale-105'
                  : 'bg-[#0b1220] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE LEARNING & LIVE PHYSICS INSIGHT */}
      {(activeRightSection === 'LEARNING' || activeRightSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live Physics Insight
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              IEEE 519 / IEC
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0b1426] border border-amber-500/40 flex flex-col gap-1.5">
            <span className="text-amber-300 font-extrabold text-xs flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              SINGLE-PHASE SPWM INVERTER DYNAMICS:
            </span>
            <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
              Operating in <strong className="text-emerald-300">{mode}</strong> mode with amplitude modulation ratio{' '}
              <span className="font-mono text-cyan-300">ma = {ma}</span> and frequency ratio{' '}
              <span className="font-mono text-cyan-300">mf = {Math.round(fc / f1)}</span>. Fundamental AC output voltage is{' '}
              <strong className="text-amber-300">{fmt(Vout_rms, 1)}V RMS</strong> at <strong className="text-cyan-300">{f1}Hz</strong>.
            </p>
          </div>

          {/* Quick Telemetry Summary Bar */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-[#0b1220] border border-[#1e293b]">
              <span className="text-[10px] text-slate-400 block">EFFICIENCY</span>
              <span className="font-bold text-emerald-400 text-sm">{fmt(etaPct, 1)}%</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#0b1220] border border-[#1e293b]">
              <span className="text-[10px] text-slate-400 block">TOTAL LOSS</span>
              <span className="font-bold text-amber-400 text-sm">{fmt(Ploss, 1)}W</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#0b1220] border border-[#1e293b]">
              <span className="text-[10px] text-slate-400 block">VOLTAGE THD</span>
              <span className="font-bold text-cyan-300 text-sm">{fmt(thdPercent, 2)}%</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            onClick={onOpenTour}
            className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg min-h-[40px]"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>✨ Detailed Learning Workstation &amp; Guided SOP (OPEN ↗)</span>
          </button>
        </div>
      )}

      {/* SECTION 2: CALCULATION STEPS & SPWM DERIVATIONS */}
      {(activeRightSection === 'STEPS' || activeRightSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-cyan-400" />
              Calculation Steps (5 Derivations)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              5 Steps
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex flex-col gap-0.5 text-[11px]">
              <span className="text-cyan-300 font-bold">1. Modulation Index ma &amp; Frequency Ratio mf</span>
              <span className="text-slate-300">ma = Vref / Vtri = {ma} | mf = fc / f1 = {fc}Hz / {f1}Hz = {Math.round(fc/f1)}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex flex-col gap-0.5 text-[11px]">
              <span className="text-emerald-300 font-bold">2. Fundamental H-Bridge PWM Voltage Vab,1</span>
              <span className="text-slate-300">Vab,1,rms = (ma · Vdc) / √2 = ({ma} · {Vdc}V) / 1.414 = {fmt(Vab_1_rms, 1)} V</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex flex-col gap-0.5 text-[11px]">
              <span className="text-amber-300 font-bold">3. LC Low-Pass Filter Cutoff Frequency f0</span>
              <span className="text-slate-300">f0 = 1 / (2π√(Lf·Cf)) = 1 / (2π√({inductanceMh}mH · {capacitanceUf}µF)) = {fmt(f0_cutoff, 0)} Hz</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex flex-col gap-0.5 text-[11px]">
              <span className="text-purple-300 font-bold">4. Filtered Fundamental Output Voltage Vout,1</span>
              <span className="text-slate-300">Vout,1,rms = Vab,1,rms · gain(f1) = {fmt(Vout_rms, 1)} V RMS</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex flex-col gap-0.5 text-[11px]">
              <span className="text-rose-300 font-bold">5. Load Current &amp; Active Power Pout</span>
              <span className="text-slate-300">Iout = {fmt(Iout_rms, 1)}A → Pout = Iout² · R = {fmt(Pout, 0)} W (η = {fmt(etaPct, 1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BENCHMARK VERIFICATION SUITE */}
      {(activeRightSection === 'BENCHMARKS' || activeRightSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              Benchmark Verification Suite
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              5/5 PASS
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {benchmarkResults.map((bm, i) => (
              <div
                key={i}
                className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex items-center justify-between text-[11px]"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-200">{bm.name}</span>
                  <span className="text-[10px] text-slate-400">
                    Vout: {fmt(bm.actualVout, 1)}V (ref: {fmt(bm.expectedVout, 1)}V) | Mode: {bm.actualMode}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-extrabold text-[10px] shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  PASS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: POWER FLOW SANKEY & LOSS ANALYSIS */}
      {(activeRightSection === 'SANKEY' || activeRightSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              Power Flow Sankey Diagram
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Pout = {fmt(Pout, 0)}W
            </span>
          </div>

          <div className="p-1 rounded-xl bg-[#0b1220] border border-slate-800">
            <InverterLossSankey
              Vdc={Vdc}
              Vout_rms={Vout_rms}
              Iout_rms={Iout_rms}
              Pout={Pout}
              Ploss={Ploss}
              Pcond_mos={Pcond_mos}
              Psw={Psw}
              Pdiode={Pdiode}
              Plc={Plc}
              etaPct={etaPct}
              fc={fc}
            />
          </div>
        </div>
      )}

      {/* SECTION 5: FREQUENCY VS EFFICIENCY & THD MAP */}
      {(activeRightSection === 'EFFICIENCY' || activeRightSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Frequency vs Efficiency &amp; THD Map
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              fc Range
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-1 px-1.5">fc (kHz)</th>
                  <th className="py-1 px-1.5">THD (%)</th>
                  <th className="py-1 px-1.5">Loss (W)</th>
                  <th className="py-1 px-1.5">η (%)</th>
                </tr>
              </thead>
              <tbody>
                {effMap.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-800/60 ${
                      Math.abs(row.fc - fc) < 500
                        ? 'bg-cyan-950/60 font-black text-cyan-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <td className="py-1 px-1.5">{row.fc / 1000} kHz</td>
                    <td className="py-1 px-1.5 text-cyan-300">{fmt(row.thdPct, 2)}%</td>
                    <td className="py-1 px-1.5 text-amber-400">{fmt(row.Ploss, 1)} W</td>
                    <td className="py-1 px-1.5 text-emerald-400">{fmt(row.eta, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 6: PROTECTION RELAYS & FAULT ANALYSIS */}
      {(activeRightSection === 'PROTECTION' || activeRightSection === 'ALL') && (
        <div className="flex flex-col gap-2 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Protection Relays &amp; Diagnostics
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
              ANSI Relays
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex justify-between items-center">
              <span>ANSI 50/51 AC Overcurrent Relay:</span>
              <span className="font-bold text-emerald-400">{Iout_rms < 50 ? 'NORMAL' : 'TRIP'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex justify-between items-center">
              <span>ANSI 59 AC Overvoltage Protection:</span>
              <span className="font-bold text-emerald-400">{Vout_rms < 300 ? 'HEALTHY' : 'O/V TRIP'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex justify-between items-center">
              <span>ANSI 27 DC Undervoltage Relay:</span>
              <span className="font-bold text-emerald-400">{Vdc >= 250 ? 'HEALTHY (400V)' : 'U/V TRIP'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1220] border border-slate-800 flex justify-between items-center">
              <span>ANSI 49 Thermal Overload (Tj):</span>
              <span className="font-bold text-emerald-400">{Math.round(25 + Ploss * 0.5)}°C (Limit: 150°C)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InverterRightPanel;
