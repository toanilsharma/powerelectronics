import React, { useState, useEffect } from 'react';
import { ActiveFaults } from '../types/batteryCharger';

interface BatteryChargerSLDProps {
  voltageIn?: number;
  loadPct?: number;
  firingAngle?: number;
  isRunning?: boolean;
  q1Closed?: boolean;
  q2Closed?: boolean;
  q3Closed?: boolean;
  onToggleQ1?: () => void;
  onToggleQ2?: () => void;
  onToggleQ3?: () => void;
  soc?: number;
  activeFaults?: ActiveFaults;
  hasLcFilter?: boolean;
}

interface ComponentInfo {
  name: string;
  rating: string;
  standard: string;
}

const TOOLTIPS: Record<string, ComponentInfo> = {
  Q1: { name: 'Main AC Incoming Breaker (52-Q1)', rating: '630A 25kA Icu, 3P', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  ISOLATOR: { name: 'Input Disconnector (89-Q1)', rating: '630A 3P Mechanical Interlocked', standard: 'IEC 60947-3 / IEEE C37.2-89' },
  FUSES: { name: 'Semiconductor Protection Fuses (F1-F3)', rating: '500A aR High-Speed', standard: 'IEC 60269-4' },
  CT: { name: 'Current Transformers (CT1-CT3)', rating: '500/5A Class 5P20 15VA', standard: 'IEC 61869-2' },
  SCR_BRIDGE: { name: '6-Pulse Thyristor Bridge (T1-T6)', rating: '1200V / 300A Phase Controlled', standard: 'IEC 60146-1-1' },
  L1: { name: 'DC Smoothing Reactor', rating: '2.5 mH, 200A DC, Class H', standard: 'IEC 60076-6' },
  C1: { name: 'DC Bus Capacitor Bank', rating: '4700 μF, 450VDC Electrolytic', standard: 'IEC 61071' },
  Q2: { name: 'Battery String Breaker (52-Q2)', rating: '200A 250VDC 2P', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  BATTERY: { name: 'VRLA Battery Bank', rating: '55 Cells [110V Nominal, 200Ah]', standard: 'IEEE 1188 / IEC 62485-2 / IEC 60896-21/22 VRLA' },
  Q3: { name: 'DC Load Feeder Breaker (52-Q3)', rating: '100A 250VDC 2P', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  LOAD: { name: 'Critical DC Distribution Load', rating: '110VDC / 100A Continuous Load', standard: 'IEC 60146-1-1 / IEC 61511' },
  GFD: { name: 'Ground Fault Detector Relay (64G)', rating: '< 100mA Sensitivity Insulation Monitor', standard: 'IEC 61557-8 / IEEE C37.2-64G' },
};

export const BatteryChargerSLD: React.FC<BatteryChargerSLDProps> = ({
  voltageIn = 415,
  loadPct = 85,
  firingAngle = 30,
  isRunning = true,
  q1Closed: propQ1,
  q2Closed: propQ2,
  q3Closed: propQ3,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
  soc: propSoc,
  activeFaults,
  hasLcFilter = true,
}) => {
  const [internalQ1, setInternalQ1] = useState<boolean>(true);
  const [internalQ2, setInternalQ2] = useState<boolean>(true);
  const [internalQ3, setInternalQ3] = useState<boolean>(true);
  const [internalSoc, setInternalSoc] = useState<number>(92);

  const q1Closed = propQ1 !== undefined ? propQ1 : internalQ1;
  const q2Closed = propQ2 !== undefined ? propQ2 : internalQ2;
  const q3Closed = propQ3 !== undefined ? propQ3 : internalQ3;
  const soc = propSoc !== undefined ? propSoc : internalSoc;

  const handleToggleQ1 = () => {
    if (onToggleQ1) onToggleQ1();
    else setInternalQ1(!internalQ1);
  };

  const handleToggleQ2 = () => {
    if (onToggleQ2) onToggleQ2();
    else setInternalQ2(!internalQ2);
  };

  const handleToggleQ3 = () => {
    if (onToggleQ3) onToggleQ3();
    else setInternalQ3(!internalQ3);
  };

  const [animFrame, setAnimFrame] = useState<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedScrModal, setSelectedScrModal] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;
    const update = () => {
      setAnimFrame((prev) => (prev + 1) % 360);

      if (isRunning && propSoc === undefined) {
        setInternalSoc((prev) => {
          if (q1Closed && q2Closed) {
            return Math.min(100, prev + 0.02);
          } else if (!q1Closed && q2Closed && q3Closed) {
            return Math.max(20, prev - 0.04);
          }
          return prev;
        });
      }

      timer = requestAnimationFrame(update);
    };

    timer = requestAnimationFrame(update);
    return () => cancelAnimationFrame(timer);
  }, [isRunning, q1Closed, q2Closed, q3Closed, propSoc]);

  const isRectifierActive = q1Closed && isRunning;
  let vdc = 0;
  if (activeFaults?.dcOvervoltage) {
    vdc = 145.0 + Math.sin(animFrame * 0.2) * 1.5;
  } else if (isRectifierActive) {
    const rad = (firingAngle * Math.PI) / 180;
    let baseV = ((3 * Math.SQRT2 * voltageIn) / Math.PI) * Math.cos(rad);
    if (firingAngle <= 90) {
      baseV = Math.max(0, 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((30 * Math.PI) / 180)));
    } else {
      baseV = 0;
    }

    if (activeFaults?.scrT3Open) {
      baseV *= 0.75;
    }
    if (activeFaults?.acPhaseLossL2) {
      baseV *= 0.80;
    }

    vdc = baseV + Math.sin(animFrame * 0.1) * 1.2;
  } else if (q2Closed) {
    let vCellFromSoc = 2.10;
    if (soc <= 0) vCellFromSoc = 1.85;
    else if (soc <= 25) vCellFromSoc = 1.85 + (soc / 250);
    else if (soc <= 50) vCellFromSoc = 1.95 + ((soc - 25) / 500);
    else if (soc <= 75) vCellFromSoc = 2.00 + ((soc - 50) / 250);
    else vCellFromSoc = 2.10 + ((soc - 75) / 192.3);
    vdc = vCellFromSoc * 55;
  } else {
    vdc = 0;
  }

  let idc = 0;
  if (q3Closed && vdc > 50) {
    idc = (vdc / 110) * (loadPct / 100) * 85 + Math.cos(animFrame * 0.15) * 0.8;
  }

  const totalCells = 55;
  const vCell = vdc > 0 ? vdc / totalCells : 0;
  let computedSoc = 0;
  if (vCell <= 1.85) computedSoc = 0;
  else if (vCell <= 1.95) computedSoc = (vCell - 1.85) * 250;
  else if (vCell <= 2.00) computedSoc = 25 + (vCell - 1.95) * 500;
  else if (vCell <= 2.10) computedSoc = 50 + (vCell - 2.00) * 250;
  else computedSoc = 75 + (vCell - 2.10) * 192.3;

  computedSoc = Math.min(100, Math.max(0, computedSoc));

  // 6-pulse bridge conduction physics
  // Firing sequence: T1->T2->T3->T4->T5->T6->T1...
  // Interval 0-60: T1 & T6
  // Interval 60-120: T1 & T2
  // Interval 120-180: T3 & T2
  // Interval 180-240: T3 & T4
  // Interval 240-300: T5 & T4
  // Interval 300-360: T5 & T6
  const deg = animFrame % 360;
  let activeTopSCR = 'T1';
  let activeBotSCR = 'T6';
  let lineVoltageName = 'Vab';

  if (deg < 60) {
    activeTopSCR = 'T1';
    activeBotSCR = 'T6';
    lineVoltageName = 'Vab';
  } else if (deg < 120) {
    activeTopSCR = 'T1';
    activeBotSCR = 'T2';
    lineVoltageName = 'Vac';
  } else if (deg < 180) {
    activeTopSCR = 'T3';
    activeBotSCR = 'T2';
    lineVoltageName = 'Vbc';
  } else if (deg < 240) {
    activeTopSCR = 'T3';
    activeBotSCR = 'T4';
    lineVoltageName = 'Vba';
  } else if (deg < 300) {
    activeTopSCR = 'T5';
    activeBotSCR = 'T4';
    lineVoltageName = 'Vca';
  } else {
    activeTopSCR = 'T5';
    activeBotSCR = 'T6';
    lineVoltageName = 'Vcb';
  }

  const dotOffset = (animFrame * 3) % 40;

  // Helper for IEC 60617 / IEEE 315 Circuit Breaker (Device 52 - MCCB/MCB)
  const renderIECBreaker = (
    x: number,
    y: number,
    id: string,
    label: string,
    rating: string,
    isClosed: boolean,
    onToggle: () => void,
    deviceNum: string = '52'
  ) => {
    const isHovered = hovered === id;
    const stateColor = isClosed ? '#10b981' : '#ef4444';

    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={onToggle}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Background Card / Hitbox */}
        <rect
          x={x - 130}
          y={y - 8}
          width={260}
          height={65}
          fill={isHovered ? '#1e293b' : '#161b22'}
          rx={8}
          stroke={isHovered ? '#38bdf8' : isClosed ? '#10b981' : '#f59e0b'}
          strokeWidth={isHovered ? 2.5 : 1.5}
          className="shadow-lg"
        />

        {/* Main Vertical Conductor Line */}
        <line x1={x - 80} y1={y - 8} x2={x - 80} y2={y + 12} stroke="#38bdf8" strokeWidth={3.5} />
        <line x1={x - 80} y1={y + 42} x2={x - 80} y2={y + 57} stroke="#38bdf8" strokeWidth={3.5} />

        {/* IEC 60617 Circuit Breaker Symbol Geometry: Fixed Top Contact with Trip Release 'X' */}
        <g transform={`translate(${x - 80}, ${y + 12})`}>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#f8fafc" strokeWidth="2.5" />
          <line x1="-6" y1="-6" x2="6" y2="6" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="6" y1="-6" x2="-6" y2="6" stroke="#f59e0b" strokeWidth="2.5" />
        </g>

        {/* Bottom Pivot Point */}
        <circle cx={x - 80} cy={y + 42} r={3.5} fill="#f8fafc" stroke="#000000" strokeWidth={1} />

        {/* Contact Blade */}
        {isClosed ? (
          <line x1={x - 80} y1={y + 42} x2={x - 80} y2={y + 12} stroke={stateColor} strokeWidth={3.5} />
        ) : (
          <g>
            <line x1={x - 80} y1={y + 42} x2={x - 64} y2={y + 16} stroke={stateColor} strokeWidth={3.5} />
            <text x={x - 72} y={y + 28} fill="#ef4444" fontSize="13" fontWeight="black">×</text>
          </g>
        )}

        {/* IEEE Device Number Circle */}
        <circle cx={x - 110} cy={y + 25} r={14} fill="#0f172a" stroke="#38bdf8" strokeWidth={2} />
        <text x={x - 110} y={y + 30} textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="black" fontFamily="monospace">
          {deviceNum}
        </text>

        {/* Bold Label & Rating */}
        <text x={x - 45} y={y + 20} fill="#ffffff" fontSize="13" fontWeight="black" fontFamily="sans-serif">
          {label}
        </text>
        <text x={x - 45} y={y + 36} fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">
          {rating}
        </text>

        {/* Status Badge */}
        <rect
          x={x + 55}
          y={y + 12}
          width={65}
          height={24}
          rx={4}
          fill={isClosed ? '#065f46' : '#991b1b'}
          stroke={isClosed ? '#34d399' : '#f87171'}
          strokeWidth={1.5}
        />
        <text x={x + 87} y={y + 28} textAnchor="middle" fill="#ffffff" fontSize={10} fontWeight="black">
          {isClosed ? 'CLOSED' : 'OPEN'}
        </text>
      </g>
    );
  };

  // Helper for IEC 60617 Disconnector / Isolator (Device 89)
  const renderIECDisconnector = (x: number, y: number, id: string, label: string, isClosed: boolean) => {
    const isHovered = hovered === id;
    const stateColor = isClosed ? '#10b981' : '#ef4444';

    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Background Hitbox */}
        <rect
          x={x - 130}
          y={y - 8}
          width={260}
          height={65}
          fill={isHovered ? '#1e293b' : '#161b22'}
          rx={8}
          stroke={isHovered ? '#38bdf8' : isClosed ? '#10b981' : '#f59e0b'}
          strokeWidth={isHovered ? 2.5 : 1.5}
        />

        {/* Main Conductor Line */}
        <line x1={x - 80} y1={y - 8} x2={x - 80} y2={y + 12} stroke="#38bdf8" strokeWidth={3.5} />
        <line x1={x - 80} y1={y + 42} x2={x - 80} y2={y + 57} stroke="#38bdf8" strokeWidth={3.5} />

        {/* IEC 60617 Disconnector Symbol (Top Fixed Bar) */}
        <line x1={x - 88} y1={y + 12} x2={x - 72} y2={y + 12} stroke="#f8fafc" strokeWidth={3} />

        {/* Pivot */}
        <circle cx={x - 80} cy={y + 42} r={3.5} fill="#f8fafc" stroke="#000000" strokeWidth={1} />

        {/* Blade */}
        {isClosed ? (
          <line x1={x - 80} y1={y + 42} x2={x - 80} y2={y + 12} stroke={stateColor} strokeWidth={3.5} />
        ) : (
          <line x1={x - 80} y1={y + 42} x2={x - 64} y2={y + 16} stroke={stateColor} strokeWidth={3.5} />
        )}

        {/* IEEE Device Tag Circle (89 = Disconnector) */}
        <circle cx={x - 110} cy={y + 25} r={14} fill="#0f172a" stroke="#f59e0b" strokeWidth={2} />
        <text x={x - 110} y={y + 30} textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="black" fontFamily="monospace">
          89
        </text>

        {/* Label */}
        <text x={x - 45} y={y + 20} fill="#ffffff" fontSize="13" fontWeight="black" fontFamily="sans-serif">
          {label}
        </text>
        <text x={x - 45} y={y + 36} fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">
          630A ISOLATOR SWITCH
        </text>

        {/* Status Badge */}
        <rect
          x={x + 55}
          y={y + 12}
          width={65}
          height={24}
          rx={4}
          fill={isClosed ? '#065f46' : '#991b1b'}
          stroke={isClosed ? '#34d399' : '#f87171'}
          strokeWidth={1.5}
        />
        <text x={x + 87} y={y + 28} textAnchor="middle" fill="#ffffff" fontSize={10} fontWeight="black">
          {isClosed ? 'CLOSED' : 'OPEN'}
        </text>
      </g>
    );
  };

  // Helper for IEC SCR symbol (Device T1-T6)
  const renderIECSCR = (
    x: number,
    y: number,
    id: string,
    label: string,
    isConducting: boolean,
    isFaulted: boolean = false,
    pointDown: boolean = true
  ) => {
    const fillColor = isFaulted ? '#666666' : isConducting ? '#FF6600' : '#333333';
    const strokeColor = isFaulted ? '#FF0000' : isConducting ? '#FF6600' : '#888888';
    const isHovered = hovered === id;

    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer transition-all duration-150"
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => setSelectedScrModal(id)}
      >
        {/* Invisible Hitbox for easy hover & click */}
        <rect x={-35} y={-25} width={70} height={50} fill="transparent" />

        {/* Hover Highlight Ring */}
        {isHovered && (
          <rect
            x={-30}
            y={-22}
            width={60}
            height={44}
            fill="none"
            stroke="#58a6ff"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            rx={4}
          />
        )}

        {/* Anode In Line */}
        <line x1={0} y1={pointDown ? -18 : 18} x2={0} y2={pointDown ? -10 : 10} stroke="#FF0000" strokeWidth={2.5} />

        {/* Cathode Out Line */}
        <line x1={0} y1={pointDown ? 10 : -10} x2={0} y2={pointDown ? 18 : -18} stroke="#0066FF" strokeWidth={2.5} />

        {/* SCR Triangle */}
        {pointDown ? (
          <polygon points="-10,-10 10,-10 0,8" fill={fillColor} stroke={strokeColor} strokeWidth={2.5} filter={isConducting || isHovered ? 'url(#glowOrange)' : 'none'} />
        ) : (
          <polygon points="-10,10 10,10 0,-8" fill={fillColor} stroke={strokeColor} strokeWidth={2.5} filter={isConducting || isHovered ? 'url(#glowOrange)' : 'none'} />
        )}

        {/* Cathode Bar */}
        {pointDown ? (
          <line x1={-12} y1={8} x2={12} y2={8} stroke={strokeColor} strokeWidth={2.5} />
        ) : (
          <line x1={-12} y1={-8} x2={12} y2={-8} stroke={strokeColor} strokeWidth={2.5} />
        )}

        {/* Gate Line angled 45° with small arrowhead */}
        {pointDown ? (
          <g>
            <line x1={-6} y1={2} x2={-16} y2={-6} stroke="#FFD700" strokeWidth={1.5} />
            <polygon points="-6,2 -10,-1 -7,-5" fill="#FFD700" />
          </g>
        ) : (
          <g>
            <line x1={-6} y1={-2} x2={-16} y2={6} stroke="#FFD700" strokeWidth={1.5} />
            <polygon points="-6,-2 -10,1 -7,5" fill="#FFD700" />
          </g>
        )}

        {/* Fault Mark */}
        {isFaulted && (
          <g>
            <line x1={-12} y1={-12} x2={12} y2={12} stroke="#FF0000" strokeWidth={3} />
            <line x1={12} y1={-12} x2={-12} y2={12} stroke="#FF0000" strokeWidth={3} />
          </g>
        )}

        {/* Label */}
        <text x={16} y={4} fill={isConducting ? '#FF6600' : isHovered ? '#58a6ff' : '#CCCCCC'} fontSize={11} fontWeight="bold" fontFamily="monospace">
          {label} {isConducting ? '⚡' : ''}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full max-w-[950px] mx-auto bg-[#0d1117] border border-[#30363d] rounded-lg p-4 select-none shadow-2xl">
      {/* TOP STATUS BAR */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#8b949e]">IEC 60617 REAL SLD:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold ${
              isRectifierActive
                ? 'bg-[rgba(63,185,80,0.15)] text-[#3fb950] border border-[rgba(63,185,80,0.3)]'
                : 'bg-[rgba(248,81,73,0.15)] text-[#f85149] border border-[rgba(248,81,73,0.3)]'
            }`}
          >
            {isRectifierActive ? 'CHARGER RECTIFIER ONLINE (6-PULSE)' : 'RECTIFIER OFF (BATTERY BACKUP)'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Active Pair: <strong className="text-[#FF6600] text-sm">{activeTopSCR} + {activeBotSCR} ({lineVoltageName})</strong></span>
          <span>Vdc: <strong className="text-[#3fb950] text-sm">{vdc.toFixed(1)} V</strong></span>
          <span>Idc: <strong className="text-[#3fb950] text-sm">{idc.toFixed(1)} A</strong></span>
          <span>SOC: <strong className="text-[#58a6ff] text-sm">{(isRectifierActive ? computedSoc : soc).toFixed(1)} %</strong></span>
        </div>
      </div>

      {/* HOVER TOOLTIP */}
      {hovered && (TOOLTIPS[hovered] || (hovered.startsWith('T') && hovered.length <= 2)) && (
        <div className="absolute top-16 right-6 bg-[#161b22] border border-[#0066FF] rounded-md p-3 shadow-xl z-20 pointer-events-none text-xs max-w-sm font-mono">
          <div className="font-bold text-[#0066FF] mb-1">
            {hovered.startsWith('T') && hovered.length <= 2
              ? `SCR Thyristor ${hovered} (Phase ${hovered === 'T1' || hovered === 'T4' ? 'A' : hovered === 'T3' || hovered === 'T6' ? 'B' : 'C'})`
              : TOOLTIPS[hovered]?.name}
          </div>
          <div className="text-[#c9d1d9] mb-1">
            Rating: <span className="text-[#FFD700]">
              {hovered.startsWith('T') && hovered.length <= 2
                ? `This is the SCR you learned in Module 4. Alpha = ${firingAngle}° now. Click to see gate pulse.`
                : TOOLTIPS[hovered]?.rating}
            </span>
          </div>
          <div className="text-[#8b949e]">
            Standard: <span>{TOOLTIPS[hovered]?.standard || 'IEC 60146-1-1 / Module 4 Continuity'}</span>
          </div>
        </div>
      )}

      {/* MAIN VERTICAL IEC SINGLE LINE DIAGRAM SVG */}
      <svg viewBox="0 0 900 780" className="w-full h-full max-h-full object-contain block">
        <defs>
          <filter id="glowOrange" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Dotted Grid Background */}
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#1e293b" />
          </pattern>
        </defs>

        <rect width="900" height="780" fill="#090d12" />
        <rect width="900" height="780" fill="url(#dotGrid)" />

        {/* DRAWING BORDER */}
        <rect x="10" y="10" width="880" height="760" fill="none" stroke="#30363d" strokeWidth="2" />

        {/* [1] INCOMING SUPPLY (y=25) */}
        <g id="sec1-supply">
          <text x="450" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="Arial, sans-serif">
            415VAC 3Φ 50Hz 25kA UTILITY INFEED
          </text>
          <text x="450" y="38" textAnchor="middle" fill="#8b949e" fontSize="9" fontFamily="Courier New, monospace">
            Cable: XLPE 3×185mm² + 95mm² E | Feeder Substation Bus 1
          </text>

          {/* Phase Lines L1 (#FF0000), L2 (#FFD700), L3 (#0066FF) */}
          <line x1={410} y1={42} x2={410} y2={70} stroke="#FF0000" strokeWidth={3.5} />
          {isRectifierActive && <line x1={410} y1={42} x2={410} y2={70} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-down" />}

          <line x1={450} y1={42} x2={450} y2={70} stroke={activeFaults?.acPhaseLossL2 ? '#666666' : '#FFD700'} strokeWidth={activeFaults?.acPhaseLossL2 ? 1 : 3.5} />
          {isRectifierActive && !activeFaults?.acPhaseLossL2 && <line x1={450} y1={42} x2={450} y2={70} stroke="#ffea70" strokeWidth={2} className="power-flow-dash-down" />}

          <line x1={490} y1={42} x2={490} y2={70} stroke="#0066FF" strokeWidth={3.5} />
          {isRectifierActive && <line x1={490} y1={42} x2={490} y2={70} stroke="#70b0ff" strokeWidth={2} className="power-flow-dash-down" />}

          {/* Phase Direction Arrows */}
          <polygon points="410,58 405,50 415,50" fill="#FF0000" />
          <polygon points="450,58 445,50 455,50" fill={activeFaults?.acPhaseLossL2 ? '#666666' : '#FFD700'} />
          <polygon points="490,58 485,50 495,50" fill="#0066FF" />

          {/* Phase Labels */}
          <text x={410} y={38} textAnchor="middle" fill="#FF0000" fontSize="9" fontFamily="monospace">L1</text>
          <text x={450} y={38} textAnchor="middle" fill={activeFaults?.acPhaseLossL2 ? '#FF0000' : '#FFD700'} fontSize="9" fontFamily="monospace">
            {activeFaults?.acPhaseLossL2 ? 'L2 (0V)' : 'L2'}
          </text>
          <text x={490} y={38} textAnchor="middle" fill="#0066FF" fontSize="9" fontFamily="monospace">L3</text>
        </g>

        {/* [2] INCOMING BREAKER 52-Q1 (y=72) */}
        <g id="sec2-breaker-q1">
          {renderIECBreaker(450, 72, 'Q1', '52-Q1 AC Breaker', '630A 25kA Icu', q1Closed, handleToggleQ1, '52')}
        </g>

        {/* [3] INPUT ISOLATOR 89-Q1 (y=125) */}
        <g id="sec3-isolator">
          {renderIECDisconnector(450, 125, 'ISOLATOR', '89-Q1 Isolator', q1Closed)}
        </g>

        {/* [4] INPUT FUSES F1-F3 (y=165) */}
        <g id="sec4-fuses" onMouseEnter={() => setHovered('FUSES')} onMouseLeave={() => setHovered(null)}>
          <line x1={450} y1={155} x2={450} y2={170} stroke="#FF0000" strokeWidth={3.5} />

          <rect x={438} y={170} width={24} height={10} fill="none" stroke="#FFFFFF" strokeWidth={2} />
          <line x1={430} y1={175} x2={470} y2={175} stroke="#FF0000" strokeWidth={3.5} />
          <text x={480} y={178} fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">
            F1-F3 Fuses (500A aR)
          </text>

          <line x1={450} y1={180} x2={450} y2={195} stroke="#FF0000" strokeWidth={3.5} />
        </g>

        {/* [5] CURRENT TRANSFORMERS CT1-CT3 (y=200) */}
        <g id="sec5-ct" onMouseEnter={() => setHovered('CT')} onMouseLeave={() => setHovered(null)}>
          <circle cx={450} cy={205} r={7} fill="none" stroke="#FFD700" strokeWidth={2} />
          <line x1={450} y1={195} x2={450} y2={220} stroke="#FF0000" strokeWidth={3.5} />

          <line x1={457} y1={203} x2={590} y2={203} stroke="#FFD700" strokeWidth={1} />
          <line x1={457} y1={207} x2={590} y2={207} stroke="#FFD700" strokeWidth={1} />

          <text x={468} y={208} fill="#FFD700" fontSize={9} fontFamily="monospace">
            CT 500/5A (S1/S2)
          </text>
        </g>

        {/* [6] 6-PULSE SCR BRIDGE (y=225-365) */}
        <g id="sec6-scr-bridge" onMouseEnter={() => setHovered('SCR_BRIDGE')} onMouseLeave={() => setHovered(null)}>
          <rect x={200} y={225} width={500} height={140} fill="#161b22" stroke={isRectifierActive ? '#0066FF' : '#30363d'} strokeWidth={2} rx={6} />

          <text x={450} y={240} textAnchor="middle" fill="#0066FF" fontSize={11} fontWeight="bold" fontFamily="monospace">
            6-PULSE THYRISTOR BRIDGE (IEC 60146-1-1) | α = {firingAngle}°
          </text>

          {/* TOP GROUP */}
          <g id="top-group-scrs">
            <text x={220} y={262} fill="#FF6600" fontSize={9} fontWeight="bold" fontFamily="monospace">POSITIVE GROUP (DC+)</text>
            {renderIECSCR(300, 268, 'T1', 'T1 (Ph A)', isRectifierActive && activeTopSCR === 'T1', false, true)}
            {renderIECSCR(450, 268, 'T3', 'T3 (Ph B)', isRectifierActive && activeTopSCR === 'T3', activeFaults?.scrT3Open, true)}
            {renderIECSCR(600, 268, 'T5', 'T5 (Ph C)', isRectifierActive && activeTopSCR === 'T5', false, true)}
          </g>

          {/* DC+ BUS INSIDE BRIDGE */}
          <line x1={215} y1={298} x2={685} y2={298} stroke="#CC0000" strokeWidth={4} filter={isRectifierActive ? 'url(#glowRed)' : 'none'} />

          {/* BOTTOM GROUP */}
          <g id="bot-group-scrs">
            <text x={220} y={315} fill="#0066FF" fontSize={9} fontWeight="bold" fontFamily="monospace">NEGATIVE GROUP (DC-)</text>
            {renderIECSCR(300, 322, 'T4', 'T4 (Ph A)', isRectifierActive && activeBotSCR === 'T4', false, false)}
            {renderIECSCR(450, 322, 'T6', 'T6 (Ph B)', isRectifierActive && activeBotSCR === 'T6', false, false)}
            {renderIECSCR(600, 322, 'T2', 'T2 (Ph C)', isRectifierActive && activeBotSCR === 'T2', false, false)}
          </g>

          {/* DC- BUS INSIDE BRIDGE */}
          <line x1={215} y1={348} x2={685} y2={348} stroke="#0000CC" strokeWidth={4} />

          {/* CONDUCTION READOUT */}
          <rect x={215} y={352} width={470} height={18} fill="#0d1117" stroke="#30363d" strokeWidth={1} rx={3} />
          <text x={450} y={364} textAnchor="middle" fill="#FFD700" fontSize={9} fontFamily="monospace" fontWeight="bold">
            CONDUCTION: {lineVoltageName} | Top: {activeTopSCR} | Bot: {activeBotSCR} | Seq: T1→T2→T3→T4→T5→T6
          </text>
        </g>

        {/* [7] DC SMOOTHING REACTOR L1 (y=375) */}
        <g id="sec7-reactor" onMouseEnter={() => setHovered('L1')} onMouseLeave={() => setHovered(null)}>
          <line x1={450} y1={348} x2={450} y2={380} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {isRectifierActive && <line x1={450} y1={348} x2={450} y2={380} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-down" />}

          <path
            d="M 450 380 Q 460 386 450 392 Q 460 398 450 404 Q 460 410 450 416 Q 460 422 450 428"
            fill="none"
            stroke={vdc > 50 ? '#CC0000' : '#666666'}
            strokeWidth={3.5}
          />
          <line x1={438} y1={382} x2={438} y2={426} stroke="#888888" strokeWidth={1.5} />
          <line x1={434} y1={382} x2={434} y2={426} stroke="#888888" strokeWidth={1.5} />

          <text x={470} y={400} fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">
            L1 Reactor (2.5mH / 200A)
          </text>

          <line x1={450} y1={428} x2={450} y2={450} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {isRectifierActive && <line x1={450} y1={428} x2={450} y2={450} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-down" />}
        </g>

        {/* [8] DC BUS & CAPACITOR C1 (y=450) */}
        <g id="sec8-dc-bus">
          <line x1={150} y1={450} x2={750} y2={450} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={4.5} filter={vdc > 50 ? 'url(#glowRed)' : 'none'} />
          {vdc > 50 && <line x1={150} y1={450} x2={750} y2={450} stroke="#ff8888" strokeWidth={2.5} className="power-flow-dash-right" />}
          <text x={155} y={442} fill="#CC0000" fontSize={11} fontWeight="bold" fontFamily="monospace">
            DC+ BUS (110VDC)
          </text>

          <line x1={150} y1={515} x2={750} y2={515} stroke="#0000CC" strokeWidth={4.5} />
          {vdc > 50 && <line x1={150} y1={515} x2={750} y2={515} stroke="#70b0ff" strokeWidth={2.5} className="power-flow-dash-left" />}
          <text x={155} y={528} fill="#0000CC" fontSize={11} fontWeight="bold" fontFamily="monospace">
            DC- BUS (0VDC)
          </text>

          {/* Capacitor C1 */}
          <g onMouseEnter={() => setHovered('C1')} onMouseLeave={() => setHovered(null)}>
            <line x1={250} y1={450} x2={250} y2={475} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={2} />
            <line x1={250} y1={490} x2={250} y2={515} stroke="#0000CC" strokeWidth={2} />
            <line x1={235} y1={475} x2={265} y2={475} stroke="#FFFFFF" strokeWidth={2.5} />
            <path d="M 235 490 Q 250 484 265 490" fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
            <text x={240} y={470} fill="#FFD700" fontSize={9} fontWeight="bold">+</text>
            <text x={272} y={486} fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">
              C1: 4700μF
            </text>
          </g>

          {/* DC Bus Quality Readout */}
          {(() => {
            let ripple = 0.2;
            if (q1Closed && vdc > 50) {
              if (!hasLcFilter) ripple = 9.5 + (loadPct / 100) * 1.8;
              else if (activeFaults?.scrT3Open) ripple = 8.2;
              else if (activeFaults?.acPhaseLossL2) ripple = 14.8;
              else ripple = 1.5 + (loadPct / 100) * 1.5;
            }

            let thdi = 0.5;
            if (q1Closed && vdc > 50) {
              const baseTHD = 28.0;
              const alphaPenalty = 0.15 * firingAngle;
              const filterReduction = hasLcFilter ? 18.0 : 0;
              thdi = Math.min(35.0, Math.max(4.0, baseTHD + alphaPenalty - filterReduction));
            }

            return (
              <g transform="translate(490, 458)">
                <rect x={0} y={0} width={240} height={48} fill="#0d1117" stroke="#0066FF" strokeWidth={1.5} rx={5} />
                <text x={10} y={15} fill="#8b949e" fontSize={9} fontWeight="bold" fontFamily="monospace">DC QUALITY MONITOR</text>
                <text x={10} y={35} fill="#00AA00" fontSize={14} fontWeight="bold" fontFamily="monospace">
                  Vdc = {vdc.toFixed(1)}V
                </text>
                <text x={120} y={28} fill="#FFD700" fontSize={9} fontFamily="monospace">
                  Ripple: {ripple.toFixed(1)}%
                </text>
                <text x={120} y={40} fill="#7ee787" fontSize={9} fontFamily="monospace">
                  THDi: {thdi.toFixed(1)}%
                </text>
              </g>
            );
          })()}
        </g>

        {/* [9] BATTERY BREAKER 52-Q2 (y=540) */}
        <g id="sec9-battery-breaker">
          <line x1={320} y1={450} x2={320} y2={540} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {q1Closed && q2Closed && <line x1={320} y1={450} x2={320} y2={540} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-down" />}

          {renderIECBreaker(320, 540, 'Q2', '52-Q2 Battery Switch', '200A DC', q2Closed, handleToggleQ2, '52')}
          
          <line x1={320} y1={580} x2={320} y2={605} stroke={q2Closed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
        </g>

        {/* [10] BATTERY STRING (y=605) */}
        <g id="sec10-battery" onMouseEnter={() => setHovered('BATTERY')} onMouseLeave={() => setHovered(null)}>
          <rect x={140} y={605} width={360} height={85} fill="#161b22" stroke="#30363d" strokeWidth={1.5} rx={5} />
          <text x={152} y={622} fill="#FFFFFF" fontSize={11} fontWeight="bold" fontFamily="monospace">
            BATTERY STRING: 55x2V VRLA [110V Nominal, 200Ah]
          </text>

          {Array.from({ length: 6 }).map((_, idx) => {
            const cx = 168 + idx * 52;
            const cy = 645;
            return (
              <g key={`batt-cell-${idx}`}>
                <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#FF0000" strokeWidth={2} />
                <line x1={cx + 8} y1={cy - 6} x2={cx + 8} y2={cy + 6} stroke="#0000FF" strokeWidth={4} />
                <line x1={cx + 8} y1={cy} x2={cx + 44} y2={cy} stroke="#FFD700" strokeWidth={2} />
              </g>
            );
          })}

          <text x={152} y={678} fill="#0066FF" fontSize={10} fontWeight="bold" fontFamily="monospace">
            SOC: {(isRectifierActive ? computedSoc : soc).toFixed(1)}% | Temp: 25.0°C | Cell V: {vCell.toFixed(2)}V
          </text>

          <line x1={320} y1={690} x2={320} y2={705} stroke="#0000CC" strokeWidth={3.5} />
          <line x1={320} y1={705} x2={150} y2={705} stroke="#0000CC" strokeWidth={3.5} />
          <line x1={150} y1={705} x2={150} y2={515} stroke="#0000CC" strokeWidth={3.5} />
        </g>

        {/* [11] DC FEEDER BREAKER 52-Q3 (y=540) */}
        <g id="sec11-load-breaker">
          <line x1={600} y1={450} x2={600} y2={540} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {q3Closed && vdc > 50 && <line x1={600} y1={450} x2={600} y2={540} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-down" />}
          {renderIECBreaker(600, 540, 'Q3', '52-Q3 DC Feeder', '100A DC', q3Closed, handleToggleQ3, '52')}
          <line x1={600} y1={580} x2={600} y2={605} stroke={q3Closed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
        </g>

        {/* [12] CRITICAL DC LOAD (y=605) */}
        <g id="sec12-load" onMouseEnter={() => setHovered('LOAD')} onMouseLeave={() => setHovered(null)}>
          <rect
            x={530}
            y={605}
            width={140}
            height={48}
            fill={activeFaults?.loadTrip ? '#7f1d1d' : '#161b22'}
            stroke={activeFaults?.loadTrip ? '#ef4444' : '#30363d'}
            strokeWidth={activeFaults?.loadTrip ? 2.5 : 1.5}
            rx={5}
          />
          <text x={600} y={624} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">
            Critical DC Loads
          </text>
          <text x={600} y={640} textAnchor="middle" fill={activeFaults?.loadTrip ? '#f87171' : '#00AA00'} fontSize={9} fontWeight="bold" fontFamily="monospace">
            {activeFaults?.loadTrip ? '🚨 LOAD TRIPPED' : `Idc = ${idc.toFixed(1)} A`}
          </text>

          <line x1={600} y1={653} x2={600} y2={670} stroke="#0000CC" strokeWidth={3.5} />
          <line x1={600} y1={670} x2={750} y2={670} stroke="#0000CC" strokeWidth={3.5} />
          <line x1={750} y1={670} x2={750} y2={515} stroke="#0000CC" strokeWidth={3.5} />
        </g>

        {/* [13] GROUND FAULT DETECTION 64G */}
        <g id="sec13-gfd" onMouseEnter={() => setHovered('GFD')} onMouseLeave={() => setHovered(null)}>
          <rect x={0} y={0} width={320} height={90} fill="#161b22" stroke="#30363d" strokeWidth={2} rx={2} />
          <line x1={0} y1={22} x2={320} y2={22} stroke="#30363d" strokeWidth={1} />
          <line x1={0} y1={44} x2={320} y2={44} stroke="#30363d" strokeWidth={1} />
          <line x1={0} y1={66} x2={320} y2={66} stroke="#30363d" strokeWidth={1} />
          <line x1={160} y1={0} x2={160} y2={90} stroke="#30363d" strokeWidth={1} />

          <text x={8} y={15} fill="#8b949e" fontSize={9} fontFamily="monospace">DWG NO: PE-SIM-BC-001</text>
          <text x={168} y={15} fill="#8b949e" fontSize={9} fontFamily="monospace">REV: A</text>

          <text x={8} y={37} fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">TITLE: Battery Charger SLD</text>

          <text x={8} y={59} fill="#8b949e" fontSize={9} fontFamily="monospace">SCALE: NTS</text>
          <text x={168} y={59} fill="#8b949e" fontSize={9} fontFamily="monospace">DATE: 2026-07-27</text>

          <text x={8} y={81} fill="#8b949e" fontSize={9} fontFamily="monospace">STD: IEC 60617 / IEEE C37.2</text>
          <text x={168} y={81} fill="#0066FF" fontSize={9} fontWeight="bold" fontFamily="monospace">DRAWN BY: PowerSim Pro</text>
        </g>
      </svg>

      {/* GATE PULSE MODAL FOR SCR T1-T6 */}
      {selectedScrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border-2 border-[#58a6ff] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">
                    GATE PULSE WAVEFORM: SCR {selectedScrModal}
                  </h3>
                  <p className="text-[11px] text-[#58a6ff]">
                    Module 4 Continuity — 6-Pulse Phase Controlled Bridge Firing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScrModal(null)}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-lg border border-[#30363d] font-bold transition-all cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* LEARNING CONTINUITY BANNER */}
            <div className="bg-[#0d1117] border border-[#3fb950]/40 p-3.5 rounded-xl text-[#3fb950] text-[11px] leading-relaxed">
              <strong>Module 4 Component Continuity:</strong> This is the exact SCR thyristor firing mechanism you studied in Module 4. In this 6-pulse charger, gate pulses are generated every 60° in sequence T1 → T2 → T3 → T4 → T5 → T6 at firing angle <strong>α = {firingAngle}°</strong>.
            </div>

            {/* WAVEFORM VISUALIZATION FOR SELECTED SCR */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#8b949e]">Firing Angle Delay α: <strong className="text-white">{firingAngle}° ({((firingAngle / 180) * 10).toFixed(2)} ms)</strong></span>
                <span className="text-[#8b949e]">Status: <strong className="text-[#3fb950]">{isRectifierActive ? 'ACTIVE CONDUCTION SEQUENCE' : 'RECTIFIER OFF'}</strong></span>
              </div>

              {/* TIMELINE SVG */}
              <svg viewBox="0 0 500 120" className="w-full h-auto bg-[#161b22] rounded-lg border border-[#30363d]">
                {/* Grid */}
                <line x1="0" y1="60" x2="500" y2="60" stroke="#30363d" strokeWidth="1" />
                <text x="10" y="20" fill="#58a6ff" fontSize="10" fontWeight="bold">Gate Pulse Ig(t) for {selectedScrModal}</text>
                
                {/* Pulse Spike */}
                {(() => {
                  const scrIndexMap: Record<string, number> = { T1: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5 };
                  const idx = scrIndexMap[selectedScrModal] ?? 0;
                  const pulseAngle = (idx * 60 + firingAngle) % 360;
                  const pulseX = 50 + (pulseAngle / 360) * 400;

                  return (
                    <g>
                      {/* Reference 360 deg line */}
                      <line x1="50" y1="90" x2="450" y2="90" stroke="#484f58" strokeWidth="2" />
                      <text x="50" y="108" fill="#8b949e" fontSize="9" textAnchor="middle">0°</text>
                      <text x="250" y="108" fill="#8b949e" fontSize="9" textAnchor="middle">180°</text>
                      <text x="450" y="108" fill="#8b949e" fontSize="9" textAnchor="middle">360°</text>

                      {/* Gate Pulse Spike */}
                      <path
                        d={`M ${pulseX - 15} 90 L ${pulseX - 5} 90 L ${pulseX} 30 L ${pulseX + 5} 90 L ${pulseX + 15} 90`}
                        fill="none"
                        stroke="#f85149"
                        strokeWidth="3"
                      />
                      <circle cx={pulseX} cy="30" r="4" fill="#f85149" />
                      
                      {/* Pulse Label */}
                      <text x={pulseX} y="20" fill="#f85149" fontSize="10" fontWeight="bold" textAnchor="middle">
                        Ig Pulse ({pulseAngle.toFixed(0)}°)
                      </text>

                      {/* Conduction Latch Shading */}
                      <rect x={pulseX} y="40" width={120} height="40" fill="#238636" opacity="0.3" rx="2" />
                      <text x={pulseX + 60} y={64} fill="#3fb950" fontSize="9" fontWeight="bold" textAnchor="middle">
                        SCR LATCHED ON (I &gt; Ih)
                      </text>
                    </g>
                  );
                })()}
              </svg>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
                  <span className="text-[#8b949e]">Latching Current (Il):</span>
                  <span className="text-[#e3b341] font-bold ml-1">80 mA</span>
                </div>
                <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
                  <span className="text-[#8b949e]">Holding Current (Ih):</span>
                  <span className="text-[#3fb950] font-bold ml-1">50 mA</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedScrModal(null)}
                className="px-5 py-2 bg-[#238636] hover:bg-[#2ea043] text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg"
              >
                Return to Main Charger SLD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
