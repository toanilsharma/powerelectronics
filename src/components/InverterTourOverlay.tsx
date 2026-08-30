import React from 'react';
import { X, Sparkles, BookOpen, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

interface InverterTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  Vdc: number;
  Vout_rms: number;
  Iout_rms: number;
  ma: number;
  fc: number;
  mode: string;
  etaPct: number;
}

export const InverterTourOverlay: React.FC<InverterTourOverlayProps> = ({
  isOpen,
  onClose,
  Vdc = 400,
  Vout_rms = 230,
  Iout_rms = 23,
  ma = 0.8,
  fc = 5000,
  mode = 'UNMODULATED_SPWM',
  etaPct = 97.8,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#070b14] border-2 border-amber-500/70 text-slate-200 rounded-2xl p-5 flex flex-col gap-4 font-mono shadow-[0_0_50px_rgba(245,158,11,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-base text-white uppercase tracking-wider">
              Single-Phase Inverter Workstation &amp; Guided Tour
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

        <div className="p-3 bg-[#0b1426] border border-amber-500/40 rounded-xl flex flex-col gap-2 text-xs">
          <span className="text-amber-300 font-extrabold text-xs flex items-center gap-1.5 font-sans">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Key Engineering Concepts &amp; Operating Principles:
          </span>
          <p className="text-slate-300 font-sans leading-relaxed text-xs">
            A <strong>Single-Phase Full-Bridge Inverter (H-Bridge)</strong> converts DC electrical power into controllable AC power using four semiconductor switches (S1-S4) operated by Sinusoidal Pulse-Width Modulation (SPWM).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex flex-col gap-1">
            <span className="text-cyan-300 font-bold">1. SPWM Modulation Index (ma)</span>
            <span className="text-slate-300 font-sans leading-relaxed text-[11px]">
              Set ma = {ma}. Controls output fundamental AC voltage amplitude Vout,1 = (ma · Vdc) / √2 = {Vout_rms}V RMS.
            </span>
          </div>

          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex flex-col gap-1">
            <span className="text-emerald-300 font-bold">2. Carrier Frequency Ratio (mf)</span>
            <span className="text-slate-300 font-sans leading-relaxed text-[11px]">
              Set fc = {fc / 1000}kHz. Pushes switching harmonics to high frequencies, easily attenuated by the LC filter.
            </span>
          </div>

          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex flex-col gap-1">
            <span className="text-amber-300 font-bold">3. Dead-Time Protection (td)</span>
            <span className="text-slate-300 font-sans leading-relaxed text-[11px]">
              Inserts a microsecond delay between turning off the upper MOSFET and turning on the lower MOSFET to prevent shoot-through.
            </span>
          </div>

          <div className="p-3 bg-[#0b1220] border border-slate-800 rounded-xl flex flex-col gap-1">
            <span className="text-purple-300 font-bold">4. LC Low-Pass Filter</span>
            <span className="text-slate-300 font-sans leading-relaxed text-[11px]">
              Removes high-frequency PWM switching carrier components, providing clean sinusoidal AC voltage (THD &lt; 2%).
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2 min-h-[44px]"
        >
          <span>CLOSE WORKSTATION &amp; RETURN TO LIVE LAB</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InverterTourOverlay;
