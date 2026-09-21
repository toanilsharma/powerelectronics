import React from 'react';
import { Activity, Mail, ExternalLink, ShieldCheck } from 'lucide-react';

/**
 * CommonFooter.jsx - Shared Global Footer Component for all PE Lab simulator pages.
 * Fully aligned with the LiveSimulators.com network aesthetic, companion portals, and legal notices.
 */
export const CommonFooter = () => {
  return (
    <footer className="w-full border-t border-slate-800/90 bg-[#03060d] text-slate-400 font-sans relative z-30 shrink-0 py-8 px-4 sm:px-6 lg:px-12 2xl:px-16 select-none">
      {/* Top Accent Gradient Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-cyan-400 via-amber-400 to-emerald-400 absolute top-0 left-0 right-0 shadow-[0_1px_12px_rgba(34,211,238,0.35)]" />

      {/* Ambient background glow */}
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-cyan-950/15 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[1720px] mx-auto flex flex-col items-center justify-center gap-4 text-center relative z-10">
        {/* Row 1: LiveSimulators Brand & Tagline */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <a
            href="https://livesimulators.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] group-hover:scale-105 transition-transform">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight font-display">
              LiveSimulators<span className="text-cyan-400">.com</span>
            </span>
          </a>
          <span className="hidden sm:inline text-slate-700">|</span>
          <p className="text-xs text-slate-300 font-display font-medium">
            &ldquo;Don&apos;t Just Read Engineering. See It Happen.&rdquo;
          </p>
        </div>

        {/* Row 2: Interactive Simulator Quick Links (Pills) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono py-0.5">
          {[
            { label: '🧪 Foundation Lab', href: '/foundation-lab', cls: 'hover:text-cyan-300' },
            { label: '🔌 6-Pulse Charger', href: '/single-6-pulse-charger', cls: 'hover:text-amber-300' },
            { label: '🔋 Dual Substation', href: '/dual-charger-scheme', cls: 'hover:text-yellow-300' },
            { label: '🔄 Static Switch', href: '/static-switch', cls: 'hover:text-rose-300' },
            { label: '🚀 Soft Starter', href: '/soft-starter', cls: 'hover:text-teal-300' },
            { label: '📊 Harmonics PQ', href: '/harmonics-filter', cls: 'hover:text-purple-300' },
            { label: '⚡ DC-DC Converter', href: '/dc-dc-converter', cls: 'hover:text-emerald-300' },
            { label: '🔄 SPWM Inverter', href: '/single-phase-inverter', cls: 'hover:text-amber-300' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-cyan-500/50 transition-all ${item.cls}`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Row 3: Companion Portals Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] font-mono text-slate-400 border-t border-b border-slate-800/80 py-2.5 w-full max-w-4xl">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-white font-bold">Companion Portals:</span>
          </div>

          <a
            href="https://designcalculators.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>DesignCalculators.co.in (IEEE/IEC/ASME)</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>

          <a
            href="https://reliabilitytools.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>ReliabilityTools.co.in (Weibull/SIL/MTBF)</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>

          <a
            href="https://upslab.livesimulators.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>SafeOps UPS Lab</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        </div>

        {/* Row 4: Authoritative Educational Notice */}
        <div className="rounded-xl border border-slate-800/90 bg-[#040812]/95 p-3 text-[10.5px] font-mono leading-relaxed text-slate-500 w-full max-w-5xl text-left sm:text-center">
          <p className="m-0">
            <strong className="text-slate-400">Non-Affiliation &amp; Standards Reference Notice:</strong> All product names, trademarks, and standard designations (IEEE, IEC, ASME, API, ISO, ISA, NFPA, OSHA) belong to their respective proprietary owners. Mention of any standard or code is strictly for academic curriculum alignment, educational identification, and computational modeling context only.
          </p>
        </div>

        {/* Row 5: Copyright & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 w-full max-w-5xl font-mono pt-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>FLOAT64 ENGINE</span>
            <span>•</span>
            <span>GOOGLE TAG: G-WX8V8HH57V</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <a href="/disclaimer" className="text-amber-400 hover:underline font-bold">
              Disclaimer
            </a>
            <span>·</span>
            <a href="https://livesimulators.com/cookie-policy" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300">
              Cookie Policy
            </a>
            <span>·</span>
            <a href="/privacy" className="hover:text-cyan-300">
              Privacy
            </a>
            <span>·</span>
            <a href="/terms" className="hover:text-cyan-300">
              Terms
            </a>
          </div>

          <div>
            © {new Date().getFullYear()} LiveSimulators.com. All engineering principles conserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
