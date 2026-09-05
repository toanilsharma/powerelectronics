import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Sliders, Shield, AlertTriangle, Info, Sparkles, Activity } from 'lucide-react';

interface DiodeReverseRecoveryLabProps {
  onClose?: () => void;
}

export const DiodeReverseRecoveryLab: React.FC<DiodeReverseRecoveryLabProps> = ({ onClose }) => {
  // Physical parameters
  const [ifForward, setIfForward] = useState<number>(20); // Forward current in Amperes (5A - 50A)
  const [dIdt, setDIdt] = useState<number>(250); // di/dt during turn-off in A/µs (50 - 800 A/µs)
  const [vrReverse, setVrReverse] = useState<number>(200); // Reverse blocking voltage in Volts (50V - 600V)
  const [diodeTech, setDiodeTech] = useState<'standard' | 'fast' | 'sic_schottky'>('fast');
  const [hasSnubber, setHasSnubber] = useState<boolean>(false);
  const [snubberC, setSnubberC] = useState<number>(47); // nF
  const [loopInductance, setLoopInductance] = useState<number>(40); // nH stray inductance (10 - 150 nH)

  // Simulation controls
  const [timeDilation, setTimeDilation] = useState<number>(0.1); // 1.0 = normal, 0.1 = slow-mo, 0.02 = ultra slow
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTimeNs, setSimTimeNs] = useState<number>(0); // 0 to 800 ns window

  const canvasScopeRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCarrierRef = useRef<HTMLCanvasElement | null>(null);

  // Semiconductor Physics Parameters based on technology
  const techParams = {
    standard: {
      tau: 800, // Carrier lifetime in ns
      irrmCoeff: 0.85,
      softness: 0.6, // S = tb / ta (snappy)
      name: 'Standard Recovery Rectifier (1N5408 / Silicon PIN)',
      standard: 'IEC 60747-2 PIN Junction',
    },
    fast: {
      tau: 120, // Fast Epitaxial / FRED
      irrmCoeff: 0.45,
      softness: 1.2, // Soft recovery
      name: 'Fast Recovery Epitaxial Diode (FRED / MUR1560)',
      standard: 'JEDEC JESD282B.01 Fast Recovery',
    },
    sic_schottky: {
      tau: 5, // Majority carrier device (negligible Qrr)
      irrmCoeff: 0.05,
      softness: 2.5,
      name: 'Silicon Carbide (SiC) Schottky Diode (C3D10060A)',
      standard: 'JEDEC JESD282B.01 Majority Carrier',
    },
  }[diodeTech];

  // Calculate Analytical Physics according to JEDEC JESD282B.01
  // Qrr ≈ sqrt(2 * If * tau * di_dt * 1e-6)
  const diDtA_s = dIdt * 1e6; // A/s
  const tau_s = techParams.tau * 1e-9;
  const qrr_uC = diodeTech === 'sic_schottky'
    ? 0.02
    : Math.sqrt(2 * ifForward * tau_s * (diDtA_s * 1e-6)) * 1.4; // micro-Coulombs

  // Peak Reverse Recovery Current IRRM = sqrt(2 * Qrr * (di/dt) / (1 + S))
  const S = techParams.softness;
  const irrm_A = diodeTech === 'sic_schottky'
    ? 0.5 + (vrReverse * 0.003)
    : Math.sqrt((2 * (qrr_uC * 1e-6) * diDtA_s) / (1 + S));

  // Times
  const ta_ns = (irrm_A / dIdt) * 1000; // time from zero cross to IRRM
  const tb_ns = ta_ns * S; // recovery time back to 10%
  const trr_ns = ta_ns + tb_ns;

  // Voltage Spike across diode due to stray loop inductance: Vpeak = Vr + L * (di_rec / dt)
  const diRecDtA_s = (irrm_A / (tb_ns * 1e-9));
  const snubberDamping = hasSnubber ? Math.max(0.15, 1 / (1 + (snubberC / 20))) : 1.0;
  const vSpikeRaw = (loopInductance * 1e-9) * diRecDtA_s * snubberDamping;
  const vPeakReverse = vrReverse + Math.min(800, vSpikeRaw);
  const ringFreqMhz = 1000 / (2 * Math.PI * Math.sqrt((loopInductance * 1e-9) * (hasSnubber ? (snubberC * 1e-9) : 250e-12)) * 1e9);

  // Time window: 0 ns to 600 ns
  // Phase 1 (0 to 150 ns): Forward Conduction (If)
  // Phase 2 (150 to 150 + If/di_dt): Current falling at di/dt to 0A
  // Phase 3 (t_zero to t_zero + ta): Reverse recovery down to -IRRM
  // Phase 4 (t_zero + ta to t_zero + trr): Recovery tb back towards 0 with inductive voltage overshoot
  // Phase 5: Reverse blocking (Vr) with ringing
  const tCrossZero = 150 + (ifForward / dIdt) * 1000;
  const tPeakIrrm = tCrossZero + ta_ns;
  const tRecovered = tPeakIrrm + tb_ns;

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const step = (now: number) => {
      const dt = (now - lastTimestamp);
      lastTimestamp = now;

      if (isRunning) {
        setSimTimeNs((prev) => {
          // Advance time by dt (ms) * timeDilation * scale
          const increment = dt * timeDilation * 1.5;
          const next = prev + increment;
          return next > 600 ? 0 : next;
        });
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, timeDilation]);

  // Instantaneous i_D(t) and v_D(t) at simTimeNs
  const getInstantaneousValues = (t: number) => {
    let i = ifForward;
    let v = 0.85; // Forward drop Vf

    if (t < 150) {
      i = ifForward;
      v = 0.85;
    } else if (t < tCrossZero) {
      const elapsed = (t - 150) / 1000; // us
      i = ifForward - (dIdt * elapsed);
      v = 0.80 * (i / ifForward);
    } else if (t < tPeakIrrm) {
      const elapsed = (t - tCrossZero) / 1000;
      i = -(dIdt * elapsed);
      v = -0.5 - (elapsed * 5);
    } else if (t < tRecovered) {
      const progress = (t - tPeakIrrm) / tb_ns;
      i = -irrm_A * Math.exp(-progress * 2.8);
      const spikeFactor = Math.sin(progress * Math.PI) * (vPeakReverse - vrReverse);
      v = -(vrReverse + spikeFactor);
    } else {
      // Ringing phase
      const ringT = (t - tRecovered) / 1000; // us
      const decay = Math.exp(-ringT * (hasSnubber ? 18 : 6));
      const ringV = Math.sin(ringT * (ringFreqMhz * 2 * Math.PI)) * (vSpikeRaw * 0.7) * decay;
      i = 0.05 * decay;
      v = -(vrReverse + ringV);
    }

    return { i, v };
  };

  const { i: currentI, v: currentV } = getInstantaneousValues(simTimeNs);

  // Determine current physical phase
  const getPhaseName = () => {
    if (simTimeNs < 150) return { title: 'FORWARD CONDUCTION', desc: 'Stored minority charge Qrr accumulating in drift region', color: '#10b981' };
    if (simTimeNs < tCrossZero) return { title: 'di/dt LINEAR FALL', desc: 'Current collapsing toward zero crossing under external drive', color: '#38bdf8' };
    if (simTimeNs < tPeakIrrm) return { title: 'MINORITY CHARGE SWEEP-OUT (ta)', desc: 'Diode conducts BACKWARDS to extract stored carriers Qrr', color: '#f59e0b' };
    if (simTimeNs < tRecovered) return { title: 'SNAP-OFF & INDUCTIVE OVERVOLTAGE (tb)', desc: 'Depletion layer expands; di/dt generates severe L·di/dt spike', color: '#ef4444' };
    return { title: 'REVERSE BLOCKING & RINGING', desc: 'Diode blocks full reverse voltage Vr; parasitics ring down', color: '#a855f7' };
  };

  const currentPhase = getPhaseName();

  // Render High-Resolution Oscilloscope CRT
  useEffect(() => {
    const canvas = canvasScopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#0a0e17';
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

    // Zero References
    const yZeroI = h * 0.42;
    const yZeroV = h * 0.72;

    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, yZeroI);
    ctx.lineTo(w, yZeroI);
    ctx.moveTo(0, yZeroV);
    ctx.lineTo(w, yZeroV);
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel 1: Current i_D(t) (Emerald Cyan)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const maxIPlot = Math.max(ifForward * 1.3, irrm_A * 1.3, 30);
    const iScale = (h * 0.35) / maxIPlot;

    for (let x = 0; x < w; x++) {
      const t = (x / w) * 600;
      const { i } = getInstantaneousValues(t);
      const y = yZeroI - (i * iScale);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Channel 2: Voltage v_D(t) (Amber / Crimson on Spike)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const maxVPlot = Math.max(vPeakReverse * 1.15, 300);
    const vScale = (h * 0.38) / maxVPlot;

    for (let x = 0; x < w; x++) {
      const t = (x / w) * 600;
      const { v } = getInstantaneousValues(t);
      const y = yZeroV - (v * vScale);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Time Cursor (Moving vertical strobe)
    const cursorX = (simTimeNs / 600) * w;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, h);
    ctx.stroke();

    // Cursor Readout Dots
    const cursorYI = yZeroI - (currentI * iScale);
    const cursorYV = yZeroV - (currentV * vScale);

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(cursorX, cursorYI, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cursorX, cursorYV, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Legend & Benchmarks
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`CH1 i_D: ${currentI >= 0 ? '+' : ''}${currentI.toFixed(1)} A  (IRRM = -${irrm_A.toFixed(1)} A)`, 12, 18);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`CH2 v_D: ${currentV.toFixed(0)} V  (V_peak = ${vPeakReverse.toFixed(0)} V)`, 12, 34);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`t_rr: ${trr_ns.toFixed(0)} ns | Q_rr: ${qrr_uC.toFixed(2)} µC | di/dt: ${dIdt} A/µs`, w - 240, 18);

    // Trigger Point Markers (ta, tb, Vspike)
    const xZeroCross = (tCrossZero / 600) * w;
    const xPeakIrrm = (tPeakIrrm / 600) * w;
    const xRecovered = (tRecovered / 600) * w;

    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText('0A cross', xZeroCross - 18, yZeroI + 12);
    ctx.fillText(`IRRM (-${irrm_A.toFixed(0)}A)`, xPeakIrrm - 22, yZeroI + (irrm_A * iScale) + 12);
    ctx.fillText(`V_spike (${vPeakReverse.toFixed(0)}V)`, xPeakIrrm + 10, yZeroV + (vPeakReverse * vScale) - 8);

  }, [simTimeNs, ifForward, dIdt, vrReverse, diodeTech, hasSnubber, loopInductance, irrm_A, vPeakReverse, trr_ns, qrr_uC]);

  // Render Semiconductor PN Junction Micro-Carrier Animation
  useEffect(() => {
    const canvas = canvasCarrierRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw P+ Anode, N- Drift Region, N+ Cathode layers
    const pWidth = w * 0.28;
    const driftWidth = w * 0.44;
    const nWidth = w * 0.28;

    // P+ Layer
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, pWidth, h);

    // N- Drift Layer (Intrinsic/Epitaxial)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pWidth, 0, driftWidth, h);

    // N+ Cathode
    ctx.fillStyle = '#022c22';
    ctx.fillRect(pWidth + driftWidth, 0, nWidth, h);

    // Layer Dividers
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(pWidth, 0);
    ctx.lineTo(pWidth, h);
    ctx.moveTo(pWidth + driftWidth, 0);
    ctx.lineTo(pWidth + driftWidth, h);
    ctx.stroke();

    // Layer Labels
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#818cf8';
    ctx.fillText('P+ ANODE (Holes h+)', 10, 16);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('N- DRIFT (Stored Qrr Base)', pWidth + 12, 16);

    ctx.fillStyle = '#34d399';
    ctx.fillText('N+ CATHODE (Electrons e-)', pWidth + driftWidth + 10, 16);

    // Depletion Layer Expansion (Wdep increases with reverse voltage)
    let depRatio = 0.05;
    if (simTimeNs > tCrossZero) {
      const revProg = Math.min(1.0, (simTimeNs - tCrossZero) / (tRecovered - tCrossZero + 50));
      depRatio = 0.05 + (0.75 * revProg);
    }

    const depWidth = driftWidth * depRatio;
    const depX = pWidth;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.fillRect(depX, 22, depWidth, h - 30);
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(depX, 22, depWidth, h - 30);
    ctx.setLineDash([]);

    ctx.fillStyle = '#f87171';
    ctx.font = '8px monospace';
    if (depRatio > 0.15) {
      ctx.fillText(`SPACE CHARGE DEPLETION (E-FIELD = ${(Math.abs(currentV) / 0.05).toFixed(0)} kV/cm)`, depX + 6, h - 10);
    }

    // Minority Carrier Charge Particles
    const isReverseExtracting = simTimeNs >= tCrossZero && simTimeNs < tRecovered;
    const isForward = simTimeNs < tCrossZero;

    const numParticles = diodeTech === 'sic_schottky' ? 4 : Math.min(60, Math.round((ifForward / 10) * 16));
    const carrierDensity = isForward
      ? 1.0 - (simTimeNs / tCrossZero) * 0.4
      : isReverseExtracting
      ? Math.max(0.05, 1.0 - (simTimeNs - tCrossZero) / (tRecovered - tCrossZero))
      : 0.05;

    // Draw dynamic carriers
    for (let i = 0; i < numParticles * carrierDensity; i++) {
      const seed = (i * 97) % 100;
      const seedY = (i * 43) % (h - 45) + 26;

      // Particle X position
      let posX = pWidth + (driftWidth * (seed / 100));

      // In reverse recovery, carriers are pulled back to P+ Anode
      if (isReverseExtracting) {
        posX = pWidth + (driftWidth * (seed / 100) * (1 - (simTimeNs - tCrossZero) / (tPeakIrrm - tCrossZero + 10)));
      }

      ctx.fillStyle = seed % 2 === 0 ? '#38bdf8' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(posX, seedY, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Direction Flow Vector Arrows
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    if (currentI > 0.5) {
      ctx.fillText('►► FORWARD CURRENT CONDUCTION (+If) ►►', w * 0.32, h / 2);
    } else if (currentI < -0.5) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`◄◄ REVERSE RECOVERY EXTRACTION (-IRRM = ${Math.abs(currentI).toFixed(1)}A) ◄◄`, w * 0.22, h / 2);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('REVERSE RECOVERY COMPLETE • DEPLETION ESTABLISHED', w * 0.26, h / 2);
    }

  }, [simTimeNs, diodeTech, ifForward, currentI, currentV, tCrossZero, tPeakIrrm, tRecovered]);

  return (
    <div className="bg-[#0b101b] border border-[#1e293b] rounded-2xl p-4 text-slate-200 shadow-2xl space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Diode Reverse Recovery Physics (Qrr, trr)</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                JEDEC JESD282B.01
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive carrier depletion, stored minority charge extraction & high-frequency parasitic inductive voltage spikes ($L \cdot di/dt$).
            </p>
          </div>
        </div>

        {/* TIME DILATION & SIM CONTROLS */}
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
            title="Reset to 0ns"
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
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {spd.label}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE PHASE BANNER */}
      <div
        className="px-3 py-2 rounded-xl border flex items-center justify-between text-xs"
        style={{ backgroundColor: `${currentPhase.color}15`, borderColor: `${currentPhase.color}50` }}
      >
        <div className="flex items-center gap-2 font-mono">
          <Activity className="w-4 h-4" style={{ color: currentPhase.color }} />
          <span className="font-black tracking-wide" style={{ color: currentPhase.color }}>
            {currentPhase.title}
          </span>
          <span className="text-slate-300">| {currentPhase.desc}</span>
        </div>
        <div className="font-mono text-[11px] text-slate-300">
          t = <strong className="text-white">{simTimeNs.toFixed(1)} ns</strong> / 600 ns
        </div>
      </div>

      {/* DUAL VISUAL VIEWPORTS: SCOPE & CARRIER CUTAWAY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VIEWPORT 1: CRT OSCILLOSCOPE TRACE */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              DYNAMIC CRT SCOPE: i_D(t) & v_D(t)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">60ns / div</span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-800">
            <canvas
              ref={canvasScopeRef}
              width={560}
              height={350}
              className="w-full h-full block"
            />
          </div>

          {/* REAL-TIME NUMERIC TELEMETRY CARDS */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Peak Reverse I_RRM</div>
              <div className="text-sm font-bold text-cyan-300">{irrm_A.toFixed(1)} A</div>
            </div>
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Reverse Overvoltage V_peak</div>
              <div className={`text-sm font-bold ${vPeakReverse > 500 ? 'text-red-400' : 'text-amber-300'}`}>
                {vPeakReverse.toFixed(0)} V
              </div>
            </div>
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Stored Charge Q_rr</div>
              <div className="text-sm font-bold text-purple-300">{qrr_uC.toFixed(2)} µC</div>
            </div>
          </div>
        </div>

        {/* VIEWPORT 2: SEMICONDUCTOR PN JUNCTION X-RAY */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-purple-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              MICRO-CARRIER DRIFT & DEPLETION CUTAWAY
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Carrier Recombination</span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-800">
            <canvas
              ref={canvasCarrierRef}
              width={560}
              height={350}
              className="w-full h-full block"
            />
          </div>

          {/* PHYSICAL INSIGHT CALLOUT */}
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300">Why Reverse Recovery Destroys Converters:</strong> When the transistor turns on, the opposing freewheeling diode does not block instantly. It acts as a dead short circuit for t_rr, creating a severe current spike (I_switch = I_load + I_RRM) that generates high switching power loss and EMI ringing (L_stray · di/dt).
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE CONTROLS BENCH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0f172a] p-3 rounded-xl border border-slate-800 text-xs">
        {/* DIODE TECH SELECTOR */}
        <div className="space-y-2">
          <label className="font-bold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Semiconductor Diode Technology:
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'standard', name: 'Standard Silicon (PIN 1N5408)', trr: '800ns - High Loss' },
              { id: 'fast', name: 'Fast Recovery (FRED MUR1560)', trr: '120ns - Soft Recovery' },
              { id: 'sic_schottky', name: 'SiC Schottky (C3D10060A)', trr: '<10ns - Zero Qrr' },
            ].map((tech) => (
              <button
                key={tech.id}
                onClick={() => setDiodeTech(tech.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-left transition-all border ${
                  diodeTech === tech.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-transparent'
                }`}
              >
                <div className="text-[11px]">{tech.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{tech.trr}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CIRCUIT DRIVE PARAMETERS */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Forward Current $I_F$:</span>
              <span className="text-cyan-300 font-bold">{ifForward} A</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={ifForward}
              onChange={(e) => setIfForward(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Turn-off Commutation $di/dt$:</span>
              <span className="text-amber-300 font-bold">{dIdt} A/µs</span>
            </div>
            <input
              type="range"
              min={50}
              max={800}
              step={25}
              value={dIdt}
              onChange={(e) => setDIdt(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Reverse DC Bus Voltage $V_R$:</span>
              <span className="text-purple-300 font-bold">{vrReverse} V</span>
            </div>
            <input
              type="range"
              min={50}
              max={600}
              step={25}
              value={vrReverse}
              onChange={(e) => setVrReverse(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>
        </div>

        {/* PARASITICS & SNUBBER MITIGATION */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">PCB Stray Loop Inductance L_loop:</span>
              <span className="text-red-400 font-bold">{loopInductance} nH</span>
            </div>
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={loopInductance}
              onChange={(e) => setLoopInductance(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-400"
            />
          </div>

          {/* SNUBBER TOGGLE BUTTON */}
          <div className="pt-1">
            <button
              onClick={() => setHasSnubber(!hasSnubber)}
              className={`w-full py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                hasSnubber
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              {hasSnubber ? 'RC SNUBBER ACTIVE (Damped Spike)' : 'ENABLE RC SNUBBER CLAMP'}
            </button>
            <p className="text-[10px] text-slate-400 mt-1">
              {hasSnubber
                ? `Snubber C = ${snubberC}nF clamps L·di/dt spike from ${(vrReverse + vSpikeRaw).toFixed(0)}V down to ${vPeakReverse.toFixed(0)}V.`
                : 'Un-damped stray loop inductance causes severe high-voltage ringing exceeding diode rating.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
