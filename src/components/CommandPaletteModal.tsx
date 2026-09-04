import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Zap,
  Cpu,
  Activity,
  Layers,
  Shield,
  Gauge,
  Sliders,
  RotateCw,
  Sparkles,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Mail,
  FileText
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Converter' | 'Switchgear' | 'Power Quality' | 'Docs & Standards' | 'System';
  icon: React.ReactNode;
  tags: string[];
  actionType: 'tab' | 'modal' | 'external';
  target: string;
  badge?: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'foundation-lab',
    title: '3-Phase SCR Controlled Rectifier Lab',
    subtitle: 'Graetz bridge, firing angle α conduction, overlap drop & RK4 ODE',
    category: 'Converter',
    icon: <Zap className="w-4 h-4 text-emerald-400" />,
    tags: ['scr', 'thyristor', 'rectifier', 'graetz', 'diode', 'alpha', 'firing', 'overlap', 'rk4', '415vac'],
    actionType: 'tab',
    target: 'foundation-lab',
    badge: '415VAC'
  },
  {
    id: 'single-charger',
    title: '6-Pulse Industrial Battery Charger',
    subtitle: 'Float / Boost modes, CC-CV charging curves & IEEE 946 sizing',
    category: 'Converter',
    icon: <BatteryIcon className="w-4 h-4 text-amber-400" />,
    tags: ['charger', 'battery', 'float', 'boost', 'lead-acid', 'cc-cv', '6-pulse', '220vdc', 'ieee 946'],
    actionType: 'tab',
    target: 'single-charger',
    badge: '220VDC'
  },
  {
    id: 'dual-charger',
    title: 'Dual-Bank 220VDC Substation & Ground Fault System',
    subtitle: 'Dual bus tie breaker 52-BC interlock & 64G earth leakage detection',
    category: 'Switchgear',
    icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
    tags: ['substation', 'dual charger', 'bus tie', 'breaker', 'ground fault', '64g', 'earth fault', 'dc bus'],
    actionType: 'tab',
    target: 'dual-charger',
    badge: 'FLAGSHIP'
  },
  {
    id: 'static-switch',
    title: 'Static Transfer Switch (STS)',
    subtitle: 'Sub-cycle <4ms dual AC source transfer with phase synchronization',
    category: 'Switchgear',
    icon: <RotateCw className="w-4 h-4 text-rose-400" />,
    tags: ['sts', 'static transfer switch', 'transfer', 'sub-cycle', 'ups', 'dual feed', 'bypass', 'iec 62040'],
    actionType: 'tab',
    target: 'static-switch',
    badge: '<4ms Fast'
  },
  {
    id: 'soft-starter',
    title: 'Solid-State SCR Soft Starter',
    subtitle: 'Thyristor voltage ramp starter with current limit & water hammer mitigation',
    category: 'Converter',
    icon: <Gauge className="w-4 h-4 text-teal-400" />,
    tags: ['soft starter', 'motor', 'induction motor', 'inrush', 'ramp', 'bypass contactor', 'water hammer'],
    actionType: 'tab',
    target: 'soft-starter',
    badge: '415V / 6.6kV'
  },
  {
    id: 'harmonics',
    title: 'Harmonics & Active Power Quality Lab',
    subtitle: 'Passive tuned LC filter & Active Power Filter (APF) with 50th FFT scanner',
    category: 'Power Quality',
    icon: <Activity className="w-4 h-4 text-purple-400" />,
    tags: ['harmonics', 'fft', 'thd', 'apf', 'filter', 'active filter', 'spectrum', 'ieee 519', 'power quality'],
    actionType: 'tab',
    target: 'harmonics',
    badge: 'IEEE 519'
  },
  {
    id: 'dc-dc-converter',
    title: 'DC-DC Converter Lab (Buck / Boost / Buck-Boost)',
    subtitle: 'CCM / DCM boundary tracking, inductor current ripple & efficiency map',
    category: 'Converter',
    icon: <Sliders className="w-4 h-4 text-sky-400" />,
    tags: ['dc-dc', 'buck', 'boost', 'buck-boost', 'sepic', 'ccm', 'dcm', 'duty cycle', 'inductor ripple'],
    actionType: 'tab',
    target: 'dc-dc-converter',
    badge: '12V - 400V'
  },
  {
    id: 'single-phase-inverter',
    title: 'Single-Phase Full-Bridge SPWM Inverter',
    subtitle: 'Sinusoidal PWM modulation index ma, carrier ratio mf & LC harmonic filter',
    category: 'Converter',
    icon: <Cpu className="w-4 h-4 text-indigo-400" />,
    tags: ['inverter', 'spwm', 'h-bridge', 'pwm', 'modulation', 'sine wave', 'lc filter', 'thd', '230vac'],
    actionType: 'tab',
    target: 'single-phase-inverter',
    badge: '230VAC 50Hz'
  },
  {
    id: 'methodology',
    title: 'Mathematical Methodology & Numerical Solvers',
    subtitle: 'RK4 4th-order Runge-Kutta numerical solver ODE equations & validation tests',
    category: 'Docs & Standards',
    icon: <BookOpen className="w-4 h-4 text-blue-400" />,
    tags: ['methodology', 'math', 'solver', 'ode', 'rk4', 'runge-kutta', 'equations', 'validation', 'physics'],
    actionType: 'tab',
    target: 'methodology',
    badge: 'Physics Core'
  },
  {
    id: 'standards',
    title: 'Standards Compliance & Safety Matrix',
    subtitle: 'IEEE 519, IEC 60146, IEEE 946, NFPA 70E and OSHA 1910.147 requirements',
    category: 'Docs & Standards',
    icon: <Shield className="w-4 h-4 text-emerald-400" />,
    tags: ['standards', 'ieee', 'iec', 'nfpa', 'osha', 'compliance', 'safety', 'loto', 'arc flash'],
    actionType: 'modal',
    target: 'standards',
    badge: 'Compliance'
  },
  {
    id: 'help',
    title: 'Help, Documentation & Keyboard Navigation',
    subtitle: 'Lab navigation guide, scope trace guides, and engineering hotkeys',
    category: 'System',
    icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
    tags: ['help', 'docs', 'shortcuts', 'navigation', 'guide', 'manual'],
    actionType: 'modal',
    target: 'help',
    badge: 'Guide'
  },
  {
    id: 'contact',
    title: 'Contact Engineering & University Lab Inquiries',
    subtitle: 'Get in touch for academic licensing, custom industrial models, or bug reports',
    category: 'System',
    icon: <Mail className="w-4 h-4 text-cyan-400" />,
    tags: ['contact', 'support', 'university', 'academic', 'license', 'inquiry', 'feedback'],
    actionType: 'modal',
    target: 'contact',
    badge: 'Support'
  }
];

function BatteryIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
      <line x1="22" x2="22" y1="11" y2="13"/>
    </svg>
  );
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onSelectSim: (tabId: string) => void;
  onOpenModal?: (modalType: string) => void;
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  isDarkMode,
  onSelectSim,
  onOpenModal
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items
  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      return item.tags.some((tag) => tag.toLowerCase().includes(q));
    });
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          executeItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const executeItem = (item: CommandItem) => {
    if (item.actionType === 'tab') {
      onSelectSim(item.target);
      onClose();
    } else if (item.actionType === 'modal') {
      onClose();
      if (onOpenModal) {
        onOpenModal(item.target);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isDarkMode
            ? 'bg-[#0b1220] border-slate-700/80 shadow-black/80 text-white'
            : 'bg-white border-slate-200 shadow-2xl text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* Search Header Bar */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${
          isDarkMode ? 'border-slate-800 bg-[#070d18]' : 'border-slate-100 bg-slate-50'
        }`}>
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search simulators, diagnostics, equations, standards (e.g., SCR, Inverter, 220VDC)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full bg-transparent text-sm sm:text-base outline-none font-medium placeholder:font-normal ${
              isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
          <button
            type="button"
            onClick={onClose}
            className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-colors ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-200/80 border-slate-300 text-slate-600 hover:text-slate-900'
            }`}
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin divide-y divide-transparent"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-blue-950/70 border border-blue-600/50 shadow-md shadow-blue-950/30'
                        : 'bg-blue-50/90 border border-blue-300 shadow-sm'
                      : isDarkMode
                      ? 'hover:bg-slate-800/50 border border-transparent'
                      : 'hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-900/60 border-blue-500/60 shadow-sm'
                          : 'bg-blue-100 border-blue-300'
                        : isDarkMode
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-100 border-slate-200'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold truncate ${
                          isSelected
                            ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                            : isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold tracking-wider uppercase border shrink-0 ${
                            isDarkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] sm:text-xs truncate ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                      isDarkMode ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${
                      isSelected
                        ? 'text-blue-400 translate-x-1'
                        : isDarkMode ? 'text-slate-600' : 'text-slate-400'
                    }`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
              <Search className="w-6 h-6 text-slate-500" />
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No matches found for &ldquo;<strong className="text-white">{query}</strong>&rdquo;
              </p>
              <span className="text-[11px] text-slate-500">
                Try searching for rectifier, inverter, buck, boost, harmonics, battery, or STS.
              </span>
            </div>
          )}
        </div>

        {/* Footer Hotkey Tips */}
        <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[10.5px] font-mono border-t ${
          isDarkMode ? 'border-slate-800 bg-[#070d18] text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9.5px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9.5px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9.5px]">↵</kbd>
              <span>to open</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-400">Ctrl + K</kbd>
            <span>anytime to quick-jump</span>
          </div>
        </div>
      </div>
    </div>
  );
}
