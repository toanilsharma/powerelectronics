import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Zap, Sliders, Activity, Info, ShieldAlert, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface DoublePulseTestLabProps {
  onClose?: () => void;
}

export type DPTDevice = 'si_mosfet' | 'si_igbt' | 'sic_mosfet' | 'gan_hemt';

export const DoublePulseTestLab: React.FC<DoublePulseTestLabProps> = ({ onClose }) => {
  // Circuit Parameters
  const [deviceType, setDeviceType] = useState<DPTDevice>('sic_mosfet');
  const [vDcBus, setVDcBus] = useState<number>(400); // 100V to 800V
  const [targetCurrent, setTargetCurrent] = useState<number>(30); // 5A to 60A
  const [gateResistorRg, setGateResistorRg] = useState<number>(10); // 2 to 50 Ohms
  const [strayInductanceL, setStrayInductanceL] = useState<number>(15); // 5 to 50 nH parasitic loop inductance
  const [diodeQrrFactor, setDiodeQrrFactor] = useState<number>(1.0); // 0.2 (SiC Schottky) to 2.5 (Si Fast Diode)

  // Double-Pulse Timing Parameters (in nanoseconds)
  const [pulse1WidthNs, setPulse1WidthNs] = useState<number>(300); // 100 - 600 ns (ramps current)
  const [deadTimeNs, setDeadTimeNs] = useState<number>(150); // 50 - 300 ns (freewheeling)
  const [pulse2WidthNs, setPulse2WidthNs] = useState<number>(200); // 100 - 400 ns (measurement pulse)

  // Simulation Clock & Execution State
  const [isTriggered, setIsTriggered] = useState<boolean>(true);
  const [simTimeNs, setSimTimeNs] = useState<number>(0); // 0 to Total Test Window (~850ns)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.15); // Slow-mo factor
  const [isLooping, setIsLooping] = useState<boolean>(true);

  const canvasScopeRef = useRef<HTMLCanvasElement | null>(null);

  // Device Specifications (IEC 60747-9 benchmark parameters)
  const deviceSpecs: Record<DPTDevice, {
    name: string;
    tech: string;
    tf_ns: number; // fall time of Vds
    tr_ns: number; // rise time of Id
    qrr_base_nC: number;
    trr_ns: number;
    rdsOn: number;
    badgeColor: string;
  }> = {
    si_mosfet: {
      name: 'Si Superjunction MOSFET (IPW65R045C7)',
      tech: 'Silicon CoolMOS',
      tf_ns: 32,
      tr_ns: 24,
      qrr_base_nC: 450,
      trr_ns: 65,
      rdsOn: 0.045,
      badgeColor: '#38bdf8',
    },
    si_igbt: {
      name: 'Trench Field-Stop IGBT (IKW40N120H3)',
      tech: 'Silicon IGBT + Tail',
      tf_ns: 55,
      tr_ns: 38,
      qrr_base_nC: 780,
      trr_ns: 95,
      rdsOn: 0.075,
      badgeColor: '#fbbf24',
    },
    sic_mosfet: {
      name: 'SiC Power MOSFET (C3M0021120D)',
      tech: 'Silicon Carbide (3.26 eV)',
      tf_ns: 12,
      tr_ns: 9,
      qrr_base_nC: 85,
      trr_ns: 20,
      rdsOn: 0.018,
      badgeColor: '#a855f7',
    },
    gan_hemt: {
      name: 'GaN E-HEMT (EPC2050 2DEG)',
      tech: 'Gallium Nitride (Zero Qrr)',
      tf_ns: 4.5,
      tr_ns: 3.2,
      qrr_base_nC: 0,
      trr_ns: 0,
      rdsOn: 0.007,
      badgeColor: '#34d399',
    },
  };

  const currentDevice = deviceSpecs[deviceType];

  // Timing checkpoints
  const t0 = 60; // Initial hold
  const t1 = t0 + pulse1WidthNs; // End of Pulse 1 (Current reached target)
  const t2 = t1 + deadTimeNs; // Start of Pulse 2 (Critical Turn-On transition into Diode Qrr)
  const t3 = t2 + pulse2WidthNs; // End of Pulse 2
  const totalWindowNs = t3 + 120; // End of scope screen

  // Calculate Turn-On Switching Energy (E_on) & Turn-Off Energy (E_off)
  const rgFactor = gateResistorRg / 10;
  const effectiveTr = currentDevice.tr_ns * Math.sqrt(rgFactor);
  const effectiveTf = currentDevice.tf_ns * rgFactor;
  const qrrActual = currentDevice.qrr_base_nC * diodeQrrFactor;
  const irrPeak = qrrActual > 0 ? Math.min(60, (2 * qrrActual) / Math.max(15, currentDevice.trr_ns)) : 0;

  // E_on = 0.5 * Vdc * (Iload + Irr) * t_cross
  const tCrossOn = (effectiveTr + effectiveTf) * 1e-9;
  const eOn_uJ = 0.5 * vDcBus * (targetCurrent + irrPeak * 0.7) * tCrossOn * 1e6;

  // E_off = 0.5 * Vdc * Iload * t_cross_off + inductive overvoltage
  const tCrossOff = (effectiveTf * 1.2) * 1e-9;
  const vPeakSpike = vDcBus + (strayInductanceL * 1e-9 * (targetCurrent / (effectiveTf * 1e-9)));
  const eOff_uJ = 0.5 * vPeakSpike * targetCurrent * tCrossOff * 1e6;

  // Real-time animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dtMs = now - lastTime;
      lastTime = now;

      if (isTriggered) {
        setSimTimeNs((prev) => {
          const next = prev + dtMs * playbackSpeed * 2.8;
          if (next >= totalWindowNs) {
            return isLooping ? 0 : totalWindowNs;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isTriggered, isLooping, playbackSpeed, totalWindowNs]);

  // Evaluate Waveform State at any nanosecond timestamp t
  const getDPTPoint = (t: number) => {
    let vGate = 0;
    let vds = vDcBus;
    let id = 0;
    let iDiode = 0;

    if (t < t0) {
      // Resting off
      vGate = 0;
      vds = vDcBus;
      id = 0;
      iDiode = 0;
    } else if (t >= t0 && t < t1) {
      // --- PULSE 1: Ramping Inductor Current ---
      vGate = 15;
      const progress = (t - t0) / pulse1WidthNs;
      if (t - t0 < effectiveTr) {
        // Initial turn-on edge
        const p = (t - t0) / effectiveTr;
        vds = vDcBus * (1 - p) + targetCurrent * currentDevice.rdsOn;
      } else {
        vds = targetCurrent * currentDevice.rdsOn;
      }
      id = targetCurrent * progress;
      iDiode = 0;
    } else if (t >= t1 && t < t2) {
      // --- DEAD TIME: Turn-Off 1 & Freewheeling ---
      vGate = 0;
      const tOff = t - t1;
      if (tOff < effectiveTf) {
        // Turn-off transient with inductive overshoot spike
        const p = tOff / effectiveTf;
        const spike = (strayInductanceL * 1.8) * Math.sin(p * Math.PI);
        vds = vDcBus * p + spike;
        id = targetCurrent * (1 - p);
        iDiode = targetCurrent * p;
      } else {
        // Stable freewheeling through upper clamp diode
        // Parasitic oscillation ringing (L_stray with Coss)
        const ring = 25 * Math.exp(-(tOff - effectiveTf) / 40) * Math.sin((tOff - effectiveTf) * 0.25);
        vds = vDcBus + ring;
        id = 0;
        iDiode = targetCurrent;
      }
    } else if (t >= t2 && t < t3) {
      // --- PULSE 2: The Critical Measurement Turn-On ---
      vGate = 15;
      const tOn2 = t - t2;
      if (tOn2 < effectiveTr + currentDevice.trr_ns) {
        // Severe current shoot-through spike due to Diode Reverse Recovery
        const pV = Math.min(1, tOn2 / effectiveTf);
        vds = vDcBus * (1 - pV) + targetCurrent * currentDevice.rdsOn;

        // Current spike: I_load + I_rr peak
        const pIrr = Math.sin((tOn2 / (effectiveTr + currentDevice.trr_ns)) * Math.PI);
        id = targetCurrent + irrPeak * Math.max(0, pIrr);
        iDiode = targetCurrent * (1 - Math.min(1, tOn2 / effectiveTr));
      } else {
        vds = targetCurrent * currentDevice.rdsOn;
        id = targetCurrent;
        iDiode = 0;
      }
    } else {
      // --- Turn-Off 2 ---
      vGate = 0;
      const tOff2 = t - t3;
      if (tOff2 < effectiveTf) {
        const p = tOff2 / effectiveTf;
        const spike = (strayInductanceL * 1.8) * Math.sin(p * Math.PI);
        vds = vDcBus * p + spike;
        id = targetCurrent * (1 - p);
      } else {
        vds = vDcBus;
        id = 0;
      }
      iDiode = targetCurrent;
    }

    const pInstWatts = vds * id;
    return { vGate, vds, id, iDiode, pInstWatts };
  };

  // Render CRT Dual-Trace Nanosecond Oscilloscope
  useEffect(() => {
    const canvas = canvasScopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, w, h);

    // CRT Reticle Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    const gridCols = 16;
    const gridRows = 8;
    for (let c = 0; c <= gridCols; c++) {
      const x = (c / gridCols) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let r = 0; r <= gridRows; r++) {
      const y = (r / gridRows) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero Reference Horizontal Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75); // Id zero reference
    ctx.lineTo(w, h * 0.75);
    ctx.moveTo(0, h * 0.45); // Vds zero reference
    ctx.lineTo(w, h * 0.45);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scope Mapping Helpers
    const timeToX = (t: number) => (t / totalWindowNs) * w;
    const vdsToY = (v: number) => h * 0.45 - (v / 850) * (h * 0.4);
    const idToY = (i: number) => h * 0.75 - (i / 90) * (h * 0.28);
    const pToY = (p: number) => h * 0.95 - (p / 25000) * (h * 0.45);

    // 1. Math Trace: Instantaneous Power Dissipation P(t) = Vds * Id (Magenta Area)
    ctx.fillStyle = 'rgba(236, 72, 153, 0.18)';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.95);
    for (let px = 0; px < w; px += 2) {
      const t = (px / w) * totalWindowNs;
      const pt = getDPTPoint(t);
      const py = Math.max(10, pToY(pt.pInstWatts));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, h * 0.95);
    ctx.closePath();
    ctx.fill();

    // 2. Channel 1: V_DS Drain-Source Voltage (Neon Amber / Yellow)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const t = (px / w) * totalWindowNs;
      const pt = getDPTPoint(t);
      const py = vdsToY(pt.vds);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 3. Channel 2: I_D Drain Current (Neon Cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const t = (px / w) * totalWindowNs;
      const pt = getDPTPoint(t);
      const py = idToY(pt.id);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;

    // 4. Critical Turn-On Annotation Marker (Diode Reverse Recovery Peak)
    const tCritX = timeToX(t2 + effectiveTr * 0.8);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(tCritX, 15);
    ctx.lineTo(tCritX, h - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Callout Box for Reverse Recovery Shoot-Through Spike
    if (irrPeak > 0) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
      ctx.fillRect(Math.min(w - 180, Math.max(10, tCritX + 8)), 20, 165, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText(`⚡ DIODE Qrr PEAK: +${irrPeak.toFixed(1)}A`, Math.min(w - 175, Math.max(15, tCritX + 14)), 34);
      ctx.font = '8px monospace';
      ctx.fillText(`Total I_peak = ${(targetCurrent + irrPeak).toFixed(1)} A`, Math.min(w - 175, Math.max(15, tCritX + 14)), 46);
    }

    // 5. Sweep Cursor Bar representing simTimeNs
    const curX = timeToX(simTimeNs);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX, 0);
    ctx.lineTo(curX, h);
    ctx.stroke();

    // Glowing Cursor Dot on Vds and Id
    const curPt = getDPTPoint(simTimeNs);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(curX, vdsToY(curPt.vds), 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(curX, idToY(curPt.id), 4.5, 0, Math.PI * 2);
    ctx.fill();

  }, [simTimeNs, vDcBus, targetCurrent, gateResistorRg, strayInductanceL, diodeQrrFactor, deviceType, t0, t1, t2, t3, totalWindowNs]);

  const liveState = getDPTPoint(simTimeNs);

  return (
    <div className="w-full bg-[#090e1a] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-5 font-sans">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-600/60 shadow-lg shadow-purple-900/30 text-purple-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Double-Pulse Test Workbench (IEC 60747-9)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-900/60 border border-purple-500/50 text-purple-300">
                INDUSTRY STANDARD DPT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Clamped inductive load switching analysis: Turn-On (E_on), Turn-Off (E_off), Diode Reverse Recovery (Q_rr), and Parasitic Stray Inductance Ringing.
            </p>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#050811] border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">E_on Loss:</span>
            <span className="font-bold text-pink-400">{eOn_uJ.toFixed(1)} µJ</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#050811] border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">E_off Loss:</span>
            <span className="font-bold text-amber-400">{eOff_uJ.toFixed(1)} µJ</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#050811] border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Vds Peak:</span>
            <span className={`font-bold ${vPeakSpike > 650 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {vPeakSpike.toFixed(0)} V
            </span>
          </div>
        </div>
      </div>

      {/* Main Workbench Layout: Left Controls + Center Scope + Right Animated SLD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Test Setup Controls (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-[#0d1424] p-4 rounded-xl border border-slate-800">
          {/* Device Technology Selector */}
          <div>
            <label className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>DEVICE UNDER TEST (DUT):</span>
              <span className="text-[10px] text-purple-400">{currentDevice.tech}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['si_mosfet', 'si_igbt', 'sic_mosfet', 'gan_hemt'] as DPTDevice[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeviceType(d)}
                  className={`p-2 rounded-lg text-left text-xs font-mono font-bold transition-all border cursor-pointer ${
                    deviceType === d
                      ? 'bg-purple-950/90 text-purple-200 border-purple-500 shadow-md shadow-purple-950/50'
                      : 'bg-[#050811] text-slate-400 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-[11px] font-bold text-white">{deviceSpecs[d].name.split(' ')[0]} {deviceSpecs[d].name.split(' ')[1]}</div>
                  <div className="text-[9.5px] opacity-75">{deviceSpecs[d].tech}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Test Voltages & Current */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>DC Bus Voltage (V_DC):</span>
                <span className="font-bold text-amber-400">{vDcBus} V</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="25"
                value={vDcBus}
                onChange={(e) => setVDcBus(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Target Inductor Current (I_L):</span>
                <span className="font-bold text-cyan-400">{targetCurrent} A</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={targetCurrent}
                onChange={(e) => setTargetCurrent(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Gate Resistor (R_G):</span>
                <span className="font-bold text-blue-400">{gateResistorRg} Ω</span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={gateResistorRg}
                onChange={(e) => setGateResistorRg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Parasitic Stray Loop (L_σ):</span>
                <span className={`font-bold ${strayInductanceL > 30 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {strayInductanceL} nH
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="2"
                value={strayInductanceL}
                onChange={(e) => setStrayInductanceL(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Freewheeling Diode Q_rr:</span>
                <span className="font-bold text-pink-400">
                  {diodeQrrFactor === 0.2 ? 'SiC Schottky (Near Zero)' : `${(currentDevice.qrr_base_nC * diodeQrrFactor).toFixed(0)} nC`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-[10px]">
                {[
                  { label: 'SiC Fast', val: 0.2 },
                  { label: 'Standard', val: 1.0 },
                  { label: 'Heavy Qrr', val: 2.2 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setDiodeQrrFactor(opt.val)}
                    className={`py-1 rounded border text-center font-bold cursor-pointer transition-all ${
                      diodeQrrFactor === opt.val
                        ? 'bg-pink-950 text-pink-300 border-pink-500 font-black'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trigger & Playback Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSimTimeNs(0);
                setIsTriggered(true);
              }}
              className="flex-1 py-2 px-3 rounded-lg font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>FIRE DOUBLE PULSE</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`px-3 py-2 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                isLooping ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isLooping ? 'LOOP' : 'SINGLE'}
            </button>
          </div>
        </div>

        {/* CENTER & RIGHT COLUMN: Nanosecond Oscilloscope + Schematic (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Nanosecond Dual-Channel Scope */}
          <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#050a14] relative shadow-2xl">
            {/* Scope Channel Legend & Header */}
            <div className="bg-[#0b101e] px-3.5 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  CH1: V_DS (100V/div)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm" />
                  CH2: I_D (10A/div)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-pink-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm" />
                  MATH: P(t) = V·I
                </span>
              </div>
              <div className="text-slate-400 flex items-center gap-2">
                <span>Timebase: 50ns/div</span>
                <span className="text-purple-400 font-bold">t = {simTimeNs.toFixed(0)} ns</span>
              </div>
            </div>

            {/* Scope Canvas */}
            <canvas
              ref={canvasScopeRef}
              width={720}
              height={280}
              className="w-full h-56 sm:h-64 block cursor-crosshair"
            />

            {/* Live Instantaneous Probe Readouts at Cursor */}
            <div className="bg-[#070b16] px-3.5 py-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10.5px] font-mono text-slate-300">
              <span>Probe: V_DS = <strong className="text-amber-400">{liveState.vds.toFixed(1)}V</strong></span>
              <span>Probe: I_D = <strong className="text-cyan-400">{liveState.id.toFixed(1)}A</strong></span>
              <span>Diode I_F = <strong className="text-indigo-400">{liveState.iDiode.toFixed(1)}A</strong></span>
              <span>Instant Power = <strong className="text-pink-400">{(liveState.pInstWatts / 1000).toFixed(1)} kW</strong></span>
            </div>
          </div>

          {/* Bottom Row: Clamped Inductive Test Circuit SLD + Academic Physics Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clamped Inductive Half-Bridge Schematic */}
            <div className="p-3.5 rounded-xl bg-[#090f1e] border border-slate-800 flex flex-col gap-2">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                <span>IEC 60747-9 CLAMPED INDUCTIVE CIRCUIT</span>
                <span className="text-purple-400">DUT: Low-Side</span>
              </div>

              <svg viewBox="0 0 280 140" className="w-full h-auto bg-[#050811] rounded-lg border border-slate-800/80">
                {/* DC Bus Rail (+) */}
                <line x1="20" y1="20" x2="260" y2="20" stroke="#f59e0b" strokeWidth="2.5" />
                <text x="25" y="15" fill="#f59e0b" fontSize="8" fontFamily="monospace" fontWeight="bold">+V_DC ({vDcBus}V)</text>

                {/* DC Bus Rail (-) Ground */}
                <line x1="20" y1="125" x2="260" y2="125" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="25" y="135" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">GND (0V)</text>

                {/* Upper Clamp Diode (Freewheeling) */}
                <g transform="translate(140, 35)">
                  <polygon points="0,0 -8,14 8,14" fill={liveState.iDiode > 0.5 ? '#34d399' : '#1e293b'} stroke="#34d399" strokeWidth="1.5" />
                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#34d399" strokeWidth="1.5" />
                  <text x="12" y="10" fill="#34d399" fontSize="7" fontFamily="monospace">D_clamp</text>
                </g>

                {/* Inductive Load Choke (L_load) */}
                <path d="M 140 55 Q 165 45 190 55 Q 215 45 235 55" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="195" y="70" fill="#38bdf8" fontSize="8" fontFamily="monospace">L_load (Choke)</text>

                {/* Lower DUT Switch (Q1) */}
                <g transform="translate(140, 85)">
                  <rect x="-12" y="-12" width="24" height="24" rx="4" fill={liveState.vGate > 5 ? '#a855f7' : '#1e293b'} stroke="#a855f7" strokeWidth="1.5" />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">DUT</text>
                  <text x="-16" y="2" textAnchor="end" fill="#d8b4fe" fontSize="7" fontFamily="monospace">G</text>
                  <text x="16" y="-6" textAnchor="start" fill="#fde047" fontSize="7" fontFamily="monospace">D</text>
                  <text x="16" y="10" textAnchor="start" fill="#67e8f9" fontSize="7" fontFamily="monospace">S</text>
                </g>

                {/* Connection wires */}
                <line x1="140" y1="20" x2="140" y2="35" stroke="#f59e0b" strokeWidth="2" />
                <line x1="140" y1="49" x2="140" y2="73" stroke="#fde047" strokeWidth="2" />
                <line x1="140" y1="97" x2="140" y2="125" stroke="#67e8f9" strokeWidth="2" />

                {/* Live Current Dots */}
                {liveState.id > 1 && (
                  <circle cx="140" cy="110" r="3" fill="#06b6d4" className="animate-ping" />
                )}
                {liveState.iDiode > 1 && (
                  <circle cx="140" cy="42" r="3" fill="#34d399" className="animate-ping" />
                )}
              </svg>

              <div className="text-[10px] text-slate-400 leading-relaxed font-mono">
                {simTimeNs < t1 ? (
                  <span className="text-cyan-300">Phase 1: Pulse 1 ON — Inductor charges linearly to {targetCurrent}A.</span>
                ) : simTimeNs < t2 ? (
                  <span className="text-emerald-300">Phase 2: Deadtime — Inductor current freewheels through clamp diode D1.</span>
                ) : simTimeNs < t3 ? (
                  <span className="text-rose-300 font-bold">Phase 3: Pulse 2 ON — DUT recovers diode stored charge Q_rr, creating shoot-through spike!</span>
                ) : (
                  <span className="text-purple-300">Phase 4: Pulse 2 OFF — Inductive overvoltage clamp & Coss ringing.</span>
                )}
              </div>
            </div>

            {/* Academic Equations & Insights */}
            <div className="p-3.5 rounded-xl bg-[#090f1e] border border-slate-800 flex flex-col justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>KEY UNIVERSITY LAB TAKEAWAYS:</span>
                </div>
                <ul className="text-[10.5px] text-slate-300 space-y-1.5 leading-relaxed font-mono">
                  <li>
                    <strong className="text-pink-400">1. Why Turn-On loss E_on &gt; E_off:</strong> The diode reverse recovery charge (Q_rr) forces the switch to momentarily conduct both load current AND diode recovery current!
                  </li>
                  <li>
                    <strong className="text-emerald-400">2. GaN / SiC Superiority:</strong> GaN HEMTs have zero reverse recovery (Q_rr = 0nC), completely eliminating the current spike and reducing E_on by over 70%.
                  </li>
                  <li>
                    <strong className="text-amber-400">3. Parasitic Stray Inductance (L_σ):</strong> Causes inductive turn-off spike V_pk = V_DC + L_σ · di/dt, potentially exceeding breakdown voltage!
                  </li>
                </ul>
              </div>

              <div className="p-2 rounded bg-purple-950/40 border border-purple-800/40 text-[10px] font-mono text-purple-300 flex items-center justify-between">
                <span>Calculated Total Switching Loss:</span>
                <span className="font-bold text-white">{(eOn_uJ + eOff_uJ).toFixed(1)} µJ/pulse</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
