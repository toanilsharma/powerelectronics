import React from 'react';
import { Zap, Mail, ShieldCheck, Activity, Cpu, ExternalLink, Award, FileText, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  isDarkMode: boolean;
  setActiveTab: (tab: string | null) => void;
  onOpenContact: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenAbout: () => void;
  onOpenDisclaimer?: () => void;
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
  onOpenDisclaimer,
  setShowHelp,
  setShowStandards,
}) => {
  const currentYear = new Date().getFullYear();
  const [copiedEmail, setCopiedEmail] = React.useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('0808miracle@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  const handleNav = (tab: string, path: string) => {
    setActiveTab(tab);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`w-full border-t font-sans relative z-30 transition-colors pt-12 pb-8 px-4 sm:px-6 lg:px-12 2xl:px-16 select-none ${
      isDarkMode 
        ? 'bg-gradient-to-b from-[#070c18] via-[#050812] to-[#020409] text-slate-300 border-slate-800/90' 
        : 'bg-slate-950 text-slate-300 border-slate-800'
    }`}>
      {/* Top Accent Gradient Bar spanning 100% viewport width */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-cyan-400 via-amber-400 to-emerald-400 absolute top-0 left-0 right-0 shadow-[0_1px_12px_rgba(34,211,238,0.35)]" />

      {/* Full-width responsive content container */}
      <div className="w-full max-w-[1720px] mx-auto flex flex-col gap-10">
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 lg:gap-8 xl:gap-10">
          
          {/* Column 1: Brand & Architecture Credentials */}
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
                <span>Equations Referenced from IEEE &amp; IEC</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>Procedure Drills Aligned with NFPA 70E / OSHA</span>
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

          {/* Column 3: Field Safety & Diagnostics */}
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
                  🔋 Battery Thermal Runaway (IEEE 1188 Ref)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('single-charger', '/single-6-pulse-charger')}
                  className="text-slate-400 hover:text-rose-300 transition-colors text-left bg-transparent border-none p-0 cursor-pointer text-xs"
                >
                  🔒 OSHA 1910.147 LOTO Practice Drill
                </button>
              </li>
              <li>
                <span className="text-slate-500 font-mono text-[11px] block mt-1">Virtual Diagnostics Suite (IEC 61010 Ref):</span>
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

          {/* Column 4: Standards & Architecture Matrix */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Standards &amp; Architecture</span>
            </h3>
            
            <div className="flex flex-col gap-2.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleNav('disclaimer', '/disclaimer')}
                className="text-amber-400/90 hover:text-amber-300 font-bold text-left bg-transparent border-none p-0 cursor-pointer transition-colors"
              >
                ⚖️ Educational Notice &amp; Disclaimer
              </button>
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
              <span className="text-slate-500 text-[11px] pt-1">
                Mathematical ODE Models: Runge-Kutta 4th Order (RK4) • Discrete Fourier Transform (DFT)
              </span>
            </div>
          </div>

          {/* Column 5: Right Corner - Peer Review & Discrepancy Reporting Card */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-rose-400" />
              <span>Peer Review &amp; Feedback</span>
            </h3>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1527] to-[#080d1a] border border-cyan-500/20 shadow-xl flex flex-col gap-3 font-sans text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                  Open Academic Peer Review
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed m-0 font-sans">
                Found an analytical calculation discrepancy, formula mistake, or have an educational suggestion? We welcome peer feedback to enhance precision.
              </p>

              <div className="flex flex-col gap-2 pt-1 font-mono">
                <a
                  href="mailto:0808miracle@gmail.com?subject=Power%20Electronics%20Lab%20Feedback%20/%20Discrepancy%20Report"
                  className="w-full py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 font-bold text-center text-[11px] transition-all flex items-center justify-center gap-1.5 no-underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>0808miracle@gmail.com</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[10.5px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedEmail ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Email Copied to Clipboard!</span>
                    </>
                  ) : (
                    <span>📋 Click to Copy Email</span>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                <span>Curated by</span>
                <a
                  href="https://www.linkedin.com/in/toanilsharma/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-cyan-400 font-bold inline-flex items-center gap-1 transition-colors"
                >
                  Anil Sharma
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Smart Authoritative One-Liner Disclaimer Box */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#040812]/95 p-4 sm:p-5 text-[11px] font-mono leading-relaxed text-slate-400 shadow-inner">
          <p className="m-0">
            <strong className="text-slate-200 font-semibold">Educational Simulation Notice:</strong>{' '}
            Power Electronics Lab is an independent, non-commercial educational project for learning and training purposes only. All mathematical models and standard references (including IEEE 519, IEC 60146, IEEE 946, IEEE 1188, NFPA 70E, and OSHA 1910.147) are cited solely for academic curriculum alignment. This platform is not affiliated with, endorsed by, certified by, or approved by any international standards organization. Physical electrical installations must be verified with certified equipment manufacturer data and licensed Professional Engineers (PE). Spot a discrepancy or have an educational suggestion? Contact:{' '}
            <a href="mailto:0808miracle@gmail.com" className="text-cyan-400 hover:underline font-bold">0808miracle@gmail.com</a>.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Legal Modals */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <span>© {currentYear} Power Electronics Training LAB. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 text-slate-400 text-[11px]">
            <button
              type="button"
              onClick={() => handleNav('disclaimer', '/disclaimer')}
              className="text-amber-400/90 hover:text-amber-300 font-bold transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              Disclaimer &amp; Accuracy
            </button>
            <span>·</span>
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
            <span>·</span>
            <a
              href="mailto:0808miracle@gmail.com?subject=Power%20Electronics%20Lab%20Feedback"
              className="text-cyan-400 hover:underline transition-colors"
            >
              Report Discrepancy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
