import React, { useState } from 'react';
import { Mail, ExternalLink, Activity, ArrowUpRight, Share2, Copy, Check, ShieldCheck, FileText, Cookie, AlertTriangle, Scale } from 'lucide-react';

interface FooterProps {
  isDarkMode?: boolean;
  setActiveTab?: (tab: string | null) => void;
  onOpenContact?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenAbout?: () => void;
  onOpenDisclaimer?: () => void;
  setShowHelp?: (show: boolean) => void;
  setShowStandards?: (show: boolean) => void;
}

export const Footer: React.FC<FooterProps> = ({
  isDarkMode = true,
  setActiveTab,
  onOpenContact,
  onOpenPrivacy,
  onOpenTerms,
  onOpenAbout,
  onOpenDisclaimer,
  setShowHelp,
  setShowStandards,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText('https://livesimulators.com');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const shareUrl = encodeURIComponent('https://livesimulators.com');
  const shareTitle = encodeURIComponent('LiveSimulators — Free Interactive First-Principles Engineering & Physics Simulators');

  const socialLinks = [
    {
      name: 'LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      colorClass: 'bg-[#0077b5]/15 hover:bg-[#0077b5] text-[#70b5f9] hover:text-white border-[#0077b5]/40 hover:border-[#0077b5]',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      name: 'X (Twitter)',
      url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
      colorClass: 'bg-white/10 hover:bg-white text-slate-200 hover:text-black border-slate-700 hover:border-white',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'WhatsApp',
      url: `https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`,
      colorClass: 'bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white border-[#25D366]/40 hover:border-[#25D366]',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
    },
    {
      name: 'Reddit',
      url: `https://reddit.com/submit?url=${shareUrl}&title=${shareTitle}`,
      colorClass: 'bg-[#FF4500]/15 hover:bg-[#FF4500] text-[#FF4500] hover:text-white border-[#FF4500]/40 hover:border-[#FF4500]',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm7.625 13.875c.012.164.018.33.018.498 0 2.535-2.94 4.59-6.564 4.59s-6.564-2.055-6.564-4.59c0-.168.006-.334.018-.498-.59-.344-.988-.979-.988-1.706 0-1.096.889-1.984 1.984-1.984.542 0 1.033.218 1.393.57 1.15-.79 2.709-1.303 4.444-1.364l.872-4.098 2.848.605c.083-.497.513-.878 1.03-.878.58 0 1.05.47 1.05 1.05s-.47 1.05-1.05 1.05c-.538 0-.98-.406-1.038-.927l-2.457-.523-.746 3.513c1.78.051 3.385.57 4.562 1.378.364-.361.865-.586 1.419-.586 1.095 0 1.984.888 1.984 1.984 0 .727-.398 1.362-.988 1.706zm-8.875-1.875c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm-6.275 4.965c-.09-.091-.09-.237 0-.327.279-.279 1.163-.638 2.025-.638s1.746.359 2.025.638c.09.09.09.236 0 .327-.09.09-.236.09-.327 0-.21-.21-.92-.465-1.698-.465s-1.488.255-1.698.465c-.091.09-.237.09-.327 0z" />
        </svg>
      ),
    },
    {
      name: 'Telegram',
      url: `https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`,
      colorClass: 'bg-[#229ED9]/15 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border-[#229ED9]/40 hover:border-[#229ED9]',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.195 1.006.128.832.942z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      colorClass: 'bg-[#1877F2]/15 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border-[#1877F2]/40 hover:border-[#1877F2]',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
        </svg>
      ),
    },
  ];

  const industrialLabs = [
    {
      id: 'power-electronics-lab',
      name: 'Power Electronics Lab',
      modules: 16,
      dept: 'electrical',
      url: 'https://powerelectronics.livesimulators.com',
      isCurrent: true,
    },
    {
      id: 'safeops-ups',
      name: 'SafeOps UPS',
      modules: 12,
      dept: 'instrumentation',
      url: 'https://upslab.livesimulators.com',
      isCurrent: false,
    },
    {
      id: 'power-systems-lab',
      name: 'Power Systems Lab',
      modules: 14,
      dept: 'electrical',
      url: 'https://powersystemlab.netlify.app',
      isCurrent: false,
    },
    {
      id: 'electrolive-electrical-safety',
      name: 'ElectroLive Electrical Safety',
      modules: 10,
      dept: 'electrical',
      url: 'https://electrolive.netlify.app',
      isCurrent: false,
    },
  ];

  const disciplines = [
    { name: 'Electrical Engineering', url: 'https://livesimulators.com/department/electrical' },
    { name: 'Mechanical Systems', url: 'https://livesimulators.com/department/mechanical' },
    { name: 'Control & Signals', url: 'https://livesimulators.com/department/control' },
    { name: 'Chemical & Process', url: 'https://livesimulators.com/department/chemical' },
    { name: 'Civil & Structural', url: 'https://livesimulators.com/department/civil' },
    { name: 'Applied Physics', url: 'https://livesimulators.com/department/physics' },
  ];

  return (
    <footer className="w-full bg-[#03060d] border-t border-slate-800/90 text-slate-400 font-sans text-xs relative overflow-hidden select-none">
      {/* Top Accent Gradient Bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-cyan-400 via-amber-400 to-emerald-400 absolute top-0 left-0 right-0 shadow-[0_1px_12px_rgba(34,211,238,0.35)]" />

      {/* Ambient background glow & tech grid */}
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-950/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative z-10">
        {/* 1. Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Column 1: Brand & Founder Card */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-3">
              <a
                href="https://livesimulators.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:scale-105 transition-transform">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="font-display text-xl font-bold text-white tracking-tight">
                  LiveSimulators<span className="text-cyan-400">.com</span>
                </span>
              </a>
            </div>

            <p className="text-slate-200 text-sm font-display font-semibold tracking-tight">
              &ldquo;Don&apos;t Just Read Engineering. See It Happen.&rdquo;
            </p>

            <p className="text-slate-400 text-xs font-sans leading-relaxed max-w-sm">
              Interactive numerical simulations turning abstract differential formulations into intuitive, real-time physical behaviors for students, educators, and practicing engineers.
            </p>

            {/* Founder Card */}
            <div className="pt-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 max-w-sm font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">Anil Sharma</span>
                <span className="text-[10px] text-cyan-400 font-bold">FOUNDER</span>
              </div>
              <div className="flex flex-col gap-1 text-slate-400">
                <a
                  href="mailto:0808miracle@gmail.com"
                  className="hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3 h-3 text-cyan-400" />
                  <span>0808miracle@gmail.com</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/toanilsharma/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                >
                  <span className="text-blue-400 font-bold">in</span>
                  <span>linkedin.com/in/toanilsharma</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Disciplines */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="text-white font-display font-semibold text-xs uppercase tracking-wider">
              Disciplines
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 m-0 p-0 list-none">
              {disciplines.map((d) => (
                <li key={d.name}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors text-left flex items-center justify-between group"
                  >
                    <span>{d.name}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Industrial Labs Pro */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="text-white font-display font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-cyan-400">⚡</span>
              <span>Industrial Labs Pro</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 m-0 p-0 list-none">
              {industrialLabs.map((lab) => (
                <li key={lab.id}>
                  <a
                    href={lab.url}
                    target={lab.isCurrent ? undefined : '_blank'}
                    rel={lab.isCurrent ? undefined : 'noopener noreferrer'}
                    onClick={(e) => {
                      if (lab.isCurrent && setActiveTab) {
                        e.preventDefault();
                        setActiveTab(null);
                        window.history.pushState({}, '', '/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="hover:text-cyan-400 transition-colors text-left flex items-start gap-1 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium truncate ${lab.isCurrent ? 'text-cyan-400 font-bold' : 'group-hover:text-cyan-300'}`}>
                          {lab.name}
                        </span>
                        {lab.isCurrent ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            CURRENT
                          </span>
                        ) : (
                          <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 shrink-0 transition-colors" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 block truncate">
                        {lab.modules} Modules • {lab.dept}
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: About & Desk */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="text-white font-display font-semibold text-xs uppercase tracking-wider">
              About &amp; Desk
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 m-0 p-0 list-none">
              <li>
                <button
                  type="button"
                  onClick={onOpenAbout}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center justify-between w-full group bg-transparent border-none p-0 cursor-pointer text-xs text-slate-300"
                >
                  <span>About Us</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1 text-cyan-400/90 font-medium bg-transparent border-none p-0 cursor-pointer text-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Contact Us</span>
                </button>
              </li>
              <li>
                <a
                  href="https://livesimulators.com/#engineering-principles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors text-left flex items-center justify-between group"
                >
                  <span>Principles</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                </a>
              </li>
              <li>
                <a
                  href="https://livesimulators.com/#how-it-works"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors text-left flex items-center justify-between group"
                >
                  <span>Architecture</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                </a>
              </li>
              {setShowStandards && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowStandards(true)}
                    className="hover:text-cyan-400 transition-colors text-left flex items-center justify-between w-full group bg-transparent border-none p-0 cursor-pointer text-xs text-slate-300"
                  >
                    <span>Standards Matrix</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Column 5: Legal */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="text-white font-display font-semibold text-xs uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 m-0 p-0 list-none">
              <li>
                <button
                  type="button"
                  onClick={onOpenDisclaimer}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5 w-full group bg-transparent border-none p-0 cursor-pointer text-xs text-slate-300"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80" />
                  <span>Engineering Disclaimer</span>
                </button>
              </li>
              <li>
                <a
                  href="https://livesimulators.com/cookie-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5 group"
                >
                  <Cookie className="w-3.5 h-3.5 text-cyan-400/80" />
                  <span>Cookie Policy</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5 w-full group bg-transparent border-none p-0 cursor-pointer text-xs text-slate-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
                  <span>Privacy Policy (GDPR/CCPA)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5 w-full group bg-transparent border-none p-0 cursor-pointer text-xs text-slate-300"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Terms of Service</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. Social Share LiveSimulators Bar */}
        <div className="mt-14 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/20 border border-slate-800/90 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-display font-bold text-white tracking-tight">
                Share LiveSimulators with Engineering Colleagues &amp; Students
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed m-0">
              Help engineers, university professors, and students discover free, interactive first-principles simulations for continuous processes, power electronics, and structural mechanics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {socialLinks.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Share LiveSimulators on ${s.name}`}
                aria-label={`Share on ${s.name}`}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 ${s.colorClass}`}
              >
                {s.icon}
                <span className="hidden sm:inline font-sans">{s.name}</span>
              </a>
            ))}

            <button
              onClick={handleCopyLink}
              type="button"
              title="Copy LiveSimulators.com Link"
              aria-label="Copy LiveSimulators link"
              className={`px-3 py-2 rounded-xl border text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
                linkCopied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-500'
              }`}
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-emerald-300 font-sans">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-sans">Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Engineering Ecosystem by Anil Sharma (Companion Portals) */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-display font-bold text-white tracking-wide uppercase">
                Engineering Ecosystem by Anil Sharma
              </span>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                • Free Companion Portals
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 hidden md:inline">
              Standards-Referenced Calculation &amp; Plant Reliability Analytics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DesignCalculators.co.in */}
            <a
              href="https://designcalculators.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400/80 transition-all duration-200 flex flex-col justify-between gap-3 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform font-bold text-sm">
                    📐
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                        DesignCalculators.co.in
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/90 block">
                      Electrical • Mechanical • Instrumentation Calculators
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                  IEEE • IEC • ASME Refs
                </span>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed m-0">
                Free engineering calculators for Electrical, Mechanical, and Instrumentation disciplines based on publicly documented industry methodologies (referenced from IEEE, IEC, ASME, API, ISA for technical reference only)—covering cable sizing, substation grounding, pressure vessels, pipe hydraulics, and control valve sizing (<span className="font-mono text-slate-200">Cv</span>).
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="text-emerald-400/80">Referenced Industry Standards</span>
                <span className="text-emerald-400 font-medium group-hover:underline flex items-center gap-1">
                  Visit portal ↗
                </span>
              </div>
            </a>

            {/* ReliabilityTools.co.in */}
            <a
              href="https://reliabilitytools.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-violet-500/30 hover:border-violet-400/80 transition-all duration-200 flex flex-col justify-between gap-3 hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 group-hover:scale-105 transition-transform font-bold text-sm">
                    ⚙️
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm text-white group-hover:text-violet-300 transition-colors">
                        ReliabilityTools.co.in
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-violet-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <span className="text-[10px] font-mono text-violet-400/90 block">
                      Plant Reliability &amp; Maintenance Analytics
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-violet-500/10 text-violet-300 border border-violet-500/30 shrink-0">
                  Uptime &amp; Analytics
                </span>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed m-0">
                Improve your plant’s reliability and reduce downtime using free reliability tools—including 2P/3P Weibull failure analysis, MTBF/MTTR uptime modeling, Root Cause Analysis (RCA), OEE loss tracking, and IEC 61508/61511 SIL verification.
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="text-violet-400/80">Asset Optimization &amp; RCA</span>
                <span className="text-violet-400 font-medium group-hover:underline flex items-center gap-1">
                  Visit portal ↗
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* 4. Standards & Legal Disclaimers */}
        <div className="mt-10 pt-8 border-t border-slate-900 text-[11px] text-slate-500 font-sans leading-relaxed max-w-5xl space-y-2">
          <p className="m-0">
            LiveSimulators provides interactive engineering learning experiences and conceptual visualizations. Simulations are intended for education and exploration; users should consult applicable standards, engineering documentation, and qualified professionals for real-world design, safety, or operational decisions.
          </p>
          <p className="text-[10px] text-slate-500 m-0">
            <strong className="text-slate-400">Non-Affiliation &amp; Standards Reference Notice:</strong> All product names, trademarks, and standard designations (including IEEE, IEC, ASME, API, ISO, ISA, NFPA, and ASTM) belong to their respective proprietary owners. Mention of any standard, code, or organization is strictly for academic cross-referencing, educational identification, and computational modeling context only, and does not constitute or imply any endorsement, sponsorship, affiliation, certification, or approval by any standards organization.
          </p>
        </div>

        {/* 5. Bottom Copyright Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-mono text-slate-500 border-t border-slate-900/60 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>FLOAT64 ENGINE</span>
            </div>
            <span>•</span>
            <span>GOOGLE TAG: G-WX8V8HH57V</span>
            <span>•</span>
            <span>OPEN ACADEMIC ACCESS</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <button type="button" onClick={onOpenAbout} className="hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-[10px]">About</button>
            <button type="button" onClick={onOpenContact} className="hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-[10px]">Contact</button>
            <a href="https://livesimulators.com/cookie-policy" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Cookie Policy</a>
            <button type="button" onClick={onOpenDisclaimer} className="hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-[10px]">Disclaimer</button>
            <button type="button" onClick={onOpenPrivacy} className="hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-[10px]">Privacy</button>
            <button type="button" onClick={onOpenTerms} className="hover:text-cyan-400 transition-colors bg-transparent border-none p-0 cursor-pointer text-[10px]">Terms</button>
          </div>

          <div>
            © {currentYear} LiveSimulators.com. All engineering principles conserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
