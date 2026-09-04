import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck
} from 'lucide-react';

interface PersonaShowcaseProps {
  isDarkMode: boolean;
  onLaunchSim: (simId: string) => void;
}

type PersonaType = 'students' | 'educators' | 'engineers';

export default function PersonaShowcase({ isDarkMode, onLaunchSim }: PersonaShowcaseProps) {
  const [activePersona, setActivePersona] = useState<PersonaType>('students');

  const personas = {
    students: {
      id: 'students',
      label: 'Students & Learners',
      icon: <GraduationCap className="w-4 h-4" />,
      tag: 'ACADEMIC MASTERY',
      headline: 'Bridge Abstract Textbook Formulas to Live Electrical Waveforms',
      description:
        'Eliminate the confusion between mathematical ODE formulas and real-world circuit behavior. Observe firing angles, commutation overlap, and harmonic spectra safely without component explosion risks.',
      recommendedSim: {
        id: 'foundation-lab',
        name: '3-Phase SCR Controlled Rectifier Lab',
        badge: 'Fundamental Lab'
      },
      benefits: [
        {
          title: 'Live Waveform Physics',
          desc: 'Watch SCR firing angle α, commutation overlap μ, and diode reverse recovery calculate continuously under varying R-L loads.'
        },
        {
          title: 'Equation-to-Scope Coupling',
          desc: 'Connect mathematical equations (1.35·VLL·cosα) directly to multi-channel CRT oscilloscope traces with cursors.'
        },
        {
          title: 'Risk-Free Circuit Exploration',
          desc: 'Induce continuous conduction mode (CCM) and discontinuous mode (DCM) transitions freely without damaging physical hardware.'
        }
      ],
      metrics: [
        { label: 'Numerical Step', val: '5 ms' },
        { label: 'Safety Risk', val: '0 %' },
        { label: 'Installation', val: 'Zero' }
      ]
    },
    educators: {
      id: 'educators',
      label: 'Educators & Universities',
      icon: <Building2 className="w-4 h-4" />,
      tag: 'CLASSROOM READY',
      headline: 'Zero-Install Interactive Courseware for Power Electronics Lectures',
      description:
        'Deliver compelling, interactive lecture demonstrations on any projector or browser. Eliminate tedious lab software installations, driver issues, and licensing hassles.',
      recommendedSim: {
        id: 'single-phase-inverter',
        name: 'Single-Phase Full-Bridge SPWM Inverter',
        badge: 'Lecture Favorite'
      },
      benefits: [
        {
          title: 'Turnkey Classroom Demos',
          desc: 'Demonstrate complex SPWM carrier modulation, duty cycle shifts, and LC filter attenuation live during lectures in any modern browser.'
        },
        {
          title: 'Downloadable Lab Reports',
          desc: 'Assign structured parametric sweeps (e.g. calculate THD vs modulation index ma) with standardized PDF report exports.'
        },
        {
          title: 'Rigorous Mathematical Core',
          desc: 'Built upon verified 4th-order Runge-Kutta numerical solvers with 2-5% concordance against standard textbook references.'
        }
      ],
      metrics: [
        { label: 'Setup Time', val: '0 min' },
        { label: 'Browser Support', val: '100 %' },
        { label: 'Curriculum Fit', val: 'ABET Aligned' }
      ]
    },
    engineers: {
      id: 'engineers',
      label: 'Practicing Engineers',
      icon: <Cpu className="w-4 h-4" />,
      tag: 'INDUSTRIAL COMPLIANCE',
      headline: 'Field-Grade Simulation & Standardized Harmonic Compliance',
      description:
        'Evaluate power quality, filter sizing, and substation DC interlocks with rigorous models adhering to IEEE 519-2022 and IEEE 946 industrial standards.',
      recommendedSim: {
        id: 'dual-charger',
        name: 'Dual-Bank 220VDC Substation System',
        badge: 'Substation Flagship'
      },
      benefits: [
        {
          title: 'IEEE 519-2022 Harmonic Scans',
          desc: 'Analyze 50th-order FFT harmonics and total harmonic distortion (THD) against utility PCC point-of-common-coupling limits.'
        },
        {
          title: 'Substation 220VDC Bus Tie Logic',
          desc: 'Validate dual battery charger auto-throwover schemes (52-BC) and evaluate 64G earth leakage relays under floating bus conditions.'
        },
        {
          title: 'Motor Soft Starter Inrush Control',
          desc: 'Tune voltage ramp profiles and current limiting to prevent mechanical water hammer and supply voltage dip in industrial pumps.'
        }
      ],
      metrics: [
        { label: 'Standards Checked', val: 'IEEE / IEC' },
        { label: 'Harmonic Depth', val: '50th Order' },
        { label: 'Bus Ratings', val: '220VDC / 415V' }
      ]
    }
  };

  const current = personas[activePersona];

  return (
    <div className="w-full mt-10 pt-6 flex flex-col items-center gap-6">
      {/* Section Title */}
      <div className="text-center flex flex-col items-center gap-1.5 max-w-xl">
        <span className={`text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
          isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          PERSONA-TAILORED EXPERIENCE
        </span>
        <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Engineered for Every Stage of Power Systems Mastery
        </h2>
        <p className={`text-xs sm:text-sm font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Select your role to explore how PowerElectronics Lab accelerates learning, lecture demos, and field design.
        </p>
      </div>

      {/* 3-Tab Segmented Control */}
      <div className={`flex items-center p-1.5 rounded-2xl border shadow-md max-w-lg w-full ${
        isDarkMode ? 'bg-[#090e1a] border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        {(Object.keys(personas) as PersonaType[]).map((key) => {
          const p = personas[key];
          const isActive = activePersona === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActivePersona(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                isActive
                  ? isDarkMode
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200 bg-transparent border-none'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-none'
              }`}
            >
              {p.icon}
              <span className="truncate">{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Persona Showcase Card */}
      <div className={`w-full rounded-2xl border p-5 sm:p-8 transition-all duration-300 shadow-xl relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-br from-[#0d1424] via-[#11192e] to-[#0a0f1d] border-slate-800/80 shadow-black/50'
          : 'bg-gradient-to-br from-blue-50/40 via-white to-slate-50 border-slate-200 shadow-slate-200/50'
      }`}>
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 justify-between items-start">
          {/* Left Column: Headline & Benefits */}
          <div className="w-full lg:w-3/5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold tracking-wider uppercase border ${
                isDarkMode ? 'bg-blue-950 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {current.tag}
              </span>
            </div>

            <h3 className={`text-lg sm:text-2xl font-black leading-snug tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {current.headline}
            </h3>

            <p className={`text-xs sm:text-sm leading-relaxed ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {current.description}
            </p>

            {/* Feature Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {current.benefits.map((b, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    isDarkMode
                      ? 'bg-[#0a0f1d]/80 border-slate-800/80 hover:border-blue-500/40'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className={`font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {b.title}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Recommended Lab & Metrics Box */}
          <div className={`w-full lg:w-2/5 rounded-2xl border p-5 flex flex-col gap-4 justify-between ${
            isDarkMode ? 'bg-[#070b14] border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                RECOMMENDED SIMULATOR FOR YOU
              </span>
              <div className="flex flex-col gap-1 pt-1">
                <span className={`text-sm sm:text-base font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {current.recommendedSim.name}
                </span>
                <span className={`text-[10.5px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Interactive ODE numerical solver • Oscilloscope Telemetry
                </span>
              </div>

              <button
                type="button"
                onClick={() => onLaunchSim(current.recommendedSim.id)}
                className="mt-2 w-full h-11 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Launch This Simulator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Ticker */}
            <div className={`pt-3 border-t grid grid-cols-3 gap-2 text-center ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              {current.metrics.map((m, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className={`text-xs sm:text-sm font-black font-mono ${
                    isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>
                    {m.val}
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-400">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
