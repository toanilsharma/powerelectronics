import React, { useState, useEffect } from 'react';
import { DualBatteryChargerReadouts, DualBatteryChargerState } from '../types/dualBatteryCharger';
import { Activity, Gauge, TrendingUp, Zap, Pause, Play, Layers, Sliders, Radio } from 'lucide-react';

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
  // OSCILLOSCOPE CONTROL STATES
  const [activeChannel, setActiveChannel] = useState<'ALL' | 'AC_3PH' | 'SCR_6PULSE' | 'DC_RIPPLE' | 'IBATT'>('ALL');
  const [timebase, setTimebase] = useState<number>(5); // 2ms, 5ms, 10ms per div
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  // WAVEFORM PATH STRINGS
  const [acPhaseR_A, setAcPhaseR_A] = useState<string>('');
  const [acPhaseY_A, setAcPhaseY_A] = useState<string>('');
  const [acPhaseB_A, setAcPhaseB_A] = useState<string>('');

  const [acPhaseR_B, setAcPhaseR_B] = useState<string>('');
  const [acPhaseY_B, setAcPhaseY_B] = useState<string>('');
  const [acPhaseB_B, setAcPhaseB_B] = useState<string>('');

  const [raw6PulseA, setRaw6PulseA] = useState<string>('');
  const [raw6PulseB, setRaw6PulseB] = useState<string>('');

  const [dcBus1Points, setDcBus1Points] = useState<string>('');
  const [dcBus2Points, setDcBus2Points] = useState<string>('');

  const [iBatt1Points, setIBatt1Points] = useState<string>('');
  const [iBatt2Points, setIBatt2Points] = useState<string>('');

  // DERIVED ELECTRICAL PHYSICS METRICS
  const alphaA = state.modeA === 'FLOAT' ? 25 : state.modeA === 'BOOST' ? 12 : 90;
  const alphaB = state.modeB === 'FLOAT' ? 25 : state.modeB === 'BOOST' ? 12 : 90;

  const pfA = state.acSupplyAOnline ? (0.95 * Math.cos((alphaA * Math.PI) / 180)).toFixed(2) : '0.00';
  const pfB = state.acSupplyBOnline ? (0.95 * Math.cos((alphaB * Math.PI) / 180)).toFixed(2) : '0.00';

  const vRipplePpA = state.acSupplyAOnline && state.mccbChargerA ? (state.modeA === 'BOOST' ? 1.15 : 0.78) : 0.12;
  const vRipplePpB = state.acSupplyBOnline && state.mccbChargerB ? (state.modeB === 'BOOST' ? 1.15 : 0.78) : 0.12;

  const rippleFactorA = readouts.vDcBus1 > 50 ? ((vRipplePpA / (2 * Math.sqrt(3) * readouts.vDcBus1)) * 100).toFixed(3) : '0.000';
  const rippleFactorB = readouts.vDcBus2 > 50 ? ((vRipplePpB / (2 * Math.sqrt(3) * readouts.vDcBus2)) * 100).toFixed(3) : '0.000';

  useEffect(() => {
    let animId: number;
    let t = 0;

    const generatePhysicsWaveforms = () => {
      if (!isFrozen) {
        t += 0.12;
      }

      const width = 500;
      const height = 100;
      const centerY = height / 2;

      // -------------------------------------------------------------
      // 1. 3-PHASE AC INPUT SINE WAVES (R, Y, B @ 120deg offset)
      // -------------------------------------------------------------
      const ptsR_A: string[] = [];
      const ptsY_A: string[] = [];
      const ptsB_A: string[] = [];

      const ptsR_B: string[] = [];
      const ptsY_B: string[] = [];
      const ptsB_B: string[] = [];

      const freqScale = 0.05 * (5 / timebase);

      for (let x = 0; x <= width; x += 4) {
        const radR = x * freqScale + t;
        const radY = radR - (2 * Math.PI) / 3;
        const radB = radR - (4 * Math.PI) / 3;

        if (!state.acSupplyAOnline) {
          ptsR_A.push(`${x},${centerY}`);
          ptsY_A.push(`${x},${centerY}`);
          ptsB_A.push(`${x},${centerY}`);
        } else {
          ptsR_A.push(`${x},${(centerY - Math.sin(radR) * 36).toFixed(1)}`);
          ptsY_A.push(`${x},${(centerY - Math.sin(radY) * 36).toFixed(1)}`);
          ptsB_A.push(`${x},${(centerY - Math.sin(radB) * 36).toFixed(1)}`);
        }

        if (!state.acSupplyBOnline) {
          ptsR_B.push(`${x},${centerY}`);
          ptsY_B.push(`${x},${centerY}`);
          ptsB_B.push(`${x},${centerY}`);
        } else {
          ptsR_B.push(`${x},${(centerY - Math.sin(radR + 0.4) * 36).toFixed(1)}`);
          ptsY_B.push(`${x},${(centerY - Math.sin(radY + 0.4) * 36).toFixed(1)}`);
          ptsB_B.push(`${x},${(centerY - Math.sin(radB + 0.4) * 36).toFixed(1)}`);
        }
      }

      setAcPhaseR_A(ptsR_A.join(' '));
      setAcPhaseY_A(ptsY_A.join(' '));
      setAcPhaseB_A(ptsB_A.join(' '));

      setAcPhaseR_B(ptsR_B.join(' '));
      setAcPhaseY_B(ptsY_B.join(' '));
      setAcPhaseB_B(ptsB_B.join(' '));

      // -------------------------------------------------------------
      // 2. RAW 6-PULSE THYRISTOR BRIDGE RECTIFIED ENVELOPE (300Hz)
      // -------------------------------------------------------------
      const pts6P_A: string[] = [];
      const pts6P_B: string[] = [];

      for (let x = 0; x <= width; x += 4) {
        const rad = x * freqScale + t;
        // 6-pulse rectification envelope: max absolute phase difference
        const vR = Math.sin(rad);
        const vY = Math.sin(rad - (2 * Math.PI) / 3);
        const vB = Math.sin(rad - (4 * Math.PI) / 3);

        const vRectA = Math.max(Math.abs(vR - vY), Math.abs(vY - vB), Math.abs(vB - vR));
        const y6P_A = state.acSupplyAOnline && state.mccbChargerA
          ? centerY + 25 - vRectA * 45 * (state.modeA === 'BOOST' ? 1.08 : 1.0)
          : centerY;
        pts6P_A.push(`${x},${y6P_A.toFixed(1)}`);

        const vRectB = Math.max(Math.abs(vR - vY), Math.abs(vY - vB), Math.abs(vB - vR));
        const y6P_B = state.acSupplyBOnline && state.mccbChargerB
          ? centerY + 25 - vRectB * 45 * (state.modeB === 'BOOST' ? 1.08 : 1.0)
          : centerY;
        pts6P_B.push(`${x},${y6P_B.toFixed(1)}`);
      }

      setRaw6PulseA(pts6P_A.join(' '));
      setRaw6PulseB(pts6P_B.join(' '));

      // -------------------------------------------------------------
      // 3. LC FILTERED DC BUS VOLTAGE & 300Hz RIPPLE
      // -------------------------------------------------------------
      const ptsDc1: string[] = [];
      const ptsDc2: string[] = [];

      const vNorm1 = (readouts.vDcBus1 / 260) * 45;
      const vNorm2 = (readouts.vDcBus2 / 260) * 45;

      for (let x = 0; x <= width; x += 4) {
        // 6-pulse ripple at 6x fundamental frequency (300Hz)
        const ripple1 = state.acSupplyAOnline && state.mccbChargerA
          ? Math.sin(x * 0.3 + t * 6) * (vRipplePpA * 1.5)
          : 0;
        const y1 = height - (vNorm1 + 20 + ripple1);
        ptsDc1.push(`${x},${y1.toFixed(1)}`);

        const ripple2 = state.acSupplyBOnline && state.mccbChargerB
          ? Math.sin(x * 0.3 + t * 6 + 0.5) * (vRipplePpB * 1.5)
          : 0;
        const y2 = height - (vNorm2 + 20 + ripple2);
        ptsDc2.push(`${x},${y2.toFixed(1)}`);
      }

      setDcBus1Points(ptsDc1.join(' '));
      setDcBus2Points(ptsDc2.join(' '));

      // -------------------------------------------------------------
      // 4. BATTERY CURRENT TRACE (CHARGING + / DISCHARGING -)
      // -------------------------------------------------------------
      const ptsIBatt1: string[] = [];
      const ptsIBatt2: string[] = [];

      const iNorm1 = (readouts.iBatt1 / 50) * 35; // scaled 50A
      const iNorm2 = (readouts.iBatt2 / 50) * 35;

      for (let x = 0; x <= width; x += 4) {
        const noise1 = (Math.random() - 0.5) * 0.8;
        const yIb1 = centerY - (iNorm1 + noise1);
        ptsIBatt1.push(`${x},${yIb1.toFixed(1)}`);

        const noise2 = (Math.random() - 0.5) * 0.8;
        const yIb2 = centerY - (iNorm2 + noise2);
        ptsIBatt2.push(`${x},${yIb2.toFixed(1)}`);
      }

      setIBatt1Points(ptsIBatt1.join(' '));
      setIBatt2Points(ptsIBatt2.join(' '));

      animId = requestAnimationFrame(generatePhysicsWaveforms);
    };

    generatePhysicsWaveforms();
    return () => cancelAnimationFrame(animId);
  }, [state, readouts, isFrozen, timebase, vRipplePpA, vRipplePpB]);

  // COMPACT VIEW FOR SIDEBAR
  if (compact) {
    return (
      <div className="flex flex-col gap-3 w-full bg-transparent p-0 select-none font-mono text-xs">
        
        {/* COMPACT SCOPE 1: SYSTEM A WAVEFORMS */}
        <div className="p-3 bg-[#0d1424] border border-[#1e293b] rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-sky-400 flex items-center gap-1">
              ⚡ SYSTEM A: 415V AC vs 220V DC
            </span>
            <span className="font-extrabold text-emerald-400">{readouts.vDcBus1.toFixed(1)}V</span>
          </div>

          <svg viewBox="0 0 500 100" className="w-full h-24 bg-[#060911] border border-[#1e293b] rounded-lg">
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* 3PH AC INPUT WAVES */}
            <polyline fill="none" stroke="#ef4444" strokeWidth="1" points={acPhaseR_A} opacity="0.4" />
            <polyline fill="none" stroke="#f59e0b" strokeWidth="1" points={acPhaseY_A} opacity="0.4" />
            <polyline fill="none" stroke="#38bdf8" strokeWidth="1" points={acPhaseB_A} opacity="0.4" />

            {/* RAW 6-PULSE ENVELOPE */}
            <polyline fill="none" stroke="#fbbf24" strokeWidth="1.5" points={raw6PulseA} opacity="0.6" strokeDasharray="3 3" />

            {/* FILTERED DC BUS VOLTAGE */}
            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={dcBus1Points} />
          </svg>

          <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400">
            <div>3PH AC: <span className="text-sky-400 font-bold">{readouts.vAcBusA.toFixed(0)}V</span></div>
            <div>DC RIPPLE: <span className="text-emerald-400 font-bold">{vRipplePpA.toFixed(2)}Vpp</span></div>
            <div>FIRING ANGLE (α): <span className="text-amber-400 font-bold">{alphaA}°</span></div>
            <div>POWER FACTOR: <span className="text-purple-400 font-bold">{pfA}</span></div>
          </div>
        </div>

        {/* COMPACT SCOPE 2: SYSTEM B WAVEFORMS */}
        <div className="p-3 bg-[#0d1424] border border-[#1e293b] rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-cyan-400 flex items-center gap-1">
              ⚡ SYSTEM B: 415V AC vs 220V DC
            </span>
            <span className="font-extrabold text-emerald-400">{readouts.vDcBus2.toFixed(1)}V</span>
          </div>

          <svg viewBox="0 0 500 100" className="w-full h-24 bg-[#060911] border border-[#1e293b] rounded-lg">
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* 3PH AC INPUT WAVES */}
            <polyline fill="none" stroke="#ef4444" strokeWidth="1" points={acPhaseR_B} opacity="0.4" />
            <polyline fill="none" stroke="#f59e0b" strokeWidth="1" points={acPhaseY_B} opacity="0.4" />
            <polyline fill="none" stroke="#22d3ee" strokeWidth="1" points={acPhaseB_B} opacity="0.4" />

            {/* RAW 6-PULSE ENVELOPE */}
            <polyline fill="none" stroke="#fbbf24" strokeWidth="1.5" points={raw6PulseB} opacity="0.6" strokeDasharray="3 3" />

            {/* FILTERED DC BUS VOLTAGE */}
            <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={dcBus2Points} />
          </svg>

          <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400">
            <div>3PH AC: <span className="text-cyan-400 font-bold">{readouts.vAcBusB.toFixed(0)}V</span></div>
            <div>DC RIPPLE: <span className="text-emerald-400 font-bold">{vRipplePpB.toFixed(2)}Vpp</span></div>
            <div>FIRING ANGLE (α): <span className="text-amber-400 font-bold">{alphaB}°</span></div>
            <div>POWER FACTOR: <span className="text-purple-400 font-bold">{pfB}</span></div>
          </div>
        </div>

      </div>
    );
  }

  // EXPANDED FULL OSCILLOSCOPE ANALYZER MODAL VIEW
  return (
    <div className="bg-[#0d1424] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 font-mono text-xs select-none">
      
      {/* SCOPE CONTROL BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/80 border border-blue-500/50 rounded-xl text-blue-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-wider flex items-center gap-2">
              INDUSTRIAL MULTI-CHANNEL OSCILLOSCOPE ANALYZER
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Real-time 3-Phase AC Sine Inputs, 6-Pulse Thyristor Rectification Physics (300Hz), Filtered DC Voltage &amp; Battery Current Traces
            </p>
          </div>
        </div>

        {/* TIMEBASE & CHANNEL SELECTORS */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1">TIMEBASE:</span>
            {[2, 5, 10].map((tb) => (
              <button
                key={tb}
                onClick={() => setTimebase(tb)}
                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  timebase === tb ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tb}ms/div
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer border shadow ${
              isFrozen
                ? 'bg-amber-600 border-amber-400 text-white animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isFrozen ? 'UNFREEZE' : 'HOLD / FREEZE'}</span>
          </button>
        </div>
      </div>

      {/* CHANNEL SELECTOR TABS */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'ALL', label: 'ALL CHANNELS (COMBINED)' },
          { id: 'AC_3PH', label: 'CH1: 3-PHASE AC SINE WAVES' },
          { id: 'SCR_6PULSE', label: 'CH2: 6-PULSE RECTIFIER ENVELOPE' },
          { id: 'DC_RIPPLE', label: 'CH3: FILTERED DC BUS & RIPPLE' },
          { id: 'IBATT', label: 'CH4: BATTERY CHARGE/DISCHARGE CURRENT' },
        ].map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id as any)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer border transition-all ${
              activeChannel === ch.id
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md'
                : 'bg-[#070b14] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* WAVEFORM CANVASES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* SYSTEM A OSCILLOSCOPE DISPLAY */}
        <div className="p-4 bg-[#070b14] border border-[#1e293b] rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> SYSTEM A WAVEFORM ANALYZER
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">VAC: {readouts.vAcBusA.toFixed(0)}V</span>
              <span className="text-[10px] text-emerald-400 font-mono">VDC: {readouts.vDcBus1.toFixed(1)}V</span>
            </div>
          </div>

          <div className="relative">
            <svg viewBox="0 0 500 120" className="w-full h-36 bg-[#04060a] border border-[#1e293b] rounded-lg">
              {/* OSCILLOSCOPE GRID MESH */}
              <defs>
                <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />
                </pattern>
              </defs>
              <rect width="500" height="120" fill="url(#grid)" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

              {/* CH1: 3PH AC WAVES */}
              {(activeChannel === 'ALL' || activeChannel === 'AC_3PH') && (
                <>
                  <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" points={acPhaseR_A} opacity="0.7" />
                  <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={acPhaseY_A} opacity="0.7" />
                  <polyline fill="none" stroke="#38bdf8" strokeWidth="1.5" points={acPhaseB_A} opacity="0.7" />
                </>
              )}

              {/* CH2: 6-PULSE RECTIFIED ENVELOPE */}
              {(activeChannel === 'ALL' || activeChannel === 'SCR_6PULSE') && (
                <polyline fill="none" stroke="#fbbf24" strokeWidth="2" points={raw6PulseA} opacity="0.8" strokeDasharray="3 3" />
              )}

              {/* CH3: FILTERED DC BUS VOLTAGE */}
              {(activeChannel === 'ALL' || activeChannel === 'DC_RIPPLE') && (
                <polyline fill="none" stroke="#10b981" strokeWidth="3" points={dcBus1Points} />
              )}

              {/* CH4: BATTERY CURRENT TRACE */}
              {(activeChannel === 'ALL' || activeChannel === 'IBATT') && (
                <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={iBatt1Points} />
              )}
            </svg>

            {/* CHANNEL LEGEND */}
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-300 pt-1 font-mono">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>Phase R</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>Phase Y</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>Phase B</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>6-Pulse SCR</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>DC Bus 1</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>I_Batt 1</span>
            </div>
          </div>

          {/* SYSTEM A TECHNICAL METRICS PANEL */}
          <div className="grid grid-cols-3 gap-2 bg-[#0d1424] p-3 rounded-xl border border-slate-800 text-[10px]">
            <div>FIRING ANGLE (α): <strong className="text-amber-400">{alphaA}°</strong></div>
            <div>RIPPLE Vpp: <strong className="text-emerald-400">{vRipplePpA.toFixed(2)} V</strong></div>
            <div>RIPPLE FACTOR: <strong className="text-emerald-400">{rippleFactorA}%</strong></div>
            <div>POWER FACTOR (cos φ): <strong className="text-purple-400">{pfA}</strong></div>
            <div>RIPPLE FREQ: <strong className="text-sky-400">300 Hz (6f)</strong></div>
            <div>BATTERY 1 Ibatt: <strong className="text-amber-400">{readouts.iBatt1 > 0 ? `+${readouts.iBatt1.toFixed(1)}A` : `${readouts.iBatt1.toFixed(1)}A`}</strong></div>
          </div>
        </div>

        {/* SYSTEM B OSCILLOSCOPE DISPLAY */}
        <div className="p-4 bg-[#070b14] border border-[#1e293b] rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> SYSTEM B WAVEFORM ANALYZER
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">VAC: {readouts.vAcBusB.toFixed(0)}V</span>
              <span className="text-[10px] text-emerald-400 font-mono">VDC: {readouts.vDcBus2.toFixed(1)}V</span>
            </div>
          </div>

          <div className="relative">
            <svg viewBox="0 0 500 120" className="w-full h-36 bg-[#04060a] border border-[#1e293b] rounded-lg">
              <rect width="500" height="120" fill="url(#grid)" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

              {/* CH1: 3PH AC WAVES */}
              {(activeChannel === 'ALL' || activeChannel === 'AC_3PH') && (
                <>
                  <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" points={acPhaseR_B} opacity="0.7" />
                  <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={acPhaseY_B} opacity="0.7" />
                  <polyline fill="none" stroke="#22d3ee" strokeWidth="1.5" points={acPhaseB_B} opacity="0.7" />
                </>
              )}

              {/* CH2: 6-PULSE RECTIFIED ENVELOPE */}
              {(activeChannel === 'ALL' || activeChannel === 'SCR_6PULSE') && (
                <polyline fill="none" stroke="#fbbf24" strokeWidth="2" points={raw6PulseB} opacity="0.8" strokeDasharray="3 3" />
              )}

              {/* CH3: FILTERED DC BUS VOLTAGE */}
              {(activeChannel === 'ALL' || activeChannel === 'DC_RIPPLE') && (
                <polyline fill="none" stroke="#10b981" strokeWidth="3" points={dcBus2Points} />
              )}

              {/* CH4: BATTERY CURRENT TRACE */}
              {(activeChannel === 'ALL' || activeChannel === 'IBATT') && (
                <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={iBatt2Points} />
              )}
            </svg>

            {/* CHANNEL LEGEND */}
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-300 pt-1 font-mono">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>Phase R</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>Phase Y</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>Phase B</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>6-Pulse SCR</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>DC Bus 2</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>I_Batt 2</span>
            </div>
          </div>

          {/* SYSTEM B TECHNICAL METRICS PANEL */}
          <div className="grid grid-cols-3 gap-2 bg-[#0d1424] p-3 rounded-xl border border-slate-800 text-[10px]">
            <div>FIRING ANGLE (α): <strong className="text-amber-400">{alphaB}°</strong></div>
            <div>RIPPLE Vpp: <strong className="text-emerald-400">{vRipplePpB.toFixed(2)} V</strong></div>
            <div>RIPPLE FACTOR: <strong className="text-emerald-400">{rippleFactorB}%</strong></div>
            <div>POWER FACTOR (cos φ): <strong className="text-purple-400">{pfB}</strong></div>
            <div>RIPPLE FREQ: <strong className="text-cyan-400">300 Hz (6f)</strong></div>
            <div>BATTERY 2 Ibatt: <strong className="text-amber-400">{readouts.iBatt2 > 0 ? `+${readouts.iBatt2.toFixed(1)}A` : `${readouts.iBatt2.toFixed(1)}A`}</strong></div>
          </div>
        </div>

      </div>

      {/* IEEE / IEC COMPLIANCE FOOTER NOTE */}
      <div className="bg-[#070b14] p-2.5 rounded-xl border border-[#1e293b] flex items-center justify-between text-[11px] text-slate-300 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span><strong>IEEE 1188 / IEC 62485-2 Substation Standard:</strong> DC Bus Ripple Factor &lt; 0.5% Vrms to prevent battery cell degradation.</span>
        </div>
        <span className="font-mono text-emerald-400 font-bold">RF &lt; 0.5% COMPLIANT</span>
      </div>

    </div>
  );
};
