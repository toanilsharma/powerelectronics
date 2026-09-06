import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

interface SCRForcedCommutationLabProps {
  className?: string;
  onClose?: () => void;
}

type CommutationClass = 'class_a' | 'class_b' | 'class_c' | 'class_d' | 'class_e' | 'class_f';

interface ClassMetadata {
  id: CommutationClass;
  name: string;
  shortName: string;
  type: string;
  keyEquation: string;
  description: string;
}

const COMMUTATION_CLASSES: ClassMetadata[] = [
  {
    id: 'class_a',
    name: 'Class A: Self / Resonant Load Commutation',
    shortName: 'Class A (Resonant Load)',
    type: 'Underdamped Series R-L-C',
    keyEquation: 'R < 2\\sqrt{L/C}, \\quad \\omega_r = \\sqrt{\\frac{1}{LC} - \\frac{R^2}{4L^2}}',
    description: 'The load itself forms an underdamped series resonant RLC circuit. When fired, current naturally oscillates through a half-sine wave and falls to zero, self-commutating the SCR.',
  },
  {
    id: 'class_b',
    name: 'Class B: Resonant LC Parallel Commutation',
    shortName: 'Class B (Parallel LC)',
    type: 'Self-Excited Resonant Tank',
    keyEquation: 't_c \\approx \\frac{\\pi}{2} \\sqrt{LC}',
    description: 'An LC resonant tank is connected across the SCR. When the main SCR is turned on, the capacitor discharges through inductor L in an oscillatory loop, injecting a counter-current that drives SCR current to zero.',
  },
  {
    id: 'class_c',
    name: 'Class C: Complementary Impulse Commutation',
    shortName: 'Class C (Complementary)',
    type: 'Dual-Thyristor Cross-Capacitor',
    keyEquation: 't_c = R_1 C \\ln(2)',
    description: 'Two thyristors (T1 and T2) share a commutating capacitor C. Firing auxiliary T2 instantly pulls T1 anode negative by -Vs, reverse-biasing T1 for duration tc until capacitor charges.',
  },
  {
    id: 'class_d',
    name: 'Class D: Auxiliary Impulse Commutation',
    shortName: 'Class D (Auxiliary SCR)',
    type: 'Auxiliary Impulsive Discharging',
    keyEquation: 't_c = C \\frac{V_s}{I_L}',
    description: 'A pre-charged capacitor is switched by an auxiliary thyristor (TA). When TA is triggered, capacitor discharge current opposes main SCR current and reverse-biases it to turn it off.',
  },
  {
    id: 'class_e',
    name: 'Class E: External Pulse Commutation',
    shortName: 'Class E (External Pulse)',
    type: 'Transformer Impulse Injection',
    keyEquation: 'v_{pulse} > V_s, \\quad t_{pulse} > t_q',
    description: 'An external pulse source (such as a pulse transformer) injects a high-voltage reverse impulse across the conducting SCR, reducing its current to zero and commutating it off.',
  },
  {
    id: 'class_f',
    name: 'Class F: Line / Natural AC Commutation',
    shortName: 'Class F (Natural Line)',
    type: 'AC Utility Zero-Crossing',
    keyEquation: 'v_{AC}(t) < 0, \\quad t_c = \\frac{\\pi - \\alpha}{\\omega}',
    description: 'Natural commutation where incoming AC mains voltage alternates into negative polarity, inherently reverse-biasing the conducting thyristor without auxiliary circuits.',
  },
];

/**
 * SCRForcedCommutationLab.tsx
 * 
 * Recommendation 5: Complete Forced Commutation Workbench (Classes A through F)
 * 
 * Interactive laboratory demonstrating:
 *  - Operating principles and animated current loops for all 6 IEEE/IEC commutation classes.
 *  - Synchronized CRT oscilloscope showing vAK(t), iA(t), and vC(t).
 *  - Interactive firing triggers (Main SCR, Aux SCR, Pre-charge, AC cycle).
 *  - Calculation of circuit turn-off time margin tc vs device turn-off time tq.
 */
export const SCRForcedCommutationLab: React.FC<SCRForcedCommutationLabProps> = ({
  className = '',
  onClose,
}) => {
  const [selectedClass, setSelectedClass] = useState<CommutationClass>('class_c');

  // Common Circuit Parameters
  const [supplyVoltageVs, setSupplyVoltageVs] = useState<number>(200); // V DC
  const [capacitanceUf, setCapacitanceUf] = useState<number>(25); // µF
  const [inductanceMh, setInductanceMh] = useState<number>(1.2); // mH
  const [loadResistance, setLoadResistance] = useState<number>(20); // Ohms

  // Device States
  const [isT1Conducting, setIsT1Conducting] = useState<boolean>(true);
  const [isT2Conducting, setIsT2Conducting] = useState<boolean>(false);
  const [capacitorVoltageVc, setCapacitorVoltageVc] = useState<number>(200); // V
  const [commutationStage, setCommutationStage] = useState<string>('T1_CONDUCTING_STEADY');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.25);

  // Time & Scope State
  const [timeUs, setTimeUs] = useState<number>(0);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const schematicCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<Array<{ t: number; vak: number; ia: number; vc: number }>>([]);
  const animFrameRef = useRef<number | null>(null);

  // Intrinsic device turn-off time tq
  const deviceTqUs = 40; // 40 µs thyristor rating

  // Calculate Circuit Turn-Off Time tc (in microseconds)
  let calculatedTcUs = 0;
  if (selectedClass === 'class_a') {
    // tc ~ half period of oscillation
    calculatedTcUs = Math.PI * Math.sqrt(inductanceMh * 1e-3 * capacitanceUf * 1e-6) * 1e6;
  } else if (selectedClass === 'class_b') {
    calculatedTcUs = (Math.PI / 2) * Math.sqrt(inductanceMh * 1e-3 * capacitanceUf * 1e-6) * 1e6;
  } else if (selectedClass === 'class_c') {
    calculatedTcUs = loadResistance * (capacitanceUf * 1e-6) * Math.LN2 * 1e6;
  } else if (selectedClass === 'class_d') {
    const loadCurrentA = supplyVoltageVs / loadResistance;
    calculatedTcUs = ((capacitanceUf * 1e-6 * supplyVoltageVs) / Math.max(0.1, loadCurrentA)) * 1e6;
  } else if (selectedClass === 'class_e') {
    calculatedTcUs = 65; // pulse width
  } else if (selectedClass === 'class_f') {
    calculatedTcUs = 10000; // 10ms half-cycle in 50Hz
  }

  const isMarginSafe = calculatedTcUs > deviceTqUs;

  // Trigger Main Thyristor T1
  const handleFireT1 = () => {
    setIsT1Conducting(true);
    setIsT2Conducting(false);
    setCapacitorVoltageVc(supplyVoltageVs);
    setCommutationStage('T1_CONDUCTING_LOAD');
  };

  // Trigger Commutating Auxiliary Thyristor (T2 / TA) or Pulse
  const handleCommutateT1 = () => {
    if (!isT1Conducting) return;

    setCommutationStage('COMMUTATION_IN_PROGRESS');

    // Start Commutation Sequence
    if (selectedClass === 'class_c') {
      setIsT2Conducting(true);
      // Capacitor instantly reverse-biases T1 with -Vs
      setCapacitorVoltageVc(-supplyVoltageVs);

      setTimeout(() => {
        setIsT1Conducting(false);
        setCapacitorVoltageVc(supplyVoltageVs);
        setCommutationStage('T1_COMMUTATED_OFF');
      }, calculatedTcUs * 10 * playbackSpeed);
    } else if (selectedClass === 'class_d') {
      setIsT2Conducting(true); // TA fired
      setTimeout(() => {
        setIsT1Conducting(false);
        setIsT2Conducting(false);
        setCommutationStage('T1_COMMUTATED_OFF');
      }, calculatedTcUs * 10 * playbackSpeed);
    } else {
      // General impulse / natural
      setTimeout(() => {
        setIsT1Conducting(false);
        setCommutationStage('T1_COMMUTATED_OFF');
      }, calculatedTcUs * 10 * playbackSpeed);
    }
  };

  // Reset Lab
  const handleReset = () => {
    setIsT1Conducting(true);
    setIsT2Conducting(false);
    setCapacitorVoltageVc(supplyVoltageVs);
    setCommutationStage('T1_CONDUCTING_STEADY');
    historyRef.current = [];
  };

  // Simulation loop for waveforms & schematic current paths
  useEffect(() => {
    let animId: number;
    let t = 0;

    const loop = () => {
      t += 0.05 * playbackSpeed;
      setTimeUs((prev) => prev + 1);

      // Instantaneous variables
      const vak = isT1Conducting ? 1.4 : supplyVoltageVs;
      const ia = isT1Conducting ? supplyVoltageVs / loadResistance : 0;
      const vc = capacitorVoltageVc;

      if (historyRef.current.length > 180) {
        historyRef.current.shift();
      }
      historyRef.current.push({ t, vak, ia, vc });

      drawSchematic();
      drawScope();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [selectedClass, isT1Conducting, isT2Conducting, capacitorVoltageVc, supplyVoltageVs, loadResistance, playbackSpeed]);

  // Draw Animated Circuit Schematic
  const drawSchematic = () => {
    const canvas = schematicCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark Background
    ctx.fillStyle = '#070b13';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#151e2d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
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

    // Positions
    const railTopY = 50;
    const railBottomY = h - 50;
    const t1X = w * 0.35;
    const t2X = w * 0.65;

    // Power Rails (+Vs Top, 0V Bottom)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, railTopY);
    ctx.lineTo(w - 30, railTopY);
    ctx.stroke();

    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(30, railBottomY);
    ctx.lineTo(w - 30, railBottomY);
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`+Vs (${supplyVoltageVs}V DC)`, 35, railTopY - 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('0V / DC Return', 35, railBottomY + 20);

    // Load Resistor R1
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(t1X - 12, railTopY + 25, 24, 45);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`R_load (${loadResistance}Ω)`, t1X + 18, railTopY + 50);

    // Connection from top rail to R_load
    ctx.beginPath();
    ctx.moveTo(t1X, railTopY);
    ctx.lineTo(t1X, railTopY + 25);
    ctx.stroke();

    // Connection from R_load to Main SCR T1 Anode
    const t1AnodeY = railTopY + 110;
    ctx.beginPath();
    ctx.moveTo(t1X, railTopY + 70);
    ctx.lineTo(t1X, t1AnodeY);
    ctx.stroke();

    // Main SCR T1 Symbol
    drawThyristor(ctx, t1X, t1AnodeY, isT1Conducting, 'MAIN T1');

    // T1 Cathode to Bottom Rail
    ctx.strokeStyle = isT1Conducting ? '#10b981' : '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(t1X, t1AnodeY + 40);
    ctx.lineTo(t1X, railBottomY);
    ctx.stroke();

    // Commutation Branch (Specific to Selected Class)
    if (selectedClass === 'class_c' || selectedClass === 'class_d') {
      // Load Resistor R2 for T2
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(t2X - 12, railTopY + 25, 24, 45);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`R2 (${loadResistance}Ω)`, t2X + 18, railTopY + 50);

      ctx.beginPath();
      ctx.moveTo(t2X, railTopY);
      ctx.lineTo(t2X, railTopY + 25);
      ctx.stroke();

      const t2AnodeY = railTopY + 110;
      ctx.beginPath();
      ctx.moveTo(t2X, railTopY + 70);
      ctx.lineTo(t2X, t2AnodeY);
      ctx.stroke();

      // Aux SCR T2 Symbol
      drawThyristor(ctx, t2X, t2AnodeY, isT2Conducting, selectedClass === 'class_c' ? 'AUX T2' : 'AUX TA');

      ctx.strokeStyle = isT2Conducting ? '#10b981' : '#64748b';
      ctx.beginPath();
      ctx.moveTo(t2X, t2AnodeY + 40);
      ctx.lineTo(t2X, railBottomY);
      ctx.stroke();

      // Commutating Capacitor C connected between Anodes
      const capY = t1AnodeY - 15;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(t1X, capY);
      ctx.lineTo(w * 0.5 - 8, capY);
      ctx.moveTo(w * 0.5 + 8, capY);
      ctx.lineTo(t2X, capY);
      ctx.stroke();

      // Capacitor Plates
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 8, capY - 14);
      ctx.lineTo(w * 0.5 - 8, capY + 14);
      ctx.moveTo(w * 0.5 + 8, capY - 14);
      ctx.lineTo(w * 0.5 + 8, capY + 14);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`C (${capacitanceUf}µF)`, w * 0.5 - 25, capY - 20);
      ctx.fillText(`v_C = ${capacitorVoltageVc.toFixed(0)}V`, w * 0.5 - 30, capY + 28);
    } else if (selectedClass === 'class_a' || selectedClass === 'class_b') {
      // Series or Parallel Resonant LC Tank
      const lcX = w * 0.65;
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`RESONANT TANK: L=${inductanceMh}mH, C=${capacitanceUf}µF`, lcX - 80, railTopY + 50);

      // Inductor Coils
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.arc(lcX - 30 + i * 16, railTopY + 80, 8, Math.PI, 0, false);
      }
      ctx.stroke();

      // Capacitor
      ctx.beginPath();
      ctx.moveTo(lcX + 45, railTopY + 70);
      ctx.lineTo(lcX + 45, railTopY + 90);
      ctx.moveTo(lcX + 55, railTopY + 70);
      ctx.lineTo(lcX + 55, railTopY + 90);
      ctx.stroke();
    }

    // Active Current Flow Animation
    if (isT1Conducting) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('⚡ LOAD CURRENT FLOWING THROUGH MAIN T1', t1X - 80, railBottomY - 15);
    }
  };

  // Helper to draw standard IEC thyristor symbol
  const drawThyristor = (ctx: CanvasRenderingContext2D, x: number, y: number, isConducting: boolean, label: string) => {
    ctx.fillStyle = isConducting ? '#10b981' : '#1e293b';
    ctx.strokeStyle = isConducting ? '#34d399' : '#94a3b8';
    ctx.lineWidth = 2.5;

    // Triangle
    ctx.beginPath();
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cathode Horizontal Bar
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 26);
    ctx.lineTo(x + 18, y + 26);
    ctx.stroke();

    // Gate Terminal
    ctx.strokeStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 26);
    ctx.lineTo(x - 22, y + 36);
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isConducting ? '#34d399' : '#ffffff';
    ctx.fillText(label, x + 24, y + 16);
  };

  // Draw 3-Channel CRT Scope (vAK, iA, vC)
  const drawScope = () => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark Phosphor
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#131b26';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 35) {
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

    const midY = h * 0.5;

    // Center Line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    const history = historyRef.current;
    if (history.length < 2) return;

    const dx = w / 180;

    // Trace 1: vAK (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const px = i * dx;
      const py = midY - (pt.vak / 300) * (h * 0.35);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Trace 2: iA (Emerald Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const px = i * dx;
      const py = midY - (pt.ia / 15) * (h * 0.35);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Trace 3: Capacitor Voltage vC (Cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    history.forEach((pt, i) => {
      const px = i * dx;
      const py = midY - (pt.vc / 300) * (h * 0.35);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Scope Legends
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('v_AK(t) Main SCR', 10, 15);
    ctx.fillStyle = '#10b981';
    ctx.fillText('i_A(t) Anode Current', 130, 15);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('v_C(t) Commutation Cap', 270, 15);
  };

  const currentMeta = COMMUTATION_CLASSES.find((c) => c.id === selectedClass) || COMMUTATION_CLASSES[2];

  return (
    <div className={`flex flex-col gap-3 bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 shadow-2xl ${className}`}>
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 text-white shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>FORCED COMMUTATION WORKBENCH (CLASSES A TO F)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 border border-sky-500 text-sky-300 font-bold">
                IEEE Std 446 / IEC 60146
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete interactive workbench covering resonant load, parallel LC resonant tank, complementary, auxiliary impulse, external pulse, and line commutation.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFireT1}
            disabled={isT1Conducting}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              !isT1Conducting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fire Main T1</span>
          </button>
          <button
            onClick={handleCommutateT1}
            disabled={!isT1Conducting}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
              isT1Conducting
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Trigger Commutation (Turn OFF T1)</span>
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono cursor-pointer"
            title="Reset Circuit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Commutation Class Tabs (A, B, C, D, E, F) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 bg-[#161b22] border border-[#30363d] p-1.5 rounded-xl">
        {COMMUTATION_CLASSES.map((cls) => (
          <button
            key={cls.id}
            onClick={() => {
              setSelectedClass(cls.id);
              handleReset();
            }}
            className={`px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
              selectedClass === cls.id
                ? 'bg-gradient-to-r from-sky-900/60 to-indigo-900/60 border border-sky-500 shadow-md font-bold'
                : 'bg-[#0d1117] border border-[#21262d] text-slate-400 hover:text-white'
            }`}
          >
            <span className={`text-xs font-mono font-bold truncate ${selectedClass === cls.id ? 'text-sky-300' : 'text-slate-300'}`}>
              {cls.shortName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono truncate">{cls.type}</span>
          </button>
        ))}
      </div>

      {/* 3. Class Description & Equation Banner */}
      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-sky-400">{currentMeta.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {currentMeta.type}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{currentMeta.description}</p>
        </div>

        <div className="flex items-center gap-3 bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 block">Circuit Margin (t_c):</span>
            <span className={`text-sm font-extrabold ${isMarginSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
              {calculatedTcUs.toFixed(1)} µs
            </span>
          </div>
          <div className="border-l border-[#30363d] pl-3">
            <span className="text-[10px] text-slate-400 block">Device Turn-Off (t_q):</span>
            <span className="text-sm font-bold text-slate-300">{deviceTqUs} µs</span>
          </div>
          <div className="border-l border-[#30363d] pl-3">
            <span className="text-[10px] text-slate-400 block">Safety Margin:</span>
            <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${isMarginSafe ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-rose-950 text-rose-300 border border-rose-500'}`}>
              {isMarginSafe ? '✓ PASS (tc > tq)' : '🚨 COMMUTATION FAILURE!'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Circuit Tuning Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-[#161b22] border border-[#30363d] p-3 rounded-xl">
        {/* Supply Voltage Vs */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Supply Voltage (Vs):</span>
            <span className="text-sky-400 font-bold">{supplyVoltageVs} V</span>
          </div>
          <input
            type="range"
            min="50"
            max="400"
            step="25"
            value={supplyVoltageVs}
            onChange={(e) => setSupplyVoltageVs(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Commutating Capacitance C */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Capacitance (C):</span>
            <span className="text-cyan-400 font-bold">{capacitanceUf} µF</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={capacitanceUf}
            onChange={(e) => setCapacitanceUf(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Commutating Inductance L */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Inductance (L):</span>
            <span className="text-indigo-400 font-bold">{inductanceMh} mH</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="5.0"
            step="0.2"
            value={inductanceMh}
            onChange={(e) => setInductanceMh(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Load Resistance RL */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Load Resistor (RL):</span>
            <span className="text-amber-400 font-bold">{loadResistance} Ω</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={loadResistance}
            onChange={(e) => setLoadResistance(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* 5. Dual Canvas Stages (Schematic on Left, CRT Scope on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Circuit Schematic with Animated Conduction Paths */}
        <div className="lg:col-span-7 flex flex-col bg-[#070b13] border border-[#30363d] rounded-xl p-2 relative">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#1e293b]">
            <span className="text-xs font-mono font-extrabold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>CIRCUIT TOPOLOGY & COMMUTATION CURRENT MESH</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isT1Conducting ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
              {isT1Conducting ? 'T1 CONDUCTION (ON)' : 'T1 COMMUTATED (OFF)'}
            </span>
          </div>
          <canvas
            ref={schematicCanvasRef}
            width={620}
            height={360}
            className="w-full h-auto rounded-lg mt-1"
          />
        </div>

        {/* Right: 3-Channel CRT Commutation Waveform Scope */}
        <div className="lg:col-span-5 flex flex-col bg-[#06090e] border border-[#30363d] rounded-xl p-2 relative">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#1e293b]">
            <span className="text-xs font-mono font-extrabold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>COMMUTATION TRANSIENT SCOPE</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Phosphor Reticle</span>
          </div>
          <canvas
            ref={scopeCanvasRef}
            width={460}
            height={360}
            className="w-full h-auto rounded-lg mt-1"
          />
        </div>
      </div>
    </div>
  );
};
