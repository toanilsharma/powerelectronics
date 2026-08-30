import React from 'react';
import { Zap, Mail, ExternalLink, ShieldCheck, BookOpen, Layers } from 'lucide-react';

/**
 * CommonFooter.jsx - Shared Global Footer Component for all PE Lab pages.
 * Displays Educational Simulation Notice, Interactive Labs links, Standards & Resources, and Contact.
 */
export const CommonFooter = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#060b16] text-slate-300 font-sans relative z-30 shrink-0 py-5 px-4 select-none">
      {/* Top Accent Gradient Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 absolute top-0 left-0" />

      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-3.5 text-center">
        {/* Row 1: Brand & Tagline */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-600/30">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight font-mono">
              Power Electronics Training LAB
            </span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <p className="text-[11px] text-slate-400 font-sans">
            High-fidelity client-side ODE simulation suite for industrial power quality, SCR converters &amp; switchgear.
          </p>
        </div>

        {/* Row 2: Interactive Simulator Quick Links (Centered Justified Pills) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono py-0.5">
          {[
            { label: '⚡ Foundation', href: '/foundation-lab', cls: 'hover:text-cyan-300' },
            { label: '🔌 6-Pulse Charger', href: '/single-6-pulse-charger', cls: 'hover:text-amber-300' },
            { label: '🔋 Dual Substation', href: '/dual-charger-scheme', cls: 'hover:text-yellow-300' },
            { label: '🔄 Static Switch', href: '/static-switch', cls: 'hover:text-rose-300' },
            { label: '🚀 Soft Starter', href: '/soft-starter', cls: 'hover:text-teal-300' },
            { label: '📊 Harmonics PQ', href: '/harmonics-filter', cls: 'hover:text-purple-300 font-bold text-cyan-300' },
            { label: '⚡ DC-DC Converter', href: '/dc-dc-converter', cls: 'hover:text-emerald-300 font-bold text-emerald-400' },
            { label: '🔄 SPWM Inverter', href: '/single-phase-inverter', cls: 'hover:text-amber-300 font-bold text-amber-300' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`px-2.5 py-1 rounded-lg bg-[#0b1324] border border-slate-800 text-slate-300 hover:border-slate-700 transition-all ${item.cls}`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Row 3: Standards, Contact & Credit Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] font-mono text-slate-400 border-t border-b border-slate-800/60 py-2 w-full max-w-4xl">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>IEEE 519-2022 • ANSI C57.110 • IEC 61000-4-7</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <a href="mailto:0808miracle@gmail.com" className="text-cyan-300 hover:underline">
              0808miracle@gmail.com
            </a>
          </div>

          <div className="flex items-center gap-1">
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

        {/* Row 4: Copyright & Disclaimer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 w-full max-w-4xl font-mono">
          <span>© {new Date().getFullYear()} Power Electronics Training LAB. All rights reserved.</span>
          <span className="text-slate-400">
            Educational Simulation Notice: Model-based ODE simulations for engineering learning.
          </span>
        </div>
      </div>
    </footer>
  );
};
