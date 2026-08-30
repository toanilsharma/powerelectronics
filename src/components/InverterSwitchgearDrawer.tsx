import React from 'react';
import { X, ShieldCheck, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InverterSwitchgearDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  q1Closed: boolean;
  setQ1Closed: (closed: boolean) => void;
  q2Closed: boolean;
  setQ2Closed: (closed: boolean) => void;
  q3Closed: boolean;
  setQ3Closed: (closed: boolean) => void;
  isEngineRunning: boolean;
  onStartEngine: () => void;
  onStopEngine: () => void;
}

export const InverterSwitchgearDrawer: React.FC<InverterSwitchgearDrawerProps> = ({
  isOpen,
  onClose,
  q1Closed,
  setQ1Closed,
  q2Closed,
  setQ2Closed,
  q3Closed,
  setQ3Closed,
  isEngineRunning,
  onStartEngine,
  onStopEngine,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#070b14] border-l-2 border-[#1e293b] text-slate-200 h-full p-4 flex flex-col gap-4 font-mono overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-extrabold text-sm text-white uppercase tracking-wider">
              Inverter Switchgear &amp; SOP Workstation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-[#0b1426] border border-cyan-500/40 rounded-xl flex flex-col gap-2 text-xs">
          <span className="text-cyan-300 font-extrabold flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            Standard Operating Procedure (SOP) Checklist:
          </span>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-sans leading-relaxed">
            <li>Verify DC Link voltage Vdc = 400V DC is energized.</li>
            <li>Close 52-Q1 DC Input Main Air Circuit Breaker.</li>
            <li>Enable PWM Gate Firing Engine (Soft-Start 0.1 → 0.8 ma).</li>
            <li>Close 52-Q2 AC Output Isolation Breaker once Vout reaches 230V RMS.</li>
            <li>Close 89-Q3 Substation Load Disconnector to energize downstream AC load.</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Switchgear Operations</h4>
          
          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs">52-Q1 DC Input Breaker</span>
              <span className="text-[10px] text-slate-400">IEC 60947-2 400A 1000VDC</span>
            </div>
            <button
              type="button"
              onClick={() => setQ1Closed(!q1Closed)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                q1Closed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {q1Closed ? 'CLOSED' : 'OPEN'}
            </button>
          </div>

          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs">52-Q2 AC Output Breaker</span>
              <span className="text-[10px] text-slate-400">IEC 60947-2 100A 415VAC</span>
            </div>
            <button
              type="button"
              onClick={() => setQ2Closed(!q2Closed)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                q2Closed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {q2Closed ? 'CLOSED' : 'OPEN'}
            </button>
          </div>

          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs">89-Q3 Substation Load Disconnector</span>
              <span className="text-[10px] text-slate-400">Substation Load Isolator</span>
            </div>
            <button
              type="button"
              onClick={() => setQ3Closed(!q3Closed)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                q3Closed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {q3Closed ? 'CLOSED' : 'OPEN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InverterSwitchgearDrawer;
