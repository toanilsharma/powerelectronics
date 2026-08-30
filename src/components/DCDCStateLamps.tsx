import React from 'react';
import { Power, Activity, ShieldCheck, Zap, Layers, AlertTriangle } from 'lucide-react';

interface DCDCStateLampsProps {
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isEngineRunning: boolean;
  mode: string; // 'CCM' | 'DCM' | 'OFF'
  activeFault: string | null;
  duty: number;
  fsw: number;
}

export const DCDCStateLamps: React.FC<DCDCStateLampsProps> = ({
  q1Closed,
  q2Closed,
  q3Closed,
  isEngineRunning,
  mode,
  activeFault,
  duty,
  fsw,
}) => {
  const isPwmActive = isEngineRunning && q1Closed && !activeFault;

  const lamps = [
    {
      id: 'q1',
      label: '52-Q1 INFEED',
      status: q1Closed ? 'CLOSED' : 'OPEN',
      color: q1Closed
        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
        : 'bg-rose-950 text-rose-300 border-rose-500',
      icon: <Power className="w-3.5 h-3.5" />,
    },
    {
      id: 'pwm',
      label: 'GATE PWM',
      status: isPwmActive ? `${duty}% @ ${(fsw / 1000).toFixed(0)}kHz` : 'INHIBITED',
      color: isPwmActive
        ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
        : 'bg-slate-900 text-slate-400 border-slate-700',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'mode',
      label: 'CONDUCTION MODE',
      status: mode,
      color:
        mode === 'CCM'
          ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
          : mode === 'DCM'
          ? 'bg-amber-950 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
          : 'bg-slate-900 text-slate-400 border-slate-700',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'q2',
      label: '52-Q2 BATTERY',
      status: q2Closed ? 'CLOSED' : 'OPEN',
      color: q2Closed
        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
        : 'bg-rose-950 text-rose-300 border-rose-500',
      icon: <Power className="w-3.5 h-3.5" />,
    },
    {
      id: 'q3',
      label: '89-Q3 LOAD',
      status: q3Closed ? 'CLOSED' : 'OPEN',
      color: q3Closed
        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
        : 'bg-rose-950 text-rose-300 border-rose-500',
      icon: <Power className="w-3.5 h-3.5" />,
    },
    {
      id: 'fault',
      label: 'PROTECTION STATUS',
      status: activeFault ? `FAULT: ${activeFault}` : 'NORMAL (OK)',
      color: activeFault
        ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]'
        : 'bg-emerald-950 text-emerald-300 border-emerald-500',
      icon: activeFault ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    },
  ];

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 shadow-xl font-mono">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {lamps.map((lamp) => (
          <div
            key={lamp.id}
            className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all select-none ${lamp.color}`}
          >
            <div className="flex items-center gap-1 text-[10.5px] font-extrabold tracking-wider">
              {lamp.icon}
              <span>{lamp.label}</span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-tight">{lamp.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
