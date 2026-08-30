import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ShieldCheck,
  Zap,
  Power,
  Layers,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sliders,
  Bell,
  RefreshCw,
} from 'lucide-react';

interface DCDCSwitchgearDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  topology: string;
  Vin: number;
  duty: number;
  fsw: number;
  Vout: number;
  Iout: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  onToggleQ1: () => void;
  onToggleQ2: () => void;
  onToggleQ3: () => void;
}

export const DCDCSwitchgearDrawer: React.FC<DCDCSwitchgearDrawerProps> = ({
  isOpen,
  onClose,
  topology,
  Vin,
  duty,
  fsw,
  Vout,
  Iout,
  q1Closed,
  q2Closed,
  q3Closed,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
}) => {
  // Protection Relay Pickups
  const [ovpPickup, setOvpPickup] = useState(30);
  const [uvpPickup, setUvpPickup] = useState(12);
  const [ocpPickup, setOcpPickup] = useState(15);
  const [otpPickup, setOtpPickup] = useState(75);

  // Warning & Interlock Messages
  const [interlockWarning, setInterlockWarning] = useState<string | null>(null);
  const [alarmLogs, setAlarmLogs] = useState<string[]>([
    'SYSTEM INITIALIZED: Protection Relays Armed (IEEE 946 / IEC 62040-3).',
  ]);

  // SOP Sequence Tracker
  const [sopStep, setSopStep] = useState(1);

  if (!isOpen) return null;

  const Vout_abs = Math.abs(Vout);
  const tjEst = Math.round(25 + Iout * 3.5);

  // Live Margin Calculations (%)
  const ovpMargin = Math.max(0, Math.min(100, ((ovpPickup - Vout_abs) / ovpPickup) * 100));
  const uvpMargin = Math.max(0, Math.min(100, ((Vout_abs - uvpPickup) / Math.max(1, Vout_abs)) * 100));
  const ocpMargin = Math.max(0, Math.min(100, ((ocpPickup - Iout) / ocpPickup) * 100));
  const otpMargin = Math.max(0, Math.min(100, ((otpPickup - tjEst) / otpPickup) * 100));

  // Protection Relay Trip Checks
  const isOvpTripped = Vout_abs > ovpPickup;
  const isUvpTripped = q1Closed && q2Closed && Vout_abs < uvpPickup;
  const isOcpTripped = Iout > ocpPickup;
  const isOtpTripped = tjEst > otpPickup;

  const handleAttemptToggleQ1 = () => {
    if (q1Closed && Iout > 2.0) {
      setInterlockWarning(`⚠️ ARC FLASH WARNING: Opening 52-Q1 under load (${Iout.toFixed(1)}A) risks dangerous switching arc! Open 89-Q3 first.`);
      setAlarmLogs((prev) => [`[${new Date().toLocaleTimeString()}] WARNING: 52-Q1 Opened under load!`, ...prev]);
    } else {
      setInterlockWarning(null);
    }
    onToggleQ1();
  };

  const handleAttemptToggleQ3 = () => {
    if (!q3Closed && !q1Closed) {
      setInterlockWarning('⛔ INTERLOCK LOCKOUT: Main Infeed 52-Q1 must be CLOSED before closing Load Disconnector 89-Q3!');
      setAlarmLogs((prev) => [`[${new Date().toLocaleTimeString()}] INTERLOCK VIOLATION: Tried closing 89-Q3 without 52-Q1!`, ...prev]);
      return;
    }
    setInterlockWarning(null);
    onToggleQ3();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end transition-opacity font-mono select-none">
      <div className="w-full max-w-lg h-full bg-[#070b14] border-l-2 border-blue-500/60 p-5 flex flex-col gap-4 shadow-2xl overflow-y-auto">
        {/* DRAWER HEADER */}
        <div className="flex items-center justify-between border-b-2 border-[#1e293b] pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Switchgear, SOP &amp; Protection Relays</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INTERLOCK WARNING BANNER */}
        {interlockWarning && (
          <div className="p-3 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 font-sans text-xs font-bold leading-relaxed shadow-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{interlockWarning}</span>
          </div>
        )}

        {/* SECTION 1: INTERLOCKED BREAKER CONTROLS */}
        <div className="flex flex-col gap-2.5 bg-[#0b1220] p-3.5 rounded-xl border border-blue-900/60 text-xs">
          <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 border-b border-[#1e293b] pb-2">
            <Power className="w-4 h-4 text-emerald-400" /> Interlocked Breaker Controls (IEEE 946):
          </span>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {/* 52-Q1 Main Infeed Breaker */}
            <button
              type="button"
              onClick={handleAttemptToggleQ1}
              className={`p-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer flex items-center justify-between ${
                q1Closed ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <div>
                <div className="font-extrabold">52-Q1 DC Input Infeed Breaker</div>
                <div className="text-[10px] text-slate-400 font-normal">Rating: 400A 500VDC 25kA Icu</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded border uppercase font-extrabold">{q1Closed ? 'CLOSED' : 'OPEN'}</span>
            </button>

            {/* 52-Q2 Converter Bus Breaker */}
            <button
              type="button"
              onClick={onToggleQ2}
              className={`p-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer flex items-center justify-between ${
                q2Closed ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <div>
                <div className="font-extrabold">52-Q2 Converter Bus Breaker</div>
                <div className="text-[10px] text-slate-400 font-normal">Rating: 250A 250VDC 2-Pole</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded border uppercase font-extrabold">{q2Closed ? 'CLOSED' : 'OPEN'}</span>
            </button>

            {/* 89-Q3 Load Disconnect Isolator */}
            <button
              type="button"
              onClick={handleAttemptToggleQ3}
              className={`p-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer flex items-center justify-between ${
                q3Closed ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <div>
                <div className="font-extrabold">89-Q3 Load Disconnect Isolator</div>
                <div className="text-[10px] text-slate-400 font-normal">Interlocked: Requires 52-Q1 CLOSED</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded border uppercase font-extrabold">{q3Closed ? 'CLOSED' : 'OPEN'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: PROTECTION RELAYS (OVP / UVP / OCP / OTP) WITH MARGIN BARS */}
        <div className="flex flex-col gap-3 bg-[#0b1220] p-3.5 rounded-xl border border-blue-900/60 text-xs">
          <span className="text-amber-400 font-extrabold flex items-center gap-1.5 border-b border-[#1e293b] pb-2">
            <Sliders className="w-4 h-4 text-amber-400" /> Protection Relays &amp; Pickup Margins:
          </span>

          {/* OVP RELAY */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Over-Voltage (OVP) Pickup:</span>
              <span className="text-amber-300 font-black">{ovpPickup} V</span>
            </div>
            <input
              type="range"
              min="20"
              max="60"
              step="1"
              value={ovpPickup}
              onChange={(e) => setOvpPickup(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="w-full bg-slate-900 rounded-lg h-2 overflow-hidden border border-slate-700 mt-0.5">
              <div
                className={`h-full transition-all ${isOvpTripped ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}
                style={{ width: `${ovpMargin}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold self-end">OVP Margin: {ovpMargin.toFixed(0)}%</span>
          </div>

          {/* UVP RELAY */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Under-Voltage (UVP) Pickup:</span>
              <span className="text-cyan-300 font-black">{uvpPickup} V</span>
            </div>
            <input
              type="range"
              min="8"
              max="25"
              step="1"
              value={uvpPickup}
              onChange={(e) => setUvpPickup(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="w-full bg-slate-900 rounded-lg h-2 overflow-hidden border border-slate-700 mt-0.5">
              <div
                className={`h-full transition-all ${isUvpTripped ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500'}`}
                style={{ width: `${uvpMargin}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold self-end">UVP Margin: {uvpMargin.toFixed(0)}%</span>
          </div>

          {/* OCP RELAY */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Over-Current (OCP) Pickup:</span>
              <span className="text-rose-400 font-black">{ocpPickup} A</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={ocpPickup}
              onChange={(e) => setOcpPickup(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="w-full bg-slate-900 rounded-lg h-2 overflow-hidden border border-slate-700 mt-0.5">
              <div
                className={`h-full transition-all ${isOcpTripped ? 'bg-rose-500 animate-pulse' : 'bg-rose-400'}`}
                style={{ width: `${ocpMargin}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold self-end">OCP Margin: {ocpMargin.toFixed(0)}%</span>
          </div>

          {/* OTP RELAY */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Over-Temp (OTP) Pickup:</span>
              <span className="text-purple-300 font-black">{otpPickup} °C</span>
            </div>
            <input
              type="range"
              min="50"
              max="110"
              step="1"
              value={otpPickup}
              onChange={(e) => setOtpPickup(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="w-full bg-slate-900 rounded-lg h-2 overflow-hidden border border-slate-700 mt-0.5">
              <div
                className={`h-full transition-all ${isOtpTripped ? 'bg-rose-500 animate-pulse' : 'bg-purple-400'}`}
                style={{ width: `${otpMargin}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold self-end">OTP Margin: {otpMargin.toFixed(0)}%</span>
          </div>
        </div>

        {/* SECTION 3: STEP-BY-STEP SOP COMMISSIONING CHECKLIST */}
        <div className="flex flex-col gap-2.5 bg-[#0b1220] p-3.5 rounded-xl border border-blue-900/60 text-xs">
          <span className="text-cyan-300 font-extrabold flex items-center gap-1.5 border-b border-[#1e293b] pb-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Step-by-Step SOP Commissioning Checklist:
          </span>

          <div className="flex flex-col gap-2 text-[11px] pt-1">
            <div className={`p-2 rounded-lg border flex items-center justify-between ${Vin >= 12 && Vin <= 400 ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <span>Step 1: Verify Input Vin ({Vin}V DC) in range</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className={`p-2 rounded-lg border flex items-center justify-between ${q1Closed ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <span>Step 2: Close 52-Q1 DC Input Breaker</span>
              {q1Closed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-500">PENDING</span>}
            </div>

            <div className={`p-2 rounded-lg border flex items-center justify-between ${q2Closed ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <span>Step 3: Close 52-Q2 Converter Bus Breaker</span>
              {q2Closed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-500">PENDING</span>}
            </div>

            <div className={`p-2 rounded-lg border flex items-center justify-between ${q3Closed ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <span>Step 4: Close 89-Q3 Load Disconnect Isolator</span>
              {q3Closed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-500">PENDING</span>}
            </div>
          </div>
        </div>

        {/* SECTION 4: REAL-TIME ALARM & ANNOUNCEMENT LOG */}
        <div className="flex flex-col gap-2 bg-[#0b1220] p-3.5 rounded-xl border border-blue-900/60 text-xs">
          <span className="text-rose-400 font-extrabold flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-rose-400" /> Alarm Annunciator Log:
            </span>
            <button
              type="button"
              onClick={() => setAlarmLogs([])}
              className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Log
            </button>
          </span>

          <div className="max-h-28 overflow-y-auto flex flex-col gap-1 text-[10px] font-mono text-slate-300 pt-1">
            {alarmLogs.map((log, idx) => (
              <div key={idx} className="p-1 rounded bg-[#050914] border border-[#1e293b]">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DCDCSwitchgearDrawer;
