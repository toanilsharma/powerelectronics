import React, { useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Thermometer, ShieldAlert, Clock, RefreshCw, Info, Lock } from 'lucide-react';

interface ThermalGaugeProps {
  engineState?: Partial<SoftStarterState>;
  onSetParams?: (params: { tripClass?: 'Class10' | 'Class20' | 'Class30' }) => void;
  className?: string;
}

/**
 * ThermalGauge.tsx - IEC Thermal Overload Accumulator & Trip Curve Component
 * 
 * Physics Laws & IEC 60947-4-2:
 *  - Thermal Accumulator: dC/dt = (I_pu² - 1) / tau_class
 *  - Trip Curve: t_trip = tau_class / (I_pu² - 1)
 *  - Class 10 (tau=120s), Class 20 (tau=240s), Class 30 (tau=360s)
 *  - Thermal Memory Cooldown & Max Starts per Hour Lockout
 */
export const ThermalGauge: React.FC<ThermalGaugeProps> = ({
  engineState,
  onSetParams,
  className = '',
}) => {
  const [selectedClass, setSelectedClass] = useState<'Class10' | 'Class20' | 'Class30'>(
    engineState?.tripClass ?? 'Class10'
  );

  // Telemetry Metrics
  const thermalCapPct = Math.min(100.0, Math.max(0.0, engineState?.thermalCapPct ?? 0.0));
  const iRmsPu = engineState?.IrmsPu ?? 0.0;
  const startsThisHour = engineState?.startsThisHour ?? 2;
  const maxStartsPerHour = engineState?.maxStartsPerHour ?? 4;
  const cooldownSec = engineState?.cooldownSec ?? 0;
  const isTripped = engineState?.state === 'TRIPPED' || thermalCapPct >= 100.0;
  const isCoolingLocked = cooldownSec > 0 || startsThisHour >= maxStartsPerHour;

  // Format mm:ss Cooldown Time
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Trip Class Change
  const handleClassSelect = (cls: 'Class10' | 'Class20' | 'Class30') => {
    setSelectedClass(cls);
    if (onSetParams) {
      onSetParams({ tripClass: cls });
    }
  };

  // Circular Gauge Angle Calculation (0% -> -135deg, 100% -> +135deg)
  const needleAngle = -135 + (thermalCapPct / 100.0) * 270;

  // Calculate IEC Trip Curves Path (Log-Log Scale: I from 1.1 to 8.0 pu, t from 1 to 1000s)
  const svgWidth = 420;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Log Scale Mapping Converters
  const logIToX = (iPu: number) => {
    const minLog = Math.log10(1.1);
    const maxLog = Math.log10(8.0);
    const valLog = Math.log10(Math.max(1.1, Math.min(8.0, iPu)));
    return padLeft + ((valLog - minLog) / (maxLog - minLog)) * chartW;
  };

  const logTToY = (tSec: number) => {
    const minLog = Math.log10(1.0);
    const maxLog = Math.log10(1000.0);
    const valLog = Math.log10(Math.max(1.0, Math.min(1000.0, tSec)));
    return svgHeight - padBottom - ((valLog - minLog) / (maxLog - minLog)) * chartH;
  };

  // Generate IEC Class Curve Points
  const getCurvePath = (tauSec: number) => {
    const pts: string[] = [];
    for (let i = 1.15; i <= 8.0; i += 0.1) {
      const tTrip = Math.max(1.0, tauSec / (i * i - 1.0));
      const x = logIToX(i);
      const y = logTToY(tTrip);
      pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    return pts.join(' ');
  };

  const pathClass10 = getCurvePath(120);
  const pathClass20 = getCurvePath(240);
  const pathClass30 = getCurvePath(360);

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>🌡️</span> IEC Thermal Overload Accumulator & Trip Curves
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            IEC 60947-4-2 Class 10/20/30 • Thermal Capacity Accumulator & Cooldown Memory
          </p>
        </div>

        {/* Trip Class Selector Buttons */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[#64748b] uppercase font-bold mr-1">Class:</span>
          {(['Class10', 'Class20', 'Class30'] as const).map((cls) => (
            <button
              key={cls}
              onClick={() => handleClassSelect(cls)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all ${
                selectedClass === cls
                  ? 'bg-[#06b6d4] text-slate-950 border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-[#0f172a] text-[#94a3b8] border-[#334155] hover:text-white'
              }`}
            >
              {cls.replace('Class', '10/').replace('10/20', 'Class 20').replace('10/30', 'Class 30').replace('10/10', 'Class 10')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Viewport: Circular Gauge + Log-Log Trip Curves Plot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Left Panel: Circular Thermal Gauge */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 flex flex-col items-center justify-center relative space-y-2">
          
          <div className="text-xs font-mono text-[#94a3b8] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-[#06b6d4]" /> Motor Thermal Capacity
          </div>

          {/* SVG Dial */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Background Track Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#1e293b"
                strokeWidth="10"
                strokeDasharray="188.5 251.3" // 270deg arc
              />

              {/* Gradient Arc Fill */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={thermalCapPct > 85 ? '#ef4444' : thermalCapPct > 50 ? '#f59e0b' : '#10b981'}
                strokeWidth="10"
                strokeDasharray={`${(thermalCapPct / 100.0) * 188.5} 251.3`}
                className="transition-all duration-300"
                style={{ filter: `drop-shadow(0 0 8px ${thermalCapPct > 85 ? '#ef4444' : '#10b981'})` }}
              />
            </svg>

            {/* Gauge Needle */}
            <div
              className="absolute w-1 h-20 bg-[#ffffff] origin-bottom rounded-full transition-all duration-300 shadow-[0_0_10px_#ffffff]"
              style={{ transform: `rotate(${needleAngle}deg) translateY(-28px)` }}
            />

            {/* Center Digital Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-6 font-mono text-center">
              <span className={`text-2xl font-extrabold ${
                thermalCapPct > 85 ? 'text-[#ef4444]' : thermalCapPct > 50 ? 'text-amber-400' : 'text-[#10b981]'
              }`}>
                {thermalCapPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#64748b] uppercase font-bold">CAPACITY USED</span>
            </div>

          </div>

          <div className="text-[11px] font-mono text-[#94a3b8] text-center font-semibold">
            {isTripped ? '🚨 THERMAL OVERLOAD TRIP LOCKOUT' : 'SAFE OPERATING THERMAL ZONE'}
          </div>

        </div>

        {/* Right Panel: IEC Trip Curves Log-Log Plot */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 flex flex-col justify-between space-y-2">
          
          <div className="flex items-center justify-between border-b border-[#334155] pb-1 text-xs font-mono">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              📈 IEC 60947-4-2 Trip Curves
            </span>
            <span className="text-[#06b6d4] text-[10px]">Log-Log Current vs Time</span>
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto block select-none">
            {/* Grid & Axis Lines */}
            <g stroke="#1e293b" strokeWidth="1">
              {[1.5, 3.0, 5.0, 7.0].map((i) => {
                const x = logIToX(i);
                return (
                  <g key={`x-${i}`}>
                    <line x1={x} y1={padTop} x2={x} y2={svgHeight - padBottom} />
                    <text x={x} y={svgHeight - padBottom + 14} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
                      {i}pu
                    </text>
                  </g>
                );
              })}

              {[5, 30, 120, 300].map((t) => {
                const y = logTToY(t);
                return (
                  <g key={`y-${t}`}>
                    <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} />
                    <text x={padLeft - 6} y={y + 3} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                      {t}s
                    </text>
                  </g>
                );
              })}
            </g>

            {/* IEC Class 10 (Cyan), Class 20 (Amber), Class 30 (Red) Lines */}
            <path d={pathClass10} fill="none" stroke="#06b6d4" strokeWidth={selectedClass === 'Class10' ? 3 : 1.5} opacity={selectedClass === 'Class10' ? 1 : 0.4} />
            <path d={pathClass20} fill="none" stroke="#f59e0b" strokeWidth={selectedClass === 'Class20' ? 3 : 1.5} opacity={selectedClass === 'Class20' ? 1 : 0.4} />
            <path d={pathClass30} fill="none" stroke="#ef4444" strokeWidth={selectedClass === 'Class30' ? 3 : 1.5} opacity={selectedClass === 'Class30' ? 1 : 0.4} />

            {/* Live Operating Point Marker (If Current > 1.1 pu) */}
            {iRmsPu > 1.1 && (
              <circle
                cx={logIToX(iRmsPu)}
                cy={logTToY(Math.max(1, 120 / (iRmsPu * iRmsPu - 1)))}
                r="6"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
                className="animate-ping"
              />
            )}
          </svg>

          {/* Curve Legend */}
          <div className="flex items-center justify-around text-[10px] font-mono text-[#94a3b8]">
            <span className="text-[#06b6d4]">Class 10 (120s)</span>
            <span className="text-[#f59e0b]">Class 20 (240s)</span>
            <span className="text-[#ef4444]">Class 30 (360s)</span>
          </div>

        </div>

      </div>

      {/* Repeated Starts per Hour & Thermal Memory Cooldown Status Footer */}
      <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        
        {/* Starts Counter */}
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#06b6d4]" />
          <div>
            <div className="font-bold text-white">
              STARTS THIS HOUR: <span className="text-[#06b6d4]">{startsThisHour} / max {maxStartsPerHour}</span>
            </div>
            <div className="text-[10px] text-[#64748b]">
              MOTOR THERMAL MEMORY START LIMIT
            </div>
          </div>
        </div>

        {/* Cooldown Lockout Status */}
        <div className="flex items-center gap-3">
          {isCoolingLocked ? (
            <div className="flex items-center gap-2 bg-[#ef4444]/20 border border-[#ef4444] px-3.5 py-1.5 rounded-xl text-[#ef4444] font-bold animate-pulse">
              <Lock className="w-4 h-4" />
              <span>COOLDOWN REMAINING: {formatTime(cooldownSec)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#10b981]/20 border border-[#10b981] px-3.5 py-1.5 rounded-xl text-[#10b981] font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>THERMAL MEMORY READY</span>
            </div>
          )}
        </div>

      </div>

      {/* Physics Educational Note */}
      <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Motor Thermal Memory & IEC Overload Physics
        </div>
        <p className="text-[11px] leading-relaxed">
          Induction motor rotor windings heat up rapidly during startup acceleration ($I^2 R$ losses).
          IEC trip curves specify allowable overload duration vs current.
          Attempting consecutive starts without allowing rotor cooling causes cumulative thermal accumulation, risking rotor bar cracking and insulation breakdown!
        </p>
      </div>

    </div>
  );
};
