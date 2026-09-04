import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Copy,
  ExternalLink,
  BookOpen,
  Award,
  AlertTriangle,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';

interface DisclaimerViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const DisclaimerView: React.FC<DisclaimerViewProps> = ({ isDarkMode, onBack }) => {
  const [copied, setCopied] = useState(false);
  const email = '0808miracle@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8 py-2 sm:py-6 font-sans">
      
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer select-none ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-blue-500" />
          <span>Back to Simulators</span>
        </button>

        <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${
          isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          INDEPENDENT EDUCATIONAL PLATFORM
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Educational Simulation Notice &amp; Accuracy Disclaimer
            </h1>
            <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">
              Model-based numerical physics for academic learning, educational demonstration, and engineering training.
            </p>
          </div>
        </div>
      </div>

      {/* Executive Key Takeaway Box */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start gap-4 shadow-lg ${
        isDarkMode
          ? 'bg-gradient-to-r from-amber-950/40 via-[#0d1424] to-blue-950/30 border-amber-500/40 text-amber-200'
          : 'bg-gradient-to-r from-amber-50 via-white to-blue-50 border-amber-300 text-slate-800'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1.5 text-xs sm:text-sm leading-relaxed">
          <span className="font-bold text-sm tracking-tight text-amber-300">
            Summary: Independent Educational Sandbox
          </span>
          <p className="m-0 leading-relaxed">
            Power Electronics Lab is an independent, non-commercial educational project. It is <strong>NOT affiliated with, sponsored by, certified by, endorsed by, or approved by IEEE, IEC, NFPA, OSHA, ANSI</strong>, or any other standards body or governmental agency.
          </p>
          <p className="m-0 leading-relaxed text-xs opacity-90">
            All simulation calculations represent numerical approximations for classroom and training exploration. They must never be used as a substitute for licensed Professional Engineer (PE) design, physical high-voltage commissioning, protection clearance, or certified manufacturer documentation.
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Section 1: Educational Scope */}
        <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col gap-3 shadow-sm ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm text-blue-400">
            <BookOpen className="w-4 h-4" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">1. Educational Purpose Only</h2>
          </div>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            The primary mission of this simulator is to demystify complex power electronics theory—such as SCR firing angles, commutation overlap drop, Sinusoidal PWM modulation, battery charging CC-CV stages, and harmonic frequency spectra.
          </p>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            This website provides a risk-free virtual laboratory where students and educators can experiment without the danger of arc flash, component explosion, or physical equipment damage.
          </p>
        </div>

        {/* Section 2: Mathematical Modeling & Limits */}
        <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col gap-3 shadow-sm ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
            <Info className="w-4 h-4" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">2. Accuracy &amp; Modeling Limits</h2>
          </div>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Simulation calculations are governed by standard differential equations, Runge-Kutta 4th-order (RK4) numerical solvers, and discrete Fourier transform (FFT) algorithms benchmarked within 2–5% concordance against canonical academic textbook formulas.
          </p>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Physical installations incorporate parasitic board inductances, component thermal drift, semiconductor junction tolerances, and utility grid fluctuations that are idealized or simplified in our educational code.
          </p>
        </div>

        {/* Section 3: Non-Affiliation Declaration */}
        <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col gap-3 shadow-sm ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm text-yellow-400">
            <Award className="w-4 h-4" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">3. No Agency Endorsement</h2>
          </div>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Any mention of technical standards (including <strong>IEEE 519, IEC 60146, IEEE 946, IEEE 1188, NFPA 70E, OSHA 1910.147, and IEC 62040</strong>) is purely for <strong>comparative curriculum reference and nomenclature context</strong>.
          </p>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            These standards bodies have not evaluated, endorsed, certified, or sponsored this software. To purchase or review official standards documents, please visit their respective authorized publishers.
          </p>
        </div>

        {/* Section 4: Trademark & Intellectual Property Notice */}
        <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col gap-3 shadow-sm ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm text-cyan-400">
            <Scale className="w-4 h-4" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">4. Trademarks &amp; Copyright</h2>
          </div>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            All brand names, standard designations, trade names, and logos referenced on this site are the trademarks or registered trademarks of their respective owners.
          </p>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Their citation here represents descriptive academic reference and nominative fair use for scientific education. No copyright infringement or ownership of third-party intellectual property is claimed.
          </p>
        </div>

      </div>

      {/* Section 5: Limitation of Liability */}
      <div className={`p-5 rounded-2xl border flex flex-col gap-2.5 ${
        isDarkMode ? 'bg-[#070b14] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-300">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>5. Limitation of Liability</span>
        </div>
        <p className="text-xs leading-relaxed m-0">
          The simulation software, charts, calculations, and data outputs are provided &ldquo;AS IS&rdquo; without warranty of any kind, express or implied, including but not limited to fitness for a particular electrical engineering installation or accuracy of physical protection studies. Under no circumstances shall the developer or contributors be liable for any direct, indirect, incidental, or consequential damages resulting from the use of this tool.
        </p>
      </div>

      {/* Section 6: Friendly Peer-Review & Discrepancy Reporting Card */}
      <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-br from-[#0c162c] via-[#0d1424] to-[#080d1a] border-blue-500/40 text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-300 text-slate-900'
      }`}>
        <div className="flex flex-col gap-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-600 text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              COMMUNITY &amp; PEER REVIEW
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
            Found a Discrepancy or Have a Suggestion?
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            We are dedicated to the highest mathematical precision and educational clarity. If you spot a calculation edge-case, formula discrepancy, typographical error, or have a suggestion to improve any simulation model, please email us directly.
          </p>
          <p className="text-xs font-mono text-cyan-400 font-semibold m-0">
            We actively welcome feedback from university faculty, researchers, students, and field engineers!
          </p>
        </div>

        {/* Contact Email Action */}
        <div className={`p-4 rounded-xl border flex flex-col gap-3 shrink-0 w-full sm:w-auto ${
          isDarkMode ? 'bg-[#060a14] border-slate-700/80' : 'bg-white border-slate-300 shadow-md'
        }`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-400">Engineering Feedback Email</span>
            <span className="text-sm font-mono font-bold text-white select-all">{email}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Email'}</span>
            </button>

            <a
              href={`mailto:${email}?subject=${encodeURIComponent('[Power Electronics Lab] Formula Feedback / Discrepancy Report')}`}
              className="flex-1 px-4 py-2 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md transition-all text-center cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};
