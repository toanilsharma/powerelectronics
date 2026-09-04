import React from 'react';
import { Zap, Mail, ShieldCheck, Activity, Cpu, ExternalLink, Award, FileText, CheckCircle2 } from 'lucide-react';

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
  const currentYear = new Date().getFullYear();

  const handleNav = (tab: string, path: string) => {
    setActiveTab(tab);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`w-full border-t font-sans relative z-30 transition-colors pt-12 pb-8 px-4 sm:px-6 lg:px-8 select-none ${
      isDarkMode ? 'bg-[#060b16] text-slate-300 border-slate-800/80' : 'bg-slate-950 text-slate-300 border-slate-800'
    }`}>
      {/* Top Accent Gradient Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 via-amber-400 to-emerald-400 absolute top-0 left-0" />

      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Brand & Compliance Credentials */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight font-mono">
                  PowerElectronics
                </span>
                <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  LAB
                </span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              High-fidelity browser-based numerical simulation suite for continuous power conversion, substation switchgear, and industrial safety compliance.
            </p>

            {/* Compliance Credential Badges */}
            <div className="flex flex-col gap-2 pt-1 font-mono text-[10.5px]">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>RK4 Analytical ODE Engine (60 FPS)</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>IEEE 519 / IEC 60146 Validated</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>NFPA 70E / OSHA 1910.147 Aligned</span>
              </div>
            </div>
          </div>

          {/* Column 2: Power Converters Suite */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Power Converters</span>
            </h3>
            <ul className="flex flex-col gap-2 text-xs font-mono m-0 p-0 list-none">
              {[
                { label: '🧪 Foundation Lab', tab: 'foundation-lab', path: '/foundation-lab' },
                { label: '🔌 6-Pulse SCR Charger', tab: 'single-charger', path: '/single-6-pulse-charger' },
                { label: '🔋 Dual-Bank 220V Substation', tab: 'dual-charger', path: '/dual-charger-scheme' },
                { label: '🔄 Static Transfer Switch (STS)', tab: 'static-switch', path: '/static-switch' },
                { label: '🚀 SCR Soft Starter', tab: 'soft-starter', path: '/soft-starter' },
                { label: '📊 Harmonics & Active Filter', tab: 'harmonics', path: '/harmonics-filter' },
                { label: '⚡ DC-DC Buck / Boost / SEPIC', tab: 'dc-dc-converter', path: '/dc-dc-converter' },
                { label: '🔄 SPWM Full-Bridge Inverter', tab: 'single-phase-inverter', path: '/single-phase-inverter' },
              ].map(item => (
                <li key={item.tab}>
                  <button
                    type="button"
                    onClick={() => handleNav(item.tab, item.path)}
                    className="text-slate-400 hover:text-cyan-300 transition-colors text-left bg-transparent border-none p-0 cursor-pointer text-xs"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Field Switchgear, Diagnostics & Safety */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Field Safety &amp; Tools</span>
            </h3>
            <ul className="flex flex-col gap-2 text-xs font-mono m-0 p-0 list-none">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('foundation-lab', '/foundation-lab')}
                  className="text-slate-400 hover:text-amber-300 transition-colors text-left bg-transparent border-none p-0 cursor-pointer text-xs"
                >
                  ⚡ Breaker Arc Chute &amp; Plasma Lab
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('dual-charger', '/dual-charger-scheme')}
                  className="text-slate-400 hover:text-amber-300 transition-colors text-left bg-transparent border-none p-0 cursor-pointer text-xs"
                >
                  🔋 Battery Thermal Runaway (IEEE 1188)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('single-charger', '/single-6-pulse-charger')}
                  className="text-slate-400 hover:text-rose-300 transition-colors text-left bg-transparent border-none p-0 cursor-pointer text-xs"
                >
                  🔒 OSHA 1910.147 LOTO Certification Drill
                </button>
              </li>
              <li>
                <span className="text-slate-500 font-mono text-[11px] block mt-1">Virtual Diagnostics Suite (IEC 61010):</span>
              </li>
              <li className="text-slate-400 pl-2 border-l border-slate-800 text-[11.5px]">
                • CAT IV 1000V True-RMS Multimeter
              </li>
              <li className="text-slate-400 pl-2 border-l border-slate-800 text-[11.5px]">
                • 4-Channel Digital Storage Scope
              </li>
              <li className="text-slate-400 pl-2 border-l border-slate-800 text-[11.5px]">
                • FLIR Radiometric Thermal Camera
              </li>
            </ul>
          </div>

          {/* Column 4: Standards, Methodology & Author */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Standards &amp; Engineering</span>
            </h3>
            
            <div className="flex flex-col gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setShowStandards(true)}
                className="text-slate-400 hover:text-emerald-400 text-left bg-transparent border-none p-0 cursor-pointer transition-colors"
              >
                📜 IEEE / IEC Standards Concordance
              </button>
              <button
                type="button"
                onClick={() => handleNav('methodology', '/methodology')}
                className="text-slate-400 hover:text-cyan-400 text-left bg-transparent border-none p-0 cursor-pointer transition-colors"
              >
                📐 Methodology &amp; Benchmarks (2-5%)
              </button>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="text-slate-400 hover:text-amber-400 text-left bg-transparent border-none p-0 cursor-pointer transition-colors"
              >
                💡 Documentation &amp; User Manual
              </button>
            </div>

            {/* Author & Contact Card */}
            <div className="mt-3 p-3 rounded-xl bg-[#0b1324] border border-slate-800/90 flex flex-col gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-slate-300">
                <span>Engineered by</span>
                <a
                  href="https://www.linkedin.com/in/toanilsharma/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-cyan-400 underline font-bold inline-flex items-center gap-1 ml-0.5"
                >
                  Anil Sharma
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="text-cyan-300 hover:underline bg-transparent border-none p-0 cursor-pointer text-[11px]"
                >
                  0808miracle@gmail.com
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Legal Modals */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <span>© {currentYear} Power Electronics Training LAB. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              Terms of Use
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenAbout}
              className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              About Suite
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
