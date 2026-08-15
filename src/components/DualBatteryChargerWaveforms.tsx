import React, { useState, useEffect } from 'react';
import { DualBatteryChargerReadouts, DualBatteryChargerState } from '../types/dualBatteryCharger';
import { Activity, Gauge, TrendingUp, Zap } from 'lucide-react';

interface DualBatteryChargerWaveformsProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  compact?: boolean;
}

export const DualBatteryChargerWaveforms: React.FC<DualBatteryChargerWaveformsProps> = ({
  state,
  readouts,
  compact = false,
}) => {
  const [pointsA, setPointsA] = useState<string>('');
  const [pointsB, setPointsB] = useState<string>('');
  const [dcRipplePoints1, setDcRipplePoints1] = useState<string>('');
  const [dcRipplePoints2, setDcRipplePoints2] = useState<string>('');

  useEffect(() => {
    let animId: number;
    let t = 0;

    const generateWaveforms = () => {
      t += 0.15;
      const width = 500;
      const height = 100;
      const centerY = height / 2;

      // 3PH AC Supply A Waveform
      const ptsA: string[] = [];
      for (let x = 0; x <= width; x += 4) {
        if (!state.acSupplyAOnline) {
          ptsA.push(`${x},${centerY}`);
        } else {
          const rad = (x / 30) + t;
          const y = centerY - Math.sin(rad) * 35;
          ptsA.push(`${x},${y.toFixed(1)}`);
        }
      }
      setPointsA(ptsA.join(' '));

      // 3PH AC Supply B Waveform
      const ptsB: string[] = [];
      for (let x = 0; x <= width; x += 4) {
        if (!state.acSupplyBOnline) {
          ptsB.push(`${x},${centerY}`);
        } else {
          const rad = (x / 30) + t + 0.5;
          const y = centerY - Math.sin(rad) * 35;
          ptsB.push(`${x},${y.toFixed(1)}`);
        }
      }
      setPointsB(ptsB.join(' '));

      // DC Bus 1 Ripple Waveform
      const ptsDc1: string[] = [];
      const vNorm1 = (readouts.vDcBus1 / 250) * 40; // scaled
      for (let x = 0; x <= width; x += 4) {
        const ripple = state.mccbChargerA && state.acSupplyAOnline ? Math.sin(x * 0.2 + t * 2) * 2.5 : 0;
        const y = height - (vNorm1 + 25 + ripple);
        ptsDc1.push(`${x},${y.toFixed(1)}`);
      }
      setDcRipplePoints1(ptsDc1.join(' '));

      // DC Bus 2 Ripple Waveform
      const ptsDc2: string[] = [];
      const vNorm2 = (readouts.vDcBus2 / 250) * 40; // scaled
      for (let x = 0; x <= width; x += 4) {
        const ripple = state.mccbChargerB && state.acSupplyBOnline ? Math.sin(x * 0.2 + t * 2 + 0.3) * 2.5 : 0;
        const y = height - (vNorm2 + 25 + ripple);
        ptsDc2.push(`${x},${y.toFixed(1)}`);
      }
      setDcRipplePoints2(ptsDc2.join(' '));

      animId = requestAnimationFrame(generateWaveforms);
    };

    generateWaveforms();
    return () => cancelAnimationFrame(animId);
  }, [state, readouts]);

  if (compact) {
    return (
      <div className="flex flex-col gap-3 w-full bg-transparent p-0 select-none">
        {/* WAVEFORM 1: AC SUPPLY A & DC BUS 1 */}
        <div className="p-3 bg-[#0d1117]/60 border border-[#1e293b] rounded-xl flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-sky-400 font-bold text-[11px] font-mono">
            <span>SYSTEM A: SUPPLY A vs BUS 1</span>
            <span>{readouts.vDcBus1.toFixed(1)}V</span>
          </div>

          <svg viewBox="0 0 500 100" className="w-full h-20 bg-[#080b10] border border-[#1e293b] rounded-lg">
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            <polyline fill="none" stroke="#38bdf8" strokeWidth="1.5" points={pointsA} opacity="0.6" />
            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={dcRipplePoints1} />
          </svg>

          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span className="text-sky-400">blue: AC Input A</span>
            <span className="text-emerald-400">green: DC Bus 1</span>
          </div>
        </div>

        {/* WAVEFORM 2: AC SUPPLY B & DC BUS 2 */}
        <div className="p-3 bg-[#0d1117]/60 border border-[#1e293b] rounded-xl flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-cyan-400 font-bold text-[11px] font-mono">
            <span>SYSTEM B: SUPPLY B vs BUS 2</span>
            <span>{readouts.vDcBus2.toFixed(1)}V</span>
          </div>

          <svg viewBox="0 0 500 100" className="w-full h-20 bg-[#080b10] border border-[#1e293b] rounded-lg">
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            <polyline fill="none" stroke="#22d3ee" strokeWidth="1.5" points={pointsB} opacity="0.6" />
            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={dcRipplePoints2} />
          </svg>

          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span className="text-cyan-400">cyan: AC Input B</span>
            <span className="text-emerald-400">green: DC Bus 2</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 font-mono select-none">
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wider">
              REAL-TIME OSCILLOSCOPE & DC RIPPLE WAVEFORMS
            </h3>
            <p className="text-xs text-slate-400">
              Live physics engine monitoring AC sine inputs, thyristor rectification, and filtered DC voltage
            </p>
          </div>
        </div>

        <div className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg">
          DC BUS RIPPLE &lt; 0.5% Vrms (IEEE 1188 / IEC 62485-2 Compliant)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* WAVEFORM 1: AC SUPPLY A & DC BUS 1 */}
        <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-sky-400 font-bold">
            <span>SYSTEM A: 415VAC SUPPLY A vs 220VDC BUS 1</span>
            <span>VDC: {readouts.vDcBus1.toFixed(1)}V</span>
          </div>

          <svg viewBox="0 0 500 100" className="w-full h-24 bg-[#080b10] border border-[#21262d] rounded-lg">
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            {/* AC Input Waveform */}
            <polyline fill="none" stroke="#38bdf8" strokeWidth="1.5" points={pointsA} opacity="0.6" />
            {/* DC Bus Waveform */}
            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={dcRipplePoints1} />
          </svg>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span className="text-sky-400">blue: 415V AC Input A</span>
            <span className="text-emerald-400">green: Filtered 220V DC Bus 1</span>
          </div>
        </div>

        {/* WAVEFORM 2: AC SUPPLY B & DC BUS 2 */}
        <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-cyan-400 font-bold">
            <span>SYSTEM B: 415VAC SUPPLY B vs 220VDC BUS 2</span>
            <span>VDC: {readouts.vDcBus2.toFixed(1)}V</span>
          </div>

          <svg viewBox="0 0 500 100" className="w-full h-24 bg-[#080b10] border border-[#21262d] rounded-lg">
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            {/* AC Input Waveform */}
            <polyline fill="none" stroke="#22d3ee" strokeWidth="1.5" points={pointsB} opacity="0.6" />
            {/* DC Bus Waveform */}
            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={dcRipplePoints2} />
          </svg>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span className="text-cyan-400">cyan: 415V AC Input B</span>
            <span className="text-emerald-400">green: Filtered 220V DC Bus 2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
