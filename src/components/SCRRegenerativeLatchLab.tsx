import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Zap, Sliders, AlertTriangle, Info, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

interface SCRRegenerativeLatchLabProps {
  onClose?: () => void;
}

export const SCRRegenerativeLatchLab: React.FC<SCRRegenerativeLatchLabProps> = ({ onClose }) => {
  // Circuit physical parameters
  const [anodeVoltageVac, setAnodeVoltageVac] = useState<number>(120); // RMS Volts AC
  const [loadResistance, setLoadResistance] = useState<number>(30); // Ohms (5 to 100 Ohms)
  const [loadInductanceMh, setLoadInductanceMh] = useState<number>(20); // mH (0 to 100 mH)
  const [gatePulseDurationUs, setGatePulseDurationUs] = useState<number>(15); // µs pulse duration (2 to 100 µs)
  const [gateCurrentMa, setGateCurrentMa] = useState<number>(60); // mA gate drive (10 to 120 mA)

  // Physical constants of the thyristor (IEC 60747-6 standard benchmark)
  const iLatchingMa = 75; // Latching current I_L in mA
  const iHoldingMa = 35; // Holding current I_H in mA
  const vForwardDropV = 1.4; // SCR On-state drop Vf

  // Interactive dynamic state
  const [isGateTriggered, setIsGateTriggered] = useState<boolean>(false);
  const [isLatched, setIsLatched] = useState<boolean>(false);
  const [hasFailedToLatch, setHasFailedToLatch] = useState<boolean>(false);
  const [anodeCurrentA, setAnodeCurrentA] = useState<number>(0);
  const [alphaFeedback, setAlphaFeedback] = useState<number>(0.2); // α1 + α2 sum
  const [experimentResult, setExperimentResult] = useState<string | null>(null);

  const canvasDiagramRef = useRef<HTMLCanvasElement | null>(null);
  const canvasScopeRef = useRef<HTMLCanvasElement | null>(null);

  // Time & Pulse State Machine
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGateTriggered) {
      setHasFailedToLatch(false);
      setExperimentResult(null);

      // Gate pulse active window
      // Current rises according to di/dt = (V_anode - Vf) / L_load
      const vPeak = anodeVoltageVac * Math.SQRT2;
      const rTotal = loadResistance;
      const lTotal = Math.max(0.001, loadInductanceMh * 1e-3); // Henries

      // Calculate anode current at the exact moment gate pulse ends:
      // i_A(t_pulse) = (V / R) * (1 - exp(-t_pulse / (L/R)))
      const tau = lTotal / rTotal; // seconds
      const tPulseSec = gatePulseDurationUs * 1e-6;
      const currentAtEndOfPulseA = (vPeak / rTotal) * (1 - Math.exp(-tPulseSec / tau));
      const currentAtEndOfPulseMa = currentAtEndOfPulseA * 1000;

      // Regenerative feedback loop rises
      setAlphaFeedback(0.98);

      timer = setTimeout(() => {
        setIsGateTriggered(false);

        // Verification condition: Did anode current reach Latching Current I_L?
        if (currentAtEndOfPulseMa >= iLatchingMa) {
          setIsLatched(true);
          setAnodeCurrentA(vPeak / rTotal);
          setAlphaFeedback(1.0);
          setExperimentResult('LATCHED_SUCCESS');
        } else {
          // FAILED TO LATCH! Anode current didn't reach IL before gate pulse terminated!
          setIsLatched(false);
          setAnodeCurrentA(0);
          setAlphaFeedback(0.2);
          setHasFailedToLatch(true);
          setExperimentResult('FAILED_TO_LATCH');
        }
      }, gatePulseDurationUs * 50); // Scaled duration for visual observation
    }
    return () => clearTimeout(timer);
  }, [isGateTriggered, anodeVoltageVac, loadResistance, loadInductanceMh, gatePulseDurationUs]);

  // Turn-off trigger: Drop anode current below Holding Current I_H
  const handleForceCommutate = () => {
    setIsLatched(false);
    setAnodeCurrentA(0);
    setAlphaFeedback(0.15);
    setExperimentResult('COMMUTATED_OFF');
  };

  const handleFireGatePulse = () => {
    setIsGateTriggered(true);
  };

  // Render Coupled NPN-PNP Two-Transistor Analog & Regenerative Feedback Loop
  useEffect(() => {
    const canvas = canvasDiagramRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Dark Circuit Background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    // Reticle
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Two-Transistor Analog Positions
    // Q1 (PNP, Top Left)
    const q1X = w * 0.35;
    const q1Y = h * 0.32;

    // Q2 (NPN, Bottom Right)
    const q2X = w * 0.65;
    const q2Y = h * 0.68;

    // Conduction / Feedback state colors
    const activeColor = isLatched ? '#10b981' : isGateTriggered ? '#f59e0b' : hasFailedToLatch ? '#ef4444' : '#475569';
    const activeGlow = isLatched || isGateTriggered;

    // Draw Q1 (PNP Transistor Symbol)
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2.5;

    // Q1 Base line
    ctx.beginPath();
    ctx.moveTo(q1X, q1Y - 25);
    ctx.lineTo(q1X, q1Y + 25);
    ctx.stroke();

    // Q1 Emitter (Top, connected to Anode)
    ctx.beginPath();
    ctx.moveTo(q1X, q1Y - 12);
    ctx.lineTo(q1X + 25, q1Y - 35);
    ctx.stroke();
    // PNP arrow pointing into base
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.moveTo(q1X + 8, q1Y - 18);
    ctx.lineTo(q1X + 16, q1Y - 30);
    ctx.lineTo(q1X + 18, q1Y - 20);
    ctx.closePath();
    ctx.fill();

    // Q1 Collector (Bottom)
    ctx.beginPath();
    ctx.moveTo(q1X, q1Y + 12);
    ctx.lineTo(q1X + 25, q1Y + 35);
    ctx.stroke();

    // Draw Q2 (NPN Transistor Symbol)
    // Q2 Base line
    ctx.beginPath();
    ctx.moveTo(q2X, q2Y - 25);
    ctx.lineTo(q2X, q2Y + 25);
    ctx.stroke();

    // Q2 Collector (Top)
    ctx.beginPath();
    ctx.moveTo(q2X, q2Y - 12);
    ctx.lineTo(q2X - 25, q2Y - 35);
    ctx.stroke();

    // Q2 Emitter (Bottom, connected to Cathode)
    ctx.beginPath();
    ctx.moveTo(q2X, q2Y + 12);
    ctx.lineTo(q2X - 25, q2Y + 35);
    ctx.stroke();
    // NPN arrow pointing outward
    ctx.beginPath();
    ctx.moveTo(q2X - 18, q2Y + 28);
    ctx.lineTo(q2X - 10, q2Y + 18);
    ctx.lineTo(q2X - 22, q2Y + 18);
    ctx.closePath();
    ctx.fill();

    // REGENERATIVE FEEDBACK INTERCONNECT LOOPS:
    // Path 1: Q1 Collector -> Q2 Base
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(q1X + 25, q1Y + 35);
    ctx.lineTo(q1X + 25, q2Y);
    ctx.lineTo(q2X, q2Y);
    ctx.stroke();

    // Path 2: Q2 Collector -> Q1 Base
    ctx.beginPath();
    ctx.moveTo(q2X - 25, q2Y - 35);
    ctx.lineTo(q2X - 25, q1Y);
    ctx.lineTo(q1X, q1Y);
    ctx.stroke();

    // Gate Input Lead to Q2 Base
    ctx.strokeStyle = isGateTriggered ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(q2X + 45, q2Y);
    ctx.lineTo(q2X, q2Y);
    ctx.stroke();

    ctx.fillStyle = isGateTriggered ? '#f59e0b' : '#64748b';
    ctx.beginPath();
    ctx.arc(q2X + 45, q2Y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Anode Lead to Q1 Emitter
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(q1X + 25, q1Y - 35);
    ctx.lineTo(q1X + 25, 20);
    ctx.stroke();

    // Cathode Lead to Q2 Emitter
    ctx.beginPath();
    ctx.moveTo(q2X - 25, q2Y + 35);
    ctx.lineTo(q2X - 25, h - 20);
    ctx.stroke();

    // Labels & Annotations
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ANODE (+) [P1]', q1X + 35, 30);
    ctx.fillText('CATHODE (-) [N2]', q2X - 20, h - 10);
    ctx.fillText('GATE (G) [P2]', q2X + 55, q2Y + 4);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Q1 (PNP Transistor)', q1X - 80, q1Y - 30);
    ctx.fillText('Q2 (NPN Transistor)', q2X + 15, q2Y + 30);

    // Regenerative Feedback Plasma Carrier Loop Indicator
    if (activeGlow) {
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = isLatched ? '#34d399' : '#fbbf24';
      ctx.fillText(
        `REGENERATIVE FEEDBACK LOOP: α1 + α2 = ${alphaFeedback.toFixed(2)}`,
        w * 0.28,
        h / 2
      );
      ctx.fillText(
        isLatched ? '✓ FULLY LATCHED (Gate pulse no longer needed)' : '⚡ GATE PULSE INJECTING BASE CHARGE...',
        w * 0.28,
        h / 2 + 16
      );
    } else if (hasFailedToLatch) {
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#f87171';
      ctx.fillText('✗ LATCHING COLLAPSED: i_Anode < I_L (75mA) when pulse ended!', w * 0.22, h / 2);
    }

  }, [isLatched, isGateTriggered, hasFailedToLatch, alphaFeedback]);

  // Render Transient Scope of Anode Current vs Firing Pulse
  useEffect(() => {
    const canvas = canvasScopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    // Reticle
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

    // Latching Current I_L threshold line (Cyan dashed)
    const yIL = h * 0.55;
    ctx.strokeStyle = '#00f0ff';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, yIL);
    ctx.lineTo(w, yIL);
    ctx.stroke();

    // Holding Current I_H threshold line (Purple dashed)
    const yIH = h * 0.75;
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(0, yIH);
    ctx.lineTo(w, yIH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`Latching Current I_L = ${iLatchingMa} mA`, 10, yIL - 6);

    ctx.fillStyle = '#c084fc';
    ctx.fillText(`Holding Current I_H = ${iHoldingMa} mA`, 10, yIH - 6);

    // Gate Pulse Plot (Bottom, Amber)
    const yGate = h * 0.90;
    ctx.strokeStyle = isGateTriggered ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, yGate);
    ctx.lineTo(60, yGate);
    ctx.lineTo(60, yGate - 25);
    const pulseW = Math.min(180, (gatePulseDurationUs / 100) * 180 + 30);
    ctx.lineTo(60 + pulseW, yGate - 25);
    ctx.lineTo(60 + pulseW, yGate);
    ctx.lineTo(w - 10, yGate);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Gate Pulse Width: ${gatePulseDurationUs} µs`, 65, yGate - 30);

    // Anode Current Rise Curve i_A(t)
    ctx.strokeStyle = isLatched ? '#10b981' : hasFailedToLatch ? '#ef4444' : isGateTriggered ? '#38bdf8' : '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, h * 0.85);
    ctx.lineTo(60, h * 0.85);

    // Inductive exponential rise
    const peakCurrentY = h * 0.20;
    for (let x = 60; x <= 60 + pulseW; x++) {
      const prog = (x - 60) / pulseW;
      const riseFactor = (1 - Math.exp(-prog * (30 / Math.max(1, loadInductanceMh))));
      const y = (h * 0.85) - ((h * 0.85) - peakCurrentY) * riseFactor;
      ctx.lineTo(x, y);
    }

    if (isLatched) {
      // Stays latched up!
      ctx.lineTo(w - 10, peakCurrentY);
    } else if (hasFailedToLatch) {
      // Collapses back to zero!
      ctx.lineTo(60 + pulseW + 15, h * 0.85);
      ctx.lineTo(w - 10, h * 0.85);
    } else {
      ctx.lineTo(w - 10, h * 0.85);
    }
    ctx.stroke();

  }, [isLatched, hasFailedToLatch, isGateTriggered, gatePulseDurationUs, loadInductanceMh, iLatchingMa, iHoldingMa]);

  return (
    <div className="bg-[#0b101b] border border-[#1e293b] rounded-2xl p-4 text-slate-200 shadow-2xl space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">SCR Two-Transistor (NPN-PNP) Regenerative Latching Lab</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                IEC 60747-6 Thyristors
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Observe regenerative feedback loop ($\alpha_1 + \alpha_2 \to 1$), Latching Current ($I_L$) requirement, and Holding Current ($I_H$) drop-out.
            </p>
          </div>
        </div>

        {/* RESET & COMMUTATE BUTTON */}
        <div className="flex items-center gap-2">
          {isLatched && (
            <button
              onClick={handleForceCommutate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              FORCE COMMUTATE (Turn OFF)
            </button>
          )}
        </div>
      </div>

      {/* EXPERIMENT OUTCOME BANNER */}
      {experimentResult === 'LATCHED_SUCCESS' && (
        <div className="px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/60 flex items-center justify-between text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span><strong>SUCCESSFULLY LATCHED:</strong> Anode current reached $I_A \ge I_L$ ({iLatchingMa}mA). The SCR remains ON indefinitely without gate drive!</span>
          </div>
          <span className="text-white font-bold">{anodeCurrentA.toFixed(2)} A Active</span>
        </div>
      )}

      {experimentResult === 'FAILED_TO_LATCH' && (
        <div className="px-3 py-2 rounded-xl bg-red-950/40 border border-red-500/60 flex items-center justify-between text-xs font-mono text-red-300">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span><strong>LATCHING FAILED:</strong> Load inductance $L$ delayed current rise! When the gate pulse ended, $I_A$ was below $I_L$ ({iLatchingMa}mA). The SCR collapsed OFF!</span>
          </div>
          <span className="text-amber-300 font-bold">Increase Pulse Width or Decrease L</span>
        </div>
      )}

      {/* DUAL VIEWPORTS: TWO-TRANSISTOR ANALOG & CRT SCOPE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VIEWPORT 1: COUPLED TWO-TRANSISTOR SCHEMATIC */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              NPN-PNP COUPLED ANALOG & REGENERATIVE CARRIER LOOP
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Status: {isLatched ? 'LATCHED ON' : isGateTriggered ? 'GATE PULSE' : 'BLOCKING OFF'}
            </span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-800">
            <canvas ref={canvasDiagramRef} width={560} height={350} className="w-full h-full block" />
          </div>

          {/* TELEMETRY STRIP */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Latching Threshold $I_L$</div>
              <div className="text-sm font-bold text-cyan-300">{iLatchingMa} mA</div>
            </div>
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Holding Current $I_H$</div>
              <div className="text-sm font-bold text-purple-300">{iHoldingMa} mA</div>
            </div>
            <div className="bg-[#0f172a] p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Loop Gain $(\alpha_1 + \alpha_2)$</div>
              <div className={`text-sm font-bold ${alphaFeedback >= 1.0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {alphaFeedback.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* VIEWPORT 2: TRANSIENT SCOPE */}
        <div className="bg-[#070a12] border border-[#1e293b] rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              CRT SCOPE: i_Anode(t) vs Gate Pulse Width
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Inductive L/R Rise</span>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-800">
            <canvas ref={canvasScopeRef} width={560} height={350} className="w-full h-full block" />
          </div>

          {/* PHYSICAL CALLOUT */}
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-300">Why Thyristors Fail to Turn ON with Short Pulses:</strong> Inductive loads delay the current rise ($di/dt = V/L$). If the gate pulse ends while $i_{'{Anode}'} &lt; I_L$, the regenerative carrier loop drops below $\alpha_1 + \alpha_2 = 1$ and the SCR turns off! Industrial gate drivers use a train of pulses (picket fence) for this reason.
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DRILL CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0f172a] p-3 rounded-xl border border-slate-800 text-xs">
        {/* GATE TRIGGER DRILL BUTTON */}
        <div className="space-y-2 flex flex-col justify-between">
          <label className="font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Gate Pulse Trigger Drill:
          </label>

          <button
            onClick={handleFireGatePulse}
            disabled={isGateTriggered}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              isGateTriggered
                ? 'bg-amber-500/40 text-amber-200 border border-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
            }`}
          >
            <Zap className="w-4 h-4" />
            {isGateTriggered ? 'INJECTING GATE CURRENT...' : 'FIRE SCR GATE PULSE'}
          </button>

          <p className="text-[10px] text-slate-400">
            Click to fire gate pulse. Test if your pulse width is long enough to overcome load inductance $L$ and latch the SCR.
          </p>
        </div>

        {/* PULSE DURATION & GATE DRIVE */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Gate Pulse Width ($\tau_g$):</span>
              <span className="text-amber-300 font-bold">{gatePulseDurationUs} µs</span>
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={1}
              value={gatePulseDurationUs}
              onChange={(e) => setGatePulseDurationUs(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
              <span>2µs (Narrow)</span>
              <span>100µs (Wide)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Gate Current ($I_g$):</span>
              <span className="text-amber-300 font-bold">{gateCurrentMa} mA</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={gateCurrentMa}
              onChange={(e) => setGateCurrentMa(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* LOAD INDUCTANCE & RESISTANCE */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Load Inductance (L_load):</span>
              <span className="text-cyan-300 font-bold">{loadInductanceMh} mH</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={loadInductanceMh}
              onChange={(e) => setLoadInductanceMh(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-400">Load Resistance (R_load):</span>
              <span className="text-purple-300 font-bold">{loadResistance} Ω</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={loadResistance}
              onChange={(e) => setLoadResistance(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
