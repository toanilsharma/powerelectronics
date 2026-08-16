import React, { useState } from 'react';
import { DualBatteryChargerReadouts, DualBatteryChargerState, DualChargerFaults } from '../types/dualBatteryCharger';
import { computeFloatingDCEarthPhysics } from '../utils/floatingDcPhysics';
import { Info, Zap, Shield, Activity, RefreshCw, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';

interface DualBatteryChargerSLDProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  faults?: DualChargerFaults;
  targetHighlightKey?: string;
  onToggleBreaker: (key: keyof DualBatteryChargerState) => void;
  onToggleModeA: () => void;
  onToggleModeB: () => void;
  onTripShunt1: () => void;
  onTripShunt2: () => void;
  onSetLoad1?: (kw: number) => void;
  onSetLoad2?: (kw: number) => void;
}

interface ComponentInfo {
  name: string;
  rating: string;
  standard: string;
  description: string;
}

const DUAL_SLD_TOOLTIPS: Record<string, ComponentInfo> = {
  AC_INCOMER_A: {
    name: 'Q1 | 415V AC Supply A Incomer Circuit Breaker (CB / LBS)',
    rating: 'Q1 | MCCB 160A, 3P 415V 50Hz, 25kA Icu (IEC 60617 Symbol)',
    standard: 'IEC 60947-2 / IEC 60617 / IS 13947',
    description: 'Main AC 3-Pole incomer circuit breaker with trip mechanism for Float Cum Boost Charger 1A.',
  },
  AC_INCOMER_B: {
    name: 'Q2 | 415V AC Supply B Incomer Circuit Breaker (CB / LBS)',
    rating: 'Q2 | MCCB 160A, 3P 415V 50Hz, 25kA Icu (IEC 60617 Symbol)',
    standard: 'IEC 60947-2 / IEC 60617 / IS 13947',
    description: 'Main AC 3-Pole incomer circuit breaker with trip mechanism for Float Cum Boost Charger 1B.',
  },
  MODULE_1A: {
    name: 'Charger 1A Rectifier Module MT220V/20A-FC3(U)',
    rating: '20A DC Output, 220V Nominal, Swappable',
    standard: 'IEEE 1188 / IEC 60146-1-1',
    description: 'Hot-swappable high-frequency switch mode / thyristor rectifier module.',
  },
  MODULE_1B: {
    name: 'Charger 1B Rectifier Module MT220V/20A-FC3(U)',
    rating: '20A DC Output, 220V Nominal, Swappable',
    standard: 'IEEE 1188 / IEC 60146-1-1',
    description: 'Hot-swappable high-frequency switch mode / thyristor rectifier module.',
  },
  CONTROLLER_A: {
    name: 'Charger 1A Controller MTM070K(UK)-A',
    rating: '7-inch Touch HMI / RS485 SCADA Interface',
    standard: 'IEC 61850 / Modbus RTU',
    description: 'Monitors Float/Boost voltage, cell temperature compensation, and module load sharing.',
  },
  CONTROLLER_B: {
    name: 'Charger 1B Controller MTM070K(UK)-B',
    rating: '7-inch Touch HMI / RS485 SCADA Interface',
    standard: 'IEC 61850 / Modbus RTU',
    description: 'Monitors Float/Boost voltage, cell temperature compensation, and module load sharing.',
  },
  DIODE_A: {
    name: 'Blocking Diode MR 150A / DH1350 (Charger 1A)',
    rating: '150A 1300V Silicon Rectifier Diode',
    standard: 'IEC 60146',
    description: 'Prevents DC bus backfeeding or circulating currents into de-energized charger.',
  },
  DIODE_B: {
    name: 'Blocking Diode MR 150A / DH1350 (Charger 1B)',
    rating: '150A 1300V Silicon Rectifier Diode',
    standard: 'IEC 60146',
    description: 'Prevents DC bus backfeeding or circulating currents into de-energized charger.',
  },
  BUS_TIE: {
    name: 'DC Bus Tie / Bus Coupler Breaker',
    rating: '125A MCCB (Manually Operated, Normally Open)',
    standard: 'IEEE 946 / IEC 60947-2',
    description: 'Interconnects DC Bus A and DC Bus B. Closed during single-charger emergency mode.',
  },
  BATTERY_1: {
    name: '220V / 100AH VRLA Battery Bank 1',
    rating: '105 Cells (2.23V Float = 234V, 1.80V End = 189V)',
    standard: 'IEEE 1188 / IEC 62485-2 / IEC 60896-21/22 VRLA',
    description: 'Valve Regulated Lead Acid battery bank providing uninterrupted DC power.',
  },
  BATTERY_2: {
    name: '220V / 100AH VRLA Battery Bank 2',
    rating: '105 Cells (2.23V Float = 234V, 1.80V End = 189V)',
    standard: 'IEEE 1188 / IEC 62485-2 / IEC 60896-21/22 VRLA',
    description: 'Valve Regulated Lead Acid battery bank providing uninterrupted DC power.',
  },
  BATTERY_BOX_1: {
    name: 'Battery 1 MCCB Box with Shunt Trip',
    rating: '160A 250VDC 2P with 220VDC Shunt Trip Coil',
    standard: 'IEEE C37.2-52 / IEC 60947-2',
    description: 'Mounted outside battery room for emergency remote tripping during thermal runaway or fire.',
  },
  BATTERY_BOX_2: {
    name: 'Battery 2 MCCB Box with Shunt Trip',
    rating: '160A 250VDC 2P with 220VDC Shunt Trip Coil',
    standard: 'IEEE C37.2-52 / IEC 60947-2',
    description: 'Mounted outside battery room for emergency remote tripping during thermal runaway or fire.',
  },
  DCDB_1: {
    name: 'To DC Distribution Board 1 (DCDB 1)',
    rating: '125A MCCB, DCCT 100A, VLOAD Meter',
    standard: 'IEEE 946 / IEC 61511',
    description: 'Feeds Section-1 critical station loads (Relay panels, Switchgear controls, SCADA).',
  },
  DCDB_2: {
    name: 'To DC Distribution Board 2 (DCDB 2)',
    rating: '125A MCCB, DCCT 100A, VLOAD Meter',
    standard: 'IEEE 946 / IEC 61511',
    description: 'Feeds Section-2 critical station loads (Emergency lighting, Inverters, Trip coils).',
  },
};

export const DualBatteryChargerSLD: React.FC<DualBatteryChargerSLDProps> = ({
  state,
  readouts,
  faults,
  targetHighlightKey,
  onToggleBreaker,
  onToggleModeA,
  onToggleModeB,
  onTripShunt1,
  onTripShunt2,
  onSetLoad1,
  onSetLoad2,
}) => {
  const [hoveredItem, setHoveredItem] = useState<ComponentInfo | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedDeviceKey, setSelectedDeviceKey] = useState<string | null>(null);

  // Floating DC System Earth Physics Engine Telemetry (IEEE 946 / IEC 60364)
  const earth1 = computeFloatingDCEarthPhysics(
    readouts.vDcBus1,
    !!(faults?.groundFaultBus1Pos || faults?.groundFaultBus1),
    !!faults?.groundFaultBus1Neg,
    faults?.earthFaultResistance1Kohm ?? 0
  );

  const earth2 = computeFloatingDCEarthPhysics(
    readouts.vDcBus2,
    !!(faults?.groundFaultBus2Pos || faults?.groundFaultBus2),
    !!faults?.groundFaultBus2Neg,
    faults?.earthFaultResistance2Kohm ?? 0
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPos({ x: 0, y: 0 });
  };

  const isAcAOn = state.acSupplyAOnline;
  const isAcBOn = state.acSupplyBOnline;
  const isChgAOn = isAcAOn && state.mccbChargerA && readouts.activeModulesA > 0 && state.blockingDiodeAHealthy;
  const isChgBOn = isAcBOn && state.mccbChargerB && readouts.activeModulesB > 0 && state.blockingDiodeBHealthy;
  const isTieOn = state.mcbTieA && state.mccbBusTie && state.mcbTieB;
  const isBat1On = state.mccbBattery1_125A && state.mccbBattery1_160A && !state.shuntTrip1Tripped;
  const isBat2On = state.mccbBattery2_125A && state.mccbBattery2_160A && !state.shuntTrip2Tripped;

  return (
    <div 
      className="w-full h-full relative overflow-hidden flex items-center justify-center select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* PAN & ZOOM CONTROLS OVERLAY (TOP-RIGHT) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-[#0d1424]/90 border border-[#1e293b] p-1 rounded-xl shadow-lg backdrop-blur-md">
        <button
          onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In (+)"
        >
          +
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out (-)"
        >
          -
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
          title="Reset Zoom & Pan"
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all cursor-pointer border border-blue-400"
          title="Fit to Screen"
        >
          Fit
        </button>
      </div>

      {/* SVG SLD SCHEMATIC (STRICT TOP-TO-BOTTOM ARCHITECTURE) */}
      <div 
        className="w-full h-full flex items-center justify-center transition-transform duration-75"
        style={{
          transform: `scale(${zoomLevel}) translate(${panPos.x / zoomLevel}px, ${panPos.y / zoomLevel}px)`,
          transformOrigin: 'center center',
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <svg viewBox="0 0 1200 1020" className="w-full h-full max-h-full object-contain block">
          <defs>
            {/* GRADIENTS */}
            <linearGradient id="acBusGradA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="acBusGradB" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            <linearGradient id="dcBusGradA" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* GLOW FILTERS */}
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* DASHED FLOW PATTERN */}
            <pattern id="flowPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="2" fill="#10b981" />
            </pattern>
          </defs>

          {/* GRID HEADER / BORDER REFERENCE MARKERS (1 to 8) */}
          <g fill="#48515d" fontSize="10" fontFamily="monospace">
            <rect x="10" y="10" width="1180" height="1160" fill="none" stroke="#21262d" strokeWidth="1" />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => (
              <text key={num} x={80 + i * 145} y={25} textAnchor="middle">
                {num}
              </text>
            ))}
            <line x1="10" y1="32" x2="1190" y2="32" stroke="#21262d" strokeWidth="1" />
          </g>

          {/* 220V DC UNGROUNDED FLOATING SYSTEM ANNOTATION BADGE */}
          <g transform="translate(390, 8)">
            <rect x="0" y="0" width="420" height="20" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
            <text x="210" y="14" fill="#c7d2fe" fontSize="8.5" fontWeight="black" textAnchor="middle">
              ⚡ 220V DC UNGROUNDED FLOATING SYSTEM WITH ANSI 64/89G EARTH FAULT MONITORING
            </text>
          </g>

          {/* ========================================================================= */}
          {/* SECTION 1: TOP AC INPUT SUPPLIES (LEFT = SUPPLY A, RIGHT = SUPPLY B) */}
          {/* ========================================================================= */}

          {/* SUPPLY A HEADER */}
          <g transform="translate(60, 42)">
            <rect x="0" y="0" width="480" height="26" rx="4" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
            <text x="240" y="17" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
              415V ±10% 50Hz ±3% 3PH 4W AC SUPPLY A (INCOMER A)
            </text>
          </g>

          {/* SUPPLY B HEADER */}
          <g transform="translate(660, 42)">
            <rect x="0" y="0" width="480" height="26" rx="4" fill="#0f172a" stroke="#0891b2" strokeWidth="1" />
            <text x="240" y="17" fill="#22d3ee" fontSize="11" fontWeight="bold" textAnchor="middle">
              415V ±10% 50Hz ±3% 3PH 4W AC SUPPLY B (INCOMER B)
            </text>
          </g>

          {/* --- LEFT SIDE: SUPPLY A APPARATUS --- */}
          {/* Terminal Block & Incomer MCCB 80A */}
          <g transform="translate(260, 80)">
            <line x1="40" y1="0" x2="40" y2="20" stroke={isAcAOn ? '#38bdf8' : '#475569'} strokeWidth="3" />
            {isAcAOn && (
              <line x1="40" y1="0" x2="40" y2="20" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-down" />
            )}
            <rect x="25" y="20" width="30" height="12" fill="#1e293b" stroke="#0284c7" rx="2" />
            <text x="40" y="29" fill="#e2e8f0" fontSize="8" textAnchor="middle">
              TB
            </text>

            {/* IEEE/IEC Standard Circuit Breaker Symbol (80A MCCB A) */}
            {/* IEC 60617 Standard 3-Pole AC Circuit Breaker Symbol (80A AC MCCB A) */}
            <g
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => setSelectedDeviceKey('AC_INCOMER_A')}
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.AC_INCOMER_A)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <rect
                x="25"
                y="36"
                width="30"
                height="30"
                rx="4"
                fill={isAcAOn ? '#064e3b' : '#1e293b'}
                stroke={isAcAOn ? '#10b981' : '#64748b'}
                strokeWidth="2"
              />
              {/* IEC 60617 Circuit Breaker 'X' Symbol & 3P Trip Lever */}
              {isAcAOn ? (
                <g stroke="#10b981" strokeWidth="2.5">
                  <line x1="29" y1="40" x2="51" y2="62" />
                  <line x1="51" y1="40" x2="29" y2="62" />
                  <line x1="40" y1="36" x2="40" y2="66" stroke="#34d399" strokeWidth="1.5" />
                </g>
              ) : (
                <g stroke="#64748b" strokeWidth="2.5">
                  <line x1="40" y1="36" x2="40" y2="46" />
                  <line x1="40" y1="46" x2="48" y2="56" />
                  <line x1="40" y1="56" x2="40" y2="66" />
                  <line x1="33" y1="45" x2="47" y2="57" opacity="0.4" />
                  <line x1="47" y1="45" x2="33" y2="57" opacity="0.4" />
                </g>
              )}
              <text x="40" y="78" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">
                Q1 | AC INCOMER A | MCCB 160A
              </text>
            </g>

            {/* Meters: Voltmeter VM 0-500V, Ammeter AM 0-75A, SPD, Lamps */}
            <line x1="40" y1="66" x2="40" y2="100" stroke={isAcAOn ? '#10b981' : '#475569'} strokeWidth="3" />
            {isAcAOn && (
              <line x1="40" y1="66" x2="40" y2="100" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
          </g>


          {/* Left Meters Display Panel */}
          <g transform="translate(80, 110)">
            <rect x="0" y="0" width="150" height="55" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="10" y="18" fill="#94a3b8" fontSize="9">
              VM (0-500V): <tspan fill="#10b981">{isAcAOn ? `${readouts.vAcBusA.toFixed(0)}V` : '0V'}</tspan>
            </text>
            <text x="10" y="32" fill="#94a3b8" fontSize="9">
              AM (0-75A): <tspan fill="#10b981">{isAcAOn ? `${(readouts.iChargerA * 0.85).toFixed(1)}A` : '0A'}</tspan>
            </text>
            <text x="10" y="46" fill="#94a3b8" fontSize="9">
              SPD 40kA: <tspan fill={isAcAOn ? '#10b981' : '#64748b'}>{isAcAOn ? 'OK (RYB)' : 'OFF / UNPOWERED'}</tspan>
            </text>
          </g>

          {/* --- RIGHT SIDE: SUPPLY B APPARATUS --- */}
          <g transform="translate(860, 80)">
            <line x1="40" y1="0" x2="40" y2="20" stroke={isAcBOn ? '#10b981' : '#475569'} strokeWidth="3" />
            {isAcBOn && (
              <line x1="40" y1="0" x2="40" y2="20" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            <rect x="25" y="20" width="30" height="12" fill="#1e293b" stroke="#0891b2" rx="2" />
            <text x="40" y="29" fill="#e2e8f0" fontSize="8" textAnchor="middle">
              TB
            </text>

            {/* IEC 60617 Standard 3-Pole AC Circuit Breaker Symbol (Q2 AC MCCB B) */}
            <g
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => setSelectedDeviceKey('AC_INCOMER_B')}
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.AC_INCOMER_B)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <rect
                x="25"
                y="36"
                width="30"
                height="30"
                rx="4"
                fill={isAcBOn ? '#064e3b' : '#1e293b'}
                stroke={isAcBOn ? '#10b981' : '#64748b'}
                strokeWidth="2"
              />
              {/* IEC 60617 Circuit Breaker 'X' Symbol & 3P Trip Lever */}
              {isAcBOn ? (
                <g stroke="#10b981" strokeWidth="2.5">
                  <line x1="29" y1="40" x2="51" y2="62" />
                  <line x1="51" y1="40" x2="29" y2="62" />
                  <line x1="40" y1="36" x2="40" y2="66" stroke="#34d399" strokeWidth="1.5" />
                </g>
              ) : (
                <g stroke="#64748b" strokeWidth="2.5">
                  <line x1="40" y1="36" x2="40" y2="46" />
                  <line x1="40" y1="46" x2="48" y2="56" />
                  <line x1="40" y1="56" x2="40" y2="66" />
                  <line x1="33" y1="45" x2="47" y2="57" opacity="0.4" />
                  <line x1="47" y1="45" x2="33" y2="57" opacity="0.4" />
                </g>
              )}
              <text x="40" y="78" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">
                Q2 | AC INCOMER B | MCCB 160A
              </text>
            </g>

            <line x1="40" y1="66" x2="40" y2="100" stroke={isAcBOn ? '#22d3ee' : '#475569'} strokeWidth="3" />
            {isAcBOn && (
              <line x1="40" y1="66" x2="40" y2="100" stroke="#67e8f9" strokeWidth="2" className="power-flow-dash-down" />
            )}
          </g>


          {/* Right Meters Display Panel */}
          <g transform="translate(970, 110)">
            <rect x="0" y="0" width="150" height="55" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="10" y="18" fill="#94a3b8" fontSize="9">
              VM (0-500V): <tspan fill="#22d3ee">{isAcBOn ? `${readouts.vAcBusB.toFixed(0)}V` : '0V'}</tspan>
            </text>
            <text x="10" y="32" fill="#94a3b8" fontSize="9">
              AM (0-75A): <tspan fill="#22d3ee">{isAcBOn ? `${(readouts.iChargerB * 0.85).toFixed(1)}A` : '0A'}</tspan>
            </text>
            <text x="10" y="46" fill="#94a3b8" fontSize="9">
              SPD 40kA: <tspan fill={isAcBOn ? '#10b981' : '#64748b'}>{isAcBOn ? 'OK (RYB)' : 'OFF / UNPOWERED'}</tspan>
            </text>
          </g>

          {/* 3PH AC COPPER BUSBARS */}
          {/* BUS A */}
          <rect
            x="80"
            y="180"
            width="440"
            height="10"
            rx="3"
            fill="url(#acBusGradA)"
            stroke={isAcAOn ? '#38bdf8' : '#334155'}
            filter={isAcAOn ? 'url(#glowAmber)' : undefined}
          />
          <text x="300" y="175" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">
            3PH AC Cu. BUS (A)
          </text>

          {/* BUS B */}
          <rect
            x="680"
            y="180"
            width="440"
            height="10"
            rx="3"
            fill="url(#acBusGradB)"
            stroke={isAcBOn ? '#22d3ee' : '#334155'}
            filter={isAcBOn ? 'url(#glowAmber)' : undefined}
          />
          <text x="900" y="175" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">
            3PH AC Cu. BUS (B)
          </text>

          {/* ========================================================================= */}
          {/* SECTION 2: RECTIFIER MODULES & CHARGER CONTROLLERS */}
          {/* ========================================================================= */}

          {/* RECTIFIER / FLOAT CUM BOOST CHARGER UNIT 1A FUNCTIONAL ENCLOSURE */}
          <g transform="translate(70, 195)">
            <rect
              x="0"
              y="0"
              width="415"
              height="155"
              rx="8"
              fill="#061224"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="6 3"
              className="shadow-xl"
            />
            <rect x="10" y="-12" width="310" height="22" rx="4" fill="#0369a1" stroke="#38bdf8" strokeWidth="1" />
            <text x="165" y="3" fill="#ffffff" fontSize="8.5" fontWeight="black" textAnchor="middle">
              ⚡ FLOAT CUM BOOST CHARGER UNIT A (4x 20A Modules)
            </text>
            <text x="395" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="end">
              IEC 60617 CHARGER BLOCK
            </text>
          </g>

          {/* RECTIFIER / FLOAT CUM BOOST CHARGER UNIT 1B FUNCTIONAL ENCLOSURE */}
          <g transform="translate(670, 195)">
            <rect
              x="0"
              y="0"
              width="415"
              height="155"
              rx="8"
              fill="#061224"
              stroke="#0891b2"
              strokeWidth="2"
              strokeDasharray="6 3"
              className="shadow-xl"
            />
            <rect x="10" y="-12" width="310" height="22" rx="4" fill="#0e7490" stroke="#22d3ee" strokeWidth="1" />
            <text x="165" y="3" fill="#ffffff" fontSize="8.5" fontWeight="black" textAnchor="middle">
              ⚡ FLOAT CUM BOOST CHARGER UNIT B (4x 20A Modules)
            </text>
            <text x="395" y="14" fill="#22d3ee" fontSize="8" fontWeight="bold" textAnchor="end">
              IEC 60617 CHARGER BLOCK
            </text>
          </g>

          {/* CENTER TEXT: HOT SWAPPABLE TYPE */}
          <rect x="500" y="215" width="200" height="20" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
          <text x="600" y="229" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle">
            ALL MODULES HOT SWAPPABLE
          </text>

          {/* --- CHARGER 1A MODULES (MODULE 1A, 2A, 3A, 4A, SPARE) --- */}
          {[
            { id: 'mcbModule1A', name: 'MOD 1A', x: 100 },
            { id: 'mcbModule2A', name: 'MOD 2A', x: 180 },
            { id: 'mcbModule3A', name: 'MOD 3A', x: 260 },
            { id: 'mcbModule4A', name: 'MOD 4A', x: 340 },
            { id: 'mcbSpareA', name: 'SPARE', x: 420 },
          ].map((mod) => {
            const isModOn = isAcAOn && (state as any)[mod.id];
            return (
              <g key={mod.id} transform={`translate(${mod.x}, 225)`}>
                {/* Connection line from AC Bus */}
                <line x1="30" y1="-35" x2="30" y2="10" stroke={isAcAOn ? '#38bdf8' : '#334155'} strokeWidth="2" />
                {isAcAOn && (
                  <line x1="30" y1="-35" x2="30" y2="10" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-down" />
                )}

                {/* MCB 20A Toggle */}
                <g className="cursor-pointer" onClick={() => onToggleBreaker(mod.id as any)}>
                  <rect
                    x="10"
                    y="10"
                    width="40"
                    height="20"
                    rx="3"
                    fill={isModOn ? '#0284c7' : '#334155'}
                    stroke={isModOn ? '#38bdf8' : '#64748b'}
                  />
                  <text x="30" y="23" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    MCB 20A
                  </text>
                </g>

                <line x1="30" y1="30" x2="30" y2="45" stroke={isModOn ? '#38bdf8' : '#334155'} strokeWidth="2" />
                {isModOn && (
                  <line x1="30" y1="30" x2="30" y2="45" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-down" />
                )}

                {/* Module Box */}
                <g
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.MODULE_1A)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <rect
                    x="2"
                    y="45"
                    width="56"
                    height="55"
                    rx="6"
                    fill={isModOn ? '#0f172a' : '#1e293b'}
                    stroke={isModOn ? '#10b981' : '#475569'}
                    strokeWidth="2"
                  />
                  {/* AC/DC Rectifier Symbol */}
                  <line x1="12" y1="55" x2="48" y2="90" stroke="#64748b" strokeWidth="1" />
                  <text x="18" y="70" fill="#38bdf8" fontSize="10" fontWeight="bold">
                    ~
                  </text>
                  <text x="34" y="85" fill="#10b981" fontSize="10" fontWeight="bold">
                    =
                  </text>

                  <text x="30" y="94" fill={isModOn ? '#34d399' : '#94a3b8'} fontSize="7" fontWeight="bold" textAnchor="middle">
                    {mod.name}
                  </text>
                </g>

                {/* Output line */}
                <line x1="30" y1="100" x2="30" y2="130" stroke={isModOn ? '#10b981' : '#334155'} strokeWidth="2" />
                {isModOn && (
                  <line x1="30" y1="100" x2="30" y2="130" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
                )}
              </g>
            );
          })}

          {/* --- CHARGER 1B MODULES (MODULE 1B, 2B, 3B, 4B, SPARE) --- */}
          {[
            { id: 'mcbModule1B', name: 'MOD 1B', x: 700 },
            { id: 'mcbModule2B', name: 'MOD 2B', x: 780 },
            { id: 'mcbModule3B', name: 'MOD 3B', x: 860 },
            { id: 'mcbModule4B', name: 'MOD 4B', x: 940 },
            { id: 'mcbSpareB', name: 'SPARE', x: 1020 },
          ].map((mod) => {
            const isModOn = isAcBOn && (state as any)[mod.id];
            return (
              <g key={mod.id} transform={`translate(${mod.x}, 225)`}>
                {/* Connection line from AC Bus */}
                <line x1="30" y1="-35" x2="30" y2="10" stroke={isAcBOn ? '#22d3ee' : '#334155'} strokeWidth="2" />
                {isAcBOn && (
                  <line x1="30" y1="-35" x2="30" y2="10" stroke="#67e8f9" strokeWidth="2" className="power-flow-dash-down" />
                )}

                {/* MCB 20A Toggle */}
                <g className="cursor-pointer" onClick={() => onToggleBreaker(mod.id as any)}>
                  <rect
                    x="10"
                    y="10"
                    width="40"
                    height="20"
                    rx="3"
                    fill={isModOn ? '#0891b2' : '#334155'}
                    stroke={isModOn ? '#22d3ee' : '#64748b'}
                  />
                  <text x="30" y="23" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    MCB 20A
                  </text>
                </g>

                <line x1="30" y1="30" x2="30" y2="45" stroke={isModOn ? '#22d3ee' : '#334155'} strokeWidth="2" />
                {isModOn && (
                  <line x1="30" y1="30" x2="30" y2="45" stroke="#67e8f9" strokeWidth="2" className="power-flow-dash-down" />
                )}

                {/* Module Box */}
                <g
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.MODULE_1B)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <rect
                    x="2"
                    y="45"
                    width="56"
                    height="55"
                    rx="6"
                    fill={isModOn ? '#0f172a' : '#1e293b'}
                    stroke={isModOn ? '#10b981' : '#475569'}
                    strokeWidth="2"
                  />
                  {/* AC/DC Rectifier Symbol */}
                  <line x1="12" y1="55" x2="48" y2="90" stroke="#64748b" strokeWidth="1" />
                  <text x="18" y="70" fill="#22d3ee" fontSize="10" fontWeight="bold">
                    ~
                  </text>
                  <text x="34" y="85" fill="#10b981" fontSize="10" fontWeight="bold">
                    =
                  </text>

                  <text x="30" y="94" fill={isModOn ? '#34d399' : '#94a3b8'} fontSize="7" fontWeight="bold" textAnchor="middle">
                    {mod.name}
                  </text>
                </g>

                {/* Output line */}
                <line x1="30" y1="100" x2="30" y2="130" stroke={isModOn ? '#10b981' : '#334155'} strokeWidth="2" />
                {isModOn && (
                  <line x1="30" y1="100" x2="30" y2="130" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
                )}
              </g>
            );
          })}

          {/* CONTROLLERS MTM070K(UK)-A & MTM070K(UK)-B IN CENTER */}
          {/* CONTROLLER A */}
          <g transform="translate(480, 270)" className="cursor-pointer" onClick={onToggleModeA}>
            <rect x="0" y="0" width="100" height="70" rx="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <text x="50" y="16" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
              MTM070K(UK)-A
            </text>
            <rect x="10" y="22" width="80" height="28" rx="3" fill="#090d16" />
            <text x="50" y="36" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
              {state.modeA} MODE
            </text>
            <text x="50" y="46" fill={isChgAOn ? '#34d399' : '#f87171'} fontSize="8" textAnchor="middle">
              {readouts.vChargerA.toFixed(1)}V / {readouts.iChargerA.toFixed(1)}A
            </text>
            <text x="50" y="62" fill="#e2e8f0" fontSize="8" textAnchor="middle">
              RS485 TO SCADA
            </text>
          </g>

          {/* CONTROLLER B */}
          <g transform="translate(620, 270)" className="cursor-pointer" onClick={onToggleModeB}>
            <rect x="0" y="0" width="100" height="70" rx="6" fill="#0891b2" stroke="#22d3ee" strokeWidth="2" />
            <text x="50" y="16" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
              MTM070K(UK)-B
            </text>
            <rect x="10" y="22" width="80" height="28" rx="3" fill="#090d16" />
            <text x="50" y="36" fill="#22d3ee" fontSize="10" fontWeight="bold" textAnchor="middle">
              {state.modeB} MODE
            </text>
            <text x="50" y="46" fill={isChgBOn ? '#34d399' : '#f87171'} fontSize="8" textAnchor="middle">
              {readouts.vChargerB.toFixed(1)}V / {readouts.iChargerB.toFixed(1)}A
            </text>
            <text x="50" y="62" fill="#e2e8f0" fontSize="8" textAnchor="middle">
              RS485 TO SCADA
            </text>
          </g>

          {/* ========================================================================= */}
          {/* SECTION 3: DC OUTPUT BUSES, BLOCKING DIODES & BUS TIE COUPLER */}
          {/* ========================================================================= */}

          {/* CHARGER 1A MAIN COMBINING DC BUS (X: 130 to 450) */}
          <line x1="130" y1="355" x2="450" y2="355" stroke={isChgAOn || readouts.vChargerA > 50 || readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="4" />
          {(isChgAOn || readouts.vChargerA > 50 || readouts.vDcBus1 > 50) && (
            <line x1="130" y1="355" x2="450" y2="355" stroke="#a7f3d0" strokeWidth="2.5" className="power-flow-dash-right" />
          )}

          {/* CHARGER 1B MAIN COMBINING DC BUS (X: 730 to 1050) */}
          <line x1="730" y1="355" x2="1050" y2="355" stroke={isChgBOn || readouts.vChargerB > 50 || readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="4" />
          {(isChgBOn || readouts.vChargerB > 50 || readouts.vDcBus2 > 50) && (
            <line x1="730" y1="355" x2="1050" y2="355" stroke="#a7f3d0" strokeWidth="2.5" className="power-flow-dash-right" />
          )}

          {/* --- LEFT DC BRANCH: CHARGER 1A DC ISOLATION --- */}
          <g transform="translate(290, 355)">
            <line x1="0" y1="0" x2="0" y2="25" stroke={readouts.vChargerA > 50 || isChgAOn ? '#10b981' : '#334155'} strokeWidth="3" />
            {(isChgAOn || readouts.vChargerA > 50) && (
              <line x1="0" y1="0" x2="0" y2="25" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* BLOCKING DIODE MR 150A/DH1350 */}
            <g
              transform="translate(-15, 25)"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.DIODE_A)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <polygon points="0,0 30,0 15,25" fill={state.blockingDiodeAHealthy && (readouts.vChargerA > 50 || readouts.vDcBus1 > 50) ? '#10b981' : '#ef4444'} />
              <line x1="0" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">
                MR 150A
              </text>
            </g>

            <line x1="0" y1="55" x2="0" y2="75" stroke={isChgAOn || readouts.vDcBus1 > 50 ? '#10b981' : '#334155'} strokeWidth="3" />
            {(isChgAOn || readouts.vDcBus1 > 50) && (
              <line x1="0" y1="55" x2="0" y2="75" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* DC MCCB 100A CHARGER A (IEC 60617 Symbol) */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mccbChargerA')} transform="translate(-25, 75)">
              <rect
                x="0"
                y="0"
                width="50"
                height="28"
                rx="4"
                fill={state.mccbChargerA ? (isChgAOn || readouts.vDcBus1 > 50 ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mccbChargerA ? (isChgAOn || readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              {state.mccbChargerA ? (
                <g stroke="#ffffff" strokeWidth="1.5">
                  <line x1="8" y1="7" x2="42" y2="7" />
                  <line x1="21" y1="3" x2="29" y2="11" stroke="#34d399" strokeWidth="1.5" />
                </g>
              ) : (
                <g stroke="#94a3b8" strokeWidth="1.5">
                  <line x1="8" y1="7" x2="20" y2="7" />
                  <line x1="20" y1="7" x2="28" y2="2" />
                  <line x1="28" y1="7" x2="42" y2="7" />
                </g>
              )}
              <text x="25" y="17" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCCB
              </text>
              <text x="25" y="25" fill="#ffffff" fontSize="7" textAnchor="middle">
                100A
              </text>
            </g>

            <line x1="0" y1="101" x2="0" y2="130" stroke={isChgAOn || readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {(isChgAOn || readouts.vDcBus1 > 50) && (
              <line x1="0" y1="101" x2="0" y2="130" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
          </g>

          {/* --- RIGHT DC BRANCH: CHARGER 1B DC ISOLATION --- */}
          <g transform="translate(890, 355)">
            <line x1="0" y1="0" x2="0" y2="25" stroke={readouts.vChargerB > 50 || isChgBOn ? '#10b981' : '#334155'} strokeWidth="3" />
            {(isChgBOn || readouts.vChargerB > 50) && (
              <line x1="0" y1="0" x2="0" y2="25" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* BLOCKING DIODE MR 150A/DH1350 */}
            <g
              transform="translate(-15, 25)"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.DIODE_B)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <polygon points="0,0 30,0 15,25" fill={state.blockingDiodeBHealthy && (readouts.vChargerB > 50 || readouts.vDcBus2 > 50) ? '#10b981' : '#ef4444'} />
              <line x1="0" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">
                MR 150A
              </text>
            </g>

            <line x1="0" y1="55" x2="0" y2="75" stroke={isChgBOn || readouts.vDcBus2 > 50 ? '#10b981' : '#334155'} strokeWidth="3" />
            {(isChgBOn || readouts.vDcBus2 > 50) && (
              <line x1="0" y1="55" x2="0" y2="75" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* DC MCCB 100A CHARGER B (IEC 60617 Symbol) */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mccbChargerB')} transform="translate(-25, 75)">
              <rect
                x="0"
                y="0"
                width="50"
                height="28"
                rx="4"
                fill={state.mccbChargerB ? (isChgBOn || readouts.vDcBus2 > 50 ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mccbChargerB ? (isChgBOn || readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              {state.mccbChargerB ? (
                <g stroke="#ffffff" strokeWidth="1.5">
                  <line x1="8" y1="7" x2="42" y2="7" />
                  <line x1="21" y1="3" x2="29" y2="11" stroke="#34d399" strokeWidth="1.5" />
                </g>
              ) : (
                <g stroke="#94a3b8" strokeWidth="1.5">
                  <line x1="8" y1="7" x2="20" y2="7" />
                  <line x1="20" y1="7" x2="28" y2="2" />
                  <line x1="28" y1="7" x2="42" y2="7" />
                </g>
              )}
              <text x="25" y="17" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCCB
              </text>
              <text x="25" y="25" fill="#ffffff" fontSize="7" textAnchor="middle">
                100A
              </text>
            </g>

            <line x1="0" y1="101" x2="0" y2="130" stroke={isChgBOn || readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {(isChgBOn || readouts.vDcBus2 > 50) && (
              <line x1="0" y1="101" x2="0" y2="130" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
          </g>

          {/* --- CENTER DC BUS TIE / BUS COUPLER PATH (X: 290 to 890 at Y=485) --- */}
          <g transform="translate(290, 485)">
            {/* Connection Node Left */}
            <circle cx="0" cy="0" r="5" fill={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} />
            <text x="0" y="-10" fill={readouts.vDcBus1 > 50 ? '#34d399' : '#f87171'} fontSize="10" fontWeight="bold" textAnchor="middle">
              VBATT-1
            </text>

            {/* Left Segment: VBATT-1 to DC MCB 6A Left (Live if Bus 1 > 50V) */}
            <line x1="0" y1="0" x2="160" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3.5" />
            {(readouts.vDcBus1 > 50 || readouts.isBusTieEnergized) && (
              <line x1="0" y1="0" x2="160" y2="0" stroke={readouts.isBusTieEnergized ? '#fbbf24' : '#34d399'} strokeWidth="2.5" className="power-flow-dash-right" />
            )}

            {/* DC MCB 6A Left */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mcbTieA')} transform="translate(160, -12)">
              <rect
                x="0"
                y="0"
                width="40"
                height="24"
                rx="3"
                fill={state.mcbTieA ? (readouts.vDcBus1 > 50 || readouts.isBusTieEnergized ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mcbTieA ? (readouts.vDcBus1 > 50 || readouts.isBusTieEnergized ? '#10b981' : '#ef4444') : '#64748b'}
              />
              <text x="20" y="15" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCB 6A
              </text>
            </g>

            {/* Left Coupler Feed: MCB 6A Left to BUS COUPLER SWITCH (Live if MCB 6A closed & Bus 1 > 50V) */}
            <line x1="200" y1="0" x2="240" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : (state.mcbTieA && readouts.vDcBus1 > 50) ? '#10b981' : '#334155'} strokeWidth="3.5" />
            {state.mcbTieA && (readouts.vDcBus1 > 50 || readouts.isBusTieEnergized) && (
              <line x1="200" y1="0" x2="240" y2="0" stroke={readouts.isBusTieEnergized ? '#fbbf24' : '#34d399'} strokeWidth="2.5" className="power-flow-dash-right" />
            )}

            {/* MAIN BUS TIE DC MCCB 125A (BUS COUPLER SWITCH) */}
            <g
              className="cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={() => onToggleBreaker('mccbBusTie')}
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BUS_TIE)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(240, -28)"
            >
              <rect
                x="0"
                y="0"
                width="120"
                height="56"
                rx="8"
                fill={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#d97706' : '#991b1b') : '#1e293b'}
                stroke={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#fbbf24' : '#ef4444') : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#10b981' : '#64748b'}
                strokeWidth="2.5"
                className="shadow-lg"
              />
              <text x="60" y="15" fill="#ffffff" fontSize="8.5" fontWeight="black" textAnchor="middle">
                BUS COUPLER SWITCH | 125A MCCB
              </text>
              <text x="60" y="28" fill={state.mccbBusTie ? '#fef3c7' : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#34d399' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle">
                CLOSED/TIE (MANUAL/AUTO)
              </text>
              <rect
                x="20"
                y="34"
                width="80"
                height="16"
                rx="3"
                fill={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#92400e' : '#7f1d1d') : '#0f172a'}
                stroke={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#fef08a' : '#f87171') : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#10b981' : '#475569'}
                strokeWidth="1"
              />
              <text x="60" y="46" fill={state.mccbBusTie ? '#ffffff' : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#34d399' : '#f59e0b'} fontSize="8" fontWeight="black" textAnchor="middle">
                {state.mccbBusTie ? (readouts.isBusTieEnergized ? 'CLOSED / ON' : 'CLOSED (NO SOURCE)') : 'NORMALLY OFF'}
              </text>
            </g>

            {/* Right Coupler Feed: BUS COUPLER SWITCH to MCB 6A Right (Live if MCB 6B closed & Bus 2 > 50V) */}
            <line x1="360" y1="0" x2="400" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : (state.mcbTieB && readouts.vDcBus2 > 50) ? '#10b981' : '#334155'} strokeWidth="3.5" />
            {state.mcbTieB && (readouts.vDcBus2 > 50 || readouts.isBusTieEnergized) && (
              <line x1="360" y1="0" x2="400" y2="0" stroke={readouts.isBusTieEnergized ? '#fbbf24' : '#34d399'} strokeWidth="2.5" className="power-flow-dash-left" />
            )}

            {/* MCB 6A Right */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mcbTieB')} transform="translate(400, -12)">
              <rect
                x="0"
                y="0"
                width="40"
                height="24"
                rx="3"
                fill={state.mcbTieB ? (readouts.vDcBus2 > 50 || readouts.isBusTieEnergized ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mcbTieB ? (readouts.vDcBus2 > 50 || readouts.isBusTieEnergized ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="20" y="15" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCB 6A
              </text>
            </g>

            {/* Right Segment: MCB 6A Right to VBATT-2 (Live if Bus 2 > 50V) */}
            <line x1="440" y1="0" x2="600" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3.5" />
            {(readouts.vDcBus2 > 50 || readouts.isBusTieEnergized) && (
              <line x1="440" y1="0" x2="600" y2="0" stroke={readouts.isBusTieEnergized ? '#fbbf24' : '#34d399'} strokeWidth="2.5" className="power-flow-dash-left" />
            )}

            {/* Connection Node Right */}
            <circle cx="600" cy="0" r="5" fill={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} />
            <text x="600" y="-10" fill={readouts.vDcBus2 > 50 ? '#34d399' : '#f87171'} fontSize="10" fontWeight="bold" textAnchor="middle">
              VBATT-2
            </text>
          </g>


          {/* ========================================================================= */}
          {/* SECTION 4: BATTERY BANKS 1 & 2 (LEFT & RIGHT) */}
          {/* ========================================================================= */}

          {/* ========================================================================= */}
          {/* SECTION 4: BATTERY BANKS 1 & 2 (CORRECT TOPOLOGICAL ORDER) */}
          {/* Topo Flow: Battery -> Battery Isolation MCCB -> Charger Node -> Monitoring Box (BMU) -> DC Busbar */}
          {/* ========================================================================= */}

          {/* EARTH FAULT MONITORING RELAY ANSI 64 / 89G (BUSBAR 1) */}
          <g transform="translate(15, 460)">
            <rect
              x="0"
              y="0"
              width="105"
              height="44"
              rx="6"
              fill={earth1.faultState === 'DOUBLE_FAULT_TRIP' ? '#7f1d1d' : earth1.faultState !== 'NORMAL' ? '#78350f' : '#0f172a'}
              stroke={earth1.faultState === 'DOUBLE_FAULT_TRIP' ? '#ef4444' : earth1.faultState !== 'NORMAL' ? '#f59e0b' : '#38bdf8'}
              strokeWidth="2"
            />
            <text x="52" y="11" fill="#38bdf8" fontSize="7.5" fontWeight="black" textAnchor="middle">
              ANSI 64 / 89G EARTH RELAY 1
            </text>
            <text x="52" y="21" fill={earth1.faultState === 'FAULT_POS' ? '#f87171' : '#34d399'} fontSize="7" fontWeight="bold" textAnchor="middle">
              V+: {earth1.vPosToEarth > 0 ? `+${earth1.vPosToEarth}` : earth1.vPosToEarth}V | V-: {earth1.vNegToEarth}V
            </text>
            <text x="52" y="31" fill={earth1.faultState !== 'NORMAL' ? '#fbbf24' : '#94a3b8'} fontSize="6.5" fontWeight="bold" textAnchor="middle">
              {earth1.faultState === 'NORMAL' ? 'NOMINAL (FLOATING DC)' : earth1.statusText}
            </text>
            <text x="52" y="39" fill="#94a3b8" fontSize="6" textAnchor="middle">
              R_iso: {earth1.insulationKohm}kΩ | Ig: {earth1.leakageCurrentMa}mA
            </text>
          </g>

          {/* EARTH FAULT MONITORING RELAY ANSI 64 / 89G (BUSBAR 2) */}
          <g transform="translate(1075, 460)">
            <rect
              x="0"
              y="0"
              width="105"
              height="44"
              rx="6"
              fill={earth2.faultState === 'DOUBLE_FAULT_TRIP' ? '#7f1d1d' : earth2.faultState !== 'NORMAL' ? '#78350f' : '#0f172a'}
              stroke={earth2.faultState === 'DOUBLE_FAULT_TRIP' ? '#ef4444' : earth2.faultState !== 'NORMAL' ? '#f59e0b' : '#38bdf8'}
              strokeWidth="2"
            />
            <text x="52" y="11" fill="#38bdf8" fontSize="7.5" fontWeight="black" textAnchor="middle">
              ANSI 64 / 89G EARTH RELAY 2
            </text>
            <text x="52" y="21" fill={earth2.faultState === 'FAULT_POS' ? '#f87171' : '#34d399'} fontSize="7" fontWeight="bold" textAnchor="middle">
              V+: {earth2.vPosToEarth > 0 ? `+${earth2.vPosToEarth}` : earth2.vPosToEarth}V | V-: {earth2.vNegToEarth}V
            </text>
            <text x="52" y="31" fill={earth2.faultState !== 'NORMAL' ? '#fbbf24' : '#94a3b8'} fontSize="6.5" fontWeight="bold" textAnchor="middle">
              {earth2.faultState === 'NORMAL' ? 'NOMINAL (FLOATING DC)' : earth2.statusText}
            </text>
            <text x="52" y="39" fill="#94a3b8" fontSize="6" textAnchor="middle">
              R_iso: {earth2.insulationKohm}kΩ | Ig: {earth2.leakageCurrentMa}mA
            </text>
          </g>

          {/* --- BATTERY BANK 1 (LEFT) --- */}
          <g transform="translate(100, 520)">
            {/* 1. BATT-1 | 220V / 100Ah VRLA ICON & CELL STRING (AT BATTERY TERMINALS) */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BATTERY_1)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(10, 190)"
            >
              <rect x="0" y="0" width="140" height="70" rx="8" fill="#0f172a" stroke={!isBat1On || readouts.vDcBus1 <= 50 ? '#ef4444' : readouts.iBatt1 < -0.1 ? '#f59e0b' : '#10b981'} strokeWidth="2.5" />
              <text x="70" y="18" fill={!isBat1On || readouts.vDcBus1 <= 50 ? '#f87171' : readouts.iBatt1 < -0.1 ? '#f59e0b' : '#10b981'} fontSize="9" fontWeight="black" textAnchor="middle">
                BATT-1 | 220V / 100Ah VRLA
              </text>
              <text x="70" y="30" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
                VALVE REGULATED LEAD-ACID
              </text>

              {/* Battery SOC Level Bar */}
              <rect x="20" y="38" width="100" height="12" rx="3" fill="#1e293b" stroke="#334155" />
              <rect x="22" y="40" width={state.soc1 * 0.96} height="8" rx="2" fill={!isBat1On || readouts.vDcBus1 <= 50 ? '#ef4444' : readouts.iBatt1 < -0.1 ? '#f59e0b' : '#10b981'} />
              <text x="70" y="48" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                SOC: {state.soc1.toFixed(1)}% ({readouts.vBatt1.toFixed(1)}V)
              </text>
            </g>

            {/* Line from Battery Terminals up to Battery Isolator */}
            <line x1="80" y1="190" x2="80" y2="165" stroke={isBat1On ? '#10b981' : '#ef4444'} strokeWidth="3.5" />
            {isBat1On && readouts.iBatt1 > 0.1 && (
              <line x1="80" y1="190" x2="80" y2="165" stroke="#34d399" strokeWidth="2.5" className="power-flow-dash-down" />
            )}
            {isBat1On && readouts.iBatt1 < -0.1 && (
              <line x1="80" y1="190" x2="80" y2="165" stroke="#f59e0b" strokeWidth="2.5" className="power-flow-dash-up" />
            )}

            {/* 2. BATT ISOLATION MCCB 125A (SUPERVISED PROTECTION IMMEDIATELY AT BATTERY TERMINALS) */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BATTERY_BOX_1)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(10, 115)"
            >
              <rect
                x="0"
                y="0"
                width="140"
                height="50"
                rx="6"
                fill="#1e1b4b"
                stroke={state.shuntTrip1Tripped || !isBat1On ? '#ef4444' : '#6366f1'}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text x="70" y="14" fill="#a5b4fc" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                BATT ISOLATION MCCB 125A
              </text>
              <g onClick={onTripShunt1} transform="translate(10, 20)">
                <rect
                  x="0"
                  y="0"
                  width="120"
                  height="22"
                  rx="3"
                  fill={state.shuntTrip1Tripped ? '#dc2626' : !isBat1On ? '#991b1b' : '#4f46e5'}
                />
                <text x="60" y="14" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  {state.shuntTrip1Tripped ? '🚨 SHUNT TRIPPED (OFF)' : !isBat1On ? 'OFF / ISOLATED' : 'DC MCCB 125A [ST] (NORMAL)'}
                </text>
              </g>
            </g>

            {/* DC MCCB 125A BATTERY 1 ISOLATION SWITCH */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mccbBattery1_125A')} transform="translate(55, 78)">
              <rect
                x="0"
                y="0"
                width="50"
                height="28"
                rx="4"
                fill={state.mccbBattery1_125A ? (isBat1On || readouts.vDcBus1 > 50 ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mccbBattery1_125A ? (isBat1On || readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              <text x="25" y="12" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="7" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="80" y1="78" x2="80" y2="55" stroke={isBat1On ? '#10b981' : '#ef4444'} strokeWidth="3.5" />

            {/* 3. CHARGER 1A CONNECTION POINT (TEE JUNCTION DOWNSTREAM OF BATTERY ISOLATOR) */}
            <g transform="translate(80, 55)">
              <circle cx="0" cy="0" r="5" fill={isChgAOn || isBat1On ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth="1.5" />
              {/* Charger Feed In Line (Orthogonal 90° Right-Angled Routing - No Slanted Triangle) */}
              <path d="M 110 -90 L 110 0 L 0 0" fill="none" stroke={isChgAOn ? '#10b981' : '#334155'} strokeWidth="4" />
              {isChgAOn && (
                <path d="M 110 -90 L 110 0 L 0 0" fill="none" stroke="#34d399" strokeWidth="2.5" className="power-flow-dash-down" />
              )}
              <rect x="-72" y="-9" width="64" height="14" rx="3" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
              <text x="-40" y="1" fill="#34d399" fontSize="7" fontWeight="bold" textAnchor="middle">
                CHG 1A FEED NODE
              </text>
            </g>

            <line x1="80" y1="55" x2="80" y2="40" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3.5" />

            {/* 4. BATTERY MONITORING UNIT (BMU) / SHUNT TRIP */}
            <g transform="translate(5, 0)">
              <rect x="0" y="0" width="150" height="40" rx="4" fill="#0f172a" stroke={readouts.vDcBus1 > 50 ? '#38bdf8' : '#ef4444'} strokeWidth="1.5" />
              <text x="75" y="13" fill="#38bdf8" fontSize="7" fontWeight="bold" textAnchor="middle">
                BATTERY MONITORING UNIT (BMU) / SHUNT TRIP
              </text>
              <text x="75" y="24" fill="#94a3b8" fontSize="6.5" textAnchor="middle">
                SH 125A/75mV | AH METER
              </text>
              <text x="75" y="35" fill={readouts.vDcBus1 > 50 ? (readouts.iBatt1 < -0.1 ? '#f59e0b' : '#34d399') : '#f87171'} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DCCT IBATT: {readouts.iBatt1.toFixed(1)}A ({isBat1On && readouts.vDcBus1 > 50 ? readouts.statusBatt1 : 'ISOLATED'})
              </text>
            </g>

            {/* BMU SHUNT TRIP CONTROL SIGNAL WIRING (THIN DASHED) */}
            <path
              d="M 155 20 L 170 20 L 170 140 L 150 140"
              fill="none"
              stroke="#a5b4fc"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text x="173" y="80" fill="#a5b4fc" fontSize="6.5" fontWeight="bold">
              ST CONTROL
            </text>

            {/* 5. CONNECTION UP TO DC BUSBAR */}
            <line x1="80" y1="0" x2="80" y2="-35" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="4" />
            <line x1="190" y1="-35" x2="80" y2="-35" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="4" />
            {readouts.vDcBus1 > 50 && (
              <line x1="190" y1="-35" x2="80" y2="-35" stroke="#34d399" strokeWidth="2.5" className={readouts.iBatt1 < -0.1 ? "power-flow-dash-right" : "power-flow-dash-left"} />
            )}
          </g>

          {/* --- BATTERY BANK 2 (RIGHT) --- */}
          <g transform="translate(940, 520)">
            {/* 1. BATT-2 | 220V / 100Ah VRLA ICON & CELL STRING (AT BATTERY TERMINALS) */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BATTERY_2)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(-10, 190)"
            >
              <rect x="0" y="0" width="140" height="70" rx="8" fill="#0f172a" stroke={!isBat2On || readouts.vDcBus2 <= 50 ? '#ef4444' : readouts.iBatt2 < -0.1 ? '#f59e0b' : '#10b981'} strokeWidth="2.5" />
              <text x="70" y="18" fill={!isBat2On || readouts.vDcBus2 <= 50 ? '#f87171' : readouts.iBatt2 < -0.1 ? '#f59e0b' : '#10b981'} fontSize="9" fontWeight="black" textAnchor="middle">
                BATT-2 | 220V / 100Ah VRLA
              </text>
              <text x="70" y="30" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
                VALVE REGULATED LEAD-ACID
              </text>

              {/* Battery SOC Level Bar */}
              <rect x="20" y="38" width="100" height="12" rx="3" fill="#1e293b" stroke="#334155" />
              <rect x="22" y="40" width={state.soc2 * 0.96} height="8" rx="2" fill={!isBat2On || readouts.vDcBus2 <= 50 ? '#ef4444' : readouts.iBatt2 < -0.1 ? '#f59e0b' : '#10b981'} />
              <text x="70" y="48" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                SOC: {state.soc2.toFixed(1)}% ({readouts.vBatt2.toFixed(1)}V)
              </text>
            </g>

            {/* Line from Battery Terminals up to Battery Isolator */}
            <line x1="60" y1="190" x2="60" y2="165" stroke={isBat2On ? '#10b981' : '#ef4444'} strokeWidth="3.5" />
            {isBat2On && readouts.iBatt2 > 0.1 && (
              <line x1="60" y1="190" x2="60" y2="165" stroke="#34d399" strokeWidth="2.5" className="power-flow-dash-down" />
            )}
            {isBat2On && readouts.iBatt2 < -0.1 && (
              <line x1="60" y1="190" x2="60" y2="165" stroke="#f59e0b" strokeWidth="2.5" className="power-flow-dash-up" />
            )}

            {/* 2. BATT ISOLATION MCCB 125A (SUPERVISED PROTECTION IMMEDIATELY AT BATTERY TERMINALS) */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BATTERY_BOX_2)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(-10, 115)"
            >
              <rect
                x="0"
                y="0"
                width="140"
                height="50"
                rx="6"
                fill="#1e1b4b"
                stroke={state.shuntTrip2Tripped || !isBat2On ? '#ef4444' : '#6366f1'}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text x="70" y="14" fill="#a5b4fc" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                BATT ISOLATION MCCB 125A
              </text>
              <g onClick={onTripShunt2} transform="translate(10, 20)">
                <rect
                  x="0"
                  y="0"
                  width="120"
                  height="22"
                  rx="3"
                  fill={state.shuntTrip2Tripped ? '#dc2626' : !isBat2On ? '#991b1b' : '#4f46e5'}
                />
                <text x="60" y="14" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  {state.shuntTrip2Tripped ? '🚨 SHUNT TRIPPED (OFF)' : !isBat2On ? 'OFF / ISOLATED' : 'DC MCCB 125A [ST] (NORMAL)'}
                </text>
              </g>
            </g>

            {/* DC MCCB 125A BATTERY 2 ISOLATION SWITCH */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mccbBattery2_125A')} transform="translate(35, 78)">
              <rect
                x="0"
                y="0"
                width="50"
                height="28"
                rx="4"
                fill={state.mccbBattery2_125A ? (isBat2On || readouts.vDcBus2 > 50 ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mccbBattery2_125A ? (isBat2On || readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              <text x="25" y="12" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="7" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="60" y1="78" x2="60" y2="55" stroke={isBat2On ? '#10b981' : '#ef4444'} strokeWidth="3.5" />

            {/* 3. CHARGER 1B CONNECTION POINT (TEE JUNCTION DOWNSTREAM OF BATTERY ISOLATOR) */}
            <g transform="translate(60, 55)">
              <circle cx="0" cy="0" r="5" fill={isChgBOn || isBat2On ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth="1.5" />
              {/* Charger Feed In Line (Orthogonal 90° Right-Angled Routing - No Slanted Triangle) */}
              <path d="M -110 -90 L -110 0 L 0 0" fill="none" stroke={isChgBOn ? '#10b981' : '#334155'} strokeWidth="4" />
              {isChgBOn && (
                <path d="M -110 -90 L -110 0 L 0 0" fill="none" stroke="#34d399" strokeWidth="2.5" className="power-flow-dash-down" />
              )}
              <rect x="8" y="-9" width="64" height="14" rx="3" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
              <text x="40" y="1" fill="#34d399" fontSize="7" fontWeight="bold" textAnchor="middle">
                CHG 1B FEED NODE
              </text>
            </g>

            <line x1="60" y1="55" x2="60" y2="40" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3.5" />

            {/* 4. BATTERY MONITORING UNIT (BMU) / SHUNT TRIP */}
            <g transform="translate(-15, 0)">
              <rect x="0" y="0" width="150" height="40" rx="4" fill="#0f172a" stroke={readouts.vDcBus2 > 50 ? '#22d3ee' : '#ef4444'} strokeWidth="1.5" />
              <text x="75" y="13" fill="#22d3ee" fontSize="7" fontWeight="bold" textAnchor="middle">
                BATTERY MONITORING UNIT (BMU) / SHUNT TRIP
              </text>
              <text x="75" y="24" fill="#94a3b8" fontSize="6.5" textAnchor="middle">
                SH 125A/75mV | AH METER
              </text>
              <text x="75" y="35" fill={readouts.vDcBus2 > 50 ? (readouts.iBatt2 < -0.1 ? '#f59e0b' : '#34d399') : '#f87171'} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DCCT IBATT: {readouts.iBatt2.toFixed(1)}A ({isBat2On && readouts.vDcBus2 > 50 ? readouts.statusBatt2 : 'ISOLATED'})
              </text>
            </g>

            {/* BMU SHUNT TRIP CONTROL SIGNAL WIRING (THIN DASHED) */}
            <path
              d="M -15 20 L -30 20 L -30 140 L -10 140"
              fill="none"
              stroke="#a5b4fc"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text x="-70" y="80" fill="#a5b4fc" fontSize="6.5" fontWeight="bold">
              ST CONTROL
            </text>

            {/* 5. CONNECTION UP TO DC BUSBAR */}
            <line x1="60" y1="0" x2="60" y2="-35" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="4" />
            <line x1="-50" y1="-35" x2="60" y2="-35" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="4" />
            {readouts.vDcBus2 > 50 && (
              <line x1="-50" y1="-35" x2="60" y2="-35" stroke="#34d399" strokeWidth="2.5" className={readouts.iBatt2 < -0.1 ? "power-flow-dash-left" : "power-flow-dash-right"} />
            )}
          </g>

          {/* ========================================================================= */}
          {/* SECTION 5: DC DISTRIBUTION BOARD OUTGOINGS (BOTTOM LEFT & RIGHT) */}
          {/* ========================================================================= */}

          {/* --- OUTGOING 1: TO DCDB 1 (LEFT BOTTOM) --- */}
          <g transform="translate(290, 485)">
            <line x1="0" y1="0" x2="0" y2="300" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {readouts.vDcBus1 > 50 && (
              <line x1="0" y1="0" x2="0" y2="300" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* BLOCKING DIODE MR 150A / DH1350 */}
            <g transform="translate(-15, 230)">
              <polygon points="0,0 30,0 15,25" fill={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} />
              <line x1="0" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">
                MR 150A
              </text>
            </g>

            {/* DC MCCB 125A TO DCDB 1 (IEC 60617 Symbol) */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mccbDcdb1')} transform="translate(-25, 280)">
              <rect
                x="0"
                y="0"
                width="50"
                height="28"
                rx="4"
                fill={state.mccbDcdb1 ? (readouts.vDcBus1 > 50 ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mccbDcdb1 ? (readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              <text x="25" y="12" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="7" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="0" y1="308" x2="0" y2="340" stroke={state.mccbDcdb1 && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {state.mccbDcdb1 && readouts.vDcBus1 > 50 && (
              <line x1="0" y1="308" x2="0" y2="340" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* DCCT 100A & VLOAD METER */}
            <rect x="-60" y="340" width="120" height="35" rx="4" fill="#0f172a" stroke="#334155" />
            <text x="0" y="354" fill="#94a3b8" fontSize="8" textAnchor="middle">
              100A DCCT ILOAD | VLOAD
            </text>
            <text x="0" y="367" fill={readouts.vDcBus1 > 50 ? '#34d399' : '#f87171'} fontSize="9" fontWeight="bold" textAnchor="middle">
              {readouts.iDcBus1.toFixed(1)}A @ {readouts.vDcBus1.toFixed(1)}V
            </text>

            <line x1="0" y1="375" x2="0" y2="400" stroke={state.mccbDcdb1 && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {state.mccbDcdb1 && readouts.vDcBus1 > 50 && (
              <line x1="0" y1="375" x2="0" y2="400" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* TO DCDB 1 TERMINAL OUTLET */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.DCDB_1)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(-50, 400)"
            >
              <rect x="0" y="0" width="100" height="30" rx="6" fill="#1e293b" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="2" />
              <text x="50" y="19" fill={readouts.vDcBus1 > 50 ? '#34d399' : '#f87171'} fontSize="10" fontWeight="black" textAnchor="middle">
                {readouts.vDcBus1 > 50 ? 'TO DCDB 1' : 'DCDB 1 (OFF)'}
              </text>
            </g>

            {/* --- DOWNSTREAM DCDB 1 DISTRIBUTION BUSBAR & OUTGOING LOADS --- */}
            <line x1="0" y1="430" x2="0" y2="470" stroke={state.mccbDcdb1 ? '#10b981' : '#334155'} strokeWidth="3" />
            {state.mccbDcdb1 && !faults?.load1Trip && (
              <line x1="0" y1="430" x2="0" y2="470" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* DCDB 1 HORIZONTAL COPPER BUSBAR */}
            <g transform="translate(-140, 470)">
              <rect
                x="0"
                y="0"
                width="280"
                height="10"
                rx="3"
                fill={faults?.load1Trip ? '#dc2626' : state.mccbDcdb1 ? '#10b981' : '#334155'}
                stroke={faults?.load1Trip ? '#ef4444' : '#34d399'}
                strokeWidth="2"
              />
              <text x="140" y="-4" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle">
                220V DC DB-1 DISTRIBUTION BUSBAR
              </text>
            </g>

            {/* --- INTER-DCDB BUS COUPLER SWITCH (NORMALLY OFF / OPEN) --- */}
            <g transform="translate(110, 475)">
              <line x1="0" y1="0" x2="80" y2="0" stroke={state.dcdbBusCoupler ? '#f59e0b' : (state.mccbDcdb1 && readouts.vDcBus1 > 50) ? '#10b981' : '#334155'} strokeWidth="3.5" />
              {(state.dcdbBusCoupler || (state.mccbDcdb1 && readouts.vDcBus1 > 50)) && (
                <line x1="0" y1="0" x2="80" y2="0" stroke={state.dcdbBusCoupler ? '#fbbf24' : '#34d399'} strokeWidth="2.5" className="power-flow-dash-right" />
              )}

              {/* BUS COUPLER SWITCH CONTROL BOX */}
              <g className="cursor-pointer transition-all duration-200" onClick={() => onToggleBreaker('dcdbBusCoupler')} transform="translate(80, -28)">
                <rect
                  x="0"
                  y="0"
                  width="180"
                  height="56"
                  rx="8"
                  fill={state.dcdbBusCoupler ? '#d97706' : '#1e293b'}
                  stroke={state.dcdbBusCoupler ? '#fbbf24' : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#10b981' : '#64748b'}
                  strokeWidth="2.5"
                  className="shadow-lg"
                />
                <text x="90" y="16" fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle">
                  BUS COUPLER SWITCH
                </text>
                <text x="90" y="30" fill={state.dcdbBusCoupler ? '#fef3c7' : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#34d399' : '#94a3b8'} fontSize="9" fontWeight="bold" textAnchor="middle">
                  DCDB INTER-BUS COUPLER LINK
                </text>
                <rect
                  x="30"
                  y="35"
                  width="120"
                  height="16"
                  rx="3"
                  fill={state.dcdbBusCoupler ? '#92400e' : '#0f172a'}
                  stroke={state.dcdbBusCoupler ? '#fef08a' : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#10b981' : '#475569'}
                  strokeWidth="1"
                />
                <text x="90" y="47" fill={state.dcdbBusCoupler ? '#ffffff' : (readouts.vDcBus1 > 50 || readouts.vDcBus2 > 50) ? '#34d399' : '#f59e0b'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {state.dcdbBusCoupler ? 'CLOSED / ON (INTERCONNECTED)' : 'NORMALLY OFF / ISOLATED'}
                </text>
              </g>

              <line x1="260" y1="0" x2="340" y2="0" stroke={state.dcdbBusCoupler ? '#f59e0b' : (state.mccbDcdb2 && readouts.vDcBus2 > 50) ? '#10b981' : '#334155'} strokeWidth="3.5" />
              {(state.dcdbBusCoupler || (state.mccbDcdb2 && readouts.vDcBus2 > 50)) && (
                <line x1="260" y1="0" x2="340" y2="0" stroke={state.dcdbBusCoupler ? '#fbbf24' : '#34d399'} strokeWidth="2.5" className="power-flow-dash-left" />
              )}
            </g>

            {/* DOWNSTREAM FEEDER 1: PROTECTION RELAYS */}
            <g transform="translate(-90, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb1Feeder1 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('dcdb1Feeder1')}>
                <rect x="-24" y="25" width="48" height="20" rx="3" fill={state.dcdb1Feeder1 && !faults?.load1Trip && readouts.vDcBus1 > 50 ? '#059669' : '#1e293b'} stroke={state.dcdb1Feeder1 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC MCB 32A</text>
              </g>
              <line x1="0" y1="45" x2="0" y2="65" stroke={state.dcdb1Feeder1 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g transform="translate(-45, 65)">
                <rect
                  x="0"
                  y="0"
                  width="90"
                  height="45"
                  rx="6"
                  fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#7f1d1d' : state.dcdb1Feeder1 && state.mccbDcdb1 ? '#0f172a' : '#1e293b'}
                  stroke={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#ef4444' : state.dcdb1Feeder1 && state.mccbDcdb1 ? '#10b981' : '#475569'}
                  strokeWidth={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '2.5' : '1.5'}
                  className={faults?.load1Trip || readouts.vDcBus1 <= 50 ? 'animate-pulse' : ''}
                />
                <text x="45" y="14" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#f87171' : '#e2e8f0'} fontSize="8" fontWeight="bold" textAnchor="middle">
                  PROTECTION RELAYS
                </text>
                <text x="45" y="26" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#fca5a5' : '#94a3b8'} fontSize="7" textAnchor="middle">
                  & TRIP CIRCUIT
                </text>
                <text x="45" y="38" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#ef4444' : '#34d399'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {faults?.load1Trip ? '🚨 TRIPPED' : readouts.vDcBus1 <= 50 ? '0 kW (OFF)' : state.dcdb1Feeder1 && state.mccbDcdb1 ? '2.5 kW ON' : 'OFF'}
                </text>
              </g>
            </g>

            {/* DOWNSTREAM FEEDER 2: CONTROL & ANNUNCIATOR */}
            <g transform="translate(0, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb1Feeder2 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('dcdb1Feeder2')}>
                <rect x="-24" y="25" width="48" height="20" rx="3" fill={state.dcdb1Feeder2 && !faults?.load1Trip && readouts.vDcBus1 > 50 ? '#059669' : '#1e293b'} stroke={state.dcdb1Feeder2 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC MCB 32A</text>
              </g>
              <line x1="0" y1="45" x2="0" y2="65" stroke={state.dcdb1Feeder2 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g transform="translate(-45, 65)">
                <rect
                  x="0"
                  y="0"
                  width="90"
                  height="45"
                  rx="6"
                  fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#7f1d1d' : state.dcdb1Feeder2 && state.mccbDcdb1 ? '#0f172a' : '#1e293b'}
                  stroke={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#ef4444' : state.dcdb1Feeder2 && state.mccbDcdb1 ? '#10b981' : '#475569'}
                  strokeWidth={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '2.5' : '1.5'}
                  className={faults?.load1Trip || readouts.vDcBus1 <= 50 ? 'animate-pulse' : ''}
                />
                <text x="45" y="14" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#f87171' : '#e2e8f0'} fontSize="8" fontWeight="bold" textAnchor="middle">
                  CONTROL & SCADA
                </text>
                <text x="45" y="26" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#fca5a5' : '#94a3b8'} fontSize="7" textAnchor="middle">
                  ANNUNCIATOR PANEL
                </text>
                <text x="45" y="38" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#ef4444' : '#34d399'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {faults?.load1Trip ? '🚨 TRIPPED' : readouts.vDcBus1 <= 50 ? '0 kW (OFF)' : state.dcdb1Feeder2 && state.mccbDcdb1 ? '1.8 kW ON' : 'OFF'}
                </text>
              </g>
            </g>

            {/* DOWNSTREAM FEEDER 3: EMERGENCY LIGHTING */}
            <g transform="translate(90, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb1Feeder3 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('dcdb1Feeder3')}>
                <rect x="-24" y="25" width="48" height="20" rx="3" fill={state.dcdb1Feeder3 && !faults?.load1Trip && readouts.vDcBus1 > 50 ? '#059669' : '#1e293b'} stroke={state.dcdb1Feeder3 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC MCB 16A</text>
              </g>
              <line x1="0" y1="45" x2="0" y2="65" stroke={state.dcdb1Feeder3 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g transform="translate(-45, 65)">
                <rect
                  x="0"
                  y="0"
                  width="90"
                  height="45"
                  rx="6"
                  fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#7f1d1d' : state.dcdb1Feeder3 && state.mccbDcdb1 ? '#0f172a' : '#1e293b'}
                  stroke={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#ef4444' : state.dcdb1Feeder3 && state.mccbDcdb1 ? '#10b981' : '#475569'}
                  strokeWidth={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '2.5' : '1.5'}
                  className={faults?.load1Trip || readouts.vDcBus1 <= 50 ? 'animate-pulse' : ''}
                />
                <text x="45" y="14" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#f87171' : '#e2e8f0'} fontSize="8" fontWeight="bold" textAnchor="middle">
                  EMERGENCY DC
                </text>
                <text x="45" y="26" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#fca5a5' : '#94a3b8'} fontSize="7" textAnchor="middle">
                  SUBSTATION LIGHTING
                </text>
                <text x="45" y="38" fill={faults?.load1Trip || readouts.vDcBus1 <= 50 ? '#ef4444' : '#34d399'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {faults?.load1Trip ? '🚨 TRIPPED' : readouts.vDcBus1 <= 50 ? '0 kW (OFF)' : state.dcdb1Feeder3 && state.mccbDcdb1 ? '1.2 kW ON' : 'OFF'}
                </text>
              </g>
            </g>

            {/* CRITICAL ALARM OVERLAY FOR DCDB 1 (FAULTS OR BLACKOUT) */}
            {(faults?.load1Trip || readouts.vDcBus1 <= 50) && (
              <g transform="translate(-135, 495)">
                <rect x="0" y="0" width="270" height="95" rx="10" fill="#991b1b" stroke="#f87171" strokeWidth="3" className="animate-pulse shadow-2xl" />
                <text x="135" y="26" fill="#ffffff" fontSize="12" fontWeight="black" textAnchor="middle">
                  🚨 CRITICAL ALARM 🚨
                </text>
                <text x="135" y="48" fill="#fef08a" fontSize="13" fontWeight="black" textAnchor="middle">
                  {readouts.vDcBus1 <= 50 ? 'DC BUS 1 TOTAL BLACKOUT (0V)!' : 'DCDB 1 LOAD TRIPPED!'}
                </text>
                <text x="135" y="70" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                  {readouts.vDcBus1 <= 50 ? 'CHARGER 1A & BATTERY 1 ISOLATED/OFF' : 'SHORT CIRCUIT / OVERLOAD FAULT'}
                </text>
                <text x="135" y="86" fill="#fca5a5" fontSize="9" fontWeight="extrabold" textAnchor="middle">
                  {readouts.vDcBus1 <= 50 ? 'TOTAL LOAD DROPPED TO 0.0 kW' : 'FEEDERS ISOLATED'}
                </text>
              </g>
            )}
          </g>

          {/* --- OUTGOING 2: TO DCDB 2 (RIGHT BOTTOM) --- */}
          <g transform="translate(890, 485)">
            <line x1="0" y1="0" x2="0" y2="300" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {readouts.vDcBus2 > 50 && (
              <line x1="0" y1="0" x2="0" y2="300" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* BLOCKING DIODE MR 150A / DH1350 */}
            <g transform="translate(-15, 230)">
              <polygon points="0,0 30,0 15,25" fill={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} />
              <line x1="0" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">
                MR 150A
              </text>
            </g>

            {/* DC MCCB 125A TO DCDB 2 (IEC 60617 Symbol) */}
            <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('mccbDcdb2')} transform="translate(-25, 280)">
              <rect
                x="0"
                y="0"
                width="50"
                height="28"
                rx="4"
                fill={state.mccbDcdb2 ? (readouts.vDcBus2 > 50 ? '#064e3b' : '#dc2626') : '#1e293b'}
                stroke={state.mccbDcdb2 ? (readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              <text x="25" y="12" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                DC MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="7" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="0" y1="306" x2="0" y2="340" stroke={state.mccbDcdb2 && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {state.mccbDcdb2 && readouts.vDcBus2 > 50 && (
              <line x1="0" y1="306" x2="0" y2="340" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* DCCT 100A & VLOAD METER */}
            <rect x="-60" y="340" width="120" height="35" rx="4" fill="#0f172a" stroke={readouts.vDcBus2 <= 50 ? '#ef4444' : '#334155'} />
            <text x="0" y="354" fill="#94a3b8" fontSize="8" textAnchor="middle">
              100A DCCT ILOAD | VLOAD
            </text>
            <text x="0" y="367" fill={readouts.vDcBus2 <= 50 ? '#ef4444' : '#34d399'} fontSize="9" fontWeight="bold" textAnchor="middle">
              {readouts.iDcBus2.toFixed(1)}A @ {readouts.vDcBus2.toFixed(1)}V
            </text>

            <line x1="0" y1="375" x2="0" y2="400" stroke={state.mccbDcdb2 && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {state.mccbDcdb2 && readouts.vDcBus2 > 50 && (
              <line x1="0" y1="375" x2="0" y2="400" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* TO DCDB 2 TERMINAL OUTLET */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.DCDB_2)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(-50, 400)"
            >
              <rect x="0" y="0" width="100" height="30" rx="6" fill="#1e293b" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="2" />
              <text x="50" y="19" fill={readouts.vDcBus2 > 50 ? '#34d399' : '#f87171'} fontSize="10" fontWeight="black" textAnchor="middle">
                {readouts.vDcBus2 > 50 ? 'TO DCDB 2' : 'DCDB 2 (OFF)'}
              </text>
            </g>

            {/* --- DOWNSTREAM DCDB 2 DISTRIBUTION BUSBAR & OUTGOING LOADS --- */}
            <line x1="0" y1="430" x2="0" y2="470" stroke={state.mccbDcdb2 && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip && (
              <line x1="0" y1="430" x2="0" y2="470" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* DCDB 2 HORIZONTAL COPPER BUSBAR */}
            <g transform="translate(-140, 470)">
              <rect
                x="0"
                y="0"
                width="280"
                height="10"
                rx="3"
                fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#dc2626' : state.mccbDcdb2 ? '#10b981' : '#334155'}
                stroke={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : '#34d399'}
                strokeWidth="2"
              />
              <text x="140" y="-4" fill={readouts.vDcBus2 <= 50 ? '#f87171' : '#34d399'} fontSize="9" fontWeight="bold" textAnchor="middle">
                220V DC DB-2 DISTRIBUTION BUSBAR {readouts.vDcBus2 <= 50 ? '(DE-ENERGIZED)' : ''}
              </text>
            </g>

            {/* DOWNSTREAM FEEDER 1: INVERTER SYSTEM FEED */}
            <g transform="translate(-90, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb2Feeder1 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('dcdb2Feeder1')}>
                <rect x="-24" y="25" width="48" height="20" rx="3" fill={state.dcdb2Feeder1 && !faults?.load2Trip && readouts.vDcBus2 > 50 ? '#059669' : '#1e293b'} stroke={state.dcdb2Feeder1 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC MCB 63A</text>
              </g>
              <line x1="0" y1="45" x2="0" y2="65" stroke={state.dcdb2Feeder1 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g transform="translate(-45, 65)">
                <rect
                  x="0"
                  y="0"
                  width="90"
                  height="45"
                  rx="6"
                  fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#7f1d1d' : state.dcdb2Feeder1 && state.mccbDcdb2 ? '#0f172a' : '#1e293b'}
                  stroke={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : state.dcdb2Feeder1 && state.mccbDcdb2 ? '#10b981' : '#475569'}
                  strokeWidth={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '2.5' : '1.5'}
                  className={faults?.load2Trip || readouts.vDcBus2 <= 50 ? 'animate-pulse' : ''}
                />
                <text x="45" y="14" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#f87171' : '#e2e8f0'} fontSize="8" fontWeight="bold" textAnchor="middle">
                  INVERTER SYSTEM
                </text>
                <text x="45" y="26" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#fca5a5' : '#94a3b8'} fontSize="7" textAnchor="middle">
                  FEEDER A (220VDC)
                </text>
                <text x="45" y="38" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : '#34d399'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {faults?.load2Trip ? '🚨 TRIPPED' : readouts.vDcBus2 <= 50 ? '0 kW (OFF)' : state.dcdb2Feeder1 && state.mccbDcdb2 ? '2.8 kW ON' : 'OFF'}
                </text>
              </g>
            </g>

            {/* DOWNSTREAM FEEDER 2: EMERGENCY OIL PUMP */}
            <g transform="translate(0, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb2Feeder2 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('dcdb2Feeder2')}>
                <rect x="-24" y="25" width="48" height="20" rx="3" fill={state.dcdb2Feeder2 && !faults?.load2Trip && readouts.vDcBus2 > 50 ? '#059669' : '#1e293b'} stroke={state.dcdb2Feeder2 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC MCB 40A</text>
              </g>
              <line x1="0" y1="45" x2="0" y2="65" stroke={state.dcdb2Feeder2 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g transform="translate(-45, 65)">
                <rect
                  x="0"
                  y="0"
                  width="90"
                  height="45"
                  rx="6"
                  fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#7f1d1d' : state.dcdb2Feeder2 && state.mccbDcdb2 ? '#0f172a' : '#1e293b'}
                  stroke={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : state.dcdb2Feeder2 && state.mccbDcdb2 ? '#10b981' : '#475569'}
                  strokeWidth={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '2.5' : '1.5'}
                  className={faults?.load2Trip || readouts.vDcBus2 <= 50 ? 'animate-pulse' : ''}
                />
                <text x="45" y="14" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#f87171' : '#e2e8f0'} fontSize="8" fontWeight="bold" textAnchor="middle">
                  TURBINE/GEN EOP
                </text>
                <text x="45" y="26" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#fca5a5' : '#94a3b8'} fontSize="7" textAnchor="middle">
                  EMERGENCY OIL PUMP
                </text>
                <text x="45" y="38" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : '#34d399'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {faults?.load2Trip ? '🚨 TRIPPED' : readouts.vDcBus2 <= 50 ? '0 kW (OFF)' : state.dcdb2Feeder2 && state.mccbDcdb2 ? '1.7 kW ON' : 'OFF'}
                </text>
              </g>
            </g>

            {/* DOWNSTREAM FEEDER 3: HV BREAKER MOTORS */}
            <g transform="translate(90, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb2Feeder3 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer transition-transform hover:scale-105" onClick={() => onToggleBreaker('dcdb2Feeder3')}>
                <rect x="-24" y="25" width="48" height="20" rx="3" fill={state.dcdb2Feeder3 && !faults?.load2Trip && readouts.vDcBus2 > 50 ? '#059669' : '#1e293b'} stroke={state.dcdb2Feeder3 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC MCB 32A</text>
              </g>
              <line x1="0" y1="45" x2="0" y2="65" stroke={state.dcdb2Feeder3 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g transform="translate(-45, 65)">
                <rect
                  x="0"
                  y="0"
                  width="90"
                  height="45"
                  rx="6"
                  fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#7f1d1d' : state.dcdb2Feeder3 && state.mccbDcdb2 ? '#0f172a' : '#1e293b'}
                  stroke={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : state.dcdb2Feeder3 && state.mccbDcdb2 ? '#10b981' : '#475569'}
                  strokeWidth={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '2.5' : '1.5'}
                  className={faults?.load2Trip || readouts.vDcBus2 <= 50 ? 'animate-pulse' : ''}
                />
                <text x="45" y="14" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#f87171' : '#e2e8f0'} fontSize="8" fontWeight="bold" textAnchor="middle">
                  HV SWITCHGEAR
                </text>
                <text x="45" y="26" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#fca5a5' : '#94a3b8'} fontSize="7" textAnchor="middle">
                  BREAKER MOTORS
                </text>
                <text x="45" y="38" fill={faults?.load2Trip || readouts.vDcBus2 <= 50 ? '#ef4444' : '#34d399'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {faults?.load2Trip ? '🚨 TRIPPED' : readouts.vDcBus2 <= 50 ? '0 kW (OFF)' : state.dcdb2Feeder3 && state.mccbDcdb2 ? '1.0 kW ON' : 'OFF'}
                </text>
              </g>
            </g>

            {/* CRITICAL ALARM OVERLAY FOR DCDB 2 (FAULTS OR BLACKOUT) */}
            {(faults?.load2Trip || readouts.vDcBus2 <= 50) && (
              <g transform="translate(-135, 495)">
                <rect x="0" y="0" width="270" height="95" rx="10" fill="#991b1b" stroke="#f87171" strokeWidth="3" className="animate-pulse shadow-2xl" />
                <text x="135" y="26" fill="#ffffff" fontSize="12" fontWeight="black" textAnchor="middle">
                  🚨 CRITICAL ALARM 🚨
                </text>
                <text x="135" y="48" fill="#fef08a" fontSize="13" fontWeight="black" textAnchor="middle">
                  {readouts.vDcBus2 <= 50 ? 'DC BUS 2 TOTAL BLACKOUT (0V)!' : 'DCDB 2 LOAD TRIPPED!'}
                </text>
                <text x="135" y="70" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                  {readouts.vDcBus2 <= 50 ? 'CHARGER 1B & BATTERY 2 ISOLATED/OFF' : 'SHORT CIRCUIT / OVERLOAD FAULT'}
                </text>
                <text x="135" y="86" fill="#fca5a5" fontSize="9" fontWeight="extrabold" textAnchor="middle">
                  {readouts.vDcBus2 <= 50 ? 'TOTAL LOAD DROPPED TO 0.0 kW' : 'FEEDERS ISOLATED'}
                </text>
              </g>
            )}
          </g>

          {/* BOTTOM UNGROUNDED DC SYSTEM SAFETY NOTE */}
          <g transform="translate(300, 1140)">
            <rect x="0" y="0" width="600" height="22" rx="4" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
            <text x="300" y="15" fill="#fde047" fontSize="9" fontWeight="black" textAnchor="middle">
              NOTE: DC SYSTEM IS UNGROUNDED. FIT EARTH FAULT MONITORING RELAY.
            </text>
          </g>
        </svg>
      </div>

      {/* HOVER TOOLTIP CARD */}
      {hoveredItem && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-emerald-500/60 rounded-xl p-3 shadow-2xl backdrop-blur text-xs flex flex-col gap-1 z-30">
          <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-700 pb-1">
            <span>{hoveredItem.name}</span>
            <span className="text-[10px] text-amber-300 font-mono">{hoveredItem.standard}</span>
          </div>
          <div className="text-slate-300 font-semibold">{hoveredItem.rating}</div>
          <div className="text-slate-400 text-[11px]">{hoveredItem.description}</div>
        </div>
      )}

      {/* DEVICE INSPECTION & ACTION MODAL */}
      {selectedDeviceKey && (() => {
        const info = DUAL_SLD_TOOLTIPS[selectedDeviceKey] || { name: selectedDeviceKey, rating: 'Standard Substation Component', standard: 'IEC/IEEE', description: 'Dual Redundant Charger Component' };
        
        // Interlock status checks
        const isChgABlockedByAc = selectedDeviceKey.includes('A') && !state.acSupplyAOnline;
        const isChgBBlockedByAc = selectedDeviceKey.includes('B') && !state.acSupplyBOnline;
        const isBat1BlockedByShunt = selectedDeviceKey.includes('1') && state.shuntTrip1Tripped;
        const isBat2BlockedByShunt = selectedDeviceKey.includes('2') && state.shuntTrip2Tripped;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-emerald-500/80 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 font-mono text-xs text-slate-200 select-none">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    ⚡
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{info.name}</h3>
                    <p className="text-[11px] text-amber-400">{info.standard} • {info.rating}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDeviceKey(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* LIVE TELEMETRY & DEVICE STATUS BADGES */}
              <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-2 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">OPERATIONAL STATUS:</span>
                  <div className="flex items-center gap-1.5">
                    {selectedDeviceKey === 'AC_INCOMER_A' && (
                      <span className={`px-2 py-0.5 rounded font-bold ${state.acSupplyAOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                        {state.acSupplyAOnline ? '⚡ ONLINE (415V)' : '🔴 OFFLINE (0V)'}
                      </span>
                    )}
                    {selectedDeviceKey === 'AC_INCOMER_B' && (
                      <span className={`px-2 py-0.5 rounded font-bold ${state.acSupplyBOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                        {state.acSupplyBOnline ? '⚡ ONLINE (415V)' : '🔴 OFFLINE (0V)'}
                      </span>
                    )}
                    {(selectedDeviceKey === 'MODULE_1A' || selectedDeviceKey === 'CONTROLLER_A') && (
                      <span className={`px-2 py-0.5 rounded font-bold ${readouts.vChargerA > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {readouts.vChargerA > 0 ? `RUNNING (${state.modeA})` : 'STANDBY / OFF'}
                      </span>
                    )}
                    {(selectedDeviceKey === 'MODULE_1B' || selectedDeviceKey === 'CONTROLLER_B') && (
                      <span className={`px-2 py-0.5 rounded font-bold ${readouts.vChargerB > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {readouts.vChargerB > 0 ? `RUNNING (${state.modeB})` : 'STANDBY / OFF'}
                      </span>
                    )}
                    {selectedDeviceKey === 'BUS_TIE' && (
                      <span className={`px-2 py-0.5 rounded font-bold ${state.mccbBusTie ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-400'}`}>
                        {state.mccbBusTie ? '🔒 INTERCONNECTED' : '🔓 OPEN (NORMAL)'}
                      </span>
                    )}
                    {(selectedDeviceKey === 'BATTERY_1' || selectedDeviceKey === 'BATTERY_BOX_1') && (
                      <span className={`px-2 py-0.5 rounded font-bold ${state.shuntTrip1Tripped ? 'bg-rose-950 text-rose-400 border border-rose-800' : state.mccbBattery1_160A ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400'}`}>
                        {state.shuntTrip1Tripped ? '🚨 SHUNT TRIPPED' : state.mccbBattery1_160A ? '⚡ ONLINE' : 'OFFLINE'}
                      </span>
                    )}
                    {(selectedDeviceKey === 'BATTERY_2' || selectedDeviceKey === 'BATTERY_BOX_2') && (
                      <span className={`px-2 py-0.5 rounded font-bold ${state.shuntTrip2Tripped ? 'bg-rose-950 text-rose-400 border border-rose-800' : state.mccbBattery2_160A ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400'}`}>
                        {state.shuntTrip2Tripped ? '🚨 SHUNT TRIPPED' : state.mccbBattery2_160A ? '⚡ ONLINE' : 'OFFLINE'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 border-t border-slate-800 pt-2">
                  <div>BUS 1 VOLTAGE: <strong className="text-emerald-400">{readouts.vDcBus1.toFixed(1)}V</strong></div>
                  <div>BUS 2 VOLTAGE: <strong className="text-emerald-400">{readouts.vDcBus2.toFixed(1)}V</strong></div>
                  <div>BATTERY 1 SOC: <strong className="text-amber-400">{Math.round(state.soc1)}%</strong></div>
                  <div>BATTERY 2 SOC: <strong className="text-amber-400">{Math.round(state.soc2)}%</strong></div>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {info.description}
              </p>

              {/* ACTION BUTTONS BASED ON DEVICE & INTERLOCK WARNINGS */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#1e293b]">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Available Device Operations:
                </span>

                <div className="flex flex-wrap gap-2">
                  {selectedDeviceKey === 'AC_INCOMER_A' && (
                    <button
                      onClick={() => { onToggleBreaker('acSupplyAOnline'); setSelectedDeviceKey(null); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        state.acSupplyAOnline ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {state.acSupplyAOnline ? '🛑 Open AC Incomer A' : '⚡ Close AC Incomer A'}
                    </button>
                  )}

                  {selectedDeviceKey === 'AC_INCOMER_B' && (
                    <button
                      onClick={() => { onToggleBreaker('acSupplyBOnline'); setSelectedDeviceKey(null); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        state.acSupplyBOnline ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {state.acSupplyBOnline ? '🛑 Open AC Incomer B' : '⚡ Close AC Incomer B'}
                    </button>
                  )}

                  {(selectedDeviceKey === 'MODULE_1A' || selectedDeviceKey === 'CONTROLLER_A') && (
                    <>
                      {isChgABlockedByAc && !state.mccbChargerA ? (
                        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-sans">
                          ⚠️ <strong>Action Unavailable:</strong> AC Supply A is offline (0V). Close AC Incomer A breaker first before starting Charger 1A.
                        </div>
                      ) : (
                        <button
                          onClick={() => { onToggleBreaker('mccbChargerA'); setSelectedDeviceKey(null); }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            state.mccbChargerA ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {state.mccbChargerA ? '🛑 Open Charger 1A MCCB' : '⚡ Close Charger 1A MCCB'}
                        </button>
                      )}
                      <button
                        onClick={() => { onToggleModeA(); setSelectedDeviceKey(null); }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all cursor-pointer"
                      >
                        🔄 Toggle Mode ({state.modeA})
                      </button>
                    </>
                  )}

                  {(selectedDeviceKey === 'MODULE_1B' || selectedDeviceKey === 'CONTROLLER_B') && (
                    <>
                      {isChgBBlockedByAc && !state.mccbChargerB ? (
                        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-sans">
                          ⚠️ <strong>Action Unavailable:</strong> AC Supply B is offline (0V). Close AC Incomer B breaker first before starting Charger 1B.
                        </div>
                      ) : (
                        <button
                          onClick={() => { onToggleBreaker('mccbChargerB'); setSelectedDeviceKey(null); }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            state.mccbChargerB ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {state.mccbChargerB ? '🛑 Open Charger 1B MCCB' : '⚡ Close Charger 1B MCCB'}
                        </button>
                      )}
                      <button
                        onClick={() => { onToggleModeB(); setSelectedDeviceKey(null); }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all cursor-pointer"
                      >
                        🔄 Toggle Mode ({state.modeB})
                      </button>
                    </>
                  )}

                  {selectedDeviceKey === 'BUS_TIE' && (
                    <button
                      onClick={() => { onToggleBreaker('mccbBusTie'); setSelectedDeviceKey(null); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        state.mccbBusTie ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {state.mccbBusTie ? '🔓 Open DC Bus Tie Breaker' : '🔒 Close DC Bus Tie Breaker'}
                    </button>
                  )}

                  {(selectedDeviceKey === 'BATTERY_1' || selectedDeviceKey === 'BATTERY_BOX_1') && (
                    <>
                      {isBat1BlockedByShunt && !state.mccbBattery1_160A ? (
                        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-sans">
                          ⚠️ <strong>Action Unavailable:</strong> Battery 1 Shunt Trip Relay is active. Reset Shunt Trip first before closing MCCB.
                        </div>
                      ) : (
                        <button
                          onClick={() => { onToggleBreaker('mccbBattery1_160A'); setSelectedDeviceKey(null); }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            state.mccbBattery1_160A ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {state.mccbBattery1_160A ? '🛑 Open Battery 1 MCCB' : '⚡ Close Battery 1 MCCB'}
                        </button>
                      )}
                      <button
                        onClick={() => { onTripShunt1(); setSelectedDeviceKey(null); }}
                        className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold font-mono transition-all cursor-pointer"
                      >
                        {state.shuntTrip1Tripped ? '🔄 Reset Shunt Trip 1' : '🚨 Trip Shunt Coil 1'}
                      </button>
                    </>
                  )}

                  {(selectedDeviceKey === 'BATTERY_2' || selectedDeviceKey === 'BATTERY_BOX_2') && (
                    <>
                      {isBat2BlockedByShunt && !state.mccbBattery2_160A ? (
                        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-sans">
                          ⚠️ <strong>Action Unavailable:</strong> Battery 2 Shunt Trip Relay is active. Reset Shunt Trip first before closing MCCB.
                        </div>
                      ) : (
                        <button
                          onClick={() => { onToggleBreaker('mccbBattery2_160A'); setSelectedDeviceKey(null); }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            state.mccbBattery2_160A ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {state.mccbBattery2_160A ? '🛑 Open Battery 2 MCCB' : '⚡ Close Battery 2 MCCB'}
                        </button>
                      )}
                      <button
                        onClick={() => { onTripShunt2(); setSelectedDeviceKey(null); }}
                        className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold font-mono transition-all cursor-pointer"
                      >
                        {state.shuntTrip2Tripped ? '🔄 Reset Shunt Trip 2' : '🚨 Trip Shunt Coil 2'}
                      </button>
                    </>
                  )}

                  {selectedDeviceKey === 'DCDB_1' && (
                    <div className="w-full flex flex-col gap-3">
                      <button
                        onClick={() => { onToggleBreaker('mccbDcdb1'); setSelectedDeviceKey(null); }}
                        className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          state.mccbDcdb1 ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {state.mccbDcdb1 ? '🛑 Open DCDB 1 Feeder Breaker' : '⚡ Close DCDB 1 Feeder Breaker'}
                      </button>

                      {onSetLoad1 && (
                        <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 font-mono">
                          <div className="flex justify-between text-xs text-slate-300">
                            <span>DCDB 1 Station Load Demand:</span>
                            <span className="text-emerald-400 font-bold">{state.loadKw1.toFixed(1)} kW</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="15"
                            step="0.5"
                            value={state.loadKw1}
                            onChange={(e) => onSetLoad1(parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDeviceKey === 'DCDB_2' && (
                    <div className="w-full flex flex-col gap-3">
                      <button
                        onClick={() => { onToggleBreaker('mccbDcdb2'); setSelectedDeviceKey(null); }}
                        className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          state.mccbDcdb2 ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {state.mccbDcdb2 ? '🛑 Open DCDB 2 Feeder Breaker' : '⚡ Close DCDB 2 Feeder Breaker'}
                      </button>

                      {onSetLoad2 && (
                        <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 font-mono">
                          <div className="flex justify-between text-xs text-slate-300">
                            <span>DCDB 2 Station Load Demand:</span>
                            <span className="text-cyan-400 font-bold">{state.loadKw2.toFixed(1)} kW</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="15"
                            step="0.5"
                            value={state.loadKw2}
                            onChange={(e) => onSetLoad2(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
