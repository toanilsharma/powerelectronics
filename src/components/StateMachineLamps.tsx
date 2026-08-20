import React from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Power, Activity, ShieldCheck, AlertOctagon, CheckCircle2, Zap } from 'lucide-react';

interface StateMachineLampsProps {
  engineState?: Partial<SoftStarterState>;
  engine?: Partial<SoftStarterState>;
  state?: StarterStateKey;
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
 * - 6 Lamps in a row: STOPPED, STARTING, RUNNING(SCR), BYPASSED, STOPPING, TRIPPED
 * - Active state glows brightly (its color), others are dim grey
 * - Colors: STOPPED=slate, STARTING=amber pulsing, RUNNING=cyan, BYPASSED=green, STOPPING=amber, TRIPPED=red flashing
 * - Smooth cross-fade transitions between states driven by engine.state / engineState.state
 * - Dynamic One-Line Plain-English Operator Status Banner
 */
export const StateMachineLamps: React.FC<StateMachineLampsProps> = ({
  engineState,
  engine,
  state: stateProp,
  className = '',
}) => {
  const activeEngine = engineState || engine;
  const currentState: StarterStateKey =
    stateProp ?? (activeEngine?.state as StarterStateKey) ?? 'STOPPED';

  const speedPct = Math.round((activeEngine?.w ?? 0.0) * 100.0);
  const iRmsPu = activeEngine?.IrmsPu ?? (currentState === 'STARTING' ? 3.0 : currentState === 'BYPASSED' || currentState === 'RUNNING' ? 1.0 : 0.0);
  const iFlaPct = Math.round(iRmsPu * 100.0) || (currentState === 'STARTING' ? 300 : 100);
  const vRmsPct = Math.round(activeEngine?.VrmsPct ?? (currentState === 'BYPASSED' || currentState === 'RUNNING' ? 100 : currentState === 'STARTING' ? 65 : 0));
  const thermalCapPct = Math.round(activeEngine?.thermalCapPct ?? 0.0);
  const startMode = activeEngine?.startMode ?? 'currentLimit';

  // 6 Lamp Configurations matching exact user requirements
  const lamps: LampConfig[] = [
    {
      key: 'STOPPED',
      label: 'STOPPED',
      sublabel: 'OFF / READY',
      activeBg: 'bg-slate-500/20',
      activeBorder: 'border-slate-400',
      activeText: 'text-slate-200',
      activeShadow: 'shadow-[0_0_18px_rgba(148,163,184,0.6)]',
      icon: <Power className="w-4 h-4" />,
    },
    {
      key: 'STARTING',
      label: 'STARTING',
      sublabel: 'SCR RAMP',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-400',
      activeText: 'text-amber-400',
      activeShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.7)] animate-pulse',
      icon: <Activity className="w-4 h-4 animate-spin" />,
    },
    {
      key: 'RUNNING',
      label: 'RUNNING(SCR)',
      sublabel: 'SCR FULL',
      activeBg: 'bg-cyan-500/20',
      activeBorder: 'border-cyan-400',
      activeText: 'text-cyan-400',
      activeShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.7)]',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      key: 'BYPASSED',
      label: 'BYPASSED',
      sublabel: 'KM1 CLOSED',
      activeBg: 'bg-emerald-500/20',
      activeBorder: 'border-emerald-400',
      activeText: 'text-emerald-400',
      activeShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.7)]',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      key: 'STOPPING',
      label: 'STOPPING',
      sublabel: 'SOFT DECEL',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-400',
      activeText: 'text-amber-400',
      activeShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.7)] animate-pulse',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      key: 'TRIPPED',
      label: 'TRIPPED',
      sublabel: 'OVERLOAD',
      activeBg: 'bg-red-500/25',
      activeBorder: 'border-red-500',
      activeText: 'text-red-400',
      activeShadow: 'shadow-[0_0_24px_rgba(239,68,68,0.95)] animate-pulse',
      icon: <AlertOctagon className="w-4 h-4 animate-bounce" />,
    },
  ];

  // Dynamic Plain-English Operator Status Text Generator
  const getStatusText = (): string => {
    switch (currentState) {
      case 'STOPPED':
        return 'Stopped — Motor de-energized, ready for start command.';
      case 'STARTING':
        return `Starting — current limit active at ${iFlaPct}% FLA, speed ${speedPct}%`;
      case 'RUNNING':
        return `Running — SCR phase angle 0°, full voltage applied (100% V) at ${speedPct}% speed, preparing for KM1 bypass.`;
      case 'BYPASSED':
        return `Bypassed — KM1 bypass contactor closed, SCR losses 0 W, motor operating directly across line at ${speedPct}% speed.`;
      case 'STOPPING':
        return `Soft Stopping — Controlled deceleration ramp down (${vRmsPct}% V), speed ${speedPct}%, preventing water hammer.`;
      case 'TRIPPED':
        return `Tripped — Thermal overload protection activated (${thermalCapPct}% thermal capacity), motor lockout active. Press Reset to clear.`;
      default:
        return 'Ready';
    }
  };

  return (
    <div id="ss-state-lamps" className={`bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 font-mono ${className}`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs text-[#8b949e]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#06b6d4] animate-ping" />
          <span className="font-bold text-white uppercase tracking-wider">ANNUNCIATOR STATE MACHINE PANEL</span>
        </div>
        <div className="text-[11px] text-[#38bdf8] font-semibold">
          MOTOR SPEED: <span className="text-white font-bold">{speedPct}%</span> ({Math.round((speedPct / 100) * 1480)} RPM)
        </div>
      </div>

      {/* 6 Annunciator Lamps Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {lamps.map((lamp) => {
          const isActive = currentState === lamp.key;

          return (
            <div
              key={lamp.key}
              className={`relative rounded-xl p-3.5 border transition-all duration-500 ease-in-out flex flex-col items-center justify-center space-y-2 cursor-default select-none ${
                isActive
                  ? `${lamp.activeBg} ${lamp.activeBorder} ${lamp.activeText} ${lamp.activeShadow} z-10 scale-[1.02]`
                  : 'bg-[#0f172a]/60 border-[#334155]/50 text-[#475569] opacity-40 shadow-none hover:opacity-60'
              }`}
            >
              {/* Top Status LED Dot Indicator */}
              <div className="absolute top-2.5 right-2.5">
                <span
                  className={`block w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    isActive
                      ? `${lamp.activeBorder} bg-current shadow-[0_0_10px_currentColor]`
                      : 'bg-[#1e293b] border border-[#334155]'
                  }`}
                />
              </div>

              {/* Icon */}
              <div className={`p-2 rounded-lg transition-all duration-500 ${isActive ? 'bg-current/15 text-current' : 'bg-[#1e293b] text-[#475569]'}`}>
                {lamp.icon}
              </div>

              {/* Label */}
              <div className="text-center">
                <div className="text-xs font-extrabold tracking-wider truncate">
                  {lamp.label}
                </div>
                <div className="text-[9px] opacity-80 uppercase font-semibold mt-0.5">
                  {lamp.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* One-Line Plain-English Operator Status Banner */}
      <div className={`p-3 rounded-xl border text-xs transition-all duration-500 flex items-center gap-3 ${
        currentState === 'TRIPPED'
          ? 'bg-red-500/15 border-red-500/60 text-red-400'
          : currentState === 'BYPASSED'
          ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
          : currentState === 'RUNNING'
          ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
          : currentState === 'STARTING' || currentState === 'STOPPING'
          ? 'bg-amber-500/15 border-amber-400/60 text-amber-300'
          : 'bg-[#161b22] border-[#30363d] text-slate-300'
      }`}>
        <div className="w-2.5 h-2.5 rounded-full bg-current shrink-0 animate-pulse" />
        <div className="leading-relaxed font-semibold">
          {getStatusText()}
        </div>
      </div>

    </div>
  );
};

export default StateMachineLamps;
