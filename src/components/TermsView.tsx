import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

interface TermsViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ isDarkMode, onBack }) => {
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
            TERMS OF USE
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-400" />
            Terms of Use
          </h1>
          <p className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Terms and conditions governing the use of Power Electronics Lab simulation models and educational software.
          </p>
        </div>

        <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col gap-5 ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <h2 className="text-base font-bold text-[#f8fafc]">1. Educational Purpose &amp; Exploration</h2>
          <p className="text-xs leading-relaxed">
            Power Electronics Lab is designed as an educational simulation tool for students, educators, and power engineers. Simulation results are generated from mathematical models and ideal numerical ODE solvers. They are intended for learning, conceptual exploration, and academic coursework.
          </p>

          <h2 className="text-base font-bold text-[#f8fafc]">2. Disclaimer of Engineering Warranty</h2>
          <p className="text-xs leading-relaxed">
            Simulation outputs, THD calculations, and transfer matrix responses should not replace applicable physical engineering designs, site measurements, equipment manufacturer nameplate ratings, protection coordination studies, or regulatory safety requirements.
          </p>

          <h2 className="text-base font-bold text-[#f8fafc]">3. Intellectual Property &amp; Attribution</h2>
          <p className="text-xs leading-relaxed">
            All simulation engines, user interface design, and model implementations are developed by <strong>Anil Sharma</strong> (LinkedIn: <code>https://www.linkedin.com/in/toanilsharma/</code>). Educational reuse for academic coursework and lectures is permitted.
          </p>
        </div>

      </div>
  );
};
