import React from 'react';
import { Zap, Mail, ExternalLink, ShieldCheck, BookOpen, Layers } from 'lucide-react';

/**
 * CommonFooter.jsx - Shared Global Footer Component for all PE Lab pages.
 * Displays Educational Simulation Notice, Interactive Labs links, Standards & Resources, and Contact.
 */
export const CommonFooter = () => {
  return (
    <footer className="w-full border-t border-[#334155] bg-[#091527] text-slate-300 font-sans relative z-30 shrink-0 pb-4">
      {/* Top Accent Gradient Line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Main 4-Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs font-mono">
          
          {/* Column 1: Brand & Mission */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0ea5e9] flex items-center justify-center text-white font-bold shadow-md">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-sm text-white tracking-tight font-sans">
                Power Electronics Training LAB
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
              High-fidelity browser-based electrical engineering simulator for industrial power quality, SCR convertors, soft starters, and IEEE 519 harmonic mitigation.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <Mail className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <a href="mailto:0808miracle@gmail.com" className="text-cyan-300 hover:underline">
                0808miracle@gmail.com
              </a>
            </div>
          </div>

          {/* Column 2: Interactive Labs */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-[#0ea5e9] uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Layers className="w-3.5 h-3.5" /> Interactive Labs
            </h4>
            <ul className="space-y-1 text-[11px] text-slate-400 list-none p-0 m-0">
              <li>
                <a href="/foundation-lab" className="hover:text-white transition-colors">⚡ Power Electronics Foundation</a>
              </li>
              <li>
                <a href="/single-6-pulse-charger" className="hover:text-white transition-colors">🔌 6-Pulse SCR Charger Lab</a>
              </li>
              <li>
                <a href="/dual-charger-scheme" className="hover:text-white transition-colors">🔋 Dual Battery Charger Scheme</a>
              </li>
              <li>
                <a href="/static-switch" className="hover:text-white transition-colors">🔄 Static Transfer Switch Lab</a>
              </li>
              <li>
                <a href="/soft-starter" className="hover:text-white transition-colors">🚀 SCR Soft Starter Lab</a>
              </li>
              <li>
                <a href="/harmonics-filter" className="hover:text-white transition-colors font-bold text-cyan-300">📊 Harmonics & Power Quality Lab</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Standards & Specifications */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <ShieldCheck className="w-3.5 h-3.5" /> Standards & Compliance
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-400 list-none p-0 m-0">
              <li className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span>Current Distortion Limits:</span>
                <span className="text-emerald-300 font-bold">IEEE 519-2022 Table 2</span>
              </li>
              <li className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span>Transformer K-Factor:</span>
                <span className="text-amber-400 font-bold">ANSI C57.110</span>
              </li>
              <li className="flex items-center justify-between">
                <span>FFT Harmonic Analysis:</span>
                <span className="text-cyan-300 font-bold">IEC 61000-4-7</span>
              </li>
            </ul>
          </div>

          {/* Column 4: About & Educational Notice */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <BookOpen className="w-3.5 h-3.5" /> About & Disclaimer
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Designed for professional training, industrial power audit preparation, and engineering education. All solvers execute client-side ODE algorithms in real time.
            </p>
            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1">
              <span>Engineered by</span>
              <a
                href="https://www.linkedin.com/in/toanilsharma/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#0ea5e9] underline font-bold inline-flex items-center gap-0.5"
              >
                Anil Sharma
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2 font-mono">
          <span>© {new Date().getFullYear()} Power Electronics Training LAB. All rights reserved.</span>
          <span className="bg-slate-800/60 px-2.5 py-1 rounded border border-slate-700 text-slate-300 text-center">
            Educational Simulation Notice: Results are model-based ODE models for learning, should not replace engineering design.
          </span>
        </div>
      </div>
    </footer>
  );
};
