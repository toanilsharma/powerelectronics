import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  CheckCircle2,
  Fan,
  Flame,
  Gauge,
  Info,
  Layers,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Thermometer,
  Zap
} from 'lucide-react';

interface BatteryThermalRunawayLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * BatteryThermalRunawayLab.tsx
 * 
 * IEEE 1188 / IEC 62485-2 / IEEE 450 VLA & VRLA Station Battery Thermal Runaway Lab
 * 
 * Physics Laws & International Standards:
 *  - Arrhenius 10°C Aging Rule: Lifespan halves for every 10°C rise above 25°C.
 *  - Thermal Runaway Positive Feedback Loop: Float current I_float increases exponentially with T_cell.
 *  - Exothermic Oxygen Recombination Reaction: Q_gen = I_float * V_cell > Q_dissipation.
 *  - Hydrogen Gassing Evolution (V_cell > 2.30V): 0.418 L H2 / Ah produced by water electrolysis.
 *  - Lower Explosive Limit (LEL): Safety threshold kept below 1.0% H2 (LEL is 4.0% in air).
 */
export const BatteryThermalRunawayLab: React.FC<BatteryThermalRunawayLabProps> = ({
  className = '',
  onClose,
}) => {
  // Parameters
  const [ambientTempC, setAmbientTempC] = useState<number>(30); // 15°C to 50°C
  const [cellFloatVolts, setCellFloatVolts] = useState<number>(2.25); // 2.15V to 2.45V
  const [cellCount, setCellCount] = useState<number>(105); // 105 cells (220V DC)
  const [fanHealthy, setFanHealthy] = useState<boolean>(true); // Battery room exhaust fan
  const [thermalRunawayActive, setThermalRunawayActive] = useState<boolean>(false);

  // Dynamic Physical Simulation
  const [cellTempC, setCellTempC] = useState<number>(30);
  const [h2ConcentrationPct, setH2ConcentrationPct] = useState<number>(0.15); // % H2 in room air

  // Arrhenius Lifespan Calculation (Nominal 12 years at 25°C)
  const nominalLifeYears = 12.0;
  const tempExcess = Math.max(0, cellTempC - 25.0);
  const expectedLifespanYears = Math.max(0.5, nominalLifeYears * Math.pow(2, -tempExcess / 10.0));

  // Float Current Calculation (Exponential with Voltage & Temperature)
  // Baseline float current at 2.25V, 25°C: 0.15 A (150mA per 100Ah cell)
  const vDelta = cellFloatVolts - 2.25;
  const tKelvin = cellTempC + 273.15;
  const baseKelvin = 298.15;
  const activationEnergyFactor = Math.exp(2200 * (1 / baseKelvin - 1 / tKelvin));
  const floatCurrentA = 0.15 * Math.exp(vDelta * 8.0) * activationEnergyFactor;

  // Power Dissipation per Cell (Watts)
  const heatGenWatts = floatCurrentA * cellFloatVolts;
  const heatDissCapacityWatts = fanHealthy ? 1.2 : 0.35; // Heat dissipation limit
  const isNetHeating = heatGenWatts > heatDissCapacityWatts;

  // Hydrogen Evolution (Above 2.30V Gassing Threshold)
  const isGassing = cellFloatVolts > 2.30;
  const h2GenRateLitersPerHr = isGassing ? (cellFloatVolts - 2.30) * floatCurrentA * 0.418 * cellCount : 0.02;

  // Thermal Runaway Simulation Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCellTempC((prev) => {
        if (isNetHeating || thermalRunawayActive) {
          const rate = fanHealthy ? 0.4 : 1.2;
          const next = prev + rate;
          if (next > 65) setThermalRunawayActive(true);
          return Math.min(85, next);
        } else {
          // Cooling towards ambient
          const coolRate = 0.3;
          if (prev > ambientTempC) return Math.max(ambientTempC, prev - coolRate);
          return prev;
        }
      });

      setH2ConcentrationPct((prev) => {
        if (!fanHealthy && isGassing) {
          return Math.min(4.8, prev + 0.08);
        } else if (fanHealthy) {
          return Math.max(0.1, prev - 0.05);
        }
        return prev;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [isNetHeating, thermalRunawayActive, fanHealthy, ambientTempC, isGassing]);

  // Safety Status Thresholds
  const isThermalRunaway = cellTempC >= 55.0;
  const isH2Hazard = h2ConcentrationPct >= 1.0; // IEEE 484 limit (1% H2)
  const isH2Explosive = h2ConcentrationPct >= 4.0; // Lower Explosive Limit (LEL)

  return (
    <div className={`bg-[#0f172a] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5 text-white font-sans ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ef4444]/20 border border-[#ef4444]">
              <Thermometer className="w-5 h-5 text-[#ef4444]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              Station Battery Thermal Runaway &amp; Arrhenius Degradation Lab
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            IEEE 1188 / IEC 62485-2 • Arrhenius Lifespan Rule • Exothermic Recombination Runaway • H₂ Gas LEL Monitoring
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            isH2Explosive || isThermalRunaway
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
              : isH2Hazard || isNetHeating
              ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
              : 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
          }`}>
            {isH2Explosive || isThermalRunaway ? (
              <Flame className="w-4 h-4 text-[#ef4444]" />
            ) : isH2Hazard || isNetHeating ? (
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            )}
            <span>
              {isH2Explosive
                ? '💥 EXPLOSION HAZARD (H₂ ≥ 4% LEL)!'
                : isThermalRunaway
                ? '🔥 THERMAL RUNAWAY IN PROGRESS!'
                : isH2Hazard
                ? '⚠️ H₂ EXCEEDS 1% SAFETY LIMIT'
                : isNetHeating
                ? '⚠️ NET POSITIVE HEAT GENERATION'
                : 'STABLE FLOAT THERMAL BALANCE'}
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

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Physical Cell View & Runaway Feedback Loop (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Animated Battery Cell Cutaway & Boiling Electrolyte */}
          <div className="p-4 bg-[#020617] border border-[#334155] rounded-2xl space-y-3 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-[#10b981]" /> VRLA / VLA Lead-Acid Cell Micro-Thermal Cutaway
              </span>
              <span>Cell Temp: <strong className={isThermalRunaway ? 'text-[#ef4444]' : 'text-white'}>{cellTempC.toFixed(1)}°C</strong></span>
            </div>

            <div className="relative w-full h-44 bg-[#0a0f1d] rounded-xl border border-[#334155] overflow-hidden p-4 flex items-center justify-around">
              
              {/* Thermal Heat Aura Glow */}
              <div
                style={{ opacity: Math.min(0.8, (cellTempC - 25) / 50) }}
                className="absolute inset-0 bg-[#ef4444] blur-2xl transition-opacity duration-300 pointer-events-none"
              />

              {/* Lead-Acid Cell Container */}
              <div className="relative z-10 w-44 h-36 bg-[#1e293b] border-2 border-[#475569] rounded-xl flex flex-col justify-between p-2 shadow-2xl">
                
                {/* Terminals */}
                <div className="flex justify-between px-4 -mt-4">
                  <div className="w-4 h-3 bg-[#06b6d4] rounded-t font-bold text-[8px] text-black text-center">+</div>
                  <div className="w-4 h-3 bg-[#3b82f6] rounded-t font-bold text-[8px] text-white text-center">-</div>
                </div>

                {/* Internal Lead Plates */}
                <div className="flex-1 flex items-end justify-around px-2 pb-1 gap-1">
                  {[0, 1, 2, 3, 4, 5].map((p) => (
                    <div
                      key={p}
                      className={`w-3.5 rounded-t transition-colors ${
                        isThermalRunaway
                          ? 'bg-[#ef4444] animate-pulse'
                          : p % 2 === 0
                          ? 'bg-[#94a3b8]'
                          : 'bg-[#64748b]'
                      }`}
                      style={{ height: `${65 + (p % 2) * 15}%` }}
                    />
                  ))}
                </div>

                {/* Bubbling Gassing Hydrogen Particles */}
                {isGassing && (
                  <div className="absolute inset-x-2 top-8 bottom-6 flex items-center justify-around opacity-60">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}

                {/* Thermal Runaway Flame Badge */}
                {isThermalRunaway && (
                  <div className="absolute inset-0 bg-red-950/80 rounded-xl flex flex-col items-center justify-center text-center p-2">
                    <Flame className="w-8 h-8 text-[#ef4444] animate-bounce" />
                    <span className="text-[9px] font-bold text-[#ef4444] mt-1">THERMAL RUNAWAY!</span>
                  </div>
                )}
              </div>

              {/* Thermal Runaway Positive Feedback Loop Diagram */}
              <div className="relative z-10 w-52 space-y-1 text-[10px]">
                <div className="text-[#94a3b8] font-bold uppercase pb-1 border-b border-[#1e293b]">
                  Exothermic Feedback Loop:
                </div>
                <div className="p-1.5 rounded bg-[#0f172a] border border-[#1e293b] flex items-center justify-between">
                  <span>1. Temp Rises (T &gt; 35°C)</span>
                  <span className="text-[#f59e0b]">↑ Heat</span>
                </div>
                <div className="p-1.5 rounded bg-[#0f172a] border border-[#1e293b] flex items-center justify-between">
                  <span>2. Float Current Surges</span>
                  <span className="text-[#ef4444] font-bold">{(floatCurrentA * 1000).toFixed(0)} mA</span>
                </div>
                <div className="p-1.5 rounded bg-[#0f172a] border border-[#1e293b] flex items-center justify-between">
                  <span>3. O₂ Recombination</span>
                  <span className="text-[#ef4444]">+{heatGenWatts.toFixed(2)}W/cell</span>
                </div>
              </div>

            </div>

            {/* Telemetry Cards */}
            <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Float Current</div>
                <div className="text-sm font-bold text-white">{(floatCurrentA * 1000).toFixed(0)} mA</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Heat Generation</div>
                <div className={`text-sm font-bold ${isNetHeating ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  {heatGenWatts.toFixed(2)} W/cell
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Arrhenius Life</div>
                <div className={`text-sm font-bold ${expectedLifespanYears < 4 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  {expectedLifespanYears.toFixed(1)} Years
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                <div className="text-[#94a3b8] text-[10px]">Room H₂ Level</div>
                <div className={`text-sm font-bold ${isH2Explosive ? 'text-[#ef4444] animate-pulse' : isH2Hazard ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                  {h2ConcentrationPct.toFixed(2)}% (LEL: 4%)
                </div>
              </div>
            </div>
          </div>

          {/* Arrhenius Aging Rule Explanatory Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-2 font-mono text-xs">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-[#06b6d4]" />
              The IEEE 1188 Arrhenius 10°C Halving Rule
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Every <strong className="text-white">10°C continuous rise</strong> above the standard design temperature of 25°C doubles positive plate grid corrosion and cut battery service life in half:
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1 font-bold">
              <div className="p-2 rounded-lg bg-[#0f172a] border border-[#10b981]">
                <div className="text-[#10b981]">25°C (Nominal)</div>
                <div className="text-white text-xs mt-0.5">12.0 Years</div>
              </div>
              <div className="p-2 rounded-lg bg-[#0f172a] border border-[#334155]">
                <div className="text-[#94a3b8]">35°C (+10°C)</div>
                <div className="text-amber-400 text-xs mt-0.5">6.0 Years</div>
              </div>
              <div className="p-2 rounded-lg bg-[#0f172a] border border-[#334155]">
                <div className="text-[#94a3b8]">45°C (+20°C)</div>
                <div className="text-amber-500 text-xs mt-0.5">3.0 Years</div>
              </div>
              <div className="p-2 rounded-lg bg-[#0f172a] border border-[#ef4444]">
                <div className="text-[#ef4444]">55°C (+30°C)</div>
                <div className="text-red-400 text-xs mt-0.5">1.5 Years</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Controls, Ventilation Interlock & Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          
          {/* Controls Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#06b6d4]" /> Operating Condition Controls
              </span>
              <span className="text-[#06b6d4] font-bold">IEEE 450 Standard</span>
            </div>

            {/* Ambient Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Ambient Room Temperature</span>
                <span className="text-white font-bold">{ambientTempC}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="1"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />
            </div>

            {/* Float Voltage Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Float Charge Voltage (V/cell)</span>
                <span className={`font-bold ${cellFloatVolts > 2.30 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  {cellFloatVolts.toFixed(2)} V/cell ({ (cellFloatVolts * cellCount).toFixed(1) }V DC)
                </span>
              </div>
              <input
                type="range"
                min="2.15"
                max="2.42"
                step="0.01"
                value={cellFloatVolts}
                onChange={(e) => setCellFloatVolts(Number(e.target.value))}
                className="w-full accent-[#10b981] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>2.18V (Nominal Float)</span>
                <span>2.30V (Gassing Knee)</span>
                <span>2.40V (Overcharge)</span>
              </div>
            </div>

            {/* Exhaust Ventilation Fan Interlock Toggle */}
            <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fan className={`w-4 h-4 ${fanHealthy ? 'text-[#10b981] animate-spin' : 'text-[#ef4444]'}`} />
                <div>
                  <div className="text-white font-bold">ATEX Room Exhaust Fan</div>
                  <div className="text-[10px] text-[#64748b]">IEC 62485-2 Safety Interlock</div>
                </div>
              </div>
              <button
                onClick={() => setFanHealthy(!fanHealthy)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
                  fanHealthy
                    ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                    : 'bg-[#ef4444] text-white border-[#ef4444] animate-pulse'
                }`}
              >
                {fanHealthy ? 'ONLINE (VENTING)' : 'TRIPPED (FAN FAIL!)'}
              </button>
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setCellTempC(25);
                  setAmbientTempC(25);
                  setCellFloatVolts(2.20);
                  setFanHealthy(true);
                  setThermalRunawayActive(false);
                  setH2ConcentrationPct(0.12);
                }}
                className="w-full py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#10b981] text-[#10b981] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESTORE HEALTHY 25°C EQUILIBRIUM</span>
              </button>
            </div>
          </div>

          {/* Educational Safety Card */}
          <div className="p-4 bg-[#0f172a] border border-[#334155] rounded-2xl space-y-2 text-xs text-[#94a3b8] font-sans">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#06b6d4]" />
              NFPA 1 &amp; IEEE 484 Substation Safety Standards
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>1. Thermal Runaway Mitigation:</strong> Chargers must incorporate temperature-compensated charging (-3mV/°C/cell). If cell temperature rises, charger output voltage must automatically step down to prevent exponential current runaway!
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>2. Hydrogen Explosion Prevention:</strong> Hydrogen gas mixes rapidly with air. The Lower Explosive Limit is 4% by volume. Substation ventilation systems are interlocked to trip the charger if air flow drops below 1 air change per hour.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
