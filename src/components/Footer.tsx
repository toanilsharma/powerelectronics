import React from 'react';
import { Zap, Mail, ShieldCheck, FileText, Lock, ChevronRight, ExternalLink } from 'lucide-react';

interface FooterProps {
  isDarkMode: boolean;
  setActiveTab: (tab: string | null) => void;
  onOpenContact: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenAbout: () => void;
  setShowHelp: (show: boolean) => void;
  setShowStandards: (show: boolean) => void;
}

export const Footer: React.FC<FooterProps> = ({
  isDarkMode,
  setActiveTab,
  onOpenContact,
  onOpenPrivacy,
  onOpenTerms,
  onOpenAbout,
  setShowHelp,
  setShowStandards,
}) => {
  return (
    <footer className={`w-full border-t font-sans relative z-30 transition-colors py-6 px-4 select-none ${
      isDarkMode ? 'bg-[#060b16] text-slate-300 border-slate-800/80' : 'bg-slate-900 text-slate-200 border-slate-800'
    }`}>
      {/* Top Accent Gradient Bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 absolute top-0 left-0" />

      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-4 text-center">
        {/* Row 1: Brand & Tagline */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-base text-white tracking-tight font-mono">
              Power Electronics Lab
            </span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <p className="text-xs text-slate-400 max-w-2xl">
            Interactive browser-based electrical engineering simulators with real-time client-side ODE solvers.
          </p>
        </div>

        {/* Row 2: Interactive Simulator Quick Links (Centered Justified Pills) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-mono py-1">
          {[
            { name: '⚡ Foundation', tab: 'foundation-lab', path: '/foundation-lab' },
            { name: '🔌 6-Pulse SCR Charger', tab: 'single-charger', path: '/single-6-pulse-charger' },
            { name: '🔋 Dual-Bank DC Substation', tab: 'dual-charger', path: '/dual-charger-scheme' },
            { name: '🔄 Static Switch', tab: 'static-switch', path: '/static-switch' },
            { name: '🚀 SCR Soft Starter', tab: 'soft-starter', path: '/soft-starter' },
            { name: '📊 Harmonics & Power Quality', tab: 'harmonics', path: '/harmonics-filter' },
            { name: '⚡ DC-DC Converter', tab: 'dc-dc-converter', path: '/dc-dc-converter' },
            { name: '🔄 SPWM Inverter', tab: 'single-phase-inverter', path: '/single-phase-inverter' },
          ].map((item) => (
            <a
              key={item.tab}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.tab);
                window.history.pushState({}, '', item.path);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer min-h-[36px] flex items-center"
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Row 3: Action Links Bar (Centered) */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-mono text-slate-400 border-t border-b border-slate-800/60 py-2.5 w-full max-w-4xl">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('methodology');
              window.history.pushState({}, '', '/methodology');
            }}
            className="hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            Methodology &amp; Benchmarks
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowStandards(true)}
            className="hover:text-emerald-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            IEEE / IEC Standards
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="hover:text-amber-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            Documentation &amp; Help
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onOpenContact}
            className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            <Mail className="w-3.5 h-3.5" />
            0808miracle@gmail.com
          </button>
          <span>•</span>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Engineered by</span>
            <a
              href="https://www.linkedin.com/in/toanilsharma/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-cyan-400 underline font-bold inline-flex items-center gap-0.5"
            >
              Anil Sharma
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Row 4: Copyright & Legal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 w-full max-w-4xl font-mono">
          <span>© {new Date().getFullYear()} Power Electronics Lab. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onOpenPrivacy} className="hover:text-white transition-colors bg-transparent border-none p-0 text-[11px] cursor-pointer">
              Privacy
            </button>
            <span>·</span>
            <button type="button" onClick={onOpenTerms} className="hover:text-white transition-colors bg-transparent border-none p-0 text-[11px] cursor-pointer">
              Terms
            </button>
            <span>·</span>
            <button type="button" onClick={onOpenAbout} className="hover:text-white transition-colors bg-transparent border-none p-0 text-[11px] cursor-pointer">
              About
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
