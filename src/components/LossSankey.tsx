import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  Flame,
  Gauge,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';

interface LossSankeyProps {
  Vin: number;
  Vout: number;
  Iout: number;
  duty: number;
  fsw: number;
  Pout: number;
  Ploss: number;
  etaPct: number;
  Pcond_mos?: number;
  Pcond_diode?: number;
  Pcond_dcr?: number;
  Pcond_esr?: number;
  Psw?: number;
  Pgate?: number;
  Pcore?: number;
}

export const LossSankey: React.FC<LossSankeyProps> = ({
  Vin,
  Vout,
  Iout,
  duty,
  fsw,
  Pout,
  Ploss,
  etaPct,
  Pcond_mos = Ploss * 0.35,
  Pcond_diode = Ploss * 0.25,
  Pcond_dcr = Ploss * 0.15,
  Pcond_esr = Ploss * 0.05,
  Psw = Ploss * 0.15,
  Pgate = Ploss * 0.02,
  Pcore = Ploss * 0.03,
}) => {
  const [activeTab, setActiveTab] = useState<'sankey' | 'freqTradeoff'>('sankey');

  const Pin = Pout + Ploss;
  const Vout_abs = Math.abs(Vout);

  // Frequency Trade-Off Points (20kHz to 200kHz)
  const freqPoints = [20, 35, 50, 75, 100, 150, 200].map((f) => {
    const fHz = f * 1000;
    const pSwSim = (Psw * (fHz / fsw)).toFixed(2);
    const rippleSim = ((1000 / f) * 0.8).toFixed(1);
    return { f, pSwSim, rippleSim };
  });

  // Calculate flow stroke widths proportional to power (scaled for SVG rendering)
  const maxW = 40;
  const wOut = Math.max(8, (Pout / Math.max(1, Pin)) * maxW);
  const wMos = Math.max(2, (Pcond_mos / Math.max(1, Pin)) * maxW * 3);
  const wSw = Math.max(2, (Psw / Math.max(1, Pin)) * maxW * 3);
  const wDiode = Math.max(2, (Pcond_diode / Math.max(1, Pin)) * maxW * 3);
  const wCore = Math.max(2, ((Pcond_dcr + Pcore) / Math.max(1, Pin)) * maxW * 3);
  const wEsr = Math.max(2, (Pcond_esr / Math.max(1, Pin)) * maxW * 3);

  // Thermal Junction Temperature Calculations
  const tjMosfet = Math.round(25 + Pcond_mos * 2.5 + Psw * 2.0);
  const tjDiode = Math.round(25 + Pcond_diode * 3.0);
  const tjInductor = Math.round(25 + (Pcond_dcr + Pcore) * 2.0);

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 font-mono text-xs select-none">
      {/* HEADER BAR & TAB SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
            POWER FLOW SANKEY DIAGRAM &amp; FREQUENCY TRADE-OFF
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('sankey')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'sankey'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌊 Loss Sankey Diagram
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('freqTradeoff')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'freqTradeoff'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 Frequency Trade-Off (fsw vs P_sw)
          </button>
        </div>
      </div>

      {/* TAB 1: ANIMATED SANKEY DIAGRAM & THERMAL TINTING */}
      {activeTab === 'sankey' && (
        <div className="flex flex-col gap-3">
          {/* SANKEY DIAGRAM CANVAS */}
          <div className="w-full bg-[#030712] border-2 border-[#1e293b] rounded-xl p-2.5 relative overflow-hidden">
            <svg viewBox="0 0 740 260" className="w-full h-auto max-h-[300px]">
              <defs>
                <linearGradient id="gradPin" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#00e5a0" />
                </linearGradient>
                <linearGradient id="gradPout" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00e5a0" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="sankeyGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* INPUT POWER NODE (Pin) */}
              <rect x="20" y="80" width="80" height="100" rx="10" fill="#0c1d36" stroke="#38bdf8" strokeWidth="3" filter="url(#sankeyGlow)" />
              <text x="60" y="125" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
                {Pin.toFixed(1)} W
              </text>
              <text x="60" y="142" fill="#38bdf8" fontSize="9" fontWeight="800" textAnchor="middle">
                INPUT Pin
              </text>

              {/* MAIN OUTPUT POWER BRANCH (Pout) */}
              <path
                d="M 100 110 C 220 110, 320 50, 480 50"
                fill="none"
                stroke="url(#gradPout)"
                strokeWidth={wOut}
                strokeOpacity="0.9"
                filter="url(#sankeyGlow)"
              />
              <rect x="480" y="25" width="110" height="50" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="3" />
              <text x="535" y="48" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
                {Pout.toFixed(1)} W
              </text>
              <text x="535" y="62" fill="#34d399" fontSize="9" fontWeight="800" textAnchor="middle">
                USEFUL Pout (η={etaPct.toFixed(1)}%)
              </text>

              {/* LOSS BRANCHES */}
              {/* Branch 1: MOSFET Conduction Loss */}
              <path d="M 100 130 C 220 130, 320 100, 480 100" fill="none" stroke="#f43f5e" strokeWidth={wMos} strokeOpacity="0.8" />
              <text x="490" y="104" fill="#fb7185" fontSize="9" fontWeight="800">
                P_cond (MOS): {Pcond_mos.toFixed(2)}W
              </text>

              {/* Branch 2: Switching Loss */}
              <path d="M 100 135 C 220 135, 320 130, 480 130" fill="none" stroke="#f59e0b" strokeWidth={wSw} strokeOpacity="0.8" />
              <text x="490" y="134" fill="#fbbf24" fontSize="9" fontWeight="800">
                P_sw (Gate): {Psw.toFixed(2)}W
              </text>

              {/* Branch 3: Diode Conduction Loss */}
              <path d="M 100 140 C 220 140, 320 160, 480 160" fill="none" stroke="#fb923c" strokeWidth={wDiode} strokeOpacity="0.8" />
              <text x="490" y="164" fill="#fdba74" fontSize="9" fontWeight="800">
                P_diode (Vf): {Pcond_diode.toFixed(2)}W
              </text>

              {/* Branch 4: Inductor DCR & Core Loss */}
              <path d="M 100 145 C 220 145, 320 190, 480 190" fill="none" stroke="#c084fc" strokeWidth={wCore} strokeOpacity="0.8" />
              <text x="490" y="194" fill="#e9d5ff" fontSize="9" fontWeight="800">
                P_core+DCR: {(Pcond_dcr + Pcore).toFixed(2)}W
              </text>

              {/* Branch 5: Capacitor ESR Loss */}
              <path d="M 100 150 C 220 150, 320 220, 480 220" fill="none" stroke="#38bdf8" strokeWidth={wEsr} strokeOpacity="0.8" />
              <text x="490" y="224" fill="#7dd3fc" fontSize="9" fontWeight="800">
                P_esr (Cap): {Pcond_esr.toFixed(2)}W
              </text>
            </svg>
          </div>

          {/* THERMAL COMPONENT TINTING CARDS */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* MOSFET Thermal State */}
            <div className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 transition-all ${
              tjMosfet > 70
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : tjMosfet > 45
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
            }`}>
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>S1 MOSFET Temp</span>
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-sm font-black">{tjMosfet} °C</span>
              <span className="text-[10px] text-slate-300 font-bold">Loss: {(Pcond_mos + Psw).toFixed(2)} W</span>
            </div>

            {/* Diode Thermal State */}
            <div className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 transition-all ${
              tjDiode > 70
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : tjDiode > 45
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
            }`}>
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>D1 Diode Temp</span>
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-sm font-black">{tjDiode} °C</span>
              <span className="text-[10px] text-slate-300 font-bold">Loss: {Pcond_diode.toFixed(2)} W</span>
            </div>

            {/* Inductor Thermal State */}
            <div className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 transition-all ${
              tjInductor > 70
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : tjInductor > 45
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
            }`}>
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>Inductor Core Temp</span>
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-sm font-black">{tjInductor} °C</span>
              <span className="text-[10px] text-slate-300 font-bold">Loss: {(Pcond_dcr + Pcore).toFixed(2)} W</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FREQUENCY TRADE-OFF (fsw vs P_sw & Ripple) */}
      {activeTab === 'freqTradeoff' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 bg-[#0b1220] border-2 border-amber-500/60 rounded-xl text-xs flex flex-col gap-2">
            <span className="text-amber-300 font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Design Trade-off: Why 50 kHz is Selected as standard operating point:
            </span>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              Increasing switching frequency f_sw reduces inductor size and voltage ripple ΔVout, but proportionally INCREASES switching losses P_sw ∝ f_sw. 50 kHz offers the optimal balance between high efficiency (&gt; 92%) and compact magnetics size!
            </p>
          </div>

          {/* TRADE-OFF TABLE */}
          <div className="w-full bg-[#030712] border-2 border-[#1e293b] rounded-xl p-3">
            <div className="grid grid-cols-3 text-slate-400 font-bold text-xs border-b border-[#1e293b] pb-1.5">
              <span>Freq fsw (kHz)</span>
              <span>Switching Loss P_sw (W)</span>
              <span>Output Ripple ΔVout (mV)</span>
            </div>
            {freqPoints.map((pt) => {
              const isSelected = pt.f === Math.round(fsw / 1000);
              return (
                <div
                  key={pt.f}
                  className={`grid grid-cols-3 text-xs font-bold py-1 px-1 rounded transition-all ${
                    isSelected ? 'bg-amber-950/80 text-amber-300 border border-amber-500' : 'text-slate-300'
                  }`}
                >
                  <span>{pt.f} kHz {isSelected ? '★ (OPTIMAL)' : ''}</span>
                  <span className="text-rose-400">{pt.pSwSim} W (↑)</span>
                  <span className="text-cyan-300">{pt.rippleSim} mV (↓)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LossSankey;
