import React, { useState } from 'react';
import { Flame, Sparkles, Zap } from 'lucide-react';

interface InverterLossSankeyProps {
  Vdc: number;
  Vout_rms: number;
  Iout_rms: number;
  Pout: number;
  Ploss: number;
  Pcond_mos: number;
  Psw: number;
  Pdiode: number;
  Plc: number;
  etaPct: number;
  fc: number;
}

export const InverterLossSankey: React.FC<InverterLossSankeyProps> = ({
  Vdc = 400,
  Vout_rms = 230,
  Iout_rms = 23,
  Pout = 5290,
  Ploss = 120,
  Pcond_mos = 45,
  Psw = 40,
  Pdiode = 15,
  Plc = 20,
  etaPct = 97.8,
  fc = 5000,
}) => {
  const [activeTab, setActiveTab] = useState<'sankey' | 'freqTradeoff'>('sankey');

  const Pin = Pout + Ploss;
  const safePout = Pout ?? 5290;
  const safePloss = Ploss ?? 120;

  // Flow stroke widths
  const maxW = 40;
  const wOut = Math.max(8, (safePout / Math.max(1, Pin)) * maxW);
  const wMos = Math.max(2, (Pcond_mos / Math.max(1, Pin)) * maxW * 3);
  const wSw = Math.max(2, (Psw / Math.max(1, Pin)) * maxW * 3);
  const wDiode = Math.max(2, (Pdiode / Math.max(1, Pin)) * maxW * 3);
  const wLc = Math.max(2, (Plc / Math.max(1, Pin)) * maxW * 3);

  // Junction Temperatures Tj (°C)
  const tjMosfet = Math.round(25 + (Pcond_mos + Psw) * 0.9);
  const tjDiode = Math.round(25 + Pdiode * 1.5);
  const tjInductor = Math.round(25 + Plc * 1.2);

  // Frequency Tradeoff Points (2kHz to 20kHz)
  const freqPoints = [2, 5, 8, 12, 16, 20].map((f) => {
    const fHz = f * 1000;
    const pSwSim = (Psw * (fHz / Math.max(100, fc))).toFixed(1);
    const thdSim = (1.8 * (5000 / fHz)).toFixed(2);
    return { f, pSwSim, thdSim };
  });

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3 shadow-2xl flex flex-col gap-3 font-mono text-xs select-none">
      {/* HEADER BAR & TAB SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-extrabold text-white text-xs tracking-wide">
            POWER FLOW SANKEY DIAGRAM &amp; LOSS BREAKDOWN
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('sankey')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'sankey' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌊 Loss Sankey Diagram
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('freqTradeoff')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'freqTradeoff' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 Frequency Trade-Off (fc vs Loss)
          </button>
        </div>
      </div>

      {/* TAB 1: SANKEY DIAGRAM */}
      {activeTab === 'sankey' && (
        <div className="flex flex-col gap-3">
          <div className="w-full bg-[#030712] border-2 border-[#1e293b] rounded-xl p-2.5 relative overflow-hidden">
            <svg viewBox="0 0 740 240" className="w-full h-auto max-h-[280px]">
              <defs>
                <linearGradient id="gradPoutInv" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00e5a0" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* INPUT POWER NODE (Pin) */}
              <rect x="20" y="70" width="80" height="100" rx="10" fill="#0c1d36" stroke="#38bdf8" strokeWidth="3" />
              <text x="60" y="115" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle">
                {Pin.toFixed(0)} W
              </text>
              <text x="60" y="132" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">
                DC Pin
              </text>

              {/* MAIN OUTPUT POWER BRANCH (Pout) */}
              <path d="M 100 100 C 220 100, 320 45, 480 45" fill="none" stroke="url(#gradPoutInv)" strokeWidth={wOut} strokeOpacity="0.9" />
              <rect x="480" y="20" width="110" height="50" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="3" />
              <text x="535" y="43" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle">
                {safePout.toFixed(0)} W
              </text>
              <text x="535" y="57" fill="#34d399" fontSize="8" fontWeight="800" textAnchor="middle">
                AC Pout (η={etaPct.toFixed(1)}%)
              </text>

              {/* LOSS BRANCHES */}
              <path d="M 100 120 C 220 120, 320 95, 480 95" fill="none" stroke="#f43f5e" strokeWidth={wMos} strokeOpacity="0.8" />
              <text x="490" y="99" fill="#fb7185" fontSize="8" fontWeight="800">
                P_cond (MOS): {Pcond_mos.toFixed(1)}W
              </text>

              <path d="M 100 125 C 220 125, 320 125, 480 125" fill="none" stroke="#f59e0b" strokeWidth={wSw} strokeOpacity="0.8" />
              <text x="490" y="129" fill="#fbbf24" fontSize="8" fontWeight="800">
                P_sw (Gate): {Psw.toFixed(1)}W
              </text>

              <path d="M 100 130 C 220 130, 320 155, 480 155" fill="none" stroke="#fb923c" strokeWidth={wDiode} strokeOpacity="0.8" />
              <text x="490" y="159" fill="#fdba74" fontSize="8" fontWeight="800">
                P_diode (DeadTime): {Pdiode.toFixed(1)}W
              </text>

              <path d="M 100 135 C 220 135, 320 185, 480 185" fill="none" stroke="#c084fc" strokeWidth={wLc} strokeOpacity="0.8" />
              <text x="490" y="189" fill="#e9d5ff" fontSize="8" fontWeight="800">
                P_lc (Choke+Cap): {Plc.toFixed(1)}W
              </text>
            </svg>
          </div>

          {/* THERMAL CARDS */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 ${tjMosfet > 75 ? 'bg-rose-950/80 border-rose-500 text-rose-300' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'}`}>
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>H-Bridge MOSFET Tj</span>
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-black">{tjMosfet} °C</span>
              <span className="text-[10px] text-slate-300 font-bold">P_sw+cond: {(Pcond_mos + Psw).toFixed(1)} W</span>
            </div>

            <div className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 ${tjDiode > 75 ? 'bg-rose-950/80 border-rose-500 text-rose-300' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'}`}>
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>Diode Temp Tj</span>
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-black">{tjDiode} °C</span>
              <span className="text-[10px] text-slate-300 font-bold">P_diode: {Pdiode.toFixed(1)} W</span>
            </div>

            <div className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 ${tjInductor > 75 ? 'bg-rose-950/80 border-rose-500 text-rose-300' : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'}`}>
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>LC Choke Core Temp</span>
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-black">{tjInductor} °C</span>
              <span className="text-[10px] text-slate-300 font-bold">P_lc: {Plc.toFixed(1)} W</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FREQUENCY TRADEOFF */}
      {activeTab === 'freqTradeoff' && (
        <div className="flex flex-col gap-3">
          <div className="w-full bg-[#030712] border-2 border-[#1e293b] rounded-xl p-3">
            <div className="grid grid-cols-3 text-slate-400 font-bold text-xs border-b border-[#1e293b] pb-1.5">
              <span>Carrier f_c (kHz)</span>
              <span>Switching Loss P_sw (W)</span>
              <span>Voltage THD %</span>
            </div>
            {freqPoints.map((pt) => {
              const isSelected = pt.f === Math.round(fc / 1000);
              return (
                <div
                  key={pt.f}
                  className={`grid grid-cols-3 text-xs font-bold py-1 px-1 rounded transition-all ${
                    isSelected ? 'bg-amber-950/80 text-amber-300 border border-amber-500' : 'text-slate-300'
                  }`}
                >
                  <span>{pt.f} kHz {isSelected ? '★ (CURRENT)' : ''}</span>
                  <span className="text-rose-400">{pt.pSwSim} W (↑)</span>
                  <span className="text-cyan-300">{pt.thdSim} % (↓)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InverterLossSankey;
