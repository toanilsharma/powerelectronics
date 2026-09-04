import React from 'react';
import {
  Play,
  Info,
  ChevronRight,
  Zap,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Cpu
} from 'lucide-react';
import { TopologyPreviewSVG } from './TopologyPreviewSVG';

export interface MatrixSimItem {
  id: string;
  tabName: string;
  title: string;
  voltage: string;
  categoryBadge: string;
  difficulty: string;
  standards: string[];
  colorTheme: string;
  description: string;
  specSummary: string;
}

interface EngineeringMatrixTableProps {
  simulators: MatrixSimItem[];
  isDarkMode: boolean;
  onLaunchSim: (id: string) => void;
  onOpenSpecs: (sim: MatrixSimItem) => void;
  launchingSimId: string | null;
}

const TOPOLOGY_PARAMETRIC_DATA: Record<
  string,
  { infeed: string; output: string; solver: string; controlMethod: string }
> = {
  'foundation-lab': {
    infeed: '3Φ 415VAC 50Hz (Grid)',
    output: '0 – 560VDC Controllable',
    solver: 'RK4 ODE (5ms step)',
    controlMethod: 'Phase Angle α (0°–150°)'
  },
  'single-charger': {
    infeed: '3Φ 415VAC 50Hz (MCCB)',
    output: '220VDC (Float 242V / Boost 260V)',
    solver: 'CC-CV Adaptive ODE',
    controlMethod: 'Dual Stage Voltage Loop'
  },
  'dual-charger': {
    infeed: 'Dual 2x 415VAC Feeders',
    output: '220VDC Bus A + Bus B Interlocked',
    solver: 'Coupled Bus ODE + 64G Earth Relay',
    controlMethod: '52-BC Auto-Throwover Interlock'
  },
  'static-switch': {
    infeed: 'Dual 415VAC Preferred & Alternate',
    output: '415VAC Continuous Power',
    solver: 'Sub-cycle Waveform Tracking',
    controlMethod: '<4ms Synchronized SCR Gate'
  },
  'soft-starter': {
    infeed: '3Φ 415VAC / 6.6kV MV Infeed',
    output: 'Soft Voltage Ramp to Induction Motor',
    solver: 'Dynamic Motor Torque-Speed ODE',
    controlMethod: 'SCR Voltage Ramp + Bypass 52-BP'
  },
  'harmonics': {
    infeed: '3Φ 415VAC Distorted Feeder',
    output: 'Filtered Clean PCC Bus (<5% THD)',
    solver: '50th Order Discrete FFT + APF',
    controlMethod: 'Tuned LC + Shunt Current Injection'
  },
  'dc-dc-converter': {
    infeed: '12V – 400V DC Source Bus',
    output: 'Buck / Boost / Buck-Boost Variable',
    solver: 'CCM/DCM State-Space Solver',
    controlMethod: 'PWM Duty Cycle D (0.05–0.95)'
  },
  'single-phase-inverter': {
    infeed: '400V DC Regulated Bus',
    output: '230VAC 50Hz Pure Sine Wave',
    solver: 'Fixed-step 10µs SPWM Numerical',
    controlMethod: 'SPWM (ma 0.1–1.2, mf 9–45)'
  }
};

export default function EngineeringMatrixTable({
  simulators,
  isDarkMode,
  onLaunchSim,
  onOpenSpecs,
  launchingSimId
}: EngineeringMatrixTableProps) {
  const themeMap: Record<string, { badge: string; btn: string }> = {
    emerald: {
      badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
      btn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
    },
    amber: {
      badge: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
      btn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
    },
    yellow: {
      badge: 'bg-yellow-950/80 text-yellow-300 border-yellow-800/60',
      btn: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-bold'
    },
    blue: {
      badge: 'bg-blue-950/80 text-blue-400 border-blue-800/60',
      btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
    },
    indigo: {
      badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      btn: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white'
    },
    rose: {
      badge: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
      btn: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white'
    },
    sky: {
      badge: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
      btn: 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white'
    },
    teal: {
      badge: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
      btn: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white'
    },
    purple: {
      badge: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
      btn: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white'
    }
  };

  return (
    <div className="w-full mt-3 overflow-hidden rounded-2xl border shadow-xl transition-all duration-300">
      <div className="overflow-x-auto scrollbar-thin">
        <table className={`w-full text-left border-collapse text-xs ${
          isDarkMode ? 'bg-[#0b1220] text-slate-200' : 'bg-white text-slate-800'
        }`}>
          {/* Table Header */}
          <thead>
            <tr className={`border-b font-mono uppercase tracking-wider text-[11px] ${
              isDarkMode
                ? 'bg-[#070b14] border-slate-800 text-slate-400'
                : 'bg-slate-100/90 border-slate-200 text-slate-600'
            }`}>
              <th className="py-3.5 px-4 font-bold">Topology &amp; Circuit</th>
              <th className="py-3.5 px-3 font-bold">Infeed / Supply</th>
              <th className="py-3.5 px-3 font-bold">Output &amp; Control</th>
              <th className="py-3.5 px-3 font-bold">Standards</th>
              <th className="py-3.5 px-3 font-bold">Physics Engine</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/80' : 'divide-slate-200/80'}`}>
            {simulators.map((sim) => {
              const theme = themeMap[sim.colorTheme] || themeMap.blue;
              const params = TOPOLOGY_PARAMETRIC_DATA[sim.id] || {
                infeed: sim.voltage,
                output: sim.specSummary,
                solver: 'RK4 Numerical Solver',
                controlMethod: 'Parametric Loop'
              };

              return (
                <tr
                  key={sim.id}
                  className={`transition-colors group ${
                    isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/40'
                  }`}
                >
                  {/* Topology & Circuit Column */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-700/60 bg-[#070b14] shrink-0 shadow-inner flex items-center justify-center">
                        <TopologyPreviewSVG simId={sim.id} className="w-full h-full" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.2 rounded text-[9.5px] font-mono font-bold uppercase border ${theme.badge}`}>
                            {sim.categoryBadge}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                            sim.difficulty === 'Beginner' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60' :
                            sim.difficulty === 'Intermediate' ? 'bg-amber-950/70 text-amber-400 border-amber-800/60' :
                            sim.difficulty === 'Industrial' ? 'bg-yellow-950/70 text-yellow-300 border-yellow-800/60' :
                            'bg-indigo-950/70 text-indigo-300 border-indigo-800/60'
                          }`}>
                            {sim.difficulty}
                          </span>
                        </div>
                        <span className={`font-bold text-xs sm:text-sm tracking-tight ${
                          isDarkMode ? 'text-white group-hover:text-blue-300' : 'text-slate-900 group-hover:text-blue-700'
                        }`}>
                          {sim.tabName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Infeed Column */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="flex flex-col">
                      <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {params.infeed}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Rated voltage
                      </span>
                    </div>
                  </td>

                  {/* Output & Control Column */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className={`font-bold font-mono text-[11px] ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {params.output}
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-mono">
                        {params.controlMethod}
                      </span>
                    </div>
                  </td>

                  {/* Standards Column */}
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {sim.standards.map((std) => (
                        <span
                          key={std}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono border ${
                            isDarkMode
                              ? 'bg-slate-900/80 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {std}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Physics Engine Column */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                        {params.solver}
                      </span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenSpecs(sim)}
                        className={`h-8 px-2.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isDarkMode
                            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                        title="View Detailed Equations & Engineering Specs"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Specs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onLaunchSim(sim.id)}
                        disabled={launchingSimId === sim.id}
                        className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 border-none select-none ${theme.btn}`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
