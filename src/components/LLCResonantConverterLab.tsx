import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Layers, AlertTriangle, ShieldCheck, Flame, Info, CheckCircle2, RotateCcw } from 'lucide-react';

interface LLCResonantConverterLabProps {
  onClose?: () => void;
}

export const LLCResonantConverterLab: React.FC<LLCResonantConverterLabProps> = ({ onClose }) => {
  // Resonant Tank Component Values
  const [lrUh, setLrUh] = useState<number>(20.0); // 20 uH series resonant inductance
  const [crNf, setCrNf] = useState<number>(22.0); // 22 nF series resonant capacitance
  const [kRatio, setKRatio] = useState<number>(5.0); // Lm / Lr ratio (Lm = k * Lr = 100 uH)
  const [rLoad, setRLoad] = useState<number>(10.0); // Output load resistance (Ohms)
  const [inputVdc, setInputVdc] = useState<number>(400.0); // 400V DC bus (typical server/PFC bus)
  const [turnsRatio] = useState<number>(4.0); // n:1 = 4:1 (nominal 48V/12V output)

  // Primary Series Resonance frequency: fr = 1 / (2*pi*sqrt(Lr*Cr))
  const lrH = lrUh * 1e-6;
  const crF = crNf * 1e-9;
  const lmH = kRatio * lrH;
  const frHz = 1 / (2 * Math.PI * Math.sqrt(lrH * crF));
  const frKhz = frHz / 1000;

  // Secondary Magnetizing Resonance frequency: fm = 1 / (2*pi*sqrt((Lr+Lm)*Cr))
  const fmHz = 1 / (2 * Math.PI * Math.sqrt((lrH + lmH) * crF));
  const fmKhz = fmHz / 1000;

  // Active Switching Frequency (kHz)
  const [fswKhz, setFswKhz] = useState<number>(Math.round(frKhz));

  // AC Equivalent Load and Quality Factor Q
  const rAc = (8 * Math.pow(turnsRatio, 2) / Math.pow(Math.PI, 2)) * rLoad;
  const z0 = Math.sqrt(lrH / crF);
  const qFactor = z0 / rAc;

  // Normalized Frequency fn = fsw / fr
  const fn = fswKhz / frKhz;

  // First Harmonic Approximation (FHA) Voltage Gain M(fn, k, Q)
  const calcGain = (normFreq: number, q: number) => {
    const term1 = 1 + (1 / kRatio) * (1 - 1 / Math.pow(normFreq, 2));
    const term2 = q * (normFreq - 1 / normFreq);
    const denom = Math.sqrt(Math.pow(term1, 2) + Math.pow(term2, 2));
    return denom > 0 ? 1 / denom : 0;
  };

  const currentGain = calcGain(fn, qFactor);
  const outputVoltage = (inputVdc / (2 * turnsRatio)) * currentGain;

  // Operating Regimes:
  // 1. Below Resonance: fm < fsw < fr (Boost, ZVS for primary, ZCS for secondary)
  // 2. At Resonance: fsw ≈ fr (M ≈ 1, Peak Efficiency)
  // 3. Above Resonance: fsw > fr (Buck, ZVS for primary, Hard turn-off for secondary)
  // 4. Capacitive DANGER: fsw < fm or slope dM/df > 0 (Hard switching, shoot-through)
  const isAtResonance = Math.abs(fn - 1.0) < 0.03;
  const isBelowResonance = fn >= 0.72 && fn < 0.97;
  const isAboveResonance = fn > 1.03;
  const isCapacitiveFault = fn < 0.70;

  const gainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simPhaseRef = useRef<number>(0);

  // Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      simPhaseRef.current += dt * (fswKhz * 0.04);

      // 1. RENDER GAIN CURVE CANVAS M(fn)
      const gCanvas = gainCanvasRef.current;
      if (gCanvas) {
        const ctx = gCanvas.getContext('2d');
        if (ctx) {
          const w = gCanvas.width;
          const h = gCanvas.height;

          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          const padL = 36;
          const padR = 18;
          const padT = 20;
          const padB = 28;
          const cw = w - padL - padR;
          const ch = h - padT - padB;

          // fn range: 0.3 to 2.0
          const fnMin = 0.3;
          const fnMax = 2.0;
          const gMax = 2.0;

          const fnToX = (fNorm: number) => padL + ((fNorm - fnMin) / (fnMax - fnMin)) * cw;
          const gToY = (gainVal: number) => padT + (1 - Math.max(0, Math.min(gMax, gainVal)) / gMax) * ch;

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          [0.5, 1.0, 1.5, 2.0].forEach((fVal) => {
            const x = fnToX(fVal);
            ctx.moveTo(x, padT); ctx.lineTo(x, padT + ch);
          });
          [0.5, 1.0, 1.5, 2.0].forEach((gVal) => {
            const y = gToY(gVal);
            ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y);
          });
          ctx.stroke();

          // Axis Labels
          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.fillText('fn = 1.0 (fr)', fnToX(1.0) - 24, padT + ch + 16);
          ctx.fillText('fn = 0.5', fnToX(0.5) - 16, padT + ch + 16);
          ctx.fillText('fn = 1.5', fnToX(1.5) - 16, padT + ch + 16);
          ctx.fillText('M=1.0', 4, gToY(1.0) + 3);
          ctx.fillText('M=1.5', 4, gToY(1.5) + 3);

          // Danger Zone / Capacitive Region Shading (fn < 0.7)
          const capBorderX = fnToX(0.70);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
          ctx.fillRect(padL, padT, capBorderX - padL, ch);
          ctx.fillStyle = '#ef4444';
          ctx.fillText('CAPACITIVE REGION (HARD ZCS FAULT)', padL + 8, padT + 14);

          // Unity Gain Reference Line (M = 1.0)
          ctx.strokeStyle = '#475569';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(padL, gToY(1.0)); ctx.lineTo(padL + cw, gToY(1.0));
          ctx.stroke();
          ctx.setLineDash([]);

          // Plot Multiple Q Curves: Q=0.2 (light load), Q=0.5 (nominal), Q=1.2 (heavy load)
          const qCurves = [
            { qVal: 0.2, color: 'rgba(56, 189, 248, 0.4)', label: 'Light (Q=0.2)' },
            { qVal: 0.5, color: 'rgba(56, 189, 248, 0.6)', label: 'Nom (Q=0.5)' },
            { qVal: 1.2, color: 'rgba(56, 189, 248, 0.8)', label: 'Heavy (Q=1.2)' },
          ];

          qCurves.forEach((item) => {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const steps = 80;
            for (let i = 0; i <= steps; i++) {
              const testFn = fnMin + (i / steps) * (fnMax - fnMin);
              const testG = calcGain(testFn, item.qVal);
              const x = fnToX(testFn);
              const y = gToY(testG);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          });

          // Plot Active Curve with User's current Q
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          const activeSteps = 90;
          for (let i = 0; i <= activeSteps; i++) {
            const testFn = fnMin + (i / activeSteps) * (fnMax - fnMin);
            const testG = calcGain(testFn, qFactor);
            const x = fnToX(testFn);
            const y = gToY(testG);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Operating Point Marker
          const dotX = fnToX(fn);
          const dotY = gToY(currentGain);

          const halo = ctx.createRadialGradient(dotX, dotY, 1, dotX, dotY, 12);
          halo.addColorStop(0, isCapacitiveFault ? 'rgba(239, 68, 68, 0.9)' : isAtResonance ? 'rgba(52, 211, 153, 0.9)' : 'rgba(56, 189, 248, 0.9)');
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 12, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = isCapacitiveFault ? '#ef4444' : isAtResonance ? '#10b981' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`M = ${currentGain.toFixed(2)} (fn = ${fn.toFixed(2)})`, dotX + 8, dotY - 6);
        }
      }

      // 2. RENDER MULTI-TRACE OSCILLOSCOPE CANVAS (ZVS & ZCS Proof)
      const sCanvas = scopeCanvasRef.current;
      if (sCanvas) {
        const ctx = sCanvas.getContext('2d');
        if (ctx) {
          const w = sCanvas.width;
          const h = sCanvas.height;

          ctx.fillStyle = '#060a12';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let x = 0; x < w; x += 35) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
          }
          for (let y = 0; y < h; y += 35) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
          }
          ctx.stroke();

          // Zero line
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
          ctx.stroke();

          const totalCycles = 2.5;
          const pts = w;

          // Multi-Trace generation:
          // Trace 1: Q1 Gate Drive V_g1 (Purple)
          // Trace 2: Switch Drain-Source Voltage V_ds1 (Cyan) -> Drops to 0 during dead time for ZVS!
          // Trace 3: Tank Resonant Current i_Lr(t) (Emerald)
          // Trace 4: Secondary Diode Current i_sec(t) (Amber) -> Reaches zero naturally for ZCS!

          // Draw Gate Drive V_g1 (Top 25% zone)
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const theta = ((x / pts) * totalCycles * 2 * Math.PI) + (simPhaseRef.current % (2 * Math.PI));
            const cyclePhase = theta % (2 * Math.PI);
            // 50% duty with dead-time: Gate ON from 0.08 to 0.92 of half cycle
            const isQ1On = cyclePhase >= 0.2 && cyclePhase <= Math.PI - 0.2;
            const y = 35 - (isQ1On ? 18 : 0);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Switch Drain-Source V_ds1 (Cyan, dropping to 0 BEFORE Gate ON = ZVS!)
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const theta = ((x / pts) * totalCycles * 2 * Math.PI) + (simPhaseRef.current % (2 * Math.PI));
            const cyclePhase = theta % (2 * Math.PI);
            let vds = 0;
            if (isCapacitiveFault) {
              // Hard turn on with shoot-through spike!
              vds = cyclePhase < Math.PI ? 0 : 400;
            } else {
              // ZVS: discharges during dead-time (0.0 to 0.2)
              if (cyclePhase < 0.2) {
                vds = 400 * (1 - cyclePhase / 0.2);
              } else if (cyclePhase <= Math.PI) {
                vds = 0;
              } else if (cyclePhase <= Math.PI + 0.2) {
                vds = 400 * ((cyclePhase - Math.PI) / 0.2);
              } else {
                vds = 400;
              }
            }
            const y = 90 - (vds / 400) * 35;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Tank Resonant Current i_Lr(t) (Emerald)
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const theta = ((x / pts) * totalCycles * 2 * Math.PI) + (simPhaseRef.current % (2 * Math.PI));
            // Tank current has phase lag when inductive, lead when capacitive
            const phaseShift = isCapacitiveFault ? +0.6 : isAtResonance ? 0 : -0.4;
            const iLr = Math.sin(theta + phaseShift) * 12; // 12A peak
            const y = (h * 0.65) - (iLr / 15) * 35;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Secondary Rectifier Diode Current i_sec(t) (Amber, showing ZCS)
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const theta = ((x / pts) * totalCycles * 2 * Math.PI) + (simPhaseRef.current % (2 * Math.PI));
            const cyclePhase = theta % (2 * Math.PI);
            let isec = 0;
            if (isBelowResonance) {
              // ZCS: Diode conducts, then reaches zero BEFORE switch turns off!
              if (cyclePhase > 0.3 && cyclePhase < Math.PI - 0.4) {
                isec = Math.sin((cyclePhase - 0.3) / (Math.PI - 0.7) * Math.PI) * 25;
              }
            } else if (isAtResonance) {
              if (cyclePhase > 0.2 && cyclePhase < Math.PI - 0.1) {
                isec = Math.sin((cyclePhase - 0.2) / (Math.PI - 0.3) * Math.PI) * 25;
              }
            } else {
              // Above resonance: Diode is abruptly cut off at end of half-cycle (hard recovery)
              if (cyclePhase > 0.2 && cyclePhase < Math.PI) {
                isec = Math.sin((cyclePhase - 0.2) / (Math.PI - 0.2) * Math.PI) * 25;
              }
            }
            const y = (h - 18) - (isec / 30) * 35;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Header Legend
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#c084fc';
          ctx.fillText('― Gate V_g1', 10, 16);
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('― V_ds1 (ZVS to 0V)', 100, 16);
          ctx.fillStyle = '#34d399';
          ctx.fillText('― Resonant i_Lr(t)', 230, 16);
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`― Diode i_sec(t) [${isBelowResonance ? 'SOFT ZCS' : isAboveResonance ? 'HARD RECOVERY' : 'OPTIMAL'}]`, 360, 16);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fswKhz, frKhz, fn, qFactor, kRatio, isAtResonance, isBelowResonance, isAboveResonance, isCapacitiveFault, currentGain]);

  const handlePreset = (mode: 'below' | 'res' | 'above' | 'capacitive') => {
    if (mode === 'below') setFswKhz(Math.round(frKhz * 0.85));
    if (mode === 'res') setFswKhz(Math.round(frKhz));
    if (mode === 'above') setFswKhz(Math.round(frKhz * 1.30));
    if (mode === 'capacitive') setFswKhz(Math.round(frKhz * 0.60));
  };

  return (
    <div className="w-full bg-[#0a0f1d] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-5 text-white font-mono">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-xl text-[#38bdf8]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold tracking-wide uppercase text-white">
                Resonant LLC Converter ZVS / ZCS Cavity &amp; Frequency Gain Lab
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8]">
                IEEE 1515 / Server &amp; EV Architecture
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
              Zero-Voltage Switching (ZVS), Zero-Current Switching (ZCS), and First Harmonic Approximation (FHA) gain control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] text-xs font-mono transition-all cursor-pointer"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {/* TOP PRESET BAR & STATUS */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#94a3b8]">Quick Presets:</span>
          <button
            onClick={() => handlePreset('below')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isBelowResonance ? 'bg-cyan-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            📉 Below Resonance (Boost + ZCS)
          </button>
          <button
            onClick={() => handlePreset('res')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isAtResonance ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            ⭐ At Resonance (Unity Gain &amp; Peak Eff)
          </button>
          <button
            onClick={() => handlePreset('above')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isAboveResonance ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            📈 Above Resonance (Buck Mode)
          </button>
          <button
            onClick={() => handlePreset('capacitive')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isCapacitiveFault ? 'bg-rose-600 text-white shadow-md animate-pulse' : 'bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            ⚠️ Capacitive Fault Zone
          </button>
        </div>

        <div className={`text-xs font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 ${
          isCapacitiveFault
            ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
            : isAtResonance
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
            : 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
        }`}>
          {isCapacitiveFault ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>
            {isCapacitiveFault
              ? 'CAPACITIVE FAULT (HARD SWITCHING)'
              : isAtResonance
              ? 'RESONANT SWEET-SPOT (PEAK EFFICIENCY)'
              : isBelowResonance
              ? 'BELOW RESONANCE (BOOST + ZCS)'
              : 'ABOVE RESONANCE (BUCK MODE)'}
          </span>
        </div>
      </div>

      {/* DUAL CANVASES: GAIN CURVE M(fn) AND CRT SCOPE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 5 COLS: FREQUENCY GAIN CURVE M(fn) */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#38bdf8]" /> FHA VOLTAGE GAIN M(f_n)
            </span>
            <span className="text-[11px] text-[#38bdf8] font-bold">
              f_r = {frKhz.toFixed(1)} kHz | f_m = {fmKhz.toFixed(1)} kHz
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#090d16] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={gainCanvasRef}
              width={340}
              height={250}
              className="w-full h-auto max-h-[260px]"
            />
          </div>

          <div className="text-[11px] font-mono text-[#94a3b8] leading-tight">
            Varying f_sw modulates normalized frequency f_n, sliding along the resonant tank gain curve.
          </div>
        </div>

        {/* RIGHT 7 COLS: OSCILLOSCOPE (ZVS & ZCS DYNAMICS) */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" /> ZVS &amp; ZCS SWITCHING SCOPE
            </span>
            <span className="text-[11px] text-[#34d399] font-bold">
              V_ds1 = 0V Before Gate Pulse
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#060a12] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={scopeCanvasRef}
              width={540}
              height={250}
              className="w-full h-auto max-h-[260px]"
            />
          </div>

          {/* TELEMETRY READOUT STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">VOLTAGE GAIN M</span>
              <div className="text-sm font-extrabold text-white">{currentGain.toFixed(2)}x</div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">OUTPUT VOLTAGE</span>
              <div className="text-sm font-extrabold text-[#38bdf8]">{outputVoltage.toFixed(1)} VDC</div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">PRIMARY SWITCHING</span>
              <div className={`text-sm font-extrabold ${isCapacitiveFault ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isCapacitiveFault ? 'HARD (NO ZVS)' : '100% SOFT ZVS'}
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <span className="text-[10px] text-[#94a3b8]">SECONDARY DIODES</span>
              <div className={`text-sm font-extrabold ${isBelowResonance ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isBelowResonance ? 'SOFT ZCS' : 'HARD COMMUTATION'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS & PHYSICAL EXPLANATION */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
        {/* CONTROLS (8 COLS) */}
        <div className="md:col-span-8 flex flex-col gap-4 font-mono text-xs">
          <div className="text-xs font-extrabold text-[#38bdf8] uppercase tracking-wider">
            Resonant Tank &amp; Frequency Modulation Controls
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SWITCHING FREQUENCY SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Switching Freq f_sw:</span>
                <span className="font-bold text-[#38bdf8]">{fswKhz} kHz</span>
              </div>
              <input
                type="range"
                min={Math.round(frKhz * 0.5)}
                max={Math.round(frKhz * 1.6)}
                step="2"
                value={fswKhz}
                onChange={(e) => setFswKhz(parseFloat(e.target.value))}
                className="w-full accent-[#38bdf8] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>fm: {fmKhz.toFixed(0)}k</span>
                <span>fr: {frKhz.toFixed(0)}k</span>
                <span>Max</span>
              </div>
            </div>

            {/* LOAD RESISTANCE */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Load Resistor R_L:</span>
                <span className="font-bold text-amber-400">{rLoad} Ω</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="50.0"
                step="2.0"
                value={rLoad}
                onChange={(e) => setRLoad(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>2Ω (Heavy)</span>
                <span>50Ω (Light)</span>
              </div>
            </div>

            {/* INDUCTANCE RATIO k = Lm / Lr */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Inductance Ratio k (Lm/Lr):</span>
                <span className="font-bold text-emerald-400">{kRatio.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="8.0"
                step="0.5"
                value={kRatio}
                onChange={(e) => setKRatio(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>k=3 (Narrow)</span>
                <span>k=8 (Flat)</span>
              </div>
            </div>
          </div>
        </div>

        {/* PHYSICAL LAW EXPLANATION (4 COLS) */}
        <div className="md:col-span-4 bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 flex flex-col justify-between text-xs font-mono space-y-2.5">
          <div className="flex items-center gap-2 text-white font-bold pb-2 border-b border-[#334155]">
            <Info className="w-4 h-4 text-[#38bdf8]" />
            <span>LLC CAVITY PHYSICS INSIGHT</span>
          </div>

          <div className="text-[11px] text-[#c9d1d9] space-y-1.5 leading-relaxed">
            <p>
              • <b>ZVS Mechanism:</b> During dead time, inductive tank current i_Lr discharges MOSFET output capacitance C_oss, bringing V_ds to 0V before the gate pulse fires—eliminating capacitive turn-on losses!
            </p>
            <p>
              • <b>Secondary ZCS:</b> Below resonance (f_s &lt; f_r), secondary rectifiers stop conducting naturally before primary switches turn off, eliminating diode reverse recovery (Q_rr = 0).
            </p>
            <p>
              • <b>Capacitive Danger:</b> Operating below peak gain causes current to lead voltage; body diodes conduct at turn-on, creating violent reverse recovery shoot-through!
            </p>
          </div>

          <div className="pt-2 border-t border-[#334155] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Typical Efficiency</span>
            <span className="text-emerald-400 font-bold">&gt; 97.5% @ fr</span>
          </div>
        </div>
      </div>
    </div>
  );
};
