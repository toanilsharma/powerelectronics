import React from 'react';
import { SoftStarterFaults } from '../types/softStarter';
import { AlertTriangle, ShieldAlert, RotateCcw, Zap } from 'lucide-react';
import { ProtectionRelay } from '../types/batteryCharger';

interface SoftStarterFaultPanelProps {
  faults: SoftStarterFaults;
  onTriggerFault: (key: keyof SoftStarterFaults) => void;
  onResetFaults: () => void;
  relays: ProtectionRelay[];
}

export const SoftStarterFaultPanel: React.FC<SoftStarterFaultPanelProps> = ({
  faults,
  onTriggerFault,
  onResetFaults,
  relays,
}) => {
  return (
    <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-4 font-mono text-xs select-none shadow-xl">
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>PROTECTION RELAYS & FAULT INJECTION MATRIX</span>
        </div>
        <button
          onClick={onResetFaults}
          className="px-3.5 py-1.5 rounded-xl bg-[#121a29] hover:bg-[#1e293b] text-[#00e5a0] border border-[#00e5a0]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          RESET FAULTS & RELAYS
        </button>
      </div>

      {/* FAULT BUTTON MATRIX */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onTriggerFault('scrShort')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
            faults.scrShort
              ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-lg'
              : 'bg-[#070a10] border-[#1e293b] text-slate-300 hover:border-red-500/60'
          }`}
        >
          <Zap className="w-5 h-5 text-red-400" />
          <span>SCR SHORT CIRCUIT</span>
          <span className="text-[10px] opacity-75 font-normal">Bypass KM1 Locked / Thyristor Short</span>
        </button>

        <button
          onClick={() => onTriggerFault('overcurrent')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
            faults.overcurrent
              ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-lg'
              : 'bg-[#070a10] border-[#1e293b] text-slate-300 hover:border-red-500/60'
          }`}
        >
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>OVERCURRENT (&gt;500%)</span>
          <span className="text-[10px] opacity-75 font-normal">I &gt; 500% FLA Immediate Trip</span>
        </button>

        <button
          onClick={() => onTriggerFault('startTimeout')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
            faults.startTimeout
              ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-lg'
              : 'bg-[#070a10] border-[#1e293b] text-slate-300 hover:border-red-500/60'
          }`}
        >
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <span>START TIMEOUT (&gt;60s)</span>
          <span className="text-[10px] opacity-75 font-normal">Stalled Rotor / Ramp Time Exceeded</span>
        </button>

        <button
          onClick={() => onTriggerFault('phaseLoss')}
          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
            faults.phaseLoss
              ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-lg'
              : 'bg-[#070a10] border-[#1e293b] text-slate-300 hover:border-red-500/60'
          }`}
        >
          <Zap className="w-5 h-5 text-yellow-400" />
          <span>PHASE LOSS (SINGLE PHASING)</span>
          <span className="text-[10px] opacity-75 font-normal">Missing Line Phase Trip in 3s</span>
        </button>
      </div>

      {/* PROTECTION RELAYS ANNUNCIATOR TABLE */}
      <div className="bg-[#070a10] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="bg-[#0d131f] px-3.5 py-2.5 text-xs font-bold text-slate-300 border-b border-[#1e293b]">
          ANSI / IEEE PROTECTION RELAY ANNUNCIATOR STATUS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5">
          {relays.map((r, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                r.status === 'OPERATED'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-[#0d131f] border-[#1e293b] text-slate-300'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#121a29] text-[10px] font-mono border border-[#1e293b]">
                    {r.code}
                  </span>
                  {r.name}
                </div>
                <div className="text-[10px] opacity-75 mt-0.5">{r.setting}</div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                  r.status === 'OPERATED' ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-950 text-[#00e5a0] border border-[#00e5a0]/40'
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
