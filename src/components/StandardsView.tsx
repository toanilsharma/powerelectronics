import React from 'react';
import { Award, ArrowLeft, ShieldAlert, BookOpen, ExternalLink, CheckCircle2 } from 'lucide-react';

interface StandardsViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const StandardsView: React.FC<StandardsViewProps> = ({ isDarkMode, onBack }) => {
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
            EDUCATIONAL REFERENCE FRAMEWORK
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Award className="w-8 h-8 text-blue-400" />
            Standards Reference Matrix
          </h1>
          <p className={`text-sm leading-relaxed max-w-3xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Overview of technical equations and theoretical guidelines referenced across Power Electronics Lab models for academic and learning comparison.
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 sm:p-5 rounded-2xl border bg-amber-950/40 border-amber-800/60 text-xs leading-relaxed text-amber-200/90 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Important Legal &amp; Non-Association Notice</span>
          </div>
          <p className="m-0">
            References to international standards (including IEC 60146-1-1, IEEE 519-2022, IEEE 1188, IEC 62040-3, and IEC 60947-4-2) are cited strictly for <strong>educational reference, academic equation alignment, and technical context</strong>.
          </p>
          <p className="m-0 text-amber-300/80">
            Power Electronics Lab is an independent educational simulation project. It is <strong>NOT affiliated with, sponsored by, certified by, endorsed by, or approved by IEEE, IEC, NFPA, or any standards organization</strong>. Simulation models provide numerical approximations and should not be used as a substitute for official standards publications or certified site measurements.
          </p>
        </div>

        {/* Standards Matrix Table */}
        <div className={`p-6 rounded-2xl border flex flex-col gap-5 ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 text-base font-bold">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2>Educational Formula Alignment Matrix</h2>
          </div>

          <div className="overflow-x-auto w-full border rounded-xl border-slate-800/80">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className={isDarkMode ? 'bg-slate-900/90 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700 border-b border-slate-200'}>
                  <th className="p-3">Standard Reference</th>
                  <th className="p-3">Title / Focus Area</th>
                  <th className="p-3">Referenced Simulator</th>
                  <th className="p-3">Educational Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  {
                    ref: 'IEC 60146-1-1',
                    title: 'Semiconductor Converters - Line-Commutated Converters',
                    sim: '6-Pulse Controlled Rectifier Charger',
                    usage: 'Graetz bridge average Vdc calculation: Vdc = 1.35·VLL·cosα - (3/π)ωLcIdc and overlap angle estimation.'
                  },
                  {
                    ref: 'IEEE 519-2022',
                    title: 'Harmonic Control in Electric Power Systems',
                    sim: 'Harmonics & Power Quality Lab',
                    usage: 'Voltage and current THD limits (5.0% PCC threshold) and FFT harmonic order spectrum analysis.'
                  },
                  {
                    ref: 'IEEE 1188 / IEC 62485-2',
                    title: 'Stationary VRLA Batteries & Safety Requirements',
                    sim: 'Dual-Bank DC Charger System',
                    usage: 'Boost/Float voltage charging stages, temperature compensation, and DC ripple limits.'
                  },
                  {
                    ref: 'IEC 62040-3',
                    title: 'Uninterruptible Power Systems (UPS) - Performance',
                    sim: 'Static Transfer Switch (STS)',
                    usage: 'Sub-cycle <4ms phase transfer timing, phase lock synchronization, and ITIC/CBEMA curve ride-through.'
                  },
                  {
                    ref: 'IEC 60947-4-2',
                    title: 'AC Semiconductor Motor Controllers & Starters',
                    sim: 'SCR Soft Starter',
                    usage: 'Thyristor voltage ramp profile, current limit multiplier, and motor thermal I²t overload protection.'
                  }
                ].map((row, rIdx) => (
                  <tr key={rIdx} className={isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-sans font-bold text-blue-400">{row.ref}</td>
                    <td className="p-3 text-slate-300 font-sans font-semibold">{row.title}</td>
                    <td className="p-3 text-amber-400">{row.sim}</td>
                    <td className="p-3 text-slate-400 font-sans leading-relaxed">{row.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
  );
};
