import React, { useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Thermometer, ShieldAlert, Clock, Info, Lock, Play, HelpCircle } from 'lucide-react';

export interface ThermalGaugeProps {
  engine?: Partial<SoftStarterState> & {
    thermalCap?: number;
    startsThisHour?: number;
    startsLeft?: number;
    maxStartsPerHour?: number;
    cooldownSec?: number;
    tripClass?: 'Class10' | 'Class20' | 'Class30';
  };
  engineState?: Partial<SoftStarterState> & {
    thermalCap?: number;
    startsThisHour?: number;
    startsLeft?: number;
    maxStartsPerHour?: number;
    cooldownSec?: number;
    tripClass?: 'Class10' | 'Class20' | 'Class30';
  };
  onSetParams?: (params: { tripClass?: 'Class10' | 'Class20' | 'Class30' }) => void;
  onTripClassChange?: (cls: 'Class10' | 'Class20' | 'Class30') => void;
  onStart?: () => void;
  className?: string;
}

/**
 * ThermalGauge.tsx - IEC Thermal Overload Accumulator & Trip Curves Component
 * 
 * Physics Laws & IEC 60947-4-2:
 *  - Thermal Accumulator: dC/dt = (I_pu² - 1) / tau_class
 *  - Trip Curve: t_trip = tau_class / (I_pu² - 1)
 *  - Class 10 (tau=120s), Class 20 (tau=240s), Class 30 (tau=360s)
 *  - Thermal Memory Cooldown & Max Starts per Hour Lockout
 */
export const ThermalGauge: React.FC<ThermalGaugeProps> = ({
  engine,
  engineState,
  onSetParams,
  onTripClassChange,
  onStart,
  className = '',
}) => {
  const activeEngine = engine || engineState;

  // Selected Trip Class state (Class 10 / Class 20 / Class 30)
  const initialClass = activeEngine?.tripClass ?? 'Class10';
  const [selectedClass, setSelectedClass] = useState<'Class10' | 'Class20' | 'Class30'>(initialClass);

  // 1. Thermal Capacity Used (0 - 100%)
  const rawThermalCap =
    activeEngine?.thermalCap ??
    activeEngine?.thermalCapPct ??
    (activeEngine?.state === 'TRIPPED' ? 100.0 : 0.0);
  const thermalCapPct = Math.min(100.0, Math.max(0.0, rawThermalCap));

  // Current Telemetry
  const iRmsPu = activeEngine?.IrmsPu ?? 0.0;
  const maxStartsPerHour = activeEngine?.maxStartsPerHour ?? 4;
  const startsLeft = activeEngine?.startsLeft ?? 2;
  const startsThisHour =
    activeEngine?.startsThisHour ?? Math.max(0, maxStartsPerHour - startsLeft);
  const cooldownSec = activeEngine?.cooldownSec ?? (activeEngine?.state === 'TRIPPED' ? 180 : 0);

  const isTripped = activeEngine?.state === 'TRIPPED' || thermalCapPct >= 100.0;
  const isCoolingLocked = cooldownSec > 0 || startsLeft <= 0 || thermalCapPct > 80.0;

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
    if (onTripClassChange) {
      onTripClassChange(cls);
    }
  };

  // 1. Circular Gauge Needle Angle Calculation (-135deg at 0%, +135deg at 100%)
  const needleAngle = -135 + (thermalCapPct / 100.0) * 270;

  // 2. IEC Trip Curves Log-Log Plot Dimensions
  const svgWidth = 420;
  const svgHeight = 220;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 38;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Log Scale Mapping Converters: I_pu from 1.1 to 8.0 pu, t from 1s to 1000s
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

  // Generate IEC Class Curve Path string
  const getCurvePath = (tauSec: number) => {
    const pts: string[] = [];
    for (let i = 1.15; i <= 8.0; i += 0.1) {
      const tTrip = Math.max(1.0, tauSec / (i * i - 1.0));
      const x = logIToX(i);
      const y = logTToY(tTrip);
      pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const pathClass10 = getCurvePath(120);
  const pathClass20 = getCurvePath(240);
  const pathClass30 = getCurvePath(360);

  // Time-to-trip for current I_pu under selected class
  const activeTau = selectedClass === 'Class10' ? 120 : selectedClass === 'Class20' ? 240 : 360;
  const currentTTrip = iRmsPu > 1.05 ? Math.max(1.0, activeTau / (iRmsPu * iRmsPu - 1.0)) : 1000;

  return (
    <div id="ss-thermal-gauge" className={`bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 shadow-2xl space-y-4 font-mono ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="text-amber-400">🌡️</span> IEC THERMAL OVERLOAD & TRIP CURVES
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            IEC 60947-4-2 Motor Thermal Memory Accumulator & Repeated Start Limits
          </p>
        </div>

        {/* 4. Trip Class Selector (Class 10 / 20 / 30) */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8b949e] uppercase font-bold">Trip Class:</span>
          {(['Class10', 'Class20', 'Class30'] as const).map((cls) => {
            const label = cls === 'Class10' ? '10 (120s)' : cls === 'Class20' ? '20 (240s)' : '30 (360s)';
            const isSel = selectedClass === cls;

            return (
              <button
                key={cls}
                onClick={() => handleClassSelect(cls)}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                  isSel
                    ? 'bg-[#38bdf8] text-slate-950 border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.5)] scale-105'
                    : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:text-white hover:border-[#58a6ff]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Viewport: Circular Thermal Gauge + Log-Log Trip Curves */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Circular Thermal Gauge (0 - 100% capacity) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col items-center justify-center relative space-y-3">
          
          <div className="text-xs font-mono text-[#8b949e] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-[#38bdf8]" /> Motor Thermal Capacity Used
          </div>

          {/* Circular SVG Dial */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* SVG Arc Defs for Green -> Amber -> Red Gradient */}
              <defs>
                <linearGradient id="thermalGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="55%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>

              {/* Background Track Arc (270deg arc = 188.5 dashlength out of 251.3) */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#21262d"
                strokeWidth="10"
                strokeDasharray="188.5 251.3"
                strokeLinecap="round"
              />

              {/* Dynamic Gradient Arc Fill */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#thermalGaugeGrad)"
                strokeWidth="10"
                strokeDasharray={`${(thermalCapPct / 100.0) * 188.5} 251.3`}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
                style={{
                  filter: `drop-shadow(0 0 8px ${
                    thermalCapPct > 85 ? '#ef4444' : thermalCapPct > 50 ? '#f59e0b' : '#10b981'
                  })`,
                }}
              />
            </svg>

            {/* Gauge Needle */}
            <div
              className="absolute w-1 h-20 bg-white origin-bottom rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_#ffffff] z-10"
              style={{ transform: `rotate(${needleAngle}deg) translateY(-28px)` }}
            />
            <div className="absolute w-4 h-4 bg-white rounded-full border-2 border-slate-900 z-20 shadow-md" />

            {/* Center Digital Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 font-mono text-center z-0">
              <span
                className={`text-2xl font-extrabold ${
                  thermalCapPct > 85
                    ? 'text-red-400 animate-pulse'
                    : thermalCapPct > 50
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {thermalCapPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">CAPACITY USED</span>
            </div>

          </div>

          <div
            className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border ${
              isTripped
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : thermalCapPct > 70
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            }`}
          >
            {isTripped
              ? '🚨 THERMAL OVERLOAD TRIP LOCKOUT'
              : thermalCapPct > 70
              ? '⚠️ HIGH ROTOR THERMAL ACCUMULATION'
              : 'SAFE OPERATING THERMAL ZONE'}
          </div>

        </div>

        {/* 2. Log-Log IEC Trip Curves (Class 10 / 20 / 30) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between space-y-2">
          
          <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              📈 IEC 60947-4-2 Trip Curves
            </span>
            <span className="text-[#38bdf8] text-[10px]">Log-Log Scale (I_pu vs t_trip)</span>
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto block select-none">
            {/* Grid & Axis Lines */}
            <g stroke="#21262d" strokeWidth="1">
              {[1.5, 3.0, 5.0, 7.0].map((i) => {
                const x = logIToX(i);
                return (
                  <g key={`x-${i}`}>
                    <line x1={x} y1={padTop} x2={x} y2={svgHeight - padBottom} />
                    <text x={x} y={svgHeight - padBottom + 14} fill="#8b949e" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
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
                    <text x={padLeft - 6} y={y + 3} fill="#8b949e" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                      {t}s
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Axes */}
            <line x1={padLeft} y1={padTop} x2={padLeft} y2={svgHeight - padBottom} stroke="#30363d" strokeWidth="1.5" />
            <line x1={padLeft} y1={svgHeight - padBottom} x2={svgWidth - padRight} y2={svgHeight - padBottom} stroke="#30363d" strokeWidth="1.5" />

            {/* IEC Class 10 (Cyan), Class 20 (Amber), Class 30 (Red) Lines */}
            <path d={pathClass10} fill="none" stroke="#06b6d4" strokeWidth={selectedClass === 'Class10' ? 3 : 1.5} opacity={selectedClass === 'Class10' ? 1 : 0.4} />
            <path d={pathClass20} fill="none" stroke="#f59e0b" strokeWidth={selectedClass === 'Class20' ? 3 : 1.5} opacity={selectedClass === 'Class20' ? 1 : 0.4} />
            <path d={pathClass30} fill="none" stroke="#ef4444" strokeWidth={selectedClass === 'Class30' ? 3 : 1.5} opacity={selectedClass === 'Class30' ? 1 : 0.4} />

            {/* Live Operating Point Marker (If Current > 1.05 pu) */}
            {iRmsPu > 1.05 && (
              <g>
                <circle
                  cx={logIToX(iRmsPu)}
                  cy={logTToY(currentTTrip)}
                  r="7"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-ping"
                />
                <circle
                  cx={logIToX(iRmsPu)}
                  cy={logTToY(currentTTrip)}
                  r="5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Curve Legend */}
          <div className="flex items-center justify-around text-[10px] font-mono border-t border-[#21262d] pt-1 text-[#8b949e]">
            <span className={selectedClass === 'Class10' ? 'text-[#06b6d4] font-bold' : 'text-[#06b6d4]/60'}>Class 10 (120s)</span>
            <span className={selectedClass === 'Class20' ? 'text-[#f59e0b] font-bold' : 'text-[#f59e0b]/60'}>Class 20 (240s)</span>
            <span className={selectedClass === 'Class30' ? 'text-[#ef4444] font-bold' : 'text-[#ef4444]/60'}>Class 30 (360s)</span>
          </div>

        </div>

      </div>

      {/* 3. Starts per Hour, Cooldown Timer & Greyed-Out START Button */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
        
        {/* Starts Counter */}
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#38bdf8] shrink-0" />
          <div>
            <div className="font-bold text-white">
              STARTS THIS HOUR: <span className="text-[#38bdf8]">{startsThisHour} / max {maxStartsPerHour}</span>
            </div>
            <div className="text-[10px] text-[#8b949e]">
              REMAINING PERMITTED STARTS: <strong className="text-white">{startsLeft}</strong>
            </div>
          </div>
        </div>

        {/* Cooldown Timer */}
        <div className="flex items-center gap-3">
          {cooldownSec > 0 ? (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/60 px-3.5 py-1.5 rounded-xl text-red-400 font-bold animate-pulse">
              <Lock className="w-4 h-4" />
              <span>COOLDOWN REMAINING: {formatTime(cooldownSec)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 px-3.5 py-1.5 rounded-xl text-emerald-400 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>THERMAL MEMORY READY</span>
            </div>
          )}
        </div>

        {/* Interactive START Button with Thermal Memory Tooltip during Cooldown */}
        <div className="relative group shrink-0">
          <button
            onClick={() => {
              if (!isCoolingLocked && onStart) onStart();
            }}
            disabled={isCoolingLocked}
            className={`px-5 py-2.5 rounded-xl font-extrabold flex items-center gap-2 border transition-all ${
              isCoolingLocked
                ? 'bg-[#161b22] border-[#30363d] text-[#475569] cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isCoolingLocked ? 'START LOCKED (COOLING)' : 'START MOTOR'}</span>
          </button>

          {/* Thermal Memory Hover Tooltip */}
          {isCoolingLocked && (
            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-[#0d1117] border border-amber-500/60 rounded-xl shadow-2xl z-50 text-[11px] text-amber-200 leading-relaxed font-mono pointer-events-none">
              <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Motor Rotor Thermal Memory Lockout
              </div>
              Consecutive starts generate extreme $I^2 t$ rotor bar heating. The motor must cool down for <strong>{formatTime(cooldownSec)}</strong> before restarting to prevent rotor bar cracking and insulation breakdown!
            </div>
          )}
        </div>

      </div>

      {/* Physics Educational Note */}
      <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl text-xs space-y-1 text-[#8b949e]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#38bdf8]" />
          Why Field Engineers Misunderstand Motor Cooldown Limits
        </div>
        <p className="text-[11px] leading-relaxed">
          Induction motor rotor bars carry up to $6\times$ Full Load Current during direct start. Heat generated in locked rotor bars cannot dissipate instantly to the frame.
          IEC trip curves mandate an exponential thermal memory accumulator ($dC/dt = (I^2 - 1)/\tau$) to enforce cooldown delays between repeated start attempts, safeguarding long-term motor reliability!
        </p>
      </div>

    </div>
  );
};

export default ThermalGauge;
