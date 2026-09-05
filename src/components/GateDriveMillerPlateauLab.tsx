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

  // Dynamic Gate Charges for Rec 14 (Gate Charge Accumulation)
  const qGs_live = (deviceSpecs.cGs * 1e-12) * current.vgs * 1e9; // nC
  const qGd_live =
    simTimeNs < t2
      ? 0
      : simTimeNs < t3
      ? (deviceSpecs.cGd * 1e-12) * (vDcBus - current.vds) * 1e9
      : qGd_nC; // nC
  const qTotal_live = qGs_live + qGd_live;
  const qGs_max = (deviceSpecs.cGs * 1e-12) * vGgDrive * 1e9;
  const qTotal_max = qGs_max + qGd_nC;
  const igCurrent_A = Math.max(0, (vGgDrive - current.vgs) / gateResistorRg);

  const currentPhase =
    simTimeNs < t0
      ? { name: 'IDLE (Vgs = 0V, Blocking)', color: '#94a3b8', num: 0, sub: 'Gate driver off, Vds = Vdc' }
      : simTimeNs < t1
      ? { name: 'PHASE 1: TURN-ON DELAY td(on)', color: '#38bdf8', num: 1, sub: 'Charging Cgs: Vgs rising 0V → Vth' }
      : simTimeNs < t2
      ? { name: 'PHASE 2: CURRENT RISE tri', color: '#34d399', num: 2, sub: 'Channel opens: Id ramps 0A → Iload' }
      : simTimeNs < t3
      ? { name: 'PHASE 3: MILLER PLATEAU tplat', color: '#fbbf24', num: 3, sub: `Current diverted to Cgd: Vgs frozen at ${deviceSpecs.vPlateau.toFixed(1)}V, Vds collapses` }
      : simTimeNs < t4
      ? { name: 'PHASE 4: FULL ENHANCEMENT tenh', color: '#a855f7', num: 4, sub: 'Cgs charges Vplat → Vgg, Rds(on) reaches minimum' }
      : { name: 'STEADY-STATE ON', color: '#10b981', num: 5, sub: 'Fully enhanced conduction (Ohmic regime)' };

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
            { label: '0.5x', val: 0.5 },
            { label: '0.2x', val: 0.2 },
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

      {/* VIEWPORT 3: EQUIVALENT CIRCUIT SCHEMATIC & MILLER CHARGE DYNAMICS (Rec 14) */}
      <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
          <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            GATE DRIVE EQUIVALENT CIRCUIT SCHEMATIC &amp; CHARGE ACCUMULATION (Rg, Cgs, Cgd)
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-2 py-0.5 rounded font-mono font-extrabold border"
              style={{
                backgroundColor: `${currentPhase.color}15`,
                color: currentPhase.color,
                borderColor: `${currentPhase.color}60`,
              }}
            >
              {currentPhase.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Time: {simTimeNs.toFixed(1)} ns</span>
          </div>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-[#040812] p-1">
          <svg viewBox="0 0 960 270" className="w-full h-auto block select-none">
            <defs>
              <filter id="glow-miller" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <marker id="arrow-gate" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#fbbf24" />
              </marker>
              <marker id="arrow-drain" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
              </marker>
            </defs>

            {/* 1. GATE DRIVER POWER STAGE */}
            <g id="driver-stage">
              <rect x="20" y="70" width="100" height="130" rx="8" fill="#0d1526" stroke="#334155" strokeWidth="2" />
              <text x="70" y="92" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">GATE DRIVER</text>

              {/* VGG Source */}
              <circle cx="70" cy="125" r="16" fill="#161f32" stroke="#38bdf8" strokeWidth="2" />
              <text x="70" y="129" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">+{vGgDrive}V</text>

              {/* Driver Output Switch */}
              <circle cx="70" cy="155" r="3" fill="#fbbf24" />
              <line x1="70" y1="141" x2="70" y2="155" stroke="#38bdf8" strokeWidth="2" />
              <line x1="70" y1="155" x2="110" y2="135" stroke="#fbbf24" strokeWidth="2.5" />
              <circle cx="110" cy="135" r="3" fill="#fbbf24" />

              {/* Ground */}
              <line x1="55" y1="185" x2="85" y2="185" stroke="#64748b" strokeWidth="2" />
              <line x1="62" y1="190" x2="78" y2="190" stroke="#64748b" strokeWidth="2" />
              <line x1="68" y1="195" x2="72" y2="195" stroke="#64748b" strokeWidth="1.5" />
              <line x1="70" y1="170" x2="70" y2="185" stroke="#64748b" strokeWidth="2" />
            </g>

            {/* 2. GATE RESISTOR RG */}
            <g id="gate-resistor">
              <line x1="120" y1="135" x2="160" y2="135" stroke="#64748b" strokeWidth="2.5" />
              <rect x="160" y="123" width="60" height="24" rx="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
              <text x="190" y="139" fill="#fef08a" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Rg {gateResistorRg}Ω</text>
              <line x1="220" y1="135" x2="270" y2="135" stroke="#64748b" strokeWidth="2.5" />

              {/* Ig(t) Current Vector */}
              {igCurrent_A > 0.05 && (
                <g>
                  <line x1="135" y1="115" x2="245" y2="115" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow-gate)" strokeDasharray="4 2" />
                  <text x="190" y="108" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    Ig(t) = {igCurrent_A.toFixed(2)}A
                  </text>
                </g>
              )}
            </g>

            {/* Gate Node G (x=270, y=135) */}
            <circle cx="270" cy="135" r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
            <text x="270" y="152" fill="#fbbf24" fontSize="10" fontWeight="black" textAnchor="middle" fontFamily="monospace">G</text>

            {/* 3. CAPACITANCE BRANCHES: Cgs (BTM) & Cgd (TOP) */}
            {/* Lead to Cgd (Top Branch) */}
            <path d="M 270 135 L 270 65 L 340 65" fill="none" stroke="#64748b" strokeWidth="2.5" />
            {/* Lead to Cgs (Bottom Branch) */}
            <path d="M 270 135 L 270 205 L 340 205" fill="none" stroke="#64748b" strokeWidth="2.5" />

            {/* Cgd MILLER CAPACITANCE (Top) */}
            <g id="cap-cgd">
              {/* Left Plate (Gate side) */}
              <line x1="340" y1="45" x2="340" y2="85" stroke={simTimeNs >= t2 && simTimeNs < t3 ? '#fbbf24' : '#94a3b8'} strokeWidth="4" />
              {/* Right Plate (Drain side) */}
              <line x1="352" y1="45" x2="352" y2="85" stroke={simTimeNs >= t2 && simTimeNs < t3 ? '#38bdf8' : '#94a3b8'} strokeWidth="4" />
              {/* Dielectric E-field lines during Miller plateau */}
              {simTimeNs >= t2 && simTimeNs < t3 && (
                <g stroke="#fbbf24" strokeWidth="1.5" opacity="0.9">
                  <line x1="342" y1="52" x2="350" y2="52" strokeDasharray="1 1" />
                  <line x1="342" y1="65" x2="350" y2="65" strokeDasharray="1 1" />
                  <line x1="342" y1="78" x2="350" y2="78" strokeDasharray="1 1" />
                </g>
              )}
              {/* Lead to Drain */}
              <path d="M 352 65 L 440 65" fill="none" stroke="#64748b" strokeWidth="2.5" />
              <text x="346" y="36" fill={simTimeNs >= t2 && simTimeNs < t3 ? '#fbbf24' : '#38bdf8'} fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Cgd {deviceSpecs.cGd}pF (Miller)
              </text>
              <text x="346" y="100" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Qgd: {qGd_live.toFixed(1)} nC
              </text>
            </g>

            {/* Cgs INPUT CAPACITANCE (Bottom) */}
            <g id="cap-cgs">
              {/* Left Plate (Gate side) */}
              <line x1="340" y1="185" x2="340" y2="225" stroke={simTimeNs < t2 || simTimeNs >= t3 ? '#fbbf24' : '#94a3b8'} strokeWidth="4" />
              {/* Right Plate (Source side) */}
              <line x1="352" y1="185" x2="352" y2="225" stroke="#94a3b8" strokeWidth="4" />
              {/* Dielectric E-field lines */}
              {current.vgs > 0.5 && (
                <g stroke="#34d399" strokeWidth="1.5" opacity="0.9">
                  <line x1="342" y1="192" x2="350" y2="192" strokeDasharray="1 1" />
                  <line x1="342" y1="205" x2="350" y2="205" strokeDasharray="1 1" />
                  <line x1="342" y1="218" x2="350" y2="218" strokeDasharray="1 1" />
                </g>
              )}
              {/* Lead to Source */}
              <path d="M 352 205 L 440 205" fill="none" stroke="#64748b" strokeWidth="2.5" />
              <text x="346" y="176" fill="#34d399" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Cgs {deviceSpecs.cGs}pF
              </text>
              <text x="346" y="240" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Qgs: {qGs_live.toFixed(1)} nC
              </text>
            </g>

            {/* ANIMATED PACKETS: Charging Cgs vs Diverting into Cgd */}
            {isRunning && igCurrent_A > 0.05 && (
              <>
                {/* Gate main supply packet stream */}
                <circle
                  cx={120 + ((simTimeNs * 4) % 150)}
                  cy="135"
                  r="3.5"
                  fill="#fbbf24"
                  filter="url(#glow-miller)"
                />
                {/* Phase 1 / Phase 4: Packets divert down to Cgs */}
                {(simTimeNs < t2 || simTimeNs >= t3) && (
                  <circle
                    cx={simTimeNs % 20 < 10 ? 270 : 270 + ((simTimeNs * 3) % 70)}
                    cy={simTimeNs % 20 < 10 ? 135 + ((simTimeNs * 3) % 70) : 205}
                    r="3"
                    fill="#34d399"
                  />
                )}
                {/* Phase 3 Miller Plateau: Packets divert up to Cgd */}
                {simTimeNs >= t2 && simTimeNs < t3 && (
                  <circle
                    cx={simTimeNs % 20 < 10 ? 270 : 270 + ((simTimeNs * 3) % 70)}
                    cy={simTimeNs % 20 < 10 ? 135 - ((simTimeNs * 3) % 70) : 65}
                    r="3.5"
                    fill="#fbbf24"
                    filter="url(#glow-miller)"
                  />
                )}
              </>
            )}

            {/* 4. MOSFET STRUCTURE & INVERSION CHANNEL */}
            <g id="mosfet-channel" transform="translate(440, 30)">
              <rect x="0" y="10" width="180" height="190" rx="8" fill="#0b1220" stroke="#1e293b" strokeWidth="2" />
              <text x="90" y="28" fill="#e2e8f0" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                MOSFET ACTIVE SILICON
              </text>

              {/* Drain Terminal D */}
              <circle cx="80" cy="35" r="4" fill="#38bdf8" />
              <text x="95" y="39" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">D (+{current.vds.toFixed(0)}V)</text>
              <line x1="80" y1="35" x2="80" y2="60" stroke="#38bdf8" strokeWidth="3" />

              {/* Gate Oxide Dielectric Barrier */}
              <rect x="35" y="60" width="8" height="90" rx="2" fill="#eab308" opacity="0.8" />
              <text x="25" y="108" fill="#eab308" fontSize="8" fontWeight="bold" textAnchor="end" fontFamily="monospace">SiO₂</text>

              {/* Silicon Inversion Channel (Dynamically Widens proportional to Id!) */}
              <rect
                x="48"
                y="60"
                width={Math.max(3, (current.id / iLoad) * 26)}
                height="90"
                rx="3"
                fill={current.id > 0.5 ? '#10b981' : '#1e293b'}
                stroke={current.id > 0.5 ? '#34d399' : '#475569'}
                strokeWidth="1.5"
                filter={current.id > 0.5 ? 'url(#glow-miller)' : undefined}
              />

              {/* Load Current Vector through Channel */}
              {current.id > 0.5 && (
                <line
                  x1="60"
                  y1="65"
                  x2="60"
                  y2="145"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  markerEnd="url(#arrow-drain)"
                />
              )}

              {/* Source Terminal S */}
              <line x1="80" y1="150" x2="80" y2="175" stroke="#94a3b8" strokeWidth="3" />
              <circle cx="80" cy="175" r="4" fill="#94a3b8" />
              <text x="95" y="179" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">S (0V GND)</text>

              {/* Channel Conduction State Tag */}
              <text x="90" y="110" fill={current.id > 0.5 ? '#34d399' : '#64748b'} fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {current.id > 0.5 ? `Id = ${current.id.toFixed(1)}A` : 'CHANNEL PINCHED (Id = 0)'}
              </text>
            </g>

            {/* 5. LIVE CHARGE TELEMETRY & PHASE DASHBOARD */}
            <g id="telemetry-gauges" transform="translate(640, 20)">
              <rect x="0" y="0" width="300" height="210" rx="8" fill="#080d1a" stroke="#1e293b" strokeWidth="2" />

              {/* Header */}
              <text x="15" y="24" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="monospace">
                GATE CHARGE METERS (IEC 60747)
              </text>

              {/* Qgs Bar */}
              <text x="15" y="52" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                Q_gs: {qGs_live.toFixed(1)} / {qGs_max.toFixed(1)} nC
              </text>
              <rect x="15" y="58" width="270" height="10" rx="3" fill="#1e293b" />
              <rect x="15" y="58" width={Math.min(270, Math.max(0, (qGs_live / Math.max(1, qGs_max)) * 270))} height="10" rx="3" fill="#34d399" />

              {/* Qgd Miller Bar */}
              <text x="15" y="92" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">
                Q_gd (Miller): {qGd_live.toFixed(1)} / {qGd_nC.toFixed(1)} nC
              </text>
              <rect x="15" y="98" width="270" height="10" rx="3" fill="#1e293b" />
              <rect x="15" y="98" width={Math.min(270, Math.max(0, (qGd_live / Math.max(1, qGd_nC)) * 270))} height="10" rx="3" fill="#fbbf24" />

              {/* Q_total Bar */}
              <text x="15" y="132" fill="#a855f7" fontSize="9" fontWeight="bold" fontFamily="monospace">
                Q_total: {qTotal_live.toFixed(1)} / {qTotal_max.toFixed(1)} nC
              </text>
              <rect x="15" y="138" width="270" height="10" rx="3" fill="#1e293b" />
              <rect x="15" y="138" width={Math.min(270, Math.max(0, (qTotal_live / Math.max(1, qTotal_max)) * 270))} height="10" rx="3" fill="#a855f7" />

              {/* Live State Summary Box */}
              <rect x="15" y="160" width="270" height="38" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <text x="25" y="176" fill={currentPhase.color} fontSize="9" fontWeight="black" fontFamily="monospace">
                {currentPhase.name}
              </text>
              <text x="25" y="189" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {currentPhase.sub}
              </text>
            </g>
          </svg>
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
