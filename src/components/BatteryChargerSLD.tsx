import React, { useState, useEffect } from 'react';
import { ActiveFaults, SCRDeviceState, SCRId } from '../types/batteryCharger';
import { calculateSCRConductionState } from '../utils/scrConductionEngine';

interface BatteryChargerSLDProps {
  voltageIn?: number;
  loadPct?: number;
  firingAngle?: number;
  sourceInductanceMh?: number;
  isRunning?: boolean;
  q1Closed?: boolean;
  q2Closed?: boolean;
  q3Closed?: boolean;
  onToggleQ1?: () => void;
  onToggleQ2?: () => void;
  onToggleQ3?: () => void;
  onToggleFault?: (faultKey: keyof ActiveFaults) => void;
  soc?: number;
  activeFaults?: ActiveFaults;
  hasLcFilter?: boolean;
  tutorialStep?: number | null;
  onSetTutorialStep?: (step: number | null) => void;
}

interface ComponentInfo {
  name: string;
  rating: string;
  standard: string;
}

interface TutorialStepInfo {
  step: number;
  title: string;
  tag: string;
  desc: string;
  box: { x: number; y: number; width: number; height: number };
}

const TUTORIAL_STEPS: TutorialStepInfo[] = [
  {
    step: 1,
    title: '1. 3-Phase AC Utility Infeed',
    tag: 'Phase L1, L2, L3 (415V 50Hz)',
    desc: 'Supplies 3 separate AC utility phases (Phase A/L1, Phase B/L2, Phase C/L3). Click any phase button to test phase loss.',
    box: { x: 170, y: 4, width: 580, height: 50 },
  },
  {
    step: 2,
    title: '2. Main AC Breaker & Disconnector',
    tag: '52-Q1 & 89-Q1 Isolator',
    desc: 'Provides main 3-phase isolation and automatic fault protection for incoming AC power.',
    box: { x: 310, y: 52, width: 280, height: 45 },
  },
  {
    step: 3,
    title: '3. Semiconductor Fuses & CTs',
    tag: 'F1-F3 (500A aR) & CT1-CT3',
    desc: 'Ultra-fast semiconductor protection fuses and current transformers for precision control feedback.',
    box: { x: 200, y: 95, width: 520, height: 40 },
  },
  {
    step: 4,
    title: '4. 6-Pulse Thyristor Bridge Converter',
    tag: 'T1-T6 (IEC 60146-1-1)',
    desc: 'The main converter stage. Uses phase-controlled gate firing (α) to convert 3-phase AC into regulated DC voltage.',
    box: { x: 110, y: 140, width: 700, height: 180 },
  },
  {
    step: 5,
    title: '5. DC Reactor & Bus Capacitor',
    tag: 'L1 Reactor & C1 Capacitor',
    desc: 'Smooths out AC voltage ripple to deliver steady DC power to the positive and negative busbars.',
    box: { x: 420, y: 330, width: 170, height: 75 },
  },
  {
    step: 6,
    title: '6. Substation Battery Bank',
    tag: '52-Q2 & 55-Cell VRLA',
    desc: 'Provides instant emergency backup power to substation DC buses if incoming AC grid fails.',
    box: { x: 140, y: 410, width: 220, height: 145 },
  },
  {
    step: 7,
    title: '7. Critical DC Loads & Isolator',
    tag: '52-Q3, 89-Q3 & Dual Loads',
    desc: 'Delivers uninterruptible 110VDC power to protection trip coils, SCADA, and emergency substation automation.',
    box: { x: 590, y: 410, width: 270, height: 155 },
  },
];

const TOOLTIPS: Record<string, ComponentInfo> = {
  Q1: { name: 'Main AC Incoming Breaker (52-Q1)', rating: '630A 25kA Icu, 3P', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  ISOLATOR: { name: 'Input Disconnector (89-Q1)', rating: '630A 3P Mechanical Interlocked', standard: 'IEC 60947-3 / IEEE C37.2-89' },
  FUSES: { name: 'Semiconductor Protection Fuses (F1-F3)', rating: '500A aR High-Speed', standard: 'IEC 60269-4' },
  CT: { name: 'Current Transformers (CT1-CT3)', rating: '500/5A Class 5P20 15VA', standard: 'IEC 61869-2' },
  SCR_BRIDGE: { name: '6-Pulse Thyristor Bridge (T1-T6)', rating: '1200V / 300A Phase Controlled', standard: 'IEC 60146-1-1' },
  L1: { name: 'DC Smoothing Reactor', rating: '2.5 mH, 200A DC, Class H', standard: 'IEC 60076-6' },
  VDRD: { name: 'Reverse-Feed Blocking Diode (VDRD / D_BLOCK)', rating: '300A 1200V High-Power Stud Diode [Anode (A) → Cathode (K)]', standard: 'IEC 60146-1-1 / IEEE 946' },
  C1: { name: 'DC Bus Capacitor Bank', rating: '4700 μF, 450VDC Electrolytic', standard: 'IEC 61071' },
  Q2: { name: 'Battery String Breaker (52-Q2)', rating: '200A 250VDC 2P', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  BATTERY: { name: 'VRLA Battery Bank', rating: '55 Cells [110V Nominal, 200Ah]', standard: 'IEEE 1188 / IEC 62485-2 / IEC 60896-21/22 VRLA' },
  Q3: { name: 'DC Load Feeder Breaker (52-Q3)', rating: '100A 250VDC 2P', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  ISOLATOR_Q3: { name: 'DC Load Disconnector Isolator (89-Q3)', rating: '200A 250VDC 2P Manual Switch', standard: 'IEC 60947-3 / IEEE C37.2-89' },
  LOAD1: { name: 'Critical DC Load 1 (Protection Relays)', rating: '110VDC / 50A Substation Trip Circuits', standard: 'IEC 60146-1-1 / IEEE 946' },
  LOAD2: { name: 'Critical DC Load 2 (SCADA & Automation)', rating: '110VDC / 50A Substation Automation', standard: 'IEC 60146-1-1 / IEEE 946' },
  LOAD: { name: 'Critical DC Distribution Loads', rating: '110VDC / 100A Dual Load Feeders', standard: 'IEC 60146-1-1 / IEC 61511' },
  GFD: { name: 'Ground Fault Detector Relay (64G)', rating: '< 100mA Sensitivity Insulation Monitor', standard: 'IEC 61557-8 / IEEE C37.2-64G' },
};

export const BatteryChargerSLD: React.FC<BatteryChargerSLDProps> = ({
  voltageIn = 415,
  loadPct = 85,
  firingAngle = 30,
  sourceInductanceMh = 0.8,
  isRunning = true,
  q1Closed: propQ1,
  q2Closed: propQ2,
  q3Closed: propQ3,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
  onToggleFault,
  soc: propSoc,
  activeFaults,
  hasLcFilter = true,
  tutorialStep: propTutorialStep,
  onSetTutorialStep,
}) => {
  const [internalQ1, setInternalQ1] = useState<boolean>(true);
  const [internalQ2, setInternalQ2] = useState<boolean>(true);
  const [internalQ3, setInternalQ3] = useState<boolean>(true);
  const [q3IsolatorClosed, setQ3IsolatorClosed] = useState<boolean>(true);
  const [internalSoc, setInternalSoc] = useState<number>(92);
  const [internalTutorialStep, setInternalTutorialStep] = useState<number | null>(null);

  const currentStepNum = propTutorialStep !== undefined ? propTutorialStep : internalTutorialStep;

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
          } else if (!q1Closed && q2Closed && q3Closed && q3IsolatorClosed) {
            return Math.max(20, prev - 0.04);
          }
          return prev;
        });
      }
      timer = requestAnimationFrame(update);
    };
    timer = requestAnimationFrame(update);
    return () => cancelAnimationFrame(timer);
  }, [isRunning, propSoc, q1Closed, q2Closed, q3Closed, q3IsolatorClosed]);

  const isRectifierActive = q1Closed && isRunning;

  // 1. Total Load Current (idcLoad) by Ohm's Law
  let idcLoad = 0;
  if (q3Closed && q3IsolatorClosed && !activeFaults?.loadTrip) {
    idcLoad = (loadPct / 100) * 85.0;
    if (activeFaults?.controlFuseBlown) idcLoad = 0;
  }

  // Calculate Authoritative SCR Conduction State
  const conductionState = calculateSCRConductionState({
    electricalAngleDeg: animFrame,
    firingAngleDeg: firingAngle,
    sourceInductanceMh,
    voltageIn,
    loadCurrentA: idcLoad,
    q1Closed,
    isRunning,
    activeFaults,
  });

  const lostPhasesCount =
    (activeFaults?.acPhaseLossL1 ? 1 : 0) +
    (activeFaults?.acPhaseLossL2 ? 1 : 0) +
    (activeFaults?.acPhaseLossL3 ? 1 : 0);

  // 2. Reverse-Feed Blocking Diode (VDRD / D_BLOCK) Conduction State & Current (iDiode / iRectifier)
  const isBlockingDiodeForwardBiased = isRectifierActive && lostPhasesCount < 2 && !activeFaults?.scrT3Open && !activeFaults?.controlFuseBlown && q1Closed;

  let iDiode = 0; // Diode Current (Amperes)
  if (isBlockingDiodeForwardBiased) {
    // Rectifier is active and forward-biasing the diode!
    const iBatCharge = q2Closed ? 25.0 : 0.0;
    iDiode = idcLoad + iBatCharge;
  } else {
    // Reverse-feed condition (AC grid failure, breaker 52-Q1 open, or 2-phase loss)
    // Battery +110V attempts to backfeed into the SCR bridge.
    // Reverse-Feed Blocking Diode VDRD is REVERSE BIASED -> iDiode = 0.00A EXACTLY!
    iDiode = 0.0;
  }

  // 3. Battery Branch Current (iBattery) via 52-Q2 by KCL
  let iBattery = 0;
  if (q2Closed) {
    if (isBlockingDiodeForwardBiased) {
      iBattery = +25.0; // Charging Mode (+25A into battery)
    } else if (idcLoad > 0) {
      iBattery = -idcLoad; // Discharging Mode (-idcLoad from battery to supply loads)
    }
  }

  // 4. Return Bus Current (iReturnSCRBridge) along DC- Return Bus back to SCR Bridge
  const iReturnSCRBridge = isBlockingDiodeForwardBiased ? iDiode : 0.0;

  let vdc = 0;
  if (activeFaults?.dcOvervoltage) {
    vdc = 145.0;
  } else if (activeFaults?.controlFuseBlown) {
    vdc = q2Closed ? (1.85 + (soc / 100) * 0.38) * 55 : 0;
  } else if (activeFaults?.equalizeForgotten) {
    vdc = 137.5;
  } else if (isRectifierActive) {
    const rad = (firingAngle * Math.PI) / 180;
    vdc = 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((30 * Math.PI) / 180));
    if (activeFaults?.scrT3Open) vdc *= 0.75;
    if (lostPhasesCount >= 2) {
      vdc = q2Closed ? (1.85 + (soc / 100) * 0.38) * 55 : 0;
    } else if (lostPhasesCount === 1) {
      vdc *= 0.80;
    }
  } else if (q2Closed) {
    let vCellFromSoc = 2.10;
    if (soc <= 0) vCellFromSoc = 1.85;
    else if (soc <= 25) vCellFromSoc = 1.85 + (soc / 250);
    else if (soc <= 50) vCellFromSoc = 1.95 + ((soc - 25) / 500);
    else if (soc <= 75) vCellFromSoc = 2.00 + ((soc - 50) / 250);
    else vCellFromSoc = 2.10 + ((soc - 75) / 192.3);
    vdc = vCellFromSoc * 55;
  }

  if (activeFaults?.looseTerminal && q3Closed && q3IsolatorClosed && loadPct > 0) {
    vdc = Math.max(85, vdc - 26.5);
  }

  let vCell = vdc > 0 ? vdc / 55 : 2.10;
  if (!isRectifierActive && q2Closed) {
    vCell = vdc / 55;
  }
  const computedSoc = Math.min(100, Math.max(0, ((vCell - 1.85) / 0.38) * 100));

  // Helper for IEC 60617 Circuit Breaker (Device 52)
  const renderIECBreaker = (
    x: number,
    y: number,
    id: string,
    label: string,
    rating: string,
    isClosed: boolean,
    onToggle: () => void,
    deviceTag: string = '52'
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
        {/* Background Hitbox */}
        <rect
          x={x - 105}
          y={y - 6}
          width={210}
          height={38}
          fill={isHovered ? '#1e293b' : '#161b22'}
          rx={6}
          stroke={isHovered ? '#0066FF' : isClosed ? '#10b981' : '#ef4444'}
          strokeWidth={isHovered ? 2 : 1}
        />

        {/* Breaker Square Frame */}
        <rect
          x={x - 13}
          y={y + 4}
          width={26}
          height={26}
          fill="#0f172a"
          stroke={stateColor}
          strokeWidth={2}
          rx={3}
        />

        {/* Contact Cross X when CLOSED / Slash when OPEN */}
        {isClosed ? (
          <path d={`M ${x - 8} ${y + 9} L ${x + 8} ${y + 25} M ${x + 8} ${y + 9} L ${x - 8} ${y + 25}`} stroke={stateColor} strokeWidth={2.5} strokeLinecap="round" />
        ) : (
          <path d={`M ${x - 8} ${y + 25} L ${x + 8} ${y + 9}`} stroke={stateColor} strokeWidth={2.5} strokeLinecap="round" />
        )}

        {/* IEEE Device Tag Circle */}
        <circle cx={x - 34} cy={y + 17} r={9} fill="#0f172a" stroke="#0066FF" strokeWidth={1.5} />
        <text x={x - 34} y={y + 20} textAnchor="middle" fill="#0066FF" fontSize="8" fontWeight="black" fontFamily="monospace">
          {deviceTag}
        </text>

        {/* Label & Rating */}
        <text x={x + 18} y={y + 15} fill="#ffffff" fontSize={10} fontWeight="bold" fontFamily="sans-serif">
          {label}
        </text>
        <text x={x + 18} y={y + 27} fill="#94a3b8" fontSize={8} fontWeight="bold" fontFamily="monospace">
          {rating}
        </text>

        {/* Status Badge */}
        <rect
          x={x - 95}
          y={y + 8}
          width={48}
          height={16}
          rx={3}
          fill={isClosed ? '#065f46' : '#991b1b'}
          stroke={isClosed ? '#34d399' : '#f87171'}
          strokeWidth={1}
        />
        <text x={x - 71} y={y + 19} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="black">
          {isClosed ? 'CLOSED' : 'TRIPPED'}
        </text>
      </g>
    );
  };

  // Helper for IEC 60617 Disconnector / Isolator (Device 89)
  const renderIECDisconnector = (
    x: number,
    y: number,
    id: string,
    label: string,
    isClosed: boolean,
    onToggle?: () => void,
    subLabel: string = '200A ISOLATOR'
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
        {/* Background Hitbox */}
        <rect
          x={x - 105}
          y={y - 6}
          width={210}
          height={38}
          fill={isHovered ? '#1e293b' : '#161b22'}
          rx={6}
          stroke={isHovered ? '#38bdf8' : isClosed ? '#10b981' : '#f59e0b'}
          strokeWidth={isHovered ? 2 : 1}
        />

        {/* Main Conductor Line */}
        <line x1={x - 55} y1={y - 6} x2={x - 55} y2={y + 6} stroke="#38bdf8" strokeWidth={2.5} />
        <line x1={x - 55} y1={y + 28} x2={x - 55} y2={y + 32} stroke="#38bdf8" strokeWidth={2.5} />

        {/* IEC 60617 Disconnector Symbol (Top Fixed Bar) */}
        <line x1={x - 61} y1={y + 6} x2={x - 49} y2={y + 6} stroke="#f8fafc" strokeWidth={2} />

        {/* Pivot */}
        <circle cx={x - 55} cy={y + 28} r={2.5} fill="#f8fafc" stroke="#000000" strokeWidth={1} />

        {/* Blade */}
        {isClosed ? (
          <line x1={x - 55} y1={y + 28} x2={x - 55} y2={y + 6} stroke={stateColor} strokeWidth={2.5} />
        ) : (
          <line x1={x - 55} y1={y + 28} x2={x - 42} y2={y + 8} stroke={stateColor} strokeWidth={2.5} />
        )}

        {/* IEEE Device Tag Circle */}
        <circle cx={x - 82} cy={y + 17} r={8.5} fill="#0f172a" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={x - 82} y={y + 20} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="black" fontFamily="monospace">
          89
        </text>

        {/* Label */}
        <text x={x - 34} y={y + 15} fill="#ffffff" fontSize={10} fontWeight="bold" fontFamily="sans-serif">
          {label}
        </text>
        <text x={x - 34} y={y + 27} fill="#94a3b8" fontSize={8} fontWeight="bold" fontFamily="monospace">
          {subLabel}
        </text>

        {/* Status Badge */}
        <rect
          x={x + 45}
          y={y + 7}
          width={48}
          height={16}
          rx={3}
          fill={isClosed ? '#065f46' : '#991b1b'}
          stroke={isClosed ? '#34d399' : '#f87171'}
          strokeWidth={1}
        />
        <text x={x + 69} y={y + 18} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="black">
          {isClosed ? 'CLOSED' : 'OPEN'}
        </text>
      </g>
    );
  };

  // PROMINENT ENLARGED IEC THYRISTOR (Device T1-T6)
  const renderIECSCR = (
    x: number,
    y: number,
    id: SCRId,
    label: string,
    scrState: SCRDeviceState,
    isFaulted: boolean = false
  ) => {
    let fillColor = '#0f172a';
    let strokeColor = '#475569';
    let glowFilter = 'none';
    let gateColor = '#94a3b8';
    let stateBadgeText = 'OFF';

    if (isFaulted) {
      fillColor = '#450a0a';
      strokeColor = '#ef4444';
      stateBadgeText = 'OPEN FAULT';
    } else if (scrState === 'CONDUCTING') {
      fillColor = '#064e3b';
      strokeColor = '#10b981';
      glowFilter = 'url(#glowEmerald)';
      gateColor = '#f59e0b';
      stateBadgeText = 'ON (CONDUCTING)';
    } else if (scrState === 'COMMUTATING') {
      fillColor = '#78350f';
      strokeColor = '#f59e0b';
      glowFilter = 'url(#glowOrange)';
      gateColor = '#fbbf24';
      stateBadgeText = 'OVERLAP (μ)';
    } else if (scrState === 'GATE_PULSE') {
      fillColor = '#854d0e';
      strokeColor = '#eab308';
      glowFilter = 'url(#glowYellow)';
      gateColor = '#facc15';
      stateBadgeText = 'GATE PULSE';
    } else if (scrState === 'REVERSE_BIASED') {
      fillColor = '#0f172a';
      strokeColor = '#334155';
      stateBadgeText = 'REV BLOCKED';
    }

    const isHovered = hovered === id;

    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer transition-all duration-150"
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => {
          if (id === 'T3' && onToggleFault) {
            onToggleFault('scrT3Open');
          } else {
            setSelectedScrModal(id);
          }
        }}
      >
        {/* Prominent Card Frame */}
        <rect
          x={-58}
          y={-22}
          width={116}
          height={44}
          fill={isHovered ? '#1e293b' : '#0d1117'}
          rx={6}
          stroke={isHovered ? '#38bdf8' : isFaulted ? '#ef4444' : strokeColor}
          strokeWidth={isHovered || isFaulted ? 2 : 1}
        />

        {/* Large Thyristor Triangle Symbol */}
        <polygon points="-14,-10 14,-10 0,8" fill={fillColor} stroke={strokeColor} strokeWidth={2.5} filter={glowFilter} />
        <line x1="-16" y1="8" x2="16" y2="8" stroke={strokeColor} strokeWidth={3} />

        {/* Gate Lead */}
        <path d="M 0,0 L -20,-9 L -30,-9" fill="none" stroke={gateColor} strokeWidth={2} />
        <circle cx="-30" cy="-9" r="2.5" fill={gateColor} />

        {/* Device Name Label */}
        <text x={22} y={-3} fill={isFaulted ? '#f87171' : '#ffffff'} fontSize={10} fontWeight="black" fontFamily="monospace">
          {label}
        </text>
        {/* State Badge Text */}
        <text x={22} y={11} fill={isFaulted ? '#ef4444' : scrState === 'CONDUCTING' ? '#34d399' : scrState === 'COMMUTATING' ? '#fbbf24' : '#94a3b8'} fontSize={8} fontWeight="black" fontFamily="monospace">
          {stateBadgeText}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full max-w-[950px] mx-auto bg-[#0d1117] border border-[#30363d] rounded-lg p-2 select-none shadow-2xl">
      {/* TOP COMPACT STATUS BAR & TELEMETRY */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#30363d] pb-1 mb-1 text-xs font-mono gap-1 bg-[#161b22] px-2 py-1 rounded border">
        <div className="flex items-center gap-1.5">
          <span className="text-[#8b949e] font-bold text-[10px]">IEC 60146 6-PULSE BRIDGE:</span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
              isRectifierActive && isBlockingDiodeForwardBiased
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-red-950/60 text-red-400 border border-red-800/60'
            }`}
          >
            {isRectifierActive && isBlockingDiodeForwardBiased ? 'SYNCHRONIZED REAL-TIME SIMULATION' : 'RECTIFIER OFF (BATTERY BACKUP)'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d] text-amber-300 font-bold text-[9px]">
            ⚡ {conductionState.statusText}
          </span>
          <span className="text-slate-300">α = <strong className="text-sky-400">{firingAngle}°</strong></span>
          <span className="text-slate-300">μ = <strong className="text-amber-300">{conductionState.overlapAngleDeg.toFixed(1)}°</strong></span>
          <span className="text-slate-300">Vdc = <strong className="text-emerald-400">{vdc.toFixed(1)} V</strong></span>
          <span className="text-slate-300">Idc = <strong className="text-emerald-400">{iDiode.toFixed(1)} A</strong></span>
          <span className="text-slate-300">SOC = <strong className="text-sky-400">{(isRectifierActive ? computedSoc : soc).toFixed(1)} %</strong></span>
        </div>
      </div>

      {/* HOVER TOOLTIP */}
      {hovered && (TOOLTIPS[hovered] || (hovered.startsWith('T') && hovered.length <= 2)) && (
        <div className="absolute top-10 right-4 bg-[#161b22] border border-[#0066FF] rounded-md p-2 shadow-xl z-20 pointer-events-none text-xs max-w-sm font-mono">
          <div className="font-bold text-[#0066FF] mb-0.5">
            {hovered.startsWith('T') && hovered.length <= 2
              ? `SCR Thyristor ${hovered} (Phase ${hovered === 'T1' || hovered === 'T4' ? 'A' : hovered === 'T3' || hovered === 'T6' ? 'B' : 'C'})`
              : TOOLTIPS[hovered]?.name}
          </div>
          <div className="text-[#c9d1d9] mb-0.5 text-[10px]">
            Rating: <span className="text-[#FFD700]">
              {hovered.startsWith('T') && hovered.length <= 2
                ? `Current State: ${conductionState.scrStates[hovered as SCRId] || 'OFF'}. Firing angle α = ${firingAngle}°.`
                : TOOLTIPS[hovered]?.rating}
            </span>
          </div>
          <div className="text-[#8b949e] text-[9px]">
            Standard: <span>{TOOLTIPS[hovered]?.standard || 'IEC 60146-1-1'}</span>
          </div>
        </div>
      )}

      {/* MAIN IEC SINGLE LINE DIAGRAM SVG (5 HIGH-CONTRAST SECTION BORDERS, VIEWBOX 0 0 920 570) */}
      <svg viewBox="0 0 920 570" className="w-full h-auto max-h-[550px] object-contain block mx-auto">
        <defs>
          <filter id="glowEmerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowOrange" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowYellow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* TUTORIAL HIGHLIGHT BOX */}
        {currentStepNum !== null && (
          <rect
            x={TUTORIAL_STEPS[currentStepNum - 1].box.x}
            y={TUTORIAL_STEPS[currentStepNum - 1].box.y}
            width={TUTORIAL_STEPS[currentStepNum - 1].box.width}
            height={TUTORIAL_STEPS[currentStepNum - 1].box.height}
            fill="none"
            stroke="#eab308"
            strokeWidth="3"
            strokeDasharray="6,6"
            rx="6"
            className="animate-pulse"
          />
        )}

        {/* =========================================================
            SECTION 1: 3-PHASE AC INFEED & SWITCHGEAR CUBICLE (y=2..138)
            ========================================================= */}
        <g id="cubicle-section-1">
          <rect x={160} y={2} width={600} height={136} fill="#090e1a" stroke="#0066FF" strokeWidth={1.5} strokeDasharray="4,4" rx={6} />
          <text x={170} y={15} fill="#0066FF" fontSize={9} fontWeight="black" fontFamily="monospace">
            SECTION 1: 3-PHASE AC INFEED &amp; PROTECTION SWITCHGEAR CUBICLE
          </text>

          {/* PHASE L1 (PHASE A - RED) at x=240 */}
          <g
            className="cursor-pointer"
            onClick={() => onToggleFault && onToggleFault('acPhaseLossL1')}
            title="Click to Inject / Clear Phase L1 Loss Fault!"
          >
            <rect
              x={180}
              y={20}
              width={120}
              height={20}
              rx={4}
              fill={activeFaults?.acPhaseLossL1 ? '#450a0a' : '#161b22'}
              stroke={activeFaults?.acPhaseLossL1 ? '#ef4444' : '#ef4444'}
              strokeWidth={activeFaults?.acPhaseLossL1 ? 2.5 : 1.5}
            />
            <circle cx={192} cy={30} r={3.5} fill={activeFaults?.acPhaseLossL1 ? '#ef4444' : '#ef4444'} />
            <text x={202} y={34} fill={activeFaults?.acPhaseLossL1 ? '#f87171' : '#ffffff'} fontSize={10} fontWeight="black" fontFamily="monospace">
              {activeFaults?.acPhaseLossL1 ? '🚨 L1 LOST (FAIL)' : 'PHASE L1 (240V)'}
            </text>
          </g>
          <line x1={240} y1={40} x2={240} y2={55} stroke={activeFaults?.acPhaseLossL1 ? '#475569' : '#ef4444'} strokeWidth={3.5} />

          {/* PHASE L2 (PHASE B - YELLOW) at x=460 (INTERACTIVE PHASE LOSS TOGGLE) */}
          <g
            className="cursor-pointer"
            onClick={() => onToggleFault && onToggleFault('acPhaseLossL2')}
            title="Click to Inject / Clear Phase L2 Loss Fault!"
          >
            <rect
              x={400}
              y={20}
              width={120}
              height={20}
              rx={4}
              fill={activeFaults?.acPhaseLossL2 ? '#450a0a' : '#161b22'}
              stroke={activeFaults?.acPhaseLossL2 ? '#ef4444' : '#eab308'}
              strokeWidth={activeFaults?.acPhaseLossL2 ? 2.5 : 1.5}
            />
            <circle cx={412} cy={30} r={3.5} fill={activeFaults?.acPhaseLossL2 ? '#ef4444' : '#eab308'} />
            <text x={422} y={34} fill={activeFaults?.acPhaseLossL2 ? '#f87171' : '#ffffff'} fontSize={10} fontWeight="black" fontFamily="monospace">
              {activeFaults?.acPhaseLossL2 ? '🚨 L2 LOST (FAIL)' : 'PHASE L2 (240V)'}
            </text>
          </g>
          <line x1={460} y1={40} x2={460} y2={55} stroke={activeFaults?.acPhaseLossL2 ? '#475569' : '#eab308'} strokeWidth={3.5} />

          {/* PHASE L3 (PHASE C - BLUE) at x=680 */}
          <g
            className="cursor-pointer"
            onClick={() => onToggleFault && onToggleFault('acPhaseLossL3')}
            title="Click to Inject / Clear Phase L3 Loss Fault!"
          >
            <rect
              x={620}
              y={20}
              width={120}
              height={20}
              rx={4}
              fill={activeFaults?.acPhaseLossL3 ? '#450a0a' : '#161b22'}
              stroke={activeFaults?.acPhaseLossL3 ? '#ef4444' : '#3b82f6'}
              strokeWidth={activeFaults?.acPhaseLossL3 ? 2.5 : 1.5}
            />
            <circle cx={632} cy={30} r={3.5} fill={activeFaults?.acPhaseLossL3 ? '#ef4444' : '#3b82f6'} />
            <text x={642} y={34} fill={activeFaults?.acPhaseLossL3 ? '#f87171' : '#ffffff'} fontSize={10} fontWeight="black" fontFamily="monospace">
              {activeFaults?.acPhaseLossL3 ? '🚨 L3 LOST (FAIL)' : 'PHASE L3 (240V)'}
            </text>
          </g>
          <line x1={680} y1={40} x2={680} y2={55} stroke={activeFaults?.acPhaseLossL3 ? '#475569' : '#3b82f6'} strokeWidth={3.5} />

          {/* MAIN AC BREAKER 52-Q1 & ISOLATOR 89-Q1 (y=55..95) */}
          {renderIECBreaker(460, 55, 'Q1', '52-Q1 Main AC Breaker', '630A 3P 415V', q1Closed, handleToggleQ1, '52')}
          <line x1={460} y1={93} x2={460} y2={105} stroke={q1Closed ? '#eab308' : '#64748b'} strokeWidth={3} />

          {/* SEMICONDUCTOR PROTECTION FUSES F1-F3 (y=105..125) & CTs */}
          <g id="sec3-fuses" onMouseEnter={() => setHovered('FUSES')} onMouseLeave={() => setHovered(null)}>
            {/* Fuse L1 */}
            <rect x={228} y={105} width={24} height={16} fill="#161b22" stroke={activeFaults?.acPhaseLossL1 ? '#ef4444' : '#FFD700'} strokeWidth={1.5} rx={2} />
            <line x1={240} y1={105} x2={240} y2={121} stroke={activeFaults?.acPhaseLossL1 ? '#ef4444' : '#FFD700'} strokeWidth={1.5} />
            <text x={190} y={117} fill="#8b949e" fontSize={8} fontWeight="bold" fontFamily="monospace">F1 (aR)</text>

            {/* Fuse L2 */}
            <rect x={448} y={105} width={24} height={16} fill="#161b22" stroke={activeFaults?.acPhaseLossL2 ? '#ef4444' : '#FFD700'} strokeWidth={1.5} rx={2} />
            <line x1={460} y1={105} x2={460} y2={121} stroke={activeFaults?.acPhaseLossL2 ? '#ef4444' : '#FFD700'} strokeWidth={1.5} />
            <text x={410} y={117} fill="#8b949e" fontSize={8} fontWeight="bold" fontFamily="monospace">F2 (aR)</text>

            {/* Fuse L3 */}
            <rect x={668} y={105} width={24} height={16} fill="#161b22" stroke={activeFaults?.acPhaseLossL3 ? '#ef4444' : '#FFD700'} strokeWidth={1.5} rx={2} />
            <line x1={680} y1={105} x2={680} y2={121} stroke={activeFaults?.acPhaseLossL3 ? '#ef4444' : '#FFD700'} strokeWidth={1.5} />
            <text x={630} y={117} fill="#8b949e" fontSize={8} fontWeight="bold" fontFamily="monospace">F3 (aR)</text>

            {/* CT Symbols CT1, CT2, CT3 */}
            <circle cx={240} cy={130} r={5} fill="none" stroke="#0066FF" strokeWidth={1.5} />
            <circle cx={460} cy={130} r={5} fill="none" stroke="#0066FF" strokeWidth={1.5} />
            <circle cx={680} cy={130} r={5} fill="none" stroke="#0066FF" strokeWidth={1.5} />

            {/* Phase Lines down to SCR Bridge */}
            <line x1={240} y1={121} x2={240} y2={140} stroke={q1Closed && !activeFaults?.acPhaseLossL1 ? '#ef4444' : '#64748b'} strokeWidth={3.5} />
            <line x1={460} y1={121} x2={460} y2={140} stroke={q1Closed && !activeFaults?.acPhaseLossL2 ? '#eab308' : '#64748b'} strokeWidth={3.5} />
            <line x1={680} y1={121} x2={680} y2={140} stroke={q1Closed && !activeFaults?.acPhaseLossL3 ? '#3b82f6' : '#64748b'} strokeWidth={3.5} />
          </g>
        </g>

        {/* =========================================================
            SECTION 2: 6-PULSE THYRISTOR RECTIFIER CUBICLE (y=142..322)
            ========================================================= */}
        <g id="cubicle-section-2" onMouseEnter={() => setHovered('SCR_BRIDGE')} onMouseLeave={() => setHovered(null)}>
          {/* Prominent Converter Bounding Box */}
          <rect x={110} y={142} width={700} height={180} fill="#0b101d" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="5,5" rx={8} />
          <text x={125} y={157} fill="#38bdf8" fontSize={10} fontWeight="black" fontFamily="monospace">
            SECTION 2: 6-PULSE GRAETZ SCR THYRISTOR CONVERTER CUBICLE (IEC 60146-1-1)
          </text>

          {/* TOP ROW SCRs: T1 (Phase A+), T3 (Phase B+), T5 (Phase C+) */}
          {renderIECSCR(240, 190, 'T1', 'T1 (Ph A+)', conductionState.scrStates['T1'], activeFaults?.acPhaseLossL1)}
          {renderIECSCR(460, 190, 'T3', 'T3 (Ph B+)', conductionState.scrStates['T3'], activeFaults?.scrT3Open || activeFaults?.acPhaseLossL2)}
          {renderIECSCR(680, 190, 'T5', 'T5 (Ph C+)', conductionState.scrStates['T5'], activeFaults?.acPhaseLossL3)}

          {/* BOTTOM ROW SCRs: T4 (Phase A-), T6 (Phase B-), T2 (Phase C-) */}
          {renderIECSCR(240, 270, 'T4', 'T4 (Ph A-)', conductionState.scrStates['T4'], activeFaults?.acPhaseLossL1)}
          {renderIECSCR(460, 270, 'T6', 'T6 (Ph B-)', conductionState.scrStates['T6'], activeFaults?.acPhaseLossL2)}
          {renderIECSCR(680, 270, 'T2', 'T2 (Ph C-)', conductionState.scrStates['T2'], activeFaults?.acPhaseLossL3)}

          {/* Mid-Leg Phase Connections */}
          <line x1={240} y1={212} x2={240} y2={248} stroke={q1Closed && !activeFaults?.acPhaseLossL1 ? '#ef4444' : '#64748b'} strokeWidth={3} />
          <line x1={460} y1={212} x2={460} y2={248} stroke={q1Closed && !activeFaults?.acPhaseLossL2 ? '#eab308' : '#64748b'} strokeWidth={3} />
          <line x1={680} y1={212} x2={680} y2={248} stroke={q1Closed && !activeFaults?.acPhaseLossL3 ? '#3b82f6' : '#64748b'} strokeWidth={3} />

          {/* Junction Dots for AC Inputs */}
          <circle cx={240} cy={165} r={4} fill={activeFaults?.acPhaseLossL1 ? '#64748b' : '#ef4444'} />
          <circle cx={460} cy={165} r={4} fill={activeFaults?.acPhaseLossL2 ? '#64748b' : '#eab308'} />
          <circle cx={680} cy={165} r={4} fill={activeFaults?.acPhaseLossL3 ? '#64748b' : '#3b82f6'} />

          {/* TOP POSITIVE BUSBAR COLLECTOR (Outputs to x=460) */}
          <line x1={240} y1={165} x2={680} y2={165} stroke={q1Closed && isBlockingDiodeForwardBiased ? '#CC0000' : '#666666'} strokeWidth={4} />
          <line x1={460} y1={165} x2={460} y2={335} stroke={q1Closed && isBlockingDiodeForwardBiased ? '#CC0000' : '#666666'} strokeWidth={4} />

          {/* BOTTOM NEGATIVE BUSBAR COLLECTOR (Outputs to x=740) */}
          <line x1={240} y1={292} x2={680} y2={292} stroke={iReturnSCRBridge > 0 || firingAngle > 90 ? '#0000CC' : '#475569'} strokeWidth={4} />
          <line x1={740} y1={292} x2={740} y2={460} stroke={iReturnSCRBridge > 0 || firingAngle > 90 ? '#0000CC' : '#475569'} strokeWidth={4} />

          {/* INVERTER MODE REGENERATION BADGE */}
          {firingAngle > 90 && !conductionState.isCommutationFailure && (
            <g>
              <rect x={260} y={145} width={400} height={16} rx={3} fill="#451a03" stroke="#f59e0b" strokeWidth={1} />
              <text x={460} y={157} fill="#fde68a" fontSize={9} fontWeight="black" textAnchor="middle" fontFamily="monospace">
                ⚡ INVERTER MODE ACTIVE: BATTERY → AC GRID REGEN (γ = {conductionState.marginAngleDeg?.toFixed(1)}°)
              </text>
            </g>
          )}

          {/* CATASTROPHIC COMMUTATION FAILURE ARC FLASH & FUSE BLOW OVERLAY */}
          {conductionState.isCommutationFailure && (
            <g className="animate-pulse">
              <rect x={110} y={142} width={700} height={180} fill="#ef4444" fillOpacity="0.25" rx={8} stroke="#ef4444" strokeWidth={3} />
              <rect x={280} y={205} width={360} height={54} rx={6} fill="#7f1d1d" stroke="#ef4444" strokeWidth={2} />
              <text x={460} y={226} fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                🚨 COMMUTATION FAILURE: DC SHORT-CIRCUIT!
              </text>
              <text x={460} y={242} fill="#fca5a5" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                γ &lt; 12° | High-Speed Semiconductor Fuses F1-F3 BLOWN!
              </text>
            </g>
          )}
        </g>

        {/* =========================================================
            SECTION 3: DC FILTER & MAIN BUSBARS CUBICLE WITH REVERSE-FEED BLOCKING DIODE VDRD (y=326..468)
            ========================================================= */}
        <g id="cubicle-section-3">
          <rect x={120} y={326} width={740} height={142} fill="#071313" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4,4" rx={8} />
          <text x={135} y={339} fill="#10b981" fontSize={9} fontWeight="black" fontFamily="monospace">
            SECTION 3: DC LC RIPPLE FILTERING, BLOCKING DIODE &amp; MAIN DC BUSBARS
          </text>

          {/* DC Reactor L1 in series on DC+ */}
          <g onMouseEnter={() => setHovered('L1')} onMouseLeave={() => setHovered(null)}>
            <rect x={448} y={345} width={24} height={24} fill="#161b22" stroke={hasLcFilter ? '#10b981' : '#64748b'} strokeWidth={2} rx={3} />
            <path d="M 460,348 Q 466,354 460,358 Q 454,362 460,366" fill="none" stroke={hasLcFilter ? '#10b981' : '#64748b'} strokeWidth={2.5} />
            <text x={478} y={358} fill="#8b949e" fontSize={9} fontWeight="bold" fontFamily="monospace">
              L1 REACTOR (2.5mH)
            </text>
            <line x1={460} y1={369} x2={460} y2={375} stroke={isBlockingDiodeForwardBiased ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          </g>

          {/* ==================== REVERSE-FEED BLOCKING DIODE (VDRD / D_BLOCK) WITH ANODE/CATHODE & REAL KCL SIMULATION ==================== */}
          <g id="blocking-diode-vdrd" transform="translate(460, 390)" onMouseEnter={() => setHovered('VDRD')} onMouseLeave={() => setHovered(null)}>
            {/* Diode Card Background */}
            <rect
              x={-85}
              y={-14}
              width={170}
              height={28}
              fill={isBlockingDiodeForwardBiased ? '#064e3b' : '#450a0a'}
              stroke={isBlockingDiodeForwardBiased ? '#10b981' : '#ef4444'}
              strokeWidth={1.5}
              rx={4}
            />

            {/* Anode (A) Mark at Top Terminal y=-14 */}
            <text x={-78} y={-4} fill="#38bdf8" fontSize={8} fontWeight="black" fontFamily="monospace">
              (A) ANODE
            </text>

            {/* Cathode (K) Mark at Bottom Terminal y=14 */}
            <text x={-80} y={8} fill="#f59e0b" fontSize={8} fontWeight="black" fontFamily="monospace">
              (K) CATHODE
            </text>

            {/* IEEE / IEC 60617 Diode Symbol (Anode Top y=-8, Cathode Bar Bottom y=6) */}
            <polygon
              points="0,6 -9,-8 9,-8"
              fill={isBlockingDiodeForwardBiased ? '#10b981' : '#ef4444'}
              stroke={isBlockingDiodeForwardBiased ? '#34d399' : '#f87171'}
              strokeWidth={1.5}
              filter={isBlockingDiodeForwardBiased ? 'url(#glowEmerald)' : 'none'}
            />
            {/* Cathode Line Bar */}
            <line x1="-11" y1="6" x2="11" y2="6" stroke={isBlockingDiodeForwardBiased ? '#34d399' : '#f87171'} strokeWidth={2.5} />

            {/* Label & Real-Time Sim Current Telemetry */}
            <text x={16} y={-1} fill="#ffffff" fontSize={8} fontWeight="black" fontFamily="monospace">
              REVERSE-FEED BLOCKING DIODE
            </text>
            <text x={16} y={9} fill={isBlockingDiodeForwardBiased ? '#34d399' : '#f87171'} fontSize={7} fontWeight="black" fontFamily="monospace">
              {isBlockingDiodeForwardBiased ? `FORWARD (Idiode = ${iDiode.toFixed(1)}A)` : 'REVERSE BLOCKED (0.00A)'}
            </text>
          </g>

          {/* Line down from Blocking Diode VDRD Cathode to DC+ Main Busbar */}
          <line x1={460} y1={404} x2={460} y2={415} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={4} />

          {/* Capacitor C1 Branch (Directly Across DC+ and DC-) */}
          <g onMouseEnter={() => setHovered('C1')} onMouseLeave={() => setHovered(null)}>
            {/* Connection Junction Dot on DC+ Busbar */}
            <circle cx={540} cy={415} r={4} fill="#CC0000" />
            <text x={540} y={410} textAnchor="middle" fill="#FF8888" fontSize={8} fontWeight="black" fontFamily="monospace">(+)</text>

            <line x1={540} y1={415} x2={540} y2={427} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={2.5} />

            {/* Cap Plates */}
            <line x1={530} y1={427} x2={550} y2={427} stroke={activeFaults?.filterCapOpen ? '#ef4444' : '#10b981'} strokeWidth={3} />
            <line x1={530} y1={433} x2={550} y2={433} stroke="#0000CC" strokeWidth={3} />

            <line x1={540} y1={433} x2={540} y2={460} stroke="#0000CC" strokeWidth={2.5} />

            {/* Connection Junction Dot on DC- Busbar */}
            <circle cx={540} cy={460} r={4} fill="#0000CC" />
            <text x={540} y={472} textAnchor="middle" fill="#70b0ff" fontSize={8} fontWeight="black" fontFamily="monospace">(-)</text>

            <text x={555} y={432} fill="#8b949e" fontSize={9} fontWeight="bold" fontFamily="monospace">
              C1 {activeFaults?.filterCapOpen ? '🚨 OPEN' : '(4700μF)'}
            </text>
          </g>

          {/* MAIN CONTINUOUS DC POSITIVE & NEGATIVE BUSBARS */}
          <g id="sec-dc-busbars">
            {/* DC+ POSITIVE BUSBAR (Red) at y=415 */}
            <line x1={240} y1={415} x2={740} y2={415} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={4} />
            {isRectifierActive && vdc > 50 && isBlockingDiodeForwardBiased && (
              <line x1={240} y1={415} x2={740} y2={415} stroke="#ff8888" strokeWidth={2.5} className="power-flow-dash-right" />
            )}
            <text x={245} y={410} fill="#ef4444" fontSize={10} fontWeight="black" fontFamily="monospace">
              DC+ BUSBAR (+110VDC)
            </text>

            {/* DC- NEGATIVE RETURN BUSBAR (Blue) at y=460 */}
            <line x1={150} y1={460} x2={840} y2={460} stroke="#0000CC" strokeWidth={4} />
            {iReturnSCRBridge > 0 && (
              <line x1={300} y1={460} x2={740} y2={460} stroke="#70b0ff" strokeWidth={2.5} className="power-flow-dash-right" />
            )}
            <text x={155} y={455} fill="#38bdf8" fontSize={10} fontWeight="black" fontFamily="monospace">
              DC- RETURN BUSBAR (0VDC)
            </text>

            {/* BUSBAR JUNCTION DOTS */}
            <circle cx={240} cy={415} r={4.5} fill="#CC0000" stroke="#FFFFFF" strokeWidth={1} />
            <circle cx={460} cy={415} r={4.5} fill="#CC0000" stroke="#FFFFFF" strokeWidth={1} />
            <circle cx={740} cy={415} r={4.5} fill="#CC0000" stroke="#FFFFFF" strokeWidth={1} />

            <circle cx={300} cy={460} r={4.5} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
            <circle cx={540} cy={460} r={4.5} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
            <circle cx={740} cy={460} r={4.5} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
            <circle cx={840} cy={460} r={4.5} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
          </g>
        </g>

        {/* =========================================================
            SECTION 4: SUBSTATION BATTERY BANK CUBICLE (y=472..564)
            ========================================================= */}
        <g id="cubicle-section-4">
          <rect x={140} y={472} width={220} height={92} fill="#120c1f" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4,4" rx={6} />
          <text x={150} y={484} fill="#a855f7" fontSize={8} fontWeight="black" fontFamily="monospace">
            SECTION 4: SUBSTATION BATTERY CUBICLE
          </text>

          {/* Line down from DC+ Bus to 52-Q2 Breaker */}
          <line x1={240} y1={415} x2={240} y2={425} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {renderIECBreaker(240, 425, 'Q2', '52-Q2 Battery Switch', '200A DC', q2Closed, handleToggleQ2, '52')}

          {/* Positive Line down into top [+] of Battery Bank */}
          <line x1={240} y1={460} x2={240} y2={490} stroke={q2Closed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />

          {/* DYNAMIC BATTERY CURRENT DIRECTION ANIMATED ARROWS */}
          {q2Closed && isBlockingDiodeForwardBiased && (
            <text x={224} y={475} fill="#34d399" fontSize={11} fontWeight="black" className="animate-bounce">
              ↓
            </text>
          )}
          {q2Closed && !isBlockingDiodeForwardBiased && idcLoad > 0 && (
            <text x={224} y={475} fill="#f59e0b" fontSize={11} fontWeight="black" className="animate-bounce">
              ↑
            </text>
          )}

          {/* Negative Line down from DC- Return Bus into top [-] of Battery Bank */}
          <line x1={300} y1={460} x2={300} y2={490} stroke="#0000CC" strokeWidth={3.5} />

          {/* BATTERY STRING BOX (x=150..350, y=490..560) */}
          <g id="sec10-battery" onMouseEnter={() => setHovered('BATTERY')} onMouseLeave={() => setHovered(null)}>
            <rect x={150} y={490} width={200} height={68} fill="#161b22" stroke="#30363d" strokeWidth={1.5} rx={6} />

            {/* Top Terminals [+] and [-] with Explicit Polarity & KCL Current Badges */}
            <circle cx={240} cy={490} r={4} fill="#CC0000" stroke="#FFFFFF" strokeWidth={1} />
            <text x={240} y={486} textAnchor="middle" fill="#FF8888" fontSize={8} fontWeight="black" fontFamily="monospace">
              {q2Closed && isBlockingDiodeForwardBiased ? 'BAT+ → DC+ (CHARGING +25A ↓)' : q2Closed && idcLoad > 0 ? `BAT+ → DC+ (DISCHARGING -${idcLoad.toFixed(1)}A ↑)` : 'BAT+ → DC+ (IDLE 0A)'}
            </text>

            <circle cx={300} cy={490} r={4} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
            <text x={300} y={486} textAnchor="middle" fill="#70b0ff" fontSize={8} fontWeight="black" fontFamily="monospace">BAT- → DC-</text>

            <text x={250} y={506} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">
              55x2V VRLA BATTERY BANK
            </text>

            {/* Battery Cells Graphics */}
            <g transform="translate(175, 514)">
              {Array.from({ length: 4 }).map((_, idx) => {
                const cx = idx * 38;
                return (
                  <g key={`batt-cell-${idx}`}>
                    <line x1={cx} y1={0} x2={cx} y2={12} stroke="#FF0000" strokeWidth={1.5} />
                    <line x1={cx + 6} y1={2} x2={cx + 6} y2={10} stroke="#0000FF" strokeWidth={3} />
                    <line x1={cx + 6} y1={6} x2={cx + 38} y2={6} stroke="#FFD700" strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>

            <text x={250} y={548} textAnchor="middle" fill="#0066FF" fontSize={9} fontWeight="black" fontFamily="monospace">
              SOC: {(isRectifierActive ? computedSoc : soc).toFixed(1)}% | Cell V: {vCell.toFixed(2)}V
            </text>
          </g>
        </g>

        {/* =========================================================
            SECTION 5: CRITICAL DC DISTRIBUTION FEEDERS CUBICLE (y=472..564)
            ========================================================= */}
        <g id="cubicle-section-5">
          <rect x={590} y={472} width={270} height={92} fill="#1c160c" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,4" rx={6} />
          <text x={600} y={484} fill="#f59e0b" fontSize={8} fontWeight="black" fontFamily="monospace">
            SECTION 5: DC DISTRIBUTION FEEDERS &amp; ISOLATOR CUBICLE
          </text>

          {/* Line down from DC+ Bus to 52-Q3 Breaker */}
          <line x1={740} y1={415} x2={740} y2={425} stroke={vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {q3Closed && vdc > 50 && <line x1={740} y1={415} x2={740} y2={425} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-down" />}
          {renderIECBreaker(740, 425, 'Q3', '52-Q3 Feeder Breaker', '100A DC', q3Closed, handleToggleQ3, '52')}

          {/* Line between Breaker 52-Q3 and Isolator 89-Q3 */}
          <line x1={740} y1={460} x2={740} y2={465} stroke={q3Closed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {renderIECDisconnector(740, 465, 'ISOLATOR_Q3', '89-Q3 Load Isolator', q3IsolatorClosed, () => setQ3IsolatorClosed(!q3IsolatorClosed), '200A LOAD DISCONNECTOR')}

          {/* Line from 89-Q3 Isolator to Top Distribution Bus at y=505 */}
          <line x1={740} y1={505} x2={740} y2={510} stroke={q3Closed && q3IsolatorClosed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />

          {/* DC+ POSITIVE DISTRIBUTION BUS (Horizontal at y=510 to Load 1 x=640 and Load 2 x=760) */}
          <line x1={640} y1={510} x2={760} y2={510} stroke={q3Closed && q3IsolatorClosed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {q3Closed && q3IsolatorClosed && vdc > 50 && <line x1={640} y1={510} x2={760} y2={510} stroke="#ff8888" strokeWidth={2} className="power-flow-dash-right" />}

          {/* DC+ Top Vertical Drop into Load 1 */}
          <line x1={640} y1={510} x2={640} y2={518} stroke={q3Closed && q3IsolatorClosed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />
          {/* DC+ Top Vertical Drop into Load 2 */}
          <line x1={760} y1={510} x2={760} y2={518} stroke={q3Closed && q3IsolatorClosed && vdc > 50 ? '#CC0000' : '#666666'} strokeWidth={3.5} />

          {/* DC- NEGATIVE DISTRIBUTION BUS (Horizontal at y=514 from DC- Bus at x=840 to Load 1 x=690 and Load 2 x=810) */}
          <line x1={840} y1={460} x2={840} y2={514} stroke="#0000CC" strokeWidth={3.5} />
          <line x1={690} y1={514} x2={840} y2={514} stroke="#0000CC" strokeWidth={3.5} />

          {/* DC- Top Vertical Drop into Load 1 */}
          <line x1={690} y1={514} x2={690} y2={518} stroke="#0000CC" strokeWidth={3.5} />
          {/* DC- Top Vertical Drop into Load 2 */}
          <line x1={810} y1={514} x2={810} y2={518} stroke="#0000CC" strokeWidth={3.5} />

          {/* ==================== CRITICAL DC LOAD 1 ==================== */}
          {(() => {
            const isLoad1Dropped = activeFaults?.loadTrip || !q3Closed || !q3IsolatorClosed || (!q1Closed && !q2Closed) || activeFaults?.controlFuseBlown || idcLoad <= 0;
            return (
              <g onMouseEnter={() => setHovered('LOAD1')} onMouseLeave={() => setHovered(null)}>
                <rect
                  x={605}
                  y={518}
                  width={110}
                  height={42}
                  fill={isLoad1Dropped ? '#7f1d1d' : '#064e3b'}
                  stroke={isLoad1Dropped ? '#ef4444' : '#10b981'}
                  strokeWidth={2.5}
                  rx={6}
                />

                {/* Top Terminals [+] and [-] with Explicit Load Polarity */}
                <circle cx={640} cy={518} r={3.5} fill="#CC0000" stroke="#FFFFFF" strokeWidth={1} />
                <text x={640} y={514} textAnchor="middle" fill="#FF8888" fontSize={8} fontWeight="black" fontFamily="monospace">LOAD1+ → DC+</text>

                <circle cx={690} cy={518} r={3.5} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
                <text x={690} y={514} textAnchor="middle" fill="#70b0ff" fontSize={8} fontWeight="black" fontFamily="monospace">LOAD1- → DC-</text>

                <text x={660} y={532} textAnchor="middle" fill="#FFFFFF" fontSize={9} fontWeight="black" fontFamily="monospace">
                  CRITICAL LOAD 1
                </text>
                <text x={660} y={552} textAnchor="middle" fill={isLoad1Dropped ? '#f87171' : '#34d399'} fontSize={8} fontWeight="black" fontFamily="monospace">
                  {isLoad1Dropped
                    ? (activeFaults?.loadTrip ? '🚨 TRIPPED (0A)' : !q3Closed ? '🚨 52-Q3 OPEN' : !q3IsolatorClosed ? '🚨 89-Q3 OPEN' : '🚨 LOAD DROPPED')
                    : `✓ Idc1 = ${(idcLoad / 2).toFixed(1)}A`}
                </text>
              </g>
            );
          })()}

          {/* ==================== CRITICAL DC LOAD 2 ==================== */}
          {(() => {
            const isLoad2Dropped = activeFaults?.loadTrip || !q3Closed || !q3IsolatorClosed || (!q1Closed && !q2Closed) || activeFaults?.controlFuseBlown || idcLoad <= 0;
            return (
              <g onMouseEnter={() => setHovered('LOAD2')} onMouseLeave={() => setHovered(null)}>
                <rect
                  x={725}
                  y={518}
                  width={110}
                  height={42}
                  fill={isLoad2Dropped ? '#7f1d1d' : '#064e3b'}
                  stroke={isLoad2Dropped ? '#ef4444' : '#10b981'}
                  strokeWidth={2.5}
                  rx={6}
                />

                {/* Top Terminals [+] and [-] with Explicit Load Polarity */}
                <circle cx={760} cy={518} r={3.5} fill="#CC0000" stroke="#FFFFFF" strokeWidth={1} />
                <text x={760} y={514} textAnchor="middle" fill="#FF8888" fontSize={8} fontWeight="black" fontFamily="monospace">LOAD2+ → DC+</text>

                <circle cx={810} cy={518} r={3.5} fill="#0000CC" stroke="#FFFFFF" strokeWidth={1} />
                <text x={810} y={514} textAnchor="middle" fill="#70b0ff" fontSize={8} fontWeight="black" fontFamily="monospace">LOAD2- → DC-</text>

                <text x={780} y={532} textAnchor="middle" fill="#FFFFFF" fontSize={9} fontWeight="black" fontFamily="monospace">
                  CRITICAL LOAD 2
                </text>
                <text x={780} y={552} textAnchor="middle" fill={isLoad2Dropped ? '#f87171' : '#34d399'} fontSize={8} fontWeight="black" fontFamily="monospace">
                  {isLoad2Dropped
                    ? (activeFaults?.loadTrip ? '🚨 TRIPPED (0A)' : !q3Closed ? '🚨 52-Q3 OPEN' : !q3IsolatorClosed ? '🚨 89-Q3 OPEN' : '🚨 LOAD DROPPED')
                    : `✓ Idc2 = ${(idcLoad / 2).toFixed(1)}A`}
                </text>
              </g>
            );
          })()}
        </g>
      </svg>
    </div>
  );
};
