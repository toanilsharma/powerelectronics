import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveFilterConfig,
  HarmonicBarData,
  HarmonicSourceType,
  IEEE519Params,
  PassiveFilterConfig,
  PassiveTunedFreq,
} from '../types/harmonics';
import { Sliders, Zap, ShieldCheck, Cpu, Filter, Table, ArrowRight } from 'lucide-react';
import { ActiveHarmonicFilterLab } from './ActiveHarmonicFilterLab';

interface HarmonicsFilterAndIEEEProps {
  sourceType: HarmonicSourceType;
  onSelectSource: (source: HarmonicSourceType) => void;
  passiveFilter: PassiveFilterConfig;
  onUpdatePassiveFilter: (cfg: Partial<PassiveFilterConfig>) => void;
  activeFilter: ActiveFilterConfig;
  onUpdateActiveFilter: (cfg: Partial<ActiveFilterConfig>) => void;
  ieeeParams: IEEE519Params;
  onUpdateIEEEParams: (params: Partial<IEEE519Params>) => void;
  harmonics: HarmonicBarData[];
  thdVal: number;
  isCompliant: boolean;
  onUpdateCustomHarmonic?: (order: number, val: number) => void;
}

export const HarmonicsFilterAndIEEE: React.FC<HarmonicsFilterAndIEEEProps> = ({
  sourceType,
  onSelectSource,
  passiveFilter,
  onUpdatePassiveFilter,
  activeFilter,
  onUpdateActiveFilter,
  ieeeParams,
  onUpdateIEEEParams,
  harmonics,
  thdVal,
  isCompliant,
  onUpdateCustomHarmonic,
}) => {
  const [harmonicsViewMode, setHarmonicsViewMode] = useState<'passive_ieee' | 'active_filter_lab'>('passive_ieee');
  const impedanceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate Short Circuit Ratio
  const iscIlRatio = ieeeParams.il > 0 ? ieeeParams.isc / ieeeParams.il : 0;

  // Derive TDD limit based on ratio
  let tddLimit = 5.0;
  if (iscIlRatio < 20) tddLimit = 5.0;
  else if (iscIlRatio < 50) tddLimit = 8.0;
  else if (iscIlRatio < 100) tddLimit = 12.0;
  else if (iscIlRatio < 1000) tddLimit = 15.0;
  else tddLimit = 20.0;

  // Filter Impedance Curve Drawing & Physics Engine Calculations
  const inductanceMh = passiveFilter.inductanceMh ?? (passiveFilter.tunedFreq === 5 ? 4.8 : passiveFilter.tunedFreq === 7 ? 2.5 : passiveFilter.tunedFreq === 11 ? 1.0 : 0.7);
  const capacitanceUf = passiveFilter.capacitanceUf ?? 220;
  const resistanceOhm = passiveFilter.resistanceOhm ?? 0.2;

  const pL_H = inductanceMh * 1e-3;
  const pC_F = capacitanceUf * 1e-6;
  const tunedFreqHz = pL_H > 0 && pC_F > 0 ? 1 / (2 * Math.PI * Math.sqrt(pL_H * pC_F)) : 250;
  const tunedOrder = +(tunedFreqHz / 50).toFixed(2);

  const lGrid_H = 0.0005;
  const parallelFreqHz = pL_H > 0 && pC_F > 0 ? 1 / (2 * Math.PI * Math.sqrt((pL_H + lGrid_H) * pC_F)) : 220;
  const parallelOrder = +(parallelFreqHz / 50).toFixed(2);

  const isResonanceAlert =
    passiveFilter.enabled &&
    ((parallelOrder >= 4.6 && parallelOrder <= 5.4) || (parallelOrder >= 6.6 && parallelOrder <= 7.4));

  useEffect(() => {
    const canvas = impedanceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, w, h);

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.fillText(`IMPEDANCE Z(f) | f_r = ${tunedFreqHz.toFixed(0)} Hz (h = ${tunedOrder})`, 10, 12);

    if (!passiveFilter.enabled) {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('FILTER DISABLED (SYSTEM OPERATING WITHOUT TRAP)', w / 2 - 140, h / 2);
      return;
    }

    // Plot Filter Impedance vs Frequency
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let f = 10; f <= 1500; f += 5) {
      const omega = 2 * Math.PI * f;
      const xl = omega * pL_H;
      const xc = 1 / (omega * pC_F);
      const zMag = Math.sqrt(resistanceOhm * resistanceOhm + (xl - xc) * (xl - xc));

      const px = (f / 1500) * w;
      const py = h - 25 - Math.min(h - 35, (zMag / 80) * (h - 35));

      if (f === 10) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Mark Tuned Resonant Frequency (V-Notch)
    const tunedX = (tunedFreqHz / 1500) * w;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(tunedX, h - 25, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`V-Notch h${tunedOrder}`, tunedX, h - 4);

    // Mark Parallel Grid Resonance Peak
    const parallelX = (parallelFreqHz / 1500) * w;
    ctx.fillStyle = isResonanceAlert ? '#f43f5e' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(parallelX, 22, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isResonanceAlert ? '#f43f5e' : '#f59e0b';
    ctx.font = '9px monospace';
    ctx.fillText(`Parallel h${parallelOrder}`, parallelX, 14);
  }, [passiveFilter, inductanceMh, capacitanceUf, resistanceOhm, tunedFreqHz, tunedOrder, parallelFreqHz, parallelOrder, isResonanceAlert]);

  // Key harmonics for compliance table
  const tableOrders = [5, 7, 11, 13, 17];
  const tableData = tableOrders.map((ord) => {
    const item = harmonics.find((h) => h.order === ord);
    const mag = item ? item.magnitude : 0;
    const lim = item ? item.limit : 4.0;
    const fail = mag > lim;
    return { ord, mag, lim, fail };
  });

  return (
    <div className="flex flex-col gap-5 w-full font-mono">
      {/* View Mode Tabs: Passive LC vs Active Harmonic Filter (AHF) */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHarmonicsViewMode('passive_ieee')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              harmonicsViewMode === 'passive_ieee'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white'
            }`}
          >
            <span>⚡ PASSIVE LC FILTER &amp; IEEE 519 TDD</span>
          </button>
          <button
            onClick={() => setHarmonicsViewMode('active_filter_lab')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              harmonicsViewMode === 'active_filter_lab'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white'
            }`}
          >
            <span>🔄 ACTIVE HARMONIC FILTER (AHF p-q THEORY)</span>
          </button>
        </div>
      </div>

      {harmonicsViewMode === 'active_filter_lab' ? (
        <ActiveHarmonicFilterLab />
      ) : (
        <>
      {/* 1. HARMONIC SOURCE & NON-LINEAR LOAD TYPE SELECTOR */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2.5">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Zap className="w-4 h-4 text-emerald-400" />
            HARMONIC SOURCE &amp; NON-LINEAR INDUSTRIAL LOAD SELECTOR
          </div>
          <span className="text-xs text-slate-400 font-mono">IEEE 519-2022 Load Profiles</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { id: '6_PULSE_SCR', name: '6-PULSE SCR', desc: 'h5,7,11 (THDi 28%)' },
            { id: '12_PULSE', name: '12-PULSE', desc: 'h11,13,23 (THDi 12%)' },
            { id: '18_PULSE', name: '18-PULSE', desc: 'h17,19,35 (THDi 7%)' },
            { id: 'VFD_LOAD', name: 'VFD INVERTER', desc: 'h5,7,11 (THDi 35%)' },
            { id: 'SMPS_LOAD', name: 'SMPS / UPS', desc: 'h3,9,15 (THDi 42%)' },
            { id: 'ARC_FURNACE', name: 'ARC FURNACE', desc: 'Inter-h (THDi 48%)' },
            { id: 'CUSTOM', name: 'CUSTOM SYNTH', desc: 'User Synthesized' },
          ].map((src) => (
            <button
              key={src.id}
              onClick={() => onSelectSource(src.id as HarmonicSourceType)}
              className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                sourceType === src.id
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-400'
                  : 'bg-[#21262d] border-[#30363d] text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-extrabold text-xs">{src.name}</div>
              <div className="text-[9px] opacity-75 mt-1 font-mono">{src.desc}</div>
            </button>
          ))}
        </div>

        {/* CUSTOM HARMONIC EDIT SLIDERS FOR INDIVIDUAL ORDERS */}
        {sourceType === 'CUSTOM' && onUpdateCustomHarmonic && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-1">
            {[3, 5, 7, 9, 11, 13, 15, 17, 19, 23, 25].map((ord) => {
              const bar = harmonics.find((h) => h.order === ord);
              const val = bar ? bar.magnitude : 0;
              return (
                <div key={ord} className="flex flex-col gap-1 text-xs bg-[#161b22] p-2 rounded border border-[#21262d]">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>h{ord} Order:</span>
                    <span className="text-cyan-400 font-mono">{val.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="0.5"
                    value={val}
                    onChange={(e) => onUpdateCustomHarmonic(ord, Number(e.target.value))}
                    className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. FILTER DESIGNER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PASSIVE SINGLE-TUNED LC TRAP FILTER */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Filter className="w-4 h-4 text-cyan-400" />
              PASSIVE LC TRAP FILTER TUNER & IMPEDANCE NOTCH
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={passiveFilter.enabled}
                onChange={(e) => onUpdatePassiveFilter({ enabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
              ENABLE LC FILTER
            </label>
          </div>

          {/* PARALLEL RESONANCE WARNING ALERT CARD */}
          {isResonanceAlert && (
            <div className="bg-[#450a0a] border border-[#ff3355] rounded-lg p-3 text-xs text-red-200 flex items-start gap-2.5 animate-pulse shadow-lg">
              <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-extrabold text-red-300 uppercase tracking-wider">
                  ⚠️ HARM_RESONANCE_ALERT: Grid Parallel Resonance Detected!
                </span>
                <p className="text-[11px] text-red-200 leading-relaxed">
                  Parallel resonance order <strong className="text-white">h_parallel = {parallelOrder}</strong> lands directly near dominant 5th/7th harmonics! Adjust $L$ or $C$ to detune away from grid resonance.
                </p>
              </div>
            </div>
          )}

          {/* TUNED PRESET BUTTONS */}
          <div className="flex items-center justify-between bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] text-xs">
            <span className="font-bold text-slate-300">TUNED PRESETS:</span>
            <div className="flex gap-1.5">
              {[
                { label: 'h5 Trap', l: 4.8, c: 220, f: 5 },
                { label: 'h7 Trap', l: 2.5, c: 220, f: 7 },
                { label: 'h11 Trap', l: 1.0, c: 220, f: 11 },
                { label: 'h13 Trap', l: 0.7, c: 220, f: 13 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  disabled={!passiveFilter.enabled}
                  onClick={() =>
                    onUpdatePassiveFilter({
                      tunedFreq: preset.f as PassiveTunedFreq,
                      inductanceMh: preset.l,
                      capacitanceUf: preset.c,
                    })
                  }
                  className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-slate-700 text-cyan-300 font-bold border border-cyan-500/30 text-[11px] transition-all disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* INDUCTANCE L SLIDER & INPUT */}
            <div className="flex flex-col gap-1.5 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
              <div className="flex justify-between items-center font-bold text-slate-300">
                <span>INDUCTANCE (L):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    disabled={!passiveFilter.enabled}
                    value={inductanceMh}
                    onChange={(e) => onUpdatePassiveFilter({ inductanceMh: Math.max(0.1, Math.min(50, Number(e.target.value))) })}
                    className="w-16 bg-[#161b22] border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-xs text-center focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-cyan-400 font-mono">mH</span>
                </div>
              </div>
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.1"
                disabled={!passiveFilter.enabled}
                value={inductanceMh}
                onChange={(e) => onUpdatePassiveFilter({ inductanceMh: Number(e.target.value) })}
                className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <span className="text-[10px] text-slate-400 font-mono">Range: 0.1 to 50 mH</span>
            </div>

            {/* CAPACITANCE C SLIDER & INPUT */}
            <div className="flex flex-col gap-1.5 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
              <div className="flex justify-between items-center font-bold text-slate-300">
                <span>CAPACITANCE (C):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    step="5"
                    disabled={!passiveFilter.enabled}
                    value={capacitanceUf}
                    onChange={(e) => onUpdatePassiveFilter({ capacitanceUf: Math.max(10, Math.min(1000, Number(e.target.value))) })}
                    className="w-16 bg-[#161b22] border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-xs text-center focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-cyan-400 font-mono">μF</span>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="5"
                disabled={!passiveFilter.enabled}
                value={capacitanceUf}
                onChange={(e) => onUpdatePassiveFilter({ capacitanceUf: Number(e.target.value) })}
                className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <span className="text-[10px] text-slate-400 font-mono">Range: 10 to 1000 μF</span>
            </div>
          </div>

          {/* TELEMETRY DERIVED VALUES CARD */}
          <div className="grid grid-cols-3 gap-2 bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] text-xs font-mono text-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold">TUNED FREQ (f_r)</span>
              <span className="text-cyan-400 font-bold text-sm">{tunedFreqHz.toFixed(0)} Hz</span>
            </div>
            <div className="flex flex-col border-x border-slate-800 px-1">
              <span className="text-[10px] text-slate-400 font-bold">TUNED ORDER (h_r)</span>
              <span className="text-emerald-400 font-bold text-sm">h = {tunedOrder}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold">PARALLEL RES.</span>
              <span className={`font-bold text-sm ${isResonanceAlert ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                h = {parallelOrder}
              </span>
            </div>
          </div>

          {/* IMPEDANCE CURVE CANVAS */}
          <div className="relative w-full rounded-lg overflow-hidden border border-[#30363d]">
            <canvas ref={impedanceCanvasRef} width={450} height={110} className="w-full h-[110px] bg-[#090d12]" />
          </div>
        </div>

        {/* ACTIVE HARMONIC FILTER (AHF) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <Cpu className="w-4 h-4 text-emerald-400" />
              ACTIVE HARMONIC FILTER (AHF / INVERTER-BASED)
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={activeFilter.enabled}
                onChange={(e) => onUpdateActiveFilter({ enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
              ENABLE AHF
            </label>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-2">
              <label className="font-bold text-slate-300">AHF CURRENT RATING (AMPS)</label>
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 200].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => onUpdateActiveFilter({ ratingAmps: rating as 50 | 100 | 200 })}
                    disabled={!activeFilter.enabled}
                    className={`py-2 rounded-lg font-bold text-xs border ${
                      activeFilter.ratingAmps === rating
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md'
                        : 'bg-[#21262d] border-[#30363d] text-slate-400'
                    }`}
                  >
                    {rating}A RATING
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-1.5 text-slate-300">
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> DYNAMIC HARMONIC INJECTION MITIGATION
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Injects counter-phase harmonic current to cancel all non-linear current distortion in real-time up to the 50th order. Reduces overall THD below 5.0%.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. IEEE 519 COMPLIANCE CALCULATION PANEL */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Table className="w-4 h-4 text-cyan-400" />
            IEEE 519-2022 CURRENT DISTORTION LIMITS & AUDIT TABLE
          </div>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            SHORT-CIRCUIT RATIO (Isc / IL) = {iscIlRatio.toFixed(1)}
          </span>
        </div>

        {/* INPUT RATIO CALCULATOR SLIDERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-1.5">
            <div className="flex justify-between font-bold text-slate-300">
              <span>FAULT CURRENT (Isc):</span>
              <span className="text-cyan-400">{ieeeParams.isc} A</span>
            </div>
            <input
              type="range"
              min="2000"
              max="50000"
              step="1000"
              value={ieeeParams.isc}
              onChange={(e) => onUpdateIEEEParams({ isc: Number(e.target.value) })}
              className="accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">PCC Utility Short-Circuit Capacity</span>
          </div>

          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-1.5">
            <div className="flex justify-between font-bold text-slate-300">
              <span>MAX DEMAND LOAD CURRENT (IL):</span>
              <span className="text-emerald-400">{ieeeParams.il} A</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={ieeeParams.il}
              onChange={(e) => onUpdateIEEEParams({ il: Number(e.target.value) })}
              className="accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Fundamental Demand Current at PCC</span>
          </div>
        </div>

        {/* AUDIT COMPLIANCE TABLE */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#161b22] text-slate-400 border-b border-[#30363d]">
                <th className="p-2.5 font-bold">HARMONIC ORDER</th>
                <th className="p-2.5 font-bold">MEASURED MAGNITUDE</th>
                <th className="p-2.5 font-bold">IEEE 519 LIMIT</th>
                <th className="p-2.5 font-bold">COMPLIANCE STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] font-mono">
              {tableData.map((row) => (
                <tr key={row.ord} className="hover:bg-[#1f2937]/50">
                  <td className="p-2.5 text-white font-bold">{row.ord}th Harmonic</td>
                  <td className="p-2.5 text-cyan-300">{row.mag.toFixed(1)}%</td>
                  <td className="p-2.5 text-slate-400">{row.lim.toFixed(1)}%</td>
                  <td className="p-2.5">
                    {row.fail ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-500 text-[10px]">
                        ❌ FAIL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500 text-[10px]">
                        ✓ PASS
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {/* OVERALL THD ROW */}
              <tr className="bg-[#1e293b]/60 font-bold">
                <td className="p-2.5 text-emerald-400">TOTAL HARMONIC DISTORTION (THD)</td>
                <td className="p-2.5 text-emerald-300">{thdVal.toFixed(1)}%</td>
                <td className="p-2.5 text-slate-300">{tddLimit.toFixed(1)}% (TDD)</td>
                <td className="p-2.5">
                  {isCompliant ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500 text-[10px]">
                      ✓ LIMIT PASS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-500 text-[10px]">
                      ❌ LIMIT EXCEEDED
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
