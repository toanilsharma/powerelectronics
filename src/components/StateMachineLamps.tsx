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

  const lamps: { key: StarterStateKey; label: string; tooltip: string }[] = [
    {
      key: 'STOPPED',
      label: 'STOPPED',
      tooltip: 'Stopped - Motor de-energized, ready for start',
    },
    {
      key: 'STARTING',
      label: 'STARTING',
      tooltip: 'Starting - SCR voltage ramp active',
    },
    {
      key: 'RUNNING',
      label: 'RUNNING',
      tooltip: 'Running - SCR 100% full voltage',
    },
    {
      key: 'BYPASSED',
      label: 'BYPASSED',
      tooltip: 'Bypassed - KM1 bypass contactor closed',
    },
    {
      key: 'STOPPING',
      label: 'STOPPING',
      tooltip: 'Stopping - Soft stop deceleration ramp active',
    },
    {
      key: 'TRIPPED',
      label: 'TRIPPED',
      tooltip: 'Tripped - Motor thermal overload lockout active',
    },
  ];

  return (
    <div
      id="ss-state-lamps"
      className={`w-full grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-xs ${className}`}
    >
      {lamps.map((lamp) => {
        const isActive = currentState === lamp.key;
        return (
          <div
            key={lamp.key}
            title={lamp.tooltip}
            className={`flex-1 h-[44px] rounded-xl flex items-center justify-center font-bold text-xs tracking-wider transition-all cursor-pointer select-none px-2 text-center border ${
              isActive
                ? 'bg-[#10b981] border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-[1.02]'
                : 'bg-[#1f2937] border-[#374151] text-slate-400 hover:text-slate-200'
            }`}
          >
            {lamp.label}
          </div>
        );
      })}
    </div>
  );
};

export default StateMachineLamps;
