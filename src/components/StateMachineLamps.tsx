import React from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Power, Activity, ShieldCheck, AlertOctagon, CheckCircle2, Zap } from 'lucide-react';

interface StateMachineLampsProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

type StarterStateKey = 'STOPPED' | 'STARTING' | 'RUNNING' | 'BYPASSED' | 'STOPPING' | 'TRIPPED';

interface LampConfig {
  key: StarterStateKey;
  label: string;
  sublabel: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  activeShadow: string;
  icon: React.ReactNode;
}

/**
 * StateMachineLamps.tsx - Industrial Annunciator Panel Status Lamps
 * 
 * Features:
 * - 6 Lamps: STOPPED, STARTING, RUNNING(SCR), BYPASSED, STOPPING, TRIPPED
 * - Active state glowing brightly with signature color & micro-animations
 * - Smooth CSS transitions
 * - Dynamic One-Line Plain-English Operator Status Banner
 */
export const StateMachineLamps: React.FC<StateMachineLampsProps> = ({
  engineState,
  className = '',
}) => {
  const currentState: StarterStateKey = (engineState?.state as StarterStateKey) ?? 'STOPPED';
  const speedPct = Math.round((engineState?.w ?? 0.0) * 100.0);
  const iRmsPu = engineState?.IrmsPu ?? 0.0;
  const iFlaPct = Math.round(iRmsPu * 100.0);
  const vRmsPct = Math.round(engineState?.VrmsPct ?? 0.0);
  const thermalCapPct = Math.round(engineState?.thermalCapPct ?? 0.0);
  const startMode = engineState?.startMode ?? 'voltageRamp';

  // 6 Lamp Configurations
  const lamps: LampConfig[] = [
    {
      key: 'STOPPED',
      label: 'STOPPED',
      sublabel: 'OFF / READY',
      activeBg: 'bg-[#64748b]/20',
      activeBorder: 'border-[#64748b]',
      activeText: 'text-[#94a3b8]',
      activeShadow: 'shadow-[0_0_12px_rgba(100,116,139,0.5)]',
      icon: <Power className="w-4 h-4" />,
    },
    {
      key: 'STARTING',
      label: 'STARTING',
      sublabel: 'SCR RAMP',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-400',
      activeText: 'text-amber-400',
      activeShadow: 'shadow-[0_0_16px_rgba(245,158,11,0.6)] animate-pulse',
      icon: <Activity className="w-4 h-4 animate-spin" />,
    },
    {
      key: 'RUNNING',
      label: 'RUNNING',
      sublabel: 'SCR FULL',
      activeBg: 'bg-[#06b6d4]/20',
      activeBorder: 'border-[#06b6d4]',
      activeText: 'text-[#06b6d4]',
      activeShadow: 'shadow-[0_0_16px_rgba(6,182,212,0.6)]',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      key: 'BYPASSED',
      label: 'BYPASSED',
      sublabel: 'KM1 CLOSED',
      activeBg: 'bg-[#10b981]/20',
      activeBorder: 'border-[#10b981]',
      activeText: 'text-[#10b981]',
      activeShadow: 'shadow-[0_0_16px_rgba(16,185,129,0.6)]',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      key: 'STOPPING',
      label: 'STOPPING',
      sublabel: 'SOFT DECEL',
      activeBg: 'bg-orange-500/20',
      activeBorder: 'border-orange-400',
      activeText: 'text-orange-400',
      activeShadow: 'shadow-[0_0_16px_rgba(249,115,22,0.6)] animate-pulse',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      key: 'TRIPPED',
      label: 'TRIPPED',
      sublabel: 'OVERLOAD',
      activeBg: 'bg-[#ef4444]/20',
      activeBorder: 'border-[#ef4444]',
      activeText: 'text-[#ef4444]',
      activeShadow: 'shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse',
      icon: <AlertOctagon className="w-4 h-4 animate-bounce" />,
    },
  ];

  // Dynamic Plain-English Operator Status Text Generator
  const getStatusText = (): string => {
    switch (currentState) {
      case 'STOPPED':
        return 'Stopped — Motor de-energized, ready for start command.';
      case 'STARTING':
        return `Starting — ${
          startMode === 'currentLimit'
            ? `Current limit active at ${iFlaPct}% FLA`
            : `Voltage ramp active at ${vRmsPct}% V`
        }, speed ${speedPct}%, line current ${iRmsPu.toFixed(2)} pu.`;
      case 'RUNNING':
        return `Running — Full voltage applied (100% V), acceleration complete at ${speedPct}% speed, preparing for KM1 bypass.`;
      case 'BYPASSED':
        return `Bypassed — KM1 bypass contactor closed, SCR losses 0 W, motor operating directly across line at ${speedPct}% speed.`;
      case 'STOPPING':
        return `Soft Stopping — Controlled deceleration voltage ramp down (${vRmsPct}% V), speed ${speedPct}%, preventing water hammer.`;
      case 'TRIPPED':
        return `Tripped — Thermal overload protection activated (${thermalCapPct}% thermal capacity), motor lockout active. Press Reset to clear.`;
      default:
        return 'Ready';
    }
  };

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#334155] pb-2 text-xs font-mono text-[#94a3b8]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#06b6d4] animate-ping" />
          <span className="font-bold text-white uppercase tracking-wider">ANNUNCIATOR STATE MACHINE PANEL</span>
        </div>
        <div className="text-[11px] text-[#06b6d4] font-semibold">
          MOTOR SPEED: <span className="text-white font-bold">{speedPct}%</span> (1480 RPM)
        </div>
      </div>

      {/* 6 Annunciator Lamps Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {lamps.map((lamp) => {
          const isActive = currentState === lamp.key;

          return (
            <div
              key={lamp.key}
              className={`relative rounded-xl p-3 border transition-all duration-300 flex flex-col items-center justify-center space-y-1.5 cursor-default ${
                isActive
                  ? `${lamp.activeBg} ${lamp.activeBorder} ${lamp.activeText} ${lamp.activeShadow}`
                  : 'bg-[#0f172a] border-[#334155] text-[#64748b] opacity-60 hover:opacity-80'
              }`}
            >
              {/* Top Status LED Dot Indicator */}
              <div className="absolute top-2 right-2">
                <span
                  className={`block w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive ? `${lamp.activeBorder} bg-current shadow-[0_0_8px_currentColor]` : 'bg-[#334155]'
                  }`}
                />
              </div>

              {/* Icon */}
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-current/15' : 'bg-[#1e293b]'}`}>
                {lamp.icon}
              </div>

              {/* Label */}
              <div className="text-center">
                <div className="text-xs font-extrabold font-mono tracking-wider">
                  {lamp.label}
                </div>
                <div className="text-[9px] font-mono opacity-80 uppercase font-semibold mt-0.5">
                  {lamp.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* One-Line Plain-English Operator Status Banner */}
      <div className={`p-3 rounded-xl border text-xs font-mono transition-all duration-300 flex items-center gap-3 ${
        currentState === 'TRIPPED'
          ? 'bg-[#ef4444]/15 border-[#ef4444] text-[#ef4444]'
          : currentState === 'BYPASSED'
          ? 'bg-[#10b981]/15 border-[#10b981] text-[#10b981]'
          : currentState === 'STARTING' || currentState === 'STOPPING'
          ? 'bg-amber-500/15 border-amber-400 text-amber-300'
          : 'bg-[#0f172a] border-[#334155] text-slate-300'
      }`}>
        <div className="w-2.5 h-2.5 rounded-full bg-current shrink-0 animate-pulse" />
        <div className="leading-relaxed font-semibold">
          {getStatusText()}
        </div>
      </div>

    </div>
  );
};
