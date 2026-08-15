import React, { useState } from 'react';
import { DualBatteryChargerReadouts, DualBatteryChargerState, DualChargerFaults } from '../types/dualBatteryCharger';
import { Info, Zap, Shield, Activity, RefreshCw, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';

interface DualBatteryChargerSLDProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  faults?: DualChargerFaults;
  onToggleBreaker: (key: keyof DualBatteryChargerState) => void;
  onToggleModeA: () => void;
  onToggleModeB: () => void;
  onTripShunt1: () => void;
  onTripShunt2: () => void;
}

interface ComponentInfo {
  name: string;
  rating: string;
  standard: string;
  description: string;
}

const DUAL_SLD_TOOLTIPS: Record<string, ComponentInfo> = {
  AC_INCOMER_A: {
    name: '415V AC Supply A Incomer Breaker',
    rating: '80A MCCB, 3P 415V 50Hz, 25kA Icu',
    standard: 'IEC 60947-2 / IS 13947',
    description: 'Main AC supply incomer breaker for Float Cum Boost Charger 1A.',
  },
  AC_INCOMER_B: {
    name: '415V AC Supply B Incomer Breaker',
    rating: '80A MCCB, 3P 415V 50Hz, 25kA Icu',
    standard: 'IEC 60947-2 / IS 13947',
    description: 'Main AC supply incomer breaker for Float Cum Boost Charger 1B.',
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
  onToggleBreaker,
  onToggleModeA,
  onToggleModeB,
  onTripShunt1,
  onTripShunt2,
}) => {
  const [hoveredItem, setHoveredItem] = useState<ComponentInfo | null>(null);

  const isAcAOn = state.acSupplyAOnline;
  const isAcBOn = state.acSupplyBOnline;
  const isChgAOn = isAcAOn && state.mccbChargerA && readouts.activeModulesA > 0 && state.blockingDiodeAHealthy;
  const isChgBOn = isAcBOn && state.mccbChargerB && readouts.activeModulesB > 0 && state.blockingDiodeBHealthy;
  const isTieOn = state.mcbTieA && state.mccbBusTie && state.mcbTieB;
  const isBat1On = state.mccbBattery1_125A && state.mccbBattery1_160A && !state.shuntTrip1Tripped;
  const isBat2On = state.mccbBattery2_125A && state.mccbBattery2_160A && !state.shuntTrip2Tripped;

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center select-none">
      {/* SVG SLD SCHEMATIC (STRICT TOP-TO-BOTTOM ARCHITECTURE) */}
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

          {/* ========================================================================= */}
          {/* SECTION 1: TOP AC INPUT SUPPLIES (LEFT = SUPPLY A, RIGHT = SUPPLY B) */}
          {/* ========================================================================= */}

          {/* SUPPLY A HEADER */}
          <g transform="translate(60, 45)">
            <rect x="0" y="0" width="480" height="26" rx="4" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
            <text x="240" y="17" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
              415V ±10% 50Hz ±3% 3PH 4W AC SUPPLY A (INCOMER A)
            </text>
          </g>

          {/* SUPPLY B HEADER */}
          <g transform="translate(660, 45)">
            <rect x="0" y="0" width="480" height="26" rx="4" fill="#0f172a" stroke="#0891b2" strokeWidth="1" />
            <text x="240" y="17" fill="#22d3ee" fontSize="12" fontWeight="bold" textAnchor="middle">
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

            {/* MCCB 80A Button */}
            <g
              className="cursor-pointer"
              onClick={() => onToggleBreaker('acSupplyAOnline')}
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.AC_INCOMER_A)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <rect
                x="15"
                y="36"
                width="50"
                height="30"
                rx="4"
                fill={isAcAOn ? '#0284c7' : '#334155'}
                stroke={isAcAOn ? '#38bdf8' : '#64748b'}
                strokeWidth="2"
              />
              <text x="40" y="50" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="40" y="60" fill="#94a3b8" fontSize="8" textAnchor="middle">
                80A
              </text>
            </g>

            {/* Meters: Voltmeter VM 0-500V, Ammeter AM 0-75A, SPD, Lamps */}
            <line x1="40" y1="66" x2="40" y2="100" stroke={isAcAOn ? '#38bdf8' : '#475569'} strokeWidth="3" />
            {isAcAOn && (
              <line x1="40" y1="66" x2="40" y2="100" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-down" />
            )}
          </g>


          {/* Left Meters Display Panel */}
          <g transform="translate(80, 110)">
            <rect x="0" y="0" width="150" height="55" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="10" y="18" fill="#94a3b8" fontSize="9">
              VM (0-500V): <tspan fill="#38bdf8">{isAcAOn ? `${readouts.vAcBusA.toFixed(0)}V` : '0V'}</tspan>
            </text>
            <text x="10" y="32" fill="#94a3b8" fontSize="9">
              AM (0-75A): <tspan fill="#38bdf8">{isAcAOn ? `${(readouts.iChargerA * 0.85).toFixed(1)}A` : '0A'}</tspan>
            </text>
            <text x="10" y="46" fill="#94a3b8" fontSize="9">
              SPD 40kA: <tspan fill={isAcAOn ? '#10b981' : '#64748b'}>{isAcAOn ? 'OK (RYB)' : 'OFF / UNPOWERED'}</tspan>
            </text>
          </g>

          {/* --- RIGHT SIDE: SUPPLY B APPARATUS --- */}
          <g transform="translate(860, 80)">
            <line x1="40" y1="0" x2="40" y2="20" stroke={isAcBOn ? '#22d3ee' : '#475569'} strokeWidth="3" />
            {isAcBOn && (
              <line x1="40" y1="0" x2="40" y2="20" stroke="#67e8f9" strokeWidth="2" className="power-flow-dash-down" />
            )}
            <rect x="25" y="20" width="30" height="12" fill="#1e293b" stroke="#0891b2" rx="2" />
            <text x="40" y="29" fill="#e2e8f0" fontSize="8" textAnchor="middle">
              TB
            </text>

            {/* MCCB 80A Button B */}
            <g
              className="cursor-pointer"
              onClick={() => onToggleBreaker('acSupplyBOnline')}
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.AC_INCOMER_B)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <rect
                x="15"
                y="36"
                width="50"
                height="30"
                rx="4"
                fill={isAcBOn ? '#0891b2' : '#334155'}
                stroke={isAcBOn ? '#22d3ee' : '#64748b'}
                strokeWidth="2"
              />
              <text x="40" y="50" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="40" y="60" fill="#94a3b8" fontSize="8" textAnchor="middle">
                80A
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

          {/* LEFT CHARGER TITLE */}
          <text x="300" y="210" fill="#fbbf24" fontSize="12" fontWeight="black" textAnchor="middle">
            FLOAT CUM BOOST CHARGER-1A 220V/80A (4x 20A MODULES)
          </text>

          {/* RIGHT CHARGER TITLE */}
          <text x="900" y="210" fill="#fbbf24" fontSize="12" fontWeight="black" textAnchor="middle">
            FLOAT CUM BOOST CHARGER-1B 220V/80A (4x 20A MODULES)
          </text>

          {/* CENTER TEXT: HOT SWAPPABLE TYPE */}
          <rect x="500" y="215" width="200" height="20" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
          <text x="600" y="229" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle">
            ALL MODULES HOT SWAPABLE
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

                {/* MCB 16A Toggle */}
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
                    MCB 16A
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

                {/* MCB 16A Toggle */}
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
                    MCB 16A
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
          <line x1="130" y1="355" x2="450" y2="355" stroke={isChgAOn ? '#10b981' : readouts.vDcBus1 <= 50 ? '#ef4444' : '#334155'} strokeWidth="4" />
          {isChgAOn && (
            <line x1="130" y1="355" x2="450" y2="355" stroke="#a7f3d0" strokeWidth="3" className="power-flow-dash-right" />
          )}

          {/* CHARGER 1B MAIN COMBINING DC BUS (X: 730 to 1050) */}
          <line x1="730" y1="355" x2="1050" y2="355" stroke={isChgBOn ? '#10b981' : readouts.vDcBus2 <= 50 ? '#ef4444' : '#334155'} strokeWidth="4" />
          {isChgBOn && (
            <line x1="730" y1="355" x2="1050" y2="355" stroke="#a7f3d0" strokeWidth="3" className="power-flow-dash-right" />
          )}

          {/* --- LEFT DC BRANCH: CHARGER 1A DC ISOLATION --- */}
          <g transform="translate(290, 355)">
            <line x1="0" y1="0" x2="0" y2="25" stroke={isChgAOn ? '#10b981' : readouts.vDcBus1 <= 50 ? '#ef4444' : '#334155'} strokeWidth="3" />
            {isChgAOn && (
              <line x1="0" y1="0" x2="0" y2="25" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* BLOCKING DIODE MR 150A/DH1350 */}
            <g
              transform="translate(-15, 25)"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.DIODE_A)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <polygon points="0,0 30,0 15,25" fill={state.blockingDiodeAHealthy && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} />
              <line x1="0" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">
                MR 150A
              </text>
            </g>

            <line x1="0" y1="55" x2="0" y2="75" stroke={isChgAOn ? '#10b981' : readouts.vDcBus1 <= 50 ? '#ef4444' : '#334155'} strokeWidth="3" />
            {isChgAOn && (
              <line x1="0" y1="55" x2="0" y2="75" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* MCCB 100A CHARGER A */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mccbChargerA')} transform="translate(-25, 75)">
              <rect
                x="0"
                y="0"
                width="50"
                height="26"
                rx="4"
                fill={state.mccbChargerA ? (readouts.vDcBus1 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mccbChargerA ? (readouts.vDcBus1 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              <text x="25" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="8" textAnchor="middle">
                100A
              </text>
            </g>

            <line x1="0" y1="101" x2="0" y2="130" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {readouts.vDcBus1 > 50 && (
              <line x1="0" y1="101" x2="0" y2="130" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
          </g>

          {/* --- RIGHT DC BRANCH: CHARGER 1B DC ISOLATION --- */}
          <g transform="translate(890, 355)">
            <line x1="0" y1="0" x2="0" y2="25" stroke={isChgBOn ? '#10b981' : readouts.vDcBus2 <= 50 ? '#ef4444' : '#334155'} strokeWidth="3" />
            {isChgBOn && (
              <line x1="0" y1="0" x2="0" y2="25" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* BLOCKING DIODE MR 150A/DH1350 */}
            <g
              transform="translate(-15, 25)"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.DIODE_B)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <polygon points="0,0 30,0 15,25" fill={state.blockingDiodeBHealthy && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} />
              <line x1="0" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="2" />
              <text x="15" y="35" fill="#94a3b8" fontSize="8" textAnchor="middle">
                MR 150A
              </text>
            </g>

            <line x1="0" y1="55" x2="0" y2="75" stroke={isChgBOn ? '#10b981' : readouts.vDcBus2 <= 50 ? '#ef4444' : '#334155'} strokeWidth="3" />
            {isChgBOn && (
              <line x1="0" y1="55" x2="0" y2="75" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}

            {/* MCCB 100A CHARGER B */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mccbChargerB')} transform="translate(-25, 75)">
              <rect
                x="0"
                y="0"
                width="50"
                height="26"
                rx="4"
                fill={state.mccbChargerB ? (readouts.vDcBus2 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mccbChargerB ? (readouts.vDcBus2 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
                strokeWidth="2"
              />
              <text x="25" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="8" textAnchor="middle">
                100A
              </text>
            </g>

            <line x1="0" y1="101" x2="0" y2="130" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {readouts.vDcBus2 > 50 && (
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

            <line x1="0" y1="0" x2="160" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : '#334155'} strokeWidth="3" />
            {readouts.isBusTieEnergized && (
              <line x1="0" y1="0" x2="160" y2="0" stroke="#fbbf24" strokeWidth="2" className="power-flow-dash-right" />
            )}

            {/* MCB 6A Left */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mcbTieA')} transform="translate(160, -12)">
              <rect
                x="0"
                y="0"
                width="40"
                height="24"
                rx="3"
                fill={state.mcbTieA ? (readouts.vDcBus1 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mcbTieA ? (readouts.vDcBus1 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="20" y="15" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCB 6A
              </text>
            </g>

            <line x1="200" y1="0" x2="260" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : '#334155'} strokeWidth="3" />
            {readouts.isBusTieEnergized && (
              <line x1="200" y1="0" x2="260" y2="0" stroke="#fbbf24" strokeWidth="2" className="power-flow-dash-right" />
            )}

            {/* MAIN BUS TIE MCCB 125A (BUS COUPLER SWITCH - NORMALLY OFF) */}
            <g
              className="cursor-pointer transition-all duration-200"
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
                stroke={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#fbbf24' : '#ef4444') : '#64748b'}
                strokeWidth="2.5"
                className="shadow-lg"
              />
              <text x="60" y="16" fill="#ffffff" fontSize="10" fontWeight="black" textAnchor="middle">
                BUS COUPLER (125A MCCB)
              </text>
              <text x="60" y="30" fill={state.mccbBusTie ? '#fef3c7' : '#94a3b8'} fontSize="9" fontWeight="bold" textAnchor="middle">
                MAIN DC BUS TIE
              </text>
              <rect
                x="20"
                y="36"
                width="80"
                height="16"
                rx="3"
                fill={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#92400e' : '#7f1d1d') : '#0f172a'}
                stroke={state.mccbBusTie ? (readouts.isBusTieEnergized ? '#fef08a' : '#f87171') : '#475569'}
                strokeWidth="1"
              />
              <text x="60" y="48" fill={state.mccbBusTie ? '#ffffff' : '#f59e0b'} fontSize="8" fontWeight="black" textAnchor="middle">
                {state.mccbBusTie ? (readouts.isBusTieEnergized ? 'CLOSED / ON' : 'CLOSED (NO SOURCE)') : 'NORMALLY OFF'}
              </text>
            </g>

            <line x1="340" y1="0" x2="400" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : '#334155'} strokeWidth="3" />
            {readouts.isBusTieEnergized && (
              <line x1="340" y1="0" x2="400" y2="0" stroke="#fbbf24" strokeWidth="2" className="power-flow-dash-right" />
            )}

            {/* MCB 6A Right */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mcbTieB')} transform="translate(400, -12)">
              <rect
                x="0"
                y="0"
                width="40"
                height="24"
                rx="3"
                fill={state.mcbTieB ? (readouts.vDcBus2 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mcbTieB ? (readouts.vDcBus2 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="20" y="15" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCB 6A
              </text>
            </g>

            <line x1="440" y1="0" x2="600" y2="0" stroke={readouts.isBusTieEnergized ? '#f59e0b' : '#334155'} strokeWidth="3" />
            {readouts.isBusTieEnergized && (
              <line x1="440" y1="0" x2="600" y2="0" stroke="#fbbf24" strokeWidth="2" className="power-flow-dash-right" />
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

          {/* --- BATTERY BANK 1 (LEFT) --- */}
          <g transform="translate(100, 520)">
            {/* Horizontal line from VBATT-1 node */}
            <line x1="190" y1="-35" x2="80" y2="-35" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {readouts.vDcBus1 > 50 && (
              <line x1="190" y1="-35" x2="80" y2="-35" stroke="#34d399" strokeWidth="2" className={readouts.iBatt1 < -0.1 ? "power-flow-dash-right" : "power-flow-dash-left"} />
            )}
            <line x1="80" y1="-35" x2="80" y2="10" stroke={readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat1On && readouts.iBatt1 > 0.1 && (
              <line x1="80" y1="-35" x2="80" y2="10" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat1On && readouts.iBatt1 < -0.1 && (
              <line x1="80" y1="-35" x2="80" y2="10" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* Measurements: AH Meter, SH 125A/75mV, DCCT 100A IBATT */}
            <rect x="10" y="10" width="140" height="40" rx="4" fill="#0f172a" stroke={isBat1On && readouts.vDcBus1 > 50 ? '#334155' : '#ef4444'} />
            <text x="20" y="26" fill="#94a3b8" fontSize="8">
              AH Meter | SH 125A/75mV
            </text>
            <text x="20" y="38" fill={isBat1On && readouts.vDcBus1 > 50 ? (readouts.iBatt1 < -0.1 ? '#f59e0b' : '#34d399') : '#f87171'} fontSize="9" fontWeight="bold">
              DCCT IBATT: {readouts.iBatt1.toFixed(1)}A ({isBat1On && readouts.vDcBus1 > 50 ? readouts.statusBatt1 : 'OFF / 0V'})
            </text>

            <line x1="80" y1="50" x2="80" y2="70" stroke={isBat1On && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat1On && readouts.iBatt1 > 0.1 && (
              <line x1="80" y1="50" x2="80" y2="70" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat1On && readouts.iBatt1 < -0.1 && (
              <line x1="80" y1="50" x2="80" y2="70" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* MCCB 125A BATTERY 1 */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mccbBattery1_125A')} transform="translate(55, 70)">
              <rect
                x="0"
                y="0"
                width="50"
                height="26"
                rx="4"
                fill={state.mccbBattery1_125A ? (isBat1On || readouts.vDcBus1 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mccbBattery1_125A ? (isBat1On || readouts.vDcBus1 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="25" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="8" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="80" y1="96" x2="80" y2="115" stroke={isBat1On && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat1On && readouts.iBatt1 > 0.1 && (
              <line x1="80" y1="96" x2="80" y2="115" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat1On && readouts.iBatt1 < -0.1 && (
              <line x1="80" y1="96" x2="80" y2="115" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* BATTERY MCCB BOX WITH SHUNT TRIP (OUTSIDE BATTERY ROOM) */}
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
              <text x="70" y="16" fill="#a5b4fc" fontSize="8" fontWeight="bold" textAnchor="middle">
                BATTERY MCCB BOX (SHUNT TRIP)
              </text>
              <g onClick={onTripShunt1} transform="translate(30, 22)">
                <rect
                  x="0"
                  y="0"
                  width="80"
                  height="20"
                  rx="3"
                  fill={state.shuntTrip1Tripped ? '#dc2626' : !isBat1On ? '#991b1b' : '#4f46e5'}
                />
                <text x="40" y="13" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {state.shuntTrip1Tripped ? 'SHUNT TRIPPED' : !isBat1On ? 'OFF / ISOLATED' : 'MCCB 160A (NORMAL)'}
                </text>
              </g>
            </g>

            <line x1="80" y1="165" x2="80" y2="190" stroke={isBat1On && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat1On && readouts.iBatt1 > 0.1 && (
              <line x1="80" y1="165" x2="80" y2="190" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat1On && readouts.iBatt1 < -0.1 && (
              <line x1="80" y1="165" x2="80" y2="190" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* 220V/100AH VRLA BATTERY-1 ICON & CELL STRING */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BATTERY_1)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(10, 190)"
            >
              <rect x="0" y="0" width="140" height="70" rx="8" fill="#0f172a" stroke={!isBat1On || readouts.vDcBus1 <= 50 ? '#ef4444' : readouts.iBatt1 < -0.1 ? '#f59e0b' : '#10b981'} strokeWidth="2" />
              <text x="70" y="18" fill={!isBat1On || readouts.vDcBus1 <= 50 ? '#f87171' : readouts.iBatt1 < -0.1 ? '#f59e0b' : '#10b981'} fontSize="10" fontWeight="black" textAnchor="middle">
                220V / 100AH VRLA BATTERY-1
              </text>
              <text x="70" y="32" fill="#94a3b8" fontSize="8" textAnchor="middle">
                1st CELL ~ 105th CELL
              </text>

              {/* Battery SOC Level Bar */}
              <rect x="20" y="40" width="100" height="12" rx="3" fill="#1e293b" stroke="#334155" />
              <rect x="22" y="42" width={state.soc1 * 0.96} height="8" rx="2" fill={!isBat1On || readouts.vDcBus1 <= 50 ? '#ef4444' : readouts.iBatt1 < -0.1 ? '#f59e0b' : '#10b981'} />
              <text x="70" y="50" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                SOC: {state.soc1.toFixed(1)}% ({readouts.vBatt1.toFixed(1)}V)
              </text>
            </g>
          </g>

          {/* --- BATTERY BANK 2 (RIGHT) --- */}
          <g transform="translate(940, 520)">
            <line x1="-50" y1="-35" x2="60" y2="-35" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {readouts.vDcBus2 > 50 && (
              <line x1="-50" y1="-35" x2="60" y2="-35" stroke="#34d399" strokeWidth="2" className={readouts.iBatt2 < -0.1 ? "power-flow-dash-left" : "power-flow-dash-right"} />
            )}
            <line x1="60" y1="-35" x2="60" y2="10" stroke={readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat2On && readouts.iBatt2 > 0.1 && (
              <line x1="60" y1="-35" x2="60" y2="10" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat2On && readouts.iBatt2 < -0.1 && (
              <line x1="60" y1="-35" x2="60" y2="10" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* Measurements: AH Meter, SH 125A/75mV, DCCT 100A IBATT */}
            <rect x="-10" y="10" width="140" height="40" rx="4" fill="#0f172a" stroke={isBat2On && readouts.vDcBus2 > 50 ? '#334155' : '#ef4444'} />
            <text x="60" y="26" fill="#94a3b8" fontSize="8" textAnchor="middle">
              AH Meter | SH 125A/75mV
            </text>
            <text x="60" y="38" fill={isBat2On && readouts.vDcBus2 > 50 ? (readouts.iBatt2 < -0.1 ? '#f59e0b' : '#34d399') : '#f87171'} fontSize="9" fontWeight="bold" textAnchor="middle">
              DCCT IBATT: {readouts.iBatt2.toFixed(1)}A ({isBat2On && readouts.vDcBus2 > 50 ? readouts.statusBatt2 : 'OFF / 0V'})
            </text>

            <line x1="60" y1="50" x2="60" y2="70" stroke={isBat2On && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat2On && readouts.iBatt2 > 0.1 && (
              <line x1="60" y1="50" x2="60" y2="70" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat2On && readouts.iBatt2 < -0.1 && (
              <line x1="60" y1="50" x2="60" y2="70" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* MCCB 125A BATTERY 2 */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mccbBattery2_125A')} transform="translate(35, 70)">
              <rect
                x="0"
                y="0"
                width="50"
                height="26"
                rx="4"
                fill={state.mccbBattery2_125A ? (isBat2On || readouts.vDcBus2 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mccbBattery2_125A ? (isBat2On || readouts.vDcBus2 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="25" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="8" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="60" y1="96" x2="60" y2="115" stroke={isBat2On && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat2On && readouts.iBatt2 > 0.1 && (
              <line x1="60" y1="96" x2="60" y2="115" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat2On && readouts.iBatt2 < -0.1 && (
              <line x1="60" y1="96" x2="60" y2="115" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* BATTERY MCCB BOX WITH SHUNT TRIP (OUTSIDE BATTERY ROOM) */}
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
              <text x="70" y="16" fill="#a5b4fc" fontSize="8" fontWeight="bold" textAnchor="middle">
                BATTERY MCCB BOX (SHUNT TRIP)
              </text>
              <g onClick={onTripShunt2} transform="translate(30, 22)">
                <rect
                  x="0"
                  y="0"
                  width="80"
                  height="20"
                  rx="3"
                  fill={state.shuntTrip2Tripped ? '#dc2626' : !isBat2On ? '#991b1b' : '#4f46e5'}
                />
                <text x="40" y="13" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {state.shuntTrip2Tripped ? 'SHUNT TRIPPED' : !isBat2On ? 'OFF / ISOLATED' : 'MCCB 160A (NORMAL)'}
                </text>
              </g>
            </g>

            <line x1="60" y1="165" x2="60" y2="190" stroke={isBat2On && readouts.vDcBus2 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {isBat2On && readouts.iBatt2 > 0.1 && (
              <line x1="60" y1="165" x2="60" y2="190" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
            )}
            {isBat2On && readouts.iBatt2 < -0.1 && (
              <line x1="60" y1="165" x2="60" y2="190" stroke="#f59e0b" strokeWidth="2" className="power-flow-dash-up" />
            )}

            {/* 220V/100AH VRLA BATTERY-2 ICON & CELL STRING */}
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItem(DUAL_SLD_TOOLTIPS.BATTERY_2)}
              onMouseLeave={() => setHoveredItem(null)}
              transform="translate(-10, 190)"
            >
              <rect x="0" y="0" width="140" height="70" rx="8" fill="#0f172a" stroke={!isBat2On || readouts.vDcBus2 <= 50 ? '#ef4444' : readouts.iBatt2 < -0.1 ? '#f59e0b' : '#10b981'} strokeWidth="2" />
              <text x="70" y="18" fill={!isBat2On || readouts.vDcBus2 <= 50 ? '#f87171' : readouts.iBatt2 < -0.1 ? '#f59e0b' : '#10b981'} fontSize="10" fontWeight="black" textAnchor="middle">
                220V / 100AH VRLA BATTERY-2
              </text>
              <text x="70" y="32" fill="#94a3b8" fontSize="8" textAnchor="middle">
                1st CELL ~ 105th CELL
              </text>

              {/* Battery SOC Level Bar */}
              <rect x="20" y="40" width="100" height="12" rx="3" fill="#1e293b" stroke="#334155" />
              <rect x="22" y="42" width={state.soc2 * 0.96} height="8" rx="2" fill={!isBat2On || readouts.vDcBus2 <= 50 ? '#ef4444' : readouts.iBatt2 < -0.1 ? '#f59e0b' : '#10b981'} />
              <text x="70" y="50" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                SOC: {state.soc2.toFixed(1)}% ({readouts.vBatt2.toFixed(1)}V)
              </text>
            </g>
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

            {/* MCCB 125A TO DCDB 1 */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mccbDcdb1')} transform="translate(-25, 280)">
              <rect
                x="0"
                y="0"
                width="50"
                height="26"
                rx="4"
                fill={state.mccbDcdb1 ? (readouts.vDcBus1 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mccbDcdb1 ? (readouts.vDcBus1 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="25" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="8" textAnchor="middle">
                125A
              </text>
            </g>

            <line x1="0" y1="306" x2="0" y2="340" stroke={state.mccbDcdb1 && readouts.vDcBus1 > 50 ? '#10b981' : '#ef4444'} strokeWidth="3" />
            {state.mccbDcdb1 && readouts.vDcBus1 > 50 && (
              <line x1="0" y1="306" x2="0" y2="340" stroke="#34d399" strokeWidth="2" className="power-flow-dash-down" />
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
                220VDC DCDB-1 DISTRIBUTION BUSBAR
              </text>
            </g>

            {/* --- INTER-DCDB BUS COUPLER SWITCH (NORMALLY OFF / OPEN) --- */}
            <g transform="translate(110, 475)">
              <line x1="0" y1="0" x2="80" y2="0" stroke={state.dcdbBusCoupler ? '#f59e0b' : '#334155'} strokeWidth="3" />
              {state.dcdbBusCoupler && (
                <line x1="0" y1="0" x2="80" y2="0" stroke="#fbbf24" strokeWidth="2" className="power-flow-dash-right" />
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
                  stroke={state.dcdbBusCoupler ? '#fbbf24' : '#64748b'}
                  strokeWidth="2.5"
                  className="shadow-lg"
                />
                <text x="90" y="16" fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle">
                  BUS COUPLER SWITCH
                </text>
                <text x="90" y="30" fill={state.dcdbBusCoupler ? '#fef3c7' : '#94a3b8'} fontSize="9" fontWeight="bold" textAnchor="middle">
                  DCDB INTER-BUS COUPLER LINK
                </text>
                <rect
                  x="30"
                  y="35"
                  width="120"
                  height="16"
                  rx="3"
                  fill={state.dcdbBusCoupler ? '#92400e' : '#0f172a'}
                  stroke={state.dcdbBusCoupler ? '#fef08a' : '#475569'}
                  strokeWidth="1"
                />
                <text x="90" y="47" fill={state.dcdbBusCoupler ? '#ffffff' : '#f59e0b'} fontSize="8" fontWeight="black" textAnchor="middle">
                  {state.dcdbBusCoupler ? 'CLOSED / ON (INTERCONNECTED)' : 'NORMALLY OFF / ISOLATED'}
                </text>
              </g>

              <line x1="260" y1="0" x2="340" y2="0" stroke={state.dcdbBusCoupler ? '#f59e0b' : '#334155'} strokeWidth="3" />
              {state.dcdbBusCoupler && (
                <line x1="260" y1="0" x2="340" y2="0" stroke="#fbbf24" strokeWidth="2" className="power-flow-dash-right" />
              )}
            </g>

            {/* DOWNSTREAM FEEDER 1: PROTECTION RELAYS */}
            <g transform="translate(-90, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb1Feeder1 && state.mccbDcdb1 && readouts.vDcBus1 > 50 && !faults?.load1Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer" onClick={() => onToggleBreaker('dcdb1Feeder1')}>
                <rect x="-20" y="25" width="40" height="20" rx="3" fill={state.dcdb1Feeder1 && !faults?.load1Trip && readouts.vDcBus1 > 50 ? '#059669' : '#334155'} stroke={state.dcdb1Feeder1 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MCB 32A</text>
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
              <g className="cursor-pointer" onClick={() => onToggleBreaker('dcdb1Feeder2')}>
                <rect x="-20" y="25" width="40" height="20" rx="3" fill={state.dcdb1Feeder2 && !faults?.load1Trip && readouts.vDcBus1 > 50 ? '#059669' : '#334155'} stroke={state.dcdb1Feeder2 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MCB 32A</text>
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
              <g className="cursor-pointer" onClick={() => onToggleBreaker('dcdb1Feeder3')}>
                <rect x="-20" y="25" width="40" height="20" rx="3" fill={state.dcdb1Feeder3 && !faults?.load1Trip && readouts.vDcBus1 > 50 ? '#059669' : '#334155'} stroke={state.dcdb1Feeder3 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MCB 16A</text>
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

            {/* MCCB 125A TO DCDB 2 */}
            <g className="cursor-pointer" onClick={() => onToggleBreaker('mccbDcdb2')} transform="translate(-25, 280)">
              <rect
                x="0"
                y="0"
                width="50"
                height="26"
                rx="4"
                fill={state.mccbDcdb2 ? (readouts.vDcBus2 > 50 ? '#10b981' : '#dc2626') : '#334155'}
                stroke={state.mccbDcdb2 ? (readouts.vDcBus2 > 50 ? '#34d399' : '#ef4444') : '#64748b'}
              />
              <text x="25" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                MCCB
              </text>
              <text x="25" y="22" fill="#ffffff" fontSize="8" textAnchor="middle">
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
                220VDC DCDB-2 DISTRIBUTION BUSBAR {readouts.vDcBus2 <= 50 ? '(DE-ENERGIZED)' : ''}
              </text>
            </g>

            {/* DOWNSTREAM FEEDER 1: INVERTER SYSTEM FEED */}
            <g transform="translate(-90, 480)">
              <line x1="0" y1="0" x2="0" y2="25" stroke={state.dcdb2Feeder1 && state.mccbDcdb2 && readouts.vDcBus2 > 50 && !faults?.load2Trip ? '#10b981' : '#334155'} strokeWidth="2" />
              <g className="cursor-pointer" onClick={() => onToggleBreaker('dcdb2Feeder1')}>
                <rect x="-20" y="25" width="40" height="20" rx="3" fill={state.dcdb2Feeder1 && !faults?.load2Trip && readouts.vDcBus2 > 50 ? '#059669' : '#334155'} stroke={state.dcdb2Feeder1 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MCB 63A</text>
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
              <g className="cursor-pointer" onClick={() => onToggleBreaker('dcdb2Feeder2')}>
                <rect x="-20" y="25" width="40" height="20" rx="3" fill={state.dcdb2Feeder2 && !faults?.load2Trip && readouts.vDcBus2 > 50 ? '#059669' : '#334155'} stroke={state.dcdb2Feeder2 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MCB 40A</text>
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
              <g className="cursor-pointer" onClick={() => onToggleBreaker('dcdb2Feeder3')}>
                <rect x="-20" y="25" width="40" height="20" rx="3" fill={state.dcdb2Feeder3 && !faults?.load2Trip && readouts.vDcBus2 > 50 ? '#059669' : '#334155'} stroke={state.dcdb2Feeder3 ? '#34d399' : '#64748b'} />
                <text x="0" y="38" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">MCB 32A</text>
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

        </svg>

        {/* HOVER TOOLTIP CARD */}
        {hoveredItem && (
          <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-emerald-500/60 rounded-xl p-3 shadow-2xl backdrop-blur text-xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-700 pb-1">
              <span>{hoveredItem.name}</span>
              <span className="text-[10px] text-amber-300 font-mono">{hoveredItem.standard}</span>
            </div>
            <div className="text-slate-300 font-semibold">{hoveredItem.rating}</div>
            <div className="text-slate-400 text-[11px]">{hoveredItem.description}</div>
          </div>
        )}
    </div>
  );
};
