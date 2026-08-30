import React from 'react';
import {
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Maximize2,
  Cpu,
  Layers,
} from 'lucide-react';
import { calculateEfficiencyMap } from '../engine/DCDCPhysics.js';
import { LossSankey } from './LossSankey';

interface DCDCRightPanelProps {
  topology: string;
  Vin: number;
  duty: number;
  fsw: number;
  inductanceuH: number;
  capacitanceuF: number;
  loadR: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isEngineRunning: boolean;
  mode: string;
  activeFault: string | null;
  setActiveFault: (fault: string | null) => void;
  Vout: number;
  Iout: number;
  deltaIL: number;
  deltaVout: number;
  Pout: number;
  Ploss: number;
  etaPct: number;
  Iout_crit: number;
  onOpenTour: () => void;
}

export const DCDCRightPanel: React.FC<DCDCRightPanelProps> = ({
  topology,
  Vin,
  duty,
  fsw,
  inductanceuH,
  capacitanceuF,
  loadR,
  q1Closed,
  q2Closed,
  q3Closed,
  isEngineRunning,
  mode,
  activeFault,
  setActiveFault,
  Vout,
  Iout,
  deltaIL,
  deltaVout,
  Pout,
  Ploss,
  etaPct,
  Iout_crit,
  onOpenTour,
}) => {
  const Vout_abs = Math.abs(Vout);
  const isInputPowered = isEngineRunning && q1Closed && activeFault !== 'S1_OPEN' && activeFault !== 'S1_SHORT';
  const overlapAngleDeg = isInputPowered ? Number((2.2 * (duty / 40) * (50000 / fsw)).toFixed(1)) : 0;

  // Conduction & Switching Losses Breakdown
  const pCond = isInputPowered ? Ploss * 0.45 : 0;
  const pSw = isInputPowered ? Ploss * 0.35 : 0;
  const pCore = isInputPowered ? Ploss * 0.20 : 0;

  // Live Insight Text
  let liveInsightText = '';
  if (!q1Closed) {
    liveInsightText = 'Main DC Breaker 52-Q1 is OPEN. Input power is isolated. Converter output is 0V.';
  } else if (activeFault === 'S1_OPEN') {
    liveInsightText = 'FAULT TRIPPED: High-side MOSFET S1 Open Circuit. Gate signal inhibited. Inductor current IL collapsed to 0A.';
  } else if (activeFault === 'S1_SHORT') {
    liveInsightText = 'CRITICAL FAULT: MOSFET S1 Short Circuit. Direct Vin pass-through caused 100A current spike. Protection fuse BLOWN.';
  } else if (activeFault === 'DIODE_OPEN') {
    liveInsightText = 'WARNING FAULT: Freewheel Diode Open. Inductive energy cannot recirculate during switch OFF. Overvoltage spike > 1.8x Vin.';
  } else if (activeFault === 'L_SAT') {
    liveInsightText = 'SATURATION FAULT: Core saturation reached. Inductance L dropped by 50%, causing 2.5x inductor ripple current spike (ΔIL).';
  } else if (activeFault === 'C_ESR_HIGH') {
    liveInsightText = 'DEGRADATION FAULT: High Capacitor ESR (200mΩ). Output voltage ripple ΔVout increased 3x above nominal.';
  } else if (mode === 'DCM') {
    liveInsightText = `DCM MODE: Load current Iout (${Iout.toFixed(2)}A) < Iout_crit (${Iout_crit.toFixed(2)}A). Inductor current reaches zero each cycle with overlap μ=${overlapAngleDeg}°.`;
  } else {
    liveInsightText = `CCM CONTINUOUS MODE: Stable conduction at Duty ${duty}%. Inductor current ripple ΔIL=${deltaIL.toFixed(2)}A. Output Vout=${Vout_abs.toFixed(1)}V, Efficiency η=${etaPct.toFixed(1)}%.`;
  }

  // Efficiency Map Calculations
  const physicsParams = {
    Vin,
    D: duty / 100,
    f: fsw,
    L: inductanceuH * 1e-6,
    C: capacitanceuF * 1e-6,
    R: loadR,
  };
  const efficiencyData = calculateEfficiencyMap(topology, physicsParams, 0.5, 10, 5);

  return (
    <div className="w-full flex flex-col gap-3 font-mono text-xs select-none">
      {/* 1. LIVE PHYSICS INSIGHT CARD */}
      <div className="flex flex-col gap-3 p-3.5 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b-2 border-[#1e293b] pb-2">
          <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Live Physics Insight
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
            IEEE 946 / IEC 62040-3
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#0b1220] border-2 border-[#1e293b] flex flex-col gap-1.5 shadow-sm">
          <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Standard Benchmark Insight:
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
            {liveInsightText}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300 uppercase">{topology.toUpperCase()}</span>
          <span className="text-cyan-300">DUTY {duty}%</span>
          <span className="text-amber-300">RIPPLE {((deltaVout / Math.max(1, Vout_abs)) * 100).toFixed(1)}%</span>
          <span className="text-emerald-400">μ={overlapAngleDeg}°</span>
        </div>
      </div>

      {/* 2. POWER FLOW SANKEY & FREQUENCY TRADE-OFF */}
      <div id="dc-sankey-panel" className="w-full">
        <LossSankey
          Vin={Vin}
          Vout={Vout}
          Iout={Iout}
          duty={duty}
          fsw={fsw}
          Pout={Pout}
          Ploss={Ploss}
          etaPct={etaPct}
          Pcond_mos={pCond}
          Psw={pSw}
          Pcore={pCore}
        />
      </div>

        {/* Efficiency Map Table */}
        <div className="flex flex-col gap-1.5 bg-[#060c18] p-2.5 rounded-xl border border-[#1e293b]">
          <div className="grid grid-cols-4 text-[11px] font-bold text-slate-400 border-b border-[#1e293b] pb-1">
            <span>Iout</span>
            <span>η (%)</span>
            <span>Pout</span>
            <span>Mode</span>
          </div>
          {efficiencyData.map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 text-[11px] font-bold py-0.5">
              <span className="text-white">{row.Iout}A</span>
              <span className="text-emerald-400">{row.etaPct}%</span>
              <span className="text-slate-300">{row.Pout}W</span>
              <span className={row.mode === 'CCM' ? 'text-emerald-400' : 'text-amber-400'}>{row.mode}</span>
            </div>
          ))}
        </div>

      {/* 3. PROTECTION STATUS & FAULT INJECTION LAB */}
      <div id="dc-fault-lab" className="flex flex-col gap-3 p-3.5 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b-2 border-[#1e293b] pb-2">
          <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Protection &amp; Fault Lab
          </span>
          <button
            type="button"
            onClick={() => setActiveFault(null)}
            className="text-[11px] font-extrabold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700 cursor-pointer"
          >
            RESET FAULTS
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          {[
            { id: 'S1_OPEN', label: 'S1 MOSFET Open Circuit', desc: 'Vout=0V, IL=0A, TRIPPED' },
            { id: 'S1_SHORT', label: 'S1 MOSFET Short Circuit', desc: 'Vin pass-through, Fuse Blown 100A' },
            { id: 'DIODE_OPEN', label: 'Freewheel Diode Open', desc: 'Voltage spike 1.8x, Forced DCM' },
            { id: 'L_SAT', label: 'Inductor Core Saturation', desc: 'L drops 50%, ΔIL spikes 2.5x' },
            { id: 'C_ESR_HIGH', label: 'High Capacitor ESR (200mΩ)', desc: 'Output voltage ripple ΔVout 3x' },
          ].map((flt) => (
            <button
              key={flt.id}
              type="button"
              onClick={() => setActiveFault(activeFault === flt.id ? null : flt.id)}
              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer text-left min-h-[44px] flex flex-col gap-0.5 ${
                activeFault === flt.id
                  ? 'bg-rose-950/90 border-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'bg-[#0b1220] border-[#1e293b] text-slate-300 hover:border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-between font-extrabold text-xs">
                <span>{flt.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${activeFault === flt.id ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {activeFault === flt.id ? 'ACTIVE' : 'INJECT'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold">{flt.desc}</span>
            </button>
          ))}
        </div>

        {/* DETAILED LEARNING WORKSTATION BUTTON */}
        <button
          type="button"
          onClick={onOpenTour}
          className="w-full mt-1 py-3.5 px-4 rounded-xl border-2 border-amber-400 hover:border-yellow-300 bg-[#261904] hover:bg-amber-950 text-amber-100 text-xs font-black transition-all flex items-center justify-between cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Detailed Learning Workstation</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-600 font-bold">
            OPEN TOUR →
          </span>
        </button>
      </div>
    </div>
  );
};
