import React, { useState, useEffect, useRef } from 'react';
import { Layers, Activity, Zap, Gauge, DollarSign, ShieldAlert, Sparkles, CheckCircle2, Waves, ArrowRight } from 'lucide-react';

export type CompareLoadType = 'PUMP' | 'FAN' | 'CONVEYOR';

interface StartingMethodData {
  id: string;
  name: string;
  shortName: string;
  color: string;
  peakInrushPu: string;
  torqueJerkPct: string;
  voltageDipPct: string;
  mechStress: string;
  speedControl: string;
  relativeCost: string;
  bestApplication: string;
}

export const STARTING_METHODS: StartingMethodData[] = [
  {
    id: 'dol',
    name: 'Direct-On-Line (DOL)',
    shortName: 'DOL',
    color: '#ef4444', // Red
    peakInrushPu: '7.0 pu (1883 A)',
    torqueJerkPct: '200% (Brutal Shock)',
    voltageDipPct: '18.5% (Severe Dip)',
    mechStress: 'Extreme (Gear/Shaft Risk)',
    speedControl: 'None (Fixed 1480 RPM)',
    relativeCost: '1.0× ($)',
    bestApplication: 'Small motors (<15kW), stiff utility grid.',
  },
  {
    id: 'star-delta',
    name: 'Star-Delta (Y-Δ)',
    shortName: 'Star-Delta',
    color: '#f59e0b', // Amber
    peakInrushPu: '2.3 pu (Star) / 5.2 pu (Trans)',
    torqueJerkPct: '33% (Start) / 180% (Trans)',
    voltageDipPct: '12.0% (Moderate Dip)',
    mechStress: 'High (Open Trans Surge)',
    speedControl: 'None (Fixed 1480 RPM)',
    relativeCost: '1.8× ($$)',
    bestApplication: 'Unloaded starting, low-torque fans/compressors.',
  },
  {
    id: 'soft-starter',
    name: 'Soft Starter (SCR)',
    shortName: 'Soft Starter',
    color: '#38bdf8', // Cyan
    peakInrushPu: '3.0 pu (807 A Limit)',
    torqueJerkPct: '35% (Smooth Ramp)',
    voltageDipPct: '6.2% (Low Dip)',
    mechStress: 'Very Low (Zero Shock)',
    speedControl: 'Accel/Decel Ramp (Soft Stop)',
    relativeCost: '3.5× ($$$)',
    bestApplication: 'Constant speed pumps, fans, conveyors, crushers.',
  },
  {
    id: 'vfd',
    name: 'Variable Frequency Drive (VFD)',
    shortName: 'VFD Inverter',
    color: '#10b981', // Green
    peakInrushPu: '1.1 pu (295 A Full Torque)',
    torqueJerkPct: '0% (Zero Shock)',
    voltageDipPct: '1.1% (Negligible Dip)',
    mechStress: 'Zero Mechanical Wear',
    speedControl: 'Full Continuous (0–200% RPM)',
    relativeCost: '7.2× ($$$$$)',
    bestApplication: 'Process speed regulation, flow control, energy saving.',
  },
];

interface CompareStartersProps {
  className?: string;
}

/**
 * CompareStarters.tsx - Side-by-Side Motor Starting Comparison Component
 * 
 * Features:
 * - 4 Starting Methods (DOL, Star-Delta, Soft Starter, VFD)
 * - Load Switcher (Pump, Fan, Conveyor)
 * - Dual Canvas Visualizations:
 *   1. Simultaneous 4-Curve Telemetry Strip Chart (Time vs Current I_pu & Speed N)
 *   2. Simultaneous 4-Curve Torque-Speed Curves (Speed N vs Torque Te)
 * - Detailed Engineering Comparison Matrix Table
 */
export const CompareStarters: React.FC<CompareStartersProps> = ({ className = '' }) => {
  const [activeLoad, setActiveLoad] = useState<CompareLoadType>('PUMP');

  const stripCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const torqueCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- 1. RENDER SIMULTANEOUS 4-CURVE STRIP CHART (Time vs Current I_pu) ---
  useEffect(() => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 35;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let y = paddingTop; y <= h - paddingBottom; y += 30) {
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();
    }
    for (let x = paddingLeft; x <= w - paddingRight; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, h - paddingBottom);
    ctx.lineTo(w - paddingRight, h - paddingBottom);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';
    ctx.fillText('0s', paddingLeft - 5, h - paddingBottom + 16);
    ctx.fillText('5s', paddingLeft + chartW * 0.25 - 8, h - paddingBottom + 16);
    ctx.fillText('10s', paddingLeft + chartW * 0.5 - 10, h - paddingBottom + 16);
    ctx.fillText('15s', paddingLeft + chartW * 0.75 - 10, h - paddingBottom + 16);
    ctx.fillText('20s', w - paddingRight - 15, h - paddingBottom + 16);
    ctx.fillText('Time (sec)', w / 2 - 25, h - 8);

    ctx.fillText('8.0 pu', 5, paddingTop + 5);
    ctx.fillText('6.0 pu', 5, paddingTop + chartH * 0.25 + 5);
    ctx.fillText('4.0 pu', 5, paddingTop + chartH * 0.5 + 5);
    ctx.fillText('2.0 pu', 5, paddingTop + chartH * 0.75 + 5);
    ctx.fillText('0.0 pu', 5, h - paddingBottom + 5);

    // Calculate & Plot 4 Current Traces (0 to 20 seconds)
    const tMax = 20;
    const iMax = 8.0;

    const tToX = (t: number) => paddingLeft + (t / tMax) * chartW;
    const iToY = (i: number) => h - paddingBottom - (i / iMax) * chartH;

    // Load Inertia Factor
    const inertiaMult = activeLoad === 'FAN' ? 1.8 : activeLoad === 'CONVEYOR' ? 1.3 : 1.0;

    // Method 1: DOL (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let t = 0; t <= tMax; t += 0.1) {
      let iVal = 0;
      const tAccel = 1.8 * inertiaMult;
      if (t < 0.2) iVal = 7.2;
      else if (t <= tAccel) iVal = 7.0 * (1 - (t / tAccel) * 0.85);
      else iVal = 1.0;

      const x = tToX(t);
      const y = iToY(iVal);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Method 2: Star-Delta (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let t = 0; t <= tMax; t += 0.1) {
      let iVal = 0;
      const tStar = 4.0 * inertiaMult;
      const tTrans = tStar + 0.3;
      const tDeltaAccel = tTrans + 2.0;

      if (t < tStar) iVal = 2.4 - (t / tStar) * 0.6;
      else if (t >= tStar && t < tTrans) iVal = 0.2; // Open transition gap
      else if (t >= tTrans && t < tTrans + 0.2) iVal = 5.4; // Transition spike
      else if (t >= tTrans + 0.2 && t <= tDeltaAccel) iVal = 3.5 * (1 - (t - tTrans) / 2.0);
      else iVal = 1.0;

      const x = tToX(t);
      const y = iToY(iVal);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Method 3: Soft Starter SCR (Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let t = 0; t <= tMax; t += 0.1) {
      let iVal = 0;
      const tRamp = 12.0 * inertiaMult;
      if (t < 0.3) iVal = 1.5;
      else if (t <= tRamp) iVal = 3.0; // Current limit clamped
      else if (t <= tRamp + 1.0) iVal = 3.0 * (1 - (t - tRamp)) + 1.0 * (t - tRamp);
      else iVal = 1.0;

      const x = tToX(t);
      const y = iToY(iVal);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Method 4: VFD Inverter (Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let t = 0; t <= tMax; t += 0.1) {
      let iVal = 0;
      const tAccel = 10.0 * inertiaMult;
      if (t <= tAccel) iVal = 1.1; // 100% rated torque at 1.1 pu current
      else iVal = 1.0;

      const x = tToX(t);
      const y = iToY(iVal);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [activeLoad]);

  // --- 2. RENDER SIMULTANEOUS 4-CURVE TORQUE-SPEED PLOT (Speed N vs Torque Te) ---
  useEffect(() => {
    const canvas = torqueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 35;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#121a29';
    ctx.lineWidth = 1;
    for (let y = paddingTop; y <= h - paddingBottom; y += 30) {
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();
    }
    for (let x = paddingLeft; x <= w - paddingRight; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, h - paddingBottom);
    ctx.lineTo(w - paddingRight, h - paddingBottom);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';
    ctx.fillText('0%', paddingLeft - 5, h - paddingBottom + 16);
    ctx.fillText('25%', paddingLeft + chartW * 0.25 - 8, h - paddingBottom + 16);
    ctx.fillText('50%', paddingLeft + chartW * 0.5 - 10, h - paddingBottom + 16);
    ctx.fillText('75%', paddingLeft + chartW * 0.75 - 10, h - paddingBottom + 16);
    ctx.fillText('100% N', w - paddingRight - 20, h - paddingBottom + 16);
    ctx.fillText('Speed N (% RPM)', w / 2 - 35, h - 8);

    ctx.fillText('2.5 pu', 5, paddingTop + 5);
    ctx.fillText('2.0 pu', 5, paddingTop + chartH * 0.2 + 5);
    ctx.fillText('1.5 pu', 5, paddingTop + chartH * 0.4 + 5);
    ctx.fillText('1.0 pu', 5, paddingTop + chartH * 0.6 + 5);
    ctx.fillText('0.5 pu', 5, paddingTop + chartH * 0.8 + 5);

    const nToX = (nPct: number) => paddingLeft + (nPct / 100) * chartW;
    const tToY = (tPu: number) => h - paddingBottom - (tPu / 2.5) * chartH;

    // 1. Plot Selected Load Demand Curve Tl(N) (Dashed Grey Line)
    ctx.strokeStyle = '#6e7681';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let n = 0; n <= 100; n += 2) {
      let tLoad = 0;
      if (activeLoad === 'PUMP') tLoad = 0.15 + 0.85 * Math.pow(n / 100, 2);
      else if (activeLoad === 'FAN') tLoad = 0.1 + 0.9 * Math.pow(n / 100, 2);
      else tLoad = 0.6 + 0.3 * (n / 100); // Conveyor constant torque

      const x = nToX(n);
      const y = tToY(tLoad);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#8b949e';
    ctx.fillText(`Load Tl (${activeLoad})`, w - paddingRight - 100, tToY(1.0) - 10);

    // 2. DOL Motor Torque Te (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let n = 0; n <= 100; n += 2) {
      const s = Math.max(0.01, (100 - n) / 100);
      const te = (2.2 * s * 0.15) / (0.15 * 0.15 + s * s); // Induction motor breakdown curve
      const x = nToX(n);
      const y = tToY(te);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Star-Delta Motor Torque (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let n = 0; n <= 100; n += 2) {
      const s = Math.max(0.01, (100 - n) / 100);
      let te = (2.2 * s * 0.15) / (0.15 * 0.15 + s * s);
      if (n < 75) te = te / 3.0; // Reduced to 1/3 in Star
      const x = nToX(n);
      const y = tToY(te);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 4. Soft Starter Motor Torque (Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let n = 0; n <= 100; n += 2) {
      const s = Math.max(0.01, (100 - n) / 100);
      let te = (2.2 * s * 0.15) / (0.15 * 0.15 + s * s);
      te = Math.min(1.2, te * 0.45); // Clamped by 300% current limit
      const x = nToX(n);
      const y = tToY(te);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. VFD Motor Torque (Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let n = 0; n <= 100; n += 2) {
      const te = 1.0; // Constant rated torque throughout speed range
      const x = nToX(n);
      const y = tToY(te);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [activeLoad]);

  return (
    <div className={`bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 shadow-2xl space-y-4 font-mono ${className}`}>
      
      {/* Header Bar & Load Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>SIDE-BY-SIDE MOTOR STARTING METHOD COMPARISON</span>
          </h2>
          <p className="text-xs text-slate-400">Comparing DOL, Star-Delta, Soft Starter &amp; VFD for the same motor and load.</p>
        </div>

        {/* Load Switcher */}
        <div className="flex items-center bg-[#161b22] border border-[#30363d] rounded-xl p-1 gap-1 text-xs font-bold">
          <span className="text-[10px] text-slate-400 px-2">SELECT LOAD:</span>
          {[
            { id: 'PUMP', label: '💧 Pump', desc: 'Centrifugal' },
            { id: 'FAN', label: '🌀 ID Fan', desc: 'High Inertia' },
            { id: 'CONVEYOR', label: '🛗 Conveyor', desc: 'Heavy Stiction' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveLoad(item.id as CompareLoadType)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeLoad === item.id
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dual Canvas Grid (Simultaneous 4-Curve Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* CHART 1: Simultaneous 4-Curve Current Strip Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>STATOR CURRENT INRUSH TRACES (I_pu vs Time)</span>
            </span>
            <span className="text-[10px] text-slate-400">0–20s Window</span>
          </div>

          <div className="relative w-full rounded-xl overflow-hidden border border-[#30363d] bg-[#070a10]">
            <canvas ref={stripCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center justify-around gap-2 text-[10px] pt-1">
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> DOL (7.0 pu)
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Star-Delta (5.2 pu)
            </span>
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Soft Starter (3.0 pu)
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> VFD (1.1 pu)
            </span>
          </div>
        </div>

        {/* CHART 2: Simultaneous 4-Curve Torque-Speed Plot */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>TORQUE-SPEED CHARACTERISTIC CURVES (Te vs N)</span>
            </span>
            <span className="text-[10px] text-slate-400">Motor vs Load Demand</span>
          </div>

          <div className="relative w-full rounded-xl overflow-hidden border border-[#30363d] bg-[#070a10]">
            <canvas ref={torqueCanvasRef} width={450} height={200} className="w-full h-[200px]" />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-around gap-2 text-[10px] pt-1">
            <span className="flex items-center gap-1 text-slate-400 font-bold">
              <span className="w-2.5 h-0.5 bg-slate-400 border-dashed" /> Load Tl ({activeLoad})
            </span>
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Soft Starter Te
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> VFD 100% Te
            </span>
          </div>
        </div>

      </div>

      {/* Engineering Comparison Matrix Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-white">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>ENGINEERING COMPARISON MATRIX TABLE (160 kW 415V MOTOR)</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#30363d]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-slate-300 border-b border-[#30363d] uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Performance Metric</th>
                <th className="p-3 text-red-400">Direct-On-Line (DOL)</th>
                <th className="p-3 text-amber-400">Star-Delta (Y-Δ)</th>
                <th className="p-3 text-cyan-400 bg-cyan-950/40 border-x border-cyan-500/40">Soft Starter (SCR)</th>
                <th className="p-3 text-emerald-400">VFD Inverter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-[#c9d1d9] font-mono text-[11px]">
              {STARTING_METHODS.map((m) => (
                <tr key={m.id} className="hover:bg-[#1f293d]/50 transition-colors">
                  <td className="p-3 font-bold text-white whitespace-nowrap">{m.name}</td>
                  <td className="p-3 text-red-300">{STARTING_METHODS[0].peakInrushPu}</td>
                  <td className="p-3 text-amber-300">{STARTING_METHODS[1].peakInrushPu}</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    {STARTING_METHODS[2].peakInrushPu}
                  </td>
                  <td className="p-3 text-emerald-300">{STARTING_METHODS[3].peakInrushPu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Where Soft Starters Fit Teaching Card */}
      <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs space-y-2">
        <div className="font-bold text-cyan-300 flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>A-to-Z Context: Where Soft Starters Sit in Power Electronics</span>
        </div>
        <p className="text-slate-300 leading-relaxed font-sans">
          A <strong>Solid-State Soft Starter</strong> provides 80% of a VFD’s mechanical and electrical starting benefits (zero shock, current limit capping, soft stop water hammer prevention) at <strong>less than half the cost</strong> of a VFD ($3.5× vs $7.2×). For constant-speed industrial applications like pumps, fans, compressors, and conveyors where speed control during steady-state run is not required, soft starters are the engineering standard choice!
        </p>
      </div>

    </div>
  );
};

export default CompareStarters;
