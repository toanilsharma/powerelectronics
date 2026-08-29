import React, { useState } from 'react';
import { SoftStarterFaults } from '../types/softStarter';
import { AlertTriangle, ShieldAlert, RotateCcw, Zap, Info, ShieldCheck } from 'lucide-react';
import { ProtectionRelay } from '../types/batteryCharger';

interface SoftStarterFaultPanelProps {
  faults: SoftStarterFaults;
  onTriggerFault: (key: keyof SoftStarterFaults) => void;
  onResetFaults?: () => void;
  relays?: ProtectionRelay[];
  tripsCount?: number;
  isTrip?: boolean;
}

const TOOLTIPS: Record<string, string> = {
  '50/51': '50/51 = Instantaneous Overcurrent >500% FLA / 10ms',
  '48': '48 = Incomplete Sequence / Start Timeout',
  '47/46': '47/46 = Phase Loss / Single Phasing',
  '52G': '52b = Bypass Contactor SCR Short Interlock',
  '52b': '52b = Bypass Contactor SCR Short Interlock',
};

export const SoftStarterFaultPanel: React.FC<SoftStarterFaultPanelProps> = ({
  faults,
  onTriggerFault,
  onResetFaults,
  relays,
  tripsCount = 0,
  isTrip = false,
}) => {
  const [hoveredRelay, setHoveredRelay] = useState<string | null>(null);

  const defaultRelays: ProtectionRelay[] = [
    { code: '50/51', name: 'Instantaneous Overcurrent', status: faults.overcurrent ? 'OPERATED' : 'ARMED', setting: '>500% FLA / 10ms' },
    { code: '48', name: 'Incomplete Sequence', status: faults.startTimeout ? 'OPERATED' : 'ARMED', setting: '>60s Stall' },
    { code: '47/46', name: 'Phase Loss / Imbalance', status: faults.phaseLoss ? 'OPERATED' : 'ARMED', setting: 'Single Phasing / 3s' },
    { code: '52b', name: 'SCR Short Interlock', status: faults.scrShort ? 'OPERATED' : 'ARMED', setting: 'SCR Failure Interlock' },
  ];

  const activeRelays = relays && relays.length > 0 ? relays : defaultRelays;

  // Active Trip Banner message calculation
  let activeTripMessage = '';
  if (faults.overcurrent) {
    activeTripMessage = 'TRIP: 50/51 OVERCURRENT (>500% FLA)';
  } else if (faults.startTimeout) {
    activeTripMessage = 'TRIP: 48 START TIMEOUT (>60s STALL)';
  } else if (faults.phaseLoss) {
    activeTripMessage = 'TRIP: 47/46 PHASE LOSS (SINGLE PHASING)';
  } else if (faults.scrShort) {
    activeTripMessage = 'TRIP: 52b SCR SHORT CIRCUIT INTERLOCK';
  } else if (isTrip) {
    activeTripMessage = 'TRIP: PROTECTION RELAY OPERATED';
  }

  return (
    <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-4 font-mono text-xs select-none shadow-xl">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .fault-card.active {
          border-color: #ff4d6d !important;
          background: #2a1418 !important;
          animation: shake 0.3s ease-in-out;
          box-shadow: 0 0 16px rgba(255, 77, 109, 0.4);
        }
      `}</style>

      {/* TOP HEADER WITH RESET BUTTON & TRIPS COUNTER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span>PROTECTION RELAYS & FAULT INJECTION MATRIX</span>
        </div>

        <div className="flex items-center gap-3">
          {/* TRIPS COUNTER BADGE IN TOP RIGHT */}
          <div className="px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-300 text-xs font-extrabold flex items-center gap-1.5 shadow-md">
            <span>TRIPS:</span>
            <span className="text-white text-sm bg-red-600 px-2 py-0.5 rounded-md font-mono">
              {tripsCount}
            </span>
          </div>

          {/* MANUAL RESET FAULTS & RELAYS BUTTON */}
          <button
            onClick={onResetFaults}
            className={`min-h-[50px] px-6 py-2.5 rounded-2xl font-black text-xs tracking-wider flex items-center gap-2.5 shadow-2xl transition-all cursor-pointer border-2 ${
              isTrip || tripsCount > 0
                ? 'bg-[#00e5a0] hover:bg-[#00c98c] text-[#04060a] border-[#00ffb7] shadow-[0_0_22px_rgba(0,229,160,0.6)] animate-pulse active:scale-95'
                : 'bg-[#121a29] hover:bg-[#1e293b] text-[#00e5a0] border-[#00e5a0] shadow-[0_0_12px_rgba(0,229,160,0.2)] active:scale-95'
            }`}
          >
            <RotateCcw className="w-5 h-5 shrink-0" />
            <span>RESET FAULTS & RELAYS</span>
          </button>
        </div>
      </div>

      {/* ACTIVE RED TRIP BANNER */}
      {activeTripMessage && (
        <div className="w-full bg-red-950/90 border-2 border-red-500 rounded-xl p-3 text-red-200 text-sm font-extrabold flex items-center justify-between shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>🚨 {activeTripMessage}</span>
          </div>
          <span className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold">
            MANUAL RESET REQUIRED
          </span>
        </div>
      )}

      {/* 4 FAULT BUTTON CARDS MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CARD 1: SCR SHORT CIRCUIT */}
        <button
          onClick={() => onTriggerFault('scrShort')}
          className={`fault-card p-4 rounded-2xl border text-xs font-bold flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[110px] justify-center ${
            faults.scrShort
              ? 'active text-red-200'
              : 'bg-[#070a10] border-[#1e293b] text-slate-200 hover:border-red-500/60 hover:bg-[#121a29]'
          }`}
        >
          <Zap className={`w-6 h-6 ${faults.scrShort ? 'text-red-400 animate-bounce' : 'text-red-400'}`} />
          <span className="text-xs font-extrabold">SCR SHORT CIRCUIT</span>
          <span className="text-[11px] opacity-80 font-normal text-slate-400">
            Bypass KM1 Locked / Thyristor Short
          </span>
        </button>

        {/* CARD 2: OVERCURRENT >500% */}
        <button
          onClick={() => onTriggerFault('overcurrent')}
          className={`fault-card p-4 rounded-2xl border text-xs font-bold flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[110px] justify-center ${
            faults.overcurrent
              ? 'active text-red-200'
              : 'bg-[#070a10] border-[#1e293b] text-slate-200 hover:border-red-500/60 hover:bg-[#121a29]'
          }`}
        >
          <ShieldAlert className={`w-6 h-6 ${faults.overcurrent ? 'text-amber-400 animate-bounce' : 'text-amber-400'}`} />
          <span className="text-xs font-extrabold">OVERCURRENT (&gt;500%)</span>
          <span className="text-[11px] opacity-80 font-normal text-slate-400">
            I &gt; 500% FLA Immediate Trip
          </span>
        </button>

        {/* CARD 3: START TIMEOUT >60s */}
        <button
          onClick={() => onTriggerFault('startTimeout')}
          className={`fault-card p-4 rounded-2xl border text-xs font-bold flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[110px] justify-center ${
            faults.startTimeout
              ? 'active text-red-200'
              : 'bg-[#070a10] border-[#1e293b] text-slate-200 hover:border-red-500/60 hover:bg-[#121a29]'
          }`}
        >
          <AlertTriangle className={`w-6 h-6 ${faults.startTimeout ? 'text-orange-400 animate-bounce' : 'text-orange-400'}`} />
          <span className="text-xs font-extrabold">START TIMEOUT (&gt;60s)</span>
          <span className="text-[11px] opacity-80 font-normal text-slate-400">
            Stalled Rotor / Ramp Exceeded
          </span>
        </button>

        {/* CARD 4: PHASE LOSS */}
        <button
          onClick={() => onTriggerFault('phaseLoss')}
          className={`fault-card p-4 rounded-2xl border text-xs font-bold flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[110px] justify-center ${
            faults.phaseLoss
              ? 'active text-red-200'
              : 'bg-[#070a10] border-[#1e293b] text-slate-200 hover:border-red-500/60 hover:bg-[#121a29]'
          }`}
        >
          <Zap className={`w-6 h-6 ${faults.phaseLoss ? 'text-yellow-400 animate-bounce' : 'text-yellow-400'}`} />
          <span className="text-xs font-extrabold">PHASE LOSS (SINGLE PHASING)</span>
          <span className="text-[11px] opacity-80 font-normal text-slate-400">
            Missing Line Phase Trip in 3s
          </span>
        </button>
      </div>

      {/* ANSI RELAY ANNUNCIATOR TABLE WITH 12px FONT & HOVER TOOLTIPS */}
      <div className="bg-[#070a10] border border-[#1e293b] rounded-2xl overflow-hidden shadow-inner">
        <div className="bg-[#0d131f] px-4 py-3 text-xs font-bold text-slate-200 border-b border-[#1e293b] flex justify-between items-center">
          <span>ANSI / IEEE PROTECTION RELAY ANNUNCIATOR STATUS</span>
          <span className="text-[11px] text-slate-400 font-normal flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> Hover over relays for ANSI specification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4">
          {activeRelays.map((r, idx) => {
            const tooltipText = TOOLTIPS[r.code] || `${r.code} = ${r.name} (${r.setting})`;
            const isHovered = hoveredRelay === r.code;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredRelay(r.code)}
                onMouseLeave={() => setHoveredRelay(null)}
                className={`relative p-3.5 rounded-xl border transition-all ${
                  r.status === 'OPERATED'
                    ? 'bg-red-950/90 border-red-500 text-red-200 shadow-md ring-1 ring-red-500/40'
                    : 'bg-[#0d131f] border-[#1e293b] text-slate-200 hover:border-[#38bdf8]'
                }`}
              >
                {/* 12px Font & Relay Code */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#121a29] text-xs font-mono font-extrabold border border-[#1e293b] text-cyan-300">
                    {r.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                      r.status === 'OPERATED'
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-emerald-950 text-[#00e5a0] border border-[#00e5a0]/40'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="text-xs font-bold text-white mb-1 leading-snug">{r.name}</div>
                <div className="text-xs text-slate-400 font-mono">{r.setting}</div>

                {/* HOVER TOOLTIP CARD */}
                {isHovered && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 p-2.5 bg-[#070a10] border border-[#00e5a0]/60 rounded-xl text-xs text-[#00e5a0] font-mono shadow-2xl z-30 pointer-events-none backdrop-blur-md">
                    <div className="font-extrabold mb-0.5">{r.code} Standard Spec:</div>
                    <div className="text-slate-200 text-[11px] leading-tight">{tooltipText}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
