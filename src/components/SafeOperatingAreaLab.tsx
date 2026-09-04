import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Sliders, AlertTriangle, Info, Flame, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SafeOperatingAreaLabProps {
  onClose?: () => void;
}

export const SafeOperatingAreaLab: React.FC<SafeOperatingAreaLabProps> = ({ onClose }) => {
  // Operating parameters
  const [vDcBus, setVDcBus] = useState<number>(400); // Volts DC (50V to 800V)
  const [iLoad, setILoad] = useState<number>(30); // Amperes (1A to 120A)
  const [transistorType, setTransistorType] = useState<'mosfet' | 'igbt'>('mosfet');
  const [pulseWidthUs, setPulseWidthUs] = useState<number>(10); // Pulse duration tp in µs (1µs to 1000µs / DC)
  const [caseTempTc, setCaseTempTc] = useState<number>(25); // Case Temp in °C (25°C to 125°C)
  const [loadType, setLoadType] = useState<'resistive' | 'clamped_inductive' | 'unclamped_avalanche' | 'short_circuit'>('clamped_inductive');

  // Dynamic state
  const [isSwitching, setIsSwitching] = useState<boolean>(true);
  const [simProgress, setSimProgress] = useState<number>(0); // 0.0 to 1.0 trajectory progress
  const [hasBlown, setHasBlown] = useState<boolean>(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const canvasSoaRef = useRef<HTMLCanvasElement | null>(null);
  const canvasPackageRef = useRef<HTMLCanvasElement | null>(null);

  // Device FBSOA Benchmark Specifications (IEC 60747-8 / MIL-STD-750)
  const specs = {
    mosfet: {
      name: 'Si Power MOSFET 650V 50A (IPW65R045C7)',
      vBrdss: 650, // Breakdown voltage (V)
      idMaxContinuous: 45, // A @ 25°C
      idMaxPulse: 135, // A (bond-wire limit)
      rdsOn: 0.045, // Ohm
      pdMax: 225, // W @ 25°C
      tjMax: 150, // °C
      rthJc: 0.55, // °C/W
    },
    igbt: {
      name: 'High-Power Trench IGBT 1200V 75A (IKW40N120H3)',
      vBrdss: 1200,
      idMaxContinuous: 75,
      idMaxPulse: 160,
      rdsOn: 0.065,
      pdMax: 350,
      tjMax: 175,
      rthJc: 0.35,
    },
  }[transistorType];

  // Dynamic Safe Power Limit based on Case Temperature (Derating)
  const effectivePdMax = Math.max(10, specs.pdMax * ((specs.tjMax - caseTempTc) / (specs.tjMax - 25)));

  // Real-time Trajectory Engine
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      if (isSwitching && !hasBlown) {
        setSimProgress((prev) => {
          const next = prev + 0.015;
          return next > 1.0 ? 0.0 : next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSwitching, hasBlown]);

  // Calculate Instantaneous Operating Point (V_DS(t), I_D(t)) along the trajectory
  const getOperatingPoint = (prog: number) => {
    let vds = vDcBus;
    let id = 0;

    if (loadType === 'resistive') {
      // Linear trajectory: Vds drops as Id rises
      if (prog < 0.5) {
        const turnOn = prog * 2;
        id = iLoad * turnOn;
        vds = vDcBus * (1 - turnOn) + (id * specs.rdsOn);
      } else {
        const turnOff = (prog - 0.5) * 2;
        id = iLoad * (1 - turnOff);
        vds = vDcBus * turnOff + (id * specs.rdsOn);
      }
    } else if (loadType === 'clamped_inductive') {
      // Clamped Inductive Load (Worst-case square switching trajectory):
      // Turn-On: Id rises to Iload while Vds remains at full Vdc!
      // Then Vds collapses to 0 while Id = Iload.
      if (prog < 0.25) {
        // Id rises, Vds = Vdc
        id = iLoad * (prog / 0.25);
        vds = vDcBus;
      } else if (prog < 0.5) {
        // Id = Iload, Vds falls to 0
        id = iLoad;
        vds = vDcBus * (1 - (prog - 0.25) / 0.25);
      } else if (prog < 0.75) {
        // Fully on
        id = iLoad;
        vds = id * specs.rdsOn;
      } else {
        // Turn-off: Vds rises to Vdc + clamp, then Id falls
        const turnOffProg = (prog - 0.75) / 0.25;
        if (turnOffProg < 0.5) {
          vds = vDcBus * 1.15; // Clamped overshoot
          id = iLoad;
        } else {
          vds = vDcBus;
          id = iLoad * (1 - (turnOffProg - 0.5) * 2);
        }
      }
    } else if (loadType === 'unclamped_avalanche') {
      // Unclamped Inductive Switching (UIS Avalanche):
      // Vds overshoots all the way to V(BR)DSS breakdown!
      if (prog < 0.4) {
        id = iLoad;
        vds = id * specs.rdsOn;
      } else if (prog < 0.8) {
        // Avalanche breakdown region!
        vds = specs.vBrdss * 1.05;
        id = iLoad * (1 - (prog - 0.4) / 0.4);
      } else {
        vds = vDcBus;
        id = 0;
      }
    } else if (loadType === 'short_circuit') {
      // Dead short circuit across DC bus! Full Vdc AND extreme saturation current!
      vds = vDcBus;
      id = specs.idMaxPulse * 1.25; // Massive short-circuit current!
    }

    return { vds: Math.max(0.1, vds), id: Math.max(0.01, id) };
  };

  const currentPoint = getOperatingPoint(simProgress);

  // SOA Boundary Check & Failure Logic
  useEffect(() => {
    if (hasBlown) return;

    const { vds, id } = currentPoint;
    const instantPower_W = vds * id;

    // Boundary 1: Breakdown Voltage Limit
    if (vds > specs.vBrdss) {
      setHasBlown(true);
      setFailureReason(`Dielectric Avalanche Breakdown: Vds (${vds.toFixed(0)}V) > V(BR)DSS (${specs.vBrdss}V)`);
      return;
    }

    // Boundary 2: Bond Wire Fusion / Maximum Pulse Current Limit
    if (id > specs.idMaxPulse) {
      setHasBlown(true);
      setFailureReason(`Bond-Wire Fusion: Peak Current (${id.toFixed(1)}A) exceeded maximum pulse limit (${specs.idMaxPulse}A)`);
      return;
    }

    // Boundary 3: Maximum Power Limit (Thermal Limit for pulse duration tp)
    // Pulse power limit scales inversely with sqrt(tp)
    const pulseFactor = Math.sqrt(100 / Math.max(1, pulseWidthUs));
    const allowedPowerW = effectivePdMax * pulseFactor;

    if (instantPower_W > allowedPowerW && pulseWidthUs > 50) {
      setHasBlown(true);
      setFailureReason(`Thermal Silicon Melt: Peak Power (${(instantPower_W / 1000).toFixed(1)}kW) exceeded FBSOA pulse limit (${(allowedPowerW / 1000).toFixed(1)}kW)`);
      return;
    }

    // Boundary 4: Short Circuit Safe Time (SCWT > 10µs on IGBT)
    if (loadType === 'short_circuit' && simProgress > 0.3) {
      setHasBlown(true);
      setFailureReason(`Short-Circuit Withstand Time (SCWT > 10µs) Exceeded: Destructive thermal explosion!`);
      return;
    }

  }, [currentPoint, specs, effectivePdMax, pulseWidthUs, loadType, simProgress, hasBlown]);

  const handleReset = () => {
    setHasBlown(false);
    setFailureReason(null);
    setSimProgress(0);
  };

  // Render 2D FBSOA Logarithmic Canvas
  useEffect(() => {
    const canvas = canvasSoaRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    // Coordinate Mapping: Logarithmic Space
    // X-Axis: Vds from 1V to 2000V (3.3 decades)
    // Y-Axis: Id from 0.1A to 300A (3.47 decades)
    const logVMin = Math.log10(1);
    const logVMax = Math.log10(2000);
    const logIMin = Math.log10(0.1);
    const logIMax = Math.log10(300);

    const padL = 45;
    const padB = 35;
    const plotW = w - padL - 20;
    const plotH = h - padB - 20;

    const toScreenX = (v: number) => {
      const logV = Math.log10(Math.max(1, v));
      return padL + ((logV - logVMin) / (logVMax - logVMin)) * plotW;
    };

    const toScreenY = (i: number) => {
      const logI = Math.log10(Math.max(0.1, i));
      return (h - padB) - ((logI - logIMin) / (logIMax - logIMin)) * plotH;
    };

    // Draw Log Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Voltage Decades: 1, 10, 100, 1000
    [1, 10, 100, 1000].forEach((v) => {
      const x = toScreenX(v);
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - padB);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${v}V`, x - 8, h - padB + 14);
    });

    // Current Decades: 0.1, 1, 10, 100
    [0.1, 1, 10, 100].forEach((i) => {
      const y = toScreenY(i);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${i}A`, 10, y + 3);
    });

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('DRAIN-TO-SOURCE VOLTAGE V_DS (V) [LOG]', w / 2 - 80, h - 8);
    ctx.save();
    ctx.translate(14, h / 2 + 60);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('DRAIN CURRENT I_D (A) [LOG]', 0, 0);
    ctx.restore();

    // 1. Rds(on) Limit Line (Left Boundary: V = I * RdsOn)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toScreenX(0.1 * specs.rdsOn), toScreenY(0.1));
    ctx.lineTo(toScreenX(specs.idMaxPulse * specs.rdsOn), toScreenY(specs.idMaxPulse));
    ctx.stroke();

    // 2. Maximum Pulse Current Limit Line (Top Bond-Wire Boundary: I = IdMaxPulse)
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(toScreenX(specs.idMaxPulse * specs.rdsOn), toScreenY(specs.idMaxPulse));
    const vBreakStart = effectivePdMax / specs.idMaxPulse;
    ctx.lineTo(toScreenX(vBreakStart), toScreenY(specs.idMaxPulse));
    ctx.stroke();

    // 3. Thermal Power Dissipation Boundary (P = V * I = const -> I = P / V)
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(toScreenX(vBreakStart), toScreenY(specs.idMaxPulse));
    for (let v = vBreakStart; v <= specs.vBrdss * 0.7; v += 10) {
      const iThermal = effectivePdMax / v;
      ctx.lineTo(toScreenX(v), toScreenY(Math.max(0.1, iThermal)));
    }
    ctx.stroke();

    // 4. Breakdown Voltage Boundary (Right Vertical Limit: V = V_BRDSS)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(toScreenX(specs.vBrdss), toScreenY(0.1));
    ctx.lineTo(toScreenX(specs.vBrdss), toScreenY(specs.idMaxContinuous));
    ctx.stroke();

    // Fill Safe Operating Area (Shaded Emerald Green polygon)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.beginPath();
    ctx.moveTo(toScreenX(0.1 * specs.rdsOn), toScreenY(0.1));
    ctx.lineTo(toScreenX(specs.idMaxPulse * specs.rdsOn), toScreenY(specs.idMaxPulse));
    ctx.lineTo(toScreenX(vBreakStart), toScreenY(specs.idMaxPulse));
    for (let v = vBreakStart; v <= specs.vBrdss; v += 20) {
      const iTh = effectivePdMax / v;
      ctx.lineTo(toScreenX(v), toScreenY(Math.max(0.1, iTh)));
    }
    ctx.lineTo(toScreenX(specs.vBrdss), toScreenY(0.1));
    ctx.closePath();
    ctx.fill();

    // Annotations on Boundaries
    ctx.font = '8px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Rds(on) Limit (${(specs.rdsOn * 1000).toFixed(0)}mΩ)`, toScreenX(0.5), toScreenY(30) + 12);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Bond-Wire Limit (${specs.idMaxPulse}A)`, toScreenX(25), toScreenY(specs.idMaxPulse) - 6);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Thermal Limit (${effectivePdMax.toFixed(0)}W @ ${caseTempTc}°C)`, toScreenX(120), toScreenY(3) - 6);

    ctx.fillStyle = '#dc2626';
    ctx.fillText(`V(BR)DSS (${specs.vBrdss}V)`, toScreenX(specs.vBrdss) - 50, toScreenY(1) - 6);

    // Draw Live Switching Trajectory Locus Curve
    ctx.strokeStyle = hasBlown ? '#ef4444' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    for (let p = 0; p <= 1.0; p += 0.02) {
      const pt = getOperatingPoint(p);
      const x = toScreenX(pt.vds);
      const y = toScreenY(pt.id);
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Operational Point Dot
    const curX = toScreenX(currentPoint.vds);
    const curY = toScreenY(currentPoint.id);

    ctx.fillStyle = hasBlown ? '#ef4444' : '#ffffff';
    ctx.beginPath();
    ctx.arc(curX, curY, hasBlown ? 8 : 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = hasBlown ? '#fca5a5' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(curX, curY, hasBlown ? 12 : 9, 0, 2 * Math.PI);
    ctx.stroke();

    // Telemetry Box
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(padL + 10, 26, 190, 48);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(padL + 10, 26, 190, 48);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`Vds: ${currentPoint.vds.toFixed(0)} V`, padL + 18, 42);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`Id:  ${currentPoint.id.toFixed(1)} A`, padL + 18, 56);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`P:   ${((currentPoint.vds * currentPoint.id) / 1000).toFixed(1)} kW`, padL + 105, 42);

  }, [currentPoint, specs, effectivePdMax, caseTempTc, loadType, hasBlown]);

  // Render Semiconductor Die Package & Destruction Effect
  useEffect(() => {
    const canvas = canvasPackageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Package Body (TO-247 outline)
    const pkgW = w * 0.7;
    const pkgH = h * 0.75;
    const pkgX = (w - pkgW) / 2;
    const pkgY = 25;

    // Heatsink Copper Flange
    ctx.fillStyle = '#78350f';
    ctx.fillRect(pkgX - 5, pkgY - 5, pkgW + 10, pkgH + 10);

    // Black Epoxy Mold
    ctx.fillStyle = hasBlown ? '#1c1917' : '#111827';
    ctx.fillRect(pkgX, pkgY, pkgW, pkgH);
    ctx.strokeStyle = hasBlown ? '#ef4444' : '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(pkgX, pkgY, pkgW, pkgH);

    // Silicon Die Window
    const dieW = pkgW * 0.45;
    const dieH = pkgH * 0.45;
    const dieX = pkgX + (pkgW - dieW) / 2;
    const dieY = pkgY + (pkgH - dieH) / 2;

    if (hasBlown) {
      // CATASTROPHIC DIE RUPTURE ANIMATION!
      // Glowing molten crater
      const grad = ctx.createRadialGradient(dieX + dieW / 2, dieY + dieH / 2, 5, dieX + dieW / 2, dieY + dieH / 2, dieW * 0.8);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#f59e0b');
      grad.addColorStop(0.7, '#ef4444');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(dieX - 10, dieY - 10, dieW + 20, dieH + 20);

      // Fracture cracks
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dieX + dieW / 2, dieY + dieH / 2);
      ctx.lineTo(pkgX + 10, pkgY + 20);
      ctx.moveTo(dieX + dieW / 2, dieY + dieH / 2);
      ctx.lineTo(pkgX + pkgW - 10, pkgY + pkgH - 20);
      ctx.moveTo(dieX + dieW / 2, dieY + dieH / 2);
      ctx.lineTo(pkgX + 20, pkgY + pkgH - 10);
      ctx.stroke();

      // Smoke and spark particles
      for (let i = 0; i < 20; i++) {
        const px = dieX + (Math.random() - 0.5) * dieW * 1.5;
        const py = dieY + (Math.random() - 0.5) * dieH * 1.5;
        ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 3 + 1, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('⚡ PERMANENT DIE DESTRUCTION ⚡', pkgX + 15, pkgY + pkgH + 18);

    } else {
      // Normal healthy die
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(dieX, dieY, dieW, dieH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dieX, dieY, dieW, dieH);

      // Bond wires
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pkgX + 20, pkgY + pkgH + 15);
      ctx.lineTo(dieX + 15, dieY + dieH - 10);
      ctx.moveTo(pkgX + pkgW / 2, pkgY + pkgH + 15);
      ctx.lineTo(dieX + dieW / 2, dieY + dieH - 10);
      ctx.moveTo(pkgX + pkgW - 20, pkgY + pkgH + 15);
      ctx.lineTo(dieX + dieW - 15, dieY + dieH - 10);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('HEALTHY SILICON DIE', dieX + 15, dieY + dieH / 2 + 3);
    }

  }, [hasBlown]);

  return (
    <div className="bg-[#0b101b] border border-[#1e293b] rounded-2xl p-4 text-slate-200 shadow-2xl space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Dynamic 2D Safe Operating Area (FBSOA) & Breakdown Lab</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-mono font-bold">
                IEC 60747 / MIL-STD-750
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live switching trajectory locus across Rds(on), bond-wire current, thermal dissipation, and dielectric avalanche boundaries.
            </p>
          </div>
        </div>

        {/* RESET BUTTON */}
        <div className="flex items-center gap-2">
          {hasBlown && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all flex items-center gap-1.5 animate-bounce"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              REPLACE BLOWN COMPONENT (RESET)
            </button>
          )}
        </div>
      </div>

      {/* FAILURE BANNER */}
      {hasBlown && (
        <div className="px-3 py-2.5 rounded-xl bg-red-950/60 border border-red-500 flex items-center justify-between text-xs font-mono text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="text-red-400">CATASTROPHIC FAILURE: </strong>
              {failureReason}
            </div>
          </div>
          <span className="bg-red-900 px-2 py-1 rounded text-white font-black">EXCEEDED SOA</span>
        </div>
      )}

      {/* DUAL VIEWPORTS: 2D SOA PLOT & DIE PHYSICAL VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VIEWPORT 1: 2D LOG-LOG FBSOA CANVAS */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              2D LOG-LOG FBSOA TRAJECTORY CANVAS
            </span>
            <span className="text-[10px] text-slate-400 font-mono">IEEE/IEC Standard Boundary</span>
          </div>

          <div className="relative w-full aspect-[16/11] rounded-lg overflow-hidden border border-slate-800">
            <canvas ref={canvasSoaRef} width={560} height={385} className="w-full h-full block" />
          </div>

          {/* BOUNDARIES LEGEND */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
            <div className="p-1 rounded bg-sky-950/40 text-sky-300 border border-sky-800">Rds(on) Line</div>
            <div className="p-1 rounded bg-amber-950/40 text-amber-300 border border-amber-800">Bond-Wire Limit</div>
            <div className="p-1 rounded bg-red-950/40 text-red-300 border border-red-800">Thermal Pd</div>
            <div className="p-1 rounded bg-purple-950/40 text-purple-300 border border-purple-800">V(BR)DSS Limit</div>
          </div>
        </div>

        {/* VIEWPORT 2: PACKAGE X-RAY & RUPTURE ANIMATION */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-red-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              SEMICONDUCTOR PACKAGE DESTRUCTION CHAMBER
            </span>
            <span className="text-[10px] text-slate-400 font-mono">TO-247 Packaging</span>
          </div>

          <div className="relative w-full aspect-[16/11] rounded-lg overflow-hidden border border-slate-800">
            <canvas ref={canvasPackageRef} width={560} height={385} className="w-full h-full block" />
          </div>

          {/* INSIGHT */}
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300">Why the Locus Must Stay Inside SOA:</strong> During clamped inductive switching, current cannot drop until voltage reaches V_bus. This forces the trajectory into the hazardous top-right corner of high voltage AND high current simultaneously. If pulse time is too long, silicon temperature exceeds 175°C and secondary breakdown vaporizes the chip!
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS BENCH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0f172a] p-3 rounded-xl border border-slate-800 text-xs">
        {/* LOAD TRAJECTORY TYPE SELECTOR */}
        <div className="space-y-2">
          <label className="font-bold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Switching Trajectory Scenario:
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'clamped_inductive', name: 'Clamped Inductive (Standard)', sub: 'Square Trajectory' },
              { id: 'resistive', name: 'Resistive Load (Safe)', sub: 'Diagonal Trajectory' },
              { id: 'unclamped_avalanche', name: 'Unclamped Inductive (Avalanche)', sub: 'Hits V(BR)DSS breakdown!' },
              { id: 'short_circuit', name: 'Dead Short-Circuit Fault', sub: 'Destructive SOA Violation' },
            ].map((scen) => (
              <button
                key={scen.id}
                onClick={() => {
                  setLoadType(scen.id as any);
                  setHasBlown(false);
                  setFailureReason(null);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-left transition-all border ${
                  loadType === scen.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-transparent'
                }`}
              >
                <div className="text-[11px]">{scen.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{scen.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* VOLTAGE & CURRENT */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">DC Bus Voltage (V_DC):</span>
              <span className="text-sky-300 font-bold">{vDcBus} V</span>
            </div>
            <input
              type="range"
              min={50}
              max={800}
              step={25}
              value={vDcBus}
              onChange={(e) => setVDcBus(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Load Current ($I_D$):</span>
              <span className="text-emerald-300 font-bold">{iLoad} A</span>
            </div>
            <input
              type="range"
              min={1}
              max={120}
              step={2}
              value={iLoad}
              onChange={(e) => setILoad(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>

        {/* THERMAL & PULSE WIDTH */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Pulse Width ($t_p$):</span>
              <span className="text-amber-300 font-bold">{pulseWidthUs} µs</span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              step={5}
              value={pulseWidthUs}
              onChange={(e) => setPulseWidthUs(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Case Temperature ($T_C$):</span>
              <span className="text-purple-300 font-bold">{caseTempTc} °C</span>
            </div>
            <input
              type="range"
              min={25}
              max={125}
              step={5}
              value={caseTempTc}
              onChange={(e) => setCaseTempTc(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <div className="text-[9px] text-slate-400 font-mono mt-1">
              Thermal derating drops $P_D$ from {specs.pdMax}W to {effectivePdMax.toFixed(0)}W.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
