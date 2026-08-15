import React, { useEffect, useRef } from 'react';
import {
  ActiveFilterConfig,
  HarmonicBarData,
  HarmonicSourceType,
  IEEE519Params,
  PassiveFilterConfig,
  PassiveTunedFreq,
} from '../types/harmonics';
import { Sliders, Zap, ShieldCheck, Cpu, Filter, Table, ArrowRight } from 'lucide-react';

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

  // Filter Impedance Curve Drawing
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

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.fillText('PASSIVE FILTER IMPEDANCE Z(f)', 10, 12);

    if (!passiveFilter.enabled) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FILTER DISABLED', w / 2, h / 2);
      return;
    }

    // Draw Impedance Dip at Tuned Frequency
    const tunedFreqHz = passiveFilter.tunedFreq * 50; // 50Hz fundamental
    const q = passiveFilter.qFactor;

    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    for (let x = 0; x < w; x++) {
      const fHz = (x / w) * 1000; // 0 to 1000 Hz
      const deltaF = Math.abs(fHz - tunedFreqHz);
      // Resonance dip
      const zNorm = Math.min(1.0, 0.05 + Math.pow(deltaF / (2000 / q), 2));
      const y = h - 15 - zNorm * (h - 30);

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Mark tuned frequency point
    const tunedX = (tunedFreqHz / 1000) * w;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(tunedX, h - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`f_r = ${tunedFreqHz} Hz (h${passiveFilter.tunedFreq})`, tunedX, h - 3);
  }, [passiveFilter]);

  // Key harmonics for compliance table: 5th, 7th, 11th, 13th, 17th
  const tableOrders = [5, 7, 11, 13, 17];
  const tableData = tableOrders.map((ord) => {
    const item = harmonics.find((h) => h.order === ord);
    const mag = item ? item.magnitude : 0;
    const lim = item ? item.limit : 4.0;
    const fail = mag > lim;
    return { order: ord, mag, lim, fail };
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. SOURCE SELECTOR PANEL */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Zap className="w-4 h-4 text-emerald-400" />
            HARMONIC SOURCE & LOAD TYPE SELECTOR
          </div>
          <span className="text-xs text-slate-400">IEEE 519 Non-Linear Load Profiles</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: '6_PULSE_SCR', name: '6-PULSE SCR', desc: 'h = 5, 7, 11, 13... (THD ≈ 31%)' },
            { id: '12_PULSE', name: '12-PULSE', desc: 'h = 11, 13, 23, 25... (THD ≈ 12%)' },
            { id: '18_PULSE', name: '18-PULSE', desc: 'h = 17, 19, 35, 37... (THD ≈ 7%)' },
            { id: 'CUSTOM', name: 'CUSTOM', desc: 'User-Defined Magnitudes' },
          ].map((src) => (
            <button
              key={src.id}
              onClick={() => onSelectSource(src.id as HarmonicSourceType)}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                sourceType === src.id
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                  : 'bg-[#21262d] border-[#30363d] text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-xs">{src.name}</div>
              <div className="text-[10px] opacity-75 mt-1">{src.desc}</div>
            </button>
          ))}
        </div>

        {/* CUSTOM HARMONIC EDIT SLIDERS */}
        {sourceType === 'CUSTOM' && onUpdateCustomHarmonic && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1">
            {[5, 7, 11, 13, 17].map((ord) => {
              const bar = harmonics.find((h) => h.order === ord);
              const val = bar ? bar.magnitude : 0;
              return (
                <div key={ord} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>h{ord} Harmonic:</span>
                    <span className="text-cyan-400">{val.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={val}
                    onChange={(e) => onUpdateCustomHarmonic(ord, Number(e.target.value))}
                    className="accent-cyan-500 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. FILTER DESIGNER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PASSIVE SINGLE-TUNED TRAP FILTER */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Filter className="w-4 h-4 text-cyan-400" />
              PASSIVE SINGLE-TUNED TRAP FILTER
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={passiveFilter.enabled}
                onChange={(e) => onUpdatePassiveFilter({ enabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
              ENABLE FILTER
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* TUNED FREQ SELECTOR */}
            <div className="flex flex-col gap-1.5 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
              <label className="font-bold text-slate-300">TUNED HARMONIC (h_r)</label>
              <div className="grid grid-cols-4 gap-1">
                {[5, 7, 11, 13].map((f) => (
                  <button
                    key={f}
                    onClick={() => onUpdatePassiveFilter({ tunedFreq: f as PassiveTunedFreq })}
                    disabled={!passiveFilter.enabled}
                    className={`py-1.5 rounded font-bold text-xs border ${
                      passiveFilter.tunedFreq === f
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-[#21262d] border-[#30363d] text-slate-400'
                    }`}
                  >
                    h{f}
                  </button>
                ))}
              </div>
            </div>

            {/* Q FACTOR SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
              <div className="flex justify-between font-bold text-slate-300">
                <span>QUALITY FACTOR (Q):</span>
                <span className="text-cyan-400">{passiveFilter.qFactor}</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                disabled={!passiveFilter.enabled}
                value={passiveFilter.qFactor}
                onChange={(e) => onUpdatePassiveFilter({ qFactor: Number(e.target.value) })}
                className="accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Sharpness of attenuation notch</span>
            </div>
          </div>

          {/* IMPEDANCE CURVE CANVAS */}
          <div className="relative w-full rounded-lg overflow-hidden border border-[#30363d]">
            <canvas ref={impedanceCanvasRef} width={450} height={100} className="w-full h-[100px] bg-[#090d12]" />
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
                <tr key={row.order} className="hover:bg-[#1f2937]/50">
                  <td className="p-2.5 text-white font-bold">{row.order}th Harmonic</td>
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
                      ✓ COMPLIANT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-500 text-[10px]">
                      ❌ NON-COMPLIANT
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
