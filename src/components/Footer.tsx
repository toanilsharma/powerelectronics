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
    <footer className={`w-full border-t font-sans mt-auto relative z-30 transition-colors ${
      isDarkMode ? 'bg-[#040d1f] text-slate-300 border-slate-800' : 'bg-slate-900 text-slate-200 border-slate-800'
    }`}>
      {/* Top Accent Gradient Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col gap-10">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          
          {/* Column 1: Brand & Mission */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                Power Electronics Lab
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Interactive browser-based electrical engineering simulators. High-fidelity numerical ODE models for rectifiers, chargers, soft starters, static switches, and power quality.
            </p>

            {/* Email Contact Chip */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenContact}
                className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/80 hover:bg-blue-900/80 border border-blue-800/80 px-3.5 py-2 rounded-xl w-fit transition-all cursor-pointer select-none min-h-[44px]"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>0808miracle@gmail.com</span>
              </button>

              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 pt-0.5">
                <span>Engineered by</span>
                <a
                  href="https://www.linkedin.com/in/toanilsharma/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-blue-400 underline font-bold transition-colors inline-flex items-center gap-0.5"
                >
                  Anil Sharma
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Interactive Labs */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
              Interactive Labs
            </h3>
            <ul className="flex flex-col gap-1 m-0 p-0 list-none text-xs">
              {[
                { name: 'Fundamentals Lab', tab: 'foundation-lab', path: '/foundation-lab' },
                { name: '6-Pulse SCR Charger', tab: 'single-charger', path: '/single-6-pulse-charger' },
                { name: 'Dual-Bank DC Substation', tab: 'dual-charger', path: '/dual-charger-scheme' },
                { name: 'Static Transfer Switch', tab: 'static-switch', path: '/static-switch' },
                { name: 'SCR Soft Starter', tab: 'soft-starter', path: '/soft-starter' },
                { name: 'Harmonics & Power Quality', tab: 'harmonics', path: '/harmonics-filter' },
              ].map((item) => (
                <li key={item.tab}>
                  <a
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(item.tab);
                      window.history.pushState({}, '', item.path);
                    }}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    <span>{item.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources & Methodology */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Resources &amp; Engineering
            </h3>
            <ul className="flex flex-col gap-1 m-0 p-0 list-none text-xs">
              <li>
                <a
                  href="/methodology"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('methodology');
                    window.history.pushState({}, '', '/methodology');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  <span>Engineering Methodology</span>
                </a>
              </li>
              <li>
                <a
                  href="/methodology"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('methodology');
                    window.history.pushState({}, '', '/methodology');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  <span>Validation Benchmarks</span>
                </a>
              </li>
              <li>
                <a
                  href="/standards"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('standards');
                    window.history.pushState({}, '', '/standards');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  <span>Standards References Matrix</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer bg-transparent border-none p-0 text-xs min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  <span>Model Help &amp; Documentation</span>
                </button>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  <span>LLM / AI Documentation (llms.txt)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: About & Contact */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              About &amp; Support
            </h3>
            <ul className="flex flex-col gap-1 m-0 p-0 list-none text-xs">
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('about');
                    window.history.pushState({}, '', '/about');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  <span>About the Lab</span>
                </a>
              </li>
              <li>
                <a
                  href="/methodology"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('methodology');
                    window.history.pushState({}, '', '/methodology');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  <span>Accuracy &amp; Limitations</span>
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('contact');
                    window.history.pushState({}, '', '/contact');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  <span>Contact Us (0808miracle@gmail.com)</span>
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('privacy');
                    window.history.pushState({}, '', '/privacy');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  <span>Privacy Policy</span>
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('terms');
                    window.history.pushState({}, '', '/terms');
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer min-h-[44px]"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  <span>Terms of Use</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Educational Disclaimer Banner */}
        <div className="p-4 rounded-xl border bg-slate-950/80 border-slate-800 text-[11px] leading-relaxed text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="m-0">
              <strong className="text-slate-200 font-semibold">Educational Simulation Notice:</strong> Results are model-based and depend on user inputs, assumptions and implementation. They are intended for learning and engineering exploration and should not replace applicable engineering design, site measurements, equipment manufacturer data, protection studies or regulatory requirements.
            </p>
          </div>
        </div>

        {/* Copyright & Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
          <span>© {new Date().getFullYear()} Power Electronics Lab. All rights reserved. Educational simulation suite.</span>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('privacy');
                window.history.pushState({}, '', '/privacy');
              }}
              className="hover:text-white transition-colors no-underline text-slate-400 cursor-pointer"
            >
              Privacy
            </a>
            <span>·</span>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('terms');
                window.history.pushState({}, '', '/terms');
              }}
              className="hover:text-white transition-colors no-underline text-slate-400 cursor-pointer"
            >
              Terms
            </a>
            <span>·</span>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('contact');
                window.history.pushState({}, '', '/contact');
              }}
              className="hover:text-white transition-colors no-underline text-slate-400 cursor-pointer"
            >
              Contact
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
