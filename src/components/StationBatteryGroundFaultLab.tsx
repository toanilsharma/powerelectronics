import React, { useState, useId } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
  Layers,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Battery,
  Flame,
  HelpCircle
} from 'lucide-react';
import { computeFloatingDCEarthPhysics } from '../utils/floatingDcPhysics';

interface StationBatteryGroundFaultLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * StationBatteryGroundFaultLab.tsx
 * 
 * IEEE 946 / IEEE 450 Substation DC Ground Fault & Battery Health Lab
 * 
 * Physics Laws & International Standards:
 *  - Floating IT Ungrounded 220V DC Substation Auxiliary Bus.
 *  - Balanced Wheatstone Bridge Ground Fault Detector (GFD): R_bridge = 50 kΩ / pole.
 *  - Under normal conditions: V(+GND) = +110V, V(-GND) = -110V, V(bus) = 220V.
 *  - Pole-to-ground voltage collapse: On positive fault, V(+GND) -> 0V, V(-GND) -> -220V.
 *  - Two-pole sneak circuit hazard: Inadvertent energization of breaker trip coils (ANSI 52TC).
 *  - IEEE 450 Float (2.20 V/cell) vs Equalize (2.35 V/cell) gassing voltage curves & cell health.
 */
export const StationBatteryGroundFaultLab: React.FC<StationBatteryGroundFaultLabProps> = ({
  className = '',
  onClose,
}) => {
  // Fault Injection States
  const [posFaultActive, setPosFaultActive] = useState<boolean>(false);
  const [negFaultActive, setNegFaultActive] = useState<boolean>(false);
  const [faultResistanceKohm, setFaultResistanceKohm] = useState<number>(1.0); // 1 kΩ (bolted ground)
  const [sneakCircuitActive, setSneakCircuitActive] = useState<boolean>(false);

  // Battery Charge Management (IEEE 450)
  const [chargeMode, setChargeMode] = useState<'FLOAT' | 'EQUALIZE' | 'DISCHARGE'>('FLOAT');
  const [cellCount, setCellCount] = useState<number>(105); // 105 cells for nominal 220V DC
  const [ambientTempC, setAmbientTempC] = useState<number>(25);

  // Unique IDs for SVG filters to avoid collisions
  const blurId = useId();
  const glowId = useId();

  // Calculate Cell & Bus Voltages per IEEE 450
  // Float: 2.20 V/cell at 25°C
  // Equalize: 2.35 V/cell (gassing threshold: 2.30 V/cell)
  // Discharge: 1.95 V/cell (end of discharge: 1.80 V/cell)
  const tempCorrection = (25 - ambientTempC) * 0.003; // -3mV/°C/cell
  const nominalCellVolts = chargeMode === 'FLOAT' ? 2.20 : chargeMode === 'EQUALIZE' ? 2.35 : 1.95;
  const actualCellVolts = Number((nominalCellVolts + tempCorrection).toFixed(3));
  const vDcTotal = Number((actualCellVolts * cellCount).toFixed(1));

  // Compute Ground Fault Wheatstone Bridge Physics
  const isPos = posFaultActive;
  const isNeg = sneakCircuitActive ? true : negFaultActive;
  const gfdPhysics = computeFloatingDCEarthPhysics(vDcTotal, isPos, isNeg, faultResistanceKohm);

  // Insulation Status Evaluation per IEEE 946
  const isWarning = gfdPhysics.insulationKohm < 25 && gfdPhysics.insulationKohm >= 10;
  const isAlarm = gfdPhysics.insulationKohm < 10 || gfdPhysics.faultState === 'DOUBLE_FAULT_TRIP';
  const isDoubleFault = isPos && isNeg;

  // Individual Cell Voltages for Bar Display (10 representative cells)
  const cellVoltages = Array.from({ length: 10 }, (_, i) => {
    // In float mode before equalization, slight variance across cells (e.g. 2.15 to 2.24)
    if (chargeMode === 'FLOAT') {
      const delta = (Math.sin(i * 1.7) * 0.04);
      return Number((actualCellVolts + delta).toFixed(2));
    } else if (chargeMode === 'EQUALIZE') {
      // Equalized cells are tightly packed around 2.35V
      return Number((actualCellVolts + (Math.sin(i) * 0.008)).toFixed(2));
    } else {
      // Discharging
      return Number((actualCellVolts - (i * 0.015)).toFixed(2));
    }
  });

  return (
    <div className={`bg-[#0f172a] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5 text-white font-sans ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#06b6d4]/20 border border-[#06b6d4]">
              <Battery className="w-5 h-5 text-[#06b6d4]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              Station Battery Floating DC Bus Ground Fault Locator (IEEE 946 / IEEE 450)
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            220V DC Ungrounded IT Auxiliary Power System • Balanced Wheatstone Bridge GFD • Dual-Pole Sneak Circuit Hazard
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            isDoubleFault
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
              : isAlarm
              ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
              : 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
          }`}>
            {isDoubleFault ? (
              <Flame className="w-4 h-4 text-[#ef4444]" />
            ) : isAlarm ? (
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            )}
            <span>
              {isDoubleFault
                ? '🔥 DOUBLE FAULT SHORT CIRCUIT!'
                : isPos
                ? '🚨 POSITIVE (+VE) GROUND FAULT'
                : isNeg
                ? '🚨 NEGATIVE (-VE) GROUND FAULT'
                : 'BALANCED GROUND (HEALTHY)'}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white font-bold"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Interactive SLD & Wheatstone Bridge (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* SVG Wheatstone Bridge & Floating DC SLD */}
          <div className="relative bg-[#020617] border border-[#334155] rounded-2xl p-4 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8] border-b border-[#1e293b] pb-2 mb-2">
              <span className="text-white font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#06b6d4]" /> Balanced Ground Fault Bridge Circuit
              </span>
              <span>R_bridge = 50 kΩ / pole</span>
            </div>

            <svg viewBox="0 0 620 340" className="w-full h-auto select-none">
              <defs>
                <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Positive DC Rail (+220V) */}
              <line x1="40" y1="50" x2="580" y2="50" stroke={isPos ? '#ef4444' : '#06b6d4'} strokeWidth="4" />
              <text x="50" y="40" fill={isPos ? '#ef4444' : '#06b6d4'} fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
                +VE DC BUS (+{vDcTotal}V)
              </text>

              {/* Negative DC Rail (0V / -220V) */}
              <line x1="40" y1="290" x2="580" y2="290" stroke={isNeg ? '#ef4444' : '#3b82f6'} strokeWidth="4" />
              <text x="50" y="315" fill={isNeg ? '#ef4444' : '#3b82f6'} fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
                -VE DC BUS (0V Reference)
              </text>

              {/* Battery Bank Symbol at Left */}
              <g transform="translate(70, 110)">
                <rect x="0" y="0" width="40" height="120" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                <line x1="20" y1="-60" x2="20" y2="0" stroke="#06b6d4" strokeWidth="3" />
                <line x1="20" y1="120" x2="20" y2="180" stroke="#3b82f6" strokeWidth="3" />
                <text x="20" y="65" fill="#ffffff" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                  {cellCount}
                </text>
                <text x="20" y="78" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                  CELLS
                </text>
              </g>

              {/* Wheatstone Bridge Center Column (X = 310) */}
              <g transform="translate(310, 0)">
                {/* Top Half: Resistor R1 (50k) */}
                <line x1="0" y1="50" x2="0" y2="90" stroke="#94a3b8" strokeWidth="2" />
                <rect x="-15" y="90" width="30" height="40" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                <text x="0" y="115" fill="#06b6d4" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                  50kΩ
                </text>

                {/* Center Earth Junction */}
                <line x1="0" y1="130" x2="0" y2="210" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="0" cy="170" r="8" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                
                {/* Earth Ground Symbol */}
                <g transform="translate(0, 170)">
                  <line x1="8" y1="0" x2="40" y2="0" stroke="#10b981" strokeWidth="2" />
                  <line x1="40" y1="-10" x2="40" y2="10" stroke="#10b981" strokeWidth="2" />
                  <line x1="46" y1="-6" x2="46" y2="6" stroke="#10b981" strokeWidth="2" />
                  <line x1="52" y1="-3" x2="52" y2="3" stroke="#10b981" strokeWidth="2" />
                  <text x="60" y="4" fill="#10b981" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                    EARTH
                  </text>
                </g>

                {/* Bottom Half: Resistor R2 (50k) */}
                <rect x="-15" y="210" width="30" height="40" rx="3" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="0" y="235" fill="#3b82f6" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                  50kΩ
                </text>
                <line x1="0" y1="250" x2="0" y2="290" stroke="#94a3b8" strokeWidth="2" />
              </g>

              {/* Voltmeter V(+GND) */}
              <g transform="translate(200, 110)">
                <circle cx="0" cy="0" r="24" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                <text x="0" y="-4" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                  V(+E)
                </text>
                <text x="0" y="10" fill={isPos ? '#ef4444' : '#06b6d4'} fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                  {gfdPhysics.vPosToEarth > 0 ? `+${gfdPhysics.vPosToEarth}V` : `${gfdPhysics.vPosToEarth}V`}
                </text>
              </g>

              {/* Voltmeter V(-GND) */}
              <g transform="translate(200, 230)">
                <circle cx="0" cy="0" r="24" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="0" y="-4" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                  V(-E)
                </text>
                <text x="0" y="10" fill={isNeg ? '#ef4444' : '#3b82f6'} fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                  {gfdPhysics.vNegToEarth}V
                </text>
              </g>

              {/* Positive Fault Injected Path (Right Branch) */}
              {isPos && (
                <g>
                  <line x1="470" y1="50" x2="470" y2="150" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4,4" className="animate-pulse" />
                  <rect x="455" y="110" width="30" height="24" rx="3" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="470" y="126" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                    {faultResistanceKohm}kΩ
                  </text>
                  <line x1="470" y1="150" x2="350" y2="170" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,3" />
                  <circle cx="470" cy="50" r="5" fill="#ef4444" />
                </g>
              )}

              {/* Negative Fault / Sneak Circuit Path */}
              {isNeg && (
                <g>
                  <line x1="530" y1="290" x2="530" y2="190" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4,4" className="animate-pulse" />
                  <rect x="515" y="206" width="30" height="24" rx="3" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="530" y="222" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                    {sneakCircuitActive ? '0.1k' : `${faultResistanceKohm}k`}
                  </text>
                  <line x1="530" y1="190" x2="350" y2="170" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,3" />
                  <circle cx="530" cy="290" r="5" fill="#ef4444" />
                </g>
              )}

              {/* Double Fault Arc Flash Blast */}
              {isDoubleFault && (
                <g transform="translate(350, 170)">
                  <circle r="30" fill="#ef4444" opacity="0.3" className="animate-ping" />
                  <circle r="15" fill="#f59e0b" opacity="0.6" className="animate-pulse" />
                  <text x="0" y="4" fill="#ffffff" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                    ARC SHORT!
                  </text>
                </g>
              )}

              {/* Substation Breaker Trip Coil (Sneak Circuit Hazard Demo) */}
              <g transform="translate(480, 240)">
                <rect x="-35" y="-15" width="70" height="30" rx="4" fill={sneakCircuitActive ? '#7f1d1d' : '#1e293b'} stroke={sneakCircuitActive ? '#ef4444' : '#64748b'} strokeWidth="1.5" />
                <text x="0" y="-1" fill={sneakCircuitActive ? '#ef4444' : '#94a3b8'} fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                  ANSI 52TC
                </text>
                <text x="0" y="9" fill={sneakCircuitActive ? '#ffffff' : '#64748b'} fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                  {sneakCircuitActive ? 'SPURIOUS TRIP!' : 'TRIP COIL'}
                </text>
              </g>
            </svg>

            {/* Live Wheatstone Bridge Readout Cards */}
            <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs">
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">V(+VE to GND)</div>
                <div className={`text-base font-bold ${isPos ? 'text-[#ef4444]' : 'text-[#06b6d4]'}`}>
                  {gfdPhysics.vPosToEarth > 0 ? `+${gfdPhysics.vPosToEarth} V` : `${gfdPhysics.vPosToEarth} V`}
                </div>
                <div className="text-[9px] text-[#64748b]">Nominal: +{ (vDcTotal/2).toFixed(1) }V</div>
              </div>

              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">V(-VE to GND)</div>
                <div className={`text-base font-bold ${isNeg ? 'text-[#ef4444]' : 'text-[#3b82f6]'}`}>
                  {gfdPhysics.vNegToEarth} V
                </div>
                <div className="text-[9px] text-[#64748b]">Nominal: -{ (vDcTotal/2).toFixed(1) }V</div>
              </div>

              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">R_iso (Insulation)</div>
                <div className={`text-base font-bold ${isAlarm ? 'text-[#ef4444]' : isWarning ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                  {gfdPhysics.insulationKohm > 500 ? '> 500 kΩ' : `${gfdPhysics.insulationKohm} kΩ`}
                </div>
                <div className="text-[9px] text-[#64748b]">Alarm Limit: &lt; 10 kΩ</div>
              </div>
            </div>

          </div>

          {/* Fault Injection Drills Control Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#f59e0b]" /> IEEE 946 Earth Fault Injection Console
              </span>
              <span className="text-[11px] text-[#94a3b8]">Live Insulation Scenarios</span>
            </div>

            {/* Drill Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setPosFaultActive(!posFaultActive);
                  setSneakCircuitActive(false);
                }}
                className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                  posFaultActive
                    ? 'bg-[#ef4444] text-black border-[#ef4444] shadow-[0_0_12px_#ef4444]'
                    : 'bg-[#0f172a] text-[#06b6d4] border-[#06b6d4]/40 hover:border-[#06b6d4]'
                }`}
              >
                <span>+VE Ground Fault</span>
                <span className="text-[10px] font-normal">{posFaultActive ? 'ACTIVE (0V to GND)' : 'Inject Fault'}</span>
              </button>

              <button
                onClick={() => {
                  setNegFaultActive(!negFaultActive);
                  setSneakCircuitActive(false);
                }}
                className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                  negFaultActive
                    ? 'bg-[#ef4444] text-black border-[#ef4444] shadow-[0_0_12px_#ef4444]'
                    : 'bg-[#0f172a] text-[#3b82f6] border-[#3b82f6]/40 hover:border-[#3b82f6]'
                }`}
              >
                <span>-VE Ground Fault</span>
                <span className="text-[10px] font-normal">{negFaultActive ? 'ACTIVE (0V to GND)' : 'Inject Fault'}</span>
              </button>

              <button
                onClick={() => {
                  setPosFaultActive(true);
                  setSneakCircuitActive(true);
                }}
                className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                  sneakCircuitActive
                    ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-[0_0_15px_#ef4444] animate-pulse'
                    : 'bg-[#0f172a] text-[#f59e0b] border-[#f59e0b]/40 hover:border-[#f59e0b]'
                }`}
              >
                <span>⚡ 2-Pole Sneak Trip</span>
                <span className="text-[10px] font-normal">Spurious Breaker Trip</span>
              </button>

              <button
                onClick={() => {
                  setPosFaultActive(false);
                  setNegFaultActive(false);
                  setSneakCircuitActive(false);
                }}
                className="p-2.5 rounded-xl bg-[#0f172a] text-[#10b981] border border-[#10b981]/40 hover:border-[#10b981] font-bold text-xs flex flex-col items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Healthy</span>
                <span className="text-[10px] font-normal">R_iso &gt; 100kΩ</span>
              </button>
            </div>

            {/* Resistance Slider */}
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-xl space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Fault Contact Resistance (R_fault)</span>
                <span className="text-[#06b6d4] font-bold">{faultResistanceKohm.toFixed(1)} kΩ</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.5"
                value={faultResistanceKohm}
                onChange={(e) => setFaultResistanceKohm(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>0.1 kΩ (Dead Ground)</span>
                <span>10 kΩ (Alarm Threshold)</span>
                <span>50 kΩ (Incipient Moisture)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: IEEE 450 Battery Charge Physics & Cell Health (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Battery Charge Profile Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-[#10b981]" /> IEEE 450 Lead-Acid Battery Profile
              </span>
              <span className="text-[#10b981] font-bold">{vDcTotal} V Total</span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'FLOAT', label: 'Float (2.20V)', desc: 'Trickle charge' },
                { id: 'EQUALIZE', label: 'Boost (2.35V)', desc: 'Desulfation' },
                { id: 'DISCHARGE', label: 'Discharge (1.95V)', desc: 'Inverter on load' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChargeMode(m.id as any)}
                  className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${
                    chargeMode === m.id
                      ? 'bg-[#10b981] text-black border-[#10b981] shadow-lg'
                      : 'bg-[#0f172a] text-[#94a3b8] border-[#334155] hover:text-white'
                  }`}
                >
                  <div>{m.label}</div>
                  <div className="text-[9px] opacity-75">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Voltage Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Cell Voltage (Avg)</div>
                <div className="text-base font-bold text-[#10b981]">{actualCellVolts} V/cell</div>
                <div className="text-[9px] text-[#64748b]">Gassing threshold: 2.30V</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Total Cells & Temp</div>
                <div className="text-base font-bold text-white">{cellCount} Cells • {ambientTempC}°C</div>
                <div className="text-[9px] text-[#64748b]">Temp Coeff: -3mV/°C</div>
              </div>
            </div>

            {/* 10 Representative Cell Voltage Balance Histogram */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-[#94a3b8]">
                <span>Cell Voltage Balance Distribution (IEEE 450)</span>
                <span className={chargeMode === 'EQUALIZE' ? 'text-[#10b981] font-bold' : 'text-[#f59e0b]'}>
                  {chargeMode === 'EQUALIZE' ? '✓ Perfectly Equalized' : '⚠️ Sulfation Variance'}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1 h-16 bg-[#0f172a] p-2 rounded-xl border border-[#334155] items-end">
                {cellVoltages.map((v, idx) => {
                  const heightPct = Math.min(100, Math.max(10, ((v - 1.8) / (2.4 - 1.8)) * 100));
                  const isLow = v < 2.18 && chargeMode === 'FLOAT';
                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all duration-300 ${
                          chargeMode === 'EQUALIZE'
                            ? 'bg-[#10b981]'
                            : isLow
                            ? 'bg-[#ef4444]'
                            : 'bg-[#06b6d4]'
                        }`}
                        title={`Cell ${idx + 1}: ${v}V`}
                      />
                      <span className="text-[7px] text-[#64748b] mt-0.5">C{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b]">
                <span>1.80V (Empty)</span>
                <span>2.20V (Float)</span>
                <span>2.35V (Equalize)</span>
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8] text-[11px]">
                <span>Ambient Battery Room Temperature</span>
                <span className="text-[#06b6d4] font-bold">{ambientTempC}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />
            </div>

          </div>

          {/* Substation Relay & Sneak Circuit Hazards Card */}
          <div className="p-4 bg-[#0f172a] border border-[#334155] rounded-2xl space-y-2 text-xs text-[#94a3b8]">
            <div className="text-white font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
              Why Single Ground Faults Don't Trip & Sneak Circuit Hazard
            </div>
            <p className="text-[11px] leading-relaxed">
              In a floating IT 220V DC system, a single earth fault on either the positive or negative rail does <strong className="text-white">not interrupt power</strong> to critical substation relays or trip coils. The line-to-line voltage across loads remains at 220V!
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong className="text-[#ef4444]">The Sneak Circuit Danger:</strong> If a second fault develops on an opposite pole before the first is cleared, current returns through the earth, completing a path that can <strong className="text-white">spidery energize breaker trip coils (ANSI 52TC)</strong>, causing catastrophic nuisance tripping of high-voltage transmission lines!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
