import React from 'react';

interface TopologyPreviewSVGProps {
  simId: string;
  className?: string;
}

export const TopologyPreviewSVG: React.FC<TopologyPreviewSVGProps> = ({ simId, className = 'w-full h-28' }) => {
  switch (simId) {
    case 'foundation-lab':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          <path d="M0 48H320M80 0V95M160 0V95M240 0V95" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
          
          {/* AC Source */}
          <circle cx="42" cy="48" r="15" stroke="#10b981" strokeWidth="1.8" fill="#0b192c" />
          <path d="M33 48 C 36 40, 40 40, 42 48 C 44 56, 48 56, 51 48" stroke="#34d399" strokeWidth="2" fill="none" />
          <text x="42" y="78" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">230V AC</text>
          
          {/* Bus connection */}
          <path d="M57 48 H90" stroke="#10b981" strokeWidth="2" />
          
          {/* Rectifier Bridge Block */}
          <rect x="90" y="28" width="56" height="40" rx="7" fill="#0f2231" stroke="#10b981" strokeWidth="1.5" />
          <polygon points="107,37 107,59 125,48" fill="#10b981" fillOpacity="0.8" />
          <line x1="125" y1="37" x2="125" y2="59" stroke="#34d399" strokeWidth="2.5" />
          <path d="M112 37 L116 33" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="118" y="80" fill="#94a3b8" fontSize="8.5" textAnchor="middle" fontFamily="monospace">SCR / DIODE</text>
          
          {/* Filter LC */}
          <path d="M146 48 H175" stroke="#34d399" strokeWidth="2" />
          <path d="M175 48 Q 181 36, 187 48 Q 193 36, 199 48 Q 205 36, 211 48" stroke="#10b981" strokeWidth="2.2" fill="none" />
          <text x="193" y="32" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">L: 10mH</text>
          
          <path d="M211 48 H250" stroke="#34d399" strokeWidth="2" />
          {/* Capacitor shunt */}
          <line x1="230" y1="48" x2="230" y2="60" stroke="#34d399" strokeWidth="1.5" />
          <line x1="222" y1="60" x2="238" y2="60" stroke="#10b981" strokeWidth="2.2" />
          <line x1="222" y1="65" x2="238" y2="65" stroke="#10b981" strokeWidth="2.2" />
          <line x1="230" y1="65" x2="230" y2="76" stroke="#34d399" strokeWidth="1.5" />
          
          {/* Load */}
          <rect x="250" y="32" width="54" height="32" rx="6" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.5" />
          <text x="277" y="48" fill="#34d399" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">R-L LOAD</text>
          <text x="277" y="60" fill="#6ee7b7" fontSize="8" textAnchor="middle" fontFamily="monospace">Vdc: 198V</text>
        </svg>
      );

    case 'single-charger':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          <path d="M0 48H320M100 0V95M210 0V95" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
          
          {/* 3-Phase AC Infeed */}
          <rect x="14" y="28" width="58" height="38" rx="6" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="43" y="47" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">415V 3Ø</text>
          <text x="43" y="59" fill="#d97706" fontSize="8" textAnchor="middle" fontFamily="monospace">50Hz Infeed</text>
          
          <path d="M72 48 H96" stroke="#f59e0b" strokeWidth="2" />
          
          {/* 6-Pulse Graetz Bridge */}
          <rect x="96" y="24" width="76" height="46" rx="7" fill="#291a07" stroke="#f59e0b" strokeWidth="1.8" />
          <text x="134" y="44" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">6-SCR</text>
          <text x="134" y="58" fill="#fde68a" fontSize="8.5" textAnchor="middle" fontFamily="monospace">GRAETZ α:30°</text>
          
          <path d="M172 48 H202" stroke="#f59e0b" strokeWidth="2" />
          
          {/* Ripple Filter Choke */}
          <circle cx="218" cy="48" r="13" stroke="#f59e0b" strokeWidth="1.8" fill="#1c1917" />
          <text x="218" y="51" fill="#fbbf24" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">LC</text>
          
          <path d="M231 48 H252" stroke="#10b981" strokeWidth="2" />
          
          {/* Battery Bank */}
          <rect x="252" y="25" width="54" height="44" rx="6" fill="#064e3b" fillOpacity="0.5" stroke="#10b981" strokeWidth="1.5" />
          <path d="M262 38 V56 M270 33 V61 M278 38 V56 M286 33 V61" stroke="#34d399" strokeWidth="2.2" />
          <text x="279" y="80" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">110VDC</text>
        </svg>
      );

    case 'dual-charger':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          
          {/* Charger 1A */}
          <rect x="14" y="16" width="76" height="27" rx="5" fill="#1f1c07" stroke="#eab308" strokeWidth="1.5" />
          <text x="52" y="33" fill="#fde047" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CHG 1A (220V)</text>
          
          {/* Charger 1B */}
          <rect x="14" y="52" width="76" height="27" rx="5" fill="#1f1c07" stroke="#eab308" strokeWidth="1.5" />
          <text x="52" y="69" fill="#fde047" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CHG 1B (220V)</text>
          
          {/* Bus Lines */}
          <path d="M90 30 H138 V40" stroke="#eab308" strokeWidth="2" />
          <path d="M90 65 H138 V54" stroke="#eab308" strokeWidth="2" />
          
          {/* 52-BC Bus Tie Breaker */}
          <rect x="134" y="38" width="62" height="18" rx="4" fill="#0f172a" stroke="#eab308" strokeWidth="1.8" />
          <text x="165" y="50" fill="#fde047" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">52-BC TIE</text>
          
          {/* Earth Fault Relay Sensor 64G */}
          <circle cx="165" cy="74" r="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.2" />
          <text x="165" y="77" fill="#a5b4fc" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">64G</text>
          <line x1="165" y1="56" x2="165" y2="66" stroke="#818cf8" strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Distribution to Dual Banks */}
          <path d="M196 47 H224" stroke="#10b981" strokeWidth="2" />
          <path d="M224 30 H246" stroke="#10b981" strokeWidth="2" />
          <path d="M224 65 H246" stroke="#10b981" strokeWidth="2" />
          <path d="M224 30 V65" stroke="#10b981" strokeWidth="2" />
          
          {/* Dual Battery Banks */}
          <rect x="246" y="16" width="62" height="27" rx="5" fill="#064e3b" fillOpacity="0.5" stroke="#10b981" strokeWidth="1.5" />
          <text x="277" y="33" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BANK-1 220V</text>
          
          <rect x="246" y="52" width="62" height="27" rx="5" fill="#064e3b" fillOpacity="0.5" stroke="#10b981" strokeWidth="1.5" />
          <text x="277" y="69" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BANK-2 220V</text>
        </svg>
      );

    case 'static-switch':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          
          {/* Source 1 (UPS Inverter) */}
          <rect x="14" y="18" width="74" height="26" rx="5" fill="#200d17" stroke="#f43f5e" strokeWidth="1.5" />
          <text x="51" y="34" fill="#fda4af" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SRC 1 (INV)</text>
          
          {/* Source 2 (Bypass Grid) */}
          <rect x="14" y="52" width="74" height="26" rx="5" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="51" y="68" fill="#fbbf24" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SRC 2 (BYP)</text>
          
          {/* Feed Lines */}
          <path d="M88 31 H135 V42" stroke="#f43f5e" strokeWidth="2" />
          <path d="M88 65 H135 V53" stroke="#f59e0b" strokeWidth="2" />
          
          {/* Fast Transfer BBM Module <4ms */}
          <rect x="135" y="28" width="98" height="40" rx="7" fill="#1c0711" stroke="#f43f5e" strokeWidth="1.8" />
          <text x="184" y="45" fill="#f43f5e" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BBM SCR STS</text>
          <text x="184" y="58" fill="#fda4af" fontSize="8" textAnchor="middle" fontFamily="monospace">&lt;4ms BREAK/MAKE</text>
          
          {/* Output Line to Critical Load */}
          <path d="M233 48 H262" stroke="#10b981" strokeWidth="2" />
          <rect x="262" y="30" width="46" height="35" rx="5" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
          <text x="285" y="47" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">UPS</text>
          <text x="285" y="58" fill="#6ee7b7" fontSize="7.5" textAnchor="middle" fontFamily="monospace">LOAD</text>
        </svg>
      );

    case 'soft-starter':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          
          {/* 3-Phase 415V Grid Infeed */}
          <rect x="14" y="28" width="60" height="40" rx="6" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
          <text x="44" y="47" fill="#2dd4bf" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">415V 3Ø</text>
          <text x="44" y="59" fill="#5eead4" fontSize="8" textAnchor="middle" fontFamily="monospace">50Hz Mains</text>
          
          <path d="M74 48 H104" stroke="#14b8a6" strokeWidth="2" />
          
          {/* Back-to-Back Thyristor Pair */}
          <rect x="104" y="25" width="82" height="45" rx="7" fill="#134e4a" fillOpacity="0.4" stroke="#14b8a6" strokeWidth="1.8" />
          <text x="145" y="44" fill="#2dd4bf" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">ANTI-PARALLEL</text>
          <text x="145" y="57" fill="#ccfbf1" fontSize="8" textAnchor="middle" fontFamily="monospace">SCR α: 135°→0°</text>
          
          {/* Current Limiting Ramp Arrow */}
          <path d="M186 48 H218" stroke="#14b8a6" strokeWidth="2" />
          <polygon points="214,44 224,48 214,52" fill="#14b8a6" />
          
          {/* 3-Phase Induction Motor */}
          <circle cx="266" cy="48" r="22" fill="#0f172a" stroke="#14b8a6" strokeWidth="2" />
          <text x="266" y="46" fill="#2dd4bf" fontSize="11" fontWeight="black" textAnchor="middle" fontFamily="monospace">M</text>
          <text x="266" y="58" fill="#5eead4" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">3 ~ AC</text>
          <text x="266" y="80" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">SOFT RAMP</text>
        </svg>
      );

    case 'harmonics':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          
          {/* Distorted Non-linear Load */}
          <rect x="14" y="28" width="65" height="40" rx="6" fill="#1e1035" stroke="#8b5cf6" strokeWidth="1.5" />
          <text x="46" y="46" fill="#c4b5fd" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">VFD LOAD</text>
          <text x="46" y="58" fill="#a78bfa" fontSize="8" textAnchor="middle" fontFamily="monospace">THDv: 28%</text>
          
          <path d="M79 48 H115" stroke="#8b5cf6" strokeWidth="2" />
          
          {/* Active Power Filter (APF) & FFT */}
          <rect x="115" y="22" width="94" height="52" rx="7" fill="#2e1065" stroke="#8b5cf6" strokeWidth="1.8" />
          <text x="162" y="38" fill="#ddd6fe" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">APF INVERTER</text>
          
          {/* Mini FFT Bars */}
          <rect x="130" y="48" width="6" height="18" fill="#ef4444" rx="1" />
          <rect x="140" y="54" width="6" height="12" fill="#f59e0b" rx="1" />
          <rect x="150" y="44" width="6" height="22" fill="#10b981" rx="1" />
          <rect x="160" y="58" width="6" height="8" fill="#8b5cf6" rx="1" />
          <rect x="170" y="52" width="6" height="14" fill="#38bdf8" rx="1" />
          <rect x="180" y="60" width="6" height="6" fill="#6366f1" rx="1" />
          
          <path d="M209 48 H245" stroke="#10b981" strokeWidth="2" />
          
          {/* Clean IEEE 519 Grid Out */}
          <rect x="245" y="28" width="62" height="40" rx="6" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
          <text x="276" y="46" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CLEAN BUS</text>
          <text x="276" y="58" fill="#6ee7b7" fontSize="8" textAnchor="middle" fontFamily="monospace">THDv &lt; 5%</text>
        </svg>
      );

    case 'dc-dc-converter':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          
          {/* DC Input Vin */}
          <rect x="14" y="28" width="56" height="40" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="42" y="46" fill="#67e8f9" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">DC Vin</text>
          <text x="42" y="58" fill="#22d3ee" fontSize="8" textAnchor="middle" fontFamily="monospace">48V - 400V</text>
          
          <path d="M70 48 H98" stroke="#06b6d4" strokeWidth="2" />
          
          {/* MOSFET Switch Q1 */}
          <rect x="98" y="28" width="44" height="40" rx="6" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
          <path d="M110 38 V58 M118 36 V60 M126 42 V54" stroke="#67e8f9" strokeWidth="2" />
          <text x="120" y="78" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">MOSFET</text>
          
          {/* Inductor L1 */}
          <path d="M142 48 H165" stroke="#06b6d4" strokeWidth="2" />
          <path d="M165 48 Q 170 36, 175 48 Q 180 36, 185 48 Q 190 36, 195 48" stroke="#10b981" strokeWidth="2.2" fill="none" />
          <text x="180" y="32" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">L1</text>
          
          {/* Freewheel Diode */}
          <line x1="154" y1="48" x2="154" y2="64" stroke="#06b6d4" strokeWidth="1.5" />
          <polygon points="149,64 159,64 154,74" fill="#06b6d4" />
          <line x1="149" y1="74" x2="159" y2="74" stroke="#06b6d4" strokeWidth="2" />
          
          <path d="M195 48 H246" stroke="#10b981" strokeWidth="2" />
          
          {/* Capacitor C1 */}
          <line x1="220" y1="48" x2="220" y2="60" stroke="#10b981" strokeWidth="1.5" />
          <line x1="212" y1="60" x2="228" y2="60" stroke="#10b981" strokeWidth="2" />
          <line x1="212" y1="65" x2="228" y2="65" stroke="#10b981" strokeWidth="2" />
          
          {/* Regulated DC Out */}
          <rect x="246" y="28" width="62" height="40" rx="6" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
          <text x="277" y="46" fill="#34d399" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Vout REG</text>
          <text x="277" y="58" fill="#6ee7b7" fontSize="8" textAnchor="middle" fontFamily="monospace">CCM Mode</text>
        </svg>
      );

    case 'single-phase-inverter':
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          
          {/* 400V DC Link */}
          <rect x="14" y="28" width="56" height="40" rx="6" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="42" y="46" fill="#93c5fd" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">400V DC</text>
          <text x="42" y="58" fill="#60a5fa" fontSize="8" textAnchor="middle" fontFamily="monospace">Link Bus</text>
          
          <path d="M70 48 H98" stroke="#3b82f6" strokeWidth="2" />
          
          {/* Full-Bridge H-Bridge (S1-S4) */}
          <rect x="98" y="22" width="78" height="52" rx="7" fill="#172554" stroke="#3b82f6" strokeWidth="1.8" />
          <text x="137" y="42" fill="#bfdbfe" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">H-BRIDGE</text>
          <text x="137" y="56" fill="#93c5fd" fontSize="8" textAnchor="middle" fontFamily="monospace">SPWM ma:0.85</text>
          
          <path d="M176 48 H204" stroke="#3b82f6" strokeWidth="2" />
          
          {/* LC Low-pass Filter */}
          <path d="M204 48 Q 210 36, 216 48 Q 222 36, 228 48" stroke="#38bdf8" strokeWidth="2.2" fill="none" />
          <text x="216" y="32" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">LC</text>
          
          <path d="M228 48 H252" stroke="#10b981" strokeWidth="2" />
          
          {/* Pure 230V Sine Wave Out */}
          <rect x="252" y="26" width="56" height="44" rx="6" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
          <path d="M260 48 C 266 36, 272 36, 280 48 C 288 60, 294 60, 300 48" stroke="#34d399" strokeWidth="2.2" fill="none" />
          <text x="280" y="78" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">230V AC</text>
        </svg>
      );

    default:
      return (
        <svg className={className} viewBox="0 0 320 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="95" rx="10" fill="#090e1a" stroke="#1e293b" strokeWidth="1" />
          <path d="M20 48 H300" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="160" cy="48" r="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="160" y="52" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">⚡</text>
        </svg>
      );
  }
};
