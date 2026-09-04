import React, { useState, useEffect, useRef } from 'react';
import { Layers, Activity, Zap, ShieldCheck, AlertTriangle, Info } from 'lucide-react';

interface TransformerHysteresisInrushLabProps {
  onClose?: () => void;
}

type CoreMaterialType = 'grain_oriented' | 'non_oriented' | 'amorphous' | 'ferrite';

interface MaterialProperties {
  name: string;
  bSat: number;   // Tesla
  bRem: number;   // Tesla
  hCoercive: number; // A/m
  relativeMu: number;
  color: string;
}

const MATERIALS: Record<CoreMaterialType, MaterialProperties> = {
  grain_oriented: {
    name: 'Grain-Oriented Silicon Steel (CRGO M4)',
    bSat: 1.85,
    bRem: 1.15,
    hCoercive: 35,
    relativeMu: 7500,
    color: '#38bdf8'
  },
  non_oriented: {
    name: 'Non-Oriented Silicon Steel (M19)',
    bSat: 1.65,
    bRem: 0.75,
    hCoercive: 65,
    relativeMu: 4000,
    color: '#a855f7'
  },
  amorphous: {
    name: 'Amorphous Metal (Metglas 2605SA1)',
    bSat: 1.56,
    bRem: 0.50,
    hCoercive: 8,
    relativeMu: 45000,
    color: '#34d399'
  },
  ferrite: {
    name: 'Power Ferrite (N87 High Frequency)',
    bSat: 0.49,
    bRem: 0.16,
    hCoercive: 16,
    relativeMu: 2200,
    color: '#f59e0b'
  }
};

export const TransformerHysteresisInrushLab: React.FC<TransformerHysteresisInrushLabProps> = ({ onClose }) => {
  const [material, setMaterial] = useState<CoreMaterialType>('grain_oriented');
  const [closingAngleDeg, setClosingAngleDeg] = useState<number>(0); // 0 = worst case voltage zero crossing
  const [remanencePct, setRemanencePct] = useState<number>(80); // % of material's natural bRem (-100% to +100%)
  const [windingResistance, setWindingResistance] = useState<number>(0.15); // Ohms (determines L/R decay)
  const [ratedCurrent] = useState<number>(50.0); // Amperes RMS
  const [isBreakerClosed, setIsBreakerClosed] = useState<boolean>(true);
  const [harmonicRestraintThreshold] = useState<number>(15); // 15% threshold for ANSI 87T

  const bhCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0);

  const mat = MATERIALS[material];
  const activeBRem = (remanencePct / 100) * mat.bRem;

  // Calculated Inrush Metrics
  const normalFluxMax = mat.bSat * 0.72; // Normal operating peak flux ~1.33 T
  const theoreticalPeakFlux = normalFluxMax * (1 + Math.cos((closingAngleDeg * Math.PI) / 180)) + activeBRem;
  const isSaturated = theoreticalPeakFlux > mat.bSat;
  const saturationSeverity = Math.max(0, (theoreticalPeakFlux - mat.bSat) / mat.bSat);
  
  // Non-linear inrush multiplier (air-core saturation causes massive current spike)
  const inrushPeakMultiple = isSaturated
    ? 1.0 + Math.pow(saturationSeverity * 3.8, 1.8) * 9.5
    : 1.1;
  const inrushPeakAmps = ratedCurrent * Math.sqrt(2) * inrushPeakMultiple;
  const inrushRatio = inrushPeakMultiple;

  // 2nd harmonic ratio during inrush
  const secondHarmonicRatio = isSaturated ? Math.min(42, 18 + saturationSeverity * 24) : 4.5;
  const is87TRestrained = secondHarmonicRatio >= harmonicRestraintThreshold;

  // Animation Loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      if (isBreakerClosed) {
        simTimeRef.current += dt * 1.5; // continuous cycle simulation
      }

      const t = simTimeRef.current;
      const omega = 2 * Math.PI * 50; // 50 Hz
      const closingRad = (closingAngleDeg * Math.PI) / 180;
      
      // Real-time instantaneous magnetic state
      const tauDecay = Math.max(0.08, 1.5 / (windingResistance * 8 + 0.5));
      const decayFactor = Math.exp(-((t % 2.0)) / tauDecay);
      
      // AC flux + DC offset
      const phiAc = -normalFluxMax * Math.cos(omega * t + closingRad);
      const phiDc = (normalFluxMax * Math.cos(closingRad) + activeBRem) * decayFactor;
      const instantB = isBreakerClosed ? Math.max(-mat.bSat * 1.6, Math.min(mat.bSat * 1.6, phiAc + phiDc)) : activeBRem;

      // Invert B-H non-linear relation to get H(t)
      let instantH = 0;
      if (Math.abs(instantB) < mat.bSat * 0.85) {
        instantH = (instantB / (mat.relativeMu * 4e-7 * Math.PI)) * 0.001;
      } else {
        // Air core inductance slope when saturated
        const bExc = Math.abs(instantB) - mat.bSat * 0.85;
        const hCore = ((mat.bSat * 0.85) / (mat.relativeMu * 4e-7 * Math.PI)) * 0.001;
        const hAir = (bExc / (4e-7 * Math.PI)) * 0.00015;
        instantH = Math.sign(instantB) * (hCore + hAir * 18);
      }

      // Instantaneous current proportional to H
      const instantCurrent = isBreakerClosed
        ? instantH * 0.65 + (Math.sin(omega * t) * (ratedCurrent * Math.sqrt(2) * 0.04))
        : 0;

      // 1. RENDER B-H CURVE CANVAS
      const bhCanvas = bhCanvasRef.current;
      if (bhCanvas) {
        const ctx = bhCanvas.getContext('2d');
        if (ctx) {
          const w = bhCanvas.width;
          const h = bhCanvas.height;
          const cx = w / 2;
          const cy = h / 2;

          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // Grid Lines
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 30; x < w; x += 40) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
          }
          for (let y = 30; y < h; y += 40) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
          }
          ctx.stroke();

          // Axes
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, cy); ctx.lineTo(w, cy); // H axis
          ctx.moveTo(cx, 0); ctx.lineTo(cx, h); // B axis
          ctx.stroke();

          // Axis Labels
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px monospace';
          ctx.fillText('+B (Tesla)', cx + 6, 14);
          ctx.fillText('-B (Tesla)', cx + 6, h - 6);
          ctx.fillText('+H (A/m)', w - 48, cy - 6);
          ctx.fillText('-H (A/m)', 6, cy - 6);

          // Saturation Limits Lines (Dashed Red)
          const scaleB = (h * 0.38) / mat.bSat;
          const satYPos = cy - mat.bSat * scaleB;
          const satYNeg = cy + mat.bSat * scaleB;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, satYPos); ctx.lineTo(w, satYPos);
          ctx.moveTo(0, satYNeg); ctx.lineTo(w, satYNeg);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f87171';
          ctx.fillText(`+Bsat = ${mat.bSat}T`, 6, satYPos - 4);
          ctx.fillText(`-Bsat = -${mat.bSat}T`, 6, satYNeg + 12);

          // Draw Theoretical Hysteresis Major Loop
          const scaleH = (w * 0.38) / (mat.hCoercive * 3.5);
          ctx.strokeStyle = mat.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          const pts = 80;
          for (let i = 0; i <= pts; i++) {
            const angle = (i / pts) * 2 * Math.PI;
            const hVal = Math.sin(angle) * (mat.hCoercive * 2.8);
            const offset = (Math.cos(angle) > 0 ? 1 : -1) * (mat.hCoercive * 0.7);
            const effectiveH = hVal - offset;
            const bVal = mat.bSat * Math.tanh(effectiveH / (mat.hCoercive * 1.2));
            
            const px = cx + hVal * scaleH;
            const py = cy - bVal * scaleB;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          // Remanence Point marker Br
          const brY = cy - activeBRem * scaleB;
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(cx, brY, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillText(`Br = ${activeBRem.toFixed(2)}T`, cx + 8, brY + 3);

          // Operating Point Comet
          const currentX = cx + Math.max(-cx + 10, Math.min(cx - 10, instantH * scaleH));
          const currentY = cy - Math.max(-cy + 10, Math.min(cy - 10, instantB * scaleB));

          // Glow Halo
          const glowGrad = ctx.createRadialGradient(currentX, currentY, 1, currentX, currentY, 14);
          glowGrad.addColorStop(0, Math.abs(instantB) > mat.bSat ? 'rgba(239, 68, 68, 0.9)' : 'rgba(56, 189, 248, 0.9)');
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(currentX, currentY, 14, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = Math.abs(instantB) > mat.bSat ? '#ef4444' : '#ffffff';
          ctx.beginPath();
          ctx.arc(currentX, currentY, 4.5, 0, 2 * Math.PI);
          ctx.fill();

          // Core state badge
          ctx.fillStyle = Math.abs(instantB) > mat.bSat ? '#ef4444' : '#10b981';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(
            Math.abs(instantB) > mat.bSat ? 'CORE IN DEEP SATURATION' : 'NORMAL LINEAR REGION',
            w - 180,
            h - 10
          );
        }
      }

      // 2. RENDER MULTI-TRACE OSCILLOSCOPE CANVAS
      const scopeCanvas = scopeCanvasRef.current;
      if (scopeCanvas) {
        const ctx = scopeCanvas.getContext('2d');
        if (ctx) {
          const w = scopeCanvas.width;
          const h = scopeCanvas.height;

          ctx.fillStyle = '#060a12';
          ctx.fillRect(0, 0, w, h);

          // CRT Scope Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          const gridStep = 32;
          for (let x = 0; x < w; x += gridStep) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
          }
          for (let y = 0; y < h; y += gridStep) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
          }
          ctx.stroke();

          // Center baseline
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
          ctx.stroke();

          const totalCycles = 4.5;
          const tWindow = totalCycles * 0.02; // 50 Hz = 20ms per cycle
          const pts = w;

          // Helper to calculate wave values at time slice
          const getSliceValues = (relTime: number) => {
            const omegaT = 2 * Math.PI * 50 * relTime;
            const volt = isBreakerClosed ? 415 * Math.sqrt(2) * Math.sin(omegaT + closingRad) : 0;
            
            const tauDec = Math.max(0.06, 1.2 / (windingResistance * 8 + 0.5));
            const dec = Math.exp(-relTime / tauDec);
            const fluxAc = -normalFluxMax * Math.cos(omegaT + closingRad);
            const fluxDc = (normalFluxMax * Math.cos(closingRad) + activeBRem) * dec;
            const totalFlux = isBreakerClosed ? fluxAc + fluxDc : activeBRem;

            // Inrush current waveform calculation
            let curr = 0;
            if (isBreakerClosed) {
              if (totalFlux > mat.bSat) {
                const satDiff = totalFlux - mat.bSat;
                curr = (satDiff / 0.04) * (ratedCurrent * 1.6);
              } else if (totalFlux < -mat.bSat) {
                const satDiff = totalFlux + mat.bSat;
                curr = (satDiff / 0.04) * (ratedCurrent * 1.6);
              } else {
                curr = Math.sin(omegaT) * (ratedCurrent * 0.04);
              }
            }
            return { volt, flux: totalFlux, curr };
          };

          // Draw Trace 1: Applied Voltage v(t) [CYAN]
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const relT = (x / pts) * tWindow;
            const vals = getSliceValues(relT);
            const y = (h / 2) - (vals.volt / 650) * (h * 0.38);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Trace 2: Core Flux Phi(t) [EMERALD]
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const relT = (x / pts) * tWindow;
            const vals = getSliceValues(relT);
            const y = (h / 2) - (vals.flux / (mat.bSat * 2.2)) * (h * 0.42);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Trace 3: Saturated Inrush Current i(t) [RED / AMBER]
          ctx.strokeStyle = inrushRatio > 4 ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let x = 0; x < pts; x++) {
            const relT = (x / pts) * tWindow;
            const vals = getSliceValues(relT);
            const maxDisplayCurr = ratedCurrent * 14;
            const y = (h / 2) - (vals.curr / maxDisplayCurr) * (h * 0.45);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Legend Header
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('― V_primary (415V RMS)', 12, 18);
          ctx.fillStyle = '#34d399';
          ctx.fillText('― Core Flux Φ(t)', 180, 18);
          ctx.fillStyle = inrushRatio > 4 ? '#ef4444' : '#f59e0b';
          ctx.fillText(`― Inrush Current i(t) [Peak: ${inrushPeakAmps.toFixed(0)}A, ${inrushRatio.toFixed(1)}x FLA]`, 310, 18);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [material, closingAngleDeg, remanencePct, windingResistance, isBreakerClosed, activeBRem, mat, normalFluxMax, ratedCurrent, inrushRatio, inrushPeakAmps]);

  const handleResetEnergize = () => {
    setIsBreakerClosed(false);
    setTimeout(() => {
      simTimeRef.current = 0;
      setIsBreakerClosed(true);
    }, 120);
  };

  return (
    <div className="w-full bg-[#0a0f1d] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-5 text-white">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-xl text-[#38bdf8]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold tracking-wide uppercase text-white">
                B-H Hysteresis Loop & Transformer Inrush Transient Lab
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8]">
                IEEE Std C57.12 / ANSI 87T
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
              Non-linear magnetic core saturation dynamics, remanent flux doubling, and 2nd-harmonic restraint.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetEnergize}
            className="px-3.5 py-1.5 rounded-xl bg-[#38bdf8] hover:bg-[#0284c7] text-[#0a0f1d] font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.4)] cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>ENERGIZE BREAKER 52</span>
          </button>
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

      {/* TOP ROW: DUAL INTERACTIVE CANVASES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 5 COLS: DYNAMIC B-H CURVE */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#38bdf8]" /> 2D B-H MAGNETIZATION LOOP
            </span>
            <span className="text-[11px] text-[#38bdf8] font-bold">
              B_sat = {mat.bSat}T | H_c = {mat.hCoercive}A/m
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#090d16] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={bhCanvasRef}
              width={340}
              height={260}
              className="w-full h-auto max-h-[270px]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] px-1">
            <span>Core Material: <b className="text-white">{mat.name.split(' ')[0]}</b></span>
            <span>Permeability μ_r: <b className="text-[#34d399]">{mat.relativeMu.toLocaleString()}</b></span>
          </div>
        </div>

        {/* RIGHT 7 COLS: TRANSIENT OSCILLOSCOPE & INRUSH CURRENT */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#eab308]" /> INRUSH TRANSIENT SCOPE (v, Φ, i)
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              inrushRatio > 6
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                : inrushRatio > 2
                ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                : 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
            }`}>
              {inrushRatio > 6 ? 'CRITICAL INRUSH' : inrushRatio > 2 ? 'MODERATE INRUSH' : 'MINIMAL INRUSH'}
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#060a12] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={scopeCanvasRef}
              width={540}
              height={260}
              className="w-full h-auto max-h-[270px]"
            />
          </div>

          {/* TELEMETRY READOUT STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2 flex flex-col">
              <span className="text-[10px] text-[#94a3b8]">PEAK INRUSH CURRENT</span>
              <span className={`text-sm font-extrabold ${inrushRatio > 6 ? 'text-[#ef4444]' : 'text-amber-400'}`}>
                {inrushPeakAmps.toFixed(0)} A ({inrushRatio.toFixed(1)}x FLA)
              </span>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2 flex flex-col">
              <span className="text-[10px] text-[#94a3b8]">PEAK FLUX REACHED</span>
              <span className={`text-sm font-extrabold ${isSaturated ? 'text-[#ef4444]' : 'text-[#34d399]'}`}>
                {theoreticalPeakFlux.toFixed(2)} T ({((theoreticalPeakFlux / mat.bSat) * 100).toFixed(0)}% Bsat)
              </span>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2 flex flex-col">
              <span className="text-[10px] text-[#94a3b8]">2nd HARMONIC RATIO</span>
              <span className="text-sm font-extrabold text-[#38bdf8]">
                {secondHarmonicRatio.toFixed(1)}% (I₂ / I₁)
              </span>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2 flex flex-col">
              <span className="text-[10px] text-[#94a3b8]">87T DIFFERENTIAL RELAY</span>
              <span className={`text-sm font-extrabold flex items-center gap-1 ${
                is87TRestrained ? 'text-[#34d399]' : 'text-[#ef4444]'
              }`}>
                {is87TRestrained ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {is87TRestrained ? 'RESTRAINED' : 'TRIP HAZARD'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS & PHYSICAL EXPLANATION */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
        {/* CONTROLS (8 COLS) */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <div className="text-xs font-extrabold text-[#38bdf8] uppercase tracking-wider">
            Magnetic Core &amp; Energization Parameters
          </div>

          {/* MATERIAL SELECTOR */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[#94a3b8] font-mono">Select Core Steel Material:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(MATERIALS) as CoreMaterialType[]).map((key) => {
                const item = MATERIALS[key];
                return (
                  <button
                    key={key}
                    onClick={() => setMaterial(key)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all text-left ${
                      material === key
                        ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                        : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    <div>{item.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-[#64748b]">Bsat: {item.bSat}T</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SLIDERS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            {/* CLOSING ANGLE SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Breaker Angle θ_close:</span>
                <span className={`font-bold ${closingAngleDeg === 0 ? 'text-[#ef4444]' : closingAngleDeg === 90 ? 'text-[#34d399]' : 'text-white'}`}>
                  {closingAngleDeg}° {closingAngleDeg === 0 ? '(Worst Case 0°)' : closingAngleDeg === 90 ? '(Best Case 90°)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                step="5"
                value={closingAngleDeg}
                onChange={(e) => setClosingAngleDeg(parseFloat(e.target.value))}
                className="w-full accent-[#38bdf8] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>0° (V=0)</span>
                <span>90° (V_pk)</span>
                <span>180°</span>
              </div>
            </div>

            {/* REMANENCE SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Residual Flux Br:</span>
                <span className="font-bold text-[#34d399]">{activeBRem.toFixed(2)} T ({remanencePct}%)</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="10"
                value={remanencePct}
                onChange={(e) => setRemanencePct(parseFloat(e.target.value))}
                className="w-full accent-[#34d399] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>-100% (-Br)</span>
                <span>0</span>
                <span>+100% (+Br)</span>
              </div>
            </div>

            {/* WINDING RESISTANCE SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Winding R_primary:</span>
                <span className="font-bold text-amber-400">{windingResistance.toFixed(2)} Ω</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.05"
                value={windingResistance}
                onChange={(e) => setWindingResistance(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#64748b]">
                <span>0.05Ω (Slow L/R)</span>
                <span>0.80Ω (Fast)</span>
              </div>
            </div>
          </div>
        </div>

        {/* PHYSICAL LAW & RELAY DRILL (4 COLS) */}
        <div className="md:col-span-4 bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 flex flex-col justify-between text-xs font-mono space-y-2.5">
          <div className="flex items-center gap-2 text-white font-bold pb-2 border-b border-[#334155]">
            <Info className="w-4 h-4 text-[#38bdf8]" />
            <span>PHYSICS &amp; STANDARDS INSIGHT</span>
          </div>

          <div className="text-[11px] text-[#c9d1d9] space-y-1.5 leading-relaxed">
            <p>
              • <b>Flux Doubling Effect:</b> When energized at voltage zero-crossing (&theta; = 0°), the volt-second integral causes prospective core flux to reach:
            </p>
            <div className="bg-[#0f172a] p-2 rounded border border-[#334155] text-[#38bdf8] font-bold text-center">
              Φ_peak = 2·Φ_max + B_r·A_c
            </div>
            <p>
              • If Φ_peak &gt; B_sat·A_c, permeability collapses to μ_0, driving air-core inductance and causing inrush currents up to <b>10–14× rated FLA</b>!
            </p>
            <p>
              • <b>ANSI 87T Restraint:</b> Inrush waveforms have heavy asymmetric DC offset producing <b>20–40% 2nd harmonic (100 Hz)</b>. Modern numerical relays block trip when I₂ / I₁ &gt; 15%.
            </p>
          </div>

          <div className="pt-2 border-t border-[#334155] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">IEEE C57.12 Inrush Rating</span>
            <span className="text-[#34d399] font-bold">12x FLA @ 0.1s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
