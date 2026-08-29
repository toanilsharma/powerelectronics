import React from 'react';
import { Info, ArrowLeft, Zap, ExternalLink, ShieldCheck, GraduationCap, Cpu } from 'lucide-react';

interface AboutViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ isDarkMode, onBack }) => {
  const linkedinUrl = 'https://www.linkedin.com/in/toanilsharma/';
  const email = '0808miracle@gmail.com';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8 py-2 sm:py-6">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer select-none ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-blue-500" />
            <span>Back to Simulators</span>
          </button>

          <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${
            isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            ABOUT THE LAB
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            About Power Electronics Lab
          </h1>
          <p className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Power Electronics Lab is a browser-native electrical engineering simulation suite engineered for students, educators, and power systems field engineers.
          </p>
        </div>

        {/* Author & Creator Box */}
        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xl shrink-0">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-bold uppercase text-blue-400">Engineered &amp; Developed By</span>
              <h2 className="text-xl font-black text-white">Anil Sharma</h2>
              <span className="text-xs font-mono text-slate-400">Contact: {email}</span>
            </div>
          </div>

          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all no-underline shrink-0"
          >
            <span>LinkedIn Profile</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Mission & Key Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className={`p-5 rounded-2xl border flex flex-col gap-2.5 ${
            isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <GraduationCap className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Interactive Learning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bridge the gap between theoretical circuit formulas and real-time waveform telemetry through zero-install browser solvers.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border flex flex-col gap-2.5 ${
            isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <Cpu className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-base text-white">Numerical Solvers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-speed differential ODE solvers calculate 3-phase Graetz rectifiers, SCR firing delay α, commutation overlap drop, and FFT harmonics.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border flex flex-col gap-2.5 ${
            isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Standards Alignment</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Models reference international power engineering standards including IEC 60146-1-1, IEEE 519-2022, IEEE 1188, and IEC 62040-3.
            </p>
          </div>
        </div>

      </div>
  );
};
