import React from 'react';

interface TopologyPreviewSVGProps {
  simId: string;
  className?: string;
}

export const TopologyPreviewSVG: React.FC<TopologyPreviewSVGProps> = ({ simId, className = 'w-full h-24' }) => {
  switch (simId) {
    case 'foundation-lab':
      return (
        <svg className={className} viewBox="0 0 320 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="90" rx="8" fill="#0d1424" stroke="#1e293b" strokeWidth="1" />
          {/* Grid lines background */}
          <path d="M0 45H320M80 0V90M160 0V90M240 0V90" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
          
          {/* AC Source */}
          <circle cx="40" cy="45" r="14" stroke="#38bdf8" strokeWidth="1.5" fill="#0f172a" />
          <path d="M32 45 C 34 38, 38 38, 40 45 C 42 52, 46 52, 48 45" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          <text x="40" y="74" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">AC VAC</text>
          
          {/* Connections */}
          <path d="M54 45 H85" stroke="#38bdf8" strokeWidth="1.5" />
          
          {/* Diode / SCR Box */}
          <rect x="85" y="28" width="50" height="34" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
          <polygon points="102,36 102,54 118,45" fill="#3b82f6" opacity="0.8" />
          <line x1="118" y1="36" x2="118" y2="54" stroke="#38bdf8" strokeWidth="2" />
          <text x="110" y="74" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">RECTIFIER</text>
          
          {/* Connection to Filter */}
          <path d="M135 45 H165" stroke="#38bdf8" strokeWidth="1.5" />
          
          {/* Inductor L */}
          <path d="M165 45 Q 170 35, 175 45 Q 180 35, 185 45 Q 190 35, 195 45" stroke="#10b981" strokeWidth="2" fill="none" />
          
          {/* Connection to Load */}
          <path d="M195 45 H245" stroke="#10b981" strokeWidth="1.5" />
          
          {/* Capacitor C to GND */}
          <line x1="215" y1="45" x2="215" y2="56" stroke="#10b981" strokeWidth="1.5" />
          <line x1="207" y1="56" x2="223" y2="56" stroke="#10b981" strokeWidth="2" />
          <line x1="207" y1="60" x2="223" y2="60" stroke="#10b981" strokeWidth="2" />
          <line x1="215" y1="60" x2="215" y2="70" stroke="#10b981" strokeWidth="1.5" />
          
          {/* Load Resistor */}
          <rect x="245" y="32" width="40" height="26" rx="4" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.5" />
          <text x="265" y="48" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">LOAD</text>
          <text x="265" y="74" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">DC OUT</text>
        </svg>
      );

    case 'single-charger':
      return (
        <svg className={className} viewBox="0 0 320 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="90" rx="8" fill="#0d1424" stroke="#1e293b" strokeWidth="1" />
          <path d="M0 45H320M100 0V90M220 0V90" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
          
          {/* 3-Phase AC Tag */}
          <rect x="15" y="30" width="54" height="30" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="42" y="49" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">415V 3Ø</text>
          
          <path d="M69 45 H95" stroke="#38bdf8" strokeWidth="1.5" />
          
          {/* 6-SCR Thyristor Bridge */}
          <rect x="95" y="24" width="70" height="42" rx="6" fill="#0f172a" stroke="#2563eb" strokeWidth="1.5" />
          <text x="130" y="43" fill="#60a5fa" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">6-PULSE</text>
          <text x="130" y="55" fill="#38bdf8" fontSize="9" textAnchor="middle" fontFamily="monospace">SCR α</text>
          
          <path d="M165 45 H195" stroke="#10b981" strokeWidth="1.5" />
          
          {/* LC Filter */}
          <circle cx="210" cy="45" r="10" stroke="#10b981" strokeWidth="1.5" fill="#1e293b" />
          <text x="210" y="48" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">LC</text>
          
          <path d="M220 45 H245" stroke="#10b981" strokeWidth="1.5" />
          
          {/* Battery Bank Icon */}
          <rect x="245" y="26" width="58" height="38" rx="6" fill="#065f46" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
          <path d="M257 38 V52 M267 33 V57 M277 38 V52 M287 33 V57" stroke="#34d399" strokeWidth="2" />
          <text x="274" y="74" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">110VDC</text>
        </svg>
      );

    case 'dual-charger':
      return (
        <svg className={className} viewBox="0 0 320 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="90" rx="8" fill="#0d1424" stroke="#1e293b" strokeWidth="1" />
          
          {/* Charger 1A */}
          <rect x="16" y="16" width="70" height="26" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="51" y="32" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CHARGER 1A</text>
          
          {/* Charger 1B */}
          <rect x="16" y="48" width="70" height="26" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="51" y="64" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CHARGER 1B</text>
          
          {/* Lines to Bus */}
          <path d="M86 29 H135 V38" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M86 61 H135 V52" stroke="#38bdf8" strokeWidth="1.5" />
          
          {/* Bus Tie Switch 52-BC */}
          <rect x="130" y="36" width="60" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="160" y="48" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">52-BC TIE</text>
          
          {/* Lines to Dual Battery Banks */}
          <path d="M190 45 H220" stroke="#10b981" strokeWidth="1.5" />
          <path d="M220 29 H245" stroke="#10b981" strokeWidth="1.5" />
          <path d="M220 61 H245" stroke="#10b981" strokeWidth="1.5" />
          <path d="M220 29 V61" stroke="#10b981" strokeWidth="1.5" />
          
          {/* Dual Banks */}
          <rect x="245" y="16" width="60" height="25" rx="5" fill="#065f46" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.2" />
          <text x="275" y="31" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BANK-1 220V</text>
          
          <rect x="245" y="49" width="60" height="25" rx="5" fill="#065f46" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.2" />
          <text x="275" y="64" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BANK-2 220V</text>
        </svg>
      );



    case 'static-switch':
      return (
        <svg className={className} viewBox="0 0 320 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="90" rx="8" fill="#0d1424" stroke="#1e293b" strokeWidth="1" />
          
          {/* Source 1 */}
          <rect x="18" y="18" width="65" height="24" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="50" y="33" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SOURCE 1 (PRI)</text>
          
          {/* Source 2 */}
          <rect x="18" y="48" width="65" height="24" rx="5" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.2" />
          <text x="50" y="63" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SOURCE 2 (ALT)</text>
          
          {/* Lines to Transfer Switch */}
          <path d="M83 30 H140 V40" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M83 60 H140 V50" stroke="#f59e0b" strokeWidth="1.5" />
          
          {/* Fast Transfer Module <4ms */}
          <rect x="140" y="28" width="90" height="34" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
          <text x="185" y="44" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FAST TRANSFER</text>
          <text x="185" y="55" fill="#6ee7b7" fontSize="8" textAnchor="middle" fontFamily="monospace">&lt; 4ms SYNCHRO</text>
          
          {/* Output Line */}
          <path d="M230 45 H270" stroke="#10b981" strokeWidth="1.5" />
          <rect x="270" y="32" width="36" height="26" rx="5" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.2" />
          <text x="288" y="48" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">LOAD</text>
        </svg>
      );

    default:
      return (
        <svg className={className} viewBox="0 0 320 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="90" rx="8" fill="#0d1424" stroke="#1e293b" strokeWidth="1" />
          <path d="M20 45 H300" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="160" cy="45" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="160" y="49" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">⚡</text>
        </svg>
      );
  }
};
