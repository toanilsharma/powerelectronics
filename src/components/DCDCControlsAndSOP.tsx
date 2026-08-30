import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Play,
  Gauge,
  BookOpen,
  Zap,
} from 'lucide-react';

interface DCDCControlsAndSOPProps {
  topology: string;
  Vin: number;
  setVin: (v: number) => void;
  duty: number;
  setDuty: (d: number) => void;
  fsw: number;
  setFsw: (f: number) => void;
  inductanceuH: number;
  setInductanceuH: (l: number) => void;
  capacitanceuF: number;
  setCapacitanceuF: (c: number) => void;
  loadR: number;
  setLoadR: (r: number) => void;
  mode: string;
  deltaIL: number;
  deltaVout: number;
  Vout: number;
  onOpenSOPDrawer: () => void;
}

export const DCDCControlsAndSOP: React.FC<DCDCControlsAndSOPProps> = ({
  topology,
  Vin,
  setVin,
  duty,
  setDuty,
  fsw,
  setFsw,
  inductanceuH,
  setInductanceuH,
  capacitanceuF,
  setCapacitanceuF,
  loadR,
  setLoadR,
  mode,
  deltaIL,
  deltaVout,
  Vout,
  onOpenSOPDrawer,
}) => {
  const [isRamping, setIsRamping] = useState(false);
  const [rampProgress, setRampProgress] = useState(0);

  // Computed Consequence Readouts
  const voutIdeal =
    topology === 'boost'
      ? (Vin / (1 - duty / 100)).toFixed(1)
      : topology === 'buckboost'
      ? ((-Vin * (duty / 100)) / (1 - duty / 100)).toFixed(1)
      : ((Vin * duty) / 100).toFixed(1);

  const tswUs = ((1 / fsw) * 1e6).toFixed(1);

  // Walk-In Soft Start Duty Ramp
  const handleWalkIn = () => {
    if (isRamping) return;
    setIsRamping(true);
    setRampProgress(0);
    setDuty(10);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setRampProgress(progress);
      setDuty((prev) => Math.min(90, prev + 5));
      if (progress >= 100) {
        clearInterval(interval);
        setIsRamping(false);
      }
    }, 400);
  };

  return (
    <div className="w-full flex flex-col gap-2.5 font-mono text-xs select-none">
      {/* UNIFIED SINGLE CONVERTER & FILTER CONTROL SECTION */}
      <div className="flex flex-col gap-2.5 p-3 bg-[#070b14] border-2 border-[#1e293b] rounded-2xl shadow-xl">
        {/* HEADER BAR WITH TELEMETRY BADGES */}
        <div className="flex items-center justify-between border-b-2 border-[#1e293b] pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-xs text-white uppercase tracking-wider">
              CONVERTER &amp; FILTER CONTROLS
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              D={duty}%
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              mode === 'CCM' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {mode}
            </span>
          </div>
        </div>

        {/* 1. CONVERTER SWITCHING & INFEED CONTROLS */}
        <div className="flex flex-col gap-2">
          {/* DUTY CYCLE SLIDER */}
          <div id="dc-duty-slider" className="flex flex-col gap-1 bg-[#0c1424] p-2 rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Duty Cycle (D)
              </span>
              <span className="text-emerald-400 font-black text-xs">{duty}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="1"
              value={duty}
              onChange={(e) => setDuty(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>10% min</span>
              <span className="text-cyan-300">Target Vout: {voutIdeal}V</span>
              <span>90% max</span>
            </div>
          </div>

          {/* SWITCHING FREQUENCY SLIDER */}
          <div className="flex flex-col gap-1 bg-[#0c1424] p-2 rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" /> Switching Freq (fsw)
              </span>
              <span className="text-amber-400 font-black text-xs">{(fsw / 1000).toFixed(0)} kHz</span>
            </div>
            <input
              type="range"
              min="20000"
              max="200000"
              step="5000"
              value={fsw}
              onChange={(e) => setFsw(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>20 kHz</span>
              <span className="text-amber-300">Period Tsw: {tswUs} µs</span>
              <span>200 kHz</span>
            </div>
          </div>

          {/* INPUT VOLTAGE SLIDER */}
          <div className="flex flex-col gap-1 bg-[#0c1424] p-2 rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-sky-400" /> Input Voltage (Vin)
              </span>
              <span className="text-sky-400 font-black text-xs">{Vin} V DC</span>
            </div>
            <input
              type="range"
              min="12"
              max="400"
              step="1"
              value={Vin}
              onChange={(e) => setVin(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>12 V</span>
              <span className="text-sky-300">Infeed Range 12-400V</span>
              <span>400 V</span>
            </div>
          </div>
        </div>

        {/* SUBDIVIDER */}
        <div className="border-t border-[#1e293b]" />

        {/* 2. FILTER PASSIVES & LOAD DEMAND CONTROLS */}
        <div className="flex flex-col gap-2">
          {/* INDUCTANCE SLIDER */}
          <div className="flex flex-col gap-1 bg-[#0c1424] p-2 rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Inductance (L)</span>
              <span className="text-cyan-300 font-black text-xs">{inductanceuH} µH</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={inductanceuH}
              onChange={(e) => setInductanceuH(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>10 µH</span>
              <span className="text-cyan-300">Ripple ΔIL: {deltaIL.toFixed(2)}A</span>
              <span>1000 µH</span>
            </div>
          </div>

          {/* CAPACITANCE SLIDER */}
          <div className="flex flex-col gap-1 bg-[#0c1424] p-2 rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Capacitance (C)</span>
              <span className="text-emerald-300 font-black text-xs">{capacitanceuF} µF</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={capacitanceuF}
              onChange={(e) => setCapacitanceuF(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>100 µF</span>
              <span className="text-cyan-300">Ripple ΔV: {(deltaVout * 1000).toFixed(1)}mV</span>
              <span>2000 µF</span>
            </div>
          </div>

          {/* LOAD DEMAND SLIDER */}
          <div id="dc-load-slider" className="flex flex-col gap-1 bg-[#0c1424] p-2 rounded-xl border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-bold">Load Demand (R)</span>
              <span className="text-amber-300 font-black text-xs">{loadR} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={loadR}
              onChange={(e) => setLoadR(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>1 Ω (Heavy)</span>
              <span className="text-slate-300">Resistive Load</span>
              <span>100 Ω (Light)</span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS: SOFT START RAMP & SLIDE-IN SOP DRAWER BUTTON */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            id="dc-soft-start-btn"
            type="button"
            onClick={handleWalkIn}
            disabled={isRamping}
            className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border-2 min-h-[38px] flex items-center justify-between ${
              isRamping ? 'bg-amber-500 text-black border-amber-300 animate-pulse' : 'bg-[#0b1220] text-amber-400 border-amber-500/60 hover:bg-amber-950/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              {isRamping ? `RAMPING (${rampProgress}%)` : 'WALK-IN SOFT START RAMP'}
            </span>
            <span className="text-[10px] text-amber-300 font-bold">10s Soft Ramp</span>
          </button>

          <button
            type="button"
            onClick={onOpenSOPDrawer}
            className="w-full py-2.5 px-3 min-h-[38px] rounded-xl border-2 bg-[#0c1a36] hover:bg-blue-950 text-blue-100 border-blue-400 text-xs font-black transition-all flex items-center justify-between cursor-pointer shadow-md"
          >
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-300" />
              <span>Switchgear &amp; SOP Panel</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900 text-cyan-200 border border-blue-600 font-bold">
              DRAWER →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
