import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Sliders, AlertTriangle, Info, Flame, Activity } from 'lucide-react';

interface GateDriveMillerPlateauLabProps {
  onClose?: () => void;
}

export const GateDriveMillerPlateauLab: React.FC<GateDriveMillerPlateauLabProps> = ({ onClose }) => {
  // Gate Driver & Switch Circuit Parameters
  const [gateResistorRg, setGateResistorRg] = useState<number>(20); // Ohms (2 to 100 Ohms)
  const [vGgDrive, setVGgDrive] = useState<number>(15); // Gate Driver Supply (10V to 18V)
  const [vDcBus, setVDcBus] = useState<number>(400); // DC Bus Voltage (100V to 600V)
  const [iLoad, setILoad] = useState<number>(25); // Inductive Load Current (5A to 50A)
  const [transistorType, setTransistorType] = useState<'mosfet' | 'igbt' | 'sic_mosfet'>('mosfet');
  const [turnDirection, setTurnDirection] = useState<'turn_on' | 'turn_off'>('turn_on');

  // Simulation Clock Controls
  const [timeDilation, setTimeDilation] = useState<number>(0.1); // 1.0 = normal, 0.1 = slow-mo, 0.02 = ultra slow
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTimeNs, setSimTimeNs] = useState<number>(0); // 0 to 500 ns

  const canvasScopeRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDieRef = useRef<HTMLCanvasElement | null>(null);

  // Device Parameters according to IEC 60747-9
  const deviceSpecs = {
    mosfet: {
      vTh: 3.5, // Threshold voltage
      vPlateau: 5.5, // Miller plateau voltage
      cGs: 1800, // pF
      cGd: 120, // pF Miller capacitance
      rdsOn: 0.035, // 35 mOhm
      name: 'Si Power MOSFET (Infineon IPW65R045C7)',
      standard: 'IEC 60747-8 MOSFET',
    },
    igbt: {
      vTh: 5.0,
      vPlateau: 7.5,
      cGs: 2400,
      cGd: 220,
      rdsOn: 0.08,
      name: 'Industrial Trench IGBT (Infineon IKW40N120H3)',
      standard: 'IEC 60747-9 IGBT',
    },
    sic_mosfet: {
      vTh: 2.5,
      vPlateau: 9.0,
      cGs: 950,
      cGd: 35,
      rdsOn: 0.020,
      name: 'SiC Power MOSFET (Wolfspeed C3M0021120D)',
      standard: 'JEDEC JESD282B SiC Wide Bandgap',
    },
  }[transistorType];

  // Timing Calculation (Gate Charging Equations)
  // Phase 1: Delay time t_d(on) - Vgs rises from 0V to Vth
  // tau1 = Rg * Ciss = Rg * (Cgs + Cgd)
  const cIss_pF = deviceSpecs.cGs + deviceSpecs.cGd;
  const tau1_ns = (gateResistorRg * cIss_pF) * 1e-3;
  const tdOn_ns = Math.max(5, -tau1_ns * Math.log(Math.max(0.01, 1 - (deviceSpecs.vTh / vGgDrive))));

  // Phase 2: Current rise time t_ri - Vgs rises from Vth to Vplateau, Id rises to Iload
  const tri_ns = Math.max(8, -tau1_ns * Math.log(Math.max(0.01, 1 - (deviceSpecs.vPlateau / vGgDrive))) - tdOn_ns);

  // Phase 3: Miller Plateau time t_plateau - Vgs is constant at Vplateau while Vds falls from Vdc to 0
  // Ig_plateau = (Vgg - Vplateau) / Rg
  const igPlateau_A = Math.max(0.05, (vGgDrive - deviceSpecs.vPlateau) / gateResistorRg);
  const qGd_nC = (deviceSpecs.cGd * 1e-12) * vDcBus * 1e9;
  const tPlateau_ns = Math.max(15, (qGd_nC / igPlateau_A));

  // Phase 4: Full enhancement t_enh - Vgs rises from Vplateau to Vgg
  const tau2_ns = (gateResistorRg * deviceSpecs.cGs) * 1e-3;
  const tEnh_ns = 2.0 * tau2_ns;

  const totalEventNs = tdOn_ns + tri_ns + tPlateau_ns + tEnh_ns;

  // Turn-on intervals:
  const t0 = 50; // Start pulse
  const t1 = t0 + tdOn_ns; // Vgs = Vth
  const t2 = t1 + tri_ns; // Vgs = Vplateau, Id reaches Iload
  const t3 = t2 + tPlateau_ns; // Vds drops to 0, Miller plateau ends
  const t4 = t3 + tEnh_ns; // Vgs reaches Vgg

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const step = (now: number) => {
      const dt = (now - lastTimestamp);
      lastTimestamp = now;

      if (isRunning) {
        setSimTimeNs((prev) => {
          const increment = dt * timeDilation * 1.5;
          const next = prev + increment;
          return next > (t4 + 80) ? 0 : next;
        });
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, timeDilation, t4]);

  // Instantaneous state extraction
  const getValuesAt = (t: number) => {
    let vgs = 0;
    let vds = vDcBus;
    let id = 0;

    if (t < t0) {
      vgs = 0;
      vds = vDcBus;
      id = 0;
    } else if (t < t1) {
      // Delay phase: Vgs rises to Vth
      const elapsed = t - t0;
      vgs = vGgDrive * (1 - Math.exp(-elapsed / tau1_ns));
      vds = vDcBus;
      id = 0;
    } else if (t < t2) {
      // Current rise phase: Vgs rises to Vplateau, Id rises to Iload
      const prog = (t - t1) / tri_ns;
      vgs = deviceSpecs.vTh + (deviceSpecs.vPlateau - deviceSpecs.vTh) * prog;
      id = iLoad * prog;
      vds = vDcBus; // Clamped by inductive load freewheeling diode
    } else if (t < t3) {
      // MILLER PLATEAU PHASE: Vgs stays constant at Vplateau!
      // Vds falls from Vdc to 0
      const prog = (t - t2) / tPlateau_ns;
      vgs = deviceSpecs.vPlateau;
      id = iLoad;
      vds = vDcBus * (1 - prog);
    } else if (t < t4) {
      // Final enhancement: Vgs rises to Vgg, switch fully conducting
      const elapsed = t - t3;
      vgs = deviceSpecs.vPlateau + (vGgDrive - deviceSpecs.vPlateau) * (1 - Math.exp(-elapsed / tau2_ns));
      id = iLoad;
      vds = id * deviceSpecs.rdsOn;
    } else {
      vgs = vGgDrive;
      id = iLoad;
      vds = id * deviceSpecs.rdsOn;
    }

    const pInstant_W = vds * id; // Instantaneous switching loss (W)
    return { vgs, vds, id, pInstant_W };
  };

  const current = getValuesAt(simTimeNs);

  // Switching energy calculation Eon = integral(vds * id dt)
  const eOn_uJ = (0.5 * vDcBus * iLoad * (tri_ns + tPlateau_ns) * 1e-9) * 1e6;
  const pPeak_kW = (vDcBus * iLoad) / 1000;

  // Render CRT Scope
  useEffect(() => {
    const canvas = canvasScopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    // Reticle Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const maxT = t4 + 60;
    const yVdsZero = h * 0.45;
    const yVgsZero = h * 0.88;

    // Highlight Miller Plateau Zone
    const x2 = (t2 / maxT) * w;
    const x3 = (t3 / maxT) * w;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
    ctx.fillRect(x2, 0, x3 - x2, h);
    ctx.strokeStyle = '#eab308';
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x2, 0, x3 - x2, h);
    ctx.setLineDash([]);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`MILLER PLATEAU (V_plat = ${deviceSpecs.vPlateau.toFixed(1)}V)`, x2 + 6, 16);
    ctx.fillText(`Cgd Charging • High P_loss`, x2 + 6, 28);

    // Channel 1: Vds (Sky Blue / Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = (x / w) * maxT;
      const { vds } = getValuesAt(t);
      const y = yVdsZero - (vds / (vDcBus * 1.2)) * (h * 0.38);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Channel 2: Id (Emerald Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = (x / w) * maxT;
      const { id } = getValuesAt(t);
      const y = yVdsZero - (id / (iLoad * 1.3)) * (h * 0.35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Channel 3: Vgs Gate Voltage (Amber)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = (x / w) * maxT;
      const { vgs } = getValuesAt(t);
      const y = yVgsZero - (vgs / (vGgDrive * 1.25)) * (h * 0.35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Channel 4: Instantaneous Power Dissipation P_sw(t) (Crimson Red fill area)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, yVdsZero);
    for (let x = 0; x < w; x++) {
      const t = (x / w) * maxT;
      const { pInstant_W } = getValuesAt(t);
      const y = yVdsZero - (pInstant_W / (vDcBus * iLoad * 1.05)) * (h * 0.38);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, yVdsZero);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Strobe Cursor
    const curX = (simTimeNs / maxT) * w;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX, 0);
    ctx.lineTo(curX, h);
    ctx.stroke();

    // Cursor tracking dots
    const curYVgs = yVgsZero - (current.vgs / (vGgDrive * 1.25)) * (h * 0.35);
    const curYVds = yVdsZero - (current.vds / (vDcBus * 1.2)) * (h * 0.38);
    const curYId = yVdsZero - (current.id / (iLoad * 1.3)) * (h * 0.35);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(curX, curYVgs, 4.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(curX, curYVds, 4.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(curX, curYId, 4.5, 0, 2 * Math.PI);
    ctx.fill();

    // Telemetry text
    ctx.font = '10px monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Vgs: ${current.vgs.toFixed(2)} V`, 12, h - 32);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Vds: ${current.vds.toFixed(0)} V`, 130, h - 32);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`Id: ${current.id.toFixed(1)} A`, 230, h - 32);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`P_loss: ${(current.pInstant_W / 1000).toFixed(2)} kW`, 310, h - 32);

  }, [simTimeNs, gateResistorRg, vGgDrive, vDcBus, iLoad, transistorType, current, t2, t3, t4]);

  // Render Semiconductor Die X-Ray & Thermal Heat Glow
  useEffect(() => {
    const canvas = canvasDieRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Silicon Package Outline (TO-247 / Heatsink Base)
    const pkgX = w * 0.15;
    const pkgY = 20;
    const pkgW = w * 0.70;
    const pkgH = h - 40;

    // Copper Heat Slug / Backplate
    ctx.fillStyle = '#78350f';
    ctx.fillRect(pkgX, pkgY, pkgW, pkgH);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.strokeRect(pkgX, pkgY, pkgW, pkgH);

    // Silicon Die inside package
    const dieX = pkgX + pkgW * 0.2;
    const dieY = pkgY + pkgH * 0.22;
    const dieW = pkgW * 0.6;
    const dieH = pkgH * 0.56;

    // Dynamic Heat Flash based on instantaneous switching power dissipation P_loss!
    // P_loss peaks at Vdc * Iload in the Miller plateau!
    const heatRatio = Math.min(1.0, current.pInstant_W / (vDcBus * iLoad * 0.95));

    // Base color -> yellow -> glowing incandescent red-white
    const r = Math.round(30 + heatRatio * 225);
    const g = Math.round(40 + (heatRatio > 0.6 ? (heatRatio - 0.6) * 300 : heatRatio * 150));
    const b = Math.round(50 + (heatRatio > 0.8 ? (heatRatio - 0.8) * 400 : 0));

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(dieX, dieY, dieW, dieH);

    // Heat Glow Corona effect if P_loss is high
    if (heatRatio > 0.15) {
      const glowRad = 15 + heatRatio * 35;
      const grad = ctx.createRadialGradient(
        dieX + dieW / 2, dieY + dieH / 2, 5,
        dieX + dieW / 2, dieY + dieH / 2, glowRad + dieW / 2
      );
      grad.addColorStop(0, `rgba(239, 68, 68, ${0.45 * heatRatio})`);
      grad.addColorStop(0.5, `rgba(245, 158, 11, ${0.25 * heatRatio})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(pkgX - 20, pkgY - 20, pkgW + 40, pkgH + 40);
    }

    // Die Border
    ctx.strokeStyle = heatRatio > 0.5 ? '#fef08a' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(dieX, dieY, dieW, dieH);

    // Bond Wires (Gate Wire & Kelvin Source Wires)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;

    // Gate bond wire
    ctx.beginPath();
    ctx.moveTo(pkgX - 15, pkgY + pkgH * 0.3);
    ctx.lineTo(dieX + 15, dieY + 15);
    ctx.stroke();

    // Source bond wire
    ctx.beginPath();
    ctx.moveTo(pkgX - 15, pkgY + pkgH * 0.7);
    ctx.lineTo(dieX + 15, dieY + dieH - 15);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SILICON DIE ACTIVE CHANNEL', dieX + 10, dieY + 22);

    ctx.font = '10px monospace';
    ctx.fillStyle = heatRatio > 0.5 ? '#fef08a' : '#94a3b8';
    ctx.fillText(
      `P_instant: ${(current.pInstant_W / 1000).toFixed(1)} kW | E_on: ${eOn_uJ.toFixed(0)} µJ`,
      dieX + 10,
      dieY + dieH / 2
    );

    // Gate drive current injection vector
    const igCurrent_A = (vGgDrive - current.vgs) / gateResistorRg;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Gate I_g: ${igCurrent_A.toFixed(2)} A (Rg = ${gateResistorRg}Ω)`, pkgX + 10, pkgH + 12);

  }, [simTimeNs, current, vDcBus, iLoad, gateResistorRg, vGgDrive, eOn_uJ]);

  return (
    <div className="bg-[#0b101b] border border-[#1e293b] rounded-2xl p-4 text-slate-200 shadow-2xl space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">MOSFET / IGBT Gate Drive & Miller Plateau Physics</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                IEC 60747-8 / IEC 60747-9
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visualize gate charge (Qg), Miller capacitance (Cgd) charging, and peak in-situ switching power dissipation flash (P_sw = V_ds · I_d).
            </p>
          </div>
        </div>

        {/* TIME CONTROLS */}
        <div className="flex items-center gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-[#334155]">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              isRunning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'PAUSE' : 'PLAY'}
          </button>

          <button
            onClick={() => setSimTimeNs(0)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <span className="text-[10px] font-mono text-slate-400 font-bold">SPEED:</span>
          {[
            { label: '1x', val: 1.0 },
            { label: '0.1x', val: 0.1 },
            { label: '0.02x', val: 0.02 },
          ].map((spd) => (
            <button
              key={spd.label}
              onClick={() => setTimeDilation(spd.val)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                timeDilation === spd.val
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {spd.label}
            </button>
          ))}
        </div>
      </div>

      {/* DUAL VIEWPORTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VIEWPORT 1: CRT OSCILLOSCOPE */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              CRT SCOPE: V_gs(t), V_ds(t), I_d(t) & P_loss(t)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Time: {simTimeNs.toFixed(1)} ns</span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-800">
            <canvas ref={canvasScopeRef} width={560} height={350} className="w-full h-full block" />
          </div>

          {/* DYNAMIC TELEMETRY STRIP */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Miller Duration t_plat</div>
              <div className="text-sm font-bold text-amber-300">{tPlateau_ns.toFixed(0)} ns</div>
            </div>
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Peak Switching Power P_peak</div>
              <div className="text-sm font-bold text-red-400">{pPeak_kW.toFixed(1)} kW</div>
            </div>
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Turn-on Energy E_on</div>
              <div className="text-sm font-bold text-purple-300">{eOn_uJ.toFixed(0)} µJ</div>
            </div>
          </div>
        </div>

        {/* VIEWPORT 2: SEMICONDUCTOR DIE X-RAY & THERMAL FLASH */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-red-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              DIE X-RAY & IN-SITU THERMAL FLASH HEATMAP
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Dynamic Heatsink Flash</span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-800">
            <canvas ref={canvasDieRef} width={560} height={350} className="w-full h-full block" />
          </div>

          {/* PHYSICAL INSIGHT CALLOUT */}
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Why Miller Plateau Causes Massive Heat:</strong> During the plateau, gate voltage is stuck at V_plateau while all gate driver current is consumed charging C_gd. Concurrently, the switch carries full load current (I_D = {iLoad}A) while drain voltage is dropping from {vDcBus}V. Their product creates a high-power spike (P_sw = {(current.pInstant_W / 1000).toFixed(1)}kW) that heats the die!
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0f172a] p-3 rounded-xl border border-slate-800 text-xs">
        {/* TRANSISTOR TECH */}
        <div className="space-y-2">
          <label className="font-bold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Semiconductor Switch Technology:
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'mosfet', name: 'Silicon MOSFET (Infineon IPW65R045C7)', sub: 'Fast, Moderate Qg' },
              { id: 'igbt', name: 'Trench IGBT (IKW40N120H3)', sub: 'High Power, Tail Current' },
              { id: 'sic_mosfet', name: 'SiC MOSFET (Wolfspeed C3M0021120D)', sub: 'Ultra-low Cgd, 10x Faster' },
            ].map((tech) => (
              <button
                key={tech.id}
                onClick={() => setTransistorType(tech.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-left transition-all border ${
                  transistorType === tech.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-transparent'
                }`}
              >
                <div className="text-[11px]">{tech.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{tech.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* GATE RESISTOR RG SLIDER (THE CORE DEMONSTRATION!) */}
        <div className="space-y-3">
          <div className="bg-[#161f32] p-2.5 rounded-lg border border-amber-500/40">
            <div className="flex justify-between font-mono text-[11px] mb-1">
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Series Gate Resistor $R_g$:
              </span>
              <span className="text-white font-bold text-sm bg-amber-950 px-2 py-0.5 rounded border border-amber-700">
                {gateResistorRg} Ω
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={1}
              value={gateResistorRg}
              onChange={(e) => setGateResistorRg(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
              <span>2Ω (Fast, High EMI)</span>
              <span>100Ω (Slow, High Loss!)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Gate Driver Voltage V_GG:</span>
              <span className="text-amber-300 font-bold">{vGgDrive} V</span>
            </div>
            <input
              type="range"
              min={10}
              max={18}
              step={1}
              value={vGgDrive}
              onChange={(e) => setVGgDrive(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* LOAD & DC BUS */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">DC Bus Voltage V_DC:</span>
              <span className="text-sky-300 font-bold">{vDcBus} V</span>
            </div>
            <input
              type="range"
              min={100}
              max={600}
              step={25}
              value={vDcBus}
              onChange={(e) => setVDcBus(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Inductive Load Current I_Load:</span>
              <span className="text-emerald-300 font-bold">{iLoad} A</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={iLoad}
              onChange={(e) => setILoad(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
